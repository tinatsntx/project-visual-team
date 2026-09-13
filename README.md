# Project Visual Team

> Working codename. Public name TBD after clearance — see `docs/adr/ADR-010.md`.

An open-source ChatGPT/Codex plugin that represents real work as a small
visual team — who is doing what, what needs you, and what is done — without
creating another agent platform.

**Status: Milestone 0 (feasibility skeleton).** The plan's hard gate is in
`docs/feasibility-report.md`. Read `PROJECT_PLAN.md` first — it is the
controlling specification.

## What exists today

- `plugin/` — portable Agent Plugins package (`plugin.json`, `mcp.json`,
  bundled `PostToolUse` hook, `visual-team` skill stub, original SVG assets).
- `apps/mcp-server/` — TypeScript MCP state service (Streamable HTTP at
  `/mcp`) with the four M0 tools: `start_visual_task`, `record_codex_event`,
  `get_visual_task`, `render_visual_task`.
- `apps/plugin-ui/` — React 18 UI bundled to a single ESM module: inline
  card, fullscreen view, PiP behind a feature flag.
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

Preview the UI without ChatGPT:

```powershell
npm run dev:serve --workspace @visual-team/plugin-ui
# open http://127.0.0.1:8788/dev.html
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
