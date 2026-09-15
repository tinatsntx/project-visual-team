# M2-POS-03 — Build plus separate review (plan §15 positive 3)

**Host execution:** coordinator-run. Partially proven locally by
`team-roster-one-writer` in `evals/m2-consumer-workflow-probe.mts`.

## Setup

A disposable scratch project: one source file with an obvious small
improvement and one trivial test/build check. Nothing real may break.

## User request

> "Use Visual Team to improve this file, test it, and have a separate
> reviewer check the change."

## Expected mode/work sequence

1. `start_visual_task` `team` with a writer plus a read-only reviewer
   (e.g. `workerRoles: ["lead", "builder", "reviewer"]`).
2. Exactly one writer edits; the reviewer is read-only.
3. Real test run; `report_workflow_step` `testing` then `reviewing` at the
   genuine boundaries.
4. If the host cannot run a separate reviewer, do the work solo and say so —
   never claim a review that did not happen.
5. `finish_visual_task` with truthful verification status.

## User-visible outcome

Builder and reviewer appear with distinct roles; review is visibly
read-only; the result carries the real verification status.

## Pass criterion

At most one writer; reviewer never writes; no fabricated review finding.
Solo fallback with a plain explanation also passes. FAIL on a claimed
separate review that produced no real review work.
