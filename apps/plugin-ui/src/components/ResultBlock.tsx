import type { TaskSnapshot, VisualEvent } from "@visual-team/contracts";
import { finishDetail } from "../resultDetail.js";
import { reportedChecksLine, TASK_STATE_TEXT } from "../accessibility/stateText.js";

/** Mirrors TERMINAL_TASK_STATES — local so the widget stays reducer-free. */
const TERMINAL = new Set(["COMPLETED", "FAILED", "CANCELED"]);

/**
 * Reported-result block (brief 011): the terminal outcome rendered from the
 * structured receipt on the snapshot — summary, reported checks, and
 * artifact references (labels/locators only; contents never upload). These
 * are the model's own reports, labeled as such — never independent
 * verification. A legacy finish (no structured receipt) shows its bounded
 * detail text verbatim under the reported label, and absent structured
 * verification reads "Not provided". Free text inside a summary or an
 * artifact label can never mint a checks badge — only the structured field
 * is read.
 */
export function ResultBlock({
  task,
  events,
}: {
  task: TaskSnapshot;
  events: VisualEvent[];
}) {
  if (!TERMINAL.has(task.state)) {
    // Evidence-bounded absence: a waiting/blocked/stale task is not "in
    // progress" — only that no terminal receipt has been recorded.
    return <p className="vt-muted">No terminal result has been recorded.</p>;
  }
  const finish = finishDetail(events);
  const result = task.result;
  if (!result && !finish.event) {
    return (
      <p className="vt-muted">
        Task ended as {TASK_STATE_TEXT[task.state].toLowerCase()} — no finish event was
        recorded in this view's recent history. Check the chat for what the model reported.
      </p>
    );
  }
  return (
    <div className="vt-result">
      <p>
        <span className="vt-verify">Reported result</span>{" "}
        <span className="vt-checks">{reportedChecksLine(result?.verification)}</span>
      </p>
      {result?.summary ? (
        <p className="vt-result-summary">{result.summary}</p>
      ) : result ? (
        <p className="vt-muted">The reported receipt carried no result summary.</p>
      ) : null}
      {result?.artifacts && result.artifacts.length > 0 ? (
        <ul className="vt-artifacts">
          {result.artifacts.map((a) => (
            <li key={a.label}>
              {a.label}
              {a.uri ? <span className="vt-muted"> — {a.uri}</span> : null}
            </li>
          ))}
        </ul>
      ) : null}
      {/* Legacy finish without a structured receipt: the bounded detail text
          is rendered verbatim — it is reported free text, not parsed claims. */}
      {!result && finish.detail ? (
        <p className="vt-result-detail">{finish.detail}</p>
      ) : null}
      {!result && finish.event && !finish.detail ? (
        <p className="vt-muted">The finish event carried no result summary — check the chat.</p>
      ) : null}
    </div>
  );
}
