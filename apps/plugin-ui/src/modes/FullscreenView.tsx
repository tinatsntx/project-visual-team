import type { TaskSnapshot, VisualEvent } from "@visual-team/contracts";
import { RobotAvatar } from "../components/RobotAvatar.js";
import { StatusBadge } from "../components/StatusBadge.js";
import { EvidencePanel } from "../components/EvidencePanel.js";
import { needActions, TASK_STATE_TEXT, taskLine, workerLine } from "../accessibility/stateText.js";
import { useReducedMotion } from "../accessibility/useReducedMotion.js";
import { hostBridge } from "../bridge/hostBridge.js";
import { finishDetail, VERIFICATION_TEXT } from "../resultDetail.js";

/**
 * Fullscreen view (PROJECT_PLAN.md §12.2): Goal, Team, Workstreams,
 * Needs you, Results, Evidence. The host's composer stays the conversational
 * control surface — none is recreated here. Results surface the recorded
 * finish detail and verification label; absence is stated, never success.
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
  const needs = needActions(task);
  // Mirrors TERMINAL_TASK_STATES — kept local so the widget bundle doesn't
  // pull in the reducer package.
  const done =
    task.state === "COMPLETED" || task.state === "FAILED" || task.state === "CANCELED";
  const finish = finishDetail(recentEvents);

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
                <strong>{w.label}</strong> <span className="vt-muted">{w.role}{w.isWriter ? " · writes" : " · read-only"}</span>
                <p className="vt-muted">{workerLine(w, task)}</p>
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
        {needs.length > 0 ? (
          <ul className="vt-needs-list" role="status">
            {needs.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : (
          <p className="vt-muted">Nothing needs you right now.</p>
        )}
      </section>

      <section aria-labelledby="vt-results">
        <h3 id="vt-results">Results</h3>
        {!done ? (
          <p className="vt-muted">Work is still in progress.</p>
        ) : !finish.event ? (
          <p className="vt-muted">
            Task ended as {TASK_STATE_TEXT[task.state].toLowerCase()} — no finish event was
            recorded in this view's recent history. Check the chat for what the model reported.
          </p>
        ) : (
          <div className="vt-result">
            <p>
              {finish.verification ? (
                <>
                  <span className={`vt-verify vt-verify-${finish.verification.replaceAll("_", "-")}`}>
                    {VERIFICATION_TEXT[finish.verification]}
                  </span>{" "}
                  <span className="vt-muted">reported</span>
                </>
              ) : (
                <span className="vt-verify">No verification recorded</span>
              )}
            </p>
            {finish.detail ? (
              <p className="vt-result-detail">{finish.detail}</p>
            ) : (
              <p className="vt-muted">The finish event carried no result summary — check the chat.</p>
            )}
          </div>
        )}
      </section>

      <section aria-labelledby="vt-evidence">
        <h3 id="vt-evidence">Evidence</h3>
        <EvidencePanel events={recentEvents} />
      </section>

      <p className="vt-privacy">
        Task titles and summaries are stored as ephemeral metadata — keep secrets and
        sensitive content out of them. Private mode changes nothing about retention today.
      </p>
    </main>
  );
}
