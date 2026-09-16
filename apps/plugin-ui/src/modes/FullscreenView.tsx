import { useState } from "react";
import type { TaskSnapshot, VisualEvent } from "@visual-team/contracts";
import { StatusBadge } from "../components/StatusBadge.js";
import { EvidencePanel } from "../components/EvidencePanel.js";
import { ResultBlock } from "../components/ResultBlock.js";
import { TeamView } from "../components/TeamView.js";
import {
  latestActivityLine,
  lastRefreshLine,
  needActions,
  NO_PENDING_NEEDS_TEXT,
  phaseLine,
  taskLine,
} from "../accessibility/stateText.js";
import { hostBridge } from "../bridge/hostBridge.js";

/**
 * Fullscreen status view (brief 011): attention and results first —
 * unresolved needs, the recorded phase with provenance, the latest recorded
 * activity with source/time, the last successful refresh stated separately,
 * then the reported result. The truthful roster with single-writer
 * ownership lives in the collapsed "Team" section — characters are an
 * optional view, never the default. The host's composer stays the
 * conversational control surface — none is recreated here.
 */
export function FullscreenView({
  task,
  recentEvents,
  stale = false,
  lastUpdatedAt = null,
}: {
  task: TaskSnapshot;
  recentEvents: VisualEvent[];
  /** Stale/unavailable refresh: last-known data renders without motion. */
  stale?: boolean;
  /** Last successful refresh, stated separately from last activity. */
  lastUpdatedAt?: string | null;
}) {
  const needs = needActions(task);
  // Characters mount only on explicit opt-in: the roster does not exist in
  // the DOM until the "Team" disclosure is opened.
  const [teamOpen, setTeamOpen] = useState(false);

  return (
    <main className="vt-full" aria-label={`Visual team: ${task.title}`}>
      <header className="vt-full-header">
        <h2>{task.title}</h2>
        <StatusBadge state={task.state} kind="task" />
        <button type="button" className="vt-btn" onClick={() => void hostBridge.requestDisplayMode("inline")}>
          Back to chat
        </button>
      </header>

      <section aria-labelledby="vt-needs">
        <h3 id="vt-needs">Needs you</h3>
        {needs.length > 0 ? (
          <ul className="vt-needs-list" role="status">
            {needs.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : (
          <p className="vt-muted">{NO_PENDING_NEEDS_TEXT}</p>
        )}
      </section>

      <section aria-labelledby="vt-status">
        <h3 id="vt-status">Status</h3>
        <p>
          <span className="vt-muted">Reported phase: {phaseLine(task)}</span>
        </p>
        <p className="vt-meta">{latestActivityLine(recentEvents)}</p>
        <p className="vt-meta">{lastRefreshLine(lastUpdatedAt)}</p>
        {task.noRecentActivity && <p className="vt-muted">No recent activity.</p>}
      </section>

      <section aria-labelledby="vt-results">
        <h3 id="vt-results">Results</h3>
        <ResultBlock task={task} events={recentEvents} />
      </section>

      <section aria-labelledby="vt-goal">
        <h3 id="vt-goal">Goal</h3>
        <p>{task.summary}</p>
        <p className="vt-muted">{taskLine(task)}</p>
      </section>

      <details
        className="vt-team-section"
        onToggle={(e) => setTeamOpen(e.currentTarget.open)}
      >
        <summary>Team</summary>
        {teamOpen && <TeamView task={task} stale={stale} />}
      </details>

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
