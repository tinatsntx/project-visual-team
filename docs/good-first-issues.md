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
fixtures live (`packages/test-fixtures/fixtures/*.json`), the name
registries that drive `--list` (`FIXTURE_NAMES` /
`SEQUENCE_FIXTURE_NAMES` in `packages/test-fixtures/src/index.ts` — a new
fixture must be registered there), and how the replay tests consume them
(`packages/state-machine/tests/fixtures.test.ts`, `replay.test.ts`).
Emphasize: fixtures are synthetic evidence — labels must not describe real
user activity.

**Acceptance.** A contributor can add a new fixture, register it, see it
picked up by `--list`, and replay it without reading the test sources.

## 4. Hook-script tests for a string `tool_response` and the response bound

**Context.** `plugin/hooks/record_codex_event.mjs` accepts `tool_response`
as either a parsed object or a JSON **string** (`typeof res === "string"`
→ `JSON.parse`), and bounds MCP responses at 256 KB
(`MAX_RESPONSE_BYTES`). `apps/mcp-server/tests/hook-script.test.ts`
covers neither branch. (Per-event argv `name` delivery is already asserted
for all nine events in `scripts/verify-native-codex-compat.mjs`.)

**Repro.** PostToolUse payload with `tool_response` as a JSON-encoded
string containing `structuredContent.taskId` — currently unexercised. And
a stub endpoint that returns >256 KB — the hook should still exit 0
silently rather than buffer unboundedly or crash.

**Scope.** Two cases in `apps/mcp-server/tests/hook-script.test.ts`: the
string response still extracts the receipt task id (or fails closed if the
payload is malformed); the oversized response keeps exit 0, no stdout. If
either needs a script change, stop and report — do not change the hook
under a test task.

**Acceptance.** New cases pass; `npm test` count grows; no script changes.

## 5. Measurable 320 px overflow check for the evidence panel

**Context.** `apps/plugin-ui` wraps long worker labels/roles
(`long-labels` fixture, M3), but the evidence panel (`Evidence`
disclosure in fullscreen) has no long-content coverage — and a static
`renderToStaticMarkup` test cannot prove wrapping. The existing headless
capture pipeline (`scripts/m3-capture.mts`) renders real layouts.

**Repro.** Add a capture scenario with an event `label` of ~300 chars,
screenshot fullscreen at a 320 px viewport via the existing headless
Chrome path, then assert measurably: evaluate
`document.scrollingElement.scrollWidth <= 320` (no horizontal overflow) on
the rendered page. A static-markup assertion is not a substitute — layout
only exists in a real browser.

**Scope.** Extend `scripts/m3-capture.mts` (or a sibling script) with the
scenario + a `scrollWidth` check written into the shot report; if the
panel genuinely overflows, fix `styles.css` only — no component changes.
Test/tooling files only.

**Acceptance.** The check runs in `npm run` script form (or a spawned
test), fails on real overflow, and passes on the committed code.
