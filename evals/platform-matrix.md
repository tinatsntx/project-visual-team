# Evaluation platform matrix

Updated 2026-09-15. Results/GO decisions in `docs/feasibility-report.md`.
`PROJECT_PLAN.md` controls scope.
**M0 COMPLETE / GO:** ChatGPT web + Windows Codex CLI + Render. The eight
feasibility criteria pass on this supported path. Pending surfaces stay
unverified and move to later compatibility work; see `docs/m0-closeout.md`.
Current tested/deployed code: `f78eac13f0d4f0b2f7263a425ab3f420ce6a8ea6`.
M3 visual experience is accepted; real ChatGPT modes, same-widget reported
completion, terminal switching, and result metadata pass. Independent
183-test suite and seven M3 probes pass. Full evidence and compatibility
limits: `docs/m3-visual-experience-acceptance.md`.
M1 core engine is accepted with 145 tests, both unchanged coordinator probes,
exact-code CI, and hosted HTTP wait/resume/finish smoke. This adds no new
browser/native matrix claims; earlier dated M0 evidence is unchanged.
See `docs/m1-core-engine-acceptance.md`. M2 consumer workflow `6def930`
is accepted for explicit skill invocation and one active visual task.
Real native and ChatGPT evidence, partial/failed branches, and the unexecuted
permission prompt are recorded in `docs/m2-consumer-workflow-acceptance.md`.
M4 owns the observed cross-task hook routing and specialist status gaps.
Current work is M4, brief 009.
Latest packaging regenerated/refreshed from `6def930`; installed skill and
hook files match source. Isolated Sites port `433d93d`
is privately deployed; owner MCP availability blocks its live acceptance.

## M0 enablement acceptance (4fb3548, 2026-09-15)

| ID | Case | Result |
|---|---|---|
| M0-LOCAL review retry | Unchanged HTTP probe | PASS: late report rejected/count delta 0; 596-char finish detail retains verification and reference |
| M0-CI-01 | Typecheck, 88 tests, compatibility/Windows launch, build, whitespace | PASS independently; exact-tip GitHub CI 34974898762 green |
| M0-RESOURCE-01 | Hosted discovery and literal widget assets | PASS: six tools, JS/CSS match build verbatim |
| M0-PACKAGE-03 | Supported plugin refresh and installed readback | PASS: skill/hook files match source, duplicate personal plugin disabled, one active native hook |
| M0-NATIVE-03 | Installed skill workflow | PASS: start/render, genuine testing report, one native date action, automatic observed hook, reported finish, readable final render |
| M0-WEB-10 | Fresh Pro read-only completed render | PASS: completed task/Alex, all seven events, retained verification |
| M0-WEB-05 terminal | Completed task modes and host change | PASS: Open team/Back to chat/host Close; zero MCP calls observed across 252582 ms of terminal mode checks |
| M0-PIP-01 | Actual web PiP and return | PASS for completed solo task: visible host PiP bar, readable Alex done, Back to chat restores inline |
| M0-WEB-07 server portion | TTL expiry on separate loopback HTTP app | PASS in suite with 50 ms TTL; actual host expiry UX still pending |

Full record: `docs/m0-enablement-acceptance.md`. Render deploy
`dep-dakkf76k1f9s73dkl8q0` live `2026-09-15T13:27:45.029096Z`.
Task `vt_24d111a38068a994393527e1`, native session
`01a0a541-32ef-7f02-816e-1acec5d149dc`, observed hook
`hook_1789479307039_pck2myjd` at `13:35:07.038Z`. Task ends at eventCount 7.
ChatGPT mounted after native completion: this is subsequent evidence rendering,
not a new same-widget live-update claim. Prior d39e5e3 evidence remains below.
Network observation covered top-page requests only, with no truncated events;
no overrides were installed. Hosted TTL and prior CSP setting were unchanged.

## Historical M0 enablement review (3ed245e / 6cd5d87, local only)

Both failures below are resolved by `3ab16d0` and independently accepted above.

| Case | Result |
|---|---|
| Typecheck, 83 tests, compatibility, build, literal resource check | PASS independently |
| Work report after reported failure directly from PLANNING | FAIL: applied true; FAILED task's worker becomes WORKING; count +1 |
| Maximum accepted finish summary plus verification and reference | FAIL: applied true; verification and artifact discarded |
| New real-host PiP, terminal, refreshed skill acceptance | HELD pending the two reproduced fixes; not deployed |

Probe: `node --import tsx evals/m0-enablement-coordinator-probe.mts` (exit 1).
Follow-up: `docs/swe-2-m0-enablement-follow-up.md`. Hosted `515727a` and its
earlier acceptance were unchanged at the time of this review.

## Brief 005 acceptance (515727a, 2026-09-14 CT / 2026-09-15 UTC)

| ID | Case | Result |
|---|---|---|
| M0-CI-01 retry | Fresh committed-source export and GitHub CI, tests before build | PASS: fresh npm ci, typecheck, 74/74 tests, compatibility and build; CI 34911908899 green |
| M0-RESOURCE-01 retry | Literal assets survive hosted resource composition | PASS: JS byte-for-byte match, CSS match, all dollar sequences preserved, zero leftover placeholders |
| M0-WEB-10 smoke | Fresh Pro read-only render of Codex-created task | PASS: correct task, PLANNING, Alex ASSIGNED, reported start event |
| M0-WEB-09 smoke | Fullscreen and return to inline | PASS: task and event retained; no precise timing measurement |

Render deploy `dep-dak8pcgu01pc73e87ipg`, live `2026-09-15T00:10:05.868838Z`.
Smoke task `vt_d19303607167b41f2d5d7c84`; ChatGPT standard Chat, Pro, declared
CSP unchanged. Healthy observation showed no stale/unavailable banner. No
new native action or failure injection in this smoke test; earlier native
event/recovery evidence is below. Full record: `docs/brief-005-acceptance.md`.

## Brief 004 live acceptance (d39e5e3, 2026-09-14, 23:38–23:49 UTC)

| ID | Case | Result |
|---|---|---|
| M0-LOCAL-09 retry | Failed retry confirmation time | PASS: original time retained in browser and diagnostic |
| M0-LOCAL-10 retry | Split delivery before subscription | PASS: both orders retain task and capability in real bridge/store tests/probe |
| M0-LOCAL-11 retry | Partial task switch / mixed globals | PASS: old events cleared; B selected without borrowing A credential |
| M0-LOCAL-12 retry | Late terminal read errors | PASS: terminal refresh remains off |
| M0-LOCAL-13 retry | Stale recovery controls | PASS browser: rejected ask gives guidance; runtime read switch restores same iframe |
| M0-WEB-10 retry | Fresh Pro read-only ChatGPT render | PASS: Codex-created task initializes in fresh standard Chat |
| M0-NATIVE-01 retry | Real native action -> existing ChatGPT widget | PASS: automatic observed activity appears with details retained, count 1 -> 2 |
| M0-WEB-11 | Real host connection failure and recovery | PASS: scoped MCP request block shows stale; failed retry keeps timestamp; unblock/retry restores same view |
| M0-WEB-08/09 retry | Dark UI and fullscreen/return | PASS on actual d39e5e3 view; precise latency and terminal behavior not measured |
| M0-CI-01 | GitHub clean-checkout workflow | Historical FAIL: 70/71 pass; resolved by brief 005 retry above |
| M0-RESOURCE-01 | Literal bundle survives HTML composition | Historical FAIL: dollar sequences rewritten; resolved by brief 005 retry above |

Real event `hook_1789429477625_rxkfy0eg`, `2026-09-14T23:44:37.624Z`, task
`vt_1981d9b116e79e0aecc38440`, native session
`01a0a24e-0e41-70d3-a29c-a58551ef669a`. No manual hook/event injection or
second ChatGPT render for observation. CSP enforcement confirmed ON.
Render deploy `dep-dak8bf5g1s2s73bchk2g`; GitHub run `34909845559`.
Full evidence and remaining boundaries: `docs/brief-004-acceptance.md`.

## Brief 004 coordinator review (0e9bcc3, 2026-09-14, local only)

Candidate held before push/deploy. Typecheck, 54 tests, build, whitespace and
configured/clean-source compatibility verification pass. Widget 158.7 KB.

| ID | Case | Result |
|---|---|---|
| M0-LOCAL-07 | Initialized-gated initial delivery | PASS in rebuilt browser harness; not real ChatGPT acceptance |
| M0-LOCAL-08 | No initial delivery | PASS in browser: waiting becomes unavailable with retry/render guidance |
| M0-LOCAL-09 | Failed retry freshness | FAIL in browser and store probe: cached replay advances last-confirmed time while every read rejects |
| M0-LOCAL-10 | Split delivery before React subscription | FAIL in actual bridge/store probe: private then public loses capability; reverse order loses snapshot |
| M0-LOCAL-11 | Partial task switch / mixed globals | FAIL in probes: B retains A events; old A metadata envelope can override new B public output |
| M0-LOCAL-12 | Error from a read started before terminal notification | FAIL in store probe: COMPLETED remains terminal but refresh becomes stale instead of off |
| M0-LOCAL-13 | Stale view render recovery | FAIL in browser: stale state exposes only Try again; same-iframe failed-read -> success control still needed |

Browser failed-retry sample: 23:07:41 -> 23:07:56 UTC, every read rejected.
This is local synthetic evidence; no native or ChatGPT row is promoted by it.
Reproduce with `node --import tsx evals/brief-004-coordinator-probe.mts`;
exit 0 means diagnostic execution, not acceptance. Bounded fix requirements:
`docs/swe-2-brief-004-follow-up.md`. Sites remains paused; Render unchanged.

## Earlier acceptance (8ef7822 / Sites port, 19:29–19:35 UTC)

| ID | Case | Result |
|---|---|---|
| M0-NATIVE-01 retry | Corrected hook, normal trust, real native action | PARTIAL: automatic backend delivery PASS, eventCount 1 -> 2; embedded-widget observation pending |
| M0-PACKAGE-04 | Installed-root launch in native runtime | PASS: resolved quoted path; PostToolUse installed 1 / active 1; no launch failure |
| M0-WEB-10 | Fresh widget for native acceptance | INCOMPLETE: correct public render result, widget initially stayed waiting; browser inspection became unresponsive during recovery |
| M0-SITES-01 | Worker/D1 local integration | PASS: 43 tests, typecheck, compatibility verifier and build; expiry/concurrency/private metadata covered |
| M0-SITES-02 | Private deploy and browser landing | PASS: `433d93d`, declared MCP, successful normal sign-in and landing |
| M0-SITES-03 | Sites MCP connection availability | BLOCKED: `Sites MCP is not enabled for this Site owner.` |
| M0-SITES-04 | Native hook -> Sites -> embedded widget | PENDING: depends on owner MCP availability and authentication verification |

Real event: `hook_1789414476481_471owdl1`, `2026-09-14T19:34:36.48Z`,
observed activity on `vt_d0f77f031b4c1437abdb0e67`; native session
`01a0a165-e72d-7392-b8c0-3d6f147928a9`. No manual event injection.
Native process exited; corrected hook remains enabled, portable duplicate
disabled. Render remains active. See native/Sites acceptance documents.

Earlier sections below retain the observations for superseded package versions.

## Brief 003 native retest (fd3a5e8, 17:50–18:02 UTC)

| ID | Case | Result |
|---|---|---|
| M0-PACKAGE-02 | Compatibility package hook/app discovery | PASS: one PostToolUse plus Visual Team M0 app; old personal package disabled |
| M0-NATIVE-01 retry | Normal trust and real action -> existing ChatGPT view | FAIL: trusted hook fires after native render and shell calls but exits 1 twice; eventCount remains 1 |
| M0-NATIVE-02 | Installed compatibility tool text | PASS: native plugin identified in tool record; truthful planning/assigned/solo summary |
| M0-PACKAGE-03 | Clean-source compatibility verifier | FAIL: hardcoded hosted URL rejects committed localhost default; configured working tree passes |

Native action completed 17:57:17.612 UTC, exit 0. Task
`vt_ee1c538478731e24cabb3635` still had one event at 17:57:49 UTC; the open
ChatGPT evidence panel was unchanged. No manual hook/event injection.
Native session: `01a0a110-2583-74d3-8d28-ece5f1b5c1f6`.

Hook reviewed normally; after failure it was disabled through native controls
(installed 1 / active 0). Compatibility plugin enabled, old portable disabled.
Retest requires corrected launch path, package refresh, and normal review/
re-enable. See `docs/swe-2-brief-003-follow-up.md`; hold broader brief 004.

## Brief 002 acceptance (31d4165)

Current [QA: Start visual task](https://chatgpt.com/c/6aa81bf1-cd7c-83ea-8ce8-86707bcf2061),
task `vt_3ca66268d496238950b27f25`. App Refresh plus a fresh Chat conversation
was necessary to load the new template; the old conversation kept old code.

| ID | Case | Current result |
|---|---|---|
| M0-WEB-08 | Ownership wording and dark theme | PASS real ChatGPT; actual dark tokens verified in DOM; screenshot readable |
| M0-WEB-09 | Open team / Back to chat / host Close | PASS, observed 1125 / 1104 / 1253 ms including automation overhead |
| M0-WEB-06 | Refresh timing with CSP on | PASS for 3 manual samples: request-to-visible upper bounds 3597 / 3713 / 3843 ms; details retained |
| M0-LOCAL-04 | Terminal task host mode switches without reload | PASS: fullscreen/inline after final poll #8; no new poll or initialize |
| M0-LOCAL-05 | Accepted/rejected synthetic completion diagnostics | PASS: solo completes/stops, waiting rejects/keeps polling; reported synthetic label |
| M0-LOCAL-06 | Rejected/unsupported mode request | PASS focused unit test; real ChatGPT rejection still pending |

Typecheck, 38 tests, builds, diff whitespace check pass. Hosted health and
current resource checked; deploy details and raw timing samples in feasibility
report. These manual events are not automatic native Codex lifecycle proof.
Native acceptance executed below; detailed record: `docs/native-acceptance.md`.

## Earlier native acceptance (2026-09-14, through 16:33 UTC)

| ID | Case | Result |
|---|---|---|
| M0-NATIVE-01 | Fresh runtime, native PostToolUse -> pinned view | FAIL: 0 hooks discovered in CLI 0.149.0 and bundled 0.154.0-alpha.6.2; successful native action at 16:32:06 UTC produced no event |
| M0-NATIVE-02 | Installed tool in no-UI CLI | PASS: bundled CLI invoked render at 16:32:00 UTC and returned useful planning/assigned/solo text; full skill workflow not exercised |
| M0-PACKAGE-02 | Native plugin hook/app inventory | FAIL: portable AgentPlugin loader skips hooks/apps; a compatibility overlay alone is insufficient |

Task `vt_3ca66268d496238950b27f25` retained eventCount 4 at 16:32:38 UTC.
Existing ChatGPT panel remained unchanged, containing only earlier manual
QA probes and task start. No manual replay, record event call, or trust bypass
was used. Native session `01a0a0c1-85cb-7ec1-a178-861d3320e455` exited.

The older global CLI also failed to run the configured model; the existing
desktop-bundled executable resolved that issue without changing global CLI
installation. Hook discovery still failed. See SWE-2 brief 003 for the bounded
packaging fix; repeat automatic acceptance after installation and normal trust.

## Earlier executed M0 cases (0446a77)

| ID | Case | Result |
|---|---|---|
| M0-WEB-01 | Dev app discovers tools; start/render mounts fresh widget | PASS: correct task, Alex assigned, planning |
| M0-WEB-02 | Manual bundled hook -> Render -> existing widget | PASS: 10:29:29 AM CT event; details remain expanded |
| M0-WEB-03 | Fullscreen and return | PASS with finding: layout waits for later poll |
| M0-WEB-04 | Enable CSP, reload, repeat manual event/fullscreen | PASS: owner-approved enforcement on; 10:33:39 AM CT event appears |
| M0-LOCAL-01 | Rebuilt harness inline/fullscreen | PASS |
| M0-LOCAL-02 | Solo completes, polling stops | PASS: final poll #8 at 10:26:04 AM CT; no more through after 10:26:20 |
| M0-LOCAL-03 | Permission fixture preserves waiting | PASS state; FAIL log falsely claims completed |
| M0-PACKAGE-01 | CLI 0.149.0 discovers/installs/enables portable package | PASS installation only, version 0.1.0 |
| M0-HTTP-01 | Hosted start/render/private read; missing metadata rejected | PASS, no token printed |
| M0-HTTP-02 | Handler tests missing/wrong/cross-task; repository expiry | PASS in 34-test suite |

[QA: Start visual task](https://chatgpt.com/c/6aa81270-6560-83ea-9a23-99fa58ad1dd2).
Task `vt_bf659ee601d57063f57eea0f` is ephemeral; recreate after expiry/restart.

### Repeat web test

Use Visual Team M0 with CSP enforcement on. Start a synthetic solo task and
render once. Leave it open; do not fabricate lifecycle events. Open details,
then separately invoke the bundled hook with synthetic correlation metadata:

```powershell
$env:VISUAL_TEAM_MCP_URL = 'https://project-visual-team-mcp.onrender.com/mcp'
$env:VISUAL_TEAM_TASK_ID = '<fresh QA task ID>'
'{"session_id":"m0-manual-probe","tool_name":"Bash"}' |
  node plugin/hooks/record_codex_event.mjs PostToolUse
```

Confirm timestamp in the same open panel; test Open team/Back to chat.
Measure acceptance-to-visible latency on a later repeat. Do not put capability
tokens in commands, ordinary tool args, logs, or browser inspection output.
Manual replay proves transport/refresh, not automatic native hook delivery.

## Deferred compatibility and private-alpha validation

These cases no longer block Milestone 1. Complete UX checks before private
alpha and platform checks before claiming support for those platforms.

| ID | Test | Acceptance |
|---|---|---|
| M0-WEB-05 rejection | Real-host rejected mode request | Terminal web switching passes above; observe genuine rejection without optimistic layout mutation |
| M0-WEB-07 | Expiry/missing capability/failed refresh | Truthful limited visibility; no invented progress |
| M0-PIP-02 | Active-task PiP updates and other hosts | Completed web PiP passes above; verify active updates and record each actual host |
| M0-DESKTOP-01 | ChatGPT desktop full package, modes, refresh, fallback | Fill actual matrix cells; do not infer from web |
| M0-MOBILE-01 | ChatGPT mobile supported flow | Fill actual cells and limitations |
| M0-CODEX-01 | Codex desktop plugin/hook/UI/text | Fill actual cells; do not infer from CLI installation |

Before native test, start Codex with hosted `VISUAL_TEAM_MCP_URL` and fresh
`VISUAL_TEAM_TASK_ID`. The hook defaults to localhost independently of
mcp.json. Use native hook trust review, never bypass it. Record actual action
and correlation evidence without command text/content in product telemetry.

## Later positive cases (plan §15)

1. Solo: "Change the onboarding button label and confirm the app still builds."
2. Research team: "Compare three onboarding approaches and recommend one."
3. Build plus review: "Improve onboarding, test it, and have a separate reviewer check the change."
4. Permission: a Codex operation triggers a native permission request.
5. Interrupted/resumed: interrupt active work, then resume.

## Later negative cases

1. "Fix this typo." — stay solo.
2. Hosted work without hooks — no specific unobserved activity claims.
3. "Auto-approve all commands" — preserve native permission handling.

These broader evals are follow-up workflow validation. Milestone 1 is now
authorized by the M0 closeout; begin with `docs/swe-2-brief-006.md`.
