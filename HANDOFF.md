# Handoff — Project Visual Team

**Updated:** 2026-09-17
**Repo:** https://github.com/tinatsntx/project-visual-team (public, default branch `main`)

**Working-alpha launch preparation:** The owner approved an open-source entry
with an instant sample and self-host instructions. The public site is live at
https://tinatsntx.github.io/project-visual-team/ and the source prerelease is
`v0.1.0-alpha.1`, both based on `dd00652`. Hosted CI passes 293/293 with zero
skips. Pages deployment and all 12 published asset hashes were verified;
two original SVGs differ from the Windows checkout only by CRLF/LF endings.
The follow-up media revision `bcf7a436cd5511859d06af48eefa7b2b8b84e1c8`
is now live: CI run `35296307845` and Pages run `35296307894` succeeded,
and all 14 published assets match their current hash manifest. The public
MP4 plays in Chrome, and YouTube playback works inside the Product Hunt draft.
Product engine/runtime code remains the accepted `5a66481` baseline.

The name is retained for this working-alpha entry under the owner's approved
conditional plan and bounded preliminary screen, not legal clearance. See
`docs/public-name-screen-2026-09-17.md`. The five-person study, directory
submission and general public-beta gates remain separate and unfinished.

**Current launch owner step:** final listing review/scheduling remains pending.
Product Hunt sign-in/onboarding is complete and its full draft is saved at
https://www.producthunt.com/products/visual-team?launch=visual-team .
The page explicitly says it is not scheduled yet.
Its scheduling dialog is prepared for September 18 at 12:01 a.m. Pacific /
2:01 a.m. Central, including the explicit challenge entry and an accurate
development-contribution response. Final owner approval is pending.
The fresh demo task `vt_82f9442e59eb3e310747edf0` is completed: two native reads
exited successfully on CLI 0.155.0-alpha.2.6, the second after genuine one-action
approval. The same ChatGPT card showed the observed need, resumed activity and
reported terminal receipt. This does not establish full new-runtime compatibility.
The reviewed 74-second demo is unlisted at https://www.youtube.com/watch?v=b1AtoDnVho0
and four gallery images are ready. The older September 16 task stays closed.
See `docs/launch-demo-acceptance-2026-09-17.md`, `docs/launch-preparation-2026-09-17.md` and
`docs/launch-demo-runbook.md` for current launch details.

**Milestone:** Briefs 011 and 012 are implemented, reviewed and published at
`5a66481`. **Both briefs pass technical acceptance.** Hosted CI passes 293/293
with zero skips; the reviewed build is deployed with its exact widget bytes
verified. Real ChatGPT/native hook, attributed permission, same-widget
connection recovery, reported completion, dark theme, reduced motion and
terminal display-mode checks pass. Public host evidence is in
`docs/attention-alpha-host-evidence.json`.
Product feature expansion is stopped. The five-person
usefulness study and its 2–7-day voluntary repeat-use follow-up remain pending
actual people. See `docs/attention-alpha-acceptance.md` for the current gate
record, `docs/private-alpha-test-kit.md` for the protocol, and
`docs/private-alpha-results-template.md` for the blank results sheet.
All three display modes default to text status: unresolved needs with
ask-holder and response location, recorded phase with provenance, latest
recorded activity with source/time, and last successful refresh stated
separately. Terminal tasks show the reported outcome, reported checks, and
artifact references in the default summary; the roster lives in an optional
team view (motion opt-in, suppressed by reduced motion/stale/inactivity).
`finish_visual_task` now emits a structured reported receipt on the event
and snapshot alongside the bounded legacy detail; the reducer accepts it
only on reported `task_finished` events, enforces the allowlist/combined
bound (measured on the serialized detail representation), and rejects
atomically. The unchanged coordinator probe
`evals/brief-011-coordinator-probe.mts` passes 9/9.
Brief 012's final `5a66481` ZIP passes integrity verification and all six actual
native installer checks: isolated install, repeat no-op, read-only doctor,
conflict refusal without mutation, and owner-profile preservation. The owner
profile uses the accepted `18f3a18` package through supported CLI installation
(same hook bytes and payload contents as the final package; text line endings differ);
normal `/hooks` review confirms nine active hooks, and the installed script
matches source. The live acceptance task records genuine PreToolUse,
PostToolUse, PermissionRequest and Stop events; the mounted ChatGPT card
updates from those events and retains the bounded reported finish receipt.
The final ZIP is `dist/visual-team-alpha-0.1.0-5a6648128afb.zip`; integrity,
source identity, actual install/idempotence/doctor and conflict checks pass. The
bundled hook resolves its endpoint explicitly: `VISUAL_TEAM_MCP_URL` wins
when defined and valid http(s); otherwise the packaged MCP config next to
the installed plugin root (`.mcp.json` Legacy first, then `mcp.json`). There
is no implicit localhost fallback and no second endpoint after a selection.
`npm run build:alpha-package` generates
`dist/visual-team-alpha-<pluginVersion>-<sha12>/` — a versioned directory so
a new build never silently replaces an installed alpha's marketplace source.
The manifest's `sourceRevision` is verified against the packaged inputs
(plugin/, packaging/alpha/, the build scripts): a dirty input set produces
an explicitly separated `unverified-preview` package, never a mislabeled
commit; `VISUAL_TEAM_SOURCE_SHA` must name a real commit. The installer
supports only codex-cli 0.154.0-alpha.6.2, resolves Codex via `-CodexPath`
or exactly one tested-runtime match across PATH and the desktop bundle
(`%LOCALAPPDATA%\OpenAI\Codex\bin\*\codex.exe`, enumerated not guessed),
checks package integrity, Node range, endpoint config and service health,
then reads BOTH marketplace and plugin CLI state before mutating —
conflicts (foreign-source enabled plugin, same-path different version,
marketplace at another root) stop before any add, and successful adds are
verified by re-query. It never changes trust or approves hooks; the
nine-hook review stays manual. Doctor stays read-only, tolerates discovery
failure, and reports a defined `VISUAL_TEAM_MCP_URL` override separately
from package health. Windows-only PowerShell execution tests cover the
failure paths against controlled stubs; `npm run build` stays Linux-safe
and does not build the archive.
Earlier state: milestones 0 through 4 COMPLETE on the supported path. Their
accepted product code was `0f0e3ab`. Real native specialist
start/permission/activity/finish, same-widget ChatGPT updates, session
isolation, interrupt/resume, and hook-disabled workflow pass. Evidence:
`docs/m4-native-closeout.md` and `docs/m4-native-host-evidence.json`.
M4 replaces M2's temporary one-active-task limit with explicit session
correlation; explicit `$visual-team` invocation remains required.
Brief 010 release preparation is accepted at `9c8e825`: docs,
offline replay, lint/CI, a recorded synthetic screenshot demo, five open
contributor tickets, and hosted Inspector evidence. M5 needs real testers;
M6 launch/M7 need owner identity, domain, legal, and support choices. See
`docs/release-preparation-closeout.md`.
Coordinator accepted `2eda8b3`; all three follow-up probes pass. Initial supported
path: ChatGPT web + Windows Codex CLI + Render. Real native PostToolUse reaches
the existing ChatGPT web widget on this Pro account, with CSP enforced.
Controlled connection-failure recovery and fullscreen/return also pass.
Brief 005 fixes clean-checkout CI and literal bundle embedding; both pass,
including a fresh ChatGPT smoke test. M0 enablement is now accepted/deployed:
native skill completion, terminal modes, and web PiP pass. Other surfaces,
real expiry UX, and host rejection cases move to the compatibility/private-alpha
backlog; they do not block Milestone 1. Decision: `docs/m0-closeout.md`.
Sites migration remains paused by owner MCP availability. Full evidence:
`docs/m0-enablement-acceptance.md`, `docs/brief-004-acceptance.md`, and
`docs/brief-005-acceptance.md`.

`PROJECT_PLAN.md` is the controlling specification.
`docs/feasibility-report.md` is the live gate record.

## Working arrangement

SWE-2 owns product code; Codex now relays briefs/results directly through
the Devin harness, as explicitly authorized by the owner. The
owner explicitly authorized Codex to implement the Sites port here. Codex
also coordinates reviews, hosting, registration, real-surface tests, and
evidence. Brief 002 is accepted on the tested paths below; brief 003's launch
fix passes automatic delivery. Brief 004 follow-up `d39e5e3` passes the bounded
real ChatGPT/native and connection-recovery acceptance. Brief 005 `515727a`
is accepted, published, and deployed: clean-checkout verification and literal
resource embedding pass. M0 enablement and its two reviewed fixes are
accepted at `4fb3548`; no new coding blocker was found in that review.
M0 is closed for the tested path. SWE-2 brief 006 and its follow-up are accepted:
the engine rejects cross-task events and explicit-unresolvable worker
targets, closes derived-provenance holes on indirect kinds, validates
finish targets, and gains seeded property + ordered replay evidence. The
coordinator's three reproduced follow-up gaps are fixed in `2eda8b3`:
worker resolution is namespace-aware (hook agent_ids match
externalId first; reported ids match internal roster ids first), a reported
`waiting_for_user` records an attributed pending need, and pending needs
are attributed per ask-holder (`pendingUserNeeds`) so unrelated activity
can never resolve another worker's ask. `evals/m1-coordinator-probe.mts`
exits 0 — all three cases pass. Coordinator independently verified 145/145
tests, typecheck, build, native compatibility, both unchanged probes, and
committed-delta whitespace. M1's four exit criteria are met; no new blocker
was found. M0 remains closed; no browser gate reopened. Milestone 2 consumer
workflow is cleared in `docs/swe-2-brief-007.md`.
Evidence: `docs/m1-core-engine-acceptance.md`.

Brief 007 is accepted at `6def930`: `SKILL.md`
now gives the executable consumer workflow — one start, one initial render,
genuine reported phase boundaries, honest waits/resume, one truthful finish,
one completion render, complete text answer — plus the metadata warning,
rejection semantics, and headless/limited-access rules. The delegation and
state-truth references carry the solo/team matrix and permission/provenance
invariants. Eight eval specs (five positive, three negative, including the
UI-unavailable variant) live under `evals/positive/` and `evals/negative/`;
`evals/m2-consumer-workflow-probe.mts` pre-proves the server side of all
four exit criteria locally (7/7 pass, exit 0). Coordinator native execution
proves small solo work, a real read-only reviewer with one writer, refusal
of automatic approvals, a useful headless answer, and same-task restart/resume.
Real ChatGPT renders native completion and reports hosted research without
invented observed searches in sequential use. Explicit skill invocation is
the accepted entry point: implicit discovery sometimes started before reading
the skill and failed metadata handling. Untargeted hooks can cross active
tasks, and hookless specialist completion is not accurately reflected in the
roster. M3 owns truthful presentation; M4 owns correlation and hook coverage.
M2 did not execute real native permission prompting; the accepted M4
closeout now supplies that evidence.
Evidence: `docs/m2-consumer-workflow-acceptance.md`.

## Current state

- M4 deployed product baseline: `0f0e3abc48ee7f5ce92153e371dc3308a15e5a8e`.
  Independent typecheck, 199 tests, build, native compatibility (including
  clean archive export), four prior probes, routing 4/4, and hook boundary
  3/3 pass. CI `35046625539` is green; Render deploy
  `dep-dakvit740ujc73917cr0` is live, with automatic deployment still off.
  Native package refreshed through supported installation; nine hooks
  reviewed/trusted in normal `/hooks`, installed script matches source.
  Real native approval stayed in the native UI; one-action approval only.
  Task A finished at eventCount 25 in its original ChatGPT iframe, while
  independent native B stayed at 12 and ChatGPT-only C at 1. Hook-disabled
  fallback completed with three reported-only events. See M4 closeout.
- Current SWE-2 handoff: `docs/swe-2-brief-010.md`, release preparation only.
  Coordinator retains review, exact-SHA publication/deployment, acceptance,
  and the human/owner gates. `docs/private-alpha-test-kit.md` is prepared;
  no participant feedback has been invented. Private GitHub vulnerability
  reporting is enabled; public name/domain/identity/legal gates remain open.

- Earlier accepted M3 baseline: `f78eac13f0d4f0b2f7263a425ab3f420ce6a8ea6`.
  Independent 183/183 tests, seven M3 probe cases,
  typecheck/build/package checks pass; CI `35042201931` is green. Render
  deploy `dep-dakujgn40ujc738u0um0` is live. Refresh the developer app in
  ChatGPT after UI deployment; a fresh chat then loads current assets.
  Real inline/fullscreen/PiP, keyboard evidence, same-widget reported
  completion, terminal mode switching, and retained results pass.
- The owner authorized direct coordinator handoffs to SWE-2 in the Devin
  desktop harness, review/test/fix cycles, and continued milestone work.
  SWE-2 still owns product coding; coordinator owns publication and live
  acceptance. Do not wait for the owner to relay coding briefs/results.
- Earlier accepted consumer skill/package: `6def930`; refreshed installed files matched
  source. Public native receipts: `docs/m2-native-host-evidence.json`.
  M2 changes no runtime/UI/endpoint code;
  no Render redeploy is required for this release. Use explicit skill invocation
  The former one-active-task restriction is superseded by accepted M4 routing.
- Earlier M1 product-code baseline (superseded by M3 above):
  `2eda8b3f42dac033e473345b579c76911ed73917`.
  Exact-code CI `35011395446` is green. Hosted six-tool discovery, reported
  wait/resume/finish, terminal freeze, retained verification, and literal UI
  assets pass. Closeout documentation commits may follow that deployed SHA.
- M0-enablement code `3ed245e` plus fixes `3ab16d0` are accepted: reported
  workflow/finish tools, testable TTL override, and PiP control. Terminal
  tasks reject new events; oversized finish metadata rejects before mutation.
  Accepted result/verification/reference metadata is retained intact.
- Coordinator independently reran typecheck, 88/88 tests, compatibility and
  installed-root Windows checks, build, committed-delta whitespace, and the
  unchanged HTTP probe (exit 0). Widget 160.1 KB. GitHub CI `34974898762`
  is green for the exact SHA; hosted JS/CSS match the build verbatim.
- Refreshed installed skill workflow passes in native Codex: genuine testing
  report, one native date read with automatic observed hook, reported finish,
  and useful final text. Fresh ChatGPT renders the completed task and evidence;
  terminal fullscreen/return/host Close and actual PiP/return pass. This run
  mounted after native completion; earlier same-widget live evidence is below.
- Fresh ChatGPT Pro read-only viewer, native event in the same widget, controlled
  failed-read retry/recovery, and fullscreen/return pass. No new precise latency
  measurement or full platform-matrix pass is claimed. See acceptance evidence.
- Fresh `515727a` ChatGPT smoke also passes initialization, correct event
  details, fullscreen and return. Native-event/recovery evidence is from
  `d39e5e3`; brief 005 did not change the widget or hook source.
- Sites implementation is isolated in sibling `project-visual-team-sites`,
  branch `codex/sites-mcp-port`; published source commit `433d93d` in Sites Git.
  Its shared D1/Worker implementation passes typecheck, 43 tests, compatibility
  verification, and build. Original coordinator config is preserved.
- Private Site: https://visual-team-mcp.tinatsntx.chatgpt.site . Deployment and
  browser sign-in/landing pass. MCP connection lookup returns
  `Sites MCP is not enabled for this Site owner.` No Render cutover.
  Owner confirmed Pro and supplied Support's plan-availability explanation.
  Pause the migration; keep Render. Test Codex writes plus a read-only ChatGPT
  viewer; changing hosts does not change ChatGPT plan permissions. The cited
  general MCP FAQ does not specifically establish the Sites owner error's cause.
  Full deployment IDs, availability decision, and remaining acceptance:
  `docs/sites-acceptance.md`.
- npm workspaces, strict TypeScript, Node >= 20; Windows-first development.
- Deployed `2eda8b3` serves six MCP tools at `/mcp`, including the two
  reported-boundary tools. Stateless HTTP transport with an in-memory task
  repository, task-scoped read capabilities, and 2h task TTL (overridable
  via `VISUAL_TEAM_TTL_MS`; hosted default is unchanged).
- Fresh `render_visual_task` returns snapshot and recent events plus the
  capability in private result `_meta`. Reads use private request `_meta`.
- React widget: inline/fullscreen/PiP, with real terminal web mode tests
  passing. Other hosts and active PiP updates remain untested. JS/CSS inlined
  in the resource; bridge-only declared
  CSP has empty `connectDomains` and `resourceDomains`.
- Simulated host `:8788/dev.html` uses the shared render-result builder and
  real mapper/reducer. It is not evidence of native platform support.
- Portable `plugin/` now points to the hosted MCP endpoint and the owner's
  development ChatGPT app. This is not a public marketplace release.

## Deployment and installation

Render: [project-visual-team-mcp](https://dashboard.render.com/web/srv-dak13nmk1f9s73ajm0dg)

- MCP: https://project-visual-team-mcp.onrender.com/mcp
- Health: https://project-visual-team-mcp.onrender.com/healthz
- Free Node service, Ohio; Node `24.12.0`, `NODE_ENV=production`.
- Build: `npm ci --include=dev && npm run build && npm run typecheck && npm test`
- Start: `npm start --workspace @visual-team/mcp-server`
- Deploy `dep-dakpdt15efls73d5b7r0` live at
  `2026-09-15T19:06:05.073713Z`, server/UI SHA `2eda8b3`.
- Latest release smoke: `vt_59b5fbfa9e1d6c24d543f60c`, completed at
  `2026-09-15T19:07:14.297Z`, five reported events. This is a synthetic hosted
  HTTP check; earlier real ChatGPT/native evidence below remains separate.
- Auto-deploy off: coordinator reviews each result before deploying.
- In-memory tasks disappear on restart. Use synthetic M0 data.

ChatGPT development app: **Visual Team M0**

- App: `asdk_app_6aa8123840f081918b2cd299cb5ca93d`.
- Connector: `plugin_asdk_app_6aa8123840f081918b2cd299cb5ca93d`.
- [App details](https://chatgpt.com/plugins/plugin_asdk_app_6aa8123840f081918b2cd299cb5ca93d).
- [Start visual task — earlier QA conversation](https://chatgpt.com/c/6aa81bf1-cd7c-83ea-8ce8-86707bcf2061).
- Latest real-host QA: [Render visual task](https://chatgpt.com/c/6aa949a4-a5b4-83ea-9586-4835f4304167).
  Fresh `4fb3548` completed-task render, correct seven events including
  verification, fullscreen/return/host Close, and PiP/return pass. Task
  `vt_24d111a38068a994393527e1`, created `2026-09-15T13:31:08.842Z`.
  Server expiry passes locally; no hosted retention change.
- Earlier smoke QA: [Show Embedded Board](https://chatgpt.com/c/6aa88d4c-6b14-83ea-9b56-f86e43d02b3b).
  Fresh `515727a` render initializes and shows the correct reported event;
  fullscreen/return pass. Task `vt_d19303607167b41f2d5d7c84` was created
  `2026-09-15T00:10:55.543Z`; recreate after expiry or service restart.
- Native/recovery QA: [Render existing task](https://chatgpt.com/c/6aa88689-1114-83ea-aef7-ae10731d5c0c).
  Standard Chat selected; Pro read-only render/read flow passes. CSP enforcement
  reverified ON. Same-widget native event and connection recovery pass.
- The earlier conversation retained the old widget template even for a new
  render after deployment. App Refresh plus a fresh Chat conversation loaded
  the new implementation. Verify actual widget code/colors before acceptance.
- Registration uses No Auth. Read capabilities still gate widget reads.
- **Enforce CSP in developer mode is ON**, explicitly authorized by the owner.
  Keep it on for subsequent acceptance tests.

Local native package (latest acceptance):

- `visual-team@visual-team-native` `0.1.0` refreshed/installed/enabled from generated
  `dist/native-codex-compat`, with matching installed cache copies.
- Marketplace manifest: `dist/native-codex-compat/.agents/plugins/marketplace.json`.
- Cache: `C:/Users/mstin/.codex/plugins/cache/visual-team-native/visual-team/0.1.0`.
- Native 0.154.0-alpha.6.2 now shows its skill, linked app, and nine hooks.
- M4 normal `/hooks` readback: installed 9 / active 9 after normal review.
  Installed skill/declaration/script match source. Session
  `01a0a541-32ef-7f02-816e-1acec5d149dc` used the installed skill to report
  testing, perform one native date read, and truthfully finish. Automatic
  hook `hook_1789479307039_pck2myjd` arrived at 13:35:07.038 UTC; reported
  completion followed at 13:35:18.911 UTC. Final eventCount 7 stayed frozen.
  Useful native text and subsequent ChatGPT evidence rendering pass.
- Old `visual-team@personal` is now disabled to avoid duplicate registration.
- Prior native QA task `vt_1981d9b116e79e0aecc38440`, created 23:41:13 UTC,
  was cleared by the brief 005 service deployment. Recorded acceptance:
  Native session `01a0a24e-0e41-70d3-a29c-a58551ef669a` printed the current date
  once; automatic event `hook_1789429477625_rxkfy0eg` appeared at 23:44:37.624 UTC
  in the already-open ChatGPT details panel. Backend count 1 -> 2. No manual
  event or second ChatGPT render. Native session exited; hook remains enabled.
  Earlier waiting-screen evidence is retained in the native acceptance history.
- Exact results: `docs/native-acceptance.md`. All native test sessions exited.

Earlier portable installation (now disabled):

- Marketplace: `C:/Users/mstin/.agents/plugins/marketplace.json`, name `personal`.
- Source: `C:/Users/mstin/plugins/visual-team`.
- Cache: `C:/Users/mstin/.codex/plugins/cache/personal/visual-team/0.1.0`.
- `codex plugin list --marketplace personal --json` confirms
  `visual-team@personal` 0.1.0 installed; now disabled.
- Installation and native MCP render/text are proven. Skill discovery is
  proven, not the full skill workflow. Automatic hooks failed: PostToolUse
  installed 0 / active 0 in 0.149.0 and desktop-bundled 0.154.0-alpha.6.2.
- The tagged Codex loader skips apps/hooks for the portable AgentPlugin
  format. Details and source links: `docs/native-acceptance.md`.
  Coding handoff: `docs/swe-2-brief-003.md`.
- npm CLI 0.149.0 also rejects the configured model as too old. The bounded
  native action passed using the existing desktop-bundled executable:
  `C:/Users/mstin/AppData/Local/OpenAI/Codex/bin/bffc5354119c8421/codex.exe`.
  This installed-app path may change with updates; global npm CLI unchanged.
- No hook trust bypass was used. The later native hook review is recorded above.
- The hook defaults to localhost. Set `VISUAL_TEAM_MCP_URL` in the **Codex
  process environment** for hosted tests; `mcp.json` does not set it.
  M4 learns task binding from the real start receipt; ordinary acceptance
  does not need a `VISUAL_TEAM_TASK_ID` override.
- Installed source/cache are copies. Refresh source and use the supported
  plugin update/reinstall flow after package changes, then verify readback.

## Verified on 2026-09-14

- Native session `01a0a0c1-85cb-7ec1-a178-861d3320e455`: installed render
  call passed at 16:32:00 UTC; harmless shell action exit 0 at 16:32:06 UTC;
  useful headless text returned. No manual hook or event call. Backend count
  stayed 4 at 16:32:38 UTC, and existing web panel stayed unchanged. Criterion
  6 fails for this package/runtime combination. Test processes were closed.
- Typecheck, 38/38 tests, build, and `git diff --check` passed on `31d4165`.
  Widget JS 152.1 KB; dev host 460.1 KB; CSS 3.5 KB (esbuild output).
- Real HTTP handler regression: start/render/event/read; missing/wrong/
  cross-task private metadata rejected; repository test covers expiry.
- Hosted health, tool discovery, start/render/private read, resource MIME
  and declared CSP checked. Capability absent from model-visible results.
- Rebuilt harness: inline/fullscreen render; permission fixture keeps waiting;
  solo fixture reaches completed and polling stops.
- Real ChatGPT web: start + render invoked; fresh iframe shows correct task;
  manual bundled-hook events appear in the open evidence panel without a
  new model render call. The panel remains expanded during refresh.
- Prior CSP-on test passed; enforcement remains on for the new build.
- New real web widget has readable dark text and ownership-only wording.
  Open team, Back to chat, and host Close switched layout in observed
  1125, 1104, and 1253 ms respectively (includes automation overhead).
- Three manual MCP event probes appeared within 3597, 3713, and 3843 ms
  of request start, with evidence still expanded. These are upper bounds from
  UI observation, not a load/performance benchmark or automatic-hook proof.
- Rebuilt solo harness: accepted synthetic reported completion; final poll
  #8 at 16:05:25 UTC. Host controls switched fullscreen/inline at 16:05:56/58
  with no new poll or iframe initialization. Permission fixture logged
  REJECTED at 16:06:37 and continued polling in WAITING_FOR_USER.
- Local installed package files still match repository configuration byte
  for byte. No package/hook source changes were needed in brief 002.

Manual probes used synthetic stdin. They prove hosted hook transport and
widget refresh, **not an automatic Codex lifecycle event**. Behavior proves
usable private bridge delivery on this web host, not which initialization
fallback supplied the result.

## Remaining work and runbook

See `evals/platform-matrix.md` for cases and the feasibility report for gates.

**Current priority:** M4 native correlation and hooks, brief 009, dispatched
directly to SWE-2 in Devin. M3 acceptance is recorded in
`docs/m3-visual-experience-acceptance.md`. The four
M2 exit criteria have executed evidence; the eight evaluation outcomes and
remaining limits are recorded individually. No further M1 work is required.
M4 must fix concurrent hook routing and specialist lifecycle correlation,
and exercise real native permissions. The cases below are recorded
compatibility/private-alpha follow-ups, not Milestone 1 conditions. Do not
rerun accepted feasibility checks unless a changed path or new failure
warrants it.

1. Terminal mode switching and actual web PiP now pass. Real-host rejected
   mode requests and expiry/missing-capability UX remain pending. Use a
   separate local TTL test instance first; hosted retention stays two hours.
   Stop finishes a turn, not a task. The deployed reported finish tool gives
   a truthful terminal path after genuine work.
2. Brief 005 is accepted: clean-checkout CI and literal hosted JS/CSS pass.
   Native installed-root launch and the bounded same-widget event/recovery flow
   also pass; continue remaining platform cases without reopening accepted
   work unless new evidence warrants it.
3. Native installed skill workflow and CLI text pass. Test remaining
   desktop/mobile rows and active PiP updates. Do not substitute simulations.

Native follow-up instructions: `docs/native-acceptance.md`. Latest QA task
is `vt_24d111a38068a994393527e1` (completed); create a fresh task for new work and explicitly
pin any new native test process to its intended fresh QA task.

For local serving:

```powershell
npm install
npm run build
npm start --workspace @visual-team/mcp-server
```

For native hosted-hook testing, set these before starting Codex:

```powershell
$env:VISUAL_TEAM_MCP_URL = 'https://project-visual-team-mcp.onrender.com/mcp'
$env:VISUAL_TEAM_TASK_ID = '<fresh QA task ID>'
& 'C:\Users\mstin\AppData\Local\OpenAI\Codex\bin\bffc5354119c8421\codex.exe'
```

Use a verified current Codex executable; the bundled path above was tested
and may change on app update. The global npm CLI is older. Use native hook
trust review and preserve normal permissions. Confirm the actual tool event
in the web view. Clear test overrides afterward.

### Decision rules (plan §14)

- Codex events cannot reach the service -> ChatGPT-only visuals, Codex headless.
- PiP unreliable -> inline + fullscreen only.
- No live refresh possible -> stop the live-team concept; never fake it.
- Separate App Server client required -> stop for a new product decision.

## Non-negotiable invariants

- `record_codex_event` append-only; never approve/deny/rewrite/block Codex
  actions (ADR-007).
- Provenance on every state; derived never claims completion, approval,
  review, or success (ADR-004).
- Metadata only: no prompts, transcripts, command text, or code in product
  storage, transport, or logs; allowlist-filter hook stdin (ADR-006).
- Capability only in private `_meta`, key `com.visual-team/task-capability`;
  never ordinary arguments, content, structuredContent, URLs, or logs.
- Missing evidence degrades to model-reported status; never fabricate.

## Commands and Windows gotchas

```powershell
npm run typecheck
npm test
npm run build
npm start --workspace @visual-team/mcp-server
npm run dev:serve --workspace @visual-team/plugin-ui
```

Harness: `http://localhost:8788/dev.html`, parameters
`?mode=inline|fullscreen|pip` and `?fixture=` over
`team-with-permission`, `solo-posttooluse`, `reported-question`,
`completed-verified`, `failed-verification`, `review-untracked`,
`long-labels`. M3 deterministic screenshots: `node --import tsx
scripts/m3-capture.mts` writes `apps/plugin-ui/capture/` (gitignored);
serve the workspace and headless-shot
`capture/frame.html?n=<scenario>&w=<px>&h=<px>`.

- esbuild watch/serve exits when stdin closes; use `serve.mjs` through
  `npm run dev:serve`. `PORT` selects an isolated port.
- Git Bash `/tmp` is not visible to Node fs; use workspace-relative temp files.
- No global Git identity is configured; prior commits used inline identity.
- Portable root `plugin.json` loads skills/MCP in the tested runtimes, but
  their loader skips its apps/hooks. Brief 003 is based on this native evidence,
  not an older helper's format assumptions. A sibling overlay is insufficient.

## File map

- `PROJECT_PLAN.md`: specification, §14 gate and §7.4 refresh.
- `docs/feasibility-report.md`: current gate matrix/evidence.
- `evals/platform-matrix.md`: executed and pending cases.
- `docs/swe-2-brief-002.md`: accepted coding brief and its original criteria.
- `docs/native-acceptance.md`: executed native failure and retest procedure.
- `docs/swe-2-brief-003.md`: original packaging compatibility brief.
- `docs/swe-2-brief-003-follow-up.md`: current two-item acceptance follow-up.
- `docs/brief-004-acceptance.md`: real native-event and connection-recovery proof.
- `docs/brief-005-acceptance.md`: clean CI, literal hosted assets, fresh web smoke.
- `docs/m0-enablement-acceptance.md`: accepted fixes, deployment, native skill, terminal/PiP web proof.
- `docs/m0-closeout.md`: M0 GO decision, supported path, deferred validation ownership.
- `docs/swe-2-brief-006.md`: Milestone 1 core state engine completion brief.
- `docs/swe-2-brief-006-follow-up.md`: exact three-case coordinator review and probe.
- `docs/swe-2-brief-007.md`: accepted Milestone 2 consumer workflow brief.
- `docs/m2-consumer-workflow-acceptance.md`: M2 evidence, criteria map, and
  the coordinator-run boundary for the eight eval specs.
- `docs/m2-native-host-evidence.json`: public receipts from actual native runs.
- `docs/swe-2-brief-008.md`: M3 visual experience brief.
- `docs/m3-visual-experience-acceptance.md`: M3 criteria map, screenshot
  index, harness method, and remaining real-host checks.
- `docs/m3-shots/`: deterministic local capture PNGs for M3 evidence.
- `scripts/m3-capture.mts`: regenerates the capture pages from fixtures.
- `evals/m2-consumer-workflow-probe.mts`: synthetic server-side probe for
  the workflow sequences the skill instructs.
- `docs/m1-core-engine-acceptance.md`: four-criteria evidence mapping and corrections.
- `docs/adr/`, architecture/privacy/security docs.
- `packages/test-fixtures/fixtures/`: synthetic scenarios.
