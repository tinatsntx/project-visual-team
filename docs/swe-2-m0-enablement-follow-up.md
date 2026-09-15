# SWE-2 M0 enablement — coordinator review follow-up

**Resolved and accepted 2026-09-15:** fix `3ab16d0`, published/deployed tip
`4fb3548`. Both unchanged probe cases pass (exit 0); 88/88 tests and exact-tip
CI pass. Installed native skill workflow, terminal web modes, and actual web
PiP also pass. See `docs/m0-enablement-acceptance.md`. The brief and failed
reproduction below are the original review record, not current failures.

Reviewed 2026-09-14 America/Chicago. Code `3ed245e`, records/config
`6cd5d87e4d89044458e100651a984008449bfa2b`. **Originally held before publication/deployment.**
GitHub/Render then remained on accepted `515727a`.

The coordinator reran typecheck, all 83 tests, native compatibility including
installed-root launch verification, and build: pass. Widget 160.1 KB, dev
host 463.1 KB; literal resource verification passes. Those checks miss the
two real-HTTP regressions below. Both are reproduced by:

```powershell
node --import tsx evals/m0-enablement-coordinator-probe.mts
```

The probe uses a separate loopback app instance and synthetic metadata.
Capabilities stay in private request metadata and are never printed. It
exited 1 on the original candidate. No hosted task or service configuration was changed.

## 1. Reject work reports after every terminal outcome

**P1.** Start a solo task, immediately call `finish_visual_task` with
`outcome: failed`, then call `report_workflow_step` with `phase: implementing`.
The finish is accepted. The later report is also accepted, increments the
event count, and changes the worker from ASSIGNED to WORKING while the task
remains FAILED. The widget stops polling terminal tasks, so this can produce
a final failed board that describes active work.

`report_workflow_step` applies its mapped worker transition without checking
terminal task state. The reducer rejects transitions based on worker state,
but early task failure leaves the ASSIGNED worker unchanged because the
task-finish loop ignores the worker transition error. The current late-report
test covers completion after work, where the worker is already COMPLETED;
it misses the early failure path explicitly introduced by this change.

Required behavior:

- A later phase report cannot resume or alter work on a terminal task.
- Rejected reports leave snapshot, event count, and event log unchanged.
- Keep duplicate event IDs idempotent, and preserve truthful reported provenance.
- Preserve the append-only, non-controlling native hook boundary. Fixing this
  must not approve, deny, rewrite, or block a native Codex action.
- Add regression coverage for failure directly from PLANNING, failure after
  work, and completion after work. Verify rejected reports over HTTP as well
  as the reducer behavior chosen for this fix.

Observed output:

```json
{"before":{"task":"FAILED","worker":"ASSIGNED"},"lateReportApplied":true,"after":{"task":"FAILED","worker":"WORKING"},"eventCountDelta":1}
```

## 2. Do not silently discard accepted finish metadata

**P2.** The input schema accepts a 500-character result summary plus
verification and artifact references. `mapTaskFinish` concatenates these
fields and then slices the entire detail to 500 characters. A valid summary
at that limit consumes the whole budget, losing verification and every
artifact even though the tool returns `applied: true`.

The probe supplies `verification: failed` with one synthetic artifact URL;
the resulting completed event retains neither. Shorter summaries with
multiple allowed references can also exceed the combined budget. The plan
requires recording the final verification status and artifact references,
not silently acknowledging fields that are discarded.

Preserve accepted fields within explicit metadata bounds, or reject an
oversized combined result before changing task state. Do not silently
truncate verification, split a reference, or introduce artifact contents.
Structured bounded metadata is also acceptable if justified; keep the change
focused and preserve the private-capability contract.

Add tests for maximum-length summary plus verification/reference and for
combined reference overflow. Assert either complete retention or a clear
rejection with unchanged state. Update the coordinator probe only if the
chosen valid behavior rejects the oversized input rather than retaining it.

Observed output:

```json
{"finishApplied":true,"detailLength":500,"verificationRetained":false,"artifactRetained":false}
```

## Return and acceptance

Keep this to the two reproduced regressions and their tests. Preserve the
coordinator's evidence and configuration. Do not add later-milestone work.
Return the commit, changed files, and typecheck/test/build/compatibility and
probe results. Check the committed diff for whitespace too; `6cd5d87` had one
extra EOF blank line in `docs/sites-acceptance.md`, removed locally by the
coordinator during this review.

After review passes, the coordinator will publish the accepted code/config
tip, verify CI and the exact deployed SHA, refresh the installed skill through
the supported plugin flow, and test real ChatGPT PiP, terminal display-mode
switching, and the native skill workflow. Expiry uses a separate local test
instance first; hosted default retention remains two hours. No new real-host
acceptance is claimed for this held build.
