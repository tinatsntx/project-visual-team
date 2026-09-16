# SWE-2 brief 011 — Attention and results first

Owner approved 2026-09-16. Baseline main `edee355`. Read HANDOFF.md and
PROJECT_PLAN.md, then implement this bounded product revision. Codex owns
independent review, publication, Render, ChatGPT/native acceptance. Commit
reviewable changes locally; do not push, deploy, reinstall, change trust, or
invent participant evidence. Product code remains SWE-2-owned.

## Product decision

Primary audience: people supervising multistep ChatGPT/Codex work. Default
experience answers what needs attention, what is happening, and what was
delivered. Characters belong in an optional team view. No task manager,
diff viewer, approval controls, estimated percent completion, new runtime,
accounts, or multiuser service. Keep explicit skill invocation and solo by
default. Update PROJECT_PLAN.md to reflect this approved refinement; update
HANDOFF with actual implementation/checks and pending coordinator acceptance.
Do not edit docs/private-alpha-test-kit.md: coordinator is updating it.

## Attention summary

- Inline, fullscreen, and PiP default to text status, no characters. Show
  unresolved needs first with each ask-holder and where to respond: native
  permission in Codex; reported question in originating chat. No invented
  deep links or inactive buttons; use clear instructions when navigation
  isn't supported.
- Show current recorded phase and provenance, latest recorded activity and
  its source/time, and last successful refresh separately. Reuse existing
  snapshot/event data; missing events mean limited visibility, never no work
  or guaranteed no pending intervention. Say 'No pending requests recorded'
  rather than an unconditional 'Nothing needs you'.
- Stale/unavailable is always last-known information, including unresolved
  needs. Retain existing retry/ask-render recovery. Don't conflate last
  activity, cached replay, successful read, inactivity, or terminal state.
- Show terminal outcome, reported verification and artifact references in
  default inline/fullscreen summary; make PiP compact but useful, with an
  accessible way to inspect results. No need to open characters to see work.
- Replace primary Open team with relevant retry/results/evidence actions.
  View team is secondary; optional view contains existing truthful roster,
  single-writer ownership and evidence. Motion off by default, explicit opt-in,
  always suppressed by reduced motion, stale data, no recent activity, and
  inactive/terminal workers. Preference is local to mounted widget and resets
  on task switch; never put credentials in view state.
- Preserve keyboard access, clear focus, dark/light contrast and text labels.
  No automatic notification permissions, sound, or analytics.

## Structured reported result

Keep all six tool names and public input signatures unchanged. Add optional
structured result metadata to VisualEvent and TaskSnapshot, carrying the
existing finish summary, verification and artifacts. Populate it only when
an eligible reported task_finished is accepted. Maintain deterministic replay,
deduplication, terminal freeze and existing input/combined 640-character bounds.
Retain legacy detail text. Unsupported/malformed result-bearing events must
not create result claims or partially mutate state. Other event kinds and
derived/observed events cannot smuggle a reported receipt into a snapshot.

Use exact clear text 'Reported checks: passed', 'Reported checks: failed',
'Reported checks: not run'; absent checks read 'Not provided'. These are model
reports, not independent verification. Never parse claims from free-text
summary/detail/artifact names. Legacy events/snapshots display their unstructured
reported detail and missing structured verification honestly. Artifact references
are labels/references only (no uploads or retrieval). Preserve metadata-only
allowlists and capabilities exclusively in private _meta; keep widget zod-free.

## Required proof

Focused regression tests for need priority/attribution, fresh versus stale
claims, late updates/task switching, phase/activity/refresh times, terminal
result/no metadata/legacy metadata, misleading 'verification: passed' text,
invalid receipt placement/provenance, replay/dedup/freeze and bounds.
Cover optional team/motion behavior and all display modes. Extend harness
fixtures where needed for deterministic coordinator browser checks.

Run npm run lint, npm run typecheck, npm test, npm run build, native compatibility
verifier and unchanged coordinator probes. Preserve the semantic assertions of
existing truth tests; adapt presentation assertions only when intentionally changed.
Return commit SHA, files, exact checks, bundle size, limitations and repro URLs.
Then proceed to brief 012 (separate commit) while coordinator reviews 011.
