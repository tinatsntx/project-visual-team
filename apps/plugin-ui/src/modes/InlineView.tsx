import { useState } from "react";
import type { TaskSnapshot, VisualEvent } from "@visual-team/contracts";
import { hostBridge } from "../bridge/hostBridge.js";
import { StatusBadge } from "../components/StatusBadge.js";
import { EvidencePanel } from "../components/EvidencePanel.js";
import { ResultBlock } from "../components/ResultBlock.js";
import { TeamView } from "../components/TeamView.js";
import {
  latestActivityLine,
  lastRefreshLine,
  needActions,
  NO_PENDING_NEEDS_TEXT,
  taskLine,
} from "../accessibility/stateText.js";

/** Mirrors TERMINAL_TASK_STATES — kept local so the widget stays reducer-free. */
const TERMINAL = new Set(["COMPLETED", "FAILED", "CANCELED"]);

/**
 * Inline card (brief 011): text status first — unresolved needs with their
 * ask-holder and where to respond, the recorded phase with its provenance,
 * the latest recorded activity with source/time, and the last successful
 * refresh stated separately. A terminal task shows its reported outcome,
 * checks, and artifact references in the default summary — no need to open
 * the team to see work. Characters live in the optional "View team" view.
 *
 * §13.6 notice: titles/summaries are stored metadata — say so once, briefly.
 */
export function InlineView({
  task,
  recentEvents,
  stale = false,
  lastUpdatedAt = null,
  onRetry,
}: {
  task: TaskSnapshot;
  recentEvents: VisualEvent[];
  /** Stale/unavailable refresh: last-known data renders without motion. */
  stale?: boolean;
  /** Last successful refresh, stated separately from last activity. */
  lastUpdatedAt?: string | null;
  onRetry?: () => void;
}) {
  const [showEvidence, setShowEvidence] = useState(false);
  const [showTeam, setShowTeam] = useState(false);
  const needs = needActions(task);
  const done = TERMINAL.has(task.state);

  return (
    <section className="vt-inline" aria-label={`Visual team status: ${task.title}`}>
      <h3 className="vt-title">{task.title}</h3>
      <div className="vt-needs" role="status">
        {needs.length > 0 ? (
          needs.map((line) => (
            <p key={line} className="vt-needs-user">
              {line}
            </p>
          ))
        ) : (
          <p className="vt-muted">{NO_PENDING_NEEDS_TEXT}</p>
        )}
      </div>
      <p className="vt-status">
        <StatusBadge state={task.state} kind="task" />
        <span className="vt-muted">{task.stateProvenance}</span>
      </p>
      <p className="vt-meta">{latestActivityLine(recentEvents)}</p>
      <p className="vt-meta">{lastRefreshLine(lastUpdatedAt)}</p>
      {task.noRecentActivity && <p className="vt-muted">No recent activity.</p>}
      {done && (
        <div className="vt-inline-result">
          <ResultBlock task={task} events={recentEvents} />
        </div>
      )}
      <div className="vt-actions">
        <button
          type="button"
          className="vt-btn vt-btn-primary"
          onClick={() => void hostBridge.requestDisplayMode("fullscreen")}
        >
          Open details
        </button>
        {stale && onRetry && (
          <button type="button" className="vt-btn" onClick={onRetry}>
            Try again
          </button>
        )}
        <button
          type="button"
          className="vt-btn vt-btn-compact"
          aria-expanded={showTeam}
          aria-controls="vt-inline-team"
          onClick={() => setShowTeam((v) => !v)}
        >
          View team
        </button>
        <button
          type="button"
          className="vt-btn vt-btn-compact"
          aria-expanded={showEvidence}
          aria-controls="vt-inline-evidence"
          onClick={() => setShowEvidence((v) => !v)}
        >
          View evidence
        </button>
        <button
          type="button"
          className="vt-btn vt-btn-compact"
          onClick={() => void hostBridge.requestDisplayMode("pip")}
        >
          Pop out
        </button>
      </div>
      {showTeam && (
        <div id="vt-inline-team">
          <TeamView task={task} stale={stale} />
        </div>
      )}
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
