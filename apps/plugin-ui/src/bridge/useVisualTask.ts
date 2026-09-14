import { useEffect, useSyncExternalStore } from "react";
import type { TaskSnapshot, VisualEvent } from "@visual-team/contracts";
import { hostBridge } from "./hostBridge.js";
import { taskDataStore, type RefreshHealth, type TaskInitPhase } from "./taskData.js";

/**
 * Task data hook. Sources, in priority order (PROJECT_PLAN.md §7.4):
 *  1. `ui/notifications/tool-result` from the host bridge.
 *  2. Host globals (`toolOutput`/`toolResponseMetadata`), including late
 *     `openai:set_globals` updates.
 *  3. While the task is non-terminal, poll `get_visual_task` via `tools/call`
 *     with the task capability token from UI-private result metadata.
 *  4. Dev harness data (`window.__VISUAL_TEAM_DEV__`).
 *
 * Initialization and refresh health live in TaskDataStore; the task's own
 * lifecycle stays in the snapshot and is never inferred from read failures.
 */

export interface TaskViewModel {
  task: TaskSnapshot | null;
  recentEvents: VisualEvent[];
  uiAvailable: boolean;
  phase: TaskInitPhase;
  refresh: RefreshHealth;
  lastUpdatedAt: string | null;
  hasCapability: boolean;
  retry: () => void;
  askHostToRender: () => Promise<boolean>;
}

export function useVisualTask(): TaskViewModel {
  const view = useSyncExternalStore(
    (onChange) => taskDataStore.subscribe(onChange),
    () => taskDataStore.snapshot(),
    () => taskDataStore.snapshot(),
  );

  useEffect(() => {
    hostBridge.start();
    // Subscribe before reading current state so no delivery can land in the
    // gap between the subscription and the initial read.
    const unsubscribe = hostBridge.onToolResult((result) => taskDataStore.applyToolResult(result));
    taskDataStore.start();
    taskDataStore.applyToolResult(hostBridge.currentToolResult());
    return unsubscribe;
  }, []);

  return {
    task: view.task,
    recentEvents: view.recentEvents,
    uiAvailable: view.uiAvailable,
    phase: view.phase,
    refresh: view.refresh,
    lastUpdatedAt: view.lastUpdatedAt,
    hasCapability: view.hasCapability,
    retry: () => taskDataStore.retry(),
    askHostToRender: () => hostBridge.askForRender(),
  };
}
