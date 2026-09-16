# Architecture

See `PROJECT_PLAN.md` §7 for the controlling diagram. Current state after
Milestone 4:

```text
ChatGPT / Codex
  visual-team skill                 native work stays in the host
  Codex hooks (9 lifecycle events, record-only) ──┐
                              ▼
              MCP state service (apps/mcp-server)
                /mcp  Streamable HTTP, stateless transport
                tools: start_visual_task, report_workflow_step,
                       record_codex_event, get_visual_task,
                       finish_visual_task, render_visual_task
                in-memory repository (metadata only, ~2h TTL)
                  + session_id → task and agent_id → task
                    binding indexes (bounded, swept with tasks)
                              │
                              ▼
              MCP Apps UI (apps/plugin-ui)
                ui://visual-team/task-v1.html
                inline card · fullscreen · PiP (tested ChatGPT web path)
                refresh via tools/call get_visual_task on the host bridge
```

## Package map

| Path | Purpose |
|---|---|
| `plugin/` | Portable Agent Plugins package: `plugin.json`, `mcp.json`, `hooks/`, `skills/visual-team/`, assets |
| `apps/mcp-server/` | Express + `@modelcontextprotocol/sdk` state service |
| `apps/plugin-ui/` | React 18 UI bundled by esbuild to a single ESM module |
| `packages/contracts/` | Zod schemas and types shared by server, UI, and tests |
| `packages/state-machine/` | Deterministic reducers, provenance guards, dedup |
| `packages/codex-event-mapper/` | Codex lifecycle events -> visual events (record-only) |
| `packages/test-fixtures/` | Replayable event logs used by contract tests and `npm run replay` |

## Correlation and state

- **Transport is stateless; application state is not.** Each `POST /mcp`
  gets a fresh server+transport pair; the shared in-memory repository holds
  task records and the session/agent binding indexes.
- A `record_codex_event` call reaches a task only through an explicit
  `taskId` that does not conflict with live bindings, or an observed
  binding: the `start_visual_task` tool receipt binds `session_id`, and a
  bound `SubagentStart` binds the child's `agent_id` (pinned Codex 0.154.x
  shares the root `session_id` across subagents and resumes). Unknown,
  expired, or conflicting correlation is rejected — there is no
  most-recent-task fallback.
- Bindings are bounded (512 keys per index) and swept with their task; a
  terminal task stops accepting events and its binding no longer blocks a
  new receipt.
- Terminal tasks are frozen: no event may alter state, roster, needs, or
  timestamps afterward.

## Boundaries

- `ExecutionAdapter` boundary exists conceptually (native-host only); no
  Agents API implementation (ADR-002).
- The UI reaches data only through the host bridge (`tools/call`), so the
  resource declares an empty `connectDomains` CSP.
- Hook delivery is optional; missing hooks degrade to model-reported status.
- Opaque task/session identifiers are routing metadata, not authentication —
  they do not provide multiuser isolation (`docs/security.md`).
