import { useState } from "react";

export type AskState = "idle" | "sent" | "failed";

/** Post-ask copy: sent acknowledges; a rejected request falls back to guidance. */
export function askStateMessage(state: AskState): string | null {
  switch (state) {
    case "sent":
      return "Asked ChatGPT to render the board again.";
    case "failed":
      return "Ask ChatGPT to render the board again to restore this view.";
    default:
      return null;
  }
}

/**
 * Refresh-health banner (brief 004): truthful about stale or unavailable
 * updates without claiming task expiry. A stale view keeps the last confirmed
 * data and says when it was confirmed; either state offers a bounded retry
 * and, when the host supports it, a documented re-render request.
 */
export function RefreshNotice({
  kind,
  lastUpdatedAt,
  onRetry,
  onAskHost,
}: {
  kind: "stale" | "unavailable";
  lastUpdatedAt: string | null;
  onRetry: () => void;
  onAskHost?: () => Promise<boolean>;
}) {
  const [askState, setAskState] = useState<AskState>("idle");

  const line =
    kind === "stale"
      ? `Live updates paused — showing the last confirmed state${
          lastUpdatedAt ? ` from ${new Date(lastUpdatedAt).toLocaleTimeString()}` : ""
        }.`
      : "Live updates are unavailable for this view.";

  const ask = () => {
    if (!onAskHost) return;
    void onAskHost().then((ok) => setAskState(ok ? "sent" : "failed"));
  };

  return (
    <div className="vt-notice" role="status">
      <p className="vt-muted">{line}</p>
      <div className="vt-actions">
        <button type="button" className="vt-btn" onClick={onRetry}>
          Try again
        </button>
        {onAskHost && askState === "idle" && (
          <button type="button" className="vt-btn" onClick={ask}>
            Ask ChatGPT to render it again
          </button>
        )}
      </div>
      {askStateMessage(askState) && <p className="vt-muted">{askStateMessage(askState)}</p>}
    </div>
  );
}
