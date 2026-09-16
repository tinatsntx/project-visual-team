import type { VisualEvent } from "@visual-team/contracts";

/**
 * Surface the bounded finish metadata carried in a `task_finished` event's
 * `detail` (reported-steps.ts format: "result: …; verification: …;
 * artifacts: …", ≤ EVENT_DETAIL_MAX_CHARS). Rendering is deliberately
 * conservative: the detail text is shown verbatim, and only the
 * `verification:` enum is extracted structurally — labels and artifact
 * references are never split out or invented. Absence is rendered as
 * absence, never as success.
 */

export type VerificationStatus = "passed" | "failed" | "not_run";

export interface FinishDetail {
  /** The finish event, when the task recorded one. */
  event: VisualEvent | null;
  /** Full detail text — already server-bounded and sanitized. */
  detail: string | null;
  /** Extracted verification enum, or null when absent/unrecognized. */
  verification: VerificationStatus | null;
}

export const VERIFICATION_TEXT: Record<VerificationStatus, string> = {
  passed: "Verification passed",
  failed: "Verification failed",
  not_run: "Verification not run",
};

export function finishDetail(events: VisualEvent[]): FinishDetail {
  const event = [...events].reverse().find((e) => e.kind === "task_finished") ?? null;
  const detail = event?.detail ?? null;
  const match = detail?.match(/(?:^|; )verification: (passed|failed|not_run)(?=;|$)/) ?? null;
  return {
    event,
    detail,
    verification: (match?.[1] as VerificationStatus | undefined) ?? null,
  };
}
