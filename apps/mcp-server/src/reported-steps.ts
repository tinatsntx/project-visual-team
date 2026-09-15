import type { FinishVisualTaskInput, VisualEvent, WorkflowPhase } from "@visual-team/contracts";

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

export function mapTaskFinish(
  input: ReportedBase & Pick<FinishVisualTaskInput, "outcome" | "summary" | "verification" | "artifacts">,
): VisualEvent {
  const detail = [
    input.summary ? `result: ${input.summary}` : null,
    input.verification ? `verification: ${input.verification}` : null,
    input.artifacts?.length
      ? `artifacts: ${input.artifacts.map((a) => (a.uri ? `${a.label} (${a.uri})` : a.label)).join(", ")}`
      : null,
  ]
    .filter(Boolean)
    .join("; ")
    .slice(0, 500);
  return {
    id: input.eventId,
    taskId: input.taskId,
    at: input.at,
    provenance: "reported",
    kind: "task_finished",
    to: input.outcome === "failed" ? "FAILED" : "COMPLETED",
    label: PHASE_LABEL[input.outcome],
    ...(detail ? { detail } : {}),
  };
}
