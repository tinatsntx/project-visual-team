# Private-alpha test kit — prepared, not executed

This kit implements the M5 evaluation plan. No participant results have
been collected and no M5 acceptance claim is made. Run after M4's native
integration acceptance. The coordinator can run software checks; real
people must supply comprehension, preference, and accessibility feedback.

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

## Session protocol

1. Explain the task and controls without explaining the expected board
   state. Let the participant start the workflow using the documented
   explicit skill invocation or the ChatGPT app.
2. At a predetermined live point, show the board for ten seconds. Ask:
   "What is the goal? Who owns it? What is happening? Do you need to do
   anything, and where?" Record their answer before coaching.
3. Repeat with an actual pending native permission (native prompt remains
   authoritative), a reported question, a reported finish, and a stale or
   unavailable view. Use a local controlled failure for the latter; never
   change production retention or manufacture observed native events.
4. Ask whether the board alone proves successful work. Correct answer: no;
   inspect reported/observed evidence and the actual work/verification.
5. For multi-step work, ask whether they prefer the visual summary alongside
   the full chat answer, chat alone, or neither; collect one reason.
6. For accessibility: complete evidence expansion, mode changes, and retry
   with keyboard only; test reduced motion, enlarged text, and the tester's
   screen reader. Record the actual device/software and any blocked control.

## Required tasks

| Case | Disposable task | Observe |
|---|---|---|
| Simple edit | Fix one typo in supplied sample text/file and verify it | Solo routing, actual result in chat |
| Research | Compare two options in a supplied non-sensitive reference | Honest research provenance, no invented native search |
| Multi-part build | Modify a tiny fixture, run its check, request a real independent review when available | One writer, correctly correlated specialists |
| Permission | A harmless fixture action that actually requires native permission under a test profile | Needs-you points to native flow, no auto-approval |
| Interrupt/resume | Interrupt a fixture operation, resume the same work | No invented completion, same-task continuity |
| Failure | A fixture with an intentionally failing check | Failure shown honestly, no inferred successful verification |
| Unnecessary team | One trivial label/format correction | Solo rather than decorative delegation |

Run at least ten small-task routing cases separately so 90% means at least
nine correct solo choices. State the denominator; repeated observations
from one person do not count as additional independent participants.

## Results sheet

Create an anonymous table with these columns:

`tester_id, tester_category, case_id, code_sha, surface, real_or_synthetic,
goal_correct, owner_correct, status_correct, action_correct,
within_10_seconds, prefers_visual_for_multistep, animation_mistaken_for_proof,
keyboard_result, reduced_motion_result, screen_reader_result, notes`

Use yes/no/not-tested values. Notes must contain only non-sensitive findings.
For reproducibility, retain expected state/action and source of truth for
each case separately. Do not silently exclude failures or missing responses.

## M5 acceptance calculation

- Comprehension: at least 80% of participants identify what is happening
  and what requires them. Report the four-answer/timing detail as well.
- Preference: at least 80% prefer the visual summary for multi-step work.
- Routing: at least 90% of the declared small-task cases choose solo.
- Zero participants mistake animation for proof of success.
- Coordinator log audit finds no sensitive sentinel payload in server logs;
  audit the actual deployed revision and observation window. Passing an
  allowlist unit test alone is not a production-log audit.

If a threshold fails, record the concrete finding and send a bounded fix
back to SWE-2, then rerun affected participant cases. Do not replace human
responses with agent opinions or call an unexecuted case a pass.
