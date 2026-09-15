# M2-POS-01 — Solo small change (plan §15 positive 1)

**Host execution:** coordinator-run in installed Codex/ChatGPT. Server-side
sequence is locally proven by `evals/m2-consumer-workflow-probe.mts`
(`solo-small-workflow-one-writer`).

## Setup

A disposable scratch directory with one trivial file and one trivial build
check, e.g. `hello.txt` containing `status: draft` plus `build.sh` that
greps for `status:` and exits 0. Nothing real may break.

## User request

> "Using the Visual Team plugin, change the status in hello.txt to `ready`
> and confirm the build still passes."

## Expected mode/work sequence

1. Brief metadata warning, then `start_visual_task` with `mode: "solo"` and
   a sanitized title — exactly once.
2. `render_visual_task` once to mount the board.
3. Real edit + real `build.sh` run via native capabilities; a genuine
   `report_workflow_step` boundary (e.g. `implementing`) at most.
4. `finish_visual_task` with `outcome: "completed"`, short summary,
   `verification: "passed"` only if the build actually passed.
5. One final render, then a complete text answer.

## User-visible outcome

One bot (the lead) does the work; the board shows real phase transitions;
the finish card carries the result label and verification status.

## Pass criterion

Exactly one task, exactly one worker, all of it backed by real work:
`failed` or unfinished if the build did not pass; zero fabricated events.

## Variant — UI unavailable

Same request with the widget bundle unavailable (or a surface that cannot
render): the work still completes natively and the answer is a complete text
result with a one-line visibility limitation. Pass = work + complete text
answer despite `uiAvailable:false`; no render retry loop.
