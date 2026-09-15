import type { TaskSnapshot } from "@visual-team/contracts";
import { hostBridge } from "../bridge/hostBridge.js";
import { RobotAvatar } from "../components/RobotAvatar.js";
import { WORKER_STATE_TEXT } from "../accessibility/stateText.js";
import { useReducedMotion } from "../accessibility/useReducedMotion.js";

/**
 * Picture-in-picture roster (PROJECT_PLAN.md §12.3). The flag stays so the
 * view can be withdrawn if real-host PiP proves unreliable (plan §14).
 * See docs/feasibility-report.md for the PiP platform test.
 */
export const PIP_FEATURE_ENABLED = true;

export function PipView({ task, stale = false }: { task: TaskSnapshot; stale?: boolean }) {
  const reduced = useReducedMotion();
  return (
    <div className="vt-pip" aria-label={`Team status: ${task.title}`}>
      <ul>
        {task.workers.slice(0, 3).map((w) => (
          <li key={w.id}>
            <RobotAvatar role={w.role} state={w.state} label={w.label} size={22} animated={!reduced && !stale} />
            <span className="vt-pip-line">
              {w.label} — {WORKER_STATE_TEXT[w.state]}
            </span>
          </li>
        ))}
      </ul>
      {task.needsUser && <span className="vt-needs-dot" role="status" aria-label="This task needs you" />}
      <button type="button" className="vt-btn" onClick={() => void hostBridge.requestDisplayMode("inline")}>
        Back to chat
      </button>
    </div>
  );
}
