import { useSyncExternalStore } from "react";
import type { TaskSnapshot } from "@visual-team/contracts";
import { useVisualTask } from "./bridge/useVisualTask.js";
import { hostBridge } from "./bridge/hostBridge.js";
import { RefreshNotice } from "./components/RefreshNotice.js";
import { InlineView } from "./modes/InlineView.js";
import { FullscreenView } from "./modes/FullscreenView.js";
import { PipView, PIP_FEATURE_ENABLED } from "./modes/PipView.js";

function LimitedView({ task }: { task: TaskSnapshot | null }) {
  return (
    <section className="vt-inline">
      {task && <h3 className="vt-title">{task.title}</h3>}
      <p className="vt-muted">Live view is limited — check the chat for the current status.</p>
    </section>
  );
}

export function App() {
  const {
    task,
    recentEvents,
    uiAvailable,
    phase,
    refresh,
    lastUpdatedAt,
    retry,
    askHostToRender,
  } = useVisualTask();
  const mode = useSyncExternalStore(
    (onChange) => hostBridge.subscribeDisplayMode(onChange),
    () => hostBridge.currentDisplayMode(),
    () => "inline",
  );

  if (!task) {
    // The server declared the UI fallback (no bundle); not a wait state.
    if (!uiAvailable) return <LimitedView task={null} />;
    if (phase === "unavailable") {
      return (
        <section className="vt-inline" aria-label="Visual Team status">
          <p className="vt-muted">The task status isn't showing yet.</p>
          <div className="vt-actions">
            <button type="button" className="vt-btn vt-btn-primary" onClick={retry}>
              Try again
            </button>
            <button type="button" className="vt-btn" onClick={() => void askHostToRender()}>
              Ask ChatGPT to render it again
            </button>
          </div>
          <p className="vt-muted">If it still doesn't appear, ask ChatGPT to render the board again.</p>
        </section>
      );
    }
    return (
      <section className="vt-inline">
        <p className="vt-muted">Waiting for the task status…</p>
      </section>
    );
  }

  if (!uiAvailable) return <LimitedView task={task} />;

  // While refresh health is stale/unavailable, last-known data must not
  // animate as if it were current activity.
  const stale = refresh === "stale" || refresh === "unavailable";
  const notice = stale ? (
    <RefreshNotice
      kind={refresh as "stale" | "unavailable"}
      lastUpdatedAt={lastUpdatedAt}
      onRetry={retry}
      onAskHost={askHostToRender}
    />
  ) : null;

  if (mode === "fullscreen") {
    return (
      <>
        {notice}
        <FullscreenView task={task} recentEvents={recentEvents} stale={stale} lastUpdatedAt={lastUpdatedAt} />
      </>
    );
  }
  if (mode === "pip" && PIP_FEATURE_ENABLED) {
    return (
      <PipView
        task={task}
        recentEvents={recentEvents}
        refresh={refresh}
        lastUpdatedAt={lastUpdatedAt}
        onRetry={retry}
      />
    );
  }
  return (
    <>
      {notice}
      <InlineView
        task={task}
        recentEvents={recentEvents}
        stale={stale}
        lastUpdatedAt={lastUpdatedAt}
        onRetry={retry}
      />
    </>
  );
}
