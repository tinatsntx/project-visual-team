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

/**
 * The workflow event each reported phase may legitimately ride (brief 011
 * review §4). A phase declaration is admissible only on the *matching* event
 * — the exact (kind, to) that `report_workflow_step` emits for that phase —
 * so a terminal claim cannot piggyback a working transition and a working
 * phase cannot ride an unrelated activity event. Shared by the mapper and
 * the reducer so the admission rule cannot drift.
 */
export const WORKFLOW_PHASE_EVENT = {
  planning: { kind: "worker_transition", to: "PLANNING" },
  researching: { kind: "worker_transition", to: "WORKING" },
  implementing: { kind: "worker_transition", to: "WORKING" },
  testing: { kind: "worker_transition", to: "WORKING" },
  reviewing: { kind: "worker_transition", to: "REVIEWING" },
  waiting_for_user: { kind: "task_transition", to: "WAITING_FOR_USER" },
  completed: { kind: "task_finished", to: "COMPLETED" },
  failed: { kind: "task_finished", to: "FAILED" },
} as const satisfies Record<WorkflowPhase, { kind: string; to: string }>;

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

/** Model-reported check outcome (§9.5). A report, never independent verification. */
export const VerificationStatusSchema = z.enum(["passed", "failed", "not_run"]);
export type VerificationStatus = z.infer<typeof VerificationStatusSchema>;

/** Artifact reference — a label and optional locator only (§13.1: no contents). */
export const ResultArtifactSchema = z.object({
  label: z.string().min(1).max(120),
  uri: z.string().max(500).optional(),
});
export type ResultArtifact = z.infer<typeof ResultArtifactSchema>;

/**
 * Structured reported result (brief 011): the receipt a `task_finished`
 * event may carry. It may ride only on a *reported* `task_finished` event —
 * the reducer rejects receipt-bearing events of any other kind or
 * provenance before touching state, so observed/derived evidence and other
 * event kinds can never smuggle a result claim into a snapshot. Free-text
 * inside `summary` or an artifact `label` is never parsed into claims.
 */
export const TaskResultSchema = z.object({
  summary: z.string().min(1).max(500).optional(),
  verification: VerificationStatusSchema.optional(),
  artifacts: z.array(ResultArtifactSchema).max(10).optional(),
});
export type TaskResult = z.infer<typeof TaskResultSchema>;

/**
 * Bound for `VisualEvent.detail`. Sized so a finish event can carry a
 * 500-char result summary plus verification and artifact references whole;
 * anything larger is rejected rather than truncated (plan §9.5, §13.1).
 */
export const EVENT_DETAIL_MAX_CHARS = 640;

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
  detail: z.string().max(EVENT_DETAIL_MAX_CHARS).optional(),
  /**
   * Structured reported result receipt. Legal only on a reported
   * `task_finished` event; enforced by the reducer at apply time.
   */
  result: TaskResultSchema.optional(),
  /**
   * Model-reported workflow phase carried by `report_workflow_step` events
   * (§9.2). Legal only on a *reported* event — the reducer rejects
   * phase-bearing observed/derived events atomically so native activity can
   * never claim a phase it did not state.
   */
  phase: WorkflowPhaseSchema.optional(),
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

/**
 * The last accepted reported workflow phase (§9.2), retained on the snapshot
 * separately from the lifecycle state and the latest activity line. Only a
 * reported event may set it; older snapshots without one stay readable.
 */
export const ReportedPhaseSchema = z.object({
  name: WorkflowPhaseSchema,
  // Only a reported event may set the phase — the schema itself requires it.
  provenance: z.literal("reported"),
  at: z.string().min(1).max(64),
});
export type ReportedPhase = z.infer<typeof ReportedPhaseSchema>;

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
  /**
   * Attribution for the pending needs behind `needsUser`: each key is a
   * distinct unresolved ask — `worker:<internal id>` for a worker-attributed
   * permission request, `task` for a task-level reported wait — mapped to the
   * provenance of the evidence that created it. A need clears only on real
   * evidence resolving that ask (or turn end / task finalization); unrelated
   * activity and derived events cannot dismiss it.
   */
  pendingUserNeeds: z.record(z.string(), EvidenceLevelSchema).optional(),
  /**
   * The structured reported receipt from the accepted finish event, copied
   * onto the terminal snapshot. Absent when the finish carried no metadata
   * or when the task ended without a reported `task_finished` — display
   * falls back to the event's unstructured detail text honestly.
   */
  result: TaskResultSchema.optional(),
  /**
   * The most recent accepted reported workflow phase, with its provenance
   * and report time. Absent on older snapshots or tasks that never received
   * a `report_workflow_step` call — display reads "not provided", never an
   * inferred phase.
   */
  phase: ReportedPhaseSchema.optional(),
  eventCount: z.number().int().nonnegative(),
});
export type TaskSnapshot = z.infer<typeof TaskSnapshotSchema>;

// ---------------------------------------------------------------------------
// Tool inputs / outputs (plan §9). Milestone 0 implements start_visual_task,
// record_codex_event, get_visual_task, render_visual_task, plus the reported
// boundary tools report_workflow_step (§9.2) and finish_visual_task (§9.5) so
// terminal states are reachable truthfully. Remaining shapes land later.
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

/** §9.2: a model-reported phase boundary. Reported provenance, never observed. */
export const ReportWorkflowStepInputSchema = z.object({
  taskId: z.string().min(1).max(128),
  phase: WorkflowPhaseSchema,
  eventId: z.string().min(1).max(128).optional(),
  at: z.string().min(1).max(64).optional(),
});
export type ReportWorkflowStepInput = z.infer<typeof ReportWorkflowStepInputSchema>;

/** §9.5: final reported result. References only — no artifact contents (§13.1). */
export const FinishVisualTaskInputSchema = z.object({
  taskId: z.string().min(1).max(128),
  outcome: z.enum(["completed", "failed"]),
  /** Non-sensitive result label reported by the host model. */
  summary: z.string().max(500).optional(),
  verification: VerificationStatusSchema.optional(),
  artifacts: z.array(ResultArtifactSchema).max(10).optional(),
  eventId: z.string().min(1).max(128).optional(),
  at: z.string().min(1).max(64).optional(),
});
export type FinishVisualTaskInput = z.infer<typeof FinishVisualTaskInputSchema>;

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
