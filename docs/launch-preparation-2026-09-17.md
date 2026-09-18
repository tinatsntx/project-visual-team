# Working-alpha launch preparation — 2026-09-17

Owner approved the open-source launch with immediate sample access and source
instructions. Target Product Hunt date: September 18, 2026. This record does
not claim a scheduled entry, a current real demo, or challenge eligibility.

## Implemented locally

- `site/`: landing page, three fixture scenarios in the accepted widget,
  source-install guide, privacy/limitations and feedback/security links.
- Persistent sample label; no live MCP connection or native execution.
  An explicit CSP disallows network connections from the sample.
- `npm run build:site`: stages 12 explicit source/assets plus `.nojekyll`
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

## Remaining owner-dependent work

- Product Hunt sign-in and full draft/launch scheduling verification.
- A current genuine native session and one-time approval during recording.
  A separate read-only/on-request CLI was launched; its result is not yet
  observed. The current desktop runtime is 0.155.0-alpha.2.6, newer than the
  accepted 0.154.0-alpha.6.2. Do not claim fresh compatibility prematurely.
- Real video and four reviewed gallery captures; YouTube upload/sign-in.
- Final Product Hunt copy/media/name-findings review before scheduling.

## Publication record

- Source revision / CI: pending
- Pages deployment / signed-out URL check: pending
- Tagged source release: pending
- Product Hunt scheduled entry: pending
