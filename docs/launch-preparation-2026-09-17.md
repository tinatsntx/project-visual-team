# Working-alpha launch preparation — 2026-09-17

Owner approved the open-source launch with immediate sample access and source
instructions. Target Product Hunt date: September 18, 2026. This record does
not claim a scheduled entry or challenge eligibility. The current real demo is complete.

## Implemented and published

- `site/`: landing page, three fixture scenarios in the accepted widget,
  source-install guide, privacy/limitations and feedback/security links.
- Persistent sample label; no live MCP connection or native execution.
  An explicit CSP disallows network connections from the sample.
- `npm run build:site`: stages 14 explicit source/assets plus `.nojekyll`
  and a hash manifest. It never copies the repository's full `dist/` tree.
- `npm run preview:site`: loopback-only local site, including the intended
  `/project-visual-team/` base path.
- Manual GitHub Pages workflow uploads only `dist/site/`.
- [Source guide](self-host.md), [launch copy](product-hunt-launch-copy.md),
  [name screen and alpha decision](public-name-screen-2026-09-17.md),
  [real-demo runbook](launch-demo-runbook.md), original-icon thumbnail.

The coordinator implemented the static wrapper when Devin's native window
was not exposed to this session's controls. The owner confirmed Devin itself
was open and working. No agent delegation or product-engine edits occurred.

## Local verification

- Lint, typecheck and required `npm run build`: passed.
- Tests: **292 passed, 0 failed, 1 skipped**, 293 total. The skipped native
  short-name test reports that 8.3 names are unavailable on this volume.
  This does not replace the earlier hosted 293/293 zero-skip result.
- Fresh source export plus the scoped site overlay: `npm ci` and site build
  passed. All staged-file hashes exactly match the main working-tree build.
- MCP server from that clean candidate: `/healthz` returned healthy on the
  temporary local port; the temporary server was stopped afterward.
- Desktop and 360px browser checks: landing and sample fit the viewport;
  result summary/check labels retain reported provenance.
- Keyboard Enter opens evidence; Space closes it. Reduced-motion emulation
  leaves the optional team view without motion controls. Expanded mode
  retains the terminal result. Temporary browser overrides were cleared.
- Captured initial landing/sample network requests: local site assets only,
  no shared MCP service request. Sample updates use the local message bridge.
- Local review screenshots are in ignored `dist/launch-review/`; they are
  sample UI evidence, not a real-host demo.
- The added local MP4 played in Chrome with a 73.77-second duration, advancing
  playback and no media error. The Codex in-app browser crashed during its
  playback check, so no in-app-browser video pass is claimed. The page also
  links to the verified YouTube copy.

## Current real-host recording

- Fresh task: `vt_82f9442e59eb3e310747edf0`, title “Launch demonstration.”
- Native CLI: **0.155.0-alpha.2.6**, in a separate read-only/on-request session.
  The current coordinator itself cannot request native approvals.
- First harmless native read: exit 0. Its observed activity reached the card.
- Second turn reported `testing` at 20:13:23 Central, then the normal native
  flow produced `permission_request` at 20:13:29 Central. The same mounted
  ChatGPT card displayed “Alex needs approval — answer the Codex permission
  prompt.” The owner approved once without a persistent rule. That read
  returned exit 0 at 20:20:11 Central; the need cleared on the same card.
  A native turn-finished event followed at 20:20:28, and the agent reported
  completion at 20:22:25. Passed covers only the two reads.
- Reviewed card-only captures contain public task metadata, with no capability
  tokens, prompts, command contents, code or unrelated account details.
  A timed capture sequence and timestamp receipts remain in ignored
  `dist/launch-recording/`. No events or hooks were manually injected.
- Gallery: one clearly labelled sample screenshot plus three genuine native
  approval/evidence/result images are ready, all 1270 × 760 PNG.
- The reviewed 73.77-second H.264 video contains genuine timed captures,
  disclosed cuts, captions and no audio. Decode verification passed.
  The owner approved the unlisted upload and YouTube terms; publication is
  confirmed at https://www.youtube.com/watch?v=b1AtoDnVho0 .
- This is a narrow new-runtime demonstration, not full compatibility coverage
  for 0.155.0-alpha.2.6. The installer still supports only its tested runtime.

## September 18 launch-day check

- The owner authorized launch on September 18. Final review is no longer pending.
- Fresh required local checks: typecheck and widget/dev-host build passed;
  tests passed with 292 successes, 0 failures and the same single unavailable
  Windows 8.3-name skip. Native compatibility-package verification passed.
- Public site: all 14 manifest assets returned HTTP 200 with matching SHA-256;
  the alpha health endpoint and public demo acceptance record also returned 200.
- Source prerelease remains public at the recorded tag and revision. Current
  documentation revision `0473a139e3e59abd95ae5dba8e0a21fd96e4c3a2` matched
  local/remote main with a clean working tree; CI run `35296627462` succeeded.
- Chrome replayed the public MP4 through 44 seconds. The instant sample opened
  without a login and its completed scenario retained reported result/check
  labels. The public self-host guide opened and retained tested-runtime limits.
- The saved Product Hunt draft retains its copy, four screenshots, video,
  Tina as human maker, free/open-source status, and factual tool shoutouts.
  Its maker comment now says September 17 instead of a relative date.
- **Scheduling blocker:** both the listing and editor calendars now start on
  September 19. The challenge page shows the live September 18 leaderboard,
  with no late-entry control observed. Product Hunt's official help confirms
  [Launch Now was removed](https://help.producthunt.com/en/articles/9823193-where-did-launch-now-go).
  The intended September 18 entry remains an unscheduled draft.
- A request for a same-day launch and challenge eligibility confirmation is
  prepared for Product Hunt support, but has not been sent. Owner choice is
  needed before that new outbound message or a change to September 19.
- Verification completed approximately September 18 at 08:17 Central. The
  machine-readable public-asset receipt remains in ignored
  `dist/launch-recording/launch-day-site-verification.json`.

## Publication record

- Source revision: `dd006524b2a5b201fa69c053170b657888ebdb32`.
  [CI run 35293599732](https://github.com/tinatsntx/project-visual-team/actions/runs/35293599732)
  passed: **293 tests, 0 failures, 0 skips**; lint, typecheck and build passed.
- [Pages run 35293763621](https://github.com/tinatsntx/project-visual-team/actions/runs/35293763621)
  passed. https://tinatsntx.github.io/project-visual-team/ opens signed out;
  the instant sample and setup link are available. All 12 published assets
  match their published SHA-256 manifest. Ten match the local build exactly;
  the two original SVGs differ only by Windows CRLF versus hosted LF endings.
- [Source prerelease v0.1.0-alpha.1](https://github.com/tinatsntx/project-visual-team/releases/tag/v0.1.0-alpha.1)
  published at 2026-09-18T01:18:10Z; tag target independently verified as the
  full source revision above. This is source, not the guided alpha installer.
- Product Hunt draft saved with all required items complete, three launch tags,
  four screenshots, video, maker comment and four factual tool shoutouts:
  https://www.producthunt.com/products/visual-team?launch=visual-team .
- Product Hunt scheduled entry: pending; the saved page explicitly says draft.
- Media follow-up revision `bcf7a436cd5511859d06af48eefa7b2b8b84e1c8` is
  published. [CI](https://github.com/tinatsntx/project-visual-team/actions/runs/35296307845)
  and [Pages](https://github.com/tinatsntx/project-visual-team/actions/runs/35296307894)
  succeeded. All 14 public assets return HTTP 200 and match their SHA-256
  manifest. The public MP4 was observed playing in Chrome; the Product Hunt
  YouTube embed also played. The public source-setup page opens signed out.
- On September 17, the schedule dialog confirmed September 18 at 12:01 a.m. PT /
  02:01 a.m. CDT. Its explicit challenge option and honest 695-character
  contribution response were prepared but not submitted. The September 18
  recheck above supersedes that scheduling availability.
