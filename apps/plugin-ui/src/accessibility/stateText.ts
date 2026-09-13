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

export function workerLine(worker: WorkerSnapshot): string {
  return `${worker.label} is ${WORKER_STATE_TEXT[worker.state]}.`;
}

export function taskLine(task: TaskSnapshot): string {
  if (task.noRecentActivity) return "No recent activity.";
  return `Task is ${TASK_STATE_TEXT[task.state]}.`;
}
