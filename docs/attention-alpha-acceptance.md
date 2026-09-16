# Attention/results and guided alpha — coordinator acceptance

2026-09-16. Owner approved the attention/results default, optional team view,
simplified private-alpha setup, and guided participant sessions. This record
tracks briefs 011 and 012. It does not replace accepted historical M0–M4 evidence.

## Baseline and ownership

- Starting source: `edee355`; deployed product before this round: `0f0e3ab`.
- Supported acceptance path: Windows Codex CLI `0.154.0-alpha.6.2`, ChatGPT web,
  existing Render service `srv-dak13nmk1f9s73ajm0dg`; automatic deploy remains off.
- SWE-2 receives implementation/review corrections directly through the existing
  Devin Visual Team conversation. Codex owns independent checks and publication.
- Coding briefs: [011](swe-2-brief-011.md), [012](swe-2-brief-012.md).
- Baseline local browser observation (`completed-verified` synthetic fixture,
  2026-09-16 14:43 UTC): default inline card shows "completed Alex is done."
  and Open team/Pop out/View details; no completion summary or verification
  is visible without another action. This is the comparison baseline, not
  real participant evidence.

## Acceptance ledger

| Area | Required evidence | Status |
|---|---|---|
| Default summary | Needs/action location first; status, latest activity, confirmation separate; no default characters | 62eecbd: source, focused tests and local browser pass; real host pending |
| Results | Structured reported result retained; no parsed or inferred verification; legacy data honest | Structured/legacy/misleading-text tests and local all-mode results pass |
| Truth invariants | Receipt admission/atomicity, deterministic replay, deduplication, terminal freeze, private capability boundary | All nine coordinator probe cases pass; six public input signatures unchanged |
| Optional team | Explicit view/motion opt-in; reset on task change; reduced motion/stale/inactivity suppress motion | Focused tests and actual App task-switch/reduced-motion checks pass |
| Package | Versioned prebuilt artifact and integrity; single endpoint; installer/doctor; normal trust | Clean 18f3a18 ZIP and all 18 manifested files verified; ten endpoint tests pass; normal hook review pending live acceptance |
| Installation | Controlled CLI tests and actual isolated installation/idempotence; no unintended profile changes | Final 18f3a18 artifact passes all six actual native checks, including no-op repeat, conflict refusal and owner-state preservation |
| Local checks | Lint, typecheck, full tests, build, compatibility and coordinator probes | 2219d36: independently pass lint, typecheck, 292/292 tests (54 suites), build, native compatibility, seven coordinator probes and unchanged six-tool inputs |
| Live service | Published SHA/CI, deploy SHA, health, widget resource identity | Pending reviewed source |
| Real widget | Native event, pending permission, completion, controlled read failure/recovery in mounted widget | Pending deployment |
| Accessibility | Keyboard/focus, dark theme, reduced motion and display modes | Local keyboard disclosure/retry, dark and reduced-motion pass; real host pending |
| Participants | Five actual participants; comparison and 2–7-day voluntary repeat-use follow-up | Pending people; no collected results |

## Participant evidence

The updated [study kit](private-alpha-test-kit.md) and
[blank results template](private-alpha-results-template.md) separate guided setup,
unassisted installation, comprehension, preference, comparison time, repeat use,
and false-proof inference. Agents cannot fill in participant answers. Software
acceptance alone does not establish useful demand or public-release readiness.

## Execution checkpoint

Both briefs were delivered directly to the existing Devin Visual Team session
with SWE-2 Max. The initial exploration-only pass was stopped after more than
twenty minutes without edits; SWE-2 resumed with instructions to implement 011
directly, commit it separately, and continue 012 during coordinator review.
At the initial checkpoint no product change was present. The 15:45 UTC
checkpoint below supersedes that source status. No new product commit, push,
or deployment has been accepted. Do not interpret the dispatch as acceptance.

Coordinator preparation is complete: the study kit and blank results template,
the two bounded briefs, and `evals/brief-011-coordinator-probe.mts`. The new probe
passes typechecking and lint; its intermediate behavioral results are below.
The live six-tool input schemas were captured before changes in the ignored
`dist/attention-baseline-inputs.json` for a later semantic comparison.

The thread heartbeat `visual-team-attention-alpha-coordination` is active to
continue SWE-2 review/fix/deployment/acceptance checks without owner relay. It
must stay quiet on unchanged status and pause once technical acceptance is
complete or unavoidable owner input is required. Participant evidence remains
pending. Preserve these coordinator files separately from SWE-2 product commits.

### Intermediate review — 2026-09-16 15:45 UTC

SWE-2 has implemented initial 011 changes and is running its tests. Independent
review produced [one bounded correction brief](swe-2-brief-011-review-1.md),
queued directly in Devin; delivery acknowledgment/fixes are still pending.
The coordinator independently reran the expanded probe (exit 1):

- Pass: accepted HTTP structured receipt with no free-text verification inference.
- Pass: duplicate and post-terminal finishes preserve the receipt.
- Pass: receipt on wrong event kind/observed/derived provenance rejects atomically.
- Fail: direct receipt bypasses combined 640-character bound and nested allowlist.
- Fail: caller mutation changes the journal receipt and replay.
- Fail: public `summary:''` finish rejects instead of completing the active task.

UI review additionally requires task-specific view/motion reset, attention-first
PiP with successful-refresh time, retained reported workflow phase, clear
originating-chat instructions, and evidence-bounded nonterminal results wording.
These are intermediate findings, not a full acceptance verdict. A local
`tools/list` semantic comparison against the captured deployed baseline passes:
all six tool names and input schemas remain unchanged.

### 6180c21 review — 2026-09-16 16:03 UTC

Initial brief 011 is committed locally as `6180c21`; it is not accepted,
pushed, or deployed. SWE-2 is implementing 012, with the UI correction brief
still queued in Devin. Independent code review confirms its UI findings remain.
The coordinator's refined probe now passes five cases and fails only the exact
combined-size boundary: mapper-formatted 640 is accepted and 641 rejected, but
the reducer still accepts the 641-character receipt because its raw-value sum
omits formatting overhead. Nested unknown keys, retained-journal detachment,
and empty-summary compatibility now pass. The six input schemas still match
the captured deployed baseline semantically.

Local browser observation of the built `completed-verified` fixture confirms
the default inline summary exposes the reported result, `Reported checks:
passed`, and artifact references without opening the team. It shows separate
activity and successful-refresh times, with no default characters. This is a
synthetic local check, not a deployed or participant result.

In the same mounted `reported-question` fixture, selecting read rejection at
16:05:43 UTC produced the explicit last-confirmed-state notice. The pending
question and last activity remained visible; successful refresh stayed at
16:05:41. Restoring reads at 16:06:01 recovered automatically on the 16:06:05
poll, retaining the question and advancing only the refresh time. The attempted
manual retry occurred after its button had disappeared, so this observation
proves automatic same-widget recovery, not keyboard/manual-retry acceptance.

The initial 012 endpoint change independently passes all nine executable hook
resolution tests: packaged portable/Legacy config, valid and invalid overrides,
missing/malformed config, invalid schemes, foreign working directory, and paths
with spaces. Read-only review found no endpoint implementation defect. Packaging,
installer/doctor behavior, and real native delivery remain pending. A valid-both-
configs precedence case should be included in final package verification.

### Initial 012 review — 2026-09-16 16:12 UTC

The in-progress installer/package is not accepted. The separate
[012 correction brief](swe-2-brief-012-review-1.md) records independently
reproduced Windows PowerShell 5.1 parsing and reserved-`$Args` failures, plus
source-version identity, desktop runtime discovery, strict CLI-state validation,
preflight conflict detection, post-install readback, and diagnostic scope gaps.
The queued 011 review now links to this companion review. No installer was run
against the owner's profile, and no hook trust or production service changed.

### Continuation checkpoint — 2026-09-16 16:27 UTC

SWE-2 remains active on 012 executable tests. The current helper now uses a
normal `Arguments` parameter and ASCII punctuation; the initial reserved-name
and encoding findings have been addressed in its working tree. The remaining
review is still pending, with HEAD unchanged at `6180c21`. The existing queued
Devin message was edited in place to name both review files and the precise
remaining checks; no duplicate prompt or coding interruption was sent. Package
and 011 correction acceptance, full checks, publication, and real-host testing
remain pending. No production or owner-profile changes were made.

At 16:33 UTC, an isolated source-copy diagnostic separated an inherited PS5
module-path failure from the intended CLI-failure test. With the module path
corrected for that child process, the stub still yielded exit 0 and add calls
despite its configured query failure. The companion 012 review records exact
evidence and reproduction location. SWE-2 is actively narrowing this to its
batch stub's conditional structure, so it was not interrupted. This is test
fixture/launch-path evidence, not a demonstrated defect in the real Codex CLI.

### Committed baseline and review uptake — 2026-09-16 16:46 UTC

SWE-2 committed `2dd4580` (exact serialized completion bound) and `3e279db`
(initial 012 package). The coordinator independently reran all six receipt
probe cases: all pass, including formatted 640 acceptance and 641 atomic
rejection. The six deployed-baseline tool input signatures remain unchanged.
SWE-2's return identifies the test's nested batch conditionals as the cause of
its swallowed stub exit; this does not establish a real Codex runtime defect.

The queued consolidated review was consumed automatically; SWE-2 is now
implementing the remaining 011 and 012 corrections. No extra interruption was
sent. Primary onboarding is also explicitly flagged in the 012 review: current
setup documentation still claims removed hook defaults and duplicated endpoint
configuration, so the initial package commit is not accepted as complete.
No new revision has been published, deployed, or installed on the owner profile.

### Phase follow-up — 2026-09-16 20:17 UTC

SWE-2's working tree now includes the 011 UI corrections and retained reported
phase metadata. The extended coordinator probe independently passes eight cases:
all six receipt cases, HTTP phase retention after native activity, and full
snapshot replay plus retained-log trimming. One phase-admission case fails:
reported unrelated/mismatched events and an unknown phase string are accepted.
The bounded [011 follow-up](swe-2-brief-011-review-2.md) records that issue and a
PiP last-known-copy regression. Source review confirms task-key reset, question
location, and nonterminal result wording were corrected; browser acceptance is
still pending the completed build. No source was published or deployed.
The coordinator probe passes lint and the current tree passes typecheck. The
follow-up was queued directly in Devin without interrupting the running tests.

### Corrected 011 independent checks — 2026-09-16 20:33 UTC

SWE-2 committed `62eecbd`. The unchanged nine-case coordinator probe now
passes, including every invalid/provenance/mismatched phase admission case.
Source review confirms the PiP last-confirmed wording is restored. The
coordinator rebuilt only the UI workspace for browser acceptance (165.8 kB
widget, 476.4 kB dev host, 5.3 kB CSS); the older local bundle had not contained
the final copy correction. This does not replace the final full build/checks.

Local synthetic browser checks on that rebuild confirm originating-chat
question instructions, separate activity/refresh timestamps, dark appearance,
visible keyboard focus, and no motion control or animated class with reduced
motion enabled. Opening team/evidence and enabling motion, then using the
normal harness task-switch notification, closes both disclosures on the new
task and restores motion off. Completed results, reported checks and artifact
references appear without opening the team, in inline and fullscreen; PiP's
Results disclosure opens with Enter and reveals the same receipt. The
iframe remains mounted through host mode changes and task changes.

PiP controlled read rejection preserves the question and last successful
refresh, and explicitly says "Updates paused — last confirmed state shown."
Restored reads recover automatically in the same widget. A manual-success
retry attempt again raced automatic recovery; it is not counted as manual
retry proof. No live ChatGPT/native or participant result is claimed here.

At 20:37:35 UTC, Enter on Try again while rejection remained enabled issued
a failed read and left the last successful refresh at 20:37:09. After restoring
reads, Enter at 20:37:43 issued a successful read between the scheduled
20:37:41 and 20:37:45 polls: the notice cleared, refresh advanced to 20:37:43,
and the pending question/activity stayed unchanged. This supplies the missing
manual keyboard-retry proof. The permission fixture also preserves its
attributed "Alex needs approval" instruction above status after an unrelated
specialist finish, with response directed to Codex. All observations are local
and synthetic. Temporary browser media emulation was reset.

The coordinator independently ran the current UI and state-machine test files:
198/198 pass across 42 suites. A fresh semantic comparison of tools/list against
the captured deployed baseline passes for all six public input signatures.
The in-place Devin queue now reports 011 review-2 resolved and asks SWE-2 to
finish the existing 012 corrections; no duplicate task was started.

The unchanged brief-004 and M0/M1/M2/M3/M4 coordinator probes also pass
independently on this source, including session isolation, permission attribution,
terminal freeze, receipt retention, misleading verification text and stale
confirmation time. These localhost/synthetic probes do not claim live delivery.

### Installer continuation checkpoint — 2026-09-16 20:46 UTC

HEAD remains `62eecbd`; SWE-2 is implementing 012 review corrections in the
builder, installer, doctor, shared helper and execution tests. The coordinator's
read-only preflight confirms automatic discovery selects the supported desktop
Codex. It also reproduces a schema incompatibility: valid unrelated remote
plugins have `source: {source: "remote", id: <string>}` rather than a local
`source.path`, and the in-progress helper incorrectly rejects them. A separate
child-process diagnostic finds that a defined whitespace endpoint override is
reported as absent instead of invalid. Both precise cases are appended to the
existing 012 review, and the single Devin queue item was updated in place and
read back. No duplicate prompt, installation or trust change was issued.

Next: complete/review the separate 012 correction commit, execute the installer
against an isolated real native profile, verify package/archive source identity,
run the final full checks, finish controlling-spec M5 thresholds/stopping rule,
then publish and deploy reviewed source and run the real ChatGPT/native pass.
The existing coordination heartbeat remains in use; participant evidence is
still pending and cannot be supplied by these software checks.

### Actual isolated Windows install — 2026-09-16 21:09 UTC

SWE-2 committed `29604175bfbac103e21704a34f45e1aab6cd4a36`, then consumed
the single consolidated follow-up. It is correcting the real remote-plugin
schema, defined whitespace override, ignored nested-export source identity,
and the existing marketplace-source comparison requirement. Reproductions
are in the 012 review; this commit is not fully accepted or deployed.

The coordinator independently passes all ten hook endpoint tests, including
both valid configs selecting Legacy `.mcp.json` only. The first actual native
installer run used a manifest/hash-verified copy of the 2960417 package at
`dist/coordinator native acceptance 2960417/visual-team-alpha-0.1.0-29604175bfba/`
and a fresh child-only `CODEX_HOME` under `dist/native alpha profile N7Qfxe/`.
Both paths contain spaces. `evals/brief-012-native-install-probe.mts` exits 0:

- Fresh native profile contains no Visual Team marketplace/plugin.
- Windows PowerShell 5.1 installation through actual Codex 0.154.0-alpha.6.2
  succeeds; independent readback confirms enabled plugin version, plugin path,
  marketplace root and marketplaceSource identity.
- The identical second install explicitly reports no change and leaves the
  returned installation state identical.
- Doctor succeeds and leaves installation state identical; it explicitly
  says health/configuration are not proof of hook delivery.
- Owner Visual Team installation state is unchanged before/after the run.
  No hook review/trust or hook execution was performed.

The first probe launch hit Node's default output-buffer limit while reading
the large available-plugin catalog, before installation. The coordinator
runner now accommodates the catalog in memory and suppresses it in diagnostics;
this was a probe issue, not an installer defect. The corrected probe passes
lint; its initial code passed typecheck. Final checks will cover the completed
tree and rerun the final artifact, including archive verification.

The controlling specification now includes the approved five-participant,
ten-second, preference, paired-time and voluntary-repeat thresholds, assisted
setup measurement and feature-expansion stopping rule. Those spec changes
are included in 2960417. Study results remain blank; no participant trial has
been conducted. No new source was pushed, deployed or installed into the
owner's profile.

### Final installer corrections — 2026-09-16 21:32 UTC

SWE-2 committed `14bb105c09676dc61dab505d37c7c3ba39d7ceff` for the remaining
reproductions. Independent read-only checks against the actual native CLI now
accept all 50 installed plugin entries, including unrelated remote plugins;
the personal Visual Team remains disabled and the native copy enabled.
A defined whitespace endpoint override is correctly reported as invalid.
The modified nested source export is now `unverified-preview` rather than
inheriting the ancestor repository's commit identity.

The final narrow schema correction is committed at `18f3a18`: a synthetic Visual Team
entry with `enabled: "false"` must be rejected instead of coercing to true.
The coordinator's unchanged child-PowerShell reproduction now rejects it
with the required Boolean-field diagnostic. SWE-2 reports lint, typecheck,
292 tests, build and the coordinator probes passing. The actual final artifact, clean-checkout
archive, full coordinator checks, publication, deployment, and real-host
acceptance still remain; the earlier isolated installer result is not relabeled
as evidence for these later bytes.

### Final artifact and environment-specific test fix — 21:36 UTC

A fresh detached Git worktree of `18f3a18bf64fafa6d34c8eeefd6245223f09ea09`
builds the versioned ZIP without source dependency installation. Its extracted
18 manifested files all match SHA-256, the file set has no extras, and its full
source identity is correct. Archive SHA-256:
`145f66ac2f519dd12c30b12e1d45cadabc60a4c746181c4f8dabd415dae76b39`.

The coordinator's actual native installer probe passes all six cases on that
archive extracted under `dist/guided alpha 18f3a18/`: fresh-profile isolation,
installation identity, identical repeat no-op, read-only doctor, refusal of a
conflicting earlier package with unchanged state, and unchanged owner Visual
Team installation. Both extraction and native profile paths contain spaces.
The retained new isolated profile is `dist/native alpha profile yX5RSk/`.
This proves installation, not hook trust or delivery.

Independent lint, typecheck, build and verbatim embedding pass. The full test
run passes 291/292; the unsupported-runtime fixture reproducibly fails before
version detection because its bespoke PowerShell child inherits the parent's
module path (`Get-FileHash` unavailable). It also bypasses the shared helper's
isolated desktop discovery. The captured stderr identifies the test fixture,
not a runtime selection failure. A precise test-only correction was sent to
SWE-2: reuse `runPs` with the unsupported version override and preserve the
no-add assertion. Final full tests will be rerun after that correction.

SWE-2's test-only correction is `2219d36`. Independent diff review confirms
no packaged input or product file changed after the verified 18f3a18 artifact.
The previously failing case now passes in the coordinator environment; the
final full suite is running. Lint and typecheck pass again. All seven existing
and new coordinator probes pass, and the semantic six-tool input comparison
against the pre-change deployed baseline is unchanged.

At 21:43 UTC the full coordinator test run passes 292/292 (54 suites), with
zero skipped tests, and the native compatibility verifier passes. The product
build and byte-for-byte widget embed check pass. Local technical gates are
accepted for publication and live acceptance. This is not yet a live-host or
participant acceptance claim.
