# Setup and installation

Verified on Windows from a clean committed-source export (see
`docs/release-readiness.md` for the exact verification run). Prereqs:
Node.js 20.19+, 22.13+, or 24+ and npm ≥ 10 — the floor is set by the dev
lint toolchain (eslint requires `^20.19.0 || ^22.13.0 || >=24`); the
runtime itself needs nothing newer. CI runs `windows-latest` + Node 22.

## 1. Run the MCP server locally

```powershell
npm ci
npm run build        # bundles the widget + native compat package
npm run dev          # serves http://localhost:8787/mcp
```

Health check: `GET http://localhost:8787/healthz` →
`{"ok":true,"service":"visual-team-mcp"}`.

Configuration (all optional, process-local):

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `8787` | listen port |
| `VISUAL_TEAM_TTL_MS` | `7200000` (2h) | task retention sweep; acceptance/testing only |
| `VISUAL_TEAM_UI_BUNDLE` | `apps/plugin-ui/dist/visual-team.js` | widget bundle path |
| `VISUAL_TEAM_MCP_URL` | `http://localhost:8787/mcp` | hook delivery target (hook process env) |
| `VISUAL_TEAM_TASK_ID` | unset | hook-side explicit task override (testing) |

The server holds everything in memory: task records, session/agent
correlation bindings, and rate-limit counters all live in one process.
**Each deployment instance has its own tasks, and a restart loses them** —
a resumed Codex session must produce a new `start_visual_task` receipt
before untargeted hook events route again.

## 2. Offline checks (no host needed)

```powershell
npm run lint
npm run typecheck
npm test
npm run build
npm run replay -- team-with-permission   # synthetic fixture through the real engine
npm run dev:serve --workspace @visual-team/plugin-ui   # simulated host at 127.0.0.1:8788/dev.html
```

## 3. ChatGPT developer app — attach, then Refresh

This is the browser widget path; it is separate from the native Codex
plugin install in §4.

1. Start the server. ChatGPT developer mode needs a reachable URL — tunnel
   localhost (`ngrok http 8787` style) or use a deployed endpoint.
2. Register the MCP server in ChatGPT developer mode and copy the issued
   `asdk_app_...` id into `plugin/.app.json` (the committed file carries
   the M0 developer app's id — replace it for your own app).
3. In a chat, ask for visual task tracking; the app renders the widget
   inline. `render_visual_task` mounts it; routine updates flow over the
   host bridge.
4. **After any deployment of new UI/server code, refresh the developer
   app** in ChatGPT settings (developer apps cache the MCP registration
   and widget resource) — then start a **fresh chat** so the session loads
   current assets. Skipping this is the usual cause of stale widgets.

Note (2026-09-15): the Visual Team M0 developer app has **no widget domain
and no authentication**; production submission remains pending.

## 4. Windows native Codex install and trust

The pinned loaders (Codex CLI 0.149.0 / desktop-bundled
0.154.0-alpha.6.2) use the Legacy install root produced by
`npm run build:native-codex-compat` — full flow and verification in
`docs/native-codex-compat.md`:

```powershell
npm run build:native-codex-compat
npm run verify:native-codex-compat
$codex = '<current codex.exe path>'   # e.g. %LOCALAPPDATA%\OpenAI\Codex\bin\<hash>\codex.exe
& $codex plugin marketplace add (Resolve-Path '.\dist\native-codex-compat').Path
& $codex plugin add visual-team@visual-team-native
```

Then open `/hooks` in Codex, **review the nine Visual Team hook entries**,
and trust them normally — never bypass trust, never copy files into the
installed cache. Untrusted hooks simply don't run; the board then reflects
model-reported states only.

Native work uses the bundled skill: invoke `$visual-team <task>`
explicitly. There is no ChatGPT app involvement in this path — the skill
drives `start_visual_task`/reported steps, and trusted hooks deliver
observed lifecycle events.

**URL pairing.** Two settings must point at the *same* server for a run:
`plugin/mcp.json`'s `url` is where the host calls the MCP tools;
`VISUAL_TEAM_MCP_URL` (Codex process env) is where the hook script posts
events. Local dev can leave both at their localhost defaults; a hosted run
must set the env override so hook events reach the same endpoint the host
tools use.

## 5. Self-hosting / pointing at your own server

The committed `plugin/mcp.json` points at the tested hosted endpoint
(`https://project-visual-team-mcp.onrender.com/mcp`). To self-host, edit
that `url` to your own HTTPS endpoint **before** building or installing the
package — the compat build copies it verbatim (translating only the
`streamable-http` → `http` transport spelling). The commit carries the
tested hosted configuration deliberately; a self-host edit is a local
change, not something the repo rewrites for you.

- The hook script targets `VISUAL_TEAM_MCP_URL` (process env), defaulting
  to localhost — set it per process to match your server.
- Production submission requires a public **HTTPS** endpoint (M7); local
  HTTP is development-only.
- Sites migration: as of 2026-09-15 the Sites port is **blocked by the
  Site owner's MCP switch** (`SitesConnectorError: Sites MCP is not
  enabled for this Site owner.` — `docs/sites-acceptance.md`). This is a
  dated observation, not a permanent limit.

## 6. What does not exist yet

No database, accounts, auth, multi-device history, or widget domain —
single-user alpha by design (ADR-006). No cleared public name, verified
developer identity, or submitted listing (M7 pending).
