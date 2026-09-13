import type { TaskState, WorkerState } from "@visual-team/contracts";
import { TASK_STATE_TEXT, WORKER_STATE_TEXT } from "../accessibility/stateText.js";

export function StatusBadge({ state, kind }: { state: TaskState | WorkerState; kind: "task" | "worker" }) {
  const text = kind === "task" ? TASK_STATE_TEXT[state as TaskState] : WORKER_STATE_TEXT[state as WorkerState];
  return <span className={`vt-badge vt-badge-${state.toLowerCase().replaceAll("_", "-")}`}>{text}</span>;
}
