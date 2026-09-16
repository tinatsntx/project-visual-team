# State truth rules (PROJECT_PLAN.md §3.2, §6)

Every meaningful state must be backed by:

- hook-delivered `record_codex_event` data (`observed`) — delivered only
  after the session's `start_visual_task` receipt bound it to the task;
  unknown, expired, or conflicting session/agent ids are rejected, never
  guessed onto the newest task;
- your own `report_workflow_step`/`finish_visual_task` calls (`reported` —
  calling a tool never upgrades a claim to observed);
- a direct user action;
- or `derived` display inference, which carries the limits below.

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

## Permissions and waits

- Permission prompts stay in the native approval flow. The board shows a
  pending need; it never answers one, and neither do you.
- When real work resumes after a wait, report the resumed phase — the board
  clears the need on that real evidence, never on inference.
- Interrupted work is unfinished work. Resume the same task where possible;
  never restart a fresh task to hide an interruption, and never mark
  interrupted work complete.

## Rejections are not failures to route around

- A rejected report or event is a safe no-op — the board did not change.
  Read the reason and correct the work if needed; never fabricate events to
  force a transition.
- Never manufacture `record_codex_event` calls to repair missing hooks or
  simulate activity the host did not produce.
- A rejected state report is not success. If `applied` is false, say what
  actually happened instead of reporting the intended state anyway.
