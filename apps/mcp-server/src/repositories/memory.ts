import { randomBytes } from "node:crypto";
import {
  type StartVisualTaskInput,
  type TaskSnapshot,
} from "@visual-team/contracts";
import {
  applyEvent,
  createTaskRecord,
  refreshDerivedFlags,
  type TaskRecord,
} from "@visual-team/state-machine";

/**
 * In-memory repository for the Milestone 0 feasibility spike
 * (PROJECT_PLAN.md §7.2). A PostgreSQL adapter is a future decision only when
 * public multiuser persistence is required — see ADR-006.
 *
 * Anonymous alpha storage (§13.2): high-entropy task ids, task-scoped
 * capability tokens, and short retention via TTL sweep.
 */

export interface StoredTask {
  record: TaskRecord;
  /** Capability token (task-scoped, UI-private). Redacted from logs. */
  capability: string;
  createdAtMs: number;
}

export interface Clock {
  nowIso(): string;
  nowMs(): number;
}

export const systemClock: Clock = {
  nowIso: () => new Date().toISOString(),
  nowMs: () => Date.now(),
};

export const DEFAULT_TTL_MS = 2 * 60 * 60 * 1000; // 2h ephemeral retention

/**
 * Bounded native-correlation indexes (M4). `sessions` maps a Codex
 * `session_id` to the task its observed start-tool receipt bound; `agents`
 * maps a subagent `agent_id` to the task its parent-session SubagentStart
 * resolved. A correlation key is routing metadata only — never an
 * authentication credential (docs/security.md).
 */
interface Binding {
  taskId: string;
  atMs: number;
}

const MAX_BINDINGS = 512;

export class InMemoryTaskRepository {
  private tasks = new Map<string, StoredTask>();
  private sessions = new Map<string, Binding>();
  private agents = new Map<string, Binding>();

  constructor(
    private clock: Clock = systemClock,
    private ttlMs: number = DEFAULT_TTL_MS,
  ) {}

  createTask(input: StartVisualTaskInput): { record: TaskRecord; capability: string } {
    this.sweep();
    const taskId = `vt_${randomBytes(12).toString("hex")}`;
    const capability = `vtc_${randomBytes(24).toString("hex")}`;
    const record = createTaskRecord(input, {
      taskId,
      startedAt: this.clock.nowIso(),
      eventId: `evt_start_${taskId}`,
    });
    this.tasks.set(taskId, { record, capability, createdAtMs: this.clock.nowMs() });
    return { record, capability };
  }

  get(taskId: string): StoredTask | undefined {
    this.sweep();
    return this.tasks.get(taskId);
  }

  verifyCapability(task: StoredTask, capability: string): boolean {
    // Constant-time-ish compare for the alpha; tokens are 48 hex chars.
    return task.capability === capability;
  }

  /**
   * Record a session_id → task binding observed on a call that already
   * resolved to the task (an explicit-taskId receipt or an event on an
   * established session). Bounded; stale entries are swept with their task.
   */
  bindSession(sessionId: string, taskId: string): void {
    this.setBound(this.sessions, sessionId, taskId);
  }

  /** Record an agent_id → task binding (subagent correlation). */
  bindAgent(agentId: string, taskId: string): void {
    this.setBound(this.agents, agentId, taskId);
  }

  /** Raw binding lookup — may point at a gone task; callers validate via get(). */
  boundTaskForSession(sessionId: string): string | undefined {
    return this.sessions.get(sessionId)?.taskId;
  }

  boundTaskForAgent(agentId: string): string | undefined {
    return this.agents.get(agentId)?.taskId;
  }

  /** Resolve a bound session to a live StoredTask, dropping a stale binding. */
  resolveBoundSession(sessionId: string): StoredTask | undefined {
    return this.resolveBound(this.sessions, sessionId);
  }

  resolveBoundAgent(agentId: string): StoredTask | undefined {
    return this.resolveBound(this.agents, agentId);
  }

  private setBound(map: Map<string, Binding>, key: string, taskId: string): void {
    map.delete(key);
    map.set(key, { taskId, atMs: this.clock.nowMs() });
    if (map.size > MAX_BINDINGS) {
      const oldest = map.keys().next();
      if (!oldest.done) map.delete(oldest.value);
    }
  }

  private resolveBound(map: Map<string, Binding>, key: string): StoredTask | undefined {
    const binding = map.get(key);
    if (!binding) return undefined;
    const stored = this.get(binding.taskId);
    if (!stored) map.delete(key); // binding outlived its task — drop it
    return stored;
  }

  /** Snapshot with derived display flags refreshed at read time. */
  readSnapshot(task: StoredTask): TaskSnapshot {
    return refreshDerivedFlags(task.record.snapshot, this.clock.nowIso());
  }

  apply(task: StoredTask, ...events: Parameters<typeof applyEvent>[1][]): { ok: boolean; error?: string; changed: boolean } {
    let changed = false;
    for (const event of events) {
      const result = applyEvent(task.record, event);
      if (!result.ok) return { ok: false, error: result.error, changed };
      changed = changed || result.changed;
    }
    return { ok: true, changed };
  }

  recentEvents(task: StoredTask, limit: number) {
    return task.record.events.slice(-limit);
  }

  private sweep(): void {
    const cutoff = this.clock.nowMs() - this.ttlMs;
    for (const [id, t] of this.tasks) {
      if (t.createdAtMs < cutoff) this.tasks.delete(id);
    }
    // Bindings expire with their task — a swept task releases its keys.
    for (const map of [this.sessions, this.agents]) {
      for (const [key, binding] of map) {
        if (!this.tasks.has(binding.taskId)) map.delete(key);
      }
    }
  }
}
