import type { VisualEvent } from "@visual-team/contracts";

/**
 * Expandable technical detail (PROJECT_PLAN.md §3.4): default view stays
 * consumer-language; provenance lives here.
 */
export function EvidencePanel({ events }: { events: VisualEvent[] }) {
  const items = [...events].reverse().slice(0, 20);
  if (items.length === 0) {
    return <p className="vt-evidence-empty">No recorded events yet.</p>;
  }
  return (
    <ul className="vt-evidence">
      {items.map((e) => (
        <li key={e.id}>
          <span className="vt-evidence-label">{e.label}</span>
          <span className="vt-evidence-meta">
            {e.kind} · {e.provenance} · {new Date(e.at).toLocaleTimeString()}
            {e.detail ? ` · ${e.detail}` : ""}
          </span>
        </li>
      ))}
    </ul>
  );
}
