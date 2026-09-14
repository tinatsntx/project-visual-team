import { useSyncExternalStore } from "react";
import { useVisualTask } from "./bridge/useVisualTask.js";
import { hostBridge } from "./bridge/hostBridge.js";
import { InlineView } from "./modes/InlineView.js";
import { FullscreenView } from "./modes/FullscreenView.js";
import { PipView, PIP_FEATURE_ENABLED } from "./modes/PipView.js";

export function App() {
  const { task, recentEvents, uiAvailable } = useVisualTask();
  const mode = useSyncExternalStore(
    (onChange) => hostBridge.subscribeDisplayMode(onChange),
    () => hostBridge.currentDisplayMode(),
    () => "inline",
  );

  if (!task) {
    return (
      <section className="vt-inline">
        <p className="vt-muted">Waiting for the task status…</p>
      </section>
    );
  }

  if (!uiAvailable) {
    return (
      <section className="vt-inline">
        <h3 className="vt-title">{task.title}</h3>
        <p className="vt-muted">Live view is limited — check the chat for the current status.</p>
      </section>
    );
  }

  if (mode === "fullscreen") return <FullscreenView task={task} recentEvents={recentEvents} />;
  if (mode === "pip" && PIP_FEATURE_ENABLED) return <PipView task={task} />;
  return <InlineView task={task} recentEvents={recentEvents} />;
}
