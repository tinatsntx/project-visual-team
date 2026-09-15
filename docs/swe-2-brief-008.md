# SWE-2 brief 008 — Milestone 3 visual experience

Read `HANDOFF.md`, `PROJECT_PLAN.md` §3, §6, §12, §13.6 and the M2 acceptance
record. Start from the coordinator's accepted M2 closeout on main. M0 and M1
remain closed. This is the next product phase; do not repeat their matrices.

## Outcome

A person should understand the goal, owner, current status, and whether they
need to act within ten seconds. Make the existing inline, fullscreen, and PiP
views useful, readable, and truthful. The complete work product stays in chat.

## Bounded implementation

1. **Clear status and next action.** Use the existing task/worker snapshots
   and attributed pending needs. Inline must show the goal/title, owner,
   plain-language status, and an actionable need when present. Direct native
   permissions back to Codex's permission prompt; a general reported question
   goes back to chat. Do not invent a question, approval, or completion from
   a roster assignment or lack of recent activity. Keep provenance available
   without presenting event types and implementation details as the main UI.
   In the M2 run, a real read-only review completed but the hookless roster
   row became canceled at task finalization. Ending board tracking must not
   read as verified cancellation of the person's actual review. Distinguish
   recorded status and missing specialist evidence without inventing a
   successful specialist transition; M4 owns the underlying correlation.
2. **Truthful limited visibility.** Expose `noRecentActivity` and stale or
   unavailable refresh visibly in every applicable mode. PiP currently loses
   the refresh notice and uses a dot as its only visible need indicator;
   give both a compact text equivalent. Preserve last-known data and the
   existing recovery actions, private capability handling, initialization,
   single-flight reads, and non-optimistic host mode changes. Motion must
   not imply current work when evidence is stale.
3. **Useful fullscreen results.** Preserve Goal, Team, Workstreams, Needs
   you, Results, and Evidence. Surface the available bounded result and
   verification labels from an actual finish event instead of only saying
   to check chat. Render artifact references safely; absence of a finish or
   verification is not success. Do not parse or invent source-code contents.
   If existing contracts cannot support this honestly, reproduce the smallest
   missing behavior and report it before expanding engine/server scope.
4. **Accessible responsive views.** Keep the original lead/explorer/builder/
   reviewer robot identities; improve their legibility if needed without an
   office simulation or copied assets. Support keyboard focus, meaningful
   control names, screen-reader status, reduced motion, text enlargement,
   light/dark contrast, and a narrow layout. Long titles, bounded finish
   metadata, and three workers must wrap without losing controls. Inline has
   one primary action, optional compact secondary actions, no tabs, deep
   navigation, or duplicate composer.
5. **A concise privacy notice.** Add the §13.6 interface notice against
   sensitive task titles. State only the implemented ephemeral metadata
   behavior; `privacyMode: private` does not add isolation or retention
   protection. No new consent gate, settings surface, or onboarding flow.

## Four exit criteria and concrete evidence

- Goal, owner, status, and needed action are identifiable within ten seconds.
  Supply representative inline/fullscreen/PiP examples with the expected
  four answers. Coordinator runs the brief timed comprehension check; do
  not substitute a text-search assertion for a human-facing check.
- Meaning remains complete with all animation disabled. Exercise reduced
  motion and keyboard navigation, including the evidence and recovery controls.
- UI claims only supported activity. Exercise planning, work, pending task
  and worker needs, reported completion/failure, no-recent-activity, stale,
  unavailable, and a hookless specialist. Show missing signals honestly.
- Inline has no deep navigation or duplicate composer. Confirm keyboard
  order and layout at a narrow width as well as desktop.

Use deterministic local harness fixtures with explicit synthetic labels.
Cover 320 px width and enlarged text, both themes, reduced motion, three
workers, and long labels. Add focused behavior tests where they protect
truthfulness, accessible operation, and existing bridge behavior. Avoid
snapshot suites that only mirror markup. Record screenshots and results in
`docs/m3-visual-experience-acceptance.md`; distinguish local emulation from
real ChatGPT/mobile testing. Coordinator owns the final ChatGPT acceptance.

## Scope boundaries

- Main scope: `apps/plugin-ui/`, relevant UI tests/harness fixtures, and
  evidence docs. Preserve the six tools, reducer, repository, hook payloads,
  endpoint/app mapping, and private `_meta` transport.
- Do not add hooks, session binding, persistence, an App Server client, or
  another hosting platform. M4 owns the demonstrated most-recent-task hook
  routing problem, PermissionRequest/Interrupt/SubagentStart/SubagentStop
  coverage, and accurate specialist completion correlation. Do not mask
  these gaps with invented UI states. Run hosted acceptance serially until
  task/session correlation is fixed.
- Keep host display-mode acceptance authoritative. Retain the tested PiP
  path; do not claim an unobserved host session-end signal or implement a
  guessed close event. Document an absent host signal as a compatibility limit.
- No redesign of the consumer workflow, generic refactor, or automatic
  expansion into M4. Surface a concrete blocker with a minimal reproduction.

## Verification and return

Run typecheck, the full tests, build with literal-embed/native-package
verification, all three unchanged coordinator probes, and diff checks.
Return the local commit, four-criterion evidence map, visual artifacts,
bundle-size delta, and remaining real-host checks. Commit locally; do not
push or deploy. Stop when the bounded implementation and evidence are ready
for coordinator acceptance.
