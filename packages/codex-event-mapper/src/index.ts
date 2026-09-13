import {
  CodexEventNameSchema,
  type CodexHookPayload,
  type CodexEventName,
  type VisualEvent,
} from "@visual-team/contracts";

/**
 * Codex lifecycle event -> visual event mapping (PROJECT_PLAN.md §10).
 *
 * This mapper records activity only. It can never approve, deny, rewrite, or
 * block a Codex action, and it must not fabricate actions that hooks cannot
 * see (e.g. hosted web search). Unknown payload fields are ignored upstream
 * by CodexHookPayloadSchema.
 */

export interface MapInput {
  taskId: string;
  name: CodexEventName;
  payload?: CodexHookPayload | undefined;
  /** ISO-8601 UTC timestamp supplied by the caller (injected clock). */
  at: string;
  /** Deterministic idempotency key supplied by the caller. */
  eventId: string;
}

export type MapResult =
  | { ok: true; events: VisualEvent[] }
  | { ok: false; reason: string };

function base(input: MapInput, kind: VisualEvent["kind"], label: string): VisualEvent {
  return {
    id: input.eventId,
    taskId: input.taskId,
    at: input.at,
    provenance: "observed",
    kind,
    label,
  };
}

export function mapCodexEvent(input: MapInput): MapResult {
  const parsed = CodexEventNameSchema.safeParse(input.name);
  if (!parsed.success) {
    return { ok: false, reason: `unsupported codex event: ${String(input.name)}` };
  }
  const p = input.payload ?? {};
  const who = p.agent_id ?? undefined;

  switch (parsed.data) {
    case "SessionStart":
      return {
        ok: true,
        events: [{ ...base(input, "activity", "Session ready — waiting for work.") }],
      };

    case "UserPromptSubmit":
      // Observed prompt submission, not proof of execution.
      return {
        ok: true,
        events: [
          { ...base(input, "worker_transition", "Reading the request."), to: "PLANNING" },
        ],
      };

    case "SubagentStart":
      // A real specialist joined. Correlate on agent_id when present.
      return {
        ok: true,
        events: [
          {
            ...base(input, "specialist_joined", "A specialist joined the task."),
            ...(who ? { workerId: who } : {}),
            ...(p.agent_type ? { detail: `agent_type: ${p.agent_type}` } : {}),
          },
        ],
      };

    case "PreToolUse":
      // Working on a concrete action. Hosted tools may never appear here;
      // absence of an event is disclosed, not invented (plan §10).
      return {
        ok: true,
        events: [
          {
            ...base(input, "worker_transition", "Working on it."),
            to: "WORKING",
            ...(who ? { workerId: who } : {}),
            ...(p.tool_name ? { detail: `tool: ${p.tool_name}` } : {}),
          },
        ],
      };

    case "PostToolUse":
      // An action finished — NOT equivalent to task success.
      return {
        ok: true,
        events: [
          {
            ...base(input, "activity", "Finished a step."),
            ...(who ? { workerId: who } : {}),
            ...(p.tool_name ? { detail: `tool: ${p.tool_name}` } : {}),
          },
        ],
      };

    case "PermissionRequest":
      // Record only. Native approval flow is preserved untouched.
      return {
        ok: true,
        events: [
          {
            ...base(input, "permission_request", "Waiting for your approval."),
            ...(who ? { workerId: who } : {}),
          },
        ],
      };

    case "SubagentStop":
      // The specialist's delegated turn finished; the task may continue.
      return {
        ok: true,
        events: [
          {
            ...base(input, "specialist_finished", "A specialist finished its part."),
            ...(who ? { workerId: who } : {}),
          },
        ],
      };

    case "Stop":
      // Current turn finished — shown as "turn finished", never "completed".
      return {
        ok: true,
        events: [{ ...base(input, "turn_finished", "Turn finished.") }],
      };

    case "Interrupt":
      // Work interrupted; state stays resumable.
      return {
        ok: true,
        events: [{ ...base(input, "interrupted", "Work was interrupted — you can resume.") }],
      };
  }
}
