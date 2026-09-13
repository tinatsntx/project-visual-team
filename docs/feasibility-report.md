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
