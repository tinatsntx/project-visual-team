---
name: visual-team
description: Show real ChatGPT/Codex work as a small visual team. Use when the user invokes the Visual Team plugin or asks to see work handled by a visible team. One bot by default; specialists only for genuinely separate workstreams.
---

# Visual Team (Milestone 0 stub)

This skill routes work through the Visual Team MCP tools so the user can see
who is doing what. The full routing workflow is Milestone 2 — this stub exists
so the plugin package is coherent and testable during the feasibility gate.

## What you may do now

1. Call `start_visual_task` before substantive work, choosing `solo` unless
   the request clearly has independent workstreams (see
   `references/delegation-rules.md`).
2. Do the work with native ChatGPT/Codex capabilities. No new execution
   infrastructure, no Agents API.
3. Call `report_workflow_step` when your phase genuinely changes (planning,
   researching, implementing, testing, reviewing, waiting_for_user). Report
   only real boundaries — never invent progress.
4. Call `finish_visual_task` once at the end with the true outcome, a short
   result summary, and verification status. If the work did not finish, report
   `failed` or leave the task unfinished — never claim completion you did not
   reach.
5. Call `render_visual_task` after the initial plan and again at completion
   so the user sees the visual view.
6. If the UI does not render, still give a complete text answer — the workflow
   must be useful without custom UI.

## What you must never do

- Invent a bot, action, result, review, test, or approval. Every visible state
  needs real evidence: a hook event, a tool call, a boundary you reported, or
  a user action (see `references/state-truth-rules.md`).
- Approve, deny, or auto-answer permission prompts on the user's behalf.
- Exceed three visible bots or run multiple writers against the same files.
- Expose model names or reasoning settings in consumer-facing text.
