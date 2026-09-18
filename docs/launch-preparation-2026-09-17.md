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

The coordinator implemented the static wrapper when the Devin native window
was unavailable. No agent delegation or product-engine edits occurred.

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

## Remaining owner-dependent work

- Final saved-draft review and launch scheduling verification.
- Final Product Hunt copy/media/name-findings review before scheduling.

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
