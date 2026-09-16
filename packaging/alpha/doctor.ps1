# Visual Team -- read-only alpha diagnostics (Windows, tested runtime only).
#
# Checks prerequisites, package integrity, endpoint pairing + health, CLI
# version, and marketplace/plugin state. It changes NOTHING: no adds, no
# trust changes, no cache writes. It reports configuration and health --
# actual hook trust and delivery are only established by the manual /hooks
# review and a real task.

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

# Codex CLI -- discovery failures are reported, not fatal to the whole run.
$codex = $null
try {
    $found = Resolve-Codex -ExplicitPath $CodexPath
    $codex = $found.path
    $v = Get-CodexVersion $codex
    if (-not $v) {
        Report $false 'codex cli' "could not read a version from '$codex --version'"
    } else {
        Report ($v -eq $script:TestedCodexVersion) 'codex cli' `
            "$v ($codex via $($found.source)) -- tested runtime is $script:TestedCodexVersion"
    }
} catch {
    Report $false 'codex cli' $_.Exception.Message
}

# Endpoint pairing + health.
$pluginRoot = Join-Path $PackageRoot $script:PluginDirName
$endpoint = Get-PackagedEndpoint -PluginRoot $pluginRoot
Report $endpoint.ok 'endpoint config' $(if ($endpoint.ok) { "$($endpoint.url) ($($endpoint.config))" } else { $endpoint.detail })
if ($endpoint.ok) {
    $health = Test-EndpointHealth -McpUrl $endpoint.url
    Report $health.ok 'service health' $health.detail
} else {
    Write-Check 'SKIP' 'service health' 'no valid endpoint configured'
}

# Marketplace + plugin state (needs a working codex).
if ($codex) {
    try {
        $marketplaces = Get-Marketplaces -Codex $codex
        $ours = ConvertTo-NormalizedPath $PackageRoot
        $mp = $marketplaces | Where-Object { $_.name -eq $script:MarketplaceName }
        if (-not $mp) {
            Report $false 'marketplace' "'$script:MarketplaceName' is not registered -- run .\install.ps1"
        } else {
            Report ((ConvertTo-NormalizedPath $mp.root) -eq $ours) 'marketplace' `
                "'$script:MarketplaceName' -> $($mp.root) (expected $PackageRoot)"
        }

        $plugins = Get-PluginState -Codex $codex
        $sameName = @($plugins.installed | Where-Object { $_.name -eq $script:PluginName })
        $oursPath = ConvertTo-NormalizedPath (Join-Path $PackageRoot $script:PluginDirName)
        $oursPlugin = $sameName | Where-Object { (ConvertTo-NormalizedPath $_.source.path) -eq $oursPath } | Select-Object -First 1
        $foreign = @($sameName | Where-Object { (ConvertTo-NormalizedPath $_.source.path) -ne $oursPath })

        if (-not $oursPlugin) {
            Report $false 'plugin' "'$script:PluginName' is not installed from this package -- run .\install.ps1"
        } else {
            Report ([bool]$oursPlugin.enabled) 'plugin' `
                "installed from this package; enabled=$($oursPlugin.enabled)"
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
