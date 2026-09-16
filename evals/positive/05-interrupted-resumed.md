# M2-POS-05 — Interrupted and resumed (plan §15 positive 5)

**Host execution:** coordinator-run. Server-side proven locally by
`interrupted-then-resumed-same-task` in
`evals/m2-consumer-workflow-probe.mts`.

## Setup

A disposable task long enough to interrupt mid-run (e.g. multi-file read
plus edit in a scratch directory).

The bundled `hooks.json` now wires `Interrupt` and `Stop` (with the other
lifecycle events) — after the changed bundle is installed and the hooks are
accepted through the normal Codex **trust review**, the interruption reaches
the board automatically. Without trusted hooks the interrupt is simply
unobserved — the board keeps the last reported state and later derives
"No recent activity", which is honest.

## User request

> "Use Visual Team to <small multi-step change>" — then the user interrupts
> mid-work and later asks to resume.

## Expected mode/work sequence

1. Solo task; work visibly in progress.
2. Interrupt → *hooked:* workers idle, pending asks dismissed, task stays
   resumable (`ACTIVE`). *Unhooked:* last truthful state stands, then
   "No recent activity" — never "failed", never "complete".
3. On "resume", work continues on the **same** task id — never a fresh task
   to hide the interruption.
4. Real resumed work reports genuine phases; finish truthfully when done.

## User-visible outcome

The board honestly shows the interruption (idle/resumable when hooked,
stale-flagged when not) and continues the same task on resume.

## Pass criterion

Same task id before and after; the interruption is never erased or dressed
as completion; resumed work is real; `finish_visual_task` reports the true
final outcome. FAIL on a fabricated idle/interrupt event or a replacement
task.
