# Milestone 1 core state engine — acceptance evidence

**M1 COMPLETE / GO to Milestone 2 — coordinator accepted 2026-09-15.**
Accepted product code: `2eda8b3f42dac033e473345b579c76911ed73917`.
Coordinator independently reviewed the namespace resolution, attributed
pending-need lifecycle, immutable record handling, and regressions. Typecheck,
145/145 tests, native compatibility, build/literal embedding, and both
unchanged coordinator probes pass. The probe files were not modified by the
fix. Full committed-delta whitespace check passes. Widget 160.1 KB; dev host
465.9 KB. All four exit criteria below are accepted; no new blocker found.
Proceed with `docs/swe-2-brief-007.md`. M0 stays closed.

## Published release verification

- Published and verified GitHub main at accepted product SHA `2eda8b3`.
  [CI run 35011395446](https://github.com/tinatsntx/project-visual-team/actions/runs/35011395446)
  completed successfully for that exact code.
- Render deploy `dep-dakpdt15efls73d5b7r0` went live at
  `2026-09-15T19:06:05.073713Z` with exact SHA
  `2eda8b3f42dac033e473345b579c76911ed73917`. Auto-deploy remains off;
  hosted TTL, package configuration, and permissions were not changed.
- Hosted health and six-tool discovery pass. Synthetic HTTP task
  `vt_59b5fbfa9e1d6c24d543f60c`, created `19:07:13.411Z`, correctly reported
  work -> waiting for user (needsUser true, reported provenance) -> resumed
  work (needs cleared) -> completed at `19:07:14.297Z`. Five events; final
  verification retained. A later work report rejects without snapshot change.
- Hosted render returns the completed snapshot; JS/CSS are embedded verbatim.
  Widget SHA-256 remains
  `609f38674d9bf60443c7a583574aa874334308278ee18a63de6ffd400835601e`.
- Error-level app-log query for `19:06:05Z` through `19:07:24.590990647Z`
  returned no entries and no remaining pages. This is a bounded smoke window.
- These were synthetic hosted HTTP checks, not another native hook or browser
  acceptance run. No new real-host observation is claimed. Existing M0 proof
  remains valid; bridge, UI source, and plugin files were unchanged by M1.

Closeout documentation commits may follow the deployed product SHA without
another deployment. All four M1 criteria are accepted; start consumer workflow.

**Follow-up history:** the three held cases are fixed.
Review of `a4ffe13` reproduced three targeting/wait defects via the fixed
probe `evals/m1-coordinator-probe.mts` (docs/swe-2-brief-006-follow-up.md).
This follow-up diff resolves all three; the probe now exits 0 with every
case `pass:true` — hook-ID collision routes to the specialist, a reported
wait exposes `needsUser`/`reported` provenance, and unrelated lead activity
cannot resolve another worker's pending ask. The earlier publication hold
is lifted by the acceptance above. Consumer workflow brief 007 is next.

Brief: `docs/swe-2-brief-006.md`. Scope: finish the existing engine — property
coverage, provenance verification on every mutation path, invalid-target
safety, replay fixtures — with no new storage or workflow features.

Verification on this diff: `npm run typecheck` clean; `npm test` 145/145;
`npm run build` produces widget + dev-host bundles and the verbatim-embed
check passes; `node --import tsx evals/m0-enablement-coordinator-probe.mts`
and `node --import tsx evals/m1-coordinator-probe.mts` both exit 0;
`git diff --check` clean. A follow-up adversarial review then found and this
diff also fixes: `specialist_finished` now reconciles the wait state after
resolving a need (no resting `WAITING_FOR_USER` with an empty need map), and
need resolution requires real evidence — an `IDLE`/`BLOCKED` no-op on a
derived-idled worker cannot dismiss its ask; the property oracle asserts
`WAITING_FOR_USER ⟹ needsUser` over the whole corpus.

## Four exit criteria → evidence

| Exit criterion (plan §14) | Concrete tests | Result |
|---|---|---|
| Replaying the same event log always produces the same snapshot | `packages/state-machine/tests/replay.test.ts` replays five ordered sequence fixtures into fresh records and deep-compares complete snapshots, accepted logs, counters, provenance, and dedup sets; `property.test.ts` replays 12 seeded streams into twin records with the same comparison; `reducer.test.ts` keeps the snapshot-replay seed test. Determinism is by construction: the reducer is pure over (record, event); fixtures inject monotonic `at` values. | Pass |
| Unsupported transitions fail safely | `reducer.test.ts` covers illegal transitions, explicit-unknown worker ids, missing/wrong-kind `to`, a non-terminal finish target, and cross-task rejection — each asserts the complete record is untouched (snapshot deep-equal, log length, dedup set). `property.test.ts` asserts the same intactness invariant after every rejected or duplicate event across 64 seeded streams. `tools.test.ts` proves the guarantee survives the repository boundary (cross-task apply; batch stops at first rejection). Terminal freeze is covered by `seq-early-failure`/`seq-duplicates` fixtures, `reported-steps.test.ts`, and the coordinator probe. | Pass |
| No derived event can mark work complete or approved | `provenancePermitsTransition` now gates every kind that can claim completion/approval/review/cancellation or fabricate roster membership: `task_finished`, `task_transition` (incl. CANCELED), `worker_transition`, `specialist_finished`, `permission_request`, `specialist_joined`. `reducer.test.ts` exercises each indirect path; `property.test.ts` asserts post-hoc that no stamped `derived` provenance ever accompanies a forbidden state on any accepted event in the corpus. Native `Stop` still maps to `turn_finished` (turn ending, non-terminal). | Pass |
| Duplicate hook events do not alter the result | Dedup by event id precedes the terminal guard and never trims with the bounded log. `seq-duplicates` delivers every event twice (interleaved, adjacent, post-terminal); `replay.test.ts` applies an id past the 200-event retained-log window and asserts it still dedupes; the property generator resends ~15% of events and asserts no state change on duplicates. Rejected ids are intentionally not remembered, so a redelivered rejected event re-rejects rather than pretending dedup. | Pass |

## Engine corrections this diff makes (material behavior changes)

1. **Explicit worker targeting.** `worker_transition`, `permission_request`,
   and `specialist_finished` now reject an explicit `workerId` that resolves
   to no roster worker instead of silently mutating the default worker. The
   writer fallback is preserved only when `workerId` is genuinely absent
   (main-agent events carry no `agent_id`). `activity` and `worker_assigned`
   still journal unattributed when the id does not resolve — they claim no
   state, so there is nothing to misattribute.
2. **Cross-task guard.** `applyEvent` rejects an event whose `taskId` differs
   from the record's, before dedup, leaving log and dedup state untouched.
3. **Provenance gates on indirect kinds.** `derived` `specialist_finished`,
   `permission_request`, and `specialist_joined` are rejected; `CANCELED`
   joined the forbidden derived targets on both task and worker — inferred
   evidence can no longer complete a worker, claim a pending approval,
   fabricate a roster member, or permanently freeze a task or worker.
4. **`task_finished` validation.** `to` must be absent (defaults to
   COMPLETED), `COMPLETED`, or `FAILED`; other values reject. A shared
   `finalizeTerminal` — also invoked when a `task_transition` lands on a
   terminal state — clears `needsUser`/its provenance and settles every
   non-terminal worker with a `CANCELED` fallback, so a terminal task can no
   longer contain a mid-flight or never-started "assigned" worker.
5. **Permission reachability and retention.** `WAITING_FOR_APPROVAL` is
   reachable from any non-terminal worker state, and `permission_request` no
   longer drops the pending need when the resolved worker cannot move
   (e.g. already terminal) — the approval claim is real regardless of worker
   attribution. `worker_transition` to `WAITING_FOR_APPROVAL` records the
   same attributed need.
6. **Attributed pending needs.** `needsUser` is no longer a bare flag: the
   snapshot carries `pendingUserNeeds`, a map from need key to the
   provenance of the evidence that created it — `worker:<internal id>` for
   an attributed approval, `task` for a task-level reported wait (so a
   `report_workflow_step` `waiting_for_user` genuinely exposes the need).
   `needsUser`/`needsUserProvenance` summarize the earliest live need. A
   worker's need resolves only on evidence that its own wait ended — the
   holder's non-derived exit from `WAITING_FOR_APPROVAL`, its finish, or
   non-derived evidence it is now `WORKING`/`REVIEWING`/terminal (an
   `IDLE`/`BLOCKED` no-op on a derived-idled worker says nothing about the
   ask and cannot resolve it); a `task` need
   resolves on a non-derived `task_transition` out of `WAITING_FOR_USER` or
   non-derived evidence of work resuming (`worker_transition` to `WORKING`);
   `turn_finished`/`interrupted` clear all needs; terminal finalization
   clears them. Unrelated activity on another worker cannot resolve an ask
   it did not address, and `derived` events can never dismiss a real ask —
   they may idle a worker, but the need keeps its attribution and resolves
   when that worker's real evidence arrives. `WAITING_FOR_USER` ↔ `ACTIVE`
   reconciles with the need map on every wait-affecting path, and the
   reconcile's `WAITING_FOR_USER` stamp carries the pending need's own
   provenance — a `derived` transition can never put its provenance on that
   claim. `interrupted` idles `REVIEWING` workers like `turn_finished`, and
   `IDLE → COMPLETED` is legal so a real `SubagentStop` isn't dropped when
   a `Stop` raced first.
7. **`worker_assigned` handled explicitly** (journals + attributes when the
   id resolves) and unknown future kinds now reject via `default` instead of
   being silently accepted as activity.
8. **Namespace separation.** Joined specialists get role-based internal ids;
   hook correlation ids live only in `externalId`, and an empty-string
   `workerId` is normalized to absent instead of minting an unresolvable
   phantom. `defaultWorker` prefers a non-terminal writer so fallback events
   never target a finished worker while others still run. Worker resolution
   is namespace-aware on every targeting path (`worker_transition`,
   `permission_request`, `specialist_finished`, `activity`,
   `worker_assigned`): hook-correlated events (`observed`/`derived`) carry
   native agent ids so `externalId` wins; model reports (`reported`) name
   roster ids so the internal id wins. A collision like
   `SubagentStart(agent_id="lead")` can therefore never route a permission
   or transition to the internal lead.

## New evidence artifacts

- `packages/state-machine/tests/property.test.ts` — mulberry32-seeded
  generator over all 11 kinds × 3 provenances × valid+invalid targets ×
  known/unknown worker ids; 64 seeds, per-event invariant oracle stated
  independently of the transition tables, reproducible seed/sequence dump on
  failure. Coverage floor asserts all kinds/provenances exercised, ≥1
  rejection, ≥1 terminal reach.
- `packages/test-fixtures/fixtures/seq-*.json` — five ordered sequence
  fixtures: success, early failure, permission/resume, rejected input,
  duplicate delivery. `SequenceStep.expect` pins applied/rejected/duplicate
  per step.
- `packages/state-machine/tests/replay.test.ts` — fixture runner + fresh-
  record full-record comparison + post-trim dedup-window test.

## Known boundaries and notes for the coordinator

- **Order matters.** `lastActivityAt`/`updatedAt` take each event's own `at`;
  out-of-order delivery can regress timestamps. The brief asks not to claim
  order-independent delivery — the generator deliberately emits occasional
  out-of-order `at` values and only asserts record-level invariants.
- **`recentEvents` is a bounded tail, not a replay source.** The retained log
  is capped at 200; `seenEventIds` is intentionally unbounded so dedup
  survives trimming (asserted by the window test).
- **Real-hook correlation risk.** If Codex ever sends `agent_id` on the main
  agent's `PreToolUse`/`PermissionRequest` without a matching roster
  `externalId`, the event now rejects (`applied:false`) — the work is then
  *invisible* on the board, not merely misattributed to the lead. Main-agent
  events observed so far carry no `agent_id`; validate with a real
  `PreToolUse` payload during platform validation before relying on the
  subagent-correlation path.
- **Hook-side event ids.** The bundled hook mints a fresh `eventId` per
  invocation (`hook_<ts>_<rand>`), so a Codex-side retry of the same hook is
  delivered as a new event; dedup protects caller-supplied ids only.
- **`task_finished`/`task_transition` terminal paths**: `COMPLETED` remains
  unreachable from `WAITING_FOR_USER`/`BLOCKED` — a pending wait must resolve
  or fail first; `FAILED`/`CANCELED` stay reachable and settle the board.
- **`needsUser` may outlive a `WAITING_FOR_APPROVAL` worker**: when a
  permission request lands on a terminal worker, or a `derived` event idles
  the waiting worker, the flag stays — the pending decision is real even if
  its holder isn't visibly waiting. Attribution survives in
  `pendingUserNeeds`; it clears on the next non-derived resolution of that
  holder, a turn boundary, or finalization.
- **A task-level reported wait resolves on real resumption evidence**: a
  non-derived `worker_transition` to `WORKING` or a non-derived
  `task_transition` out of `WAITING_FOR_USER` clears the `task` need.
  Observed work contradicting a "waiting" claim is treated as resolution;
  `activity` events alone never resolve needs.
- **The oracle asserts documented invariants, not the transition table** —
  legality is defined by the tables; the corpus independently asserts
  provenance, freeze, dedup, roster, and record-intactness rules plus
  coverage floors (all kinds/provenances, applies, rejects, duplicates,
  terminal reach, cross-task events).
- **In-memory TTL expiry** still evicts whole tasks (and capabilities) — by
  design for the alpha store.

No persistence, consumer-workflow, UI, or host changes were made.
