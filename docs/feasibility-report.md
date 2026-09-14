# Milestone 0 — Feasibility Report

**Status:** TEMPLATE — fill in after running the platform matrix.
**Gate:** All eight GO criteria below must hold before Milestone 1+ work begins.

## What was built

- Minimal MCP state service (`apps/mcp-server`) exposing `start_visual_task`,
  `record_codex_event`, `get_visual_task`, `render_visual_task`.
- React UI bundle (`apps/plugin-ui`) with inline, fullscreen, and flagged PiP
  modes.
- One bundled Codex hook (`PostToolUse` -> `record_codex_event`).
- Headless text output when the UI is unavailable.

## Platform matrix

| Surface | Plugin installs | Inline renders | Fullscreen | PiP | Live refresh | Codex event reaches view | Headless text |
|---|---|---|---|---|---|---|---|
| ChatGPT web | ☐ | ☐ | ☐ | ☐ | ☐ | n/a | ☐ |
| ChatGPT desktop | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| ChatGPT mobile | ☐ | ☐ | ☐ | ☐ | ☐ | n/a | ☐ |
| Codex (desktop app) | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Codex CLI | ☐ skills/tools/hooks only — no custom UI expected | | | | | | |

## State refresh method (plan §7.4)

Test in order and record which works per surface:

1. [ ] UI calls `get_visual_task` through the MCP Apps bridge while active.
2. [ ] Authenticated SSE from the approved MCP origin with exact CSP.
3. [ ] (Only if both fail) WebSockets — document justification.

**Method that worked:** _TBD_
**Measured refresh latency:** _TBD_ (target: < 5 s)

## Local harness and render-contract verification (2026-09-14)

`apps/plugin-ui/dev.html` is a simulated host: it embeds the real widget
bundle in an iframe, answers `ui/initialize` + `tools/call` over postMessage,
and replays `packages/test-fixtures` through the real `mapCodexEvent` +
`applyEvent` pipeline. These verify the widget-side mechanics only — the
platform matrix above still needs real surfaces.

The dev host now creates its initial `ui/notifications/tool-result` with the
same `createRenderVisualTaskResult()` contract used by the registered
`render_visual_task` handler: task snapshot + recent events in
`structuredContent`, capability only in result `_meta`.

The previous harness iteration was visually confirmed in the preview (inline
+ fullscreen render, `team-with-permission` replay to its `expect` block,
zero console errors, intact a11y tree). The rebuilt render-contract flow has
not been visually re-confirmed — same widget render path, new initialization
path.

- The widget starts the bridge listener before React mounts, then initializes
  from the cached notification or the documented `toolResponseMetadata` /
  `toolOutput` globals. It therefore does not depend on a prior
  `start_visual_task` result being injected into its iframe. ✓ (source and
  bundle verified locally)
- Approach 1 sends `get_visual_task` as `tools/call` with task ID/event limit
  in ordinary arguments and `com.visual-team/task-capability` only in request
  `_meta`. The 4 s interval remains active only for non-terminal snapshots;
  a changed `tick` triggers that same read immediately. ✓ (source path and
  transport contract verified locally)
- This execution environment could not run the browser automation command
  because its approval policy denied browser navigation. That is a local test
  environment limitation, not evidence about ChatGPT/Codex rendering.
- Not covered locally: actual host chrome, CSP enforcement, cross-origin
  isolation, forwarding of custom `tools/call` request `_meta`, and
  ChatGPT/Codex refresh latency. The platform matrix remains untested.

## Server transport verification (2026-09-14)

`apps/mcp-server` exercised over real Streamable HTTP (`POST /mcp`, stateless
mode, `enableJsonResponse`):

- `initialize` → protocol `2025-06-18`, tools+resources capabilities. ✓
- `tools/list` → the four M0 tools; `render_visual_task` carries
  `ui.resourceUri` + `openai/outputTemplate` (`ui://visual-team/task-v1.html`)
  in descriptor `_meta`; `get_visual_task` has no capability field in its
  public input schema. ✓
- `start_visual_task` → taskId, snapshot, UI-private result
  `_meta.com.visual-team/task-capability`. ✓
- `render_visual_task` → taskId, current task snapshot, recent events, and
  the same private result metadata; no capability value in `content` or
  `structuredContent`. ✓
- `record_codex_event` (SubagentStart) → mapped + applied; specialist joined
  as WORKING. ✓
- `get_visual_task` → snapshot + bounded `recentEvents` only when the valid
  capability is supplied in request `_meta`; missing, wrong, and cross-task
  values return `isError`; TTL sweep removes expired task records. ✓
- `resources/read` → `text/html;profile=mcp-app`, ~157 KB single-file HTML
  with the JS bundle + CSS inlined, `_meta.ui.csp` =
  `{connectDomains:[], resourceDomains:[]}` (bridge-only, plan §13.5). ✓
- `GET`/`DELETE /mcp` → 405 (stateless by design — SSE fallback untested,
  see refresh-method item 2).

### Actual local start → render → refresh reproduction

An ephemeral loopback server was started from the source server and called via
Streamable HTTP. Only booleans/counts were printed; no capability value was
logged.

1. `start_visual_task` minted a private capability and task ID.
2. `render_visual_task` returned the same task ID, lead `Alex`, a private
   capability, and no capability in `content` or `structuredContent`.
3. `record_codex_event` appended an observed `SubagentStart` event.
4. `get_visual_task` with the capability in request `_meta` returned event
   count `2` after the render result had count `1`, with two workers.

This proves the local server/transport delivery and refresh authorization. It
does **not** prove a real ChatGPT/Codex iframe mounts or that its host forwards
custom request `_meta`; leave every platform-matrix cell unchecked.

## Hook transport verification (2026-09-14)

The real bundled hook (`plugin/hooks/record_codex_event.mjs`) was run
against the live server with a simulated Codex stdin payload:

- initialize → notifications/initialized → `tools/call record_codex_event`
  over HTTP, exit 0. ✓
- Event landed on the task (`activity · "Finished a step." ·
  tool: apply_patch`) via `VISUAL_TEAM_TASK_ID` routing; untargeted hook
  calls correlate to `mostRecentActive`. ✓
- Payload filter kept only correlation fields — an extra
  `sensitive_field` in the stdin JSON never reached the server. ✓
- Not covered: Codex actually invoking the hook (platform matrix row).

## Hard GO criteria (plan §14)

| # | Criterion | Result | Evidence |
|---|---|---|---|
| 1 | Plugin installs and invokes without editing source | ☐ | |
| 2 | Inline UI renders reliably | ☐ | |
| 3 | Fullscreen works | ☐ | |
| 4 | PiP works, or documented limitation + inline fallback | ☐ | |
| 5 | UI refreshes task state without full re-render per event | ☐ | |
| 6 | At least one real Codex lifecycle event reaches the task view | ☐ | |
| 7 | Useful text output when custom UI unavailable | ☐ | |
| 8 | No prompt/transcript/command/code content needed for state | ☐ | |

## Pivot conditions check

- [ ] Codex events reach the state service? If not → ChatGPT-only visual mode.
- [ ] PiP reliable? If not → inline + fullscreen only.
- [ ] Live refresh possible? If not → stop the live-team concept.
- [ ] Separate App Server client required? If yes → new product decision.

## Findings and limitations

_Record honestly: hosted-tool blind spots, hook trust friction, surface
differences, anything the UI could not truthfully show._
