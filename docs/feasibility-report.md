# Milestone 0 — Feasibility Report

**Updated:** 2026-09-16

**Current guided-alpha revision:** `5a6648128afb2ab9da8438f83794c669d18a2253`.
Briefs 011/012 pass technical acceptance: attention/results default, reported
completion receipt, versioned Windows installer/doctor, real native approval
and same-widget ChatGPT recovery/completion. CI passes 293/293 with zero skips;
the exact revision is deployed and the widget bytes match the reviewed build.
Evidence: `docs/attention-alpha-acceptance.md`,
`docs/attention-alpha-host-evidence.json`. Feature expansion is stopped;
the five-person study and 2–7-day repeat-use results remain pending people.
The M0–M4 records below remain dated historical evidence.

**Status:** M0 COMPLETE / GO to Milestone 1 for ChatGPT web + Windows Codex
CLI + Render. ChatGPT web initialization, private bridge refresh,
same-widget automatic native event delivery, and controlled connection recovery
pass with CSP enforcement on. Native skill completion, terminal web modes,
and actual web PiP also pass. All eight feasibility criteria pass on that
supported path. Untested surfaces remain unverified; full compatibility is
not claimed. Closeout and backlog ownership: `docs/m0-closeout.md`.
**M4 code tested/deployed:** `0f0e3abc48ee7f5ce92153e371dc3308a15e5a8e`.
M4 is accepted: real native specialist start/permission/activity/finish,
same-widget ChatGPT updates, concurrent-session isolation, interruption/resume,
and disabled-hook fallback pass. Independent 199 tests, build, clean package
export, prior probes and new boundary/routing probes pass. Evidence:
`docs/m4-native-closeout.md`. M5 participant results remain pending.
M3 is accepted: 183 tests, seven new coordinator cases, exact-code CI,
and real ChatGPT modes/completion/results pass. See
`docs/m3-visual-experience-acceptance.md`.
The following M0–M2 evidence remains historical, not rerun claims.
M1 is complete: 145 tests and both coordinator probes pass; exact-code CI and
hosted wait/resume/finish smoke pass. UI/plugin source is unchanged by M1;
the dated real-host M0 evidence below is preserved. M2 consumer workflow
`6def930` is now accepted for explicit skill invocation and sequential tasks;
see `docs/m2-consumer-workflow-acceptance.md` for the actual pass/partial/fail
branches. M3 subsequently closed as recorded above.
Full M1 release record: `docs/m1-core-engine-acceptance.md`.
**M4 packaging tested:** regenerated/refreshed from `0f0e3ab`; installed
skill, hook declaration, and script match source. The corrected installed-root
hook is retained; nine native hooks are active after normal review.
Brief 005 and the M0 enablement fixes are accepted.
**Sites experiment:** `433d93d`, privately deployed; MCP connection is blocked
by owner account availability. The owner confirmed Pro; migration is paused.
Codex writes plus ChatGPT read-only render/refresh now pass on this Pro account
using Render. This does not enable Sites MCP. See `docs/sites-acceptance.md`.
All eight GO criteria below hold for the initial supported path. Milestone 1
can proceed; the broader matrix remains a compatibility record.

## M0 enablement acceptance (4fb3548, 2026-09-15)

Full record: `docs/m0-enablement-acceptance.md`. Fixes `3ab16d0` resolve both
HTTP probe failures; the unchanged probe exits 0 with both cases passing.
Independent typecheck, 88/88 tests, Windows compatibility, build, literal
embedding, and committed-delta whitespace checks pass. Exact-tip CI
[34974898762](https://github.com/tinatsntx/project-visual-team/actions/runs/34974898762)
is green. Render deploy `dep-dakkf76k1f9s73dkl8q0` is live at
`2026-09-15T13:27:45.029096Z`; six hosted tools and matching UI assets verified.

Refreshed installed native skill starts/renders, reports a genuine testing
boundary, performs one date read, receives automatic observed activity, and
truthfully finishes with retained verification. Task
`vt_24d111a38068a994393527e1` ends COMPLETED at eventCount 7. Native text is useful.
Fresh ChatGPT Pro renders those seven events and completed state correctly.
Terminal Open team/Back to chat/host Close and actual PiP/return all pass.
The board mounted after completion; the earlier same-widget live-update
proof below remains distinct. Local real-HTTP expiry passes; real host expiry
UX, rejected mode requests, and remaining desktop/mobile surfaces stay open.

## Historical M0 enablement review (3ed245e / 6cd5d87, 2026-09-14 CT)

**Originally held; resolved by the acceptance above.** Coordinator independently passed
typecheck, 83/83 tests, native compatibility, build and literal resource checks.
Two additional loopback HTTP probes fail: a work report after failure from
PLANNING changes the worker to WORKING while the task stays FAILED; a valid
500-character finish summary silently discards verification and artifact data.
The tested Render version then remained `515727a`; no PiP/terminal/native skill
acceptance was claimed for that local build. Focused follow-up and exact
reproduction: `docs/swe-2-m0-enablement-follow-up.md` and
`evals/m0-enablement-coordinator-probe.mts`.

## Brief 005 acceptance (515727a, 2026-09-14 CT / 2026-09-15 UTC)

Full record: `docs/brief-005-acceptance.md`. Coordinator independently reviewed
the five-file diff and verified a full committed-source export with fresh
dependencies: typecheck -> 74/74 tests plus native compatibility -> build,
with no prebuilt UI assets. Configured-tree checks and the original
missing-bundle reproduction also pass.

[GitHub CI run 34911908899](https://github.com/tinatsntx/project-visual-team/actions/runs/34911908899)
is green for the exact published SHA. Render deploy `dep-dak8pcgu01pc73e87ipg`
went live at `2026-09-15T00:10:05.868838Z`. Hosted JS equals the built file
byte-for-byte, CSS matches, all 22 `$$` and both `$&` sequences survive, and
no bundle placeholder remains. Both declared CSP domain lists remain empty.

Fresh standard Chat on Pro renders task `vt_d19303607167b41f2d5d7c84` with
correct title, PLANNING state, Alex ASSIGNED, and the reported task-start event.
Fullscreen and return to inline pass. No stale/unavailable banner appeared
during healthy observation. This is a smoke test of the resource fix; the
real native-event/recovery evidence below remains separate. No new hook event
or precise latency measurement is claimed. Remaining M0 gates stay open.

## Brief 004 live acceptance (d39e5e3, 2026-09-14, 23:38–23:49 UTC)

Full record: `docs/brief-004-acceptance.md`.
Coordinator reran 71 tests, typecheck, build, compatibility checks and the six
original probes successfully; local same-widget recovery passed. Reviewed SHA
was pushed to main and deployed to Render at 23:40:18.006687 UTC.

Fresh Pro standard Chat conversation
[Render existing task](https://chatgpt.com/c/6aa88689-1114-83ea-aef7-ae10731d5c0c)
rendered Codex-created task `vt_1981d9b116e79e0aecc38440` once. A single native
date read generated event `hook_1789429477625_rxkfy0eg` at 23:44:37.624 UTC.
It appeared in the same expanded details panel as observed activity, without
reload, manual injection, or another ChatGPT render. Backend count 1 -> 2.
Criterion 6 passes for this tested CLI/web path. Task stayed PLANNING.

Fullscreen and return worked; dark UI was readable. Temporarily blocking only
this tab's MCP call request path made the real widget stale with last-confirmed
time 18:46:50 CT. Failed retry kept that time; restoring requests and retrying
cleared the banner in the same view, preserving both events and expanded details.
Test network overrides were removed; normal settings confirmed CSP enforcement
remains ON. This is connection-failure recovery, not TTL-expiry testing.

Historical failure, resolved by brief 005 above: run `34909845559` failed the transport test because
CI tests before building the widget. Missing-bundle reproduction matches that
assertion; Render builds first and passes. A separate resource-builder check
also proves replacement-string dollar sequences mutate the embedded bundle.
Both were bounded `docs/swe-2-brief-005.md` work. Neither invalidates the observed
native event; neither is claimed as the earlier waiting screen's proven cause.

## Brief 004 review — held before deployment (0e9bcc3, 2026-09-14)

Local candidate `0e9bcc34d8917254808d26a6abe8568d0195b99b` independently passes
typecheck, 54 tests, build, whitespace, configured compatibility/Windows launch
checks, and clean committed-source compatibility verification. Widget 158.7 KB.
GitHub main remains `fd3a5e8`; coordinator did not push or deploy this candidate.

Rebuilt browser harness verifies initialized-gated startup and the bounded
no-data fallback. It also reproduces a false freshness claim: Try again changes
the last-confirmed time from 18:07:41 to 18:07:56 America/Chicago while every read
rejects. Stale views lack the ask-render action. Actual bridge/store diagnostics
reproduce lost split data before React subscription, A's events retained under
task B, mixed globals selecting the old task, and an old read error changing a
terminal task's refresh health to stale.

These failures block acceptance of the candidate despite the passing suite.
See `docs/swe-2-brief-004-follow-up.md` for bounded fixes, the reproducible
diagnostic, evidence limits, and expected regressions; local rows are recorded
in `evals/platform-matrix.md`. They do not establish the earlier ChatGPT hang's
root cause. No new real-host acceptance was attempted with this candidate.
Earlier native backend evidence remains valid; the same-widget event gate is
still open. Render remains active and Sites migration stays paused.

## Platform matrix

PASS describes the specific observed behavior. PARTIAL/PENDING do not pass
the whole surface. A registered web MCP app is not a full portable-package test.

| Surface | Plugin installs/invokes | Inline | Fullscreen | PiP | Live refresh | Automatic Codex event in view | Headless text |
|---|---|---|---|---|---|---|---|
| ChatGPT web | PARTIAL: dev MCP registered; Pro read-only viewer flow passes; full package pending | PASS fresh completed task on 4fb3548 | PASS terminal open/return/host Close on 4fb3548 | PASS completed solo task, actual host PiP/return on 4fb3548; active updates untested | PASS same-widget native update and controlled recovery on d39e5e3, CSP on; earlier timing samples below | PASS: real native event observed in existing view on d39e5e3; subsequent native evidence render on 4fb3548 | Text returned; real-host no-UI fallback pending |
| ChatGPT desktop | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING |
| ChatGPT mobile | PENDING | PENDING | PENDING | PENDING | PENDING | n/a | PENDING |
| Codex desktop | PARTIAL: local package enabled; coordinator task invoked installed render MCP | PENDING | PENDING | PENDING | PENDING | PENDING: GUI runtime not tested | Tool returns readable text; GUI fallback pending |
| Codex CLI | PASS tested package: supported refresh, installed skill start/report/action/finish/render workflow and one active hook | n/a | n/a | n/a | n/a | PASS: one real native PostToolUse reached existing ChatGPT web widget; refreshed skill hook delivery also passes | PASS installed planning and completed render results |

## Earlier acceptance (8ef7822 / Sites port, 2026-09-14, 19:29–19:35 UTC)

Normal native review/trust and enablement of the refreshed installed-root
PostToolUse succeeded. One real native date read in session
`01a0a165-e72d-7392-b8c0-3d6f147928a9` appended observed activity
`hook_1789414476481_471owdl1` at `19:34:36.48Z`; fresh task
`vt_d0f77f031b4c1437abdb0e67` advanced from 1 to 2 events. No manual hook
or event write occurred. The latest ChatGPT widget initially stayed waiting,
and subsequent browser inspection became unresponsive. Backend delivery is
proven; criterion 6's view requirement is still open. Details in native acceptance.

Sites Worker and shared D1 pass 43 local tests, typecheck, native compatibility
verification and build. Private deployment succeeded with declared MCP; normal
browser sign-in/landing passed. Connection lookup returns
`Sites MCP is not enabled for this Site owner.` No remote MCP authentication,
ChatGPT-to-Sites bridge, or native-to-Sites delivery is claimed. Render remains
active. Exact source/deployment IDs and support handoff: `docs/sites-acceptance.md`.

## Brief 003 native acceptance (fd3a5e8, 2026-09-14, 17:50–18:02 UTC)

Configured working tree: typecheck, 38 tests plus compat verifier, build,
and whitespace checks pass. Clean committed-source export fails the new
compat verifier's hosted-URL pin: committed source uses localhost. Keep
these results separate; local coordinator URL/app configuration is uncommitted.

Installed `visual-team@visual-team-native` 0.1.0; artifact/cache copies match.
Disabled `visual-team@personal` through native controls and verified settings.
Bundled CLI 0.154.0-alpha.6.2 lists one PostToolUse and the Visual Team M0 app.
Reviewed/trusted only that hook normally, then started a fresh native session.

Session `01a0a110-2583-74d3-8d28-ece5f1b5c1f6`:

- Native render from the compatibility plugin completed 17:57:12.776 UTC.
- Harmless native action completed 17:57:17.612 UTC, exit 0.
- CLI displayed two hook failures, each exit 1. Its final model summary
  incorrectly said it observed no hook warning; runtime UI takes precedence.
- Task `vt_ee1c538478731e24cabb3635` remained at eventCount 1 at 17:57:49 UTC.
  The already-open ChatGPT panel retained only its starting event. No manual
  hook/event call and no new model render in that panel during the action.

The `./hooks/...` launch path resolves under the task directory, where the
script is absent; installed-script syntax check passes. Pinned Codex source
supports `${PLUGIN_ROOT}` substitution before launch. Native UI only exposed
exit 1; launch-path diagnosis combines source and offline syntax/path checks.
Details/source links: `docs/native-acceptance.md` and
`docs/swe-2-brief-003-follow-up.md`.

After testing, disabled the failed hook through normal `/hooks` controls:
installed 1 / active 0. Compatibility plugin remains enabled; old portable
plugin disabled; all test sessions exited. **Brief 003 partially verified,
not accepted end to end.** Fix launch path and clean-check reproducibility
before broader brief 004 work. No server/UI redeployment was required.

## Earlier native acceptance (2026-09-14, through 16:33 UTC)

Executed the bounded native test; full record and source links in
`docs/native-acceptance.md`. CLI 0.149.0 lists the skill and MCP but no plugin
hooks/apps, and cannot run the configured model. Existing desktop-bundled
CLI 0.154.0-alpha.6.2 runs the model and installed render tool successfully.
Its truthful text identifies planning/assigned/solo. Native harmless shell
action exits 0 at 16:32:06 UTC. Skill workflow and desktop GUI are not implied.

Both runtimes list PostToolUse installed 0 / active 0. No native event arrived:
the pinned task retained eventCount 4 at 16:32:38 UTC and the open ChatGPT
panel retained only task start plus the three earlier manual QA probes.
No manual hook/event injection, trust bypass, or permission change was used.
Test sessions were closed; global CLI installation remains unchanged.

The version-pinned 0.149.0 and 0.154.0 loaders skip hooks/apps for AgentPlugin
format, matching the actual inventory. A root portable manifest takes
precedence over a compatibility overlay. **Criterion 6 FAILED on this
combination.** `docs/swe-2-brief-003.md` requests a bounded generated native
compatibility distribution; native command delivery must be retested after
discovery is fixed. This does not justify a live-refresh architecture pivot.

## Acceptance of 31d4165 (2026-09-14, 16:04–16:11 UTC)

Coordinator reviewed the actual diff and reran typecheck, **38/38 tests**,
build, and whitespace checks. Widget JS 152.1 KB, CSS 3.5 KB, dev host 460.1 KB.
Render deploy `dep-dak1maid0e5s738c9kdg` went live at
`2026-09-14T16:05:36.107Z` with the current SHA. Health HTTP 200;
resource 159513 bytes, new colors/mode subscription present, old writing text
absent, same empty CSP domain lists. No error logs in the checked post-deploy
window through 16:07:01 UTC.

[Current QA: Start visual task](https://chatgpt.com/c/6aa81bf1-cd7c-83ea-8ce8-86707bcf2061),
task `vt_3ca66268d496238950b27f25` / Fresh ChatGPT build acceptance:

- The existing conversation still rendered old code after app Refresh.
  A fresh Chat conversation loaded the new widget. Actual DOM colors were
  background `rgb(32,33,36)`, foreground `rgb(241,243,244)`, muted `#c5cbd5`;
  the rendered HTML contained the new mode subscription. Old-conversation
  behavior must not be used to judge the deployed fixes.
- Dark theme visually readable; fullscreen says only Alex owns the lead
  track while Alex is assigned. No ongoing-writing claim.
- New widget Open team -> fullscreen observed in 1125 ms, Back to chat ->
  inline in 1104 ms, and **ChatGPT host Close** -> inline in 1253 ms.
  These include automation overhead; they are observations, not a formal
  animation benchmark. Host-initiated close is verified on real ChatGPT.
- CSP remains enabled. Three explicitly synthetic manual MCP PostToolUse
  probes updated the still-expanded evidence panel without another render.

| Sample | Request start (epoch ms) | Server response (epoch ms) | UI observed (epoch ms) | Request-to-observed upper bound |
|---|---|---|---|---|
| QA-probe-01 | 1789402209933 | 1789402210240 | 1789402213530 | 3597 ms |
| QA-probe-02 | 1789402221115 | 1789402221417 | 1789402224828 | 3713 ms |
| QA-probe-03 | 1789402232743 | 1789402233107 | 1789402236586 | 3843 ms |

All three satisfy the <5 s target in these normal test samples. Observation
includes tool scheduling/inspection delay and is an upper bound, not exact
paint latency. Synthetic probes are not native Codex hook evidence.

Paired stylesheet contrast recalculated locally (foreground/background pairs):

| Theme | Main text | Muted text | Info | Success | Warning | Danger | Focus vs background | Button text |
|---|---|---|---|---|---|---|---|---|
| Light | 15.80 | 7.56 | 6.24 | 6.61 | 6.01 | 6.52 | 6.24 | 6.24 |
| Dark | 14.46 | 9.87 | 9.36 | 10.89 | 11.68 | 9.48 | 10.20 | 8.93 |

These ratios validate the tested token pairs, not every accessibility criterion.

Rebuilt harness acceptance:

- Solo synthetic completion accepted as **reported**, clearly labeled;
  final poll #8 at 16:05:25 UTC. Host controls switch fullscreen/inline at
  16:05:56/58 while completed, with no new polls or iframe initialization.
- Permission fixture completion rejected at 16:06:37 UTC; diagnostics say
  REJECTED and WAITING_FOR_USER; later polls remain waiting.
- Rejected/unsupported mode handling passes the focused unit suite; no real
  ChatGPT rejection was forced. Real-host terminal switching is still pending:
  current public tools cannot emit task_finished, and Stop is non-terminal.

**Brief 002 accepted on these tested paths.** No additional coding brief is
needed for these four findings. Native automatic hooks and remaining M0 rows
remain open. Installed package/source/cache configuration and hook bytes match;
hook trust has not been bypassed. See `docs/native-acceptance.md`.

## Earlier real ChatGPT web evidence (0446a77)

[QA conversation: Start visual task](https://chatgpt.com/c/6aa81270-6560-83ea-9a23-99fa58ad1dd2),
owner's **Visual Team M0** development app, Chrome on Windows, dark theme.
Endpoint/app IDs are in HANDOFF. Synthetic task:
`vt_bf659ee601d57063f57eea0f`, title `ChatGPT M0 live check`.

1. ChatGPT invoked start then render once. Fresh iframe showed correct title,
   Alex assigned, planning state. Initial reported event: 10:28:07 AM CT.
2. Coordinator manually ran the bundled PostToolUse script against Render,
   with pinned task ID and synthetic correlation metadata. The
   10:29:29 AM CT `activity / observed / tool: Bash` event appeared in the
   existing widget. Evidence stayed expanded; no new model render call.
3. Fullscreen opened and eventually displayed the fullscreen sections;
   return to chat worked. Internal layout changed on a later data poll
   instead of immediately. Brief 002 covers this.
4. Owner authorized enabling **Enforce CSP in developer mode**. Verified its
   switch on, reloaded the conversation, and observed widget initialization.
   A second manual PostToolUse at **10:33:39 AM CT** appeared in the open
   evidence panel; `No recent activity` became `Task is planning`.
   Fullscreen worked under enforcement. The setting remains on.

These synthetic manual hook payloads are **not automatic Codex lifecycle
evidence**. Their displayed `observed` provenance reflects the mapper,
not proof that Codex emitted these test payloads.

## Refresh method (plan §7.4)

**Method 1 works on ChatGPT web:** widget calls `get_visual_task` through
standard MCP Apps `tools/call`, capability only in request `_meta`.
The render result supplies snapshot/private capability. Actual updates prove
usable private delivery and authorized reads on this host. We did not
inspect/log the secret or determine which initialization fallback was used.

Active tasks poll every 4 seconds. No direct iframe fetch, SSE, or WebSocket
fallback was needed. Details remained expanded during updates.
The initial run did not measure latency; the three current-build upper-bound
samples above now verify under five seconds for those requests.

Declared CSP: `connectDomains: []`, `resourceDomains: []`. Functional testing
passed with ChatGPT enforcement enabled. This is not a complete network audit.

## Earlier local and hosted verification (0446a77)

Coordinator reran typecheck, **34/34 tests**, build, and diff whitespace check.
esbuild sizes: widget JS 151.0 KB, dev host 459.5 KB, CSS 3.2 KB.

- HTTP regression uses actual registered handlers: start/render/event/read;
  missing/wrong/cross-task private metadata rejected. Expiry has separate
  repository coverage, not an HTTP expiry test.
- Render deploy `dep-dak13o6k1f9s73ajm3ng` live at
  `2026-09-14T15:25:57.418Z`, service `srv-dak13nmk1f9s73ajm0dg`.
- Hosted health returned `ok: true`; initialize/tools discovery returned the
  four M0 tools. Fresh start/render/private read succeeded; missing token failed.
- Hosted probe found no capability in content/structuredContent. Printed only
  booleans/counts, never token values.
- Resource: `text/html;profile=mcp-app`, 158147 bytes, empty CSP domain lists;
  descriptor points to `ui://visual-team/task-v1.html`.
- Earlier local hook test verified allowlist stripping and exit 0 with
  synthetic stdin. Hosted manual probes confirm delivery.
- Stateless transport behavior and fixtures do not prove native host support.

## Earlier rebuilt harness (0446a77)

Visually tested 2026-09-14, superseding the earlier environment-blocked note.
Uses shared render-result builder and fresh per-run capability.

- Inline/fullscreen both render.
- Permission fixture reaches WAITING_FOR_USER; auto-finish is rejected.
  Widget correctly keeps waiting/polling; dev log falsely claims terminal.
- Solo fixture reaches COMPLETED at 10:26:02 AM CT. Final poll #8 at 10:26:04;
  no later polls appeared through the observation after 10:26:20.
- Harness currently reloads on display-mode changes; it cannot establish
  real-host terminal mode reactivity.

## Local package installation

CLI 0.149.0 installed/enabled portable `visual-team@personal` 0.1.0; listing
readback passed. Installed MCP URL/app mapping match coordinator config.
Paths in HANDOFF.

The subsequent native test above proves installed MCP invocation and text,
but automatic hook discovery failed. Hook trust was not granted/bypassed.
Retesting needs the compatible artifact, hosted `VISUAL_TEAM_MCP_URL`, current
task ID, and normal native trust review. The hook's localhost default is
independent of mcp.json.

## Hard GO criteria (plan §14)

| # | Criterion | Result | Evidence / next requirement |
|---|---|---|---|
| 1 | Plugin installs and invokes without editing source | PASS on supported path | Supported native package refresh, installed skill/tool/hook readback and actual workflow pass on 4fb3548; no source edits needed for invocation; broader surfaces remain unverified |
| 2 | Inline UI renders reliably | PASS on tested web path | Fresh completed 4fb3548 Pro render passes; same-widget connection recovery passed on d39e5e3; other surfaces pending |
| 3 | Fullscreen works | PASS on tested web flow | Terminal open/back/host Close pass on 4fb3548 |
| 4 | PiP works, or platform limitation plus inline fallback | PASS on tested web flow | Completed solo task in actual host PiP, usable return control and inline restoration; other hosts/active updates untested |
| 5 | Refresh without recreating experience each event | PASS in tested web flow | Real native event appeared in same expanded panel; earlier three samples <5 s retained; no new precise timing measurement |
| 6 | Real Codex lifecycle event reaches view | PASS for CLI -> ChatGPT web | Automatic event hook_1789429477625_rxkfy0eg observed in existing widget; no manual injection or second ChatGPT render |
| 7 | Useful text without custom UI | PASS for native CLI case | Installed render returned truthful planning and completed-task text during the genuine skill workflow |
| 8 | No prompt/transcript/command/code needed for state | PASS for bounded cases | Allowlist tests and synthetic metadata-only flow; not a general security certification |

## Findings and decisions

2026-09-15 closeout: M0 is complete for the supported path. Earlier references
below to an open M0 gate describe the decision at the time of each test.
Compatibility, expiry/rejection UX, and active PiP follow-ups are tracked for
later validation, not new feasibility blockers. Start SWE-2 brief 006.

The four confirmed findings listed below describe **0446a77** and are fixed
in **31d4165** on the accepted paths above. They are retained as historical
evidence, not current defects.

- Brief 001 is resolved on tested ChatGPT web. Continue M0; no live-refresh
  pivot is indicated.
- Confirmed: fullscreen says Alex `is writing` while only assigned;
  ownership is not evidence of current activity.
- Confirmed: secondary text is visibly low contrast in ChatGPT dark theme;
  fixed `#57606a` is used against dark Canvas. No numeric ratio claimed.
- Confirmed: mode layout waits for later task render; source lacks reactive
  mode subscription. Terminal failure is an inference requiring regression.
- Confirmed: harness claims completion when reducer rejects it.
- Four bounded fixes: `docs/swe-2-brief-002.md`, now accepted as described above.
- Native event into ChatGPT, connection-error recovery, native skill workflow,
  terminal web modes, and completed-task web PiP now pass. Remaining surfaces,
  actual expiry UX, rejected mode requests, and active PiP updates remain open.
  No App Server integration was needed. Brief 005 and M0 fixes are accepted.
- Free hosting, in-memory tasks, development No Auth registration: M0 testing,
  not public release readiness.
