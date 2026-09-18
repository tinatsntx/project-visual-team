# Project Visual Team

> Visual Team working alpha. The bounded public-name decision and its limits
> are recorded in [the preliminary screen](docs/public-name-screen-2026-09-17.md).

An open-source ChatGPT/Codex plugin that represents real work as a small
visual team — who is doing what, what needs you, and what is done — without
creating another agent platform.

**Status: M0–M4 accepted on the tested path** — including real native
Codex hook coverage and ChatGPT rendering (`docs/m4-codex-integration-acceptance.md`,
coordinator closeout `docs/m4-native-closeout.md`). Read `HANDOFF.md` for
the current supported path and `PROJECT_PLAN.md` for the controlling
specification. `ROADMAP.md` maps each milestone's status.

## Try the sample or run from source

The static sample uses the current widget with clearly labelled, fictional
fixtures. It runs in your browser without a live Codex session or MCP service:

```powershell
npm ci
npm run build:site
npm run preview:site
# open http://127.0.0.1:8789/project-visual-team/
```

For your own live setup, follow the [source-install guide](docs/self-host.md).
Use your own server and ChatGPT developer-app registration. The guided alpha
package below is coordinator-prepared and is not a public self-service
installer. Read the [privacy and alpha limits](docs/privacy.md) before using
live metadata.

## What exists today

- `plugin/` — portable Agent Plugins package (`plugin.json`, `mcp.json`,
  record-only hooks for nine Codex lifecycle events, `visual-team` workflow
  skill, original SVG assets).
- `apps/mcp-server/` — TypeScript MCP state service (Streamable HTTP at
  `/mcp`) with six tools: `start_visual_task`, `report_workflow_step`,
  `record_codex_event`, `get_visual_task`, `finish_visual_task`,
  `render_visual_task`.
- `apps/plugin-ui/` — React 18 UI bundled to a single ESM module: inline
  card, fullscreen view, and PiP on the tested ChatGPT web path.
- `packages/` — shared Zod contracts, the deterministic state machine with
  provenance guards, the Codex event mapper, and replayable test fixtures.

## Local setup (Windows-first)

Prereqs: Node.js 20.19+, 22.13+, or 24+; npm ≥ 10 (the floor is set by the
dev lint toolchain — eslint requires `^20.19.0 || ^22.13.0 || >=24`).

```powershell
npm ci               # install the locked workspace dependencies
npm run typecheck    # strict TS check across the monorepo
npm test             # unit + contract + fixture-replay tests
npm run build        # bundle the UI (esbuild -> apps/plugin-ui/dist)
npm run dev          # start the MCP server on http://localhost:8787/mcp
```

Preview the UI without ChatGPT — `dev.html` is a simulated host: it embeds
the real widget bundle in an iframe, answers `ui/initialize` + `tools/call`
over postMessage, and replays a repo fixture through the real event mapper
and state machine so the widget's live `get_visual_task` polling is exercised:

```powershell
npm run dev:serve --workspace @visual-team/plugin-ui
# open http://127.0.0.1:8788/dev.html  (?mode=inline|fullscreen|pip)
```

Replay a synthetic fixture through the real engine — offline, no host
account, showing provenance on every event:

```powershell
npm run replay -- team-with-permission   # or --list for all fixtures
```

## Testing in ChatGPT / Codex

**Private-alpha participants** use the guided Windows package — see
[setup](docs/setup.md) §1 for Try it → Install → Verify → Recover.
`npm run build:alpha-package` produces the versioned folder
`dist/visual-team-alpha-<pluginVersion>-<sourceSha12>/` with `install.ps1`
(tested-runtime check, integrity verification, conflict-safe CLI
registration), read-only `doctor.ps1`, and an integrity manifest. The
installer never approves hooks — the normal `/hooks` review stays manual.

**Contributors** use the source-checkout path in [setup](docs/setup.md) §2:
attach the registered developer app in ChatGPT, or install the native
Codex package and invoke its skill explicitly. After deploying changed UI
assets, Refresh the developer app and open a fresh ChatGPT chat. The host
tool endpoint and the hook's endpoint (`VISUAL_TEAM_MCP_URL` override, or
the packaged config) must point at the same deployment — the hook has no
implicit localhost fallback.

A [captioned synthetic screenshot walkthrough](docs/demo/index.html) shows
the UI states; [M4 acceptance](docs/m4-native-closeout.md) records the separate
real ChatGPT/native tests.

## Using the workflow

For the installed native workflow, invoke the skill explicitly:

```text
$visual-team Fix the typo in this disposable file and verify the change.
```

Use generic task titles and summaries. Concurrent visual tasks are
session-isolated: a hook event reaches a task only through an observed
binding (the `start_visual_task` receipt binds the Codex `session_id`; a
`SubagentStart` binds the specialist's `agent_id`). Unknown, expired, or
conflicting correlation is rejected rather than guessed onto a task.
Trusted hooks are optional — without them the board still reflects your
`report_workflow_step`/`finish_visual_task` calls with `reported`
provenance. Native work and complete text answers continue when a surface
cannot display the widget. See `docs/m4-codex-integration-acceptance.md`
for the binding design and evidence status.

## Ground rules

- No Agents API, no Codex App Server, no standalone client (ADR-002/003).
- Every visual state carries provenance; derived evidence never claims
  completion, approval, review, or success (ADR-004).
- `record_codex_event` is append-only — it can never approve, deny, or block
  a Codex action (ADR-007).
- Metadata-only storage; no prompts, transcripts, code, or command text
  (ADR-006).

## Contributing

See `CONTRIBUTING.md`. Code is Apache-2.0 (`LICENSE`); the eventual name and
logo are excluded via trademark policy.
