# Security policy

## Reporting a vulnerability

Do not open a public issue for security reports. Use GitHub private
vulnerability reporting:

**https://github.com/tinatsntx/project-visual-team/security/advisories/new**

Include:

- a description of the issue and affected versions/commits;
- reproduction steps or proof of concept;
- whether sensitive data (capability tokens, prompts, tool payloads) may
  have been exposed.

GitHub private vulnerability reporting was verified enabled by the
maintainer on 2026-09-15. No response-time commitment is published yet —
this section will be updated if the maintainer commits to one.

## Other contact

A separate non-security contact route (support, conduct reports) is not yet
established; it remains an owner decision tracked in
`docs/release-readiness.md`. Do not use the security channel for general
questions.

## Scope notes

- The MCP server stores task-scoped capability tokens and metadata only —
  see `docs/security.md` and `docs/privacy.md`.
- `record_codex_event` is intentionally append-only; issues where it could
  influence Codex decisions are in scope and high severity.
- Correlation identifiers (`session_id`, `agent_id`) route events but are
  not authentication; issues that bypass task scoping or mint `observed`
  provenance are in scope.
- The alpha is localhost-oriented; report issues assuming a production HTTPS
  deployment anyway.
