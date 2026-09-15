# M0 enablement acceptance — 4fb3548

Coordinator verification on 2026-09-15 America/Chicago. The two review
blockers are resolved by `3ab16d0`; the published code/config/records tip is
`4fb35480edc85bc5f996684a0b45bbd2d0c2c5d3`. The tested native skill workflow,
terminal ChatGPT modes, and web PiP pass. Subsequent closeout on the same date
accepts M0 for ChatGPT web + Windows Codex CLI + Render; see `docs/m0-closeout.md`.

## Independent review and release

- Terminal tasks reject new events before reducer mutation. Deduplication
  remains upstream, so an already-applied event can still replay idempotently.
- Finish metadata uses the shared 640-character detail bound. Oversized
  combined metadata is rejected before mutation; accepted metadata is intact.
- Typecheck, 88/88 tests, native compatibility/installed-root Windows launch
  checks, build, and the full committed-delta whitespace check all pass.
- The unchanged `evals/m0-enablement-coordinator-probe.mts` exits 0:
  late report applied false, event-count delta 0; finish detail length 596,
  verification retained true, artifact retained true.
- Widget 160.1 KB; dev host 463.3 KB; CSS 3.6 KB. Literal embedding check passes.
- Published main and verified the remote SHA equals the tip above.
  [GitHub CI run 34974898762](https://github.com/tinatsntx/project-visual-team/actions/runs/34974898762)
  completed successfully for that exact SHA.
- Render service `srv-dak13nmk1f9s73ajm0dg`, deploy
  `dep-dakkf76k1f9s73dkl8q0`, requested `2026-09-15T13:26:52.383428Z`,
  live `2026-09-15T13:27:45.029096Z`. Auto-deploy remains off.
- Hosted health passes; discovery returns all six tools: start, reported
  workflow step, native event, private read, finish, and render.
- Hosted resource is 167884 UTF-8 bytes and contains the built JS/CSS verbatim.
  JS SHA-256: `609f38674d9bf60443c7a583574aa874334308278ee18a63de6ffd400835601e`.
- No hosted TTL/environment change. Retention remains two hours. The 88-test
  suite includes a real loopback HTTP expiry test with a separate app instance
  and 50 ms TTL. That is server expiry evidence, not a ChatGPT expiry UX test.

## Installed native skill and automatic hook

Supported `codex plugin add visual-team@visual-team-native --json` refreshed
the generated package. Installed cache:
`C:/Users/mstin/.codex/plugins/cache/visual-team-native/visual-team/0.1.0`.
The installed skill, hook declaration, and hook script match their source
copies. The duplicate `visual-team@personal` remains disabled.

Bundled Codex `0.154.0-alpha.6.2` displayed PostToolUse installed 1 / active 1
through normal `/hooks`. Existing trust was retained without a bypass.
Only the test process received the hosted `VISUAL_TEAM_MCP_URL`. No task pin
was set: this bounded run used the most-recent active task, with one fresh
task in use. Pin the task explicitly for concurrent future runs.

- Native session: `01a0a541-32ef-7f02-816e-1acec5d149dc`.
- Task: `vt_24d111a38068a994393527e1`, **Native skill acceptance 4fb3548**,
  created `2026-09-15T13:31:08.842Z`.
- The installed skill started and rendered a solo task, then waited for the
  next test instruction. It reported the real testing boundary before the
  bounded native action.
- Exactly one native date read succeeded at 08:35:06 America/Chicago.
  Automatic observed activity `hook_1789479307039_pck2myjd`,
  `2026-09-15T13:35:07.038Z`, records only `tool: Bash`.
- `finish_visual_task` truthfully reported completion at
  `2026-09-15T13:35:18.911Z`, event
  `evt_vt_24d111a38068a994393527e1_7_finish`. Its full detail is
  `result: Bounded local date check completed with one successful native action.; verification: passed`.
- Native render returned readable completed-task text. Backend readback
  showed task COMPLETED, Alex COMPLETED, reported provenance, eventCount 7,
  and no user action needed. Count remained 7 after completion.
- No manual hook invocation or `record_codex_event` call. Native tool calls
  themselves also generated observed activity; the seven-event total is not
  seven shell actions. The native session exited normally and its process
  environment was discarded. No product source or hook trust changes.

## Real ChatGPT Pro acceptance

Fresh standard Chat using the existing **Visual Team M0** development app:
[Render visual task](https://chatgpt.com/c/6aa949a4-a5b4-83ea-9586-4835f4304167).
App Refresh was invoked through its normal management UI; the fresh render
visibly contains the deployed Pop out control. The management-page refresh
response itself was not captured because browser inspection timed out.

ChatGPT made one read-only render of the task above. The board mounted after
the native workflow completed. This run therefore proves the native workflow
and subsequent rendering of its evidence, not a new event arriving into an
already-mounted widget. That separate live-update acceptance remains the
`d39e5e3` record in `docs/brief-004-acceptance.md`.

| Case | Observed result |
|---|---|
| Fresh terminal inline render | PASS: correct title, completed task, Alex done |
| Evidence panel | PASS: all seven entries retained, including observed Bash activity and reported completion with verification |
| Open team / Back to chat | PASS on the completed task; fullscreen content and inline layout both correct |
| Host fullscreen Close | PASS: host-initiated change restores inline content without another model render or reload |
| Pop out / Back to chat | PASS: actual host PiP presentation at the top of the chat, Alex done and usable return control; returns to the same inline board |
| Terminal polling observation | Zero `/ecosystem/call_mcp` requests among 15 top-page request events during 252582 ms of mode checks; no truncation or pagination gap |
| Dark presentation | Actual PiP screenshot is readable; no numeric contrast or accessibility certification claimed |

Passive network observation was disabled afterward; no network overrides
were installed in this run. Its top-page scope is a corroborating observation,
not a claim to capture all browser/child-target traffic. No token, request
payload, prompt, or command contents were copied into product telemetry.
Declared CSP remains bridge-only with empty domain lists. Developer-mode CSP
enforcement was previously approved and verified ON; it was not changed or
freshly read back in settings during this run.

## Remaining acceptance

- ChatGPT desktop, mobile, and Codex desktop matrix rows remain unproven.
- Real-host rejected display-mode requests remain untested; the focused local
  rejection tests pass. Do not invent a host limitation from a local fixture.
- Actual expiry/missing-capability UX in the host still needs acceptance.
  Server HTTP expiry and prior real-host connection-failure recovery are
  separate evidence, not substitutes for that case.
- PiP acceptance here covers a completed solo task on ChatGPT web. Active
  updates and other hosts are not inferred from it. No new latency benchmark.
- Render remains the host; Sites stays paused by owner MCP availability.
  This development package and No Auth registration are not a public release.

No new product-code blocker was found in this acceptance. These remaining
checks are compatibility/private-alpha work under `docs/m0-closeout.md`.
Milestone 1 proceeds with `docs/swe-2-brief-006.md`.
