# Private-alpha test kit — prepared, not executed

This kit implements the M5 evaluation plan and the usefulness study for the
actionable-summary experience. No participant results have been collected and
no M5 acceptance claim is made. Run after the revised widget and guided-alpha
package pass their technical acceptance. The coordinator can run software
checks; real people must supply comprehension, preference, repeat-use, setup,
and accessibility feedback.

## Participants and privacy

Recruit a small group with nontechnical ChatGPT users, a lightly technical
builder, an experienced Codex user, and an accessibility-focused tester.
Five participants is a convenient minimum for an 80% threshold (4 of 5),
not a substitute for representing those groups. Use anonymous identifiers
T01, T02, and so on. Do not collect names, credentials, personal chat text,
work files, or recordings without separate consent. Use disposable fixtures
and generic task titles/summaries; they are stored as ephemeral metadata.

Record the exact code revision, native version, browser/device, declared
support limitations, and whether the test uses real hooks or reported-only
fallback. Keep synthetic demonstrations distinct from real execution.

## Study design

Run a five-person, within-participant comparison of the native host alone and
the host with Visual Team's actionable summary. Each participant completes two
comparable multi-step fixture tasks: one with the board and one without it.
Counterbalance the order: T01, T03, and T05 use the board first; T02 and T04
use the native host first. Do not coach an answer during timed observations.

Use the same task goal, required action, and available evidence in both arms.
Native Codex or ChatGPT remains authoritative for work, approval, and review;
the board is evaluated only as a status and evidence summary. A board arm can
use a real native hook only when the matching native control arm can use the
same underlying task behavior. Record any deviation or missing comparison.

Measure setup separately from task comprehension. Guided setup is permitted
for this alpha, but it must never be counted as unassisted installation
success.

## Session protocol

1. Record the participant identifier, assigned order, fixture pair, code SHA,
   host/native version, browser/device, and whether the run has real hooks or
   reported-only fallback. Time prerequisite checks separately from package
   installation/configuration. Record prerequisite failures, coordinator
   assistance, and completion or abandonment for each step.
2. Explain the task and controls without explaining the expected board state.
   Let the participant start the workflow using the documented explicit skill
   invocation or the ChatGPT app.
3. At a predetermined live point, display the assigned arm for at most ten
   seconds. Ask: "What is the goal? Who owns it? What is happening? Do you need
   to do anything, and where?" Start timing when the view becomes visible and
   record their uncoached answer and time-to-answer. Record goal, owner,
   status, and required action/location separately. A response after ten
   seconds is recorded as not-within-ten-seconds even if correct.
4. Repeat the timed question for an actual pending native permission (native
   prompt remains authoritative), a reported question, a reported finish, and
   a stale or unavailable view. Use a local controlled failure for the latter;
   never change production retention or manufacture observed native events.
5. Ask whether the visual summary alone proves successful work. The correct
   answer is no: inspect the stated reported/observed evidence and the actual
   work or verification. Record any incorrect inference, even if corrected
   later.
6. After both multi-step arms, ask which they would choose alongside normal
   chat work next time: visual summary, native host alone, or neither. Collect
   one reason without prompting for a preferred answer.
7. For accessibility, complete evidence expansion, mode changes, and retry
   with keyboard only; test reduced motion, enlarged text, and the tester's
   screen reader. Record the actual device/software and any blocked control.
8. Contact the participant once 2–7 days later. Offer a comparable multi-step
   task without presenting the board as the expected choice. Record whether
   they voluntarily choose Visual Team before coaching. No response, a missed
   follow-up window, or an unavailable service is a missing repeat-use trial,
   not a positive result.

### Setup measurement

For each participant, record:

- prerequisite status: Node, supported Codex runtime, endpoint reachability,
  and ChatGPT registration status;
- elapsed prerequisite-check time and elapsed installation/configuration time
  separately, excluding breaks but including recovery attempts;
- assistance level: none, written instruction only, coordinator verbal
  guidance, coordinator operating controls, or abandoned;
- the exact obstacle and recovery outcome, using non-sensitive notes only.

Do not aggregate guided or coordinator-operated setups as unassisted success.
Report both the number who reached a usable task and the number who did so
without human assistance.

## Required tasks

| Case | Disposable task | Observe |
|---|---|---|
| Simple edit | Fix one typo in supplied sample text/file and verify it | Solo routing, actual result in chat |
| Research | Compare two options in a supplied non-sensitive reference | Honest research provenance, no invented native search |
| Multi-part build | Modify a tiny fixture, run its check, request a real independent review when available | One writer, correctly correlated specialists; paired board/native comparison |
| Permission | A harmless fixture action that actually requires native permission under a test profile | Needs-you points to native flow, no auto-approval |
| Reported question | A fixture with a genuine `report_workflow_step` waiting-for-user boundary | A reported question identifies its source and response location without claiming observed approval |
| Interrupt/resume | Interrupt a fixture operation, resume the same work | No invented completion, same-task continuity |
| Failure | A fixture with an intentionally failing check | Failure shown honestly, no inferred successful verification |
| Finish evidence | A fixture with a reported outcome, reported verification field, and artifact reference | Result, verification label, and references appear without inventing missing evidence |
| Unnecessary team | One trivial label/format correction | Solo rather than decorative delegation |

Run at least ten small-task routing cases separately so 90% means at least
nine correct solo choices. State the denominator; repeated observations from
one person do not count as additional independent participants.

## Results and missing trials

Use [the blank results template](private-alpha-results-template.md). Keep one
row for every attempted timed observation and one row for each participant's
setup and repeat-use outcome. Use `yes`, `no`, `not-tested`, or `missing`;
never silently drop a wrong answer, timeout, unavailable host, abandoned
setup, missed follow-up, or invalid comparison.

For every paired comprehension prompt, record the expected goal, owner,
status, required action/location, source of truth, elapsed milliseconds, and
whether each field was correct. Core comprehension means status and required
action/location; goal and owner are reported separately and do not make the
M5 status/action threshold stricter. A correct answer after ten seconds is an
accuracy success but a timing failure. A missing, invalid, or unmatched pair
is excluded from the median-time comparison and reported separately with its
reason; it is never counted as an improvement.

Do not include names, credentials, personal chat text, work files, or
recordings without separate consent. Notes contain only non-sensitive findings.

## M5 acceptance calculation

- Timed comprehension: a participant passes only when they correctly identify
  the status and required action/location within ten seconds for every required
  board observation: pending permission, reported question, reported finish,
  and stale or unavailable state. At least 4 of 5 participants must pass.
  Report goal and owner accuracy separately for every observation, plus the
  numerator, denominator, errors, timeouts, and missing trials for the core
  status/action calculation.
- Preference: at least 4 of 5 participants choose the visual summary for a
  future multi-step task after experiencing both arms. Missing follow-ups or
  comparisons do not become preferences.
- Time: across valid paired trials where both arms correctly identify core
  status/action, the board arm's median correct-answer time is at least 20%
  lower than the native arm's median: `(native median - board median) / native
  median >= 0.20`. Every participant must contribute at least one valid matched
  comparison before the overall time target can pass. Report valid-pair
  coverage per participant, raw times, excluded pairs, and errors. A native
  median at or below zero, or any participant lacking a valid pair, makes the
  result invalid and prevents a pass.
- Repeat use: at least 3 of 5 participants voluntarily choose the board at a
  2–7-day follow-up before coaching. Report follow-up attempts, misses, and
  service failures; they are not voluntary choices.
- Routing: at least 90% of the declared small-task cases choose solo.
- Truthfulness: zero participants may mistake animation, an active character,
  or a reported finish for independent proof of success. Any such inference is
  a failure even if the participant later changes their answer.
- Coordinator log audit finds no sensitive sentinel payload in server logs;
  audit the actual deployed revision and observation window. Passing an
  allowlist unit test alone is not a production-log audit.

The thresholds are directional private-alpha signals, not proof of market
demand. If a threshold fails, record the concrete finding and send a bounded
fix back to SWE-2, then rerun affected participant cases. Do not replace human
responses with agent opinions or call an unexecuted case a pass.
