import type { TaskSnapshot } from "@visual-team/contracts";
import { RobotAvatar } from "../components/RobotAvatar.js";
import { WORKER_STATE_TEXT } from "../accessibility/stateText.js";
import { useReducedMotion } from "../accessibility/useReducedMotion.js";

/**
 * Picture-in-picture roster (PROJECT_PLAN.md §12.3). Milestone 0 placeholder:
 * rendered only when the host asks for PiP AND the feature flag is on.
 * See docs/feasibility-report.md for the PiP platform test.
 */
export const PIP_FEATURE_ENABLED = false;

export function PipView({ task }: { task: TaskSnapshot }) {
  const reduced = useReducedMotion();
  return (
    <div className="vt-pip" aria-label={`Team status: ${task.title}`}>
      <ul>
        {task.workers.slice(0, 3).map((w) => (
          <li key={w.id}>
            <RobotAvatar role={w.role} state={w.state} label={w.label} size={22} animated={!reduced} />
            <span className="vt-pip-line">
              {w.label} — {WORKER_STATE_TEXT[w.state]}
            </span>
          </li>
        ))}
      </ul>
      {task.needsUser && <span className="vt-needs-dot" role="status" aria-label="This task needs you" />}
    </div>
  );
}
