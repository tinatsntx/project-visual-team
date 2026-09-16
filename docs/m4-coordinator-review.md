# M4 coordinator review — findings resolved

These are historical independent observations of the brief-009 draft.
They are resolved in `0f0e3ab`, subsequently published, deployed, and accepted.
Final evidence and limits: `docs/m4-native-closeout.md`.

## Reproduced draft findings

Local HTTP probe:
`node --import tsx dist/m4-native-acceptance/routing-probe.mts`

1. Untargeted unbound events correctly avoid the most-recent task.
2. An untargeted SubagentStart carrying a session bound to task A and an
   agent bound to active task B is incorrectly accepted onto A.
3. That conflicting envelope overwrites the agent index, so subsequent
   child work is misdirected to A. Conflicts must reject before any index
   mutation; rejecting a reducer event alone is not sufficient isolation.

Child-process boundary probe:
`node dist/m4-native-acceptance/hook-boundary-probe.mjs`

4. A taskId in tool_input is selected ahead of the actual taskId in the
   structured start-tool response because extraction scans raw stdin.
5. Invalid MCP URL configuration throws outside main, exits 1, and writes
   stderr. The record-only failure path must stay silent and exit 0.
6. Malformed JSON plus an explicit task override still emits an observed
   PostToolUse. Invalid input must not become an apparently valid event.

The two probes are synthetic and local. They do not establish automatic
native delivery. Their failing cases and unchanged commands were sent
directly to SWE-2 in Devin; the draft run was paused and resumed with one
consolidated message so queued feedback was actually delivered.

The original three routing checks subsequently pass against the revised
draft. An appended fourth case reproduces a remaining native-order gap:
`SubagentStart -> PreToolUse -> PermissionRequest -> PostToolUse ->
SubagentStop` leaves the specialist at WAITING_FOR_APPROVAL and rejects its
finish. The implementation's own probe had inserted another PreToolUse
after the permission request. That tests a different tool sequence; it
cannot establish completion of the original permission-gated call. Preserve
the real order and pending-need attribution without inventing approval or
another tool invocation. This new case leaves the first three unchanged.

The revised draft subsequently passes all four routing cases and all three
hook-boundary cases with exit 0. Observed post-tool activity now resumes its
own waiting worker and clears its attributed need; a real specialist stop
can also close a waiting specialist. These are synthetic regression results,
pending the final committed checks and real native acceptance below.

The pinned MCP handler's own
[PostToolUse test](https://github.com/openai/codex/blob/rust-v0.154.0/codex-rs/core/src/tools/handlers/mcp.rs#L675)
confirms that the hook response field is `structuredContent` even though
the native CLI JSON event result uses `structured_content`. The parser's
camelCase hook receipt matches that source contract.

## Real native contract diagnostic

On 2026-09-16 at 01:35–01:37 UTC, the installed Codex
`0.154.0-alpha.6.2` ran one real lead date read, one real subagent date read,
and then one root date read after resuming the same session. The unchanged,
normally trusted installed PostToolUse hook sent its own allowlisted
metadata to a temporary localhost sink. No hook script was manually
invoked, no record_codex_event call was fabricated, no global settings were
changed, and no product files were modified by that diagnostic.

- Root/session id: `01a0a7da-5fef-7e42-acd2-539ee5a42d4a`.
- Actual child agent id: `01a0a7da-f0ea-74c1-9c93-9fbd53df4fc7`.
- Parent and child tool events used the **same session_id**. Child events
  additionally carried agent_id and agent_type (`default`).
- The resumed root event also used that same session_id.
- Initial run: four PostToolUse deliveries (lead Bash, spawn, child Bash,
  wait). Resume: one Bash delivery. Both native turns/processes completed.
- Captured payload keys were only session_id, turn_id, tool_name and,
  for the child, agent_id and agent_type. No raw transcript or tool body was
  retained by the diagnostic sink.

Ignored, reproducible diagnostic utility/results:
`dist/m4-native-acceptance/runtime-contract-probe.mjs`,
`runtime-contract-metadata.json`, `runtime-resume-contract-metadata.json`.
This proves the installed runtime's PostToolUse correlation fields. It does
**not** prove the new M4 hook bundle, a native permission event, or delivery
into the hosted ChatGPT widget.

The observed behavior agrees with pinned `rust-v0.154.0`:
[Session::session_id](https://github.com/openai/codex/blob/rust-v0.154.0/codex-rs/core/src/session/session.rs#L602)
returns the identity shared by the root and descendants;
[hook_runtime](https://github.com/openai/codex/blob/rust-v0.154.0/codex-rs/core/src/hook_runtime.rs#L187)
uses that value for tool events and separately supplies the child thread's
agent id. A different thread id alone does not prove a different hook
session_id. The coordinator asked SWE-2 to simplify its binding design
against this real evidence and justify any extra disk correlation state.

## Native approval preflight

An isolated interactive CLI launched with `-a on-request -s read-only`
reported **Read Only (Ask for approval)** in `/status` and exited normally.
Only `/status` and `/exit` ran. This confirms the acceptance process can use
a stricter policy without changing the user's global configuration; it is
not a permission-event acceptance result.

## Review and acceptance checklist (now completed on the supported path)

- Rerun the unchanged independent probes against the committed fix.
- Verify typecheck, full tests, build, clean exported-source compatibility,
  and prior milestone probes; retain actual exit codes through shell pipes.
- Review/install the package through the supported native flow; review and
  trust the changed hooks normally.
- Prove real specialist lifecycle/permission handling, concurrent task
  isolation, same-widget update, resume, and useful disabled-hook fallback.
- Record precise support limits. Human private-alpha results remain pending.
