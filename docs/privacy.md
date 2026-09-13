# Privacy model

Per PROJECT_PLAN.md §13.

## Not stored (by default)

Complete prompts, chat transcripts, repository paths (beyond an optional
project label), source code, command text, command output, file contents,
generated artifacts, API keys, or credentials.

## Stored

Opaque task id, optional user-chosen title, role labels, state events,
timestamps, provenance, non-sensitive result labels, and host-supplied
artifact references (never artifact contents).

## Retention

Anonymous alpha: in-memory only, tasks expire ~2 hours after creation, and
nothing is written to disk. No cross-device history, no permanent bot memory.

## Public beta decision

Before a multiuser release: remain anonymous/conversation-scoped, or add
OAuth 2.1 for persistent per-user state. No accounts for marketing analytics.

## User-facing guidance

The interface warns users not to put sensitive content in task titles. The
MVP is not for regulated data, PHI, classified information, or secrets.
