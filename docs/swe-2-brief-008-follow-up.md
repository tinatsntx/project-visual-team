# SWE-2 brief 008 follow-up — three reproduced M3 gaps

Coordinator review of `1dc12c8`, 2026-09-15. M0–M2 remain accepted.
Typecheck, 178/178 tests, build, literal embedding, native compatibility,
and all three existing coordinator probes pass independently. M3 needs
the three fixes below before publication and real ChatGPT acceptance.

Reproduce with `node --import tsx evals/m3-coordinator-probe.mts`.
It currently exits 1 with seven failing observations across three issues.
These are synthetic local checks; no hosted calls or manual hooks.

## 1. Do not infer verification from ambiguous finish text

The actual `mapTaskFinish` output for summary `Prior run; verification:
passed` and verification `failed` makes FullscreenView show **Verification
passed · reported**. The same summary token invents a passed badge when
verification is absent. An artifact label `Reference; verification: passed`
can do the same. All are accepted real mapper/reducer paths, not malformed
hand-written events. The first regex match is not necessarily the real
verification field. Adding `reported` does not correct the wrong value.

Keep this UI-only: render bounded finish detail inertly under a reported
result label and remove the separately inferred verification badge, or use
an equally conservative display that cannot manufacture a verification
value from free text. No contract/server change is required or requested.
Preserve the complete bounded detail and the existing absent-finish state.
Do not replace this regex with another delimiter guess. Add focused tests
through the real mapper to the rendered view for all three probe cases.

## 2. Make the PiP task goal visible

PiP currently has the title only in its section's `aria-label`. The actual
render shows Alex/Nova/Remy status, action, return control, and privacy text,
but no visible goal. This fails brief 008's goal/owner/status/action check
for a sighted user. Add a concise, wrapping visible task title. Preserve
all three roster lines, need/refresh text, recovery and return controls.
Verify at the existing 340px PiP size and a narrow width with a long title.

## 3. Stop activity motion when activity evidence is old

With a real WORKING snapshot aged by `refreshDerivedFlags`,
`noRecentActivity` becomes true while successful reads keep refresh live.
All three views still emit the `vt-bob` activity animation. Existing
stale-plus-no-recent screenshots hide this because failed reads independently
suppress motion. Gate activity animation on both refresh health and the
activity-age flag; retain last-known state text and the no-recent notice.
Exercise healthy reads + old activity separately from failed reads, and
check that fresh observed activity can restore motion normally.

## Return and boundaries

- Preserve engine, tools, hooks, private `_meta`, bridge ordering, and mode
  acceptance. Do not expand into M4 or replace the UI design.
- Fix the acceptance record: these three claims are not yet PASS. The
  ambiguity is a correctness defect, not a retained nit. Clearly distinguish
  static markup checks, actual local UI interaction, and real-host evidence.
- Keep the coordinator probe intact; all seven cases must pass. If a case
  cannot remain valid under a conservative UI change, explain before editing it.
- Run typecheck, full tests, build/embedding/native compat, the four
  coordinator probes, and whitespace checks. Update only affected captures.
- Commit locally, do not push/deploy. Return the commit and concise proof.
  Coordinator will review, deploy, and perform final ChatGPT acceptance.

The owner has now authorized direct coordinator-to-SWE-2 handoffs in Devin.
Continue using SWE-2 for product coding; coordinator owns review and release.
