import { useState } from "react";
import type { TaskSnapshot, VisualEvent } from "@visual-team/contracts";
import { hostBridge } from "../bridge/hostBridge.js";
import { RobotAvatar } from "../components/RobotAvatar.js";
import { StatusBadge } from "../components/StatusBadge.js";
import { EvidencePanel } from "../components/EvidencePanel.js";
import { needActions, taskLine, workerLine } from "../accessibility/stateText.js";
import { useReducedMotion } from "../accessibility/useReducedMotion.js";

/**
 * Inline card (PROJECT_PLAN.md §12.1): lead bot, title, verified status, up to
 * two supporting bots, one primary action ("Open team") plus compact
 * secondaries. No tabs, no deep navigation, no chat composer.
 * §13.6 notice: titles/summaries are stored metadata — say so once, briefly.
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
  const needs = needActions(task);

  return (
    <section className="vt-inline" aria-label={`Visual team status: ${task.title}`}>
      <div className="vt-inline-main">
        {lead && (
          <RobotAvatar
            role={lead.role}
            state={lead.state}
            label={lead.label}
            animated={!reduced && !stale && !task.noRecentActivity}
          />
        )}
        <div className="vt-inline-text">
          <h3 className="vt-title">{task.title}</h3>
          <p className="vt-status">
            <StatusBadge state={task.state} kind="task" />
            {lead && <span className="vt-lead-line">{workerLine(lead, task)}</span>}
          </p>
          {task.noRecentActivity && <p className="vt-muted">No recent activity.</p>}
          {needs.map((line) => (
            <p key={line} className="vt-needs-user">{line}</p>
          ))}
        </div>
      </div>
      {support.length > 0 && (
        <ul className="vt-support" aria-label="Supporting team members">
          {support.map((w) => (
            <li key={w.id}>
              <RobotAvatar
                role={w.role}
                state={w.state}
                label={w.label}
                size={24}
                animated={!reduced && !stale && !task.noRecentActivity}
              />
              <span>{workerLine(w, task)}</span>
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
          className="vt-btn vt-btn-compact"
          onClick={() => void hostBridge.requestDisplayMode("pip")}
        >
          Pop out
        </button>
        <button
          type="button"
          className="vt-btn vt-btn-compact"
          aria-expanded={showEvidence}
          aria-controls="vt-inline-evidence"
          onClick={() => setShowEvidence((v) => !v)}
        >
          View details
        </button>
      </div>
      {showEvidence && (
        <div id="vt-inline-evidence">
          <EvidencePanel events={recentEvents} />
        </div>
      )}
      <p className="vt-privacy">
        Titles and summaries are stored as ephemeral metadata — keep secrets and sensitive
        content out of them.
      </p>
      <p className="vt-sr-only">{taskLine(task)}</p>
    </section>
  );
}
