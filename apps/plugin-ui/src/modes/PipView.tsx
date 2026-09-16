import type { TaskSnapshot, VisualEvent } from "@visual-team/contracts";
import { hostBridge } from "../bridge/hostBridge.js";
import type { RefreshHealth } from "../bridge/taskData.js";
import { StatusBadge } from "../components/StatusBadge.js";
import { ResultBlock } from "../components/ResultBlock.js";
import {
  latestActivityLine,
  lastRefreshLine,
  needActions,
  NO_PENDING_NEEDS_TEXT,
  phaseLine,
  workerLine,
} from "../accessibility/stateText.js";

/** Mirrors TERMINAL_TASK_STATES — kept local so the widget stays reducer-free. */
const TERMINAL = new Set(["COMPLETED", "FAILED", "CANCELED"]);

/**
 * Picture-in-picture status (brief 011): compact text-first glance — title,
 * recorded phase with provenance, pending needs, worker status lines, and
 * latest recorded activity. A terminal task keeps an accessible "Results"
 * disclosure so checks and artifact references are inspectable without the
 * characters. The display-mode flag stays so the view can be withdrawn if
 * real-host PiP proves unreliable (plan §14).
 */
export const PIP_FEATURE_ENABLED = true;

export function PipView({
  task,
  recentEvents = [],
  refresh = "off",
  lastUpdatedAt = null,
  onRetry,
}: {
  task: TaskSnapshot;
  recentEvents?: VisualEvent[];
  refresh?: RefreshHealth;
  lastUpdatedAt?: string | null;
  onRetry?: () => void;
}) {
  const needs = needActions(task);
  const done = TERMINAL.has(task.state);
  return (
    <section className="vt-pip" aria-label={`Team status: ${task.title}`}>
      <h2 className="vt-pip-title">{task.title}</h2>
      {needs.length > 0 ? (
        <p className="vt-pip-note vt-pip-needs" role="status">
          {needs.join(" ")}
        </p>
      ) : (
        <p className="vt-pip-note">{NO_PENDING_NEEDS_TEXT}</p>
      )}
      <p className="vt-pip-note">
        <StatusBadge state={task.state} kind="task" />{" "}
        <span className="vt-muted">{task.stateProvenance}</span>
      </p>
      <p className="vt-pip-note vt-meta">Reported phase: {phaseLine(task)}</p>
      <ul>
        {task.workers.slice(0, 3).map((w) => (
          <li key={w.id}>
            <span className="vt-pip-line">{workerLine(w, task)}</span>
          </li>
        ))}
      </ul>
      <p className="vt-pip-note">{latestActivityLine(recentEvents)}</p>
      {/* The last successful refresh is stated in every health state — it is
          never the same fact as latest activity or the stale notice. */}
      <p className="vt-pip-note vt-meta">{lastRefreshLine(lastUpdatedAt)}</p>
      {task.noRecentActivity && <p className="vt-pip-note">No recent activity.</p>}
      {(refresh === "stale" || refresh === "unavailable") && (
        <p className="vt-pip-note" role="status">
          {/* Stale/unavailable data keeps explicit last-known wording — the
              separate refresh-time line above states when it was confirmed. */}
          {refresh === "stale"
            ? "Updates paused — last confirmed state shown."
            : "Live updates unavailable — last confirmed state shown."}
          {onRetry && (
            <>
              {" "}
              <button type="button" className="vt-btn vt-btn-compact" onClick={onRetry}>
                Try again
              </button>
            </>
          )}
        </p>
      )}
      {done && (
        <details className="vt-pip-results">
          <summary>Results</summary>
          <ResultBlock task={task} events={recentEvents} />
        </details>
      )}
      <button type="button" className="vt-btn" onClick={() => void hostBridge.requestDisplayMode("inline")}>
        Back to chat
      </button>
      <p className="vt-privacy">Task titles are stored metadata — keep sensitive content out.</p>
    </section>
  );
}
