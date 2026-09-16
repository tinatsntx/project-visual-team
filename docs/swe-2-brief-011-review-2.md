# Brief 011 — phase follow-up acceptance

2026-09-16 20:17 UTC. The new phase implementation passes independent HTTP
retention, full-snapshot replay, and retained-log trimming. The six existing
receipt checks remain green. Only one new engine case fails (four related
inputs), plus one stale-copy regression is visible in the diff. Fix these
within 011 before the final handoff; no new feature or public tool signature.
Keep this file and the coordinator probe unstaged.

## Phase admission must match its workflow event

Current reducer validation only checks provenance. A reported `activity` with
`phase: completed` is accepted while the task remains ACTIVE. Likewise it accepts
WORKING + completed, task_finished COMPLETED + failed, and an arbitrary unknown
phase string. These create contradictory or unbounded new phase claims through
the direct engine boundary. This is not a public MCP injection claim.

`evals/brief-011-coordinator-probe.mts` now reproduces these cases and exits 1:
eight cases pass; `phase-declarations-require-valid-correlated-workflow-events`
fails. Validate the phase enum, permitted workflow-event kind, and matching
target before mutation. Align it with the existing mapper (planning -> worker
PLANNING; researching/implementing/testing -> worker WORKING; reviewing -> worker
REVIEWING; waiting_for_user -> task WAITING_FOR_USER; completed/failed -> matching
task_finished). Accept phase-bearing finish_visual_task events under that same
rule. Keep legacy events without phase valid; keep dedup and terminal freeze.
The reported phase snapshot schema should require reported provenance.

One newly added product test currently uses reviewing + WORKING for its trimming
setup. Make that a legal reviewing + REVIEWING event when adding admission rules;
do not weaken the trimming assertion or new coordinator checks.

## Preserve the explicit last-known notice in PiP

The PiP change adds the required separate successful-refresh line, but replaces
`Updates paused — last confirmed state ...` with only `Updates paused.`. Retain
explicit last-known/last-confirmed wording whenever the visible data is stale
or unavailable, alongside the separate refresh time. No live-state inference.

Task keys, controlled-motion removal, question location wording, and the
nonterminal result copy are now corrected in source. Browser acceptance waits
for the completed build; no real-host claims were made for this review.
