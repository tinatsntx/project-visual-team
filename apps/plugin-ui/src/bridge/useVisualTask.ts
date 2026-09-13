import { useCallback, useEffect, useRef, useState } from "react";
import type { TaskSnapshot, VisualEvent } from "@visual-team/contracts";
import { hostBridge, type ToolResultMessage } from "./hostBridge.js";

/**
 * Task data hook. Sources, in priority order (PROJECT_PLAN.md §7.4):
 *  1. `ui/notifications/tool-result` / `tool-input` from the host bridge.
 *  2. `window.openai.toolOutput` compatibility alias.
 *  3. While the task is non-terminal, poll `get_visual_task` via `tools/call`
 *     with the task capability token from UI-private result metadata.
 *  4. Dev harness data (`window.__VISUAL_TEAM_DEV__`).
 */

export interface TaskViewModel {
  task: TaskSnapshot | null;
  recentEvents: VisualEvent[];
  capability: string | null;
  uiAvailable: boolean;
  refresh: () => void;
}

const POLL_MS = 4_000; // within the 5s refresh metric (§16)

const TERMINAL = new Set(["COMPLETED", "FAILED", "CANCELED"]);

function readResult(result: ToolResultMessage | null | undefined): {
  task: TaskSnapshot | null;
  recentEvents: VisualEvent[];
  taskId: string | null;
  uiAvailable: boolean;
} {
  const sc = result?.structuredContent as
    | { task?: TaskSnapshot; recentEvents?: VisualEvent[]; taskId?: string; uiAvailable?: boolean }
    | undefined;
  return {
    task: sc?.task ?? null,
    recentEvents: sc?.recentEvents ?? [],
    taskId: sc?.task?.id ?? sc?.taskId ?? null,
    uiAvailable: sc?.uiAvailable !== false,
  };
}

export function useVisualTask(): TaskViewModel {
  const [task, setTask] = useState<TaskSnapshot | null>(null);
  const [recentEvents, setRecentEvents] = useState<VisualEvent[]>([]);
  const [capability, setCapability] = useState<string | null>(null);
  const [uiAvailable, setUiAvailable] = useState(true);
  const [tick, setTick] = useState(0);
  const taskRef = useRef<TaskSnapshot | null>(null);
  taskRef.current = task;

  const applyResult = useCallback((result: ToolResultMessage | null | undefined) => {
    const { task: t, recentEvents: evts, taskId, uiAvailable: ok } = readResult(result);
    if (t) setTask(t);
    if (evts.length) setRecentEvents(evts);
    setUiAvailable(ok);
    const token = result?._meta?.["taskCapability"];
    if (typeof token === "string") setCapability(token);
    if (!t && taskId) setTick((n) => n + 1); // got an id only — poll for the snapshot
    void taskId;
  }, []);

  useEffect(() => {
    hostBridge.start();

    const dev = hostBridge.devData;
    if (dev) applyResult(dev.toolResult);
    if (window.openai?.toolOutput) applyResult(window.openai.toolOutput);

    return hostBridge.onNotification((method, params) => {
      if (method === "ui/notifications/tool-result") {
        applyResult(params as ToolResultMessage);
      }
    });
  }, [applyResult]);

  // Poll the read-only data tool while work is live; the iframe stays mounted
  // and only data refreshes (plan §7.4 approach 1, §9.6).
  useEffect(() => {
    const t = taskRef.current;
    if (!capability || !t || TERMINAL.has(t.state)) return;
    const id = setInterval(() => {
      hostBridge
        .callTool("get_visual_task", { taskId: t.id, capability, eventLimit: 20 })
        .then(applyResult)
        .catch(() => undefined); // limited visibility is disclosed, never faked
    }, POLL_MS);
    return () => clearInterval(id);
  }, [capability, task?.id, task?.state, applyResult]);

  return {
    task,
    recentEvents,
    capability,
    uiAvailable,
    refresh: () => setTick((n) => n + 1),
  };
}
