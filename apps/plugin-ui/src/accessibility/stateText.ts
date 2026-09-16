import type {
  TaskSnapshot,
  TaskState,
  VerificationStatus,
  VisualEvent,
  WorkerSnapshot,
  WorkerState,
} from "@visual-team/contracts";

/**
 * Text for every visual state (PROJECT_PLAN.md §3.7, §12.4). Motion and color
 * are never the only indicators — each state has an accessible label.
 */

export const WORKER_STATE_TEXT: Record<WorkerState, string> = {
  IDLE: "standing by",
  ASSIGNED: "assigned",
  PLANNING: "planning",
  WORKING: "working",
  WAITING_FOR_APPROVAL: "waiting for your approval",
  BLOCKED: "blocked",
  REVIEWING: "reviewing",
  COMPLETED: "done",
  FAILED: "failed",
  CANCELED: "canceled",
};

export const TASK_STATE_TEXT: Record<TaskState, string> = {
  DRAFT: "draft",
  PLANNING: "planning",
  ACTIVE: "active",
  WAITING_FOR_USER: "needs you",
  BLOCKED: "blocked",
  COMPLETED: "completed",
  FAILED: "failed",
  CANCELED: "canceled",
};

/**
 * Reported-checks display text (brief 011). These are the model's own
 * reported outcome — never independent verification — and only a structured
 * receipt may set them; absent structured verification reads "Not provided".
 */
export const VERIFICATION_TEXT: Record<VerificationStatus, string> = {
  passed: "Reported checks: passed",
  failed: "Reported checks: failed",
  not_run: "Reported checks: not run",
};

export const CHECKS_NOT_PROVIDED = "Reported checks: Not provided";

export function reportedChecksLine(verification: VerificationStatus | undefined): string {
  return verification ? VERIFICATION_TEXT[verification] : CHECKS_NOT_PROVIDED;
}

/**
 * The empty state for the needs list (brief 011). Recorded visibility is
 * bounded — absent evidence is never a guarantee of no pending intervention.
 */
export const NO_PENDING_NEEDS_TEXT = "No pending requests recorded.";

/** The lifecycle line is the task state plus the provenance of that claim. */
export function lifecycleLine(task: TaskSnapshot): string {
  return `${TASK_STATE_TEXT[task.state]} (${task.stateProvenance})`;
}

/**
 * The recorded *workflow phase* (brief 011 review §4): only a reported
 * `report_workflow_step`/`finish_visual_task` claim may set it — never
 * inferred from native activity, the lifecycle state, or free text. Older
 * snapshots without one read "not provided".
 */
export function phaseLine(task: TaskSnapshot): string {
  const phase = task.phase;
  if (!phase) return "not provided";
  return `${phase.name} (${phase.provenance}, ${new Date(phase.at).toLocaleTimeString()})`;
}

/**
 * Latest recorded activity with its source and time. No events in view means
 * limited visibility — never "no work" or "guaranteed quiet".
 */
export function latestActivityLine(events: VisualEvent[]): string {
  const last = events.at(-1);
  if (!last) {
    return "No recorded activity visible in this view — the snapshot is the only source.";
  }
  return `Latest recorded activity: ${last.label} (${last.provenance}, ${new Date(last.at).toLocaleTimeString()})`;
}

/** The last successful refresh is stated separately from last activity. */
export function lastRefreshLine(lastUpdatedAt: string | null | undefined): string {
  return lastUpdatedAt
    ? `Last successful refresh: ${new Date(lastUpdatedAt).toLocaleTimeString()}`
    : "No successful refresh recorded.";
}

export function workerLine(worker: WorkerSnapshot, task?: TaskSnapshot): string {
  // A CANCELED worker under a finished task means the run ended without a
  // finish signal for it — recorded tracking stopped, not a verified
  // cancellation of work the person may have seen complete (M2 limit 3).
  if (worker.state === "CANCELED" && task) {
    if (task.state === "COMPLETED") {
      return `${worker.label} — tracking ended; no finish signal was recorded.`;
    }
    if (task.state === "FAILED") return `${worker.label} stopped when the task failed.`;
    if (task.state === "CANCELED") return `${worker.label} was canceled with the task.`;
  }
  return `${worker.label} is ${WORKER_STATE_TEXT[worker.state]}.`;
}

export function taskLine(task: TaskSnapshot): string {
  if (task.noRecentActivity) return "No recent activity.";
  return `Task is ${TASK_STATE_TEXT[task.state]}.`;
}

/**
 * Actionable pending-need lines (brief 008 item 1, brief 011 review §5).
 * `pendingUserNeeds` keys attribute each unresolved ask and each value is
 * the provenance of the evidence that created it: `worker:<id>` is a native
 * permission ask — it can only be answered in the Codex prompt; a `task`
 * need with reported provenance is a reported question — answered in the
 * originating chat; an observed task-level need is a permission prompt too.
 * Absent or unknown attribution (older snapshots) degrades to the generic
 * line — a need is never invented as a question it was not reported to be.
 */
export function needActions(task: TaskSnapshot): string[] {
  if (!task.needsUser) return [];
  const needs = task.pendingUserNeeds;
  if (!needs || Object.keys(needs).length === 0) {
    return ["This task needs you."];
  }
  const lines: string[] = [];
  for (const key of Object.keys(needs)) {
    const source = needs[key];
    if (key === "task") {
      if (source === "reported") {
        // A task-level wait the model reported is a question for the person —
        // it is answered where the model asked it, which is the originating
        // chat, not a generic "the chat" this viewer may not be attached to.
        lines.push("A reported question is waiting — answer it in the originating chat.");
      } else if (source === "observed") {
        // An observed permission request without worker attribution is still
        // a native Codex prompt — not an invented question.
        lines.push("Approval may be pending — answer the Codex permission prompt.");
      }
      // Other/unknown attribution: no invented claim — the generic line below.
    } else if (key.startsWith("worker:")) {
      const worker = task.workers.find((w) => w.id === key.slice("worker:".length));
      lines.push(
        worker
          ? `${worker.label} needs approval — answer the Codex permission prompt.`
          : "Approval is pending — answer the Codex permission prompt.",
      );
    }
  }
  return lines.length > 0 ? lines : ["This task needs you."];
}
