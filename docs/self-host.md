# Run Visual Team from source

This path is available now for developers. The instant sample requires no
account. A real ChatGPT/Codex connection requires your own compatible platform
access, MCP server and ChatGPT developer-app registration. This is not a
multi-user hosted service or a one-click install for strangers.

## Prerequisites

- Git, npm 10+, and Node **20.19+ within 20.x, 22.13+ within 22.x, or 24+**.
  Node 22 is used by CI.
- For the native path: Windows. Technical acceptance on September 16 used
  Codex CLI **0.154.0-alpha.6.2**. Newer versions need separate checks. Do not
  assume the version-pinned guided installer accepts another runtime.
- For the embedded live board: ChatGPT web with developer mode and permission
  to register your own MCP app. Availability depends on your account/workspace.
- An HTTPS endpoint reachable by ChatGPT, belonging to your own alpha server.
  Local HTTP is sufficient only for local development and native-only checks.

## 1. Explore locally without a live connection

```powershell
git clone https://github.com/tinatsntx/project-visual-team.git
Set-Location project-visual-team
npm ci
npm run build:site
npm run preview:site
```

Open http://127.0.0.1:8789/project-visual-team/preview/. This replays fictional
fixtures in the current widget entirely in the browser. It does not call the
MCP server, create a native session, or execute a command. The sample's event
provenance is simulated and is labelled as sample data.

## 2. Run your own MCP server

Build the widget, then start the development server in a separate terminal:

```powershell
npm run build --workspace @visual-team/plugin-ui
npm run dev
```

Health: http://localhost:8787/healthz. MCP transport:
http://localhost:8787/mcp. For hosting, use `npm ci` and the widget build as
the build commands, then `npm run start --workspace @visual-team/mcp-server`
as the start command; set the provider's `PORT` as needed. See
[setup.md](setup.md#21-run-the-mcp-server-locally) for configuration.

The alpha server has no authentication or accounts. Use an isolated deployment
for one disposable workflow, with non-sensitive metadata. Do not turn it into
a shared public service. Hosting and platform access can carry their own costs.
Task state is in memory, normally expires after two hours, and disappears on
restart. A restarted server requires a new task; an old native binding cannot
silently recover it.

## 3. Pair your local plugin with your server and app

Before building or installing the native package:

1. In your clone's `plugin/mcp.json`, replace the committed coordinator URL
   under `mcpServers.visual-team.url` with **your** server's `/mcp` endpoint.
2. Register that same HTTPS MCP endpoint in ChatGPT developer mode. Use your
   account's normal registration flow, then copy the issued app identifier.
3. In your clone's `plugin/.app.json`, replace the committed `apps` mapping
   with your own registration: the matching `app-...` map key and
   `asdk_app_...` id value. Preserve `required: true`. Do not reuse the owner's
   developer-app identity. Use the identifiers returned by your registration.
4. If `VISUAL_TEAM_MCP_URL` is set in the native Codex process environment,
   point it at the **same** server. Otherwise leave it unset so the hook uses
   the installed package's MCP config. An old environment override wins over
   the file and can send events to the wrong instance.

These are your local configuration changes, not changes to push upstream.
The coordinator's versioned guided-alpha ZIP is not a self-service bundle for
this route. A locally modified package must not claim the accepted upstream
package's exact identity or validation.

## 4. Build and install the native plugin

Use the actual Codex executable you intend to run, and check its version first.
Do not copy files into the installed plugin cache or bypass hook trust.

```powershell
npm run build:native-codex-compat
npm run verify:native-codex-compat
$visualTeamCodex = 'C:\full\path\to\codex.exe'
& $visualTeamCodex --version
& $visualTeamCodex plugin marketplace add (Resolve-Path '.\dist\native-codex-compat').Path
& $visualTeamCodex plugin add visual-team@visual-team-native
```

Keep the clone/generated marketplace at that location. If a Visual Team
installation already exists, inspect its marketplace and identity first;
follow Codex's supported disable/uninstall flow to resolve a conflict rather
than replacing files. Do not enable duplicate Visual Team plugins against
the same MCP server name.

Open `/hooks` in Codex. Review the nine Visual Team entries and trust them
through the normal UI. Untrusted or missing hooks do not run; the board then
shows reported states only. Full details:
[native-codex-compat.md](native-codex-compat.md).

## 5. Verify a disposable live task

1. Invoke `$visual-team` explicitly with a small non-sensitive task in Codex.
   Keep commands, prompts and secrets out of task titles and summaries.
2. Keep the returned public taskId. Attach **your** registered app in ChatGPT
   and ask it to render that task. Never paste a private capability into chat.
3. Run a harmless native action. Confirm the existing board records fresh
   observed activity, with a timestamp; a changing refresh time alone is not
   hook-delivery evidence.
4. If a real permission is required, answer the original native prompt. The
   board is informational and cannot approve it.
5. Finish only the work actually completed. Report checks honestly; a reported
   pass is not independent review.

After changing hosted code, refresh the registered developer app and use a
fresh ChatGPT conversation. Cached registrations can show older assets.

## Help and removal

Use [GitHub issues](https://github.com/tinatsntx/project-visual-team/issues)
for non-sensitive setup questions. Report security concerns through the
[private advisory form](https://github.com/tinatsntx/project-visual-team/security/advisories/new).
To remove the native integration, disable/uninstall the plugin and remove the
local marketplace using Codex's normal controls, then stop your server.
Read [privacy.md](privacy.md) before using live task metadata.

This guide describes the source route. A separate end-to-end registration on
an unrelated third-party account has not been independently verified.
