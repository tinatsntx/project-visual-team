import { timingSafeEqual } from "node:crypto";

/**
 * Task-scoped capability tokens (PROJECT_PLAN.md §13.2, §13.5).
 *
 * The token is minted by `start_visual_task` and returned only in UI-private
 * result metadata. It authorizes reads of that one task. Write tools that
 * arrive in later milestones must require it; `record_codex_event` is
 * append-only and decision-free by design, so it validates scope by taskId
 * alone and is rate-limited.
 */

export function safeTokenEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}
