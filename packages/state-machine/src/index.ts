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
 * - `derived` provenance may never produce COMPLETED, FAILED, CANCELED,
 *   WAITING_FOR_APPROVAL, or REVIEWING states, claim a pending approval, or
 *   grow the roster. Completion and approval require explicit events;
 *   staleness degrades to "No recent activity" only.
 * - Transitions outside the tables below are rejected and leave the snapshot
 *   unchanged (fail-safe).
 * - An event's explicit workerId is a correlation claim that must resolve to
 *   a roster worker; only a genuinely absent workerId falls back to the
 *   writer. Events naming a different task are rejected by `applyEvent`.
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
  IDLE: ["ASSIGNED", "PLANNING", "WORKING", "WAITING_FOR_APPROVAL", "COMPLETED", "CANCELED"],
  ASSIGNED: ["PLANNING", "WORKING", "WAITING_FOR_APPROVAL", "BLOCKED", "CANCELED"],
  PLANNING: ["WORKING", "WAITING_FOR_APPROVAL", "BLOCKED", "CANCELED"],
  WORKING: ["WAITING_FOR_APPROVAL", "REVIEWING", "BLOCKED", "IDLE", "COMPLETED", "FAILED", "CANCELED"],
  WAITING_FOR_APPROVAL: ["WORKING", "IDLE", "FAILED", "CANCELED"],
  BLOCKED: ["WORKING", "IDLE", "WAITING_FOR_APPROVAL", "CANCELED"],
  REVIEWING: ["WORKING", "IDLE", "WAITING_FOR_APPROVAL", "COMPLETED", "FAILED", "CANCELED"],
  COMPLETED: [],
  FAILED: [],
  CANCELED: [],
};

/** Terminal task states admit no further events — a terminal task is frozen. */
export const TERMINAL_TASK_STATES: ReadonlySet<TaskState> = new Set([
  "COMPLETED",
  "FAILED",
  "CANCELED",
]);

/** Terminal worker states; every non-terminal state can reach CANCELED. */
const TERMINAL_WORKER_STATES: ReadonlySet<WorkerState> = new Set([
  "COMPLETED",
  "FAILED",
  "CANCELED",
]);

/** States a `derived` event may never produce (plan §6 rules). */
const DERIVED_FORBIDDEN_WORKER: readonly WorkerState[] = [
  "WAITING_FOR_APPROVAL",
  "REVIEWING",
  "COMPLETED",
  "FAILED",
  "CANCELED",
];
const DERIVED_FORBIDDEN_TASK: readonly TaskState[] = [
  "COMPLETED",
  "FAILED",
  "CANCELED",
  "WAITING_FOR_USER",
];

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

/**
 * Derived evidence is a display inference, never proof. It may not finish or
 * fail a task/worker, claim an approval boundary, or fabricate roster
 * membership — on any kind, including indirect ones (plan §6).
 */
function provenancePermitsTransition(
  provenance: EvidenceLevel,
  kind: VisualEvent["kind"],
  to: string | undefined,
): string | null {
  if (provenance !== "derived") return null;
  switch (kind) {
    case "task_finished":
      return "derived evidence cannot finish a task";
    case "task_transition":
      return to && DERIVED_FORBIDDEN_TASK.includes(to as TaskState)
        ? `derived evidence cannot move a task to ${to}`
        : null;
    case "worker_transition":
      return to && DERIVED_FORBIDDEN_WORKER.includes(to as WorkerState)
        ? `derived evidence cannot move a worker to ${to}`
        : null;
    case "specialist_finished":
      return "derived evidence cannot finish a worker";
    case "permission_request":
      return "derived evidence cannot claim a pending approval";
    case "specialist_joined":
      return "derived evidence cannot add a worker";
    default:
      return null;
  }
}

function findWorker(snapshot: TaskSnapshot, workerId: string | undefined): WorkerSnapshot | undefined {
  if (!workerId) return undefined;
  return (
    snapshot.workers.find((w) => w.id === workerId) ??
    snapshot.workers.find((w) => w.externalId === workerId)
  );
}

/** Specialist-correlated lookup: external ids win over internal role ids. */
function findWorkerByExternal(
  snapshot: TaskSnapshot,
  workerId: string | undefined,
): WorkerSnapshot | undefined {
  if (!workerId) return undefined;
  return (
    snapshot.workers.find((w) => w.externalId === workerId) ??
    snapshot.workers.find((w) => w.id === workerId)
  );
}

/** Single active writer, falling back to the lead (plan §5.2: one writer). */
function defaultWorker(snapshot: TaskSnapshot): WorkerSnapshot | undefined {
  return (
    snapshot.workers.find((w) => w.isWriter && !TERMINAL_WORKER_STATES.has(w.state)) ??
    snapshot.workers.find((w) => !TERMINAL_WORKER_STATES.has(w.state)) ??
    snapshot.workers[0]
  );
}

/** needsUser means a decision is pending; clear it when nobody is waiting. */
function settleNeedsUser(snapshot: TaskSnapshot): void {
  if (snapshot.workers.some((w) => w.state === "WAITING_FOR_APPROVAL")) return;
  snapshot.needsUser = false;
  delete snapshot.needsUserProvenance;
}

/**
 * Keep the task-level wait state consistent with the pending-need flag.
 * Entering WAITING_FOR_USER restates the evidence that created the need —
 * never the current event's provenance, so a derived event cannot stamp a
 * forbidden claim on the task.
 */
function reconcileWaitState(snapshot: TaskSnapshot, event: VisualEvent): void {
  if (snapshot.state === "WAITING_FOR_USER" && !snapshot.needsUser) {
    transitionTask(snapshot, "ACTIVE", event);
  } else if (snapshot.state === "ACTIVE" && snapshot.needsUser) {
    transitionTask(snapshot, "WAITING_FOR_USER", {
      ...event,
      provenance: snapshot.needsUserProvenance ?? event.provenance,
    });
  }
}

/**
 * Terminal finish semantics shared by task_finished and a task_transition
 * that lands on a terminal state: no pending user ask survives, and every
 * non-terminal worker settles — directly when the target is legal from its
 * state, otherwise via CANCELED (reachable from every non-terminal state).
 */
function finalizeTerminal(snapshot: TaskSnapshot, target: TaskState, event: VisualEvent): void {
  snapshot.needsUser = false;
  delete snapshot.needsUserProvenance;
  for (const worker of snapshot.workers) {
    if (TERMINAL_WORKER_STATES.has(worker.state)) continue;
    if (transitionWorker(worker, target as WorkerState, event) !== null) {
      transitionWorker(worker, "CANCELED", event);
    }
  }
}

/**
 * Resolve the worker an event targets. A present workerId is an explicit
 * correlation claim and must match a roster worker — an unmatched id returns
 * "unknown" so callers reject instead of silently mutating the default
 * worker. Only a genuinely absent workerId uses the writer fallback.
 */
function targetWorker(
  snapshot: TaskSnapshot,
  workerId: string | undefined,
): WorkerSnapshot | undefined | "unknown" {
  if (workerId === undefined) return defaultWorker(snapshot);
  return findWorker(snapshot, workerId) ?? "unknown";
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

  // Terminal tasks are frozen: no event may alter state, roster, needsUser,
  // or activity timestamps afterward. Replays still dedupe upstream.
  if (TERMINAL_TASK_STATES.has(snapshot.state)) {
    return {
      ok: false,
      snapshot: snapshotIn,
      error: `task is ${snapshot.state.toLowerCase()} — no further events apply`,
    };
  }

  switch (event.kind) {
    case "task_started":
      // Already reflected in createTaskRecord; replay is a no-op.
      break;

    case "task_transition": {
      if (!event.to) return { ok: false, snapshot: snapshotIn, error: "task_transition missing target" };
      const err = transitionTask(snapshot, event.to as TaskState, event);
      if (err) return { ok: false, snapshot: snapshotIn, error: err };
      // A transition landing terminal carries finish semantics too.
      if (TERMINAL_TASK_STATES.has(snapshot.state)) {
        finalizeTerminal(snapshot, snapshot.state, event);
      }
      break;
    }

    case "worker_transition": {
      const resolved = targetWorker(snapshot, event.workerId);
      if (resolved === "unknown") {
        return { ok: false, snapshot: snapshotIn, error: `unknown worker ${event.workerId}` };
      }
      if (!resolved) return { ok: false, snapshot: snapshotIn, error: "no worker to transition" };
      if (!event.to) return { ok: false, snapshot: snapshotIn, error: "worker_transition missing target" };
      const err = transitionWorker(resolved, event.to as WorkerState, event);
      if (err) return { ok: false, snapshot: snapshotIn, error: err };
      // An explicit wait-for-approval claim is a pending user decision.
      if (event.to === "WAITING_FOR_APPROVAL") {
        snapshot.needsUser = true;
        snapshot.needsUserProvenance = event.provenance;
      }
      // Real work activity wakes the task out of PLANNING/WAITING when truthful.
      if (
        event.to === "WORKING" &&
        (snapshot.state === "PLANNING" || snapshot.state === "WAITING_FOR_USER" || snapshot.state === "BLOCKED")
      ) {
        transitionTask(snapshot, "ACTIVE", event);
      }
      // A worker leaving WAITING_FOR_APPROVAL resolved its pending decision.
      // Derived evidence may idle a worker but never dismiss a real ask.
      if (event.provenance !== "derived") settleNeedsUser(snapshot);
      reconcileWaitState(snapshot, event);
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
      const externalId = event.workerId || undefined; // "" is absent, not an id
      const existing = externalId
        ? snapshot.workers.find((w) => w.externalId === externalId)
        : undefined;
      if (existing) break; // already on roster
      if (snapshot.workers.length >= MAX_VISIBLE_WORKERS) break; // tracked as activity only
      const role = guessRole(event.detail);
      const worker: WorkerSnapshot = {
        // Internal ids stay role-based so a hook correlation id can never
        // collide with — or shadow — a roster member's id.
        id: workerIdFor(role, snapshot.workers.filter((w) => w.role === role).length),
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
      reconcileWaitState(snapshot, event);
      break;
    }

    case "specialist_finished": {
      const worker = findWorkerByExternal(snapshot, event.workerId);
      if (!worker) {
        // An explicit finish claim must name a real worker; an absent id is
        // journaled without completing anyone.
        if (event.workerId !== undefined) {
          return { ok: false, snapshot: snapshotIn, error: `unknown worker ${event.workerId}` };
        }
        break;
      }
      // A delegated turn finished — never assume overall task completion.
      const err = transitionWorker(worker, "COMPLETED", event);
      if (err) return { ok: false, snapshot: snapshotIn, error: err };
      break;
    }

    case "permission_request": {
      const resolved = targetWorker(snapshot, event.workerId);
      if (resolved === "unknown") {
        return { ok: false, snapshot: snapshotIn, error: `unknown worker ${event.workerId}` };
      }
      // A pending approval is real even when the named worker cannot be
      // moved (e.g. already terminal): flag the need, attribute when possible.
      if (resolved) transitionWorker(resolved, "WAITING_FOR_APPROVAL", event);
      if (snapshot.state === "ACTIVE") transitionTask(snapshot, "WAITING_FOR_USER", event);
      snapshot.needsUser = true;
      snapshot.needsUserProvenance = event.provenance;
      break;
    }

    case "worker_assigned": {
      // Assignment notice: attribute to the worker when the id resolves.
      const worker = findWorker(snapshot, event.workerId);
      if (worker) {
        worker.lastEventId = event.id;
        worker.updatedAt = event.at;
      }
      break;
    }

    case "turn_finished": {
      for (const worker of snapshot.workers) {
        if (worker.state === "WORKING" || worker.state === "WAITING_FOR_APPROVAL" || worker.state === "REVIEWING") {
          transitionWorker(worker, "IDLE", event);
        }
      }
      // The turn ended: any approval it carried was resolved or dismissed.
      if (event.provenance !== "derived") settleNeedsUser(snapshot);
      reconcileWaitState(snapshot, event);
      break;
    }

    case "interrupted": {
      for (const worker of snapshot.workers) {
        if (worker.state === "WORKING" || worker.state === "WAITING_FOR_APPROVAL" || worker.state === "REVIEWING") {
          transitionWorker(worker, "IDLE", event);
        }
      }
      // Task keeps its state; resumable. A dismissed prompt is answered.
      if (event.provenance !== "derived") settleNeedsUser(snapshot);
      reconcileWaitState(snapshot, event);
      break;
    }

    case "task_finished": {
      // Explicit completion/failure only. A missing target defaults to
      // COMPLETED; anything else is invalid.
      const target = event.to === undefined ? "COMPLETED" : event.to;
      if (target !== "COMPLETED" && target !== "FAILED") {
        return { ok: false, snapshot: snapshotIn, error: `task_finished cannot target ${target}` };
      }
      const err = transitionTask(snapshot, target, event);
      if (err) return { ok: false, snapshot: snapshotIn, error: err };
      finalizeTerminal(snapshot, target, event);
      break;
    }

    default:
      return { ok: false, snapshot: snapshotIn, error: `unsupported event kind ${event.kind}` };
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
  if (event.taskId !== record.snapshot.id) {
    return {
      ok: false,
      snapshot: record.snapshot,
      error: `event targets task ${event.taskId}, not ${record.snapshot.id}`,
    };
  }
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
