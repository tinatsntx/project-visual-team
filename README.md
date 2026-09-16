# Project Visual Team

> Working codename. Public name TBD after clearance — see `docs/adr/ADR-010.md`.

An open-source ChatGPT/Codex plugin that represents real work as a small
visual team — who is doing what, what needs you, and what is done — without
creating another agent platform.

**Status: M0–M4 accepted on the tested path** — including real native
Codex hook coverage and ChatGPT rendering (`docs/m4-codex-integration-acceptance.md`,
coordinator closeout `docs/m4-native-closeout.md`). Read `HANDOFF.md` for
the current supported path and `PROJECT_PLAN.md` for the controlling
specification. `ROADMAP.md` maps each milestone's status.

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

Prereqs: Node.js ≥ 20, npm ≥ 10.

```powershell
npm install          # install all workspaces
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

1. Start the server (`npm run dev`). For ChatGPT developer mode you need a
   reachable URL — tunnel localhost (e.g. `ngrok http 8787`) or deploy.
2. Register the MCP server in ChatGPT developer mode; copy the
   `plugin_asdk_app...` id into `plugin/.app.json`.
3. Expose `plugin/` through a local marketplace
   (`~/.agents/plugins/marketplace.json` or `.agents/plugins/marketplace.json`)
   and install it from the Plugins Directory. See
   `docs/feasibility-report.md` for the platform matrix to fill in.

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
