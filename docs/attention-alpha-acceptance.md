# Attention/results and guided alpha — coordinator acceptance

2026-09-16. Owner approved the attention/results default, optional team view,
simplified private-alpha setup, and guided participant sessions. This record
tracks briefs 011 and 012. It does not replace accepted historical M0–M4 evidence.
**Technical acceptance: PASS on the supported guided-alpha path at `5a66481`.**
Product feature expansion is stopped. Five-person usefulness and repeat-use
evidence remains pending actual participants; this is not market validation.

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
| Default summary | Needs/action location first; status, latest activity, confirmation separate; no default characters | PASS: source/focused tests, local browser, real ChatGPT summary and native approval |
| Results | Structured reported result retained; no parsed or inferred verification; legacy data honest | PASS: structured/legacy/missing/misleading-text tests; real reported receipt visible inline, expanded and PiP |
| Truth invariants | Receipt admission/atomicity, deterministic replay, deduplication, terminal freeze, private capability boundary | All nine coordinator probe cases pass; six public input signatures unchanged |
| Optional team | Explicit view/motion opt-in; reset on task change; reduced motion/stale/inactivity suppress motion | PASS: focused tests, actual App task switch, real-host reduced-motion emulation removes the motion affordance |
| Package | Versioned prebuilt artifact and integrity; single endpoint; installer/doctor; normal trust | PASS: final 5a66481 ZIP and 18 payload files verified; ten endpoint cases pass; nine hooks reviewed normally and real delivery observed |
| Installation | Controlled CLI tests and actual isolated installation/idempotence; no unintended profile changes | PASS: final 5a66481 archive passes all six actual native cases, including repeat no-op, conflict refusal and owner-state preservation |
| Local checks | Lint, typecheck, full tests, build, compatibility and coordinator probes | PASS: independent 292-test baseline and seven probes; final Windows CI 293/293, zero skips, lint/typecheck/build/compat; six tool inputs unchanged |
| Live service | Published SHA/CI, deploy SHA, health, widget resource identity | PASS: exact 5a66481 published and deployed; green CI, health 200, six tools, byte-identical hosted widget |
| Real widget | Native event, pending permission, completion, controlled read failure/recovery in mounted widget | PASS: one real task, same mounted card, observed approval, reported completion, failed retries with unchanged timestamp, automatic recovery |
| Accessibility | Keyboard/focus, dark theme, reduced motion and display modes | PASS: real dark theme, focus/keyboard retry and PiP disclosure, reduced-motion emulation, terminal mode switching; local tests supplement |
| Participants | Five actual participants; comparison and 2–7-day voluntary repeat-use follow-up | Pending people; no collected results |

## Participant evidence

The updated [study kit](private-alpha-test-kit.md) and
[blank results template](private-alpha-results-template.md) separate guided setup,
unassisted installation, comprehension, preference, comparison time, repeat use,
and false-proof inference. Agents cannot fill in participant answers. Software
acceptance alone does not establish useful demand or public-release readiness.

## Historical execution checkpoints

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

The thread heartbeat `visual-team-attention-alpha-coordination` continued
SWE-2 review/fix/deployment/acceptance checks without owner relay and was
paused at technical closeout. Participant evidence remains pending. These
coordinator records are committed separately from SWE-2 product changes.

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

### Publication and hosted environment checks — 21:52 UTC

Coordinator records are committed at `76649c6d39727b6f1b7cf928e0829a0acffee7fb`
and remote main matches. Render deployment `dep-dalgrebm8hqs739hmnr0` of that
exact revision failed before promotion: 269/273 applicable Linux tests passed,
and four React view-state tests failed because `act()` is unavailable when
the test process inherits `NODE_ENV=production`. The coordinator reproduces
all four failures under production and all four passes under test. SWE-2 is
adding a test-only preload so `npm test` uses the test environment before React
loads, without changing the production build or server environment.

Windows CI run `35154018038` separately passed 291/292 and failed only the
standalone clean-checkout source-identity assertion (`unverified-preview`
instead of its own HEAD). All executable installer cases passed there. The
exact log is retained in ignored `dist/attention-ci-failure.log`; the finding
was queued once in Devin for bounded diagnosis. No checks are being skipped.
The previous accepted Render deployment remains live.

The owner native installation was updated through supported `plugin remove`,
`marketplace remove`, and the verified package's installer. The disabled
personal plugin was preserved. Installed hook script SHA-256 is
`769cee7a370a24c501cc7f095e3287080aeb17af1b293cdc73fffbb7f46a00ce`, matching
reviewed source; packaged endpoint is the existing Render MCP service.
Normal `/hooks` review shows nine installed/active entries and retained
Trusted status on the inspected PreToolUse entry. A menu-navigation toggle
briefly disabled that entry and was immediately restored before any native
acceptance task or action. No cache, trust hash, or global approval policy was
edited manually. Live delivery remains pending the corrected deployment.

The React preload is committed as `2c805b1`. The coordinator independently
reruns all four affected view-state cases under inherited production with
that preload: 4/4 pass. Before the path correction, both source-identity cases
also pass locally on Node 22; the failing hosted case is not reproduced by
switching Node major alone. SWE-2's in-progress correction canonicalizes the
filesystem paths before comparing the Git checkout root and module root and
adds bounded gate-reason diagnostics. Both identity cases pass independently
locally with that change. The hosted rerun is still required; the precise
Windows runner cause is not claimed proven by these local tests.

### Windows alias reproduction — 22:06 UTC

`c3dc25b626f883c9ee79e03d791957c3cf75626b` is published. Its clean-checkout
ZIP has 18 verified payload files, byte-identical to the accepted 18f3a18
package; only manifest revision/time change. ZIP SHA-256:
`8ab43af6b151534a0558960a4e5357ba13a715ed0a79f5b076e52d6fa55fe93c`.
All six actual native installer cases pass again under isolated profile
`dist/native alpha profile YSXynk/`; the owner installation stays on 18f3a18.

CI `35155654687` still passes 291/292. The new diagnostic identifies the
root-comparison gate (`not-the-checkout`) with empty Git porcelain; changing
to the regular JavaScript `realpathSync` did not resolve that mismatch.
The coordinator obtains the actual existing Windows short alias
`C:\PROGRA~1` using a read-only path query and compares it with
`C:\Program Files`: regular `realpathSync` returns unequal strings, while
`realpathSync.native` returns the same long path for both. No directories or
system settings were changed for this reproduction. The precise correction
was sent to SWE-2; the full log remains in ignored
`dist/attention-ci-failure-c3dc25b.log`. Deployment remains held for green CI.

### Hosted corrections accepted — 22:18 UTC

SWE-2 committed the native Windows path normalization and bounded alias
regression as `5a6648128afb2ab9da8438f83794c669d18a2253`. The coordinator
reviewed and published it. Windows CI `35156662151` passes **293/293 tests,
zero skips**, including the formerly failing clean-checkout case and the
actual 8.3-alias case; lint, typecheck, build and compatibility checks pass.
The strict source-identity check was retained.

The final prebuilt ZIP is
`dist/visual-team-alpha-0.1.0-5a6648128afb.zip`, SHA-256
`38564156c5b5f823fbb7e905a889a74efc6678cde27978d34d1350f91b0a9025`.
Its 18 payload files and full source revision verify after extraction to
`dist/guided alpha 5a66481/visual-team-alpha-0.1.0-5a6648128afb/`.
The actual-native installer probe passes all six cases against this final
archive (retained isolated profile `dist/native alpha profile UdtbNz/`).
Compared with the owner-installed 18f3a18 package, seven text files differ
only in CRLF/LF endings; the hook runner is byte-identical, and all payload
contents match after line-ending normalization. This is not described as
whole-package byte identity.

Render deploy `dep-dalhakjm8hqs739ja5mg` promoted exact commit `5a66481`
at 22:17:40 UTC. Automatic deployment remains off. The coordinator verifies
HTTP health 200, exactly six public tools, and exact equality of the hosted
widget resource with the reviewed local build. Resource SHA-256:
`4877a107193f4fe54c91a7c3f66713890643f31809a0a8177d6830d70b6fc986`.
Real-host acceptance follows; participant results remain pending.

### Mounted native permission — 22:27 UTC

The coordinator refreshed the existing Visual Team M0 registration and opened
a fresh ChatGPT conversation. Native explicit skill invocation created solo
task `vt_eb6b23dcaea8d30628cb9927`, reported testing, and performed one harmless
date-read action. The backend records genuine PreToolUse, PostToolUse and Stop
events without manual event injection. ChatGPT called `render_visual_task`
once and mounted the attention summary. Observed labels separate reported
testing, observed turn completion, and a later successful-refresh timestamp.
The no-pending-request label says "recorded", not that intervention is
impossible. The card uses legible dark colors and no default characters.

A second native turn requested one-action approval for another harmless
date read. The actual Codex prompt remains pending, with no persistent allow
rule selected. The same ChatGPT card updates to
"Alex needs approval — answer the Codex permission prompt" above status;
latest activity is observed at 17:26:25 local, independently of the advancing
refresh time. Public snapshot has `WAITING_FOR_USER`, observed provenance,
`pendingUserNeeds: {"worker:lead":"observed"}`, and nine accepted events.
No re-render was requested for this change.

Conversation: `https://chatgpt.com/c/6aab16a7-020c-83e9-a4fc-a60d54c2b804`.
The original in-app browser testing transport was unavailable, so this pass
uses the owner's authenticated Chrome session through visible UI controls.
Only public task metadata is retained in the ignored checkpoint JSON files;
capabilities remain in private MCP metadata and are not printed or saved.

### Same-widget recovery and completion — 22:32 UTC

Chrome DevTools' per-tab Offline emulation produced actual
`call_mcp` failures (`ERR_INTERNET_DISCONNECTED`), without changing system
network settings or the server. The mounted card displayed "Live updates
paused — showing the last confirmed state from 5:27:52 PM" and retained the
attributed approval, phase and activity. Mouse retry and keyboard retry both
left that timestamp unchanged while offline. Tab and Shift+Tab exposed clear
focus rings on the recovery actions; Enter activated retry. Restoring
"No throttling" recovered polling automatically in the same widget before
a manual successful retry could be issued. That distinction is retained:
successful manual retry is proven by the earlier local test, while this live
case proves automatic same-widget recovery. The approval remained visible
after recovery, with refresh advancing to 5:30:12 PM.

The coordinator selected native **Yes, proceed this time** only. The action
exited successfully; the board cleared the resolved need on new native
evidence. Codex then called the unchanged `finish_visual_task` with a bounded
reported summary, `verification: passed` scoped to its two read checks, and
the acceptance-record artifact reference. At 5:31:44 PM the existing ChatGPT
card showed completed/reported, "Reported result", **"Reported checks:
passed"**, the full summary, and the reference without opening the team.
The backend confirms 13 accepted events and identical structured receipt
on finish event and snapshot. No task re-render was needed, and terminal
polling stopped with that final confirmation timestamp.

### Accessibility, modes and technical closeout — 22:40 UTC

The real Chrome/ChatGPT dark render is legible with visible keyboard focus.
DevTools' temporary `prefers-reduced-motion: reduce` emulation removed the
motion control from the optional team view. Removing the override restored
"Turn motion on", confirming the preference remained off. The avatar stayed
inactive for this terminal worker. Source/fixture checks cover active/stale
suppression and task-switch reset; those are not recast as human observations.

The terminal card switches to its expanded summary and back after polling has
stopped, retaining the receipt and 5:31:44 PM confirmation. Pop out produces
ChatGPT's floating compact card. Its Results disclosure opens the summary,
reported-check label and artifact; Space closes it and Enter opens it, with
a visible focus outline. Back to chat returns the existing result to inline.
No task tool re-render was used during these mode checks. The browser was
left with normal networking, no reduced-motion override, diagnostics closed,
team hidden and the completed inline summary visible.

The bounded Render log window (22:20:50–22:34:30 UTC) was read through both
pages to `hasMore:false`: 185 platform/request records, no private capability
or payload markers found. Raw IP/request logs are not committed. This is
bounded evidence, not a blanket privacy guarantee. The retained public
snapshot and 13-event journal are in `docs/attention-alpha-host-evidence.json`;
the result matches between snapshot and finish event.

**Decision: briefs 011 and 012 technically accepted at `5a66481`.** SWE-2
received the hosted results directly in Devin and acknowledged the product
hold; the final closeout is delivered there as well. The coordination
heartbeat's saved status is PAUSED. The automation tool was unavailable at
closeout, so only its existing local status/timestamp were updated and read
back; its prompt, schedule and task binding were preserved.

No feature expansion is authorized by this closeout. Next is the prepared
five-person counterbalanced study and the voluntary 2–7-day follow-up, using
`docs/private-alpha-test-kit.md` and the still-blank results template. Missing
participant answers, timing, preference and repeat-use results are **pending**.
No market-demand or unassisted-install success claim follows from this
coordinator-assisted technical run.
