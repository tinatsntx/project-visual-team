import { TASK_CAPABILITY_META_KEY } from "@visual-team/contracts/meta";
import type { TaskSnapshot, VisualEvent } from "@visual-team/contracts";
import { hostBridge, type ToolResultMessage } from "./hostBridge.js";

/**
 * Task-data state for the widget (PROJECT_PLAN.md §7.4): an explicit
 * initialization phase plus refresh health, kept separate from the task's own
 * lifecycle. Delivery can arrive as a complete `ui/notifications/tool-result`
 * envelope before or after mount, as late `openai:set_globals` host-global
 * updates, or split so public output and private `_meta` arrive separately in
 * either order. A capability only ever binds to the task it was delivered
 * with or to the task this view is showing — never across different tasks.
 */

export type TaskInitPhase = "loading" | "ready" | "unavailable";
export type RefreshHealth = "off" | "live" | "stale" | "unavailable";

export interface TaskDataSnapshot {
  phase: TaskInitPhase;
  task: TaskSnapshot | null;
  recentEvents: VisualEvent[];
  taskId: string | null;
  uiAvailable: boolean;
  refresh: RefreshHealth;
  /** Last host-confirmed data application, ISO time; drives "stale" labels. */
  lastUpdatedAt: string | null;
  /** A read capability bound to the shown task exists right now. */
  hasCapability: boolean;
}

export interface TaskDataDeps {
  callRead?: (taskId: string, capability: string) => Promise<ToolResultMessage>;
  recheck?: () => ToolResultMessage | null;
  loadingDeadlineMs?: number;
  pollMs?: number;
  nowIso?: () => string;
  timers?: {
    setTimeout: (fn: () => void, ms: number) => unknown;
    clearTimeout: (handle: unknown) => void;
    setInterval: (fn: () => void, ms: number) => unknown;
    clearInterval: (handle: unknown) => void;
  };
}

const TERMINAL = new Set(["COMPLETED", "FAILED", "CANCELED"]);

/** Bounded initial wait; afterwards the view reports unavailable (§16 scale). */
export const DEFAULT_LOADING_DEADLINE_MS = 8_000;
/** Unchanged healthy refresh target. */
export const DEFAULT_POLL_MS = 4_000;

interface ResultParts {
  task: TaskSnapshot | null;
  recentEvents: VisualEvent[] | null;
  taskId: string | null;
  uiAvailable: boolean | undefined;
  capability: string | null;
}

function readResult(result: ToolResultMessage): ResultParts {
  const sc = result.structuredContent as
    | { task?: TaskSnapshot; recentEvents?: VisualEvent[]; taskId?: string; uiAvailable?: boolean }
    | undefined;
  const token = result._meta?.[TASK_CAPABILITY_META_KEY];
  return {
    task: sc?.task ?? null,
    recentEvents: sc?.recentEvents ?? null,
    taskId: sc?.task?.id ?? sc?.taskId ?? null,
    uiAvailable: sc && "uiAvailable" in sc ? sc.uiAvailable !== false : undefined,
    capability: typeof token === "string" ? token : null,
  };
}

export class TaskDataStore {
  private task: TaskSnapshot | null = null;
  private recentEvents: VisualEvent[] = [];
  private taskId: string | null = null;
  private uiAvailable = true;
  private capability: string | null = null;
  private capabilityTaskId: string | null = null;
  /** Capability delivered before its task; `taskId` null = this view's own render. */
  private pendingCapability: { token: string; taskId: string | null } | null = null;
  private phase: TaskInitPhase = "loading";
  private refresh: RefreshHealth = "off";
  private lastUpdatedAt: string | null = null;

  private readonly listeners = new Set<() => void>();
  private view: TaskDataSnapshot;
  private started = false;
  private deadlineTimer: unknown = null;
  private pollTimer: unknown = null;
  private readInFlight = false;
  private readSeq = 0;

  private readonly loadingDeadlineMs: number;
  private readonly pollMs: number;
  private readonly nowIso: () => string;
  private readonly timers: NonNullable<TaskDataDeps["timers"]>;

  constructor(private readonly deps: TaskDataDeps = {}) {
    this.loadingDeadlineMs = deps.loadingDeadlineMs ?? DEFAULT_LOADING_DEADLINE_MS;
    this.pollMs = deps.pollMs ?? DEFAULT_POLL_MS;
    this.nowIso = deps.nowIso ?? (() => new Date().toISOString());
    this.timers = deps.timers ?? {
      setTimeout: (fn, ms) => setTimeout(fn, ms),
      clearTimeout: (h) => clearTimeout(h as Parameters<typeof clearTimeout>[0]),
      setInterval: (fn, ms) => setInterval(fn, ms),
      clearInterval: (h) => clearInterval(h as Parameters<typeof clearInterval>[0]),
    };
    this.view = this.buildView();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Stable reference between changes, for useSyncExternalStore. */
  snapshot(): TaskDataSnapshot {
    return this.view;
  }

  /** Begin the bounded initial wait. Idempotent. */
  start(): void {
    if (this.started) return;
    this.started = true;
    if (this.phase === "loading") {
      this.deadlineTimer = this.timers.setTimeout(() => {
        this.deadlineTimer = null;
        if (this.phase === "loading") {
          this.phase = "unavailable";
          this.emit();
        }
      }, this.loadingDeadlineMs);
    }
  }

  /**
   * Merge one delivered envelope. Task data is applied immediately; a
   * capability binds to the task in the same envelope, or to the currently
   * shown task when it arrives alone, or is held for the next task when no
   * task exists yet — so output and metadata may arrive in either order.
   * A new task invalidates any capability bound to a different task and
   * resets task-scoped data (events, refresh health) so nothing from the
   * previous task leaks into the new view.
   *
   * `options.confirm` distinguishes a fresh confirmation (a live host
   * delivery or a successful read — the default) from replaying a cached
   * envelope: a replay only advances `lastUpdatedAt` when it actually carries
   * data the store has not applied, so a failed retry cannot falsely claim
   * the data was just confirmed.
   */
  applyToolResult(
    result: ToolResultMessage | null | undefined,
    options?: { confirm?: boolean },
  ): void {
    if (!result || result.isError) return;
    const parts = readResult(result);
    const confirm = options?.confirm !== false;

    // A strictly older snapshot for the shown task (e.g. a replayed render
    // envelope after fresher reads) must not overwrite newer data. A different
    // task id is a new render and always applies.
    const staleSameTask =
      parts.task !== null &&
      this.task !== null &&
      parts.task.id === this.taskId &&
      parts.task.updatedAt < this.task.updatedAt;
    const taskChanged =
      parts.task !== null &&
      (parts.task.id !== this.taskId ||
        this.task === null ||
        parts.task.updatedAt !== this.task.updatedAt ||
        parts.task.eventCount !== this.task.eventCount);
    // Events are append-only: same length and same tail id means the same list.
    const eventsChanged =
      parts.recentEvents !== null &&
      (parts.recentEvents.length !== this.recentEvents.length ||
        parts.recentEvents.at(-1)?.id !== this.recentEvents.at(-1)?.id);
    const appliedData =
      !staleSameTask && (parts.task !== null || parts.recentEvents !== null);

    if (parts.task) {
      if (parts.task.id !== this.taskId) {
        this.capability = null;
        this.capabilityTaskId = null;
        // A new task never inherits the previous task's event list.
        this.recentEvents = [];
        // Refresh health is task-scoped: the new task recomputes it in sync().
        this.refresh = "off";
      }
      this.taskId = parts.task.id;
      if (!staleSameTask) this.task = parts.task;
    } else if (parts.taskId && parts.taskId !== this.taskId && !this.task) {
      this.taskId = parts.taskId;
    }
    if (parts.recentEvents && !staleSameTask) this.recentEvents = parts.recentEvents;
    if (appliedData && (confirm || taskChanged || eventsChanged)) {
      this.lastUpdatedAt = this.nowIso();
    }
    if (parts.uiAvailable !== undefined) {
      this.uiAvailable = parts.uiAvailable;
      // A declared uiAvailable=false fallback is a definitive host answer:
      // leave "loading" even though no snapshot exists to render.
      if (parts.uiAvailable === false) this.phase = "ready";
    }

    if (parts.capability) {
      if (parts.task) {
        this.capability = parts.capability;
        this.capabilityTaskId = parts.task.id;
        this.pendingCapability = null;
      } else if (parts.taskId && parts.taskId !== this.taskId) {
        // Metadata for a task this view has not seen yet: hold it so it can
        // only ever bind to that task, never to the one on screen.
        this.pendingCapability = { token: parts.capability, taskId: parts.taskId };
      } else if (this.taskId) {
        this.capability = parts.capability;
        this.capabilityTaskId = this.taskId;
        this.pendingCapability = null;
      } else {
        this.pendingCapability = { token: parts.capability, taskId: null };
      }
    }
    if (
      !this.capability &&
      this.pendingCapability &&
      this.taskId &&
      (this.pendingCapability.taskId === null || this.pendingCapability.taskId === this.taskId)
    ) {
      this.capability = this.pendingCapability.token;
      this.capabilityTaskId = this.taskId;
      this.pendingCapability = null;
    }

    if (this.task || this.phase === "ready") {
      this.phase = "ready";
      this.clearDeadline();
    }
    this.sync();
    this.emit();
  }

  /**
   * User-initiated recovery: recheck host data, then read if credentialed.
   * The recheck replays a cached envelope, so it is applied without claiming
   * a fresh confirmation; only the read — or genuinely new data — can advance
   * the confirmed timestamp.
   */
  retry(): void {
    const fresh = this.deps.recheck?.() ?? null;
    if (fresh) this.applyToolResult(fresh, { confirm: false });
    if (this.canPoll()) void this.performRead();
    else this.emit();
  }

  dispose(): void {
    this.clearDeadline();
    this.clearPoll();
    this.readSeq += 1;
    this.listeners.clear();
  }

  private canPoll(): boolean {
    return (
      this.task !== null &&
      !TERMINAL.has(this.task.state) &&
      this.capability !== null &&
      this.capabilityTaskId === this.taskId &&
      this.deps.callRead !== undefined
    );
  }

  private sync(): void {
    const pollable = this.canPoll();
    const wasPolling = this.pollTimer !== null;

    if (pollable && !wasPolling) {
      this.pollTimer = this.timers.setInterval(() => void this.performRead(), this.pollMs);
    } else if (!pollable && wasPolling) {
      this.clearPoll();
    }

    this.refresh =
      !this.task || TERMINAL.has(this.task.state)
        ? "off"
        : !pollable
          ? "unavailable"
          : this.refresh === "stale"
            ? "stale"
            : "live";

    if (pollable && !wasPolling) void this.performRead();
  }

  private async performRead(): Promise<void> {
    const taskId = this.taskId;
    const capability = this.capability;
    if (
      this.readInFlight ||
      !taskId ||
      !capability ||
      this.capabilityTaskId !== taskId ||
      !this.deps.callRead ||
      !this.task ||
      TERMINAL.has(this.task.state)
    ) {
      return;
    }
    this.readInFlight = true;
    const seq = ++this.readSeq;
    try {
      const result = await this.deps.callRead(taskId, capability);
      // A late answer for a superseded task or read must not overwrite newer data.
      if (seq !== this.readSeq || this.taskId !== taskId) return;
      if (result.isError) {
        // Generic rejections (unknown task/invalid capability) mean "couldn't
        // refresh", never "task expired" — keep the last confirmed data stale.
        // A task that went terminal since the read started stays "off".
        if (this.task && !TERMINAL.has(this.task.state)) {
          this.refresh = "stale";
          this.emit();
        }
      } else {
        this.applyToolResult(result);
        if (this.canPoll() && this.refresh !== "live") {
          this.refresh = "live";
          this.emit();
        }
      }
    } catch {
      if (
        seq === this.readSeq &&
        this.taskId === taskId &&
        this.task !== null &&
        !TERMINAL.has(this.task.state)
      ) {
        this.refresh = "stale";
        this.emit();
      }
    } finally {
      if (seq === this.readSeq) this.readInFlight = false;
    }
  }

  private clearDeadline(): void {
    if (this.deadlineTimer !== null) {
      this.timers.clearTimeout(this.deadlineTimer);
      this.deadlineTimer = null;
    }
  }

  private clearPoll(): void {
    if (this.pollTimer !== null) {
      this.timers.clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private buildView(): TaskDataSnapshot {
    return {
      phase: this.phase,
      task: this.task,
      recentEvents: this.recentEvents,
      taskId: this.taskId,
      uiAvailable: this.uiAvailable,
      refresh: this.refresh,
      lastUpdatedAt: this.lastUpdatedAt,
      hasCapability: this.capability !== null && this.capabilityTaskId === this.taskId,
    };
  }

  private emit(): void {
    this.view = this.buildView();
    for (const listener of this.listeners) listener();
  }
}

/** Widget singleton; dependencies reach the bridge lazily at call time. */
export const taskDataStore = new TaskDataStore({
  callRead: (taskId, capability) =>
    hostBridge.callTool(
      "get_visual_task",
      { taskId, eventLimit: 20 },
      { [TASK_CAPABILITY_META_KEY]: capability },
    ),
  recheck: () => hostBridge.currentToolResult(),
});
