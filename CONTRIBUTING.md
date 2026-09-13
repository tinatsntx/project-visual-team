# Contributing

Thanks for your interest. This project is in Milestone 0 — the feasibility
gate. Before opening large PRs, check `PROJECT_PLAN.md` and the milestone
gates; work outside the current milestone is likely to be parked.

## Setup

```powershell
npm install
npm run typecheck
npm test
npm run build
```

All four must pass before submitting.

## Non-negotiables for contributions

- No fabricated activity. Every UI state needs provenance (`observed`,
  `reported`, `derived`); derived never claims completion/approval/review.
- No Agents API or new execution infrastructure (ADR-002).
- `record_codex_event` stays append-only and decision-free (ADR-007).
- Metadata-only persistence (ADR-006). Do not add logging of prompts,
  transcripts, commands, code, or tokens.
- Solo-by-default routing; max three visible bots; one writer (ADR-005).
- Accessibility is not optional: every state has text, reduced motion is
  honored, controls are keyboard-reachable.

## Code style

- TypeScript strict mode; Zod for every boundary schema.
- Deterministic, injectable clocks in the state machine and tests.
- Compact, idiomatic code; comments only where the *why* is non-obvious.
