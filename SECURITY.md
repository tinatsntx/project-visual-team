# Security policy

## Reporting a vulnerability

Do not open a public issue for security reports. Contact the maintainers
privately (add a security contact here before public release) with:

- a description of the issue and affected versions;
- reproduction steps or proof of concept;
- whether sensitive data (tokens, prompts) may have been exposed.

We aim to acknowledge reports within 72 hours.

## Scope notes

- The MCP server stores task-scoped capability tokens and metadata only —
  see `docs/security.md` and `docs/privacy.md`.
- `record_codex_event` is intentionally append-only; issues where it could
  influence Codex decisions are in scope and high severity.
- The alpha is localhost-oriented; report issues assuming a production HTTPS
  deployment anyway.
