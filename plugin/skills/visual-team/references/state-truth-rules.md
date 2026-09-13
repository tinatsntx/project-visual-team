# State truth rules (PROJECT_PLAN.md §3.2, §6)

Every meaningful state must be backed by:

- a real Codex hook event (`observed`);
- a real MCP tool call (`observed`);
- an explicit workflow transition reported by the host model (`reported`);
- a direct user action.

Additional rules:

- A `derived` state may never claim completion, approval, review, or success.
- Completion requires an explicit completion event.
- An approval state requires an actual permission event or an explicit
  user-decision request.
- A stale active task shows **No recent activity** — never "stuck" or
  "failed".
- Replayed or duplicate events are idempotent.
- If a hook is missing or unsupported, degrade to model-reported status — do
  not fabricate detail. Hosted tools (e.g. web search) may be invisible to
  hooks; say "limited activity visibility" rather than guessing.
