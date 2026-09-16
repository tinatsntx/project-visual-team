import {
  EVENT_DETAIL_MAX_CHARS,
  type FinishVisualTaskInput,
  type TaskResult,
  type VisualEvent,
  type WorkflowPhase,
} from "@visual-team/contracts";

/**
 * Model-reported workflow boundaries -> visual events (PROJECT_PLAN.md §9.2,
 * §9.5). Every event here carries `reported` provenance: the host model's own
 * claim about its work, never observed runtime evidence. The state machine's
 * transition tables still apply — unsupported transitions are rejected.
 */

interface ReportedBase {
  taskId: string;
  /** ISO-8601 UTC timestamp supplied by the caller (injected clock). */
  at: string;
  /** Deterministic idempotency key supplied by the caller. */
  eventId: string;
}

const PHASE_LABEL: Record<WorkflowPhase, string> = {
  planning: "Reported: planning.",
  researching: "Reported: researching.",
  implementing: "Reported: implementing.",
  testing: "Reported: testing.",
  reviewing: "Reported: reviewing.",
  waiting_for_user: "Reported: waiting for you.",
  completed: "Reported: task completed.",
  failed: "Reported: task failed.",
};

export function mapWorkflowPhase(input: ReportedBase & { phase: WorkflowPhase }): VisualEvent {
  const base = {
    id: input.eventId,
    taskId: input.taskId,
    at: input.at,
    provenance: "reported" as const,
    label: PHASE_LABEL[input.phase],
  };
  switch (input.phase) {
    case "planning":
      return { ...base, kind: "worker_transition", to: "PLANNING" };
    case "researching":
    case "implementing":
    case "testing":
      return { ...base, kind: "worker_transition", to: "WORKING" };
    case "reviewing":
      return { ...base, kind: "worker_transition", to: "REVIEWING" };
    case "waiting_for_user":
      return { ...base, kind: "task_transition", to: "WAITING_FOR_USER" };
    case "completed":
      return { ...base, kind: "task_finished", to: "COMPLETED" };
    case "failed":
      return { ...base, kind: "task_finished", to: "FAILED" };
  }
}

export type MapFinishResult =
  | { ok: true; event: VisualEvent }
  | { ok: false; reason: string };

export function mapTaskFinish(
  input: ReportedBase & Pick<FinishVisualTaskInput, "outcome" | "summary" | "verification" | "artifacts">,
): MapFinishResult {
  // Every accepted field is preserved whole: verification and artifact
  // references are never truncated or split. A combined result that exceeds
  // the detail bound is rejected before any state change.
  const detail = [
    input.summary ? `result: ${input.summary}` : null,
    input.verification ? `verification: ${input.verification}` : null,
    input.artifacts?.length
      ? `artifacts: ${input.artifacts.map((a) => (a.uri ? `${a.label} (${a.uri})` : a.label)).join(", ")}`
      : null,
  ]
    .filter(Boolean)
    .join("; ");
  if (detail.length > EVENT_DETAIL_MAX_CHARS) {
    return {
      ok: false,
      reason: `finish metadata is ${detail.length} chars; the detail bound is ${EVENT_DETAIL_MAX_CHARS}`,
    };
  }
  // The same fields also ride as a structured receipt (brief 011) so views
  // can render checks/artifacts without parsing the free-text detail. Only
  // reported task_finished events may carry it — the reducer enforces that.
  // An explicitly empty summary is the legacy "no summary" case — it must not
  // mint an invalid receipt (receipts require a non-empty summary string).
  const summary = input.summary ? input.summary : undefined;
  const result: TaskResult | undefined =
    summary !== undefined || input.verification !== undefined || input.artifacts !== undefined
      ? {
          ...(summary !== undefined ? { summary } : {}),
          ...(input.verification !== undefined ? { verification: input.verification } : {}),
          ...(input.artifacts !== undefined ? { artifacts: input.artifacts } : {}),
        }
      : undefined;
  return {
    ok: true,
    event: {
      id: input.eventId,
      taskId: input.taskId,
      at: input.at,
      provenance: "reported",
      kind: "task_finished",
      to: input.outcome === "failed" ? "FAILED" : "COMPLETED",
      label: PHASE_LABEL[input.outcome],
      ...(detail ? { detail } : {}),
      ...(result ? { result } : {}),
    },
  };
}
