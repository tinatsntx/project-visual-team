# Brief 012 — coordinator review corrections

2026-09-16. In-progress package review. These are bounded acceptance corrections,
not an expansion of private-alpha scope. Preserve coordinator evidence files,
normal hook trust, and supported CLI operations. Do not install on the owner's
profile, push, or deploy. Review will be completed after executable tests.

## Package identity and source provenance

The initial builder writes every revision into the same `dist/visual-team-alpha`
directory and `visual-team-alpha.zip`, while installation keeps this directory
as a live marketplace source. The package is not yet versioned as requested.
Use a revision/version-specific package directory and archive identity so a new
build cannot silently replace the source of an earlier installed alpha. Make
identical-package re-runs a no-op, but detect a different package revision or
plugin version as a conflict with explicit supported remediation.

The initial `sourceRevision()` returns HEAD even when packaged plugin/installer/
builder inputs are uncommitted, accepts any override string, and falls back to
`unknown`. That can label new package bytes as an older reviewed commit. Ensure
the distributable manifest identifies the actual packaged committed source;
reject or explicitly separate unverified previews. A full explicit source SHA
for a clean archive export is fine, with its source-to-artifact proof. Do not
require unrelated coordinator evidence files to be committed just to test a
clean source export. Validate the source identity before deleting/replacing
output. Keep the normal Linux/Render build independent of Windows packaging.

## Executable PowerShell blockers

- `Invoke-CodexJson` declares `$Args`, a PowerShell automatic variable. A direct
  isolated reproduction confirms the passed subcommand array is lost. Rename
  it to a normal name such as `$CliArgs`, and assert exact argv in executable
  CLI-stub tests for query and add operations.
- The shared helper is UTF-8 without a BOM and contains an em dash in a quoted
  string. The required Windows PowerShell 5.1 parser misdecodes it and fails at
  line 15; dot-sourcing it under `powershell -NoProfile` was reproduced to fail.
  Use ASCII-only scripts or UTF-8 with BOM. Parse and execute under actual
  Windows PowerShell 5.1 as well as any pwsh tests. Recheck all participant ps1
  files and the generated/extracted copy.

## Runtime selection and preflight

- PATH-only discovery does not satisfy the required desktop-bundled discovery.
  On the actual machine PATH exposes npm wrappers plus the desktop executable,
  while there is exactly one tested desktop candidate. Enumerate desktop bundle
  candidates conservatively, inspect their versions, and accept exactly one
  matching tested runtime. Explicit `-CodexPath` still wins. No hard-coded hash
  or invented support for other versions. Multiple matching desktop candidates
  require explicit selection; an unsupported global wrapper is not an accepted
  substitute.
- `Get-Marketplaces` / `Get-PluginState` treat missing JSON arrays as empty state.
  Validate the response object, required arrays, and relevant Visual Team entry
  fields before any mutation. Malformed/missing state must stop, not trigger adds.
- Query both marketplace and installed plugins and finish conflict detection
  before adding either. Current ordering adds a marketplace before detecting an
  enabled foreign Visual Team. A known conflict must leave installation state
  unchanged, with explicit remediation.

## Installation identity and diagnostic truth

- Matching `source.path` alone is not an identical install. Check the expected
  packaged plugin version and normalized marketplace source identity as well.
  A conflicting version/source must stop. Re-query after successful add commands
  and verify the exact expected installed/enabled identity; don't infer success
  solely from exit 0 or JSON parsing.
- `Resolve-Codex` calls `exit 1`, which doctor's try/catch cannot catch. Use a
  status return or exception so doctor can report the runtime failure and finish
  its independent read-only checks. Installation can still terminate on failure.
- Doctor currently checks only the packaged endpoint. Make that scope explicit,
  and identify a defined process `VISUAL_TEAM_MCP_URL` override so a healthy
  package is not mistaken for the hook's actual destination. An invalid defined
  override disables delivery; a different valid override means the pair differs.
   Do not silently remove, replace, or fall back from an override.

  Working-tree follow-up: the new `Get-EndpointOverride` uses
  `IsNullOrWhiteSpace` to label an override absent. A child-process check with
  `VISUAL_TEAM_MCP_URL='   '` independently returns `state: absent`, while the
  hook correctly treats that defined value as invalid and sends nothing.
  Distinguish variable absence from a defined empty/whitespace value; the
  latter is an invalid override. Include it in executable doctor tests.

These findings come from current source plus isolated read-only reproductions;
no owner-profile installation or trust change was performed. Recheck against
the completed implementation, preserve supported commands and normal `/hooks`
review, and return a separate correction commit if the initial 012 is committed.
No package is accepted yet.

## Participant onboarding (3e279db recheck)

The committed 012 has only the packaged README; primary `docs/setup.md` still
opens with npm/source builds and manual ChatGPT registration, claims an implicit
localhost hook default, and requires duplicated hosted endpoint configuration.
These claims are now stale and contradict the approved participant path. Finish
the original brief's Try it -> Install -> Verify -> Recover onboarding in the
primary README/setup entry points, and move/label contributor/self-hosting steps
separately. The packaged instructions must have a distinct Install step as well.
Explain coordinator-prepared ChatGPT registration, one participant at a time,
disposable tasks, and normal /hooks review; do not promise independent-account
or self-service readiness. Update native-compat command references and source
revision-specific package paths consistently.

## Focused CLI-failure test reproduction (16:33 UTC)

The coordinator reproduced the currently failing `stops when the CLI itself
fails` case in an isolated source copy, without regenerating the shared package
or touching any real profile. See ignored
`dist/coordinator-installer-diagnostic-20260916/` for the exact diagnostic copy.

1. Including stderr in the failure message revealed `Get-FileHash` not found:
   inherited PowerShell module paths prevented the Windows PowerShell 5.1
   fixture from reaching its CLI check. Set a correct child-process module path
   for this controlled PS5 fixture; do not alter the owner's environment.
2. With the child using System32/WindowsPowerShell/v1.0/Modules, the same test
   reaches the CLI but exits **0**, issuing both add commands despite
   `VT_STUB_EXIT=3`. Instrumentation immediately after the native command sees
   LASTEXITCODE 0 (global/script also 0, env override 3), with correct captured
   argv: `plugin marketplace list --json`, etc. The isolated helper does reject
   a separate direct native exit-3 command, so the .cmd fixture/launch path needs
   diagnosis. This is not yet a claim that the real Codex executable masks exits.
3. Do not accept code 1 alone or relax the assertion: prove that the case reaches
   the intended failing query, emits actionable guidance, and executes zero
   mutations. Capture both stdout/stderr in failure diagnostics. Keep actual
   non-JSON/missing-schema cases distinct from native nonzero-exit cases.

The initial argument-name and ASCII parsing fixes are present in current source;
the shared helper now independently loads under Windows PowerShell 5.1.

## Actual native read-only preflight (20:45 UTC)

The new discovery function correctly finds the single accepted desktop binary
on this machine. Calling `Get-PluginState` against its real, read-only
`plugin list --available --json` output currently fails with:
`an installed plugin entry is missing its name or source.path field`.

The CLI returns valid remote installed plugins with
`source: {source: "remote", id: "<string>"}` and no `source.path`. There are
37 such entries here (for example the official Gmail plugin, version 0.1.10,
enabled true). The new helper incorrectly demands a local source path from
every unrelated plugin. Validate the top-level arrays and common identity
types, then apply local-path/marketplace identity checks only where relevant
to the expected local Visual Team installation. Keep duplicate enabled
Visual Team detection effective even for a differently sourced entry.

Add a realistic executable CLI fixture containing a valid unrelated remote
plugin; it must not prevent install or doctor. Continue to reject malformed
relevant Visual Team state before mutations. This was a read-only query;
no marketplace, plugin, trust, or owner configuration changed.

## Source identity must not inherit an unrelated parent checkout (21:01 UTC)

The working-tree `resolveSourceIdentity()` now detects dirty inputs in the
normal root, but a copied/exported source folder underneath ignored `dist/`
inherits the parent's Git repository. Its scoped `git diff` and `git status`
find no tracked input files and it reports the parent HEAD as verified.

Independent reproduction lives in ignored
`dist/coordinator-source-identity-review/`: copied only plugin, alpha packaging
and the two builders, then appended a synthetic changed-input marker to the
copied `packaging/alpha/README.txt`. Calling the copied builder's
`resolveSourceIdentity()` (no package build, archive or install) returns
`{revision:"62eecbda5e1a03b3b27b42017002c54c66ed7515", preview:null}`.
Those copied, modified bytes are not that commit's packaged inputs.

Ensure the named source tree is actually the checkout being verified, or
compare its complete packaged input set to the named commit's tree. An
ancestor repo with untracked/ignored copy paths cannot establish identity.
Keep unrelated coordinator documents from gating a real clean source build;
unsupported standalone exports may be explicitly unverified, never mislabeled.
Add a regression covering a dirty export nested under an ignored directory.

The original normalized marketplace-source identity requirement still applies
before and after install. Source.path + version alone is insufficient; cover
a same-path/same-version plugin with a different marketplaceSource, alongside
valid real remote entries. This is the existing review requirement, not a new
feature or broader host support.

## Relevant CLI field types remain part of the original schema gate

After the remote-source correction, an independent child-PowerShell helper
probe still admits an installed Visual Team entry with `enabled: "false"`
(a string). PowerShell then interprets it as true. The probe returns
`{admitted:true, enabledType:"String", interpretedEnabled:true}`. This is
synthetic malformed CLI data, not a claim about an actual native response.

Complete the original strict-field-type requirement: common identity names
must be strings, and relevant Visual Team `enabled` must be a Boolean, with
valid string version/source/marketplace identity fields as applicable. Reject
malformed relevant state before any add. Cover the string-Boolean case in an
executable installer/doctor fixture while preserving valid unrelated remote
entries and valid disabled alternate installs. No new feature is requested.
