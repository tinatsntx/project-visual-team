# Native plugin and hook acceptance — automatic delivery into ChatGPT passes

Prepared by the coordinator, 2026-09-14, after accepting/deploying `31d4165`.
Latest run: 2026-09-15, deployed `4fb3548`, refreshed installed skill workflow
and automatic hook pass. Earlier `d39e5e3` proves a real native PostToolUse
reaches the existing embedded ChatGPT widget.
M0 criterion 6 passes on this tested native CLI -> ChatGPT web path. M0 is
now closed for that supported path; broader platform compatibility remains
unverified. See `docs/m0-closeout.md`.

## Installed skill workflow (4fb3548, 2026-09-15, 13:31–13:35 UTC)

Supported refresh installs cache `visual-team-native/visual-team/0.1.0`;
skill, hook declaration, and script match source. Personal duplicate remains
disabled. Normal `/hooks` shows installed 1 / active 1, existing trust retained.
Native session `01a0a541-32ef-7f02-816e-1acec5d149dc` runs the installed skill:
start/render, reported testing, one native date action, truthful reported
completion and readable render. Task `vt_24d111a38068a994393527e1` ends completed
at eventCount 7; final verification is retained. Automatic observed Bash hook
`hook_1789479307039_pck2myjd` arrives `2026-09-15T13:35:07.038Z`.

Only this native process had the hosted endpoint override; correlation used
the single fresh most-recent active task. The process exited normally. No
manual hook or event injection, source edits, or trust bypass occurred.
Fresh ChatGPT renders the completed task and these events afterward; terminal
fullscreen/return/host Close and PiP/return pass. This run mounted the widget
after completion and does not repeat the prior same-widget live-update proof.
Exact deployment, checks, scope, and remaining cases:
`docs/m0-enablement-acceptance.md`.

## Same-widget acceptance (d39e5e3, 23:41–23:49 UTC)

Fresh task `vt_1981d9b116e79e0aecc38440` was created through Codex and rendered
once in a fresh standard ChatGPT Pro chat. Normal `/hooks` showed one installed
and active PostToolUse. Native session `01a0a24e-0e41-70d3-a29c-a58551ef669a`
executed exactly one date read and exited. Automatic event
`hook_1789429477625_rxkfy0eg`, `2026-09-14T23:44:37.624Z`, appeared as observed
activity in the same open details panel. No manual hook, injected event, reload,
or second ChatGPT render. Backend count 1 -> 2; task stayed PLANNING.

The real widget also retained that evidence during a scoped connection-failure
test and recovered without being recreated. Full evidence, deployment and CI
status: `docs/brief-004-acceptance.md`. Hook trust/configuration is unchanged;
the native acceptance process exited normally. Earlier rows below are history.

## Installed-root retest (8ef7822, 19:29–19:35 UTC)

- Coordinator reran typecheck, 38 tests plus the compatibility verifier and
  installed-root Windows launch check, and both UI builds successfully.
- Refreshed the generated artifact with cache version
  `0.1.0+codex.20260914192637` and reinstalled `visual-team@visual-team-native`.
- Installed cache root:
  `C:/Users/mstin/.codex/plugins/cache/visual-team-native/visual-team/0.1.0+codex.20260914192637`.
- Normal `/hooks` review displayed the resolved, quoted installed script path.
  Reviewed/trusted only this PostToolUse definition and enabled it normally;
  native readback was installed 1 / active 1. Portable `visual-team@personal`
  stayed disabled, preventing duplicate registration.
- Fresh Render task: `vt_d0f77f031b4c1437abdb0e67`, created
  `2026-09-14T19:29:16.097Z`, title `Native hook launch acceptance 8ef7822`.
  Baseline eventCount was 1.
- Runtime: bundled CLI `0.154.0-alpha.6.2`, native session
  `01a0a165-e72d-7392-b8c0-3d6f147928a9`. Its process-local environment pinned
  the hosted Render endpoint and the fresh task above.
- Bounded prompt requested exactly one harmless native date read. No MCP
  calls, manual hook invocations, event writes, or file edits were requested
  or performed by that acceptance turn. Native output reported 14:34:35 CT.
- Runtime displayed `Recording activity in Visual Team` without a hook
  failure. A subsequent read-only server check showed eventCount **1 -> 2**:
  event `hook_1789414476481_471owdl1`, timestamp
  `2026-09-14T19:34:36.48Z`, provenance `observed`, kind `activity`, label
  `Finished a step.`, detail `tool: Bash`. No command text was in the event.
- **Automatic native hook delivery to the backend: PASS.** This supersedes
  the earlier launch failure; it does not infer task completion or approval.
- **Existing embedded-widget observation: PENDING.** ChatGPT's render call
  returned the correct public task, but its fresh widget initially remained
  at `Waiting for the task status…`. A recovery reload did not establish live
  refresh; later browser inspection became unresponsive. No same-widget
  event observation or latency claim is made. Repeat with an initialized
  fresh widget before closing criterion 6.
- Native CLI was exited cleanly; the temporary endpoint/task overrides ended
  with that process. Corrected hook remains enabled; unrelated hooks untouched.

Sites migration is independently blocked by account availability; see
`docs/sites-acceptance.md`. Render remains the native acceptance endpoint.
Earlier runs below are historical evidence for the superseded packages.

## Compatibility-package retest (fd3a5e8, 17:50–18:02 UTC)

Remote main verified as `fd3a5e883e714d8c3ef45d3ee408bf35dee91c81`.
Coordinator's configured working tree passes typecheck, 38 tests plus compat
verification, build (widget 152.1 KB, dev host 460.1 KB), and diff whitespace.
The generic plugin helper validator rejects several package fields, including
the explicit hooks declaration; native discovery was tested without silently
rewriting the submitted package to satisfy that helper.

- Marketplace `visual-team-native` added from the generated
  `dist/native-codex-compat` root; installed `visual-team` version 0.1.0.
- Cache `C:/Users/mstin/.codex/plugins/cache/visual-team-native/visual-team/0.1.0`.
  Manifest, MCP, app, both hook definition files, and script match the artifact.
- Disabled `visual-team@personal` through the native plugin browser; readback
  confirms false. Compatibility package remains enabled. No double registration.
- Native package details show skill `visual-team:visual-team`,
  **PostToolUse (1)**, and **Visual Team M0** app.
- Reviewed/trusted only the native package's PostToolUse through `/hooks`.
  Matcher `.*`, command `node "./hooks/record_codex_event.mjs" PostToolUse`.
  Before testing: installed 1 / active 1; no trust bypass or unrelated changes.
- Started a fresh CLI with hosted URL and pinned task in process-local env.
  Session `01a0a110-2583-74d3-8d28-ece5f1b5c1f6`, runtime 0.154.0-alpha.6.2.
  Installed render completed 17:57:12.776 UTC; harmless native action completed
  17:57:17.612 UTC with exit 0. Its MCP record identifies the native plugin.
- CLI displayed **Hook failed / hook exited with code 1** after each call.
  Its model's final claim that no warning appeared is contradicted by the UI.
- Fresh task `vt_ee1c538478731e24cabb3635`, created 17:51:06.398 UTC,
  retained eventCount 1 at 17:57:49 UTC. The existing ChatGPT panel showed only
  its starting event. No manual hook/event call or new model render in that
  panel during the native action. All test CLI sessions were exited.

The relative launch path fails an offline `node --check` from the project
directory with MODULE_NOT_FOUND; the installed script passes syntax check.
No script was executed by that diagnostic. Pinned discovery code replaces
`${PLUGIN_ROOT}` before launch; current `./` command is not rooted to the
installed package. This is a source-backed diagnosis; native stderr was not
exposed beyond exit 1. References and bounded fix in
`docs/swe-2-brief-003-follow-up.md`.

Separate reproducibility failure: clean committed-source export fails compat
verification because the verifier pins the hosted URL while committed source
uses localhost. The green configured-tree checks must not be called clean
checkout validation. Coordinator configuration remains uncommitted.

After the test, toggled the failed hook off through native `/hooks`; readback
installed 1 / active 0. Compatibility plugin stays enabled; old portable
plugin stays disabled. Review changed definitions and re-enable normally at
the next acceptance run. Brief 003 is not accepted end to end yet.

## Earlier portable-package results (31d4165)

The coordinator launched interactive Codex with process-local hosted URL and
pinned task ID. No manual hook invocation or `record_codex_event` call was
used during this acceptance run, and no hook trust or unrelated permissions
were changed.

| Check | Result |
|---|---|
| CLI 0.149.0 `/plugins` | Visual Team installed/local 0.1.0; skill `visual-team:visual-team` listed; **No plugin hooks. No plugin apps.** |
| CLI 0.149.0 `/hooks` | PostToolUse installed 0 / active 0; unrelated hooks left untouched |
| CLI 0.149.0 model turn | Failed before tool execution: configured model requires a newer Codex version |
| Desktop-bundled CLI 0.154.0-alpha.6.2 | Starts and completes the bounded test with the configured model; global npm CLI unchanged |
| Newer runtime `/hooks` | PostToolUse installed 0 / active 0 |
| Installed `render_visual_task` | PASS at 16:32:00 UTC; truthful planning/assigned/solo text, no custom UI needed |
| Harmless native PowerShell action | PASS at 16:32:06 UTC, exit 0; no hook warning in action output |
| Automatic event in the pinned task | FAIL: eventCount remains 4 at 16:32:38 UTC; last activity remains 16:10:33.729 UTC |
| Existing ChatGPT evidence panel | Unchanged after the action; only task start and the three earlier manual QA probes |

Successful native session: `01a0a0c1-85cb-7ec1-a178-861d3320e455`.
Read-only inspection of that session's tool records confirms the installed
render call and successful native action; the preliminary shell call only
read HANDOFF. The render result was reduced to public text, without printing
private metadata. No manual event call or hook execution occurred. Both test
CLI sessions were exited; their environment overrides ended with them.

The skill was discovered, but the bounded prompt directly invoked the tool;
this does not establish the broader skill workflow or desktop UI support.

## Confirmed loader limitation

The tagged upstream source explains the observed native inventory:

- [CLI 0.149.0 loader](https://github.com/openai/codex/blob/rust-v0.149.0/codex-rs/core-plugins/src/loader.rs#L936)
  loads apps only for Legacy format and returns empty hook vectors for
  AgentPlugin format.
- [CLI 0.154.0 loader](https://github.com/openai/codex/blob/rust-v0.154.0/codex-rs/core-plugins/src/loader.rs)
  has the same guards. npm's stable version was 0.154.0 when checked.
- [Manifest selection](https://github.com/openai/codex/blob/rust-v0.149.0/codex-rs/utils/plugins/src/plugin_namespace.rs)
  chooses a recognized root `plugin.json` before compatibility manifests.
  Merely adding `.codex-plugin/plugin.json` beside the portable manifest
  therefore does not remove the hook-loading guard.

This conflicts with the broader support described in the current
[plugin packaging guide](https://developers.openai.com/plugins/build/plugins).
Treat the observed runtime and version-pinned implementation as acceptance
evidence. No malformed payload or endpoint failure was reached: the hook
was not loaded. Its native command execution remains untested.

Next coding handoff: [SWE-2 brief 003](swe-2-brief-003.md), a bounded Codex
compatibility package. Do not replace this failure with a manual replay or
user-level hook configuration and claim the plugin passed.

## Verified setup

- CLI `0.149.0`; `visual-team@personal` version `0.1.0` installed/enabled.
- Repository, installed source, and cache copies of manifest, MCP config,
  app config, hook definition, and hook script match byte for byte.
- Script file SHA-256:
  `2dfb14a955db23f177dc1c885192ffba920139e40e265933eb9141f4db9864f4`.
  This is a file checksum, not Codex's hook-definition trust hash.
- Installed script:
  `C:/Users/mstin/.codex/plugins/cache/personal/visual-team/0.1.0/hooks/record_codex_event.mjs`.
- The hook allowlists correlation metadata, posts to the configured MCP,
  produces no approval decision, and is intended to exit 0 on delivery failure.
- Current [web view: Start visual task](https://chatgpt.com/c/6aa81bf1-cd7c-83ea-8ce8-86707bcf2061)
  has task `vt_3ca66268d496238950b27f25`, created about 16:08 UTC.
  Its 2h lifetime and in-memory storage mean a later test may need a new task.

## Repeat after the packaging fix

Open a fresh PowerShell terminal and start Codex with these process-local
overrides. The hook defaults to localhost unless this environment is set;
the installed MCP URL alone does not configure the standalone hook.

```powershell
Set-Location 'C:\Users\mstin\code\project-visual-team'
$env:VISUAL_TEAM_MCP_URL = 'https://project-visual-team-mcp.onrender.com/mcp'
$env:VISUAL_TEAM_TASK_ID = 'vt_3ca66268d496238950b27f25'
& 'C:\Users\mstin\AppData\Local\OpenAI\Codex\bin\bffc5354119c8421\codex.exe'
```

The executable above is the tested desktop-bundled 0.154.0-alpha.6.2; its
path may change on app updates. Check the current executable with `--version`.
The global npm `codex` remains 0.149.0 and cannot run the configured model.

1. Open `/hooks`. Review the **Visual Team PostToolUse** hook's source and
   command through Codex's normal interface. Trust only that reviewed hook
   if acceptable. Installing the plugin does not trust it automatically.
   Do not use a trust-bypass flag or change unrelated hooks/permissions.
2. Confirm Visual Team appears in the fresh runtime's plugin/tool inventory.
3. Give the runtime this bounded test prompt, substituting a fresh task ID
   in both environment and prompt if the prior task expired:

```text
This is a Visual Team native integration test, not a coding task.
Use the installed Visual Team render_visual_task tool on existing task
vt_3ca66268d496238950b27f25 and report its text summary.
Then execute one harmless native shell action: Get-Date.
Do not edit files, create another visual task, manually invoke the hook,
call record_codex_event, or invent lifecycle events. Report whether the
installed tool was available and whether any native hook warning appeared.
```

4. Watch the existing web evidence panel. The automatic PostToolUse must
   appear without another render call. Record its timestamp, actual tool
   name, and correlation metadata. Keep command text/content out of product
   telemetry. A successful shell command alone does not prove hook delivery.
5. The CLI's readable tool summary also checks useful text when no widget
   is available. Record what actually happened; installation alone is not
   invocation evidence.

After exiting Codex, clear the temporary overrides or close that terminal:

```powershell
Remove-Item Env:VISUAL_TEAM_MCP_URL
Remove-Item Env:VISUAL_TEAM_TASK_ID
```

## If it fails

Distinguish plugin unavailable, trust pending, hook command failure, endpoint
delivery failure, expired task, and widget read failure. Share only sanitized
errors and correlation evidence; never capability tokens or raw hook stdin.
Codex coordinates diagnosis and gives SWE-2 a bounded coding brief only if
the evidence identifies a code issue.

Historical gap above is resolved: criterion 6 passes on the d39e5e3 CLI/web
path, and the refreshed installed skill workflow passes on 4fb3548. The
deployed finish tool supports truthful task completion after real work;
terminal ChatGPT web mode switching now passes. Stop still finishes only a
turn. Remaining surfaces and real-host expiry/rejection cases stay open.

Native trust requirement: [official hook documentation](https://learn.chatgpt.com/docs/hooks#review-and-trust-hooks).
