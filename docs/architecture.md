# Architecture

See `PROJECT_PLAN.md` §7 for the controlling diagram. Current state after
Milestone 0:

```text
ChatGPT / Codex
  visual-team skill (stub)          native work stays in the host
  Codex hooks (lifecycle events, record-only) ──┐
                              ▼
              MCP state service (apps/mcp-server)
                /mcp  Streamable HTTP, stateless transport
                tools: start_visual_task, record_codex_event,
                       get_visual_task, render_visual_task
                in-memory repository (metadata only, ~2h TTL)
                              │
                              ▼
              MCP Apps UI (apps/plugin-ui)
                ui://visual-team/task-v1.html
                inline card · fullscreen · PiP (feature-flagged)
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
| `packages/test-fixtures/` | Replayable event logs used by contract tests |

## Boundaries

- `ExecutionAdapter` boundary exists conceptually (native-host only); no
  Agents API implementation (ADR-002).
- The UI reaches data only through the host bridge (`tools/call`), so the
  resource declares an empty `connectDomains` CSP.
- Hook delivery is optional; missing hooks degrade to model-reported status.
