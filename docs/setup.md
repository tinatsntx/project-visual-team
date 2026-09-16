# Setup and installation

Two different audiences use this page:

- **Private-alpha participants** use the packaged installer in §1 — no
  source checkout, no manual ChatGPT registration.
- **Contributors / self-hosters** build from source — §2 onward.

## 1. Private alpha — packaged install (participants)

The guided package is a versioned folder
`dist/visual-team-alpha-<pluginVersion>-<sourceSha12>/` (or the `.zip`
alongside it), produced by `npm run build:alpha-package`. Each revision
gets its own directory name, so a new build never silently replaces the
folder an existing install uses as its marketplace source.

Prereqs on the participant machine:

- Codex CLI **0.154.0-alpha.6.2** (the tested runtime — the installer
  checks every candidate it finds and stops on anything else; the desktop
  app's bundled copy under `%LOCALAPPDATA%\OpenAI\Codex\bin\` is
  discovered automatically).
- Node 20.19+, 22.13+, or 24+ on PATH (the record hook runs under it).
- The coordinator prepares ChatGPT developer-app registration — one
  participant at a time, disposable tasks only. This package does not
  register testers and does not provide independent accounts.

### Try it

Keep a disposable Codex task in mind — something reversible and
non-sensitive (task titles and summaries are stored as metadata).

### Install

1. Extract the package folder somewhere stable and keep it — the
   plugin's marketplace source is local, so the folder must remain after
   install.
2. In PowerShell, from the extracted folder:

   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File .\install.ps1
   ```

   If more than one matching codex is found, pick one explicitly:
   `.\install.ps1 -CodexPath "C:\full\path\to\codex.exe"`.

   The installer verifies package integrity, Node, the codex version,
   and the endpoint pairing + service health; reads the CLI's
   marketplace/plugin state before touching anything; stops on any
   conflict rather than replacing an existing install; and re-queries to
   verify the installed identity. It never approves hooks or changes
   trust.
3. In Codex, open `/hooks` and **review + trust the nine
   `record_codex_event` entries** — normal review, one participant at a
   time.
4. Start a task with an explicit `$visual-team <task>` invocation.

### Verify

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\doctor.ps1
```

`doctor.ps1` is read-only: package integrity, Node, codex discovery +
version, packaged endpoint pairing + `/healthz`, any defined
`VISUAL_TEAM_MCP_URL` override (the hook's real destination when set),
and marketplace/plugin state. Passing checks mean the setup is
configured — real hook delivery is proven only by a real task after
`/hooks` trust.

### Recover

- Re-running `install.ps1` is safe: an identical install is a no-op; a
  different package revision or plugin version stops with remediation.
- Follow the `->` guidance lines under any `[FAIL]`.
- To remove: disable/uninstall the plugin in Codex, then remove the
  marketplace registration — the package never removes anything itself.
- Service health failing repeatedly → tell the coordinator. The alpha
  service is single-user and ephemeral; restarts drop all recorded task
  state.

## 2. Contributor / self-host setup (source checkout)

Everything below builds from source. Prereqs: Node.js 20.19+, 22.13+, or
24+ and npm ≥ 10 — the floor is set by the dev lint toolchain (eslint
requires `^20.19.0 || ^22.13.0 || >=24`); the runtime itself needs
nothing newer. CI runs `windows-latest` + Node 22.

### 2.1 Run the MCP server locally

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
| `VISUAL_TEAM_MCP_URL` | unset | hook delivery override (hook process env); when unset the hook uses the installed plugin's packaged MCP config |
| `VISUAL_TEAM_TASK_ID` | unset | hook-side explicit task override (testing) |

The server holds everything in memory: task records, session/agent
correlation bindings, and rate-limit counters all live in one process.
**Each deployment instance has its own tasks, and a restart loses them** —
a resumed Codex session must produce a new `start_visual_task` receipt
before untargeted hook events route again.

### 2.2 Offline checks (no host needed)

```powershell
npm run lint
npm run typecheck
npm test
npm run build
npm run replay -- team-with-permission   # synthetic fixture through the real engine
npm run dev:serve --workspace @visual-team/plugin-ui   # simulated host at 127.0.0.1:8788/dev.html
```

### 2.3 ChatGPT developer app — attach, then Refresh

This is the browser widget path; it is separate from the native Codex
plugin install.

1. Start the server. ChatGPT developer mode needs a reachable URL — tunnel
   localhost (`ngrok http 8787` style) or use a deployed endpoint.
2. Register the MCP server in ChatGPT developer mode and copy the issued
   `asdk_app_...` id into `plugin/.app.json` (the committed file carries
   the M0 developer app's id — replace it for your own app).
3. Attach the registered app to a chat, then ask for visual task tracking;
   the app renders the widget
   inline. `render_visual_task` mounts it; routine updates flow over the
   host bridge.
4. **After any deployment of new UI/server code, refresh the developer
   app** in ChatGPT settings (developer apps cache the MCP registration
   and widget resource) — then start a **fresh chat** so the session loads
   current assets. Skipping this is the usual cause of stale widgets.

Note (2026-09-15): the Visual Team M0 developer app has **no widget domain
and no authentication**; production submission remains pending.

### 2.4 Windows native Codex install and trust (from source)

The pinned loaders (Codex CLI 0.149.0 / desktop-bundled
0.154.0-alpha.6.2) use the Legacy install root produced by
`npm run build:native-codex-compat` — full flow and verification in
`docs/native-codex-compat.md`. The participant path above uses the same
artifact wrapped by `npm run build:alpha-package` (installer + doctor +
integrity manifest).

```powershell
npm run build:native-codex-compat
npm run verify:native-codex-compat
$codex = '<current codex.exe path>'   # e.g. %LOCALAPPDATA%\OpenAI\Codex\bin\<build>\codex.exe
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
`plugin/mcp.json`'s `url` is where the host calls the MCP tools; the hook
posts events to `VISUAL_TEAM_MCP_URL` (Codex process env) when it is set,
otherwise to the packaged config installed beside the hook (`.mcp.json`,
then `mcp.json`). There is no implicit localhost fallback — a missing or
invalid endpoint records nothing. For local dev, change the committed
hosted URL in `plugin/mcp.json` to localhost before building the local
package; a hosted run sets `VISUAL_TEAM_MCP_URL` per process so hook
events reach the same endpoint the host tools use.

### 2.5 Self-hosting / pointing at your own server

The committed `plugin/mcp.json` points at the tested hosted endpoint
(`https://project-visual-team-mcp.onrender.com/mcp`). To self-host, edit
that `url` to your own HTTPS endpoint **before** building or installing the
package — the compat build copies it verbatim (translating only the
`streamable-http` → `http` transport spelling). The commit carries the
tested hosted configuration deliberately; a self-host edit is a local
change, not something the repo rewrites for you.

- The hook script targets `VISUAL_TEAM_MCP_URL` (process env) when
  defined, else the packaged config — no implicit default.
- Production submission requires a public **HTTPS** endpoint (M7); local
  HTTP is development-only.
- Sites migration: as of 2026-09-15 the Sites port is **blocked by the
  Site owner's MCP switch** (`SitesConnectorError: Sites MCP is not
  enabled for this Site owner.` — `docs/sites-acceptance.md`). This is a
  dated observation, not a permanent limit.

## 3. What does not exist yet

No database, accounts, auth, multi-device history, or widget domain —
single-user alpha by design (ADR-006). No cleared public name, verified
developer identity, or submitted listing (M7 pending). The alpha package
does not make participants self-sufficient: registration and review are
coordinator-prepared, one participant at a time.
