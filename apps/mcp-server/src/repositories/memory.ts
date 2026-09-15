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

export class InMemoryTaskRepository {
  private tasks = new Map<string, StoredTask>();

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

  /** Most recently active non-terminal task — used to correlate hook events that lack a taskId. */
  mostRecentActive(): StoredTask | undefined {
    this.sweep();
    let best: StoredTask | undefined;
    for (const t of this.tasks.values()) {
      if (t.record.snapshot.state === "COMPLETED" || t.record.snapshot.state === "FAILED" || t.record.snapshot.state === "CANCELED") {
        continue;
      }
      if (!best || t.record.snapshot.lastActivityAt > best.record.snapshot.lastActivityAt) best = t;
    }
    return best;
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
  }
}
