# SWE-2 brief 013: public sample and source-install launch path

Owner-approved scope, 2026-09-17. Target a reviewed build tonight by 21:30
America/Chicago. Read HANDOFF.md, AGENTS.md and PROJECT_PLAN.md first.

Execution note: the Devin native window was unavailable to this session's
controls. The coordinator prepared and implemented the reversible static-site
portion locally while awaiting owner availability. No delegation occurred;
the accepted product engine was not changed. This file retains the bounded
implementation scope rather than claiming delivery to SWE-2.

## Result

An immediately usable static launch site for a working open-source alpha, at
https://tinatsntx.github.io/project-visual-team/. Visitors explore the real
widget against local sample fixtures and can follow self-host instructions.
No new runtime features, shared alpha accounts, directory submission, or
claims of independent product verification.

## Implementation ownership

Own `site/`, `scripts/build-site.mjs`, `.github/workflows/pages.yml`, the
`build:site` package script, and `docs/self-host.md`. Coordinate other changes
before editing. Codex owns name screening, launch copy, real recording,
gallery assets, publication, and acceptance. Do not push, deploy, or open a PR.
Do not create fake evidence, real tasks, or call MCP event tools.

## Site requirements

- Clear, responsive, keyboard-accessible page: Visual Team; “See what needs
  you while Codex works”; working alpha, Apache-2.0 open source.
- Actions: Explore sample, Watch real demo, Run from source. Link demo only
  after a real recording is supplied; no synthetic video presented as live.
- Sample uses the current widget and existing fixture engine, entirely in
  the browser. Reuse the existing dev-host bundle and widget rather than
  reimplementing product behavior. Simplify the surrounding developer chrome.
- Persistent label: “Sample data — no live Codex session”. Offer activity,
  approval-needed, and reported-result scenarios, using existing fixtures.
  Clearly explain that approvals happen in Codex, never on this board.
- No requests to the shared hosted MCP endpoint. No analytics or trackers.
  No prompts, command text, code content, real task ids, private capabilities,
  or user-session material in the build.
- Strong focus styles; usable at 360px; reduced-motion respected. No new
  animation or external font/dependency needed.
- Describe supported Windows Codex CLI 0.154.0-alpha.6.2 + ChatGPT web path,
  developer-mode prerequisites, single-user/ephemeral alpha limitations.
- Feedback: GitHub issues; security: existing private advisory link.
- Source-install docs must direct users to their own server and ChatGPT
  developer-app registration. Replace BOTH the owner app key and issued app
  id in the local clone; replace plugin/mcp.json endpoint before native build.
  Never instruct a stranger to use the shared alpha endpoint or distribute
  the coordinator-bound alpha installer as a self-service package.
- Point to exact existing manual native install and normal nine-hook trust
  flow. Distinguish local source run from full independent hosted setup.

## Safe build and Pages

- `npm run build:site` builds necessary UI bundles and stages only explicitly
  allowlisted website files into `dist/site/`. Never copy all `dist/`, profiles,
  logs, native packages, caches, host evidence, or the whole repository.
- Paths must work at the repository Pages base path, not just `/`.
- Workflow builds with npm ci and uploads ONLY dist/site as Pages artifact.
  Use GitHub's official configure/upload/deploy Pages actions and least
  privileges. Publication remains with coordinator after review.
- A source tag/release is coordinator-owned after validation. Do not invent
  a download URL or show a nonexistent release as available.

## Return

Return changed files, build commands, honest checks and unresolved issues.
Run lint, typecheck, test and build; retain widget + dev-host outputs. Include
a small meaningful validation of staging/no-live-endpoint behavior if needed.
Do not broaden coverage or alter the accepted product engine.
