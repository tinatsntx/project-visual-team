# M2-POS-02 — Independent research team (plan §15 positive 2)

**Host execution:** coordinator-run. Partially proven locally by
`team-roster-one-writer` in `evals/m2-consumer-workflow-probe.mts`.

## Setup

A disposable scratch repo containing a small README with three listed
options (e.g. three fictional onboarding approaches) — read-only research
material, no writes needed.

## User request

> "Use Visual Team to compare the three onboarding approaches in the README
> and recommend one."

## Expected mode/work sequence

1. `start_visual_task` with `mode: "team"` (independent read-heavy
   workstreams) and a roster like lead + explorer — never more than three.
2. Real parallel or sequential reading/comparison via native capabilities.
   If the host cannot delegate at all, `solo` plus a plain explanation is a
   correct outcome — a requested team is not a delegation capability.
3. `report_workflow_step` `researching` while actually comparing.
4. `finish_visual_task` with a truthful recommendation summary.

## User-visible outcome

A bounded team appears for genuinely independent workstreams, or the user
hears an honest "delegation isn't available here — doing it solo" and still
gets the comparison.

## Pass criterion

Either (a) team mode with real delegated work and no claimed specialist
output that did not run, or (b) solo with a plain explanation. FAIL if the
board shows specialists whose work never executed.
