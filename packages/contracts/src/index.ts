import { z } from "zod";

/**
 * Project Visual Team — shared contracts.
 *
 * These types implement the state vocabulary in PROJECT_PLAN.md §6 and the
 * tool contract in §9. Every displayed state must carry provenance
 * (`observed` | `reported` | `derived`). Derived evidence may never claim
 * completion, approval, review, or success.
 */

// ---------------------------------------------------------------------------
// State vocabulary (plan §6)
// ---------------------------------------------------------------------------

export const TaskStateSchema = z.enum([
  "DRAFT",
  "PLANNING",
  "ACTIVE",
  "WAITING_FOR_USER",
  "BLOCKED",
  "COMPLETED",
  "FAILED",
  "CANCELED",
]);
export type TaskState = z.infer<typeof TaskStateSchema>;

export const WorkerStateSchema = z.enum([
  "IDLE",
  "ASSIGNED",
  "PLANNING",
  "WORKING",
  "WAITING_FOR_APPROVAL",
  "BLOCKED",
  "REVIEWING",
  "COMPLETED",
  "FAILED",
  "CANCELED",
]);
export type WorkerState = z.infer<typeof WorkerStateSchema>;

export const EvidenceLevelSchema = z.enum(["observed", "reported", "derived"]);
export type EvidenceLevel = z.infer<typeof EvidenceLevelSchema>;

export const WorkerRoleSchema = z.enum(["lead", "explorer", "builder", "reviewer"]);
export type WorkerRole = z.infer<typeof WorkerRoleSchema>;

export const TaskModeSchema = z.enum(["solo", "team"]);
export type TaskMode = z.infer<typeof TaskModeSchema>;

export const PrivacyModeSchema = z.enum(["standard", "private"]);
export type PrivacyMode = z.infer<typeof PrivacyModeSchema>;

/** Maximum visible bots in the MVP (plan §5.2). */
export const MAX_VISIBLE_WORKERS = 3;

/** Workflow phases the host model may report (plan §9.2). */
export const WorkflowPhaseSchema = z.enum([
  "planning",
  "researching",
  "implementing",
  "testing",
  "reviewing",
  "waiting_for_user",
  "completed",
  "failed",
]);
export type WorkflowPhase = z.infer<typeof WorkflowPhaseSchema>;

// ---------------------------------------------------------------------------
// Codex lifecycle events (plan §10)
// ---------------------------------------------------------------------------

export const CodexEventNameSchema = z.enum([
  "SessionStart",
  "UserPromptSubmit",
  "SubagentStart",
  "PreToolUse",
  "PostToolUse",
  "PermissionRequest",
  "SubagentStop",
  "Stop",
  "Interrupt",
]);
export type CodexEventName = z.infer<typeof CodexEventNameSchema>;

/** Payload delivered by a Codex hook. Untrusted input: unknown fields are ignored. */
export const CodexHookPayloadSchema = z
  .object({
    session_id: z.string().max(256).optional(),
    turn_id: z.string().max(256).optional(),
    agent_id: z.string().max(256).optional(),
    agent_type: z.string().max(128).optional(),
    tool_name: z.string().max(128).optional(),
    // Deliberately no command arguments, file contents, or prompt text (plan §13.4).
  })
  .loose();
export type CodexHookPayload = z.infer<typeof CodexHookPayloadSchema>;

// ---------------------------------------------------------------------------
// Visual events — the only things allowed to change a snapshot
// ---------------------------------------------------------------------------

export const VisualEventKindSchema = z.enum([
  "task_started",
  "task_transition",
  "worker_assigned",
  "worker_transition",
  "activity",
  "specialist_joined",
  "specialist_finished",
  "permission_request",
  "turn_finished",
  "interrupted",
  "task_finished",
]);
export type VisualEventKind = z.infer<typeof VisualEventKindSchema>;

export const VisualEventSchema = z.object({
  /** Caller-supplied idempotency key. Duplicate ids must not alter state. */
  id: z.string().min(1).max(128),
  taskId: z.string().min(1).max(128),
  /** ISO-8601 UTC timestamp of when the event was observed/reported. */
  at: z.string().min(1).max(64),
  provenance: EvidenceLevelSchema,
  kind: VisualEventKindSchema,
  /** Target worker for worker-scoped events. */
  workerId: z.string().max(128).optional(),
  /** Target state for transition events. */
  to: z.union([TaskStateSchema, WorkerStateSchema]).optional(),
  /** Short consumer-facing label, e.g. "Alex is checking the latest changes." */
  label: z.string().min(1).max(240),
  /** Optional technical detail shown in the evidence panel only. */
  detail: z.string().max(500).optional(),
});
export type VisualEvent = z.infer<typeof VisualEventSchema>;

// ---------------------------------------------------------------------------
// Snapshots
// ---------------------------------------------------------------------------

export const WorkerSnapshotSchema = z.object({
  id: z.string().min(1).max(128),
  role: WorkerRoleSchema,
  /** Display name, e.g. "Alex". Never a model name (plan §11). */
  label: z.string().min(1).max(64),
  state: WorkerStateSchema,
  stateProvenance: EvidenceLevelSchema,
  /** External correlation id, e.g. a Codex agent_id. Never shown raw to users. */
  externalId: z.string().max(256).optional(),
  /** True while this worker is the single allowed writer (plan §5.2). */
  isWriter: z.boolean(),
  lastEventId: z.string().max(128).optional(),
  updatedAt: z.string().min(1).max(64),
});
export type WorkerSnapshot = z.infer<typeof WorkerSnapshotSchema>;

export const TaskSnapshotSchema = z.object({
  id: z.string().min(1).max(128),
  title: z.string().min(1).max(200),
  summary: z.string().max(500),
  mode: TaskModeSchema,
  privacyMode: PrivacyModeSchema,
  state: TaskStateSchema,
  stateProvenance: EvidenceLevelSchema,
  workers: z.array(WorkerSnapshotSchema).max(MAX_VISIBLE_WORKERS),
  createdAt: z.string().min(1).max(64),
  updatedAt: z.string().min(1).max(64),
  lastActivityAt: z.string().min(1).max(64),
  /**
   * Derived display flag: no recent activity. This is "No recent activity",
   * never "stuck" or "failed" (plan §6).
   */
  noRecentActivity: z.boolean(),
  /** True while an unresolved permission request or question is pending. */
  needsUser: z.boolean(),
  needsUserProvenance: EvidenceLevelSchema.optional(),
  eventCount: z.number().int().nonnegative(),
});
export type TaskSnapshot = z.infer<typeof TaskSnapshotSchema>;

// ---------------------------------------------------------------------------
// Tool inputs / outputs (plan §9). Only the four Milestone-0 tools have
// runtime implementations; the remaining contract shapes land in Milestone 1.
// ---------------------------------------------------------------------------

export const StartVisualTaskInputSchema = z.object({
  title: z.string().min(1).max(200),
  summary: z.string().min(1).max(500),
  mode: TaskModeSchema,
  workerRoles: z.array(WorkerRoleSchema).max(MAX_VISIBLE_WORKERS).optional(),
  privacyMode: PrivacyModeSchema.default("standard"),
});
export type StartVisualTaskInput = z.infer<typeof StartVisualTaskInputSchema>;

export const RecordCodexEventInputSchema = z.object({
  taskId: z.string().min(1).max(128).optional(),
  eventId: z.string().min(1).max(128).optional(),
  name: CodexEventNameSchema,
  at: z.string().min(1).max(64).optional(),
  payload: CodexHookPayloadSchema.optional(),
});
export type RecordCodexEventInput = z.infer<typeof RecordCodexEventInputSchema>;

export const GetVisualTaskInputSchema = z.object({
  taskId: z.string().min(1).max(128),
  eventLimit: z.number().int().min(0).max(50).default(20),
});
export type GetVisualTaskInput = z.infer<typeof GetVisualTaskInputSchema>;

export const RenderVisualTaskInputSchema = z.object({
  taskId: z.string().min(1).max(128),
});
export type RenderVisualTaskInput = z.infer<typeof RenderVisualTaskInputSchema>;

/** Result of applying one visual event to a snapshot. */
export type ReduceResult =
  | { ok: true; snapshot: TaskSnapshot; changed: boolean }
  | { ok: false; snapshot: TaskSnapshot; error: string };

/** URI of the single MCP Apps UI resource (plan §9.6). Bump on breaking UI changes. */
export const UI_TEMPLATE_URI = "ui://visual-team/task-v1.html";

/** MCP Apps UI resource MIME type (open standard profile). */
export const UI_RESOURCE_MIME_TYPE = "text/html;profile=mcp-app";

// Private-transport pieces live in `./meta.ts`, a zod-free leaf the widget
// bundle can import without pulling in the schemas above.
export {
  TASK_CAPABILITY_META_KEY,
  createRenderVisualTaskResult,
} from "./meta.js";
export type { VisualTaskToolResult } from "./meta.js";
