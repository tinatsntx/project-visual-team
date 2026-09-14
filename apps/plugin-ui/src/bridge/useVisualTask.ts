import { useCallback, useEffect, useRef, useState } from "react";
import { TASK_CAPABILITY_META_KEY } from "@visual-team/contracts/meta";
import type { TaskSnapshot, VisualEvent } from "@visual-team/contracts";
import { hostBridge, type ToolResultMessage } from "./hostBridge.js";

/**
 * Task data hook. Sources, in priority order (PROJECT_PLAN.md §7.4):
 *  1. `ui/notifications/tool-result` / `tool-input` from the host bridge.
 *  2. The mounted render result exposed by the host bridge globals.
 *  3. While the task is non-terminal, poll `get_visual_task` via `tools/call`
 *     with the task capability token from UI-private result metadata.
 *  4. Dev harness data (`window.__VISUAL_TEAM_DEV__`).
 */

export interface TaskViewModel {
  task: TaskSnapshot | null;
  recentEvents: VisualEvent[];
  uiAvailable: boolean;
  refresh: () => void;
}

const POLL_MS = 4_000; // within the 5s refresh metric (§16)

const TERMINAL = new Set(["COMPLETED", "FAILED", "CANCELED"]);

function readResult(result: ToolResultMessage | null | undefined): {
  task: TaskSnapshot | null;
  recentEvents: VisualEvent[] | null;
  taskId: string | null;
  uiAvailable: boolean;
} {
  const sc = result?.structuredContent as
    | { task?: TaskSnapshot; recentEvents?: VisualEvent[]; taskId?: string; uiAvailable?: boolean }
    | undefined;
  return {
    task: sc?.task ?? null,
    recentEvents: sc?.recentEvents ?? null,
    taskId: sc?.task?.id ?? sc?.taskId ?? null,
    uiAvailable: sc?.uiAvailable !== false,
  };
}

export function useVisualTask(): TaskViewModel {
  const [task, setTask] = useState<TaskSnapshot | null>(null);
  const [recentEvents, setRecentEvents] = useState<VisualEvent[]>([]);
  const [capability, setCapability] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [uiAvailable, setUiAvailable] = useState(true);
  const [tick, setTick] = useState(0);
  const taskRef = useRef<TaskSnapshot | null>(null);
  taskRef.current = task;

  const applyResult = useCallback((result: ToolResultMessage | null | undefined) => {
    const { task: t, recentEvents: evts, taskId, uiAvailable: ok } = readResult(result);
    if (t) {
      setTask(t);
      setTaskId(t.id);
    } else if (taskId) {
      setTaskId(taskId);
    }
    if (evts) setRecentEvents(evts);
    setUiAvailable(ok);
    const token = result?._meta?.[TASK_CAPABILITY_META_KEY];
    if (typeof token === "string") setCapability(token);
  }, []);

  useEffect(() => {
    hostBridge.start();

    applyResult(hostBridge.initialToolResult());

    return hostBridge.onNotification((method, params) => {
      if (method === "ui/notifications/tool-result") {
        applyResult(params as ToolResultMessage);
      }
    });
  }, [applyResult]);

  // Poll the read-only data tool while work is live; `tick` makes a user or
  // host-triggered refresh perform this same read immediately.
  useEffect(() => {
    const current = taskRef.current;
    if (!capability || !taskId || (current && TERMINAL.has(current.state))) return;
    let cancelled = false;
    const read = () => {
      hostBridge
        .callTool(
          "get_visual_task",
          { taskId, eventLimit: 20 },
          { [TASK_CAPABILITY_META_KEY]: capability },
        )
        .then((result) => {
          if (!cancelled && !result.isError) applyResult(result);
        })
        .catch(() => undefined); // limited visibility is disclosed, never faked
    };
    read();
    const id = setInterval(read, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [capability, taskId, task?.state, tick, applyResult]);

  return {
    task,
    recentEvents,
    uiAvailable,
    refresh: () => setTick((n) => n + 1),
  };
}
