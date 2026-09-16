# Visual Team alpha -- shared helpers for install.ps1 and doctor.ps1.
# Dot-sourced by both scripts; not meant to run alone. Read-only except where
# install.ps1 explicitly calls the supported CLI add commands.
#
# Error model: discovery/query helpers RETURN status objects or THROW
# descriptive errors -- they never `exit`, so doctor.ps1 can catch a failure,
# report it, and keep running its independent read-only checks. install.ps1
# converts failures into Stop-WithGuidance at its own decision points.

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

# Desktop Codex bundles live under %LOCALAPPDATA%\OpenAI\Codex\bin\<build>\.
# The build directory name is a hash that changes per release -- enumerate it,
# never guess it. codex.exe is the real binary; codex.cmd is accepted so
# controlled fixtures can exercise the same discovery path.
function Find-DesktopCodexCandidates {
    $binRoot = Join-Path $env:LOCALAPPDATA 'OpenAI\Codex\bin'
    if (-not (Test-Path -LiteralPath $binRoot)) { return @() }
    $found = @()
    foreach ($dir in (Get-ChildItem -LiteralPath $binRoot -Directory -ErrorAction SilentlyContinue)) {
        foreach ($name in @('codex.exe', 'codex.cmd')) {
            $candidate = Join-Path $dir.FullName $name
            if (Test-Path -LiteralPath $candidate) { $found += $candidate }
        }
    }
    return $found
}

function Get-CodexVersion {
    param([string]$Codex)
    # A discovered candidate may not even execute (e.g. an extensionless npm
    # shim) -- that is an unreadable version, never a fatal error.
    $raw = $null
    try { $raw = (& $Codex --version 2>$null) -join ' ' } catch { $raw = $null }
    if ($raw -match 'codex-cli\s+(\S+)') { return $Matches[1] }
    if ($raw -match '(\d+\.\d+\.\d+\S*)') { return $Matches[1] }
    return $null
}

# Returns @{ ok; path; source; problem; remediation } -- never exits, so
# doctor.ps1 can report the failure and continue its read-only checks.
# -CodexPath wins outright. Otherwise every PATH command and every
# desktop-bundled binary is version-checked; exactly one match for the tested
# runtime resolves, anything else is an actionable report. An unsupported
# global wrapper is never a substitute.
function Resolve-Codex {
    param([string]$ExplicitPath)
    if ($ExplicitPath) {
        if (-not (Test-Path -LiteralPath $ExplicitPath)) {
            return @{
                ok = $false
                problem = "-CodexPath does not exist: $ExplicitPath"
                remediation = @('Pass the full path to the Codex CLI executable, or omit -CodexPath to use discovery.')
            }
        }
        return @{ ok = $true; path = $ExplicitPath; source = '-CodexPath' }
    }

    $candidates = @(
        Get-Command codex -All -ErrorAction SilentlyContinue |
            ForEach-Object { $_.Source }
    )
    $candidates += Find-DesktopCodexCandidates
    $candidates = @($candidates | ForEach-Object { ConvertTo-NormalizedPath $_ } | Sort-Object -Unique)

    if ($candidates.Count -eq 0) {
        return @{
            ok = $false
            problem = 'no codex executable found on PATH or in the desktop bundle'
            remediation = @(
                "Install Codex CLI $script:TestedCodexVersion (the tested alpha runtime), open a new PowerShell window, and re-run.",
                'The desktop app bundles it under %LOCALAPPDATA%\OpenAI\Codex\bin\<build>\codex.exe.',
                'Or pass -CodexPath <full path to codex>.'
            )
        }
    }

    $matching = @()
    $seen = @()
    foreach ($candidate in $candidates) {
        $v = Get-CodexVersion $candidate
        $seen += "$candidate ($v)"
        if ($v -eq $script:TestedCodexVersion) { $matching += $candidate }
    }
    if ($matching.Count -eq 1) {
        return @{ ok = $true; path = $matching[0]; source = 'discovered' }
    }
    if ($matching.Count -gt 1) {
        return @{
            ok = $false
            problem = "more than one codex matches the tested runtime: $($matching -join '; ')"
            remediation = @('Pick one explicitly: .\install.ps1 -CodexPath "<full path to codex>"')
        }
    }
    return @{
        ok = $false
        problem = "no codex on PATH or in the desktop bundle matches the tested runtime $script:TestedCodexVersion -- found: $($seen -join '; ')"
        remediation = @(
            "Install codex-cli $script:TestedCodexVersion, or pass -CodexPath pointing at it.",
            'Other installed Codex versions are not claimed to work -- do not retry expecting support.'
        )
    }
}

# Returns @{ ok; version; detail } -- never exits; the caller decides whether
# an unsupported version is fatal (install) or a report line (doctor).
function Test-TestedCodex {
    param([string]$Codex)
    $v = Get-CodexVersion $Codex
    if (-not $v) {
        return @{ ok = $false; version = $null; detail = "could not read a version from '$Codex --version'" }
    }
    if ($v -ne $script:TestedCodexVersion) {
        return @{
            ok = $false
            version = $v
            detail = "codex-cli $v is installed; the tested alpha runtime is $script:TestedCodexVersion"
        }
    }
    return @{ ok = $true; version = $v; detail = "codex-cli $v" }
}

# --- supported CLI JSON ------------------------------------------------------

# Runs a supported CLI query/mutation and returns parsed JSON. Throws a
# descriptive error (with the CLI's own stderr text when present) on a nonzero
# exit or an unexpected payload -- callers decide how to report it; the CLI
# failure is never hidden.
function Invoke-CodexJson {
    param([string]$Codex, [string[]]$CliArgs)
    $errFile = [IO.Path]::GetTempFileName()
    try {
        $out = & $Codex @CliArgs '--json' 2>$errFile
        $code = $LASTEXITCODE
        $errText = (Get-Content -LiteralPath $errFile -Raw -ErrorAction SilentlyContinue)
    } finally {
        Remove-Item -LiteralPath $errFile -Force -ErrorAction SilentlyContinue
    }
    if ($code -ne 0) {
        $detail = ''
        if ($errText -and $errText.Trim()) { $detail = " -- $($errText.Trim())" }
        throw "codex $($CliArgs -join ' ') exited $code$detail"
    }
    try { return ($out -join "`n") | ConvertFrom-Json }
    catch {
        throw "codex $($CliArgs -join ' ') did not return the expected JSON on codex-cli $script:TestedCodexVersion"
    }
}

# Validates the observed CLI response object before anyone reads state from
# it: the document must carry a real `marketplaces` array, and every entry we
# might compare needs its schema fields. Malformed state throws -- it must
# stop a run, never be mistaken for "nothing installed".
function Get-Marketplaces {
    param([string]$Codex)
    $doc = Invoke-CodexJson $Codex @('plugin', 'marketplace', 'list')
    if (-not $doc -or -not ($doc.PSObject.Properties.Name -contains 'marketplaces') -or -not ($doc.marketplaces -is [array])) {
        throw 'codex plugin marketplace list --json did not return the expected marketplaces array'
    }
    foreach ($entry in $doc.marketplaces) {
        if (-not $entry.name -or -not $entry.root) {
            throw 'a marketplace entry is missing its name or root field'
        }
    }
    # Observed schema: { marketplaces: [ { name, root } ] }
    return @($doc.marketplaces)
}

function Get-PluginState {
    param([string]$Codex)
    $doc = Invoke-CodexJson $Codex @('plugin', 'list', '--available')
    foreach ($field in @('installed', 'available')) {
        if (-not $doc -or -not ($doc.PSObject.Properties.Name -contains $field) -or -not ($doc.$field -is [array])) {
            throw "codex plugin list --available --json did not return the expected $field array"
        }
    }
    foreach ($entry in $doc.installed) {
        # Common identity: a name. Remote plugins carry source:{source:"remote",
        # id:<string>} with no local path -- valid entries, just never ours.
        if (-not $entry.name) {
            throw 'an installed plugin entry is missing its name field'
        }
        if ($entry.name -eq $script:PluginName) {
            # The relevant entry must carry its full shape before state is
            # read: enabled flag, version, and a recognizable source identity.
            if (-not ($entry.PSObject.Properties.Name -contains 'enabled')) {
                throw 'the visual-team plugin entry is missing its enabled field'
            }
            if (-not $entry.version) {
                throw 'the visual-team plugin entry is missing its version field'
            }
            if (-not $entry.source -or (-not $entry.source.path -and -not $entry.source.source)) {
                throw 'the visual-team plugin entry has an unrecognized source shape'
            }
        }
    }
    # Observed schema: { installed: [ { name, version, enabled,
    #   source:{path} | source:{source:"remote",id},
    #   marketplaceSource:{sourceType,source}, marketplace } ], available: [...] }
    return @{ installed = @($doc.installed); available = @($doc.available) }
}

# True when an installed visual-team entry is THIS package's install -- local
# source path, version, AND the normalized local marketplace source all match.
# Same path/version with a different marketplace source is a different install
# record, not ours. Remote/differently-sourced entries are simply not ours.
function Test-OurPluginEntry {
    param($Entry, [string]$OursPath, [string]$OursRoot, [string]$ExpectedVersion)
    if (-not $Entry) { return $false }
    if ((ConvertTo-NormalizedPath $Entry.source.path) -ne $OursPath) { return $false }
    if ($ExpectedVersion -and $Entry.version -ne $ExpectedVersion) { return $false }
    $ms = $Entry.marketplaceSource
    if (-not $ms -or -not $ms.source) { return $false }
    if ($ms.PSObject.Properties.Name -contains 'sourceType' -and $ms.sourceType -ne 'local') { return $false }
    if ((ConvertTo-NormalizedPath $ms.source) -ne $OursRoot) { return $false }
    if ($Entry.PSObject.Properties.Name -contains 'marketplace' -and $Entry.marketplace -and $Entry.marketplace -ne $script:MarketplaceName) { return $false }
    return $true
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

# A defined VISUAL_TEAM_MCP_URL is the hook's actual destination -- it wins
# over the packaged config, so package health alone never proves where events
# go. Reports @{ state = absent|invalid|differs|matches; url? }.
function Get-EndpointOverride {
    param([string]$PackagedUrl)
    # The hook treats any DEFINED value as the destination -- including an
    # empty or whitespace string, which disables delivery. Only a truly unset
    # variable is 'absent'; defined-but-invalid must surface, never read as
    # absent.
    $override = $env:VISUAL_TEAM_MCP_URL
    if ($null -eq $override) {
        return @{ state = 'absent'; url = $null }
    }
    $parsed = $null
    try { $parsed = [Uri]$override } catch { }
    if (-not $parsed -or -not $parsed.IsAbsoluteUri -or ($parsed.Scheme -notin @('http', 'https'))) {
        return @{ state = 'invalid'; url = $override }
    }
    if ($PackagedUrl -and $parsed.AbsoluteUri -ne $PackagedUrl) {
        return @{ state = 'differs'; url = $parsed.AbsoluteUri }
    }
    return @{ state = 'matches'; url = $parsed.AbsoluteUri }
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
