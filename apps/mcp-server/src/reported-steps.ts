import {
  EVENT_DETAIL_MAX_CHARS,
  WORKFLOW_PHASE_EVENT,
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
  // The phase rides the exact workflow event that means it — the shared
  // WORKFLOW_PHASE_EVENT table is also the reducer's admission rule, so a
  // phase can never be mapped onto an event it does not correlate with.
  const shape = WORKFLOW_PHASE_EVENT[input.phase];
  return {
    id: input.eventId,
    taskId: input.taskId,
    at: input.at,
    provenance: "reported",
    kind: shape.kind,
    to: shape.to,
    label: PHASE_LABEL[input.phase],
    // The reported phase rides the event and lands on the snapshot, so the
    // recorded phase survives later generic native activity (brief 011 §4).
    phase: input.phase,
  };
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
      // The finish is itself a reported terminal phase claim.
      phase: input.outcome,
      ...(detail ? { detail } : {}),
      ...(result ? { result } : {}),
    },
  };
}
