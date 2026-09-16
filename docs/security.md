# Security model

Threat model seeds for the alpha (expand before public beta — Milestone 5/6).

## Assets and trust boundaries

- **Task capability tokens** (`vtc_*`): high-entropy, task-scoped, in-memory,
  ~2h TTL. Required for `get_visual_task`. Returned only in UI-private result
  metadata — never in model-visible content or logs.
- **Hook input** is untrusted: `record_codex_event` validates with Zod,
  whitelists correlation fields, is append-only, returns no decisions, and is
  rate-limited per task (120 events/min).
- **UI iframe**: MCP Apps resource with `csp.connectDomains: []` — the UI
  cannot make direct network calls; all data flows through the host bridge.

## Controls in place

- Zod validation on every tool input.
- Append-only event log, deduplicated by event id.
- Provenance guard: `derived` evidence can never produce completion,
  approval, review, or success states.
- Structured JSON logs with no tokens, prompts, or payload text.
- Stateless transport: no MCP session state to hijack.

## Known limitations (documented, not hidden)

- Committed `plugin/mcp.json` points at the tested Render HTTPS alpha
  endpoint. The local server and unconfigured hook default to localhost;
  configure both URLs together as documented in `setup.md`. Production
  submission and an authentication decision remain pending (Milestone 7).
- Untargeted hook events resolve only through a `session_id`/`agent_id`
  binding established by observed evidence (the start-tool receipt or a bound
  SubagentStart); unknown, expired, or conflicting correlation is rejected.
  A correlation key is routing metadata only — it is not an authentication
  credential and does not replace the task capability token; multiuser
  isolation is still out of scope for the single-user alpha.
- Non-managed plugin hooks require user trust review before Codex runs them.
- All state is in-memory per server instance: task records, the bounded
  `session_id`/`agent_id` binding indexes, and rate-limit counters. A
  restart drops everything — replay protection depends on per-task event-id
  dedup inside that process, not on durable state.
- The Visual Team M0 developer app has no widget domain and no
  authentication as of 2026-09-15; production/submission claims remain
  pending.

## Reporting

See `SECURITY.md` at the repository root.
