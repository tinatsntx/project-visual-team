---
name: visual-team
description: Show real ChatGPT/Codex work as a small visual team. Use when the user invokes the Visual Team plugin or asks to see work handled by a visible team. One bot by default; specialists only for genuinely separate workstreams.
---

# Visual Team

Route real work through the Visual Team MCP tools so the user can see who is
doing what. The board must always tell the truth: every visible state comes
from a real hook event, a real tool call, a boundary you reported, or a user
action. The workflow must also be useful when the board is not visible — the
visual layer is a status view, never the deliverable.

## Before creating a task

- **Supported work** is anything you can do with your own native
  capabilities — edits, commands, research, review. The plugin shows the
  work; it adds no new powers. If the request needs capabilities you do not
  have (sending messages, purchases, account actions, auto-approvals), say
  so plainly and do not create a task for it.
- **Warn once, briefly:** task titles and summaries are stored metadata —
  keep secrets, credentials, prompts, commands, code, and sensitive content
  out of them. `privacyMode: "private"` changes nothing about retention or
  isolation today; sanitize regardless.
- If the visual-team tools are unavailable, do the work natively and say the
  board is unavailable.

## Sequence

1. **Choose the mode** with the decision matrix in
   `references/delegation-rules.md`. Default `solo`. Use `team` only when a
   listed condition is genuinely true *and* the host can actually delegate —
   a requested team is not proof it can; fall back to `solo` with a plain
   explanation.
2. **`start_visual_task` once** with a sanitized `title` and `summary`.
   Never open a second task to redo or hide a failure — resume the existing
   task instead.
3. **`render_visual_task` once** to mount the board. Routine updates flow to
   it automatically; do not re-render per step.
4. **Do the real work natively.** Report genuine phase boundaries with
   `report_workflow_step` — `planning`, `researching`, `implementing`,
   `testing`, `reviewing` — only when you actually begin that phase. Report
   boundaries, not keystrokes.
5. **Waits.** When you are genuinely blocked on the user — an answer, a
   decision, an approval only they can give — report `waiting_for_user`; the
   board shows the pending need. When real work resumes, report the actual
   resumed phase and the board clears it. Never report a wait you are not in.
   Permission prompts always stay in the native approval flow — never
   approve, deny, or auto-answer one on the user's behalf.
6. **Finish once** with `finish_visual_task`: the true `outcome`, a bounded
   sanitized `summary`, honest `verification` (`passed`/`failed`/`not_run`),
   and artifact *references* (label + optional uri — never contents). If the
   work did not finish, report `failed` or leave it unfinished — never claim
   completion you did not reach, and never report fictitious work merely to
   unlock a terminal transition.
7. **`render_visual_task` once more** at completion, then give a complete
   text answer regardless of whether the board rendered.

## Rejections are not failures to route around

- `{applied:false}` is a safe no-op — with a `reason` it is a rejection
  (`no_active_task`, `rate_limited`, an unsupported transition, oversized
  finish metadata); a duplicate event also returns `applied:false` with no
  `reason`, which is an idempotent no-op, not an error. Either way the board
  did not change — say what actually happened.
- Never retry in a loop, and never manufacture `record_codex_event` calls to
  repair or simulate hook activity. Hook data is `observed` evidence; your
  reports are `reported` evidence; a tool call never upgrades a claim's
  provenance.
- `waiting_for_user` only applies from active work — report a real working
  phase first if the task just started.

## Headless and limited access

- **UI unavailable or render failing:** continue the authorized work
  natively and return a complete text answer with a one-line visibility
  limitation. One render retry at most, then stop.
- **Writes/MCP unavailable:** continue the work and give the complete text
  answer; never invent task IDs or pretend the board updated.
- **Viewer-only surfaces (no task creation):** render an existing task when
  one exists, or explain the supported creation path — do not fabricate a
  task or fake actions.

## Never

- Invent a bot, action, result, review, test, or approval — every visible
  state needs real evidence (`references/state-truth-rules.md`).
- Claim a delegated review or specialist work that did not actually run.
- Approve, deny, or auto-answer permission prompts.
- Report `completed` for unfinished or interrupted work.
- Exceed three visible bots or run multiple writers against shared files.
- Request broad new permissions merely to make the workflow or a demo work —
  keep permissions minimal and native.
- Put secrets, prompts, commands, transcripts, code, or artifact contents
  into titles, summaries, labels, or artifact references.
- Expose model names or reasoning settings in user-facing text.
