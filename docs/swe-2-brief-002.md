# SWE-2 brief 002: fix four findings from real ChatGPT testing

Date: 2026-09-14. Scope: Milestone 0 only.

## Working arrangement

SWE-2 owns code. Codex reviews, deploys on Render, and tests ChatGPT.
Owner relays brief/results. Read HANDOFF, AGENTS, and PROJECT_PLAN first.
Preserve coordinator app/deployment configuration and evidence documents.

## Verified baseline

Code `0446a7715bf79b0d9858c3060dcc5e2d56a2a664` is deployed. Typecheck,
34 tests, builds pass; widget JS 151.0 KB.

Brief 001 works on real ChatGPT web: fresh widget initializes and private
metadata reads update it. It passes with **Enforce CSP in developer mode ON**.
Do not redesign the working transport.

Coordinator configured hosted MCP, registered Visual Team M0, and installed
the portable package locally. Automatic native hook delivery remains untested.

## 1. Writer ownership falsely claims activity

Observed in ChatGPT fullscreen: PLANNING task, Alex ASSIGNED, team text
"Alex is assigned", but Workstreams says "Alex owns the lead track and is writing."

`apps/plugin-ui/src/modes/FullscreenView.tsx` appends "and is writing" whenever
`w.isWriter` is true. Ownership is not evidence of current writing.

Describe supported ownership/state only. Do not invent a writing signal or
infer it from ownership, time, or generic tool events. Assigned, waiting, and
terminal workers must not claim ongoing writing. Preserve provenance rules.

## 2. Dark-theme text is difficult to read

Observed in ChatGPT dark theme: secondary status, headings, role/state text,
and evidence metadata are very dim. `apps/plugin-ui/src/styles.css` mixes
Canvas/CanvasText with fixed light-theme tokens such as `#57606a`.

Use host-compatible light/dark colors with accessible contrast, including
badges and focus indicators. Check actual foreground/background pairs and
report representative measured ratios; screenshots alone do not prove WCAG
compliance. Keep existing layout, fonts, and compact bundle. No redesign.

## 3. Display modes depend on task polling

Observed: Open team changes host chrome immediately but internal layout stays
inline until a later data poll; return can likewise lag.

`App.tsx` reads `hostBridge.currentDisplayMode()` during render. The bridge
does not notify React of accepted mode changes. `useVisualTask.ts` stops
polling for terminal tasks.

Make accepted host mode changes independently reactive through documented
responses/notifications, including host-initiated changes. Actual host mode
is authoritative. Do not assume requests succeed or add data reads to force
layout. Preserve terminal polling stop and private metadata.

Terminal-task failure is a **source-based inference**, not a real ChatGPT
observation yet. Cover switching both ways with polling stopped, initial
async host context, and rejected/unsupported requests.
The dev host currently reloads the iframe on mode changes; provide a test
path that exposes this regression without masking it through reloads.
Use current official bridge docs; do not guess event names.

## 4. Harness claims rejected completion succeeded

Observed in rebuilt permission fixture: reducer rejects WAITING_FOR_USER ->
COMPLETED. Widget correctly waits/polls, but harness logs:
"codex -> task_finished (observed) — terminal state; widget stops polling".

In `apps/plugin-ui/src/dev/devHost.ts`, `injectVisualEvent` discards the reducer
result and `tick` logs terminal success unconditionally.

Reflect the actual accepted/rejected state in diagnostics. Identify synthetic
completion as harness activity; do not imply native Codex completion.
Do not auto-approve/bypass waiting to make the demo finish.
Retain solo fixture's accepted completion and verify polling stops.

## Acceptance and return

- Fix all four; preserve render shape, capability-only private metadata, shared
  result builder, and fail-safe reads.
- Focused useful regression tests for mode reactivity/truthful status.
  Avoid unrelated coverage or CSS assertions that merely mirror implementation.
- Run `npm run typecheck`, `npm test`, `npm run build`, and
  `git diff --check`; report test count and bundle sizes.
- Recheck rebuilt harness: assigned/waiting/terminal wording; light/dark
  contrast; modes without reload/poll dependence; both completion outcomes.
- Return changed files, explanation, evidence, remaining gaps, commit SHA.
  Separate simulation from actual platform evidence.
- Do not change Render, account settings, credentials, hook trust, deployment,
  or release state. Codex handles those.
- No model APIs, App Server, persistence, accounts, workflow features, or
  later-milestone UI. Do not mark M0 complete.

Coordinator reviews/deploys accepted code and repeats real ChatGPT tests with
CSP on. Automatic native hook testing remains a separate gate; synthetic
fixtures cannot satisfy it.
