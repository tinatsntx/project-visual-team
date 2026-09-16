# M4 acceptance — session isolation, specialist correlation, record-only hook coverage

Status: implemented and locally verified. **Real-native delivery not yet
claimed** — every result below is synthetic or local-emulation evidence unless
explicitly marked otherwise. Coordinator-owned real-host/native acceptance is
pending.

Brief: `docs/swe-2-brief-009.md` (committed `39fd5a2`). Coordinator review
findings folded in: `docs/m4-coordinator-review.md` plus the live
`dist/m4-native-acceptance/` probes.

## What M4 changes

| Area | Before (M3) | After (M4) |
| --- | --- | --- |
| Untargeted routing | `mostRecentActive()` fallback guessed the newest task | Binding-only resolution; unknown/conflicting correlation rejected |
| Session binding | none | `session_id → task` learned only from a validated start-receipt path or explicit validated registration |
| Specialist correlation | `externalId` matching only | `agent_id → task` binding at `SubagentStart`; child events carry the shared `session_id` + child `agent_id` |
| Hook coverage | `PostToolUse` only | All nine contract-supported events |
| Hook script | forwarded allowlist | Receipt-validated task binding, bounded input, silent zero-exit failure |
| Self-referential events | recorded | dropped (`self_referential_visual_team_tool`) |
| Permission ordering | `WAITING_FOR_APPROVAL` could not finish | observed post-tool activity resolves the ask; `WAITING_FOR_APPROVAL → COMPLETED` allowed |

## Pinned native contract evidence

Runtime: Codex `0.154.0-alpha.6.2` (Windows). Sources: pinned
`rust-v0.154.0` tree + coordinator-captured real-runtime metadata.

- **Shared session identity.** `core/src/session/session.rs` lines 602–605
  (rust-v0.154.0) establish that subagents and resumed turns share the root
  `session_id`. Confirmed by real runtime captures:
  `dist/m4-native-acceptance/runtime-contract-metadata.json` and
  `runtime-resume-contract-metadata.json` — a real lead event, a real child
  event, and a resumed root event all carried
  `session_id 01a0a7da-5fef-7e42-acd2-539ee5a42d4a`; only child events added
  `agent_id 01a0a7da-f0ea-74c1-9c93-9fbd53df4fc7` with `agent_type: default`.
- **Consequence:** `session_id → task` alone binds a whole Codex session
  including subagent tool events; `agent_id` distinguishes which specialist
  acted. No transcript-path or disk-side correlation is needed — an earlier
  draft's hook-side binding files were removed after this evidence landed.
- **Lifecycle vocabulary.** The pinned runtime supports twelve hook events;
  the contract subset wired is nine: `SessionStart`, `UserPromptSubmit`,
  `SubagentStart`, `PreToolUse`, `PostToolUse`, `PermissionRequest`,
  `SubagentStop`, `Stop`, `Interrupt`. `SessionEnd`, `PreCompact`,
  `PostCompact` are not in the M4 contract surface.
- **MCP tools fire hooks** as `mcp__<server>__<tool>` with `tool_response`
  carrying the serialized MCP result — the `start_visual_task` receipt is
  observable, which is what makes server-side session binding possible
  without client-side state.
- **Hooks are not inherently observe-only.** PreToolUse/PermissionRequest
  JSON stdout can decide; exit 2 blocks. This hook prints nothing and exits
  0 — record-only preserved by construction.
- **Sensitive fields stay out.** Payloads may carry `prompt`, transcript
  paths, `cwd`, `tool_input`/`tool_response` bodies. The allowlist forwards
  only `session_id`, `turn_id`, `agent_id`, `agent_type`, `tool_name`.
  `tool_input` is never scanned for token-shaped strings; the task id is
  taken only from a validated successful `start_visual_task` tool_response.

## Binding design

Server-side, in `apps/mcp-server/src/repositories/memory.ts` — two bounded
indexes swept with task lifetime:

- `session_id → taskId` (`bindSession`, `boundTaskForSession`,
  `resolveBoundSession`)
- `agent_id → taskId` (`bindAgent`, `boundTaskForAgent`, `resolveBoundAgent`)

Resolution in `record_codex_event`
(`apps/mcp-server/src/tools.ts:resolveEventTarget`):

1. **Explicit `taskId`:** task must exist; any live binding to a different
   task rejects `session_bound_to_other_task` before mutation. A non-
   conflicting `taskId` + `session_id`/`agent_id` pair is itself the observed
   receipt — learned eagerly so even the self-referential start-receipt event
   (dropped by the mapper) still binds the session.
2. **Untargeted:** resolve `session_id`, else `agent_id`. Neither bound →
   `unbound_session`. Session bound to A carrying an agent bound to live B →
   `ambiguous_correlation`. Terminal/expired bindings resolve to nothing and
   are swept.
3. **Learning is deferred** until `repo.apply` succeeds — rejected or
   ambiguous metadata never mutates the indexes (coordinator finding: a
   conflicting envelope must not steal a valid agent binding).
4. Valid new receipts may rebind a session once the prior task is terminal.
   Duplicate `eventId`s remain idempotent. Rate limits apply after
   resolution, so they stay task-scoped.

`mostRecentActive()` no longer participates in routing.

### State machine (permission ordering)

Native order is `PreToolUse → PermissionRequest → PostToolUse → SubagentStop`
with **no second PreToolUse** between approval and completion. Two truthful
changes in `packages/state-machine/src/index.ts`:

- `WAITING_FOR_APPROVAL → COMPLETED` added to `WORKER_TRANSITIONS` — an
  observed SubagentStop is evidence the subagent ended; its ask is moot.
- An `observed` `activity` event on a `WAITING_FOR_APPROVAL` worker resolves
  that worker's pending need and returns it to `WORKING` — the observed
  PostToolUse is itself evidence the native tool ran (the prompt was
  decided). Reported/derived activity cannot resolve an ask; unrelated
  workers' activity cannot resolve another worker's ask (unchanged).

## Record-only hook

`plugin/hooks/hooks.json` wires all nine events, each
`async: true` with a bounded `timeout` (Interrupt bounded to the native 3s
cap), `node "${PLUGIN_ROOT}/hooks/record_codex_event.mjs" <EventName>`.

`plugin/hooks/record_codex_event.mjs`:

- Reads stdin with a byte cap; malformed or oversized input exits silently.
- Forwards only the five metadata fields above.
- Extracts `taskId` only from a validated successful
  `mcp__visual-team__start_visual_task` `tool_response` (`vt_*` shape);
  `tool_input` and raw stdin are never scanned.
- `VISUAL_TEAM_TASK_ID` (non-empty) overrides; empty string does not block
  receipt extraction.
- Sends a bounded POST to `VISUAL_TEAM_MCP_URL` (default localhost). Bad
  config, network failure, timeout → swallowed; **no stdout, no decision
  JSON, exit 0 always**. The hook can never approve, deny, rewrite, or block
  a native action.
- No disk state: no binding files, no transcript caching — justified by the
  shared-`session_id` evidence above.

## Verification results (local, synthetic unless marked)

| Check | Command | Result |
| --- | --- | --- |
| Typecheck | `npm run typecheck` | clean |
| Tests | `npm test` | **199/199 pass** |
| Build | `npm run build` | widget + dev-host bundles produced |
| UI embed | `npm run verify:ui-resource` | verbatim embed verified |
| Native package | `npm run build:native-codex-compat` + `npm run verify:native-codex-compat` | package generated; all nine per-event launch checks, receipt-extraction launch, spaced-path resolution, source parity pass |
| M0 probe | `node --import tsx evals/m0-enablement-coordinator-probe.mts` | exit 0 |
| M1 probe | `node --import tsx evals/m1-coordinator-probe.mts` | exit 0 |
| M2 probe | `node --import tsx evals/m2-consumer-workflow-probe.mts` | exit 0 |
| M3 probe | `node --import tsx evals/m3-coordinator-probe.mts` | exit 0 (7/7) |
| M4 probe | `node --import tsx evals/m4-session-binding-probe.mts` | exit 0 (10/10) |
| Routing probe | `node --import tsx dist/m4-native-acceptance/routing-probe.mts` | exit 0 (4/4) |
| Boundary probe | `node dist/m4-native-acceptance/hook-boundary-probe.mjs` | exit 0 (3/3) |
| Whitespace | `git diff --check` | clean |

### Probe case detail

`evals/m4-session-binding-probe.mts` (10/10): receipt binds session →
untargeted events route; concurrent sessions + ChatGPT task isolated;
unbound events fail closed (`unbound_session`); explicit target conflicting
a live binding rejected (`session_bound_to_other_task`); duplicate delivery
idempotent; terminal binding fails closed then rebinds; binding expires with
task; resumed session keeps binding while new sessions fail closed;
specialist lifecycle correlates (reviewer `WAITING_FOR_APPROVAL` →
`COMPLETED` via Post+Stop, lead and unrelated asks untouched);
self-referential tool calls not recorded.

`dist/m4-native-acceptance/routing-probe.mts` (coordinator-owned, 4/4):
unbound events do not choose most-recent; session+agent bound to different
live tasks fail closed; a conflicting envelope cannot steal an agent
binding; native `Pre → Permission → Post → Stop` completes
(`finalWorkerState: COMPLETED`, `needsUser: false`) with no fabricated
second `PreToolUse`.

`dist/m4-native-acceptance/hook-boundary-probe.mjs` (coordinator-owned,
3/3): only a validated `tool_response` start receipt binds (never
`tool_input`); bad MCP URL exits 0 with zero stderr; malformed input emits
zero calls.

### Test additions

- `apps/mcp-server/tests/session-binding.test.ts` — real-HTTP routing:
  concurrent sessions, agent/session conflicts, steal attempts, terminal
  rebind, expiry, resume, specialist attribution.
- `apps/mcp-server/tests/hook-script.test.ts` — spawns the real script
  against a stub endpoint: receipt-only binding, `tool_input` non-authority,
  malformed/oversized input, silent zero-exit on bad config, empty-override
  fallthrough.
- `apps/mcp-server/tests/tools.test.ts` — `mostRecentActive` fallback test
  replaced with binding-rejection coverage.
- `packages/codex-event-mapper/tests/mapper.test.ts` — self-referential drop
  + the nine-event mapping surface.
- `packages/state-machine/tests/reducer.test.ts` — native permission
  ordering (Post resolves ask; Stop completes) and waiting-specialist finish.

### Real vs synthetic evidence

- **Real native:** coordinator-captured hook payloads
  (`runtime-contract-metadata.json`, `runtime-resume-contract-metadata.json`)
  — shared `session_id`, child `agent_id`/`agent_type`.
- **Local emulation:** compat verifier launches the real hook script from a
  spaced install root per event against a stub endpoint.
- **Synthetic:** all eval probes and coordinator `dist/` probes drive the
  real MCP transport + reducer with fixture payloads — they verify routing
  and state semantics, not native hook discovery, trust, or delivery.

## Native runbook (coordinator)

1. Build: `npm ci && npm run build:native-codex-compat`.
2. Install the generated package via the supported marketplace flow
   (`docs/native-codex-compat.md` §Reproduce). Do **not** copy into the
   installed cache; do not modify trust state or global settings; no
   bypass flags.
3. Disable `visual-team@personal` for the run so hooks don't double-deliver.
4. In Codex `/hooks`, review the nine Visual Team hook entries; trust only
   after review, normally.
5. Use a fresh visual task if the prior one expired; point the plugin at the
   intended MCP URL with **process-local** env overrides only
   (`VISUAL_TEAM_MCP_URL`); clear them afterward.
6. Run bounded harmless native actions (e.g., a `date` read, a spawned
   subagent, one permission-gated tool, a resume). Do not invoke the hook
   manually and do not call `record_codex_event` by hand.
7. Expected: session binds at the `start_visual_task` receipt; subagent
   events attribute by `agent_id`; a permission-gated tool shows
   `WAITING_FOR_APPROVAL` then completes on Post+Stop; the resumed session
   keeps routing; other sessions' events are rejected.
8. Evidence to capture: structured hook event metadata only — never raw
   stdin payloads, prompts, transcripts, command text, or capability tokens.

## Known limits

- Real-native delivery, `/hooks` review/trust flow, and hosted-endpoint
  delivery are unverified — coordinator acceptance.
- A correlation key is routing metadata, not authentication; multiuser
  isolation remains out of scope (see `docs/security.md`).
- Session/agent indexes live in the in-memory repository — a server restart
  drops bindings; a resumed session must produce a new validated receipt to
  rebind (events fail closed, they do not misroute).
- `SessionEnd`, `PreCompact`, `PostCompact` exist in the runtime but are
  outside the M4 contract surface and are not wired.
- The M2 constraints are otherwise lifted only as scoped: explicit
  `$visual-team` invocation still applies; concurrent visual tasks are now
  session-isolated rather than globally single.
