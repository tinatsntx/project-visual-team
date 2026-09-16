# Native Codex compatibility package

## Purpose and scope

`plugin/` remains the single editable portable Agent Plugins source. The
tested native Codex loaders in CLI 0.149.0 and desktop-bundled
0.154.0-alpha.6.2 skip plugin apps and hooks after selecting an AgentPlugin
root manifest. `npm run build:native-codex-compat` creates a separate Legacy
install root for those loaders instead.

The generated root intentionally does **not** contain `plugin.json` or
`mcp.json`. This prevents the portable manifest from selecting the AgentPlugin
loader. It is local packaging evidence, not evidence that a native hook was
discovered, reviewed, trusted, executed, or delivered an event.

## Source-to-distribution flow

| Portable source | Generated Legacy artifact |
| --- | --- |
| `plugin/plugin.json` metadata and `extensions.com.openai.interface` | `.codex-plugin/plugin.json` |
| `plugin/mcp.json` `mcpServers` (`streamable-http` is translated to Legacy `http`) | `.mcp.json` |
| `plugin/.app.json` | `.app.json` |
| `plugin/hooks/` (the whole directory, including hook scripts) | `hooks/` |
| `plugin/hooks/hooks.json` | `hooks/hooks.json` and root `hooks.json` |
| `plugin/skills/`, `plugin/assets/` | `skills/`, `assets/` |

The generated artifact root is:

```text
dist/native-codex-compat/visual-team
```

It is regenerated from workspace source on every build. Do not edit it or an
installed Codex cache. The build also creates a marketplace envelope at
`dist/native-codex-compat/.agents/plugins/marketplace.json`, whose local source
is the generated `visual-team` root. Using that envelope keeps this package
separate from the portable `visual-team@personal` installation.

## Reproduce and verify

From the repository root on Windows:

```powershell
npm ci
npm run build:native-codex-compat
npm run verify:native-codex-compat
$artifactRoot = (Resolve-Path '.\dist\native-codex-compat\visual-team').Path
$artifactRoot
```

For the pinned desktop-bundled Codex 0.154.0-alpha.6.2, a coordinator can
install the generated package through the supported marketplace flow:

```powershell
$codex = 'C:\Users\mstin\AppData\Local\OpenAI\Codex\bin\bffc5354119c8421\codex.exe'
$marketplaceRoot = (Resolve-Path '.\dist\native-codex-compat').Path
& $codex plugin marketplace add $marketplaceRoot
& $codex plugin add visual-team@visual-team-native
```

Use the equivalent current executable if the desktop app has updated. This
only installs the package; the coordinator must still review and trust the
discovered hook normally. Do not copy files into Codex's installed cache.

Before native acceptance, disable (or do not simultaneously enable)
`visual-team@personal`. Two enabled Visual Team plugins would register the
same MCP server name and could double-deliver hook events, contaminating the
event-count observation.

The artifact preserves the configured `visual-team` MCP URL and the app
mapping from the portable source without rewriting either. Its Legacy
`.mcp.json` translates only the portable `streamable-http` transport spelling
to `http`; the editable `plugin/mcp.json` remains unchanged. Static
verification checks that the Legacy entry point is selected, every
declared/configured resource is present, and copied MCP, app, skill, asset,
and hook inputs match their source where they are not intentionally
transformed. The source URL may carry the documented localhost development
default or the hosted M0 endpoint; setting `VISUAL_TEAM_ACCEPTANCE_MCP_URL`
pins one exact endpoint for a configured acceptance run.

The Legacy manifest explicitly declares `hooks: "./hooks/hooks.json"`, the
deterministic path for the pinned loaders. The full `hooks/` copy also covers
that loader default when a hook path is absent, while the root `hooks.json`
copy is deliberate version-drift insurance for real-plugin conventions on
native versions we have not traced. `hooks/hooks.json` wires the nine
contract-supported events (`SessionStart`, `UserPromptSubmit`,
`SubagentStart`, `PreToolUse`, `PostToolUse`, `PermissionRequest`,
`SubagentStop`, `Stop`, `Interrupt`), each as
`node "${PLUGIN_ROOT}/hooks/record_codex_event.mjs" <EventName>` with a
match-all regex matcher, `async: true`, and a bounded `timeout`. The pinned
loader substitutes `${PLUGIN_ROOT}` with the installed plugin root before
launch, so the command resolves inside the package regardless of the task
working directory; double quotes keep it valid when the installed root
contains spaces. The verifier replays that substitution against a spaced
install root from an unrelated cwd and confirms each event's allowlisted
payload reaches a stub endpoint — a local regression check only. Actual
Windows native execution and delivery remain a coordinator acceptance test;
this packaging evidence does not claim them.

After installation, follow `docs/native-acceptance.md`: inspect `/hooks`,
review and trust only the Visual Team hook through the normal Codex UI, run the
bounded real action, and observe the existing ChatGPT panel. No synthetic
stdin test or package check satisfies that delivery gate.
