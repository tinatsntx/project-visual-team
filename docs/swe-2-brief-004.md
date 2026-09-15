# SWE-2 brief 004 — widget startup and read recovery

Date: 2026-09-14. Baseline: `8ef7822ef5d2ef6403d782bf2e50cd23f0a94239`.
This is a bounded M0 reliability task. The earlier broad brief 004 hygiene
batch remains deferred. SWE-2 implements and returns evidence; Codex reviews,
deploys to the existing acceptance host, and tests real ChatGPT/native surfaces.

Read `AGENTS.md`, `HANDOFF.md`, `PROJECT_PLAN.md`, and the latest section of
`docs/native-acceptance.md`. Preserve the coordinator's uncommitted config
and evidence. Work from the baseline above; the separate Sites port on
`codex/sites-mcp-port` is not part of this coding task.

## Why this is next

The corrected plugin's installed-root launch is now proven in the real
native runtime. One harmless native action automatically appended observed
activity to Render at `2026-09-14T19:34:36.48Z`; fresh task
`vt_d0f77f031b4c1437abdb0e67` advanced from 1 to 2 events. No manual hook or
event write occurred. Do not reopen hook packaging without new evidence.

The fresh ChatGPT render returned the correct public task, but its widget
initially remained at `Waiting for the task status…`. Subsequent browser
recovery became unresponsive. This does not prove a widget root cause or
prove that the hook event reached the view. Earlier ChatGPT refresh tests
passed; preserve that distinction.

Sites was separately implemented and privately deployed, but its MCP
connection is blocked with `Sites MCP is not enabled for this Site owner.`
No coding workaround is requested. The owner confirmed Pro; the cited
[official availability FAQ](https://help.openai.com/en/articles/12584461)
limits Pro custom MCP connections to read/fetch and allows Apps SDK apps.
Sites migration is paused. Render stays active, but hosting cannot expand
ChatGPT plan permissions. This limitation is not a confirmed cause of the
widget's waiting screen.

Coordinator acceptance will create the task through Codex, use the native
hook for event writes, and use only the existing read-only render/get tools
in ChatGPT. Do not change write-tool annotations, hide a write inside a read,
or add an entitlement workaround. The exact Pro viewer flow remains to be
verified. No account upgrade or new hosting work belongs in this brief.

## Source findings to investigate

- `apps/plugin-ui/src/bridge/hostBridge.ts`: `initialToolResult()` reads
  host globals during mount. Later `openai:set_globals` events currently
  update display mode only. Audit delayed task output/private metadata and
  notification ordering against the documented host contract.
- Audit the initialize/ready handshake and supported result shapes against
  current official MCP Apps/ChatGPT documentation before changing them.
  Do not invent aliases or claim the existing shape is the proven live cause.
- `apps/plugin-ui/src/bridge/useVisualTask.ts`: rejected promises and
  `isError` results are discarded. Missing capability prevents reads but
  creates no visible refresh status. Interval reads can overlap while the
  bridge's ten-second deadline is outstanding.
- `apps/plugin-ui/src/App.tsx`: no task always renders the waiting message;
  there is no bounded unavailable state or retry control. The existing
  `uiAvailable` fallback does not reflect these read failures.
- The dev host supplies an immediate full notification. Extend it to
  reproduce relevant supported delivery orders and failures explicitly;
  the happy path alone cannot validate this issue.

## Required behavior

1. **Reliable supported bootstrap.** Handle a complete render result before
   mount, after mount, and supported late host-global updates without losing
   the snapshot or private capability. Handle public output and private
   metadata arriving separately in either order. Render a valid snapshot
   immediately; label refresh unavailable if its capability never arrives.
   Do not combine task data and a capability from different tasks. Subscribe
   before reading current state so the read/subscription gap cannot drop an update.

2. **Truthful visibility and recovery.** Give initial loading a finite deadline,
   then show a clear unavailable state with a useful recovery action. After a
   failed refresh, retain any last confirmed snapshot/events as explicitly
   last-known data, with the last successful update time. Do not present stale
   animation or status as new evidence. Treat initialization/refresh health
   separately from the task lifecycle and from missing native-hook visibility.
   Do not infer expiry from a generic invalid-capability/unknown-task error.

3. **Safe bounded retry.** A retry rechecks available host data and performs
   the existing private read when credentials are available. Without them,
   use a documented host mechanism if available, otherwise give clear guidance
   to ask ChatGPT to render the board again. Do not silently create a new task,
   emit an event, put a capability in ordinary arguments, or contact the server
   directly. Keep at most one read in flight; prevent late/stale responses from
   overwriting newer data. Recover after a successful read and stop polling
   terminal tasks. Display-mode changes must still work independently.

4. **Reproducible local evidence.** Add focused tests and harness controls for
   the behavior above, including timeout/error then recovery, missing private
   metadata, a real generic expired-task read rejection, delayed delivery, and
   terminal polling. Use the real bridge/widget paths where possible. Synthetic
   harness outcomes must stay explicitly synthetic and cannot satisfy the real
   native-to-widget acceptance gate.

Prefer a small explicit state model for initialization and refresh health.
Choose and document bounded deadlines/backoff; preserve the normal healthy
refresh target. Do not build a general telemetry or retry framework.

If diagnostics are needed, keep them local and limited to allowlisted event
names, booleans, durations, and sanitized outcome codes. Never dump tool
envelopes, capabilities, user titles, host globals, hook stdin, or raw errors.

## Invariants and exclusions

- Capabilities remain only in private result/request `_meta`; no ordinary
  tool-argument fallback, persistent browser storage, or direct network access.
- Preserve bridge-only CSP, provenance, metadata-only behavior, append-only
  events, and the dependency-free `@visual-team/contracts/meta` widget import.
- No hook/manifest rewrite, trust bypass, Sites migration, account changes,
  Render cutover, terminal-event API, PiP enablement, or later-milestone work.
- Leave the separate sensitive-title warning, privacyMode semantics, skill
  text, and unrelated hygiene for later scope. Do not expand this brief to them.
- Do not edit or commit coordinator files `plugin/mcp.json`, `plugin/.app.json`,
  or acceptance documents merely to make verification pass. Add your own bounded
  return notes if needed; do not mark real platform rows PASS from local tests.

## Verification and return

Run `npm run typecheck`, `npm test`, `npm run build`, and `git diff --check`.
Report widget bundle size versus the current approximately 152.1 KB and
explain material growth. Preserve existing mode, reducer, private-transport,
and installed-root launch checks. Verify a clean source checkout/export and
the configured tree separately when configuration affects a result.

Return the commit SHA, changed files, official contract references used,
reproduced cases, before/after behavior, check results, and remaining unknowns.
If the real-host hang cannot be reproduced, say so explicitly; do not label a
plausible ordering fix as its confirmed cause.

Coordinator acceptance after review/deployment: with CSP enforcement on,
create a fresh task through Codex, then render that existing task in ChatGPT
using its read-only tool and confirm initialization. Leave the same
widget mounted, execute one real native harmless action with the corrected
hook and pinned task, and observe its new `observed` event without reload or
another model render. Confirm a controlled read failure shows truthful
visibility and recovery. M0 remains open until its remaining criteria pass.
