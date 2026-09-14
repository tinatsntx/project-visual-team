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

## Local harness verification (2026-09-14)

`apps/plugin-ui/dev.html` is a simulated host: it embeds the real widget
bundle in an iframe, answers `ui/initialize` + `tools/call` over postMessage,
and replays `packages/test-fixtures` through the real `mapCodexEvent` +
`applyEvent` pipeline. These verify the widget-side mechanics only — the
platform matrix above still needs real surfaces.

Visually confirmed in the harness preview: inline and fullscreen modes both
render, `team-with-permission` replays to its `expect` block exactly
(`WAITING_FOR_USER`, lead `WAITING_FOR_APPROVAL`, specialist `COMPLETED`,
`needsUser: true`), evidence entries show live timestamps and provenance
labels, zero console errors, and the a11y tree (`role="alert"`, avatar
aria-labels, sr-only status) is intact.

- `ui/initialize` handshake + `ui/notifications/tool-result` deliver the
  snapshot and the UI-private `_meta.taskCapability`. ✓
- Approach 1 refresh: the widget polls `get_visual_task` via `tools/call`
  every 4 s while non-terminal; host-side events appear on the next poll as
  data-only updates — no reload, no re-render of the frame. ✓ (mechanism
  verified; latency is localhost-trivial, not a platform measurement)
- Capability guard: wrong/missing token returns an `isError` result. ✓
- `needsUser` surfaces from `PermissionRequest`; an observed `task_finished`
  reaches COMPLETED and polling stops at a terminal state. ✓
- `ui/request-display-mode` round-trips; harness resizes + remounts the
  widget per mode. PiP remains behind `PIP_FEATURE_ENABLED`. ✓
- Headless text: `summarize()` output and the `uiAvailable: false` fallback
  are covered by `apps/mcp-server` tool tests. ✓ (unit level)
- Not covered locally: real host chrome, CSP enforcement, cross-origin
  isolation, hosted-tool blind spots — platform matrix only.

## Server transport verification (2026-09-14)

`apps/mcp-server` exercised over real Streamable HTTP (`POST /mcp`, stateless
mode, `enableJsonResponse`):

- `initialize` → protocol `2025-06-18`, tools+resources capabilities. ✓
- `tools/list` → the four M0 tools; `render_visual_task` carries
  `ui.resourceUri` + `openai/outputTemplate` (`ui://visual-team/task-v1.html`)
  in descriptor `_meta`. ✓
- `start_visual_task` → taskId, snapshot, UI-private `_meta.taskCapability`. ✓
- `record_codex_event` (SubagentStart) → mapped + applied; specialist joined
  as WORKING. ✓
- `get_visual_task` → snapshot + bounded `recentEvents` with valid
  capability; `isError` on a wrong capability. ✓
- `resources/read` → `text/html;profile=mcp-app`, ~157 KB single-file HTML
  with the JS bundle + CSS inlined, `_meta.ui.csp` =
  `{connectDomains:[], resourceDomains:[]}` (bridge-only, plan §13.5). ✓
- `GET`/`DELETE /mcp` → 405 (stateless by design — SSE fallback untested,
  see refresh-method item 2).

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
