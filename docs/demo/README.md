# Recorded synthetic screenshot walkthrough

[Open the player](index.html) or [download the recording](visual-team-synthetic-walkthrough.mp4).

Recorded 2026-09-15 CT using Chromium Canvas frame export and FFmpeg 7.1
(H.264 MP4, 1280 × 1080, 10 fps, 36 seconds). Six previously captured widget
screenshots are presented for six seconds each with captions. This is a **synthetic screenshot walkthrough**;
it does not show live host interaction or prove refresh latency. The images
are real renders of synthetic fixtures from the accepted M3 presentation,
which M4 did not change. [Real native/ChatGPT acceptance](../m4-native-closeout.md)
is separate evidence.

The video is silent; the player page supplies the full text alternative.
It shows permission needs, untracked review, stale data, reported completion
with verification references, failure, and PiP. No private conversations,
credentials, or participant recordings are included.

Sources, in order, under `docs/m3-shots/`:

1. `inline-permission-need-light.png`
2. `fullscreen-review-untracked.png`
3. `inline-stale-norecent.png`
4. `fullscreen-completed-verified-light.png`
5. `fullscreen-failed.png`
6. `pip-permission-need.png`

Recording SHA-256:
`88ed2f2668f44cbb88b3b8dffc17e4c57d4e1135bdb368393f931f3c3896bda2`

To reproduce from the repository root, create `dist/m6-demo`, run
`node docs/demo/record.mjs`, open `http://127.0.0.1:8786/`, and press
**Export six captioned frames**. The loopback-only helper writes six PNGs to
that fixed generated directory; stop it afterward. Then encode with FFmpeg:

```text
ffmpeg -y -framerate 1/6 -i dist/m6-demo/slide-%d.png -vf fps=10 -t 36 -c:v libx264 -crf 18 -pix_fmt yuv420p -movflags +faststart docs/demo/visual-team-synthetic-walkthrough.mp4
```

The helper is for demo production and is not part of the MCP server,
widget, hook package, or deployment. Encoding bytes can differ by version.
