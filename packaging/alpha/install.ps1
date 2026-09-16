# Visual Team -- guided private-alpha installer (Windows, tested runtime only).
#
# Installs the local marketplace + plugin through the supported Codex CLI
# commands. It never disables, removes, or upgrades any existing install,
# never guesses a hashed bundle path, and never changes hook trust -- the
# /hooks review stays a normal, manual step. An identical repeat run is a
# successful no-op; a different package revision or plugin version is a
# conflict with explicit remediation, not a silent upgrade.
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

# 3. Codex CLI: explicit -CodexPath, else exactly one candidate matching the
#    tested runtime across PATH and the desktop bundle. Unsupported versions
#    are never a substitute.
$resolved = Resolve-Codex -ExplicitPath $CodexPath
if (-not $resolved.ok) {
    Stop-WithGuidance $resolved.problem $resolved.remediation
}
$codex = $resolved.path
$version = Test-TestedCodex -Codex $codex
if (-not $version.ok) {
    Stop-WithGuidance $version.detail @(
        "Install codex-cli $script:TestedCodexVersion, or pass -CodexPath pointing at it.",
        'Newer/global Codex versions are not claimed to work -- do not retry expecting support.'
    )
}
Write-Check 'PASS' 'codex cli' "$($version.version) ($codex, via $($resolved.source))"

# 4. Endpoint: the packaged config pairs install with the alpha service.
$pluginRoot = Join-Path $PackageRoot $script:PluginDirName
$endpoint = Get-PackagedEndpoint -PluginRoot $pluginRoot
if (-not $endpoint.ok) {
    Stop-WithGuidance "packaged endpoint invalid: $($endpoint.detail)" @(
        'Re-extract the alpha zip; endpoint edits are a developer step, not participant setup.'
    )
}
Write-Check 'PASS' 'endpoint config' "$($endpoint.url) ($($endpoint.config))"
# A defined override is the hook's actual destination -- surface it so the
# packaged health check below is not mistaken for delivery proof.
$endpointOverride = Get-EndpointOverride -PackagedUrl $endpoint.url
if ($endpointOverride.state -eq 'invalid') {
    Write-Check 'WARN' 'endpoint override' 'VISUAL_TEAM_MCP_URL is defined but not a valid http(s) URL -- the hook will silently not deliver'
} elseif ($endpointOverride.state -eq 'differs') {
    Write-Check 'WARN' 'endpoint override' "VISUAL_TEAM_MCP_URL=$($endpointOverride.url) -- hooks deliver there, NOT the packaged endpoint"
}
$health = Test-EndpointHealth -McpUrl $endpoint.url
if (-not $health.ok) {
    Stop-WithGuidance "alpha service is not reachable: $($health.detail)" @(
        'Check the network connection and re-run.',
        'If the service stays unreachable, report it to the coordinator before continuing.'
    )
}
Write-Check 'PASS' 'service health' $health.detail

# 5. Expected identity: the packaged plugin version and this folder's paths.
$packagedManifest = Join-Path $pluginRoot '.codex-plugin\plugin.json'
try { $expectedVersion = (Get-Content -LiteralPath $packagedManifest -Raw | ConvertFrom-Json).version }
catch { $expectedVersion = $null }
if (-not $expectedVersion) {
    Stop-WithGuidance 'could not read the packaged plugin version' @(
        'Re-extract the alpha zip; do not edit packaged files.'
    )
}
$oursRoot = ConvertTo-NormalizedPath $PackageRoot
$oursPath = ConvertTo-NormalizedPath $pluginRoot

# 6. Read BOTH CLI states before any mutation. A malformed response or a known
#    conflict stops here -- the installer never adds first and checks later.
try {
    $marketplaces = Get-Marketplaces -Codex $codex
    $plugins = Get-PluginState -Codex $codex
} catch {
    Stop-WithGuidance "could not read Codex plugin state: $($_.Exception.Message)" @(
        "Expected the observed CLI JSON schema on codex-cli $script:TestedCodexVersion.",
        'Run the command manually to see the CLI error, then re-run this script.'
    )
}

$existingMarketplace = @($marketplaces | Where-Object { $_.name -eq $script:MarketplaceName }) | Select-Object -First 1
$sameName = @($plugins.installed | Where-Object { $_.name -eq $script:PluginName })
# Identity is source.path AND the normalized local marketplace source -- not
# path alone. Version is checked separately so a same-identity different
# version still reports as a version conflict, not a foreign source.
$ours = @($sameName | Where-Object { Test-OurPluginEntry $_ $oursPath $oursRoot $null }) | Select-Object -First 1
$alternates = @($sameName | Where-Object { -not (Test-OurPluginEntry $_ $oursPath $oursRoot $null) })

if ($existingMarketplace -and (ConvertTo-NormalizedPath $existingMarketplace.root) -ne $oursRoot) {
    Stop-WithGuidance "marketplace '$script:MarketplaceName' already points at $(ConvertTo-NormalizedPath $existingMarketplace.root)" @(
        'That is a different package source/revision -- this installer never replaces it.',
        "Remove it yourself only if it is stale: codex plugin marketplace remove $script:MarketplaceName",
        "Then re-run this installer from $PackageRoot."
    )
}

$enabledForeign = @($alternates | Where-Object { $_.enabled }) | Select-Object -First 1
if ($enabledForeign) {
    $foreignSource = if ($enabledForeign.source.path) { $enabledForeign.source.path } elseif ($enabledForeign.source.source) { "$($enabledForeign.source.source):$($enabledForeign.source.id)" } else { 'unknown' }
    Stop-WithGuidance "an enabled 'visual-team' plugin from a different source exists: $foreignSource" @(
        'This installer never disables or replaces an existing install.',
        'Disable it yourself in Codex (or with the CLI), then re-run -- or keep that install and do not install this alpha.'
    )
}

if ($ours -and $ours.version -ne $expectedVersion) {
    Stop-WithGuidance "visual-team $($ours.version) is installed from this path; this package carries $expectedVersion" @(
        'A same-path install of a different version is a conflict, not an upgrade -- this installer never upgrades.',
        'Uninstall the existing plugin in Codex, then re-run this installer.'
    )
}
if ($alternates.Count -gt 0) {
    Write-Check 'NOTE' 'other visual-team' 'a disabled install from another source exists -- left untouched, not a conflict'
}

# 7. Mutations -- only reached with a clean read. Idempotent: add only what is
#    absent.
$addedMarketplace = $false
if (-not $existingMarketplace) {
    try { $null = Invoke-CodexJson $codex @('plugin', 'marketplace', 'add', $PackageRoot) }
    catch { Stop-WithGuidance "$($_.Exception.Message)" @('Run the command manually to see the CLI error, then re-run this script.') }
    $addedMarketplace = $true
    Write-Check 'DONE' 'marketplace' "added local marketplace '$script:MarketplaceName' -> $PackageRoot"
}
$addedPlugin = $false
if (-not $ours) {
    try { $null = Invoke-CodexJson $codex @('plugin', 'add', "$script:PluginName@$script:MarketplaceName") }
    catch { Stop-WithGuidance "$($_.Exception.Message)" @('Run the command manually to see the CLI error, then re-run this script.') }
    $addedPlugin = $true
    Write-Check 'DONE' 'plugin' "installed $script:PluginName@$script:MarketplaceName"
}

# 8. Verify by re-querying -- exit 0 from an add is not proof the expected
#    identity is installed and enabled.
try {
    $marketplacesNow = Get-Marketplaces -Codex $codex
    $pluginsNow = Get-PluginState -Codex $codex
} catch {
    Stop-WithGuidance "post-install verification could not re-read CLI state: $($_.Exception.Message)" @(
        'Run .\doctor.ps1 to see the recorded state, then report it to the coordinator.'
    )
}
$mpNow = @($marketplacesNow | Where-Object { $_.name -eq $script:MarketplaceName -and (ConvertTo-NormalizedPath $_.root) -eq $oursRoot }) | Select-Object -First 1
$pluginNow = @($pluginsNow.installed | Where-Object {
    $_.name -eq $script:PluginName -and
    (Test-OurPluginEntry $_ $oursPath $oursRoot $expectedVersion)
}) | Select-Object -First 1
if (-not $mpNow) {
    Stop-WithGuidance "post-install verification failed: '$script:MarketplaceName' is not registered at $PackageRoot" @(
        'The add command reported success but the expected marketplace identity is absent.',
        'Run .\doctor.ps1 and report its output to the coordinator.'
    )
}
if (-not $pluginNow) {
    Stop-WithGuidance "post-install verification failed: visual-team $expectedVersion is not recorded from $pluginRoot" @(
        'The add command reported success but the expected plugin identity is absent.',
        'Run .\doctor.ps1 and report its output to the coordinator.'
    )
}
if ($addedPlugin -and -not $pluginNow.enabled) {
    # A fresh add must land enabled -- a disabled result means the identity we
    # asked for was not what got installed.
    Stop-WithGuidance 'post-install verification failed: the plugin was added but is not enabled' @(
        'Run .\doctor.ps1 and report its output to the coordinator.'
    )
}
if ($addedMarketplace -or $addedPlugin) {
    Write-Check 'PASS' 'verified' "marketplace + plugin $expectedVersion identity confirmed by re-query"
} elseif (-not $pluginNow.enabled) {
    # A pre-existing disabled install stays disabled -- enabling is the
    # participant's own step, never this script's.
    Write-Check 'NOTE' 'plugin' 'visual-team is installed from this package but disabled -- enable it in Codex to use the alpha'
} else {
    Write-Check 'OK' 'no change' "marketplace + plugin $expectedVersion already installed and enabled from this package"
}

# 9. What remains manual -- trust and delivery are never claimed by install.
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
