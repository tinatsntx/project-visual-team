import type { TaskSnapshot } from "@visual-team/contracts";
import { hostBridge } from "../bridge/hostBridge.js";
import type { RefreshHealth } from "../bridge/taskData.js";
import { RobotAvatar } from "../components/RobotAvatar.js";
import { needActions, workerLine } from "../accessibility/stateText.js";
import { useReducedMotion } from "../accessibility/useReducedMotion.js";

/**
 * Picture-in-picture roster (PROJECT_PLAN.md §12.3). The flag stays so the
 * view can be withdrawn if real-host PiP proves unreliable (plan §14).
 * Compact text equivalents keep needs and refresh health visible — a dot or
 * silence alone never carries meaning (brief 008 item 2).
 */
export const PIP_FEATURE_ENABLED = true;

export function PipView({
  task,
  stale = false,
  refresh = "off",
  onRetry,
}: {
  task: TaskSnapshot;
  stale?: boolean;
  refresh?: RefreshHealth;
  onRetry?: () => void;
}) {
  const reduced = useReducedMotion();
  const needs = needActions(task);
  return (
    <section className="vt-pip" aria-label={`Team status: ${task.title}`}>
      <h2 className="vt-pip-title">{task.title}</h2>
      <ul>
        {task.workers.slice(0, 3).map((w) => (
          <li key={w.id}>
            <RobotAvatar
              role={w.role}
              state={w.state}
              label={w.label}
              size={22}
              animated={!reduced && !stale && !task.noRecentActivity}
            />
            <span className="vt-pip-line">{workerLine(w, task)}</span>
          </li>
        ))}
      </ul>
      {task.noRecentActivity && <p className="vt-pip-note">No recent activity.</p>}
      {needs.length > 0 && (
        <p className="vt-pip-note vt-pip-needs" role="status">
          {needs.join(" ")}
        </p>
      )}
      {(refresh === "stale" || refresh === "unavailable") && (
        <p className="vt-pip-note" role="status">
          {refresh === "stale" ? "Updates paused — last confirmed state." : "Live updates unavailable."}
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
      <button type="button" className="vt-btn" onClick={() => void hostBridge.requestDisplayMode("inline")}>
        Back to chat
      </button>
      <p className="vt-privacy">Task titles are stored metadata — keep sensitive content out.</p>
    </section>
  );
}
