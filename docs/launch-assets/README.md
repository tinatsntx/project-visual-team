# Launch media

- `thumbnail-240.png`: 240 × 240 PNG, rasterized from the repository's original
  `plugin/assets/composer-icon.svg` on a neutral background. No generated or
  third-party artwork.
- `01-instant-sample.png`: 1270 × 760 PNG of the published landing-page build.
  The visible widget uses clearly labelled sample data, not a live session.
- `02-native-approval.png`: 1270 × 760 PNG using a cropped genuine ChatGPT
  card showing the native approval need on September 17, 2026. The card is
  unaltered apart from crop/resize; the surrounding title/footer layout is added.
- `03-native-evidence.png`: 1270 × 760 PNG with a cropped excerpt of that
  card's genuine observed native permission event and reported testing phase.
  The surrounding title/footer layout is added.
- `04-reported-result.png`: 1270 × 760 PNG using the genuine completed card,
  including its reported result and the narrow two-read check scope.
- `visual-team-real-demo.mp4`: 73.77 seconds, 1920 × 1080, H.264, 30 fps,
  no audio, with on-screen captions. It uses 38 timed genuine card captures
  plus title/outro frames, with disclosed cuts between segments. Decode check
  passed. [Unlisted YouTube copy](https://www.youtube.com/watch?v=b1AtoDnVho0).
- `manifest.json`: byte counts, dimensions/duration and SHA-256 hashes for the
  reviewed publication files. The older synthetic walkthrough is not this demo.

Real captures use task `vt_82f9442e59eb3e310747edf0`, product baseline `5a66481`
and Windows Codex CLI 0.155.0-alpha.2.6. A permission request is evidence of a
pending request, not an approved or successful action. Both native reads
exited successfully; the second followed genuine owner approval for one action.
The terminal receipt was reported by the agent and checked on the mounted
card. No event was injected. See [the acceptance record](../launch-demo-acceptance-2026-09-17.md).

Raw or unreviewed captures stay in ignored `dist/launch-recording/` or
`dist/launch-review/`. Only reviewed, metadata-only frames belong here.
