# Brief 005 acceptance — clean checkout and literal UI embedding

Coordinator verification: 2026-09-14 America/Chicago / 2026-09-15 UTC.
Reviewed SHA: `515727a2d8ec08c95ce3c2e610f4578c56978347`.
**Status: ACCEPTED** for brief 005's bounded scope; published and deployed.

## Independently verified

- Inspected the five-file committed diff. Transport tests use a temporary local
  fixture and restore the bundle environment setting; a separate test covers
  the intentional text-only fallback. Resource insertion uses function replacers.
- Exported committed HEAD to a new isolated directory with no generated widget
  assets and installed fresh dependencies. `npm ci` -> typecheck -> 74/74 tests
  plus native compatibility verification -> build all pass, in that order.
- Configured checkout also passes typecheck, 74/74 tests, native compatibility
  verification, build, and working/committed whitespace checks.
- The original missing-bundle reproduction now passes both transport tests.
- Build runs the new real-bundle embedding assertion successfully. Widget
  159.9 KB, dev host 462.6 KB, CSS 3.6 KB; sizes unchanged.
- Published the reviewed SHA to main and verified the remote matches.
- [GitHub CI run 34911908899](https://github.com/tinatsntx/project-visual-team/actions/runs/34911908899)
  **PASS** for this exact SHA. Windows runner executes tests before building;
  both stages now pass. This supersedes the previous clean-checkout failure.

## Deployment and real ChatGPT smoke test

Render deploy `dep-dak8pcgu01pc73e87ipg` requested for this SHA at
`2026-09-15T00:09:22.416853Z`, live at `2026-09-15T00:10:05.868838Z`.
Health returned `ok:true`. Independent hosted resource read confirmed:

- `text/html;profile=mcp-app`, 167637 UTF-8 bytes.
- Extracted JavaScript equals the built file exactly; stylesheet also matches.
- All 22 `$$` and both `$&` sequences preserved; zero leftover bundle placeholders.
- JavaScript SHA-256:
  `9e5608fccb6e379b3095e0c4944ce76f6e6d92d49fdad78e3771fba8e2416260`.
- Declared `connectDomains` and `resourceDomains` both remain empty.

Refreshed Visual Team M0 in ChatGPT and started a fresh standard Chat smoke
test using existing task `vt_d19303607167b41f2d5d7c84`, created through Codex at
`2026-09-15T00:10:55.543Z`.
[QA: Show Embedded Board](https://chatgpt.com/c/6aa88d4c-6b14-83ea-9b56-f86e43d02b3b).
The board initialized with the correct title, PLANNING task, and Alex ASSIGNED.
Expanded details showed the single reported task-start event at 19:10:55 CT.
No stale/unavailable banner appeared during the healthy smoke test. ChatGPT
used the read-only render for the existing task; no event writes were requested.
Open team switched to fullscreen; Back to chat returned to the inline board.
The correct task and reported event remained visible after the return. The
accepted QA tab is left open with View details expanded. No new precise
display-mode or refresh latency measurement is claimed.

## Evidence boundary

The earlier real native hook -> existing ChatGPT widget and controlled
connection-recovery acceptance is retained in `docs/brief-004-acceptance.md`.
Brief 005 changes resource composition and verification, not the widget's
source, tool annotations, private metadata flow, or hook package. Its smoke
test does not replace the earlier native-event evidence with a synthetic event.
M0 remains open for the remaining recorded surfaces, PiP decision/test, skill
workflow, and real-host terminal/expiry cases. Sites migration stays paused.
Coordinator config and prior evidence remain preserved.
