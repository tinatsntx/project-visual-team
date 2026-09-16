# Release readiness

Prepared under `docs/swe-2-brief-010.md`. M4 is **accepted and deployed**
at `0f0e3ab` (coordinator real-native evidence:
`docs/m4-native-closeout.md`, `docs/m4-native-host-evidence.json`).
Statuses below are **complete / prepared / pending** — nothing here claims
participant feedback, legal review, identity clearance, or submission
results.

## Repository materials

| M6 requirement | Status | Where |
| --- | --- | --- |
| Architecture document | complete | `docs/architecture.md` (post-M4: six tools, binding indexes, terminal freeze) |
| Threat model | complete | `docs/security.md` (correlation keys ≠ auth; in-memory-only stores; restart consequences) |
| Privacy model | complete | `docs/privacy.md` (five-field hook allowlist, binding retention, restart loss) |
| Recorded demo | **pending** — script prepared below; coordinator captures the real recording | `docs/m3-shots/` has 13 verified UI stills |
| Installation instructions | complete | `docs/setup.md` §1–3 |
| Self-host instructions | complete | `docs/setup.md` §5 (explicit `plugin/mcp.json` edit; committed file keeps the tested hosted endpoint) |
| Example event replay | complete | `npm run replay -- <fixture>` — `scripts/replay-fixture.mts` + CLI tests |
| Roadmap | complete | `ROADMAP.md` |
| Contribution guide | complete | `CONTRIBUTING.md` |
| Code of conduct | complete | `CODE_OF_CONDUCT.md` |
| Security reporting policy | complete | `SECURITY.md` → private advisories URL (verified enabled 2026-09-15); no SLA invented; non-security contact pending |
| Changelog | complete | `CHANGELOG.md` (M0–M4) |
| Issue templates | complete | bug / feature / truthfulness + `config.yml` contact links |
| ≥5 bounded good first issues | prepared — drafts only, none opened | `docs/good-first-issues.md` (5 drafts) |
| Lint + CI | complete | `npm run lint` (eslint 10.9.1 flat config) wired into `.github/workflows/ci.yml` before typecheck/test/build |

## Synthetic demo script (labeled)

For the coordinator to record — every step is runnable locally with no
host account:

```powershell
npm ci && npm run build
npm run replay -- team-with-permission     # 1. provenance + pending ask
npm run replay -- seq-permission-resume    # 2. permission wait → resume → complete
npm run dev:serve --workspace @visual-team/plugin-ui
# 3. open http://127.0.0.1:8788/dev.html?mode=inline&fixture=team-with-permission
#    show inline → fullscreen (Results + Evidence) → PiP
npm run replay -- --list                   # 4. close on the fixture catalog
```

Narration notes for the recording: fixtures are synthetic; provenance
labels (`observed`/`reported`/`derived`) are shown verbatim; the widget is
a status view, never the deliverable. Do not narrate participant results
or host behavior not shown on screen.

## Submission case inventory (M7 §required materials)

Positive cases — reuse `evals/positive/` (all runnable via the documented
workflow; four have verified local probe coverage):

1. `01-solo-small-change` — solo task, no unnecessary team.
2. `02-research-team` — independent research with a second specialist.
3. `03-build-plus-review` — build then separate review.
4. `04-permission-request` — native permission gating (post-M4: real
   `PermissionRequest` hook coverage).
5. `05-interrupted-resumed` — interrupt + resume (post-M4: `Interrupt` /
   `Stop` wired).

Negative cases — reuse `evals/negative/`:

1. `01-unnecessary-team` — small task must not spawn a team.
2. `02-unsupported-visibility` — surface without widget support degrades
   truthfully.
3. `03-unsafe-shortcut` — visual claims cannot approve/shortcut native
   work.

## Exact submission facts (verified against source, 2026-09-15)

- **Tool annotations** (`apps/mcp-server/src/tools.ts`): all six tools
  declare `destructiveHint: false`, `openWorldHint: false`;
  `get_visual_task` and `render_visual_task` add `readOnlyHint: true`;
  the other four are `readOnlyHint: false` (they append state).
- **UI resource CSP** (`apps/mcp-server/src/ui-resources/widget.ts`):
  `csp.connectDomains: []`, `csp.resourceDomains: []` — the widget makes
  no direct network calls; all data flows over the host postMessage
  bridge. Resource URI `ui://visual-team/task-v1.html`,
  `prefersBorder: true`.
- **Endpoints**: committed `plugin/mcp.json` →
  `https://project-visual-team-mcp.onrender.com/mcp` (tested hosted
  config); localhost dev default `http://localhost:8787/mcp`.
- **Starter prompts** (in `plugin/plugin.json` `defaultPrompt`): "Use
  Visual Team to review my onboarding flow, improve it, and check that
  nothing broke." / "Use Visual Team to compare three approaches and
  recommend one."
- **Screenshot needs**: 13 verified PNGs in `docs/m3-shots/` (inline,
  fullscreen results, PiP, stale, 320 px, enlarged text, both themes,
  long labels, permission need). `plugin.json` `screenshots` is still
  `[]` — coordinator selects finals during submission.
- **npm audit**: `npm audit --omit=dev` → 0 vulnerabilities (coordinator
  verified 2026-09-15).

## Draft release notes (for coordinator review — not published)

> Visual Team shows real ChatGPT/Codex work as a small visual team — who
> is doing what, what needs you, and what is done — without another agent
> platform. Every state carries provenance; the bundled Codex hooks are
> record-only observers that cannot approve, deny, or block actions; and
> the board degrades to honest reported status when hooks are absent.
> Metadata-only by design: there is no automatic capture of prompts,
> transcripts, command text, or code — hooks forward only an allowlist of
> correlation metadata. Task titles, summaries, and result labels are
> caller-provided text; keep them generic and free of sensitive content
> (the privacy model documents this). Alpha quality: single-user,
> in-memory, ~2h retention.

## Pending gates (owner/coordinator — not approximated here)

- M5 private alpha: real participants required; kit prepared, zero data.
- Cleared public name, final logo, verified developer identity, public
  website, support URL, privacy policy, terms — all owner decisions.
- Production HTTPS endpoint, widget domain, authentication decision,
  MCP Inspector pass, plugin review submission.
- Non-security contact route (support/conduct) — no verified address
  exists; tracked above and in `SECURITY.md`.
- Recorded demo capture and GitHub issue creation from the drafts.

## Verification record (clean committed-source export, 2026-09-15)

Run against `git archive HEAD` extracted to a fresh directory — a clean
export, not a pushed clone:

```
npm ci                              ok
npm run lint                        ok (0 problems)
npm run typecheck                   ok
npm test                            ok — 208 tests
npm run build                       ok — widget + dev-host bundles, verbatim embed verified, native compat package generated
npm run verify:native-codex-compat  ok
npm run replay -- team-with-permission   ok — PASS
npm run replay -- seq-permission-resume  ok — PASS
probes: m0 / m1 / m2 / m3 / m4-session-binding / routing / hook-boundary   all exit 0
```
