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

- Local-dev `mcp.json` points at `http://localhost:8787/mcp`; production
  submission requires a public HTTPS endpoint (Milestone 7).
- Untargeted hook events attach to the most recently active task — acceptable
  for a single-user local alpha; revisit for multiuser.
- Non-managed plugin hooks require user trust review before Codex runs them.

## Reporting

See `SECURITY.md` at the repository root.
