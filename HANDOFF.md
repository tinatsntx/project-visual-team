# Handoff — Project Visual Team

**Date:** 2026-09-14
**Repo:** https://github.com/tinatsntx/project-visual-team (public, default branch `main`)
**Milestone:** 0 — Platform feasibility proof. Skeleton is built and every
locally-verifiable link is proven. The only remaining gate item is testing
on real ChatGPT/Codex surfaces.

`PROJECT_PLAN.md` is the controlling specification. `docs/feasibility-report.md`
is the live gate document — fill in its platform matrix as surfaces are tested.

## Current state

- Monorepo, npm workspaces, TypeScript strict, Node ≥ 20. Windows-first dev.
- `plugin/` — portable plugin package (manifest, `mcp.json`, PostToolUse hook,
  `visual-team` skill stub, assets). `plugin/.app.json` is an empty
  `{"apps": {}}` placeholder awaiting the ChatGPT app id.
- `apps/mcp-server/` — stateless Streamable HTTP MCP service at `/mcp` with the
  four M0 tools; in-memory repo with capability tokens + 2h TTL.
- `apps/plugin-ui/` — React 18 widget (inline / fullscreen / PiP-flagged),
  bundled to a single ESM module that the server inlines into the MCP Apps
  HTML resource with a bridge-only CSP (`connectDomains: []`).
- `packages/` — Zod contracts, deterministic state machine with provenance
  guards, Codex event mapper, replayable fixtures.
- `apps/plugin-ui/dev.html` — **simulated host**: embeds the real widget in an
  iframe and answers the `ui/*` + `tools/call` bridge over postMessage while
  replaying fixtures through the real mapper + reducer.

## Verified (see feasibility report for detail)

- 32/32 unit + fixture-replay tests; typecheck clean.
- Dev harness: real bridge round-trips, live 4s `get_visual_task` polling,
  needsUser surfacing, terminal-state stop, inline + fullscreen render.
- Server over real HTTP: all four tools, capability guard, UI resource with
  inlined bundle + CSP.
- Real bundled hook → real server: event lands, payload allowlist strips
  non-correlation fields, always exit 0.

## What remains: the platform matrix (M0 gate)

Each matrix row needs a real surface. Fill results into
`docs/feasibility-report.md` and cases into `evals/platform-matrix.md`.

### Setup

```powershell
npm install
npm run build                                        # UI + dev-host bundles
npm start --workspace @visual-team/mcp-server        # http://localhost:8787/mcp
```

### ChatGPT (web / desktop / mobile)

1. Tunnel the server: `ngrok http 8787` (or deploy). Update
   `plugin/mcp.json` to the reachable URL if needed.
2. Register the MCP server in ChatGPT developer mode; copy the
   `plugin_asdk_app...` id into `plugin/.app.json`.
3. Expose `plugin/` via a local marketplace
   (`~/.agents/plugins/marketplace.json` or `.agents/plugins/marketplace.json`)
   and install from the Plugins Directory.
4. Per row, check: plugin installs + invokes without source edits → inline
   iframe mounts → expand to fullscreen → PiP → live refresh during work →
   headless text when UI unavailable.

### Codex (desktop app / CLI)

1. Install the plugin locally (marketplace as above). Web installs do **not**
   deploy hook scripts — hooks need a local install (plan §10).
2. Confirm `hooks.json` PostToolUse → `hooks/record_codex_event.mjs` fires;
   the hook posts to `VISUAL_TEAM_MCP_URL` (default `http://localhost:8787/mcp`)
   and correlates via `VISUAL_TEAM_TASK_ID` or most-recent-active task.
3. Check: at least one real Codex lifecycle event reaches the task view;
   useful text output with no custom UI (Codex CLI row).

### Decision rules (plan §14)

- Codex events can't reach the service → ship ChatGPT-only visual mode, keep
  Codex headless.
- PiP unreliable → inline + fullscreen only (flag already exists).
- No live refresh possible → stop the live-team concept. Do not fake it.
- Separate App Server client required → stop; new product decision first.

## Non-negotiable invariants

- `record_codex_event` is append-only — never approve/deny/block (ADR-007).
- Provenance on every state; derived evidence never claims completion,
  approval, review, or success (ADR-004).
- Metadata-only: no prompts, transcripts, commands, or code stored or
  transported (ADR-006). Hook stdin payload is allowlist-filtered.
- Capability token travels in `_meta` only — never in `content`,
  `structuredContent`, or logs.
- Missing evidence degrades to model-reported status, never fabricated.

## Commands

```powershell
npm run typecheck    # strict TS across the monorepo
npm test             # unit + contract + fixture-replay (32 tests)
npm run build        # widget bundle + dev-host bundle -> apps/plugin-ui/dist
npm start --workspace @visual-team/mcp-server   # real server :8787
npm run dev:serve --workspace @visual-team/plugin-ui  # harness :8788/dev.html
```

Harness params: `?mode=inline|fullscreen|pip`,
`?fixture=team-with-permission|solo-posttooluse`.

## Gotchas

- esbuild `--serve`/`--watch` exit when stdin closes → use
  `apps/plugin-ui/serve.mjs` (`npm run dev:serve`) for detached runs.
- Git Bash `/tmp` is not visible to Node's `fs` — use workspace-relative temp
  files in scripts.
- No global git identity is configured; prior commits used inline
  `-c user.name/-c user.email`.

## File map

- `PROJECT_PLAN.md` — controlling spec (§14 milestones/gates, §7.4 refresh).
- `docs/feasibility-report.md` — gate matrix + verification log.
- `docs/adr/` — ADR-001…010 (architecture decisions).
- `docs/architecture.md`, `docs/privacy.md`, `docs/security.md`.
- `evals/platform-matrix.md` — planned eval cases (positive/negative).
- `packages/test-fixtures/fixtures/` — replayable event scenarios.
