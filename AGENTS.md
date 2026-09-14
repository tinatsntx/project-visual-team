# Agent notes — Project Visual Team

**Read `HANDOFF.md` first** — current state, verified links, and the platform
matrix runbook. `PROJECT_PLAN.md` is the controlling spec.

Rules that must never be violated (see `docs/adr/`):

- `record_codex_event` is append-only; it can never approve, deny, rewrite,
  or block a Codex action.
- Every visual state carries provenance; derived evidence never claims
  completion, approval, review, or success. Missing hooks degrade to
  model-reported status — never fabricate.
- Metadata-only: no prompts, transcripts, command text, or code content in
  storage, transport, or logs. Capability tokens live in `_meta` only.

Verify before committing: `npm run typecheck` and `npm test` must pass;
`npm run build` must produce the widget + dev-host bundles.
