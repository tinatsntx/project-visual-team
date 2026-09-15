# SWE-2 brief 006 — finish Milestone 1 core state engine

M0 is closed. Start Milestone 1 under `PROJECT_PLAN.md` §14. Read
`HANDOFF.md`, `docs/m0-closeout.md`, and the current source first.
Product baseline is `4fb3548`; documentation-only closeout commits may follow.
SWE-2 owns coding. The owner relays the result; the coordinator owns review,
publication/deployment decisions, and real-host acceptance.

## Outcome and existing implementation

Make the current engine satisfy the four Milestone 1 exit criteria with
reproducible evidence. Reuse the existing implementation:

- `packages/contracts/src/index.ts`: typed events/snapshots and schemas.
- `packages/state-machine/src/index.ts`: reducer, provenance guards,
  terminal freeze, deduplication, bounded event log, derived stale flag.
- `apps/mcp-server/src/repositories/memory.ts`: in-memory store, injected
  clock, task-scoped capability and expiry.
- `packages/state-machine/tests/` and `packages/test-fixtures/`: selected
  examples, two hook fixtures, one short repeated replay test.
- Mapper/HTTP tests and `evals/m0-enablement-coordinator-probe.mts` protect
  the accepted native and terminal behavior.

The current coverage has examples but no systematic event/provenance/invalid
transition property coverage. Extend that evidence and make only necessary
engine corrections. This is not a new storage architecture or another M0 pass.

## Bounded work

1. Add deterministic property-style checks over legal and illegal event
   sequences, all event kinds, provenance levels, and reachable task/worker
   states. An exhaustive small matrix or seeded generator is acceptable;
   failures must report a reproducible seed/sequence. Assert the documented
   invariants independently of the implementation's transition tables.
2. Verify provenance on every path that mutates a worker, task, or needsUser,
   including indirect `specialist_finished` and `permission_request` paths,
   not just explicit transition events. Derived evidence must never produce
   completion, approval, review, or success. Native Stop remains a turn ending.
3. Validate unsupported targets safely: cross-task events, unknown explicit
   worker identifiers, wrong-kind/missing transition targets, and terminal
   events. An explicitly invalid target must not silently mutate the default
   worker or another task. Preserve intentional fallback for a genuinely
   absent worker identifier. Rejections must leave the complete record intact.
4. Strengthen replay fixtures to cover successful work/completion, early
   failure, permission/resume, rejected input, and duplicate delivery. Replay
   identical ordered input into fresh records and compare complete snapshots,
   accepted logs, counters, provenance, and dedup state. Include duplicate
   insertion before and after terminal state and beyond the 200-event retained
   log window. Document that a truncated recent-event tail is not a full replay
   source; do not add persistence or claim order-independent delivery.
5. Add focused repository/contract tests only where needed to show the same
   engine guarantees survive the repository boundary. Preserve the injected
   clock, capability isolation, current TTL, and the 640-character finish
   metadata policy. Keep all input/fixtures synthetic and metadata-only.

If an event kind is schema-valid but not implemented, give it an explicit,
safe behavior supported by the plan (or reject it). Do not silently accept an
unhandled kind as successful activity. Do not invent later workflow features
to make a test pass. Describe any material behavior correction in the report.

## Finite acceptance checklist

- Same initial state and ordered event log always yield the same complete
  snapshot; inputs are not mutated by the pure reducer.
- Unsupported transitions/targets reject without changing snapshot, log,
  event count, or dedup state. Terminal tasks stay frozen.
- No derived event, including an indirect event kind, can mark work complete
  or approved/reviewed/successful. Valid observed/reported paths still work.
- Duplicate hook/event IDs never alter the result, including after log
  retention trims old entries and after completion.
- Existing hook mapping, one-writer/three-visible-worker limits, private
  capability transport, and accepted finish metadata stay intact.

Add a short `docs/m1-core-engine-acceptance.md` mapping each of the four
Milestone 1 exit criteria to concrete tests and results. Stop when these
criteria and the existing checks pass; no open-ended coverage target.

## Scope and verification

Primary edit scope: contracts, state-machine, test-fixtures, focused repository
tests, and that acceptance record. Change the repository/mapper/tool boundary
only if required to preserve the listed guarantees; explain why. No UI
redesign, plugin loader changes, host migration, persistence, additional hooks,
new authentication, consumer-skill expansion, or broader platform testing.
Preserve coordinator evidence/configuration and the working host flow.

Run `npm run typecheck`, `npm test`, `npm run build`,
`node --import tsx evals/m0-enablement-coordinator-probe.mts`, and
`git diff --check`; ensure the committed diff is clean too. Keep clean-checkout
tests independent of prebuilt UI. No requirement to repeat browser acceptance
for changes that do not affect the bridge or resource.

Return the commit(s), changed files, concrete defects fixed, commands/results,
and the four-criterion evidence mapping. Commit scoped work locally; do not
push or deploy. The coordinator will review before publication.
