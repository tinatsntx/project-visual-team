# SWE-2 brief 012 — Guided private-alpha setup

Owner approved 2026-09-16; follows brief 011. Implement locally and commit
separately. Codex owns publication/deployment/real-host acceptance. No automatic
trust, account/permission changes, plugin cache modifications or deployments.
Do not edit coordinator-owned private-alpha-test-kit/results materials.

## Deliverable

Generate a versioned prebuilt Windows native compatibility alpha folder/archive
under dist, containing the existing complete marketplace/plugin artifact,
install.ps1, read-only doctor.ps1, concise Try/Install/Verify/Recover instructions,
and an integrity manifest tying packaged files to the reviewed source revision.
No source build, npm install or JSON edits in participant instructions. Keep
Node prerequisite explicit (20.19+/22.13+/24+ per existing tested range); no
bundled or downloaded runtime. Use tested native runtime 0.154.0-alpha.6.2;
do not claim every newer/global Codex version works. A configurable endpoint
belongs to developer packaging, not participant installation.

## Single endpoint

Hook URL precedence: defined VISUAL_TEAM_MCP_URL override; otherwise packaged
MCP config resolved relative to the script installed root (Legacy .mcp.json,
portable mcp.json). Read only mcpServers.visual-team.url. Accept valid HTTP(S).
A defined empty/malformed override, missing/malformed selected config, or invalid
scheme means silent exit 0 and no delivery, not a fallback to another endpoint.
Remove implicit localhost fallback; local development sets a valid config or
explicit URL. Keep existing bounded hook runtime, allowlist, receipt correlation,
private transport, record-only semantics and no stdout/stderr. Preserve source to
artifact parity. Update dev/harness tests relying on the former default explicitly.

## Installer and diagnostics

- PowerShell install.ps1 and doctor.ps1 support -CodexPath. Explicit path wins;
  otherwise discover desktop-bundled candidates conservatively and accept only
  one matching tested version. Report ambiguity/absence or unsupported version
  with actionable instructions, never guess a hashed binary path.
- Check Node on PATH, version, package integrity/layout, paired endpoint and
  /healthz, supported Codex CLI, marketplace and installed/enabled plugin state.
  Use actual supported CLI JSON commands; verify their schema. Doctor is read-only
  and distinguishes configuration/health from actual hook trust/delivery.
- If an enabled different visual-team plugin exists, or same marketplace/plugin
  points at conflicting source/version, stop with explicit remediation. Never
  disable/remove/upgrade unrelated or existing installs automatically.
- Add local marketplace and target plugin via supported CLI only if absent.
  Identical repeat install is a successful no-op. Stable alpha extraction directory
  must be kept after installation (marketplace source is local).
- Finish with the required normal /hooks review/trust of nine entries and explicit
  skill invocation. No fake observed-event probe. Actual delivery is established
  later through a real harmless Codex task; health alone is not readiness proof.
- Test installer decisions with controlled CLI stubs and execution in temporary
  directories, not static-string assertions alone; doctor must not mutate installs.

## Documentation and boundaries

Rewrite primary onboarding Try it -> Install -> Verify -> Recover. Separate
contributor/self-hosting setup, versions and endpoint overrides. Guided alpha
uses coordinator-prepared ChatGPT developer registration/attachment and disposable
tasks, one participant at a time; .app.json does not register a tester automatically.
No authentication/accounts/database/public listing expansion. Single-user ephemeral
service and restart/TTL limitations remain explicit. Do not promise public self-service.
Update relevant setup/README/compat/handoff documents and package script reference.

## Checks and return

Endpoint tests: portable/Legacy configuration, valid override, invalid defined
override, malformed/missing config, non-http(s), foreign cwd and installed path
with spaces. Assert no network delivery on invalid settings and exit 0/silence.
Installer tests: prerequisites/versions, integrity mismatch, endpoint failure,
fresh install, identical re-run, conflicting source/version, duplicate enabled
plugin, missing JSON/CLI failures; no trust/cache modifications.

Run lint/typecheck/full tests/build/compat verification and prior probes. Include
clean committed-source generation plus archive-content/hash checks; source SHA
must identify actual packaged code (avoid self-referential embedded commit hash).
Return separate commit, generated deliverable path, exact checks and known limits.
Do not install on the owner's real profile; coordinator handles live acceptance.

## Coordinator runtime observations (2026-09-16)

The accepted runtime currently resolves to desktop bundle `12219cbfbcbddde7`
and reports `codex-cli 0.154.0-alpha.6.2`; that directory is an observation,
not a stable path to hard-code. Node on this machine is v24.12.0.
`plugin marketplace list --json` returns `{marketplaces:[{name,root}]}`.
`plugin list --available --json` returns `{installed:[...],available:[...]}`;
installed entries carry `name`, `version`, `enabled`, `source.path`, and
`marketplaceSource:{sourceType:'local',source:...}`. Their `marketplace` field
can be null. Normalize absolute Windows paths and the extended-length prefix
before comparison. Current personal Visual Team is disabled; native Visual
Team is enabled. A disabled alternate must not become a false duplicate.
Both marketplace add and plugin add support `--json` on this runtime.
These read-only observations are acceptance inputs, not evidence that the
new installer or hooks work.
