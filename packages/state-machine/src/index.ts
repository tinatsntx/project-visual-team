import {
  MAX_VISIBLE_WORKERS,
  type EvidenceLevel,
  type ReduceResult,
  type StartVisualTaskInput,
  type TaskSnapshot,
  type TaskState,
  type VisualEvent,
  type WorkerRole,
  type WorkerSnapshot,
  type WorkerState,
} from "@visual-team/contracts";

/**
 * Deterministic task/worker reducers (PROJECT_PLAN.md §6, Milestone 1 seeds).
 *
 * Rules enforced here:
 * - `derived` provenance may never produce COMPLETED, FAILED,
 *   WAITING_FOR_APPROVAL, or REVIEWING states. Completion and approval require
 *   explicit events; staleness degrades to "No recent activity" only.
 * - Transitions outside the tables below are rejected and leave the snapshot
 *   unchanged (fail-safe).
 * - Events are deduplicated by `event.id` at the record level, so replays are
 *   idempotent.
 * - At most one writer and at most MAX_VISIBLE_WORKERS visible bots.
 */

const TASK_TRANSITIONS: Record<TaskState, readonly TaskState[]> = {
  DRAFT: ["PLANNING", "CANCELED"],
  PLANNING: ["ACTIVE", "FAILED", "CANCELED"],
  ACTIVE: ["WAITING_FOR_USER", "BLOCKED", "COMPLETED", "FAILED", "CANCELED"],
  WAITING_FOR_USER: ["ACTIVE", "FAILED", "CANCELED"],
  BLOCKED: ["ACTIVE", "FAILED", "CANCELED"],
  COMPLETED: [],
  FAILED: [],
  CANCELED: [],
};

const WORKER_TRANSITIONS: Record<WorkerState, readonly WorkerState[]> = {
  IDLE: ["ASSIGNED", "PLANNING", "WORKING", "CANCELED"],
  ASSIGNED: ["PLANNING", "WORKING", "BLOCKED", "CANCELED"],
  PLANNING: ["WORKING", "BLOCKED", "CANCELED"],
  WORKING: ["WAITING_FOR_APPROVAL", "REVIEWING", "BLOCKED", "IDLE", "COMPLETED", "FAILED", "CANCELED"],
  WAITING_FOR_APPROVAL: ["WORKING", "IDLE", "FAILED", "CANCELED"],
  BLOCKED: ["WORKING", "IDLE", "CANCELED"],
  REVIEWING: ["WORKING", "IDLE", "COMPLETED", "FAILED", "CANCELED"],
  COMPLETED: [],
  FAILED: [],
  CANCELED: [],
};

/** States a `derived` event may never produce (plan §6 rules). */
const DERIVED_FORBIDDEN_WORKER: readonly WorkerState[] = [
  "WAITING_FOR_APPROVAL",
  "REVIEWING",
  "COMPLETED",
  "FAILED",
];
const DERIVED_FORBIDDEN_TASK: readonly TaskState[] = ["COMPLETED", "FAILED", "WAITING_FOR_USER"];

/** Default staleness window for the "No recent activity" display flag. */
export const DEFAULT_STALE_AFTER_MS = 90_000;

/** Maximum retained events per task record. Bounded memory for the spike. */
export const MAX_EVENTS_PER_TASK = 200;

const ROLE_LABELS: Record<WorkerRole, string> = {
  lead: "Alex",
  explorer: "Nova",
  builder: "Kit",
  reviewer: "Remy",
};

export function roleLabel(role: WorkerRole): string {
  return ROLE_LABELS[role];
}

export interface TaskRecord {
  snapshot: TaskSnapshot;
  /** Idempotency index: event ids already applied. */
  seenEventIds: Set<string>;
  /** Bounded, append-only event log (newest last). */
  events: VisualEvent[];
}

export function workerIdFor(role: WorkerRole, ordinal = 0): string {
  return ordinal === 0 ? role : `${role}-${ordinal}`;
}

/** Build the initial task + roster. A task always starts DRAFT -> PLANNING. */
export function createTaskRecord(
  input: StartVisualTaskInput,
  ids: { taskId: string; startedAt: string; eventId: string },
): TaskRecord {
  const roles: WorkerRole[] =
    input.mode === "solo"
      ? ["lead"]
      : normalizeRoles(input.workerRoles ?? ["lead"]);

  const workers: WorkerSnapshot[] = roles.map((role, i) => ({
    id: workerIdFor(role, roles.indexOf(role) === i ? 0 : countPrior(roles, role, i)),
    role,
    label: ROLE_LABELS[role],
    state: "ASSIGNED",
    stateProvenance: "reported",
    isWriter: role === "lead",
    updatedAt: ids.startedAt,
  }));

  const snapshot: TaskSnapshot = {
    id: ids.taskId,
    title: input.title,
    summary: input.summary,
    mode: input.mode,
    privacyMode: input.privacyMode,
    state: "PLANNING",
    stateProvenance: "reported",
    workers,
    createdAt: ids.startedAt,
    updatedAt: ids.startedAt,
    lastActivityAt: ids.startedAt,
    noRecentActivity: false,
    needsUser: false,
    eventCount: 0,
  };

  const record: TaskRecord = { snapshot, seenEventIds: new Set(), events: [] };
  const started: VisualEvent = {
    id: ids.eventId,
    taskId: ids.taskId,
    at: ids.startedAt,
    provenance: "reported",
    kind: "task_started",
    label: `${ROLE_LABELS[roles[0] ?? "lead"]} picked up the task.`,
    ...(input.mode === "team" ? { detail: `Roster: ${roles.join(", ")}` } : {}),
  };
  applyEvent(record, started);
  return record;
}

function normalizeRoles(roles: WorkerRole[]): WorkerRole[] {
  const ordered: WorkerRole[] = ["lead", "explorer", "builder", "reviewer"];
  const unique = new Set<WorkerRole>(roles);
  unique.add("lead");
  return ordered.filter((r) => unique.has(r)).slice(0, MAX_VISIBLE_WORKERS);
}

function countPrior(roles: WorkerRole[], role: WorkerRole, before: number): number {
  let n = 0;
  for (let i = 0; i < before; i++) if (roles[i] === role) n++;
  return n;
}

function provenancePermitsTransition(
  provenance: EvidenceLevel,
  kind: VisualEvent["kind"],
  to: string | undefined,
): string | null {
  if (provenance === "derived") {
    if (kind === "task_finished") {
      return "derived evidence cannot finish a task";
    }
    if (kind === "task_transition" && to && DERIVED_FORBIDDEN_TASK.includes(to as TaskState)) {
      return `derived evidence cannot move a task to ${to}`;
    }
    if (kind === "worker_transition" && to && DERIVED_FORBIDDEN_WORKER.includes(to as WorkerState)) {
      return `derived evidence cannot move a worker to ${to}`;
    }
  }
  return null;
}

function findWorker(snapshot: TaskSnapshot, workerId: string | undefined): WorkerSnapshot | undefined {
  if (!workerId) return undefined;
  return (
    snapshot.workers.find((w) => w.id === workerId) ??
    snapshot.workers.find((w) => w.externalId === workerId)
  );
}

/** Single active writer, falling back to the lead (plan §5.2: one writer). */
function defaultWorker(snapshot: TaskSnapshot): WorkerSnapshot | undefined {
  return snapshot.workers.find((w) => w.isWriter) ?? snapshot.workers[0];
}

function transitionWorker(
  worker: WorkerSnapshot,
  to: WorkerState,
  event: VisualEvent,
): string | null {
  if (worker.state === to) return null; // idempotent no-op
  if (!WORKER_TRANSITIONS[worker.state].includes(to)) {
    return `worker ${worker.id} cannot move ${worker.state} -> ${to}`;
  }
  worker.state = to;
  worker.stateProvenance = event.provenance;
  worker.lastEventId = event.id;
  worker.updatedAt = event.at;
  return null;
}

function transitionTask(snapshot: TaskSnapshot, to: TaskState, event: VisualEvent): string | null {
  if (snapshot.state === to) return null;
  if (!TASK_TRANSITIONS[snapshot.state].includes(to)) {
    return `task cannot move ${snapshot.state} -> ${to}`;
  }
  snapshot.state = to;
  snapshot.stateProvenance = event.provenance;
  return null;
}

/**
 * Pure single-event reducer. Does not deduplicate — use `applyEvent` on a
 * TaskRecord for the idempotent, bounded-log variant.
 */
export function reduceEvent(snapshotIn: TaskSnapshot, event: VisualEvent): ReduceResult {
  const snapshot: TaskSnapshot = {
    ...snapshotIn,
    workers: snapshotIn.workers.map((w) => ({ ...w })),
  };

  const provenanceError = provenancePermitsTransition(event.provenance, event.kind, event.to);
  if (provenanceError) {
    return { ok: false, snapshot: snapshotIn, error: provenanceError };
  }

  switch (event.kind) {
    case "task_started":
      // Already reflected in createTaskRecord; replay is a no-op.
      break;

    case "task_transition": {
      if (!event.to) return { ok: false, snapshot: snapshotIn, error: "task_transition missing target" };
      const err = transitionTask(snapshot, event.to as TaskState, event);
      if (err) return { ok: false, snapshot: snapshotIn, error: err };
      break;
    }

    case "worker_transition": {
      const worker = findWorker(snapshot, event.workerId) ?? defaultWorker(snapshot);
      if (!worker) return { ok: false, snapshot: snapshotIn, error: "no worker to transition" };
      if (!event.to) return { ok: false, snapshot: snapshotIn, error: "worker_transition missing target" };
      const err = transitionWorker(worker, event.to as WorkerState, event);
      if (err) return { ok: false, snapshot: snapshotIn, error: err };
      // Real work activity wakes the task out of PLANNING/WAITING when truthful.
      if (
        event.to === "WORKING" &&
        (snapshot.state === "PLANNING" || snapshot.state === "WAITING_FOR_USER" || snapshot.state === "BLOCKED")
      ) {
        transitionTask(snapshot, "ACTIVE", event);
      }
      break;
    }

    case "activity": {
      // Observed work that does not change state; proves the task is alive.
      const worker = findWorker(snapshot, event.workerId);
      if (worker) {
        worker.lastEventId = event.id;
        worker.updatedAt = event.at;
      }
      break;
    }

    case "specialist_joined": {
      const externalId = event.workerId;
      const existing = findWorker(snapshot, externalId);
      if (existing) break; // already on roster
      if (snapshot.workers.length >= MAX_VISIBLE_WORKERS) break; // tracked as activity only
      const role = guessRole(event.detail);
      const worker: WorkerSnapshot = {
        id: externalId ?? workerIdFor(role, snapshot.workers.filter((w) => w.role === role).length),
        role,
        label: ROLE_LABELS[role],
        state: "WORKING",
        stateProvenance: event.provenance,
        ...(externalId ? { externalId } : {}),
        isWriter: false,
        lastEventId: event.id,
        updatedAt: event.at,
      };
      snapshot.workers.push(worker);
      if (snapshot.state === "PLANNING") transitionTask(snapshot, "ACTIVE", event);
      break;
    }

    case "specialist_finished": {
      const worker = findWorker(snapshot, event.workerId);
      if (worker) {
        // A delegated turn finished — never assume overall task completion.
        const err = transitionWorker(worker, "COMPLETED", event);
        if (err) return { ok: false, snapshot: snapshotIn, error: err };
      }
      break;
    }

    case "permission_request": {
      const worker = findWorker(snapshot, event.workerId) ?? defaultWorker(snapshot);
      if (worker) {
        const err = transitionWorker(worker, "WAITING_FOR_APPROVAL", event);
        if (err) return { ok: false, snapshot: snapshotIn, error: err };
      }
      if (snapshot.state === "ACTIVE") transitionTask(snapshot, "WAITING_FOR_USER", event);
      snapshot.needsUser = true;
      snapshot.needsUserProvenance = event.provenance;
      break;
    }

    case "turn_finished": {
      for (const worker of snapshot.workers) {
        if (worker.state === "WORKING" || worker.state === "WAITING_FOR_APPROVAL" || worker.state === "REVIEWING") {
          transitionWorker(worker, "IDLE", event);
        }
      }
      snapshot.needsUser = false;
      break;
    }

    case "interrupted": {
      for (const worker of snapshot.workers) {
        if (worker.state === "WORKING" || worker.state === "WAITING_FOR_APPROVAL") {
          transitionWorker(worker, "IDLE", event);
        }
      }
      // Task keeps its state; resumable. needsUser stays as-is.
      break;
    }

    case "task_finished": {
      // Explicit completion only — the sole path to COMPLETED.
      const target = event.to === "FAILED" ? "FAILED" : "COMPLETED";
      const err = transitionTask(snapshot, target, event);
      if (err) return { ok: false, snapshot: snapshotIn, error: err };
      snapshot.needsUser = false;
      for (const worker of snapshot.workers) {
        if (worker.state !== "COMPLETED" && worker.state !== "FAILED" && worker.state !== "CANCELED") {
          transitionWorker(worker, target === "COMPLETED" ? "COMPLETED" : "FAILED", event);
        }
      }
      break;
    }
  }

  snapshot.updatedAt = event.at;
  snapshot.lastActivityAt = event.at;
  snapshot.noRecentActivity = false;
  snapshot.eventCount += 1;
  return { ok: true, snapshot, changed: true };
}

function guessRole(detail: string | undefined): WorkerRole {
  const d = (detail ?? "").toLowerCase();
  if (d.includes("review")) return "reviewer";
  if (d.includes("build") || d.includes("write") || d.includes("code")) return "builder";
  return "explorer";
}

/**
 * Record-level apply: deduplicates by event id, applies the pure reducer, and
 * appends to the bounded log. Replayed or duplicate events are no-ops.
 */
export function applyEvent(record: TaskRecord, event: VisualEvent): ReduceResult {
  if (record.seenEventIds.has(event.id)) {
    return { ok: true, snapshot: record.snapshot, changed: false };
  }
  const result = reduceEvent(record.snapshot, event);
  if (!result.ok) return result;
  record.seenEventIds.add(event.id);
  record.snapshot = result.snapshot;
  record.events.push(event);
  if (record.events.length > MAX_EVENTS_PER_TASK) {
    record.events.splice(0, record.events.length - MAX_EVENTS_PER_TASK);
  }
  return result;
}

/**
 * Derived display refresh: when nothing has happened for `staleAfterMs`, mark
 * the task "No recent activity". This is a display flag, never a failure or
 * stuck claim (plan §6).
 */
export function refreshDerivedFlags(
  snapshot: TaskSnapshot,
  nowIso: string,
  staleAfterMs = DEFAULT_STALE_AFTER_MS,
): TaskSnapshot {
  const last = Date.parse(snapshot.lastActivityAt);
  const now = Date.parse(nowIso);
  const stale = Number.isFinite(last) && Number.isFinite(now) && now - last > staleAfterMs;
  const active = snapshot.state === "ACTIVE" || snapshot.state === "PLANNING";
  const noRecentActivity = stale && active;
  if (noRecentActivity === snapshot.noRecentActivity) return snapshot;
  return { ...snapshot, noRecentActivity };
}
