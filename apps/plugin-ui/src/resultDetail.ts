import type { VisualEvent } from "@visual-team/contracts";

/**
 * Surface the bounded finish metadata carried in a `task_finished` event's
 * `detail` (reported-steps.ts format: "result: …; verification: …;
 * artifacts: …", ≤ EVENT_DETAIL_MAX_CHARS). The detail is free text joined
 * with "; " — a summary or artifact label can legitimately contain a
 * "verification: passed" substring, so no token is extracted into a badge
 * (brief-008 follow-up item 1). The view renders the detail verbatim under
 * a reported-result label; absence is rendered as absence, never success.
 */

export interface FinishDetail {
  /** The finish event, when the task recorded one. */
  event: VisualEvent | null;
  /** Full detail text — already server-bounded and sanitized. */
  detail: string | null;
}

export function finishDetail(events: VisualEvent[]): FinishDetail {
  const event = [...events].reverse().find((e) => e.kind === "task_finished") ?? null;
  return { event, detail: event?.detail ?? null };
}
