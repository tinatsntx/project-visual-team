import type { TaskSnapshot, TaskState, WorkerSnapshot, WorkerState } from "@visual-team/contracts";

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
 * Actionable pending-need lines (brief 008 item 1). `pendingUserNeeds` keys
 * attribute each unresolved ask: `worker:<id>` is a native permission ask —
 * it can only be answered in the Codex prompt; `task` is a reported
 * question — it goes back to the chat. Absent attribution (older snapshots)
 * degrades to the generic line, never an invented ask.
 */
export function needActions(task: TaskSnapshot): string[] {
  if (!task.needsUser) return [];
  const needs = task.pendingUserNeeds;
  if (!needs || Object.keys(needs).length === 0) {
    return ["This task needs you."];
  }
  const lines: string[] = [];
  for (const key of Object.keys(needs)) {
    if (key === "task") {
      lines.push("A question is waiting — answer in the chat.");
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
