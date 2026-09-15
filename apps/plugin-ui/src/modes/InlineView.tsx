import { useState } from "react";
import type { TaskSnapshot, VisualEvent } from "@visual-team/contracts";
import { hostBridge } from "../bridge/hostBridge.js";
import { RobotAvatar } from "../components/RobotAvatar.js";
import { StatusBadge } from "../components/StatusBadge.js";
import { EvidencePanel } from "../components/EvidencePanel.js";
import { taskLine, workerLine } from "../accessibility/stateText.js";
import { useReducedMotion } from "../accessibility/useReducedMotion.js";

/**
 * Inline card (PROJECT_PLAN.md §12.1): lead bot, title, verified status, up to
 * two supporting bots, "Open team" + "View details". No tabs, no deep
 * navigation, no chat composer.
 */
export function InlineView({
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
  const [showEvidence, setShowEvidence] = useState(false);
  const lead = task.workers.find((w) => w.role === "lead") ?? task.workers[0];
  const support = task.workers.filter((w) => w !== lead).slice(0, 2);

  return (
    <section className="vt-inline" aria-label={`Visual team status: ${task.title}`}>
      <div className="vt-inline-main">
        {lead && (
          <RobotAvatar role={lead.role} state={lead.state} label={lead.label} animated={!reduced && !stale} />
        )}
        <div className="vt-inline-text">
          <h3 className="vt-title">{task.title}</h3>
          <p className="vt-status">
            <StatusBadge state={task.state} kind="task" />
            {lead && <span className="vt-lead-line">{workerLine(lead)}</span>}
          </p>
          {task.needsUser && <p className="vt-needs-user">This task needs you.</p>}
        </div>
      </div>
      {support.length > 0 && (
        <ul className="vt-support" aria-label="Supporting team members">
          {support.map((w) => (
            <li key={w.id}>
              <RobotAvatar role={w.role} state={w.state} label={w.label} size={24} animated={!reduced && !stale} />
              <span>{workerLine(w)}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="vt-actions">
        <button
          type="button"
          className="vt-btn vt-btn-primary"
          onClick={() => void hostBridge.requestDisplayMode("fullscreen")}
        >
          Open team
        </button>
        <button
          type="button"
          className="vt-btn"
          onClick={() => void hostBridge.requestDisplayMode("pip")}
        >
          Pop out
        </button>
        <button
          type="button"
          className="vt-btn"
          aria-expanded={showEvidence}
          onClick={() => setShowEvidence((v) => !v)}
        >
          View details
        </button>
      </div>
      {showEvidence && <EvidencePanel events={recentEvents} />}
      <p className="vt-sr-only">{taskLine(task)}</p>
    </section>
  );
}
