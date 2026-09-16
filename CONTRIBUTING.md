# Contributing

Thanks for your interest. Milestones M0–M4 are accepted on the tested path
(see `ROADMAP.md` for the status map); remaining milestone work is sequenced
by `PROJECT_PLAN.md`. Before opening large PRs, check the milestone gates —
work outside the current milestone is likely to be parked. Small fixes,
docs, tests, and the drafted good first issues in
`docs/good-first-issues.md` are welcome anytime.

## Setup

```powershell
npm ci
npm run lint         # eslint flat config
npm run typecheck
npm test
npm run build
```

All five must pass before submitting. `npm run replay -- <fixture>` replays
a committed synthetic fixture through the real engine — a fast way to see
the state machine and provenance rules without a host.

## Reporting bugs and security issues

Use the GitHub issue templates for bugs and feature requests. Report
security vulnerabilities privately through
[GitHub private vulnerability reporting](https://github.com/tinatsntx/project-visual-team/security/advisories/new) —
see `SECURITY.md`.

## Non-negotiables for contributions

- No fabricated activity. Every UI state needs provenance (`observed`,
  `reported`, `derived`); derived never claims completion/approval/review.
- No Agents API or new execution infrastructure (ADR-002).
- `record_codex_event` stays append-only and decision-free (ADR-007).
- Metadata-only persistence (ADR-006). Do not add logging of prompts,
  transcripts, commands, code, or tokens.
- Solo-by-default routing; max three visible bots; one writer (ADR-005).
- Hook events route only through observed session/agent bindings — never
  add a recency or recency-like fallback (ADR-007, M4).
- Accessibility is not optional: every state has text, reduced motion is
  honored, controls are keyboard-reachable.

## Code style

- TypeScript strict mode; Zod for every boundary schema.
- Deterministic, injectable clocks in the state machine and tests.
- Compact, idiomatic code; comments only where the *why* is non-obvious.
