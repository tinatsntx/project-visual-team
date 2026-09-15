# Brief 004 acceptance — real native event and ChatGPT recovery pass

Coordinator run: 2026-09-14, 23:38–23:49 UTC.
Reviewed and deployed SHA: `d39e5e3d9c096caf742aa29af9d39c55aa59dcae`.

## Result

The bounded startup/recovery acceptance passes on ChatGPT web with this Pro
account: create through Codex, render/read in ChatGPT, observe one automatic
native hook event in the existing widget, and recover the same widget after
controlled read failures. This closes M0 criterion 6 on the tested web/CLI path.
It does not close all M0 criteria or certify other platforms.

## Code, checks, and deployment

- Coordinator reran typecheck, 71/71 tests, configured-tree compatibility and
  Windows installed-root launch verification, build, and whitespace checks: pass.
- Clean committed-source plugin/scripts export compatibility verification: pass.
- All six original coordinator probe outcomes now match their expected behavior.
- Widget 159.9 KB; dev host 462.6 KB; CSS 3.6 KB.
- Rebuilt browser harness: failed retry retained 18:38:46 CT as the confirmation
  time; rejected `ui/message` showed static guidance; changing read mode to ok
  and retrying at 23:39:14 UTC restored the same widget without initialization
  or iframe reload. This part is explicitly synthetic.
- Pushed the reviewed commit to GitHub `main`; remote SHA readback matched.
- Render auto-deploy is off. Explicit deploy `dep-dak8bf5g1s2s73bchk2g` went live
  at `2026-09-14T23:40:18.006687Z` on service `srv-dak13nmk1f9s73ajm0dg`.
- Health returned `ok:true`. The hosted MCP UI resource exactly matches local
  `uiResourceContents()` output: 167631 UTF-8 bytes, declared CSP domain lists
  empty. This comparison is with server-generated HTML, not the raw JS bundle;
  a separate pre-existing inlining issue is recorded below.
- Refreshed Visual Team M0 through normal ChatGPT app management and used a
  fresh standard Chat conversation (Chat selected, model shown as 6 Pro).
- **GitHub CI failed:** [run 34909845559](https://github.com/tinatsntx/project-visual-team/actions/runs/34909845559)
  passed 70/71 tests; the transport test fails at line 86 before the build step.
  CI runs test before build; its render assertion requires an existing widget
  bundle. Locally forcing the bundle path to a nonexistent fixture reproduces
  the identical undefined-task assertion. The transport test last changed in
  `0446a77`. Render builds before running tests, so its passing build does not
  resolve the clean-checkout CI failure.

## Native action -> existing ChatGPT widget

- [QA conversation: Render existing task](https://chatgpt.com/c/6aa88689-1114-83ea-aef7-ae10731d5c0c).
- Fresh task `vt_1981d9b116e79e0aecc38440`, created through Codex's installed
  Visual Team MCP at `2026-09-14T23:41:13.970Z`; initial eventCount 1.
  Title: `Native widget acceptance d39e5e3`. Synthetic task metadata only.
- ChatGPT invoked the existing read-only render tool once. The board initialized
  with Alex assigned and PLANNING. Details were opened before the native action;
  only the reported task-start event was visible.
- Native CLI `0.154.0-alpha.6.2`, session
  `01a0a24e-0e41-70d3-a29c-a58551ef669a` (`Execute native date-time check`).
  Process-local environment pinned Render and this task. Normal `/hooks`
  readback showed PostToolUse installed 1 / active 1; no trust bypass or
  reinstallation. The corrected package remains `0.1.0+codex.20260914192637`.
- Exactly one native shell call printed the current date, 18:44:37 CT. It did
  not read files, invoke an MCP tool, manually run a hook, or record an event.
- The existing ChatGPT widget added **Finished a step.**, `activity`, `observed`,
  `6:44:37 PM`, `tool: Bash`. The details panel remained expanded. No reload,
  manual event injection, or second ChatGPT render was used to observe it.
- A subsequent independent read-only backend check confirmed eventCount 2,
  event `hook_1789429477625_rxkfy0eg`, timestamp
  `2026-09-14T23:44:37.624Z`. Task stayed PLANNING; activity did not claim success
  or task completion. That backend inspection did not replace the ChatGPT view.
- Native CLI exited normally. Its process-local environment overrides ended.
  No reset credit was used and the existing model preference was preserved.

## Display and controlled real-host recovery

- Open team and Back to chat both worked after the native event. Fullscreen
  showed the same event, truthful ownership wording, and readable dark colors.
  No precise mode-transition or refresh latency claim is made for this run.
- Opened details inline and temporarily blocked only this test tab's observed
  `https://chatgpt.com/backend-api/ecosystem/call_mcp` request path using scoped
  browser network controls. No production service, credential, task, hook, or
  account setting was changed.
- The real widget displayed `Live updates paused` with last-confirmed time
  **18:46:50 CT**, retained both events and the open details panel, and exposed
  Try again plus Ask ChatGPT to render it again.
- Retry while requests were blocked left the confirmation time unchanged.
- Removed the request block and retried. The stale banner cleared in the same
  mounted widget; both events and the expanded details remained. This proves
  real-host recovery from a controlled connection failure, not actual TTL expiry.
- Removed all test blocking rules and disabled temporary network inspection.
- Normal settings UI readback confirmed Developer mode ON and Enforce CSP in
  developer mode ON. Neither setting was changed during this run.
- The accepted QA conversation is left open. Its task is ephemeral (2h TTL), so
  later expiry/restart may require a fresh test task.

## Remaining work and limitations

SWE-2's next bounded work is `docs/swe-2-brief-005.md`: fix clean-checkout test
setup and preserve literal JS/CSS when composing the MCP resource. The current
resource builder uses string replacement, which rewrites 22 `$$` occurrences
and two `$&` occurrences in this bundle, leaving two `%%BUNDLE%%` strings in
served JavaScript. The hosted resource and local builder both reproduce this.
The tested widget works, so this is not claimed as the earlier hang's cause.

Pro's ask-render host-message path was not invoked in this real conversation;
rejection guidance was verified in the harness. Real-host expiry and terminal
display-mode behavior, PiP decision/test, skill workflow, and the remaining
desktop/mobile/Codex GUI rows remain pending. Sites migration remains paused.
Do not promote the whole M0 gate while these requirements and CI remain open.
