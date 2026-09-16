# Visual Team -- read-only alpha diagnostics (Windows, tested runtime only).
#
# Checks prerequisites, package integrity, endpoint pairing + health, CLI
# version, and marketplace/plugin state. It changes NOTHING: no adds, no
# trust changes, no cache writes. It reports configuration and health --
# actual hook trust and delivery are only established by the manual /hooks
# review and a real task.
#
# Scope note: the endpoint checks verify THIS package's pairing. A defined
# VISUAL_TEAM_MCP_URL process override is the hook's real destination and is
# reported separately -- a healthy package does not mean hooks deliver here.

#Requires -Version 5.1
param(
    [string]$CodexPath
)

$ErrorActionPreference = 'Stop'
$PackageRoot = $PSScriptRoot
. (Join-Path $PackageRoot 'vt-alpha-common.ps1')

$script:Failures = 0
function Report {
    param([bool]$Ok, [string]$Label, [string]$Detail = '')
    if ($Ok) { Write-Check 'PASS' $Label $Detail }
    else { Write-Check 'FAIL' $Label $Detail; $script:Failures += 1 }
}

Write-Output 'Visual Team alpha doctor -- read-only checks; nothing is installed, enabled, or trusted.'
Write-Output ''

# Package integrity.
$integrity = Test-PackageIntegrity -PackageRoot $PackageRoot -ManifestPath (Join-Path $PackageRoot 'integrity.json')
Report $integrity.ok 'package integrity' $integrity.detail

# Node.
$node = Get-NodeStatus
Report $node.ok 'node prerequisite' $node.detail

# Codex CLI -- discovery and version failures are reported, not fatal.
$codex = $null
$resolved = Resolve-Codex -ExplicitPath $CodexPath
if (-not $resolved.ok) {
    Report $false 'codex cli' $resolved.problem
    foreach ($step in $resolved.remediation) { Write-Output "       -> $step" }
} else {
    $codex = $resolved.path
    $version = Test-TestedCodex -Codex $codex
    Report $version.ok 'codex cli' "$($version.detail) ($codex, via $($resolved.source))"
}

# Endpoint pairing + health -- this package's configured pairing only.
$pluginRoot = Join-Path $PackageRoot $script:PluginDirName
$endpoint = Get-PackagedEndpoint -PluginRoot $pluginRoot
Report $endpoint.ok 'endpoint config' $(if ($endpoint.ok) { "$($endpoint.url) ($($endpoint.config))" } else { $endpoint.detail })
if ($endpoint.ok) {
    $health = Test-EndpointHealth -McpUrl $endpoint.url
    Report $health.ok 'service health' $health.detail
} else {
    Write-Check 'SKIP' 'service health' 'no valid endpoint configured'
}

# Hook delivery override: a defined VISUAL_TEAM_MCP_URL is the hook's actual
# destination and wins over the packaged config. Invalid means no delivery;
# valid-but-different means the checked pairing is not what hooks will use.
$override = Get-EndpointOverride -PackagedUrl $(if ($endpoint.ok) { $endpoint.url } else { $null })
switch ($override.state) {
    'absent' {
        Write-Check 'OK' 'endpoint override' 'VISUAL_TEAM_MCP_URL is not set -- the hook uses the packaged endpoint above'
    }
    'matches' {
        Write-Check 'OK' 'endpoint override' "VISUAL_TEAM_MCP_URL matches the packaged endpoint ($($override.url))"
    }
    'differs' {
        Write-Check 'WARN' 'endpoint override' "VISUAL_TEAM_MCP_URL is set to $($override.url) -- hooks deliver there, NOT the packaged endpoint"
    }
    'invalid' {
        Report $false 'endpoint override' "VISUAL_TEAM_MCP_URL is set but is not a valid http(s) URL: $($override.url) -- hooks will not deliver"
    }
}

# Marketplace + plugin state (needs a working codex).
if ($codex) {
    try {
        $marketplaces = Get-Marketplaces -Codex $codex
        $ours = ConvertTo-NormalizedPath $PackageRoot
        $mp = @($marketplaces | Where-Object { $_.name -eq $script:MarketplaceName }) | Select-Object -First 1
        if (-not $mp) {
            Report $false 'marketplace' "'$script:MarketplaceName' is not registered -- run .\install.ps1"
        } else {
            Report ((ConvertTo-NormalizedPath $mp.root) -eq $ours) 'marketplace' `
                "'$script:MarketplaceName' -> $($mp.root) (expected $PackageRoot)"
        }

        $plugins = Get-PluginState -Codex $codex
        $sameName = @($plugins.installed | Where-Object { $_.name -eq $script:PluginName })
        $oursPath = ConvertTo-NormalizedPath (Join-Path $PackageRoot $script:PluginDirName)
        $expectedVersion = $null
        try { $expectedVersion = (Get-Content -LiteralPath (Join-Path $pluginRoot '.codex-plugin\plugin.json') -Raw | ConvertFrom-Json).version } catch { }
        $oursPlugin = @($sameName | Where-Object { (ConvertTo-NormalizedPath $_.source.path) -eq $oursPath }) | Select-Object -First 1
        $foreign = @($sameName | Where-Object { (ConvertTo-NormalizedPath $_.source.path) -ne $oursPath })

        if (-not $oursPlugin) {
            Report $false 'plugin' "'$script:PluginName' is not installed from this package -- run .\install.ps1"
        } else {
            $versionOk = (-not $expectedVersion) -or ($oursPlugin.version -eq $expectedVersion)
            Report ([bool]$oursPlugin.enabled -and $versionOk) 'plugin' `
                "installed from this package; enabled=$($oursPlugin.enabled); version=$($oursPlugin.version) (package carries $expectedVersion)"
        }
        $enabledForeign = @($foreign | Where-Object { $_.enabled })
        if ($enabledForeign.Count -gt 0) {
            Report $false 'plugin source conflict' `
                "an enabled visual-team from a different source exists: $($enabledForeign[0].source.path)"
        } elseif ($foreign.Count -gt 0) {
            Write-Check 'NOTE' 'other visual-team' 'a disabled install from another source exists -- left untouched'
        }
    } catch {
        Report $false 'plugin state' $_.Exception.Message
    }
} else {
    Write-Check 'SKIP' 'marketplace/plugin state' 'no supported codex found'
}

Write-Output ''
if ($script:Failures -eq 0) {
    Write-Output 'All checks pass. Remaining manual steps: /hooks review + trust (9 entries), then $visual-team.'
    Write-Output 'Note: configuration and health are not proof of hook delivery -- verify with a real task.'
    exit 0
} else {
    Write-Output "$script:Failures check(s) failed -- see FAIL lines above for remediation."
    exit 1
}
