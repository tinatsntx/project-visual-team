# Changelog

All notable changes are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- **M4 — session isolation, specialist correlation, record-only hook
  coverage.** Untargeted hook events now route only through observed
  bindings (`session_id → task` from the validated `start_visual_task`
  receipt; `agent_id → task` from a bound `SubagentStart`); the
  most-recent-task fallback is removed and conflicting or unknown
  correlation fails closed. `hooks.json` wires nine Codex lifecycle events
  (`SessionStart`, `UserPromptSubmit`, `SubagentStart`, `PreToolUse`,
  `PostToolUse`, `PermissionRequest`, `SubagentStop`, `Stop`, `Interrupt`)
  as async, bounded, record-only commands. The hook script extracts the task
  id only from a validated `tool_response`, bounds stdin/runtime, keeps no
  disk state, and always exits 0 silently. Self-referential Visual Team
  tool events are dropped by the mapper. The reducer handles the native
  `PreToolUse → PermissionRequest → PostToolUse → SubagentStop` ordering:
  observed post-tool activity resolves a waiting worker's ask and a waiting
  specialist may finish.
- **M3 — visual experience.** Clearer status lines with attributed user
  needs ("answer the Codex permission prompt" vs "answer in the chat"),
  verbatim reported finish detail, live/stale/unavailable states with text
  equivalents in every mode including PiP, accessible responsive layouts
  (320 px, enlarged text, both themes, reduced motion, keyboard/landmark
  semantics), and three-worker/long-label wrapping.
- **M2 — consumer workflow.** Explicit `$visual-team` skill invocation,
  `report_workflow_step`/`finish_visual_task` reported boundaries, the
  bounded finish-detail format, and PiP enabled on the tested ChatGPT web
  path.
- **M1 — core engine.** Deterministic state machine with provenance guards
  (`derived` evidence never claims completion, approval, review, or
  success), attributed pending user needs, event-id dedup with a bounded
  retained log, terminal-state freeze, and replayable fixtures.
- Milestone 0 feasibility skeleton: plugin package, MCP state server,
  React UI bundle, bundled record-only Codex hook, state machine with
  provenance guards, replayable fixtures, feasibility report template, and
  ADR-001..010.
