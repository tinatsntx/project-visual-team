# Privacy model

Per PROJECT_PLAN.md §13.

## Not stored (by default)

Complete prompts, chat transcripts, repository paths (beyond an optional
project label), source code, command text, command output, file contents,
generated artifacts, API keys, or credentials.

## Stored

Opaque task id, optional user-chosen title, role labels, state events,
timestamps, provenance, non-sensitive result labels, host-supplied artifact
references (never artifact contents), and routing-correlation metadata:
Codex `session_id`/`turn_id`/`agent_id`/`agent_type`/generic `tool_name`
values bound to a task by observed evidence. The hook forwards only those
five metadata fields; prompts, tool inputs/outputs, transcripts, paths, and
cwd never leave the hook process.

## Retention

Anonymous alpha: in-memory only, tasks expire ~2 hours after creation
(configurable per process via `VISUAL_TEAM_TTL_MS`). The plugin task service
writes no task records to disk; the hook keeps no local binding files.
Correlation bindings are bounded and swept with their task. A server
restart drops all tasks and bindings: a resumed Codex session must produce a
new validated `start_visual_task` receipt before its untargeted events
route again (until then they are rejected, not misrouted). No cross-device
history, no permanent bot memory.

## Caller-provided labels and host retention

Titles, summaries, result labels, and artifact references are caller-provided
text. Keep them generic and free of secrets; the plugin cannot establish that
a label is safe merely because it passes a length/schema check. Raw content
is not captured automatically by the hook.

ChatGPT and Codex can retain conversations and tool calls under their own
settings, and the hosting provider retains operational/request logs under
its own service settings. The plugin's in-memory expiry does not erase those
host records, exported acceptance evidence, or copies a user chooses to save.

## Public beta decision

Before a multiuser release: remain anonymous/conversation-scoped, or add
OAuth 2.1 for persistent per-user state. No accounts for marketing analytics.

## User-facing guidance

The interface warns users not to put sensitive content in task titles. The
MVP is not for regulated data, PHI, classified information, or secrets.
