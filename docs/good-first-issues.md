# Good first issue drafts

Prepared for M6 — **not opened as GitHub issues yet** (opening them is a
coordinator action). Each is genuinely bounded: reproduction/context, file
pointers, scope, and acceptance criteria.

## 1. Guard test: non-observed `activity` must not resolve a pending ask

**Context.** `packages/state-machine/src/index.ts` resolves a
`WAITING_FOR_APPROVAL` worker's pending need only when an **observed**
post-tool `activity` event arrives (the native ordering is
`PreToolUse → PermissionRequest → PostToolUse`). Reported or derived
`activity` on a waiting worker must not dismiss the ask — but no test pins
that negative.

**Repro.** In `packages/state-machine/tests/reducer.test.ts` ("attributed
pending needs" suite): join a specialist, `permission_request` it, then
send `activity` with `provenance: "reported"` and `"derived"` for that
worker — `needsUser` must stay `true` and the worker must remain waiting.

**Scope.** One test case; no reducer changes expected. If the test fails,
stop and report — the guard regressed.

**Acceptance.** New test passes; `npm test` stays green.

## 2. `npm run replay -- --verbose` shows event detail and targets

**Context.** `scripts/replay-fixture.mts` prints each event's kind,
provenance, and label, but drops `detail` and `to` — fields that matter
when inspecting finish metadata or transitions.

**Repro.** `npm run replay -- completed-verified` shows no
`result: …; verification: …` detail even though the fixture carries it.

**Scope.** Add a `--verbose` flag in `scripts/replay-fixture.mts` that
appends `to=`/`detail=` per step; extend
`packages/test-fixtures/tests/replay-cli.test.ts` with one verbose-run
assertion. No engine changes.

**Acceptance.** `npm run replay -- --verbose <fixture>` prints detail
lines; new test passes; existing CLI tests unchanged.

## 3. Fixture-authoring guide

**Context.** Contributors can replay fixtures (`npm run replay`) but there
is no doc explaining how to write one.

**Scope.** New `docs/fixtures.md`: `ReplayFixture` vs `SequenceFixture`
step shapes, the injected taskId/monotonic clock, `expect` semantics
(including `logLength` and per-step `expect: rejected|duplicate`), where
fixtures live (`packages/test-fixtures/fixtures/*.json`), and how the
replay tests consume them
(`packages/state-machine/tests/fixtures.test.ts`, `replay.test.ts`).
Emphasize: fixtures are synthetic evidence — labels must not describe real
user activity.

**Acceptance.** A contributor can add a new fixture, see it picked up by
`--list`, and replay it without reading the test sources.

## 4. Hook-script tests for lifecycle argv names and override precedence

**Context.** `apps/mcp-server/tests/hook-script.test.ts` exercises the
PostToolUse receipt path, but not that argv event names flow through for
the other eight wired events, nor that a non-empty `VISUAL_TEAM_TASK_ID`
beats a valid receipt while an empty one does not.

**Repro.** Spawn `plugin/hooks/record_codex_event.mjs SubagentStart`
against a stub endpoint (existing harness does this for PostToolUse) — no
assertion currently checks the delivered `name` field per event.

**Scope.** Table-driven cases over the nine event names asserting the
delivered `name`; two override-precedence cases. Test-only change.

**Acceptance.** New cases pass; `npm test` count grows; no script changes.

## 5. Evidence-panel wording check for long role labels

**Context.** `apps/plugin-ui` wraps long worker labels/roles
(`long-labels` fixture, M3). The evidence panel (`Evidence` disclosure in
fullscreen) is not covered by a long-content test — a very long event
`label` could overflow the panel at 320 px.

**Repro.** Render `FullscreenView` to static markup
(`apps/plugin-ui/tests/views.test.ts` pattern) with an event whose `label`
is ~300 chars; inspect whether the markup would wrap — the styles use
`overflow-wrap` in the board rows but the evidence list may not.

**Scope.** Add a test asserting the evidence list markup contains the
long label; if it overflows (missing wrap class), fix `styles.css` only —
no component changes.

**Acceptance.** Test passes; if a CSS change was needed, a narrow-viewport
note goes in the test comment.
