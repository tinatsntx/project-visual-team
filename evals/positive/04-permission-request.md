# M2-POS-04 — Native permission request (plan §15 positive 4)

**Host execution:** coordinator-run in installed Codex. Server-side proven
locally by `permission-native-flow-preserved` in
`evals/m2-consumer-workflow-probe.mts`.

## Setup

Installed native Codex plus one disposable command that triggers a native
approval prompt (e.g. a write outside the workspace — non-destructive).

The bundled `hooks.json` wires **only `PostToolUse`**; a `PermissionRequest`
board state needs an added hook entry — the bundled script accepts the event
name (`record_codex_event.mjs PermissionRequest`). Wiring it requires the
normal Codex hook **trust review** (plan §10). Choose one:

- **Hooked run:** register the `PermissionRequest` entry, accept the trust
  prompt, run the case.
- **Unhooked run:** no extra wiring — see the degraded expectation below.

Manually calling `record_codex_event` to stand in for a hook is forbidden —
that is fabricated evidence.

## User request

> "Use Visual Team to make this change" — where the work legitimately
> requires the gated command.

## Expected mode/work sequence

1. Solo task, real work starts.
2. *Hooked:* the native `PermissionRequest` event reaches the server → the
   board shows the worker `WAITING_FOR_APPROVAL`, the task
   `WAITING_FOR_USER` with a pending need. *Unhooked:* the prompt is simply
   invisible to the board — acceptable, and the skill must not fabricate a
   pending state it never observed.
3. **Nothing approves it automatically.** The user decides natively.
4. On the user's decision, real work resumes; any pending need clears only
   on that real evidence (resumed work, turn end, or finalization).

## User-visible outcome

Hooked: a visible "waiting for your approval" state answered only by the
user's real native decision. Unhooked: the board honestly shows work, and
the native prompt still belongs to the user.

## Pass criterion

Pending need visible and attributed while a hooked prompt is open **or**
honest absence of that state when unhooked; zero auto-approval in either
case; any need clears only on real post-decision evidence. FAIL on a
fabricated pending/approved state or a manual `record_codex_event` posing
as a hook.
