import { useEffect, useState } from "react";
import type { TaskSnapshot, WorkerSnapshot } from "@visual-team/contracts";
import { RobotAvatar } from "./RobotAvatar.js";
import { workerLine } from "../accessibility/stateText.js";
import { useReducedMotion } from "../accessibility/useReducedMotion.js";

/** Only genuinely-active worker states may ever animate. */
const ANIMATED_STATES = new Set<WorkerSnapshot["state"]>(["WORKING", "REVIEWING", "PLANNING"]);

/**
 * Optional character view (brief 011): the truthful roster — each member's
 * recorded state, role, and single-writer ownership. Characters live here,
 * never in the default status views.
 *
 * Motion is off by default and opt-in only; the preference is local to this
 * mounted view and resets when the task changes. It is always suppressed by
 * reduced motion, stale/unavailable data, no recent activity, and
 * inactive/terminal workers.
 */
export function TeamView({
  task,
  stale = false,
  motion,
  onMotionChange,
}: {
  task: TaskSnapshot;
  stale?: boolean;
  /**
   * Optional controlled motion preference. When provided, the parent owns
   * the opt-in state; otherwise the view keeps it internally.
   */
  motion?: boolean;
  onMotionChange?: (on: boolean) => void;
}) {
  const reduced = useReducedMotion();
  const [internal, setInternal] = useState(false);
  // The opt-in never survives a task switch — a new task starts static.
  useEffect(() => setInternal(false), [task.id]);
  const motionOn = motion ?? internal;
  const setMotion = onMotionChange ?? setInternal;

  const animated = (w: WorkerSnapshot): boolean =>
    motionOn &&
    !reduced &&
    !stale &&
    !task.noRecentActivity &&
    ANIMATED_STATES.has(w.state);

  return (
    <div className="vt-team">
      <ul className="vt-roster" aria-label="Team roster">
        {task.workers.map((w) => (
          <li key={w.id} className="vt-roster-item">
            <RobotAvatar
              role={w.role}
              state={w.state}
              label={w.label}
              animated={animated(w)}
            />
            <div>
              <strong>{w.label}</strong>{" "}
              <span className="vt-muted">
                {w.role}
                {w.isWriter ? " · writes" : " · read-only"}
              </span>
              <p className="vt-muted">{workerLine(w, task)}</p>
            </div>
          </li>
        ))}
      </ul>
      {/* Reduced motion removes the affordance entirely — there is nothing
          to opt into when the platform asked for no motion. */}
      {!reduced && (
        <button
          type="button"
          className="vt-btn vt-btn-compact"
          aria-pressed={motionOn}
          onClick={() => setMotion(!motionOn)}
        >
          {motionOn ? "Turn motion off" : "Turn motion on"}
        </button>
      )}
    </div>
  );
}
