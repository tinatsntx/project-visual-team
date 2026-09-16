# Milestone 3 visual experience — acceptance evidence

**M3 implementation complete; awaiting coordinator acceptance.** Brief:
`docs/swe-2-brief-008.md`. Scope: make the existing inline, fullscreen, and
PiP views truthful and readable — clear status and next action, visible
limited-visibility states, bounded finish results, accessibility/responsive
coverage, and the §13.6 interface notice. **No runtime, reducer, hook,
session-binding, server, or transport changes.** This diff touches only
`apps/plugin-ui/` sources and tests, synthetic capture tooling
(`scripts/m3-capture.mts`, generated `apps/plugin-ui/capture/`, gitignored),
five new deterministic fixtures, the `FixtureStep` format extension,
screenshots under `docs/m3-shots/`, `HANDOFF.md`, and this record.

## Four-criterion evidence map

| Brief §exit criterion | Evidence | Result |
|---|---|---|
| Goal, owner, current status, and needed action readable in ~10 s | Inline shows title, status badge, lead line, and a plain-language action line from attributed pending needs (`needActions` in `stateText.ts`): a `worker:` need says "answer the Codex permission prompt", a `task` need says "answer in the chat". See `m3-shots/inline-permission-need.png`, `inline-reported-question.png`. | PASS locally |
| Truthful limited visibility (noRecentActivity, stale, unavailable) in every applicable mode | Refresh banner with Try again / "Ask ChatGPT to render it again" on stale+unavailable; `noRecentActivity` derived by `refreshDerivedFlags` and rendered as "No recent activity." PiP shows compact text for both need and refresh state — never only a dot — **plus a visible task title** (follow-up item 2). `m3-shots/inline-stale-norecent.png`, `pip-stale.png`, `pip-permission-need.png`, `pip-long-labels-narrow.png`. Avatar animation is gated on **both** refresh health and the activity-age flag — healthy reads with old activity do not animate (follow-up item 3, probe cases 5–7). | PASS locally (fixed in follow-up) |
| Useful fullscreen results | `resultDetail.ts` returns the bounded finish `detail` verbatim; the Results section labels it "Reported result" — **no token is extracted into a badge**, because a summary or artifact label can legitimately contain "verification: passed" (follow-up item 1, probe cases 1–3). Absent finish/detail states absence. `m3-shots/fullscreen-completed-verified.png` (+-light), `fullscreen-failed.png`. | PASS locally (fixed in follow-up) |
| Accessible responsive views | 320 px layout, 175% text at 320 px, both themes, reduced-motion (no animation as sole indicator; every state has text), keyboard-focusable controls with names and `aria-expanded`, sr-only status line, three-worker and long-label wrapping without losing controls. `m3-shots/inline-narrow-320.png`, `inline-narrow-large-text.png`, `fullscreen-long-labels.png`. | PASS locally |

Plus the §13.6 notice: every mode carries the muted metadata warning —
inline "Titles and summaries are stored as ephemeral metadata — keep
secrets and sensitive content out of them.", fullscreen additionally
"Private mode changes nothing about retention today.", PiP the compact
"Task titles are stored metadata — keep sensitive content out.". No
consent gate, settings surface, or onboarding flow was added.

## Truthfulness rules exercised

- Hookless/canceled specialist rows never claim a real review was canceled or
  failed: `workerLine` renders "tracking ended; no finish signal was
  recorded" for a `CANCELED` roster member on a finished task — applied in
  all three modes including PiP's roster lines
  (`fullscreen-review-untracked.png`, `fullscreen-long-labels.png`).
- No question/approval/completion is invented from roster assignment or lack
  of activity — `needActions` reads only `pendingUserNeeds`; stale actives
  show "No recent activity.", not "stuck". A `CANCELED` task never renders
  "in progress" — terminal detection uses the shared `TERMINAL_TASK_STATES`.
- Artifact references are rendered as inert text inside the bounded detail
  string; nothing is parsed as code or linked. No inferred verification
  badge exists — the detail is reported free text and any `verification:`
  token inside it is a claim within that text, not a parsed field.

## Harness and methodology

`node --import tsx scripts/m3-capture.mts` replays repo fixtures through the
real `mapCodexEvent` + `applyEvent`/`refreshDerivedFlags` reducer into a
`snapshot`, embeds it via `createRenderVisualTaskResult`, and writes
`apps/plugin-ui/capture/<scenario>.html` plus a shared `frame.html` that
plays the Apps host over `postMessage` (same topology as `dev.html`). A
scenario's `stale` flag makes the frame answer `get_visual_task` with a
generic `isError`, so the refresh banner in the shots is produced by the real
read path, not a mock flag. `ageMin` backdates `lastActivityAt` so
`noRecentActivity` is engine-derived. Screenshots: headless Chrome
`--screenshot` against `npm run dev:serve`; light theme via
`--blink-settings=preferredColorScheme=1`; enlarged text via a baked
`html { font-size: 175% }` on the capture page.

These are **local deterministic emulations**, not real ChatGPT or mobile
evidence. Host display-mode acceptance and a real ChatGPT render remain the
coordinator's.

## Test coverage added

- `tests/views.test.ts` — markup assertions per mode: attributed need text,
  "No recent activity.", PiP text need + compact refresh text + visible
  title + qualified canceled-worker wording, verbatim detail under
  "Reported result", privacy line, three-worker and long-label rendering,
  CANCELED task never reads "in progress", and animation gating on
  `noRecentActivity` (including that fresh activity restores motion).
- `tests/finishTruth.test.ts` — the three probe cases end-to-end through
  the real `mapTaskFinish` → `applyEvent` → `FullscreenView`: a summary or
  artifact carrying "verification: passed" cannot mint a passed badge,
  whether explicit verification is `failed` or absent.
- `tests/resultDetail.test.ts` — verbatim detail passthrough, absent
  finish/detail handling, and no extracted verification field.
- `tests/stateText.test.ts` — `needActions` attribution (worker→native
  prompt, task→chat), canceled-worker task-context wording, `taskLine`.
- Stale-motion suppression remains covered in `tests/taskData.test.ts`;
  `tests/displayMode.test.ts` covers non-optimistic mode changes;
  `fixtures.test.ts` gained `visual_event` replay with a monotonic injected
  clock. `FixtureStep` gained the `visual` kind used by fixtures and the
  dev host.

## Visual artifacts

| File | Shows |
|---|---|
| `docs/m3-shots/inline-permission-need.png` / `-light.png` | need → Codex prompt; dark + light |
| `docs/m3-shots/inline-reported-question.png` | task need → answer in chat |
| `docs/m3-shots/inline-stale-norecent.png` | refresh banner + "No recent activity." |
| `docs/m3-shots/inline-narrow-320.png` | 320 px wrap, controls intact |
| `docs/m3-shots/inline-narrow-large-text.png` | 175% text at 320 px |
| `docs/m3-shots/fullscreen-completed-verified.png` / `-light.png` | verification badge + bounded detail |
| `docs/m3-shots/fullscreen-failed.png` | failed verification, not success |
| `docs/m3-shots/fullscreen-review-untracked.png` | honest untracked specialist |
| `docs/m3-shots/fullscreen-long-labels.png` | long title/summary/artifacts, 3 workers |
| `docs/m3-shots/pip-permission-need.png` | PiP visible goal + text need equivalent |
| `docs/m3-shots/pip-stale.png` | PiP text refresh equivalent + Try again |
| `docs/m3-shots/pip-long-labels-narrow.png` | 280 px PiP, long title wraps |

## Bundle size

| Bundle | M2 (`c26a7a5` build log) | This diff | Delta |
|---|---|---|---|
| `visual-team.js` | ~160.1 KiB | ~162.7 KiB | **+~2.6 KiB** |
| `visual-team.css` | ~3.6 KiB | ~4.5 KiB | +~0.9 KiB |
| `dev-host.js` | ~471 KiB | ~471.3 KiB | +~0.3 KiB |

(An earlier draft imported `TERMINAL_TASK_STATES` from
`@visual-team/state-machine`, which pulled ~450 KB into the widget bundle —
caught by size review and replaced with a local check.)

## Verification on this diff

- `npm run typecheck` — clean.
- `npm test` — 183/183 (38 new tests vs the M2 145 baseline: view markup,
  result detail, finish truth through the real mapper, state text, and
  canceled/terminal/motion regressions).
- `npm run build` — clean; verbatim-embed and native compat verification pass.
- `node --import tsx evals/m0-enablement-coordinator-probe.mts` — exit 0.
- `node --import tsx evals/m1-coordinator-probe.mts` — exit 0.
- `node --import tsx evals/m2-consumer-workflow-probe.mts` — exit 0 (7/7).
- `node --import tsx evals/m3-coordinator-probe.mts` — exit 0 (7/7).
- `git diff --check` — clean.
- No server, reducer, hook, session-binding, or transport file changed; the
  six tools, private `_meta` capability handling, single-flight reads,
  non-optimistic display-mode changes, and initialization order are
  unchanged.

## Adversarial review round (folded in)

An independent read-only review of this diff found and this commit fixes:

- PiP rendered finalization-canceled workers as "canceled" (bare state
  table) — now uses the qualified `workerLine` wording like other modes.
- A `CANCELED` task rendered "Work is still in progress." — terminal
  detection now includes `CANCELED`, so it reads "Task ended as canceled".
- PiP lacked the §13.6 notice — compact line added.
- The verification badge could read as system-verified — initially labeled
  `reported`; the coordinator follow-up then showed the deeper defect (a
  summary/artifact token could mint a *wrong-value* badge), so the badge
  was removed entirely rather than patched.
- `RobotAvatar` announced the bare state to screen readers next to the
  qualified text — the svg is now `aria-hidden` (adjacent text is the
  accessible state in all three views).
- `role="alert"` on a needs `<li>` (assertive on mount, strips listitem
  semantics) → `role="status"` on the list; `View details` gained
  `aria-controls`; PiP's labeled container is a `<section>` landmark.
- Capture tooling: visual steps now default `provenance: "reported"` (same
  as the test runner and dev host), `frame.html` embeds the scenario size
  table so `?n=` alone reproduces each shot, and the header documents the
  settle budget stale scenarios need.
- `fixtures.test.ts` visual steps now tick a monotonic injected clock so
  `lastActivityAt` can't regress mid-replay.

Known nits retained with rationale: the Workstreams "owns the reviewer
track" line is a roster-assignment statement (the Team section above it
shows the tracking-ended caveat); fixture `visual` events are applied
through the real reducer without an extra schema pass (synthetic local
fixtures only). The earlier retained nit — `verification:` inside a
summary minting a badge — was reclassified by the coordinator as a
correctness defect and fixed by removing the badge.

## Coordinator follow-up fixes (brief-008 follow-up, `evals/m3-coordinator-probe.mts`)

- **Ambiguous inferred badge removed.** `finishDetail` returns only
  `{event, detail}`; Results renders a "Reported result" label plus the
  bounded detail verbatim. Probe cases 1–3 (`failed` overridden by a
  summary token, `absent` minted, artifact-label token) all pass.
- **PiP shows the task goal.** A wrapping `vt-pip-title` heading at 340 px
  and a 280 px long-title capture (`pip-long-labels-narrow.png`).
- **Activity animation gated on evidence age.** `animated` now requires
  `!reduced && !stale && !task.noRecentActivity` in all three views —
  healthy reads with stale evidence no longer imply live work (probe cases
  5–7); fresh activity still animates (covered in `views.test.ts`).

## Remaining real-host checks (coordinator)

- Real ChatGPT render of each mode against the live endpoint; real PiP
  behavior in the host (PiP auto-close on session end is **not**
  implemented — §12.3 spec item deferred as a compatibility limit, per brief
  scope against guessing a host close event).
- Real mobile/narrow viewport and screen-reader runs; the 320 px and
  enlarged-text evidence here is emulation.
- The M2-recorded limits stand unchanged: explicit `$visual-team` invocation,
  one active visual task, hookless specialist lifecycle (M4 owns
  `SubagentStop` correlation), no `PermissionRequest`/`Interrupt` hook
  coverage, native permission prompting unexercised. Nothing in this UI
  masks those gaps — the untracked-reviewer and stale states are labeled as
  such.
