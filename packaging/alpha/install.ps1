# Visual Team -- guided private-alpha installer (Windows, tested runtime only).
#
# Installs the local marketplace + plugin through the supported Codex CLI
# commands. It never disables, removes, or upgrades any existing install,
# never guesses a hashed bundle path, and never changes hook trust -- the
# /hooks review stays a normal, manual step. An identical repeat run is a
# successful no-op.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\install.ps1
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\install.ps1 -CodexPath "C:\path\to\codex.exe"

#Requires -Version 5.1
param(
    [string]$CodexPath
)

$ErrorActionPreference = 'Stop'
$PackageRoot = $PSScriptRoot
. (Join-Path $PackageRoot 'vt-alpha-common.ps1')

Write-Output 'Visual Team alpha install -- local marketplace + plugin, supported CLI only.'
Write-Output ''

# 1. Package integrity -- the manifest ties these files to the reviewed source.
$integrity = Test-PackageIntegrity -PackageRoot $PackageRoot -ManifestPath (Join-Path $PackageRoot 'integrity.json')
if (-not $integrity.ok) {
    Stop-WithGuidance "package integrity check failed: $($integrity.detail)" @(
        'Re-extract the alpha zip; do not edit packaged files.',
        'If it still fails, report the line above to the coordinator -- do not install.'
    )
}
Write-Check 'PASS' 'package integrity' $integrity.detail

# 2. Node on PATH inside the tested range (the hook process runs under it).
$node = Get-NodeStatus
if (-not $node.ok) {
    Stop-WithGuidance "Node prerequisite failed: $($node.detail)" @(
        'Install Node 20.19+, 22.13+, or 24+ and open a new PowerShell window.'
    )
}
Write-Check 'PASS' 'node' $node.detail

# 3. Codex CLI: explicit -CodexPath, else exactly one PATH candidate, tested version only.
$codex = Resolve-Codex -ExplicitPath $CodexPath
$version = Assert-TestedCodex -Codex $codex.path
Write-Check 'PASS' 'codex cli' "$version ($($codex.path), via $($codex.source))"

# 4. Endpoint: the packaged config pairs install with the alpha service.
$pluginRoot = Join-Path $PackageRoot $script:PluginDirName
$endpoint = Get-PackagedEndpoint -PluginRoot $pluginRoot
if (-not $endpoint.ok) {
    Stop-WithGuidance "packaged endpoint invalid: $($endpoint.detail)" @(
        'Re-extract the alpha zip; endpoint edits are a developer step, not participant setup.'
    )
}
Write-Check 'PASS' 'endpoint config' "$($endpoint.url) ($($endpoint.config))"
$health = Test-EndpointHealth -McpUrl $endpoint.url
if (-not $health.ok) {
    Stop-WithGuidance "alpha service is not reachable: $($health.detail)" @(
        'Check the network connection and re-run.',
        'If the service stays unreachable, report it to the coordinator before continuing.'
    )
}
Write-Check 'PASS' 'service health' $health.detail

# 5. Marketplace state (read-only query, then add only if absent).
$marketplaces = Get-Marketplaces -Codex $codex.path
$existingMarketplace = $marketplaces | Where-Object { $_.name -eq $script:MarketplaceName }
if ($existingMarketplace) {
    $registered = ConvertTo-NormalizedPath $existingMarketplace.root
    $ours = ConvertTo-NormalizedPath $PackageRoot
    if ($registered -ne $ours) {
        Stop-WithGuidance "marketplace '$script:MarketplaceName' already points at $registered" @(
            'That is a different package source/version -- refusing to guess.',
            "Remove it yourself only if it is stale: codex plugin marketplace remove $script:MarketplaceName",
            "Then re-run this installer from $PackageRoot."
        )
    }
    Write-Check 'OK' 'marketplace' "'$script:MarketplaceName' already registered at this path -- no change"
} else {
    $null = Invoke-CodexJson $codex.path @('plugin', 'marketplace', 'add', $PackageRoot)
    Write-Check 'DONE' 'marketplace' "added local marketplace '$script:MarketplaceName' -> $PackageRoot"
}

# 6. Plugin state (read-only query, then add only if absent).
$plugins = Get-PluginState -Codex $codex.path
$sameName = @($plugins.installed | Where-Object { $_.name -eq $script:PluginName })
$oursPath = ConvertTo-NormalizedPath (Join-Path $PackageRoot $script:PluginDirName)

$conflict = $sameName | Where-Object {
    $_.enabled -and ((ConvertTo-NormalizedPath $_.source.path) -ne $oursPath)
} | Select-Object -First 1
if ($conflict) {
    Stop-WithGuidance "an enabled 'visual-team' plugin from a different source exists: $($conflict.source.path)" @(
        'This installer never disables or replaces an existing install.',
        "Disable it yourself in Codex (or with the CLI), then re-run -- or keep that install and do not install this alpha."
    )
}

$ours = $sameName | Where-Object { (ConvertTo-NormalizedPath $_.source.path) -eq $oursPath } | Select-Object -First 1
$alternates = @($sameName | Where-Object { -not $_.enabled -and (ConvertTo-NormalizedPath $_.source.path) -ne $oursPath })
if ($alternates.Count -gt 0) {
    Write-Check 'NOTE' 'other visual-team' 'a disabled install from another source exists -- left untouched, not a conflict'
}

if ($ours -and $ours.enabled) {
    Write-Check 'OK' 'plugin' 'visual-team already installed and enabled from this package -- no change'
} elseif ($ours) {
    Write-Check 'NOTE' 'plugin' 'visual-team is installed from this package but disabled -- enable it in Codex to use the alpha'
} else {
    $null = Invoke-CodexJson $codex.path @('plugin', 'add', "$script:PluginName@$script:MarketplaceName")
    Write-Check 'DONE' 'plugin' "installed $script:PluginName@$script:MarketplaceName"
}

# 7. What remains manual -- trust and delivery are never claimed by install.
Write-Output ''
Write-Output 'Install complete. Two steps stay manual, by design:'
Write-Output '  1. In Codex, open /hooks and review + trust the nine record_codex_event entries'
Write-Output '     (SessionStart, UserPromptSubmit, SubagentStart, PreToolUse, PostToolUse,'
Write-Output '      PermissionRequest, SubagentStop, Stop, Interrupt).'
Write-Output '  2. Start a task with an explicit $visual-team invocation.'
Write-Output ''
Write-Output "Keep this folder ($PackageRoot) in place -- the marketplace source is local."
Write-Output 'Verify anytime with: .\doctor.ps1   (read-only; health is not delivery proof)'
exit 0
