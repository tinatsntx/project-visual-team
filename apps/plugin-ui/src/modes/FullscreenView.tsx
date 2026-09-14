import type { TaskSnapshot, VisualEvent } from "@visual-team/contracts";
import { RobotAvatar } from "../components/RobotAvatar.js";
import { StatusBadge } from "../components/StatusBadge.js";
import { EvidencePanel } from "../components/EvidencePanel.js";
import { taskLine, workerLine } from "../accessibility/stateText.js";
import { useReducedMotion } from "../accessibility/useReducedMotion.js";
import { hostBridge } from "../bridge/hostBridge.js";

/**
 * Fullscreen view (PROJECT_PLAN.md §12.2): Goal, Team, Workstreams,
 * Needs you, Results, Evidence. The host's composer stays the conversational
 * control surface — none is recreated here.
 */
export function FullscreenView({
  task,
  recentEvents,
  stale = false,
}: {
  task: TaskSnapshot;
  recentEvents: VisualEvent[];
  /** Stale/unavailable refresh: last-known data renders without motion. */
  stale?: boolean;
}) {
  const reduced = useReducedMotion();
  const needsUser = task.needsUser;
  const done = task.state === "COMPLETED" || task.state === "FAILED";

  return (
    <main className="vt-full" aria-label={`Visual team: ${task.title}`}>
      <header className="vt-full-header">
        <h2>{task.title}</h2>
        <StatusBadge state={task.state} kind="task" />
        <button type="button" className="vt-btn" onClick={() => void hostBridge.requestDisplayMode("inline")}>
          Back to chat
        </button>
      </header>

      <section aria-labelledby="vt-goal">
        <h3 id="vt-goal">Goal</h3>
        <p>{task.summary}</p>
        <p className="vt-muted">{taskLine(task)}</p>
      </section>

      <section aria-labelledby="vt-team">
        <h3 id="vt-team">Team</h3>
        <ul className="vt-roster">
          {task.workers.map((w) => (
            <li key={w.id} className="vt-roster-item">
              <RobotAvatar role={w.role} state={w.state} label={w.label} animated={!reduced && !stale} />
              <div>
                <strong>{w.label}</strong> <span className="vt-muted">{w.role}</span>
                <p className="vt-muted">{workerLine(w)}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="vt-streams">
        <h3 id="vt-streams">Workstreams</h3>
        <ul>
          {task.workers.map((w) => (
            <li key={w.id}>
              {w.label} owns the {w.role} track.
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="vt-needs">
        <h3 id="vt-needs">Needs you</h3>
        {needsUser ? (
          <p role="alert">Approval or a decision is pending. Respond in the chat — nothing is approved automatically.</p>
        ) : (
          <p className="vt-muted">Nothing needs you right now.</p>
        )}
      </section>

      <section aria-labelledby="vt-results">
        <h3 id="vt-results">Results</h3>
        {done ? (
          <p>Task finished with status: {task.state.toLowerCase()}. Check the chat for the full result.</p>
        ) : (
          <p className="vt-muted">Work is still in progress.</p>
        )}
      </section>

      <section aria-labelledby="vt-evidence">
        <h3 id="vt-evidence">Evidence</h3>
        <EvidencePanel events={recentEvents} />
      </section>
    </main>
  );
}
