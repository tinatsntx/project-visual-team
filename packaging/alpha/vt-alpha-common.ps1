# Visual Team alpha -- shared helpers for install.ps1 and doctor.ps1.
# Dot-sourced by both scripts; not meant to run alone. Read-only except where
# install.ps1 explicitly calls the supported CLI add commands.

$script:TestedCodexVersion = '0.154.0-alpha.6.2'
$script:MarketplaceName = 'visual-team-native'
$script:PluginName = 'visual-team'
$script:PluginDirName = 'visual-team'

# --- output -----------------------------------------------------------------

function Write-Check {
    param([string]$Status, [string]$Label, [string]$Detail = '')
    $line = "[{0}] {1}" -f $Status, $Label
    if ($Detail) { $line += " -- $Detail" }
    Write-Output $line
}

function Stop-WithGuidance {
    param([string]$Problem, [string[]]$Remediation)
    Write-Check 'FAIL' 'stop' $Problem
    foreach ($step in $Remediation) { Write-Output "       -> $step" }
    exit 1
}

# --- path handling ----------------------------------------------------------

# Normalize absolute Windows paths before comparison: strip the extended-length
# prefix, unify slashes, trim trailing separators, compare case-insensitively.
function ConvertTo-NormalizedPath {
    param([string]$Path)
    if ([string]::IsNullOrWhiteSpace($Path)) { return $null }
    $p = $Path.Trim().Trim('"')
    if ($p.StartsWith('\\?\')) { $p = $p.Substring(4) }
    try { $p = [System.IO.Path]::GetFullPath($p) } catch { }
    return ($p -replace '/', '\').TrimEnd('\').ToLowerInvariant()
}

# --- package integrity --------------------------------------------------------

function Test-PackageIntegrity {
    param([string]$PackageRoot, [string]$ManifestPath)
    if (-not (Test-Path -LiteralPath $ManifestPath)) {
        return @{ ok = $false; detail = "integrity manifest missing: $ManifestPath" }
    }
    try { $manifest = Get-Content -LiteralPath $ManifestPath -Raw | ConvertFrom-Json }
    catch { return @{ ok = $false; detail = "integrity manifest is not valid JSON" } }
    $files = $manifest.files
    if (-not $files) { return @{ ok = $false; detail = 'integrity manifest has no files list' } }
    $checked = 0
    foreach ($prop in $files.PSObject.Properties) {
        $rel = $prop.Name -replace '/', '\'
        $target = Join-Path $PackageRoot $rel
        if (-not (Test-Path -LiteralPath $target)) {
            return @{ ok = $false; detail = "packaged file missing: $($prop.Name)" }
        }
        $hash = (Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash.ToLowerInvariant()
        if ($hash -ne ([string]$prop.Value).ToLowerInvariant()) {
            return @{ ok = $false; detail = "hash mismatch: $($prop.Name)" }
        }
        $checked += 1
    }
    return @{ ok = $true; detail = "$checked files verified (source $($manifest.sourceRevision))" }
}

# --- Node -------------------------------------------------------------------

# Dev-toolchain floor shared with the repo: 20.19+ | 22.13+ | 24+.
function Test-NodeVersion {
    param([version]$V)
    if ($V.Major -ge 24) { return $true }
    if ($V.Major -eq 20 -and $V -ge [version]'20.19.0') { return $true }
    if ($V.Major -eq 22 -and $V -ge [version]'22.13.0') { return $true }
    return $false
}

function Get-NodeStatus {
    $node = Get-Command node -ErrorAction SilentlyContinue
    if (-not $node) { return @{ ok = $false; detail = 'node is not on PATH' } }
    $raw = (& node --version) 2>$null
    $v = $null
    if ($raw -match 'v?(\d+\.\d+\.\d+)') { $v = [version]$Matches[1] }
    if (-not $v) { return @{ ok = $false; detail = "could not parse node version from '$raw'" } }
    if (-not (Test-NodeVersion $v)) {
        return @{ ok = $false; detail = "node $v is outside the tested range (20.19+ / 22.13+ / 24+)" }
    }
    return @{ ok = $true; detail = "node $v" }
}

# --- Codex discovery ----------------------------------------------------------

# -CodexPath wins outright. Otherwise PATH is the only discovery surface --
# versioned/hashed desktop bundle directories are observations, not paths to
# guess. Multiple PATH candidates are an ambiguity report, never a pick.
function Resolve-Codex {
    param([string]$ExplicitPath)
    if ($ExplicitPath) {
        if (-not (Test-Path -LiteralPath $ExplicitPath)) {
            Stop-WithGuidance "-CodexPath does not exist: $ExplicitPath" @(
                'Pass the full path to the Codex CLI executable, or omit -CodexPath to use PATH.'
            )
        }
        return @{ path = $ExplicitPath; source = '-CodexPath' }
    }
    $candidates = @(
        Get-Command codex -All -ErrorAction SilentlyContinue |
            ForEach-Object { $_.Source } |
            Sort-Object -Unique
    )
    if ($candidates.Count -eq 0) {
        Stop-WithGuidance 'codex was not found on PATH' @(
            "Install Codex CLI $script:TestedCodexVersion (the tested alpha runtime), open a new PowerShell window, and re-run.",
            'Or pass -CodexPath <full path to codex>.'
        )
    }
    if ($candidates.Count -gt 1) {
        Stop-WithGuidance "more than one codex is on PATH: $($candidates -join '; ')" @(
            'Pick one explicitly: .\install.ps1 -CodexPath "<full path to codex>"'
        )
    }
    return @{ path = $candidates[0]; source = 'PATH' }
}

function Get-CodexVersion {
    param([string]$Codex)
    $raw = (& $Codex --version 2>$null) -join ' '
    if ($raw -match 'codex-cli\s+(\S+)') { return $Matches[1] }
    if ($raw -match '(\d+\.\d+\.\d+\S*)') { return $Matches[1] }
    return $null
}

function Assert-TestedCodex {
    param([string]$Codex)
    $v = Get-CodexVersion $Codex
    if (-not $v) {
        Stop-WithGuidance "could not read a version from '$Codex --version'" @(
            "The alpha is tested on codex-cli $script:TestedCodexVersion only."
        )
    }
    if ($v -ne $script:TestedCodexVersion) {
        Stop-WithGuidance "codex-cli $v is installed; the tested alpha runtime is $script:TestedCodexVersion" @(
            "Install codex-cli $script:TestedCodexVersion, or pass -CodexPath pointing at it.",
            'Newer/global Codex versions are not claimed to work -- do not retry expecting support.'
        )
    }
    return $v
}

# --- supported CLI JSON ------------------------------------------------------

function Invoke-CodexJson {
    param([string]$Codex, [string[]]$Arguments)
    # Stderr is intentionally not swallowed: when a call fails, the CLI's own
    # error text is the most useful remediation output.
    $out = & $Codex @Arguments '--json'
    if ($LASTEXITCODE -ne 0) {
        Stop-WithGuidance "codex $($Arguments -join ' ') exited $LASTEXITCODE" @(
            'Run the command manually to see the CLI error, then re-run this script.'
        )
    }
    try { return ($out -join "`n") | ConvertFrom-Json }
    catch {
        Stop-WithGuidance "codex $($Arguments -join ' ') did not return the expected JSON" @(
            "Expected the observed CLI JSON schema on codex-cli $script:TestedCodexVersion.",
            'Re-run with the tested runtime or report this output to the coordinator.'
        )
    }
}

function Get-Marketplaces {
    param([string]$Codex)
    $doc = Invoke-CodexJson $Codex @('plugin', 'marketplace', 'list')
    # Observed schema: { marketplaces: [ { name, root } ] }
    return @($doc.marketplaces)
}

function Get-PluginState {
    param([string]$Codex)
    $doc = Invoke-CodexJson $Codex @('plugin', 'list', '--available')
    # Observed schema: { installed: [ { name, version, enabled, source:{path},
    #   marketplaceSource:{sourceType,source}, marketplace } ], available: [...] }
    return @{ installed = @($doc.installed); available = @($doc.available) }
}

# --- endpoint ----------------------------------------------------------------

function Get-PackagedEndpoint {
    param([string]$PluginRoot)
    foreach ($name in @('.mcp.json', 'mcp.json')) {
        $path = Join-Path $PluginRoot $name
        if (-not (Test-Path -LiteralPath $path)) { continue }
        try { $doc = Get-Content -LiteralPath $path -Raw | ConvertFrom-Json }
        catch { return @{ ok = $false; detail = "$name is not valid JSON" } }
        $url = $doc.mcpServers.'visual-team'.url
        $parsed = $null
        try { $parsed = [Uri]$url } catch { }
        if (-not $parsed -or -not $parsed.IsAbsoluteUri -or ($parsed.Scheme -notin @('http', 'https'))) {
            return @{ ok = $false; detail = "$name mcpServers.visual-team.url is not a valid http(s) URL" }
        }
        return @{ ok = $true; url = $parsed.AbsoluteUri; config = $name }
    }
    return @{ ok = $false; detail = 'no .mcp.json or mcp.json in the packaged plugin' }
}

function Test-EndpointHealth {
    param([string]$McpUrl)
    $origin = ([Uri]$McpUrl).GetLeftPart([System.UriPartial]::Authority)
    $healthz = "$origin/healthz"
    try {
        $res = Invoke-WebRequest -Uri $healthz -UseBasicParsing -TimeoutSec 8 -Method Get
        if ($res.StatusCode -eq 200) { return @{ ok = $true; detail = "$healthz responded 200" } }
        return @{ ok = $false; detail = "$healthz responded $($res.StatusCode)" }
    } catch {
        return @{ ok = $false; detail = "$healthz unreachable: $($_.Exception.Message)" }
    }
}
