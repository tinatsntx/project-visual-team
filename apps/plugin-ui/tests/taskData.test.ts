import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { TaskSnapshot, TaskState, VisualEvent, WorkerSnapshot } from "@visual-team/contracts";
import { TASK_CAPABILITY_META_KEY } from "@visual-team/contracts/meta";
import {
  HostBridge,
  toolResultFromGlobals,
  type ToolResultMessage,
} from "../src/bridge/hostBridge.ts";
import { TaskDataStore } from "../src/bridge/taskData.ts";
import { RefreshNotice, askStateMessage } from "../src/components/RefreshNotice.tsx";
import { InlineView } from "../src/modes/InlineView.tsx";

/**
 * Regression coverage for widget startup and read recovery (brief 004).
 * Exercises the real TaskDataStore/bridge merge logic with a stubbed read
 * transport and short deadlines — these outcomes are synthetic harness
 * evidence, not native host acceptance.
 */

const POLL_MS = 25;
const DEADLINE_MS = 60;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function makeTask(id: string, state: TaskState = "ACTIVE"): TaskSnapshot {
  const at = "2026-09-14T00:00:00.000Z";
  return {
    id,
    title: `Task ${id}`,
    summary: `Summary ${id}`,
    mode: "solo",
    privacyMode: "standard",
    state,
    stateProvenance: "reported",
    workers: [],
    createdAt: at,
    updatedAt: at,
    lastActivityAt: at,
    noRecentActivity: false,
    needsUser: false,
    eventCount: 1,
  };
}

const EVENT: VisualEvent = {
  id: "evt_1",
  taskId: "vt_a",
  at: "2026-09-14T00:00:00.000Z",
  provenance: "observed",
  kind: "activity",
  label: "Observed activity.",
};

function renderResult(task: TaskSnapshot, capability?: string): ToolResultMessage {
  return {
    content: [{ type: "text", text: `Task ${task.id}` }],
    structuredContent: {
      taskId: task.id,
      task,
      recentEvents: [EVENT],
      uiAvailable: true,
    },
    ...(capability ? { _meta: { [TASK_CAPABILITY_META_KEY]: capability } } : {}),
  };
}

interface ReadCall {
  taskId: string;
  capability: string;
}

function makeStore(options: {
  read: (taskId: string, capability: string, calls: ReadCall[]) => Promise<ToolResultMessage>;
  recheck?: () => ToolResultMessage | null;
}) {
  const calls: ReadCall[] = [];
  const store = new TaskDataStore({
    callRead: (taskId, capability) => {
      calls.push({ taskId, capability });
      return options.read(taskId, capability, calls);
    },
    recheck: options.recheck,
    pollMs: POLL_MS,
    loadingDeadlineMs: DEADLINE_MS,
  });
  return { store, calls };
}

describe("task data store — startup and recovery", () => {
  it("applies a complete render result and polls while non-terminal", async () => {
    const { store, calls } = makeStore({
      read: async (taskId) => ({
        structuredContent: { taskId, task: makeTask(taskId), recentEvents: [EVENT] },
      }),
    });
    store.start();
    store.applyToolResult(renderResult(makeTask("vt_a"), "cap_a"));

    assert.equal(store.snapshot().phase, "ready");
    assert.equal(store.snapshot().task?.id, "vt_a");
    assert.equal(store.snapshot().hasCapability, true);
    assert.ok(store.snapshot().lastUpdatedAt);

    await sleep(10); // immediate read once the capability binds
    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0], { taskId: "vt_a", capability: "cap_a" });
    assert.equal(store.snapshot().refresh, "live");

    await sleep(POLL_MS * 2.5); // healthy cadence continues
    assert.ok(calls.length >= 2);
    store.dispose();
  });

  it("reaches a bounded unavailable state, then recovers on late delivery", async () => {
    const { store, calls } = makeStore({
      read: async (taskId) => ({
        structuredContent: { taskId, task: makeTask(taskId), recentEvents: [] },
      }),
    });
    store.start();
    await sleep(DEADLINE_MS * 2);
    assert.equal(store.snapshot().phase, "unavailable");
    assert.equal(store.snapshot().task, null);

    store.applyToolResult(renderResult(makeTask("vt_late"), "cap_late"));
    assert.equal(store.snapshot().phase, "ready");
    await sleep(10);
    assert.equal(calls.length, 1);
    assert.equal(store.snapshot().refresh, "live");
    store.dispose();
  });

  it("handles public output first, private metadata later (split, either order)", async () => {
    const task = makeTask("vt_split");
    const { store, calls } = makeStore({
      read: async (taskId) => ({
        structuredContent: { taskId, task: makeTask(taskId), recentEvents: [] },
      }),
    });
    store.start();
    store.applyToolResult({ content: [], structuredContent: { taskId: task.id, task } });
    assert.equal(store.snapshot().phase, "ready");
    assert.equal(store.snapshot().hasCapability, false);
    assert.equal(store.snapshot().refresh, "unavailable"); // labelled, task still rendered

    store.applyToolResult({ _meta: { [TASK_CAPABILITY_META_KEY]: "cap_split" } });
    assert.equal(store.snapshot().hasCapability, true);
    await sleep(10);
    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.capability, "cap_split");
    store.dispose();
  });

  it("handles private metadata first, public output later", async () => {
    const { store, calls } = makeStore({
      read: async (taskId) => ({
        structuredContent: { taskId, task: makeTask(taskId), recentEvents: [] },
      }),
    });
    store.start();
    store.applyToolResult({ _meta: { [TASK_CAPABILITY_META_KEY]: "cap_first" } });
    assert.equal(store.snapshot().phase, "loading");
    assert.equal(store.snapshot().hasCapability, false);

    store.applyToolResult({ structuredContent: { task: makeTask("vt_b") } });
    assert.equal(store.snapshot().phase, "ready");
    assert.equal(store.snapshot().hasCapability, true);
    await sleep(10);
    assert.equal(calls[0]?.capability, "cap_first");
    store.dispose();
  });

  it("never applies another task's capability to the task on screen", async () => {
    const { store, calls } = makeStore({
      read: async (taskId) => ({
        structuredContent: { taskId, task: makeTask(taskId), recentEvents: [] },
      }),
    });
    store.start();
    store.applyToolResult(renderResult(makeTask("vt_a"), "cap_a"));
    await sleep(10);
    assert.equal(calls.length, 1);

    // A different task's render without metadata must not inherit cap_a.
    store.applyToolResult(renderResult(makeTask("vt_b")));
    assert.equal(store.snapshot().task?.id, "vt_b");
    assert.equal(store.snapshot().hasCapability, false);
    assert.equal(store.snapshot().refresh, "unavailable");
    await sleep(POLL_MS * 3);
    assert.ok(calls.every((c) => c.taskId === "vt_a" && c.capability === "cap_a"));

    // Metadata hinted for a third task must wait for that task, not bind to B.
    store.applyToolResult({
      structuredContent: { taskId: "vt_c" },
      _meta: { [TASK_CAPABILITY_META_KEY]: "cap_c" },
    });
    assert.equal(store.snapshot().hasCapability, false);
    store.applyToolResult({ structuredContent: { task: makeTask("vt_c") } });
    assert.equal(store.snapshot().hasCapability, true);
    await sleep(10);
    assert.equal(calls.at(-1)?.taskId, "vt_c");
    assert.equal(calls.at(-1)?.capability, "cap_c");
    store.dispose();
  });

  it("marks reads stale on failure, keeps last-known data, recovers on success", async () => {
    let fail = true;
    const { store } = makeStore({
      read: async (taskId) => {
        if (fail) throw new Error("bridge timeout");
        return { structuredContent: { taskId, task: makeTask(taskId), recentEvents: [EVENT] } };
      },
    });
    store.start();
    store.applyToolResult(renderResult(makeTask("vt_a"), "cap_a"));
    const confirmedAt = store.snapshot().lastUpdatedAt;

    await sleep(10); // first read rejects
    assert.equal(store.snapshot().refresh, "stale");
    assert.equal(store.snapshot().task?.id, "vt_a");
    assert.equal(store.snapshot().lastUpdatedAt, confirmedAt);
    assert.equal(store.snapshot().phase, "ready");

    fail = false;
    await sleep(POLL_MS * 2);
    assert.equal(store.snapshot().refresh, "live");
    store.dispose();
  });

  it("treats a generic unknown-task rejection as stale, never expired", async () => {
    const { store } = makeStore({
      read: async () => ({
        content: [{ type: "text", text: "Unknown task or invalid capability." }],
        isError: true,
      }),
    });
    store.start();
    store.applyToolResult(renderResult(makeTask("vt_a"), "cap_a"));
    await sleep(10);
    assert.equal(store.snapshot().refresh, "stale");
    assert.equal(store.snapshot().phase, "ready");
    assert.equal(store.snapshot().task?.id, "vt_a");
    store.dispose();
  });

  it("keeps at most one read in flight across poll ticks", async () => {
    const pending: { release?: (r: ToolResultMessage) => void } = {};
    const { store, calls } = makeStore({
      read: (taskId) =>
        new Promise<ToolResultMessage>((resolve) => {
          pending.release = resolve;
          void taskId;
        }),
    });
    store.start();
    store.applyToolResult(renderResult(makeTask("vt_a"), "cap_a"));
    await sleep(POLL_MS * 3); // several ticks while the first read hangs
    assert.equal(calls.length, 1);

    pending.release?.({ structuredContent: { taskId: "vt_a", task: makeTask("vt_a"), recentEvents: [] } });
    await sleep(POLL_MS * 2);
    assert.ok(calls.length >= 2);
    store.dispose();
  });

  it("drops a late read response instead of overwriting newer task data", async () => {
    const pending: { resolveFirst?: (r: ToolResultMessage) => void } = {};
    const { store } = makeStore({
      read: (taskId) =>
        taskId === "vt_a"
          ? new Promise<ToolResultMessage>((resolve) => (pending.resolveFirst = resolve))
          : Promise.resolve({
              structuredContent: { taskId, task: makeTask(taskId), recentEvents: [] },
            }),
    });
    store.start();
    store.applyToolResult(renderResult(makeTask("vt_a"), "cap_a"));
    await sleep(5); // vt_a read is in flight

    store.applyToolResult(renderResult(makeTask("vt_b"), "cap_b"));
    assert.equal(store.snapshot().task?.id, "vt_b");

    pending.resolveFirst?.({
      structuredContent: { taskId: "vt_a", task: makeTask("vt_a"), recentEvents: [EVENT] },
    });
    await sleep(5);
    assert.equal(store.snapshot().task?.id, "vt_b");
    store.dispose();
  });

  it("ignores a replayed older snapshot for the task on screen", async () => {
    const { store } = makeStore({
      read: async (taskId) => ({
        structuredContent: { taskId, task: makeTask(taskId), recentEvents: [] },
      }),
    });
    store.start();
    const fresh = { ...makeTask("vt_a"), updatedAt: "2026-09-14T01:00:00.000Z", eventCount: 5 };
    store.applyToolResult(renderResult(fresh, "cap_a"));

    // A replayed render envelope carrying the older snapshot must not win.
    store.applyToolResult(renderResult(makeTask("vt_a"), "cap_a"));
    assert.equal(store.snapshot().task?.updatedAt, "2026-09-14T01:00:00.000Z");
    assert.equal(store.snapshot().task?.eventCount, 5);
    assert.equal(store.snapshot().hasCapability, true); // capability still bound
    store.dispose();
  });

  it("stops polling once the task reaches a terminal state", async () => {
    const { store, calls } = makeStore({
      read: async (taskId) => ({
        structuredContent: { taskId, task: makeTask(taskId, "COMPLETED"), recentEvents: [] },
      }),
    });
    store.start();
    store.applyToolResult(renderResult(makeTask("vt_a"), "cap_a"));
    await sleep(10); // the read reports COMPLETED
    assert.equal(store.snapshot().task?.state, "COMPLETED");
    assert.equal(store.snapshot().refresh, "off");
    const seen = calls.length;
    await sleep(POLL_MS * 3);
    assert.equal(calls.length, seen);
    store.dispose();
  });

  it("retry rechecks host data and performs a credentialed read", async () => {
    const late = renderResult(makeTask("vt_retry"), "cap_retry");
    const { store, calls } = makeStore({
      recheck: () => late,
      read: async (taskId) => ({
        structuredContent: { taskId, task: makeTask(taskId), recentEvents: [] },
      }),
    });
    store.start();
    await sleep(DEADLINE_MS * 2);
    assert.equal(store.snapshot().phase, "unavailable");

    store.retry();
    assert.equal(store.snapshot().phase, "ready");
    assert.equal(store.snapshot().task?.id, "vt_retry");
    await sleep(10);
    assert.equal(calls.length, 1);
    store.dispose();
  });

  it("treats a declared uiAvailable=false fallback as a definitive answer", async () => {
    const { store } = makeStore({ read: async () => ({}) });
    store.start();
    store.applyToolResult({
      content: [{ type: "text", text: "summary only" }],
      structuredContent: { taskId: "vt_no_ui", uiAvailable: false },
    });
    assert.equal(store.snapshot().phase, "ready");
    assert.equal(store.snapshot().task, null);
    assert.equal(store.snapshot().uiAvailable, false);
    await sleep(DEADLINE_MS * 2); // must not regress to unavailable
    assert.equal(store.snapshot().phase, "ready");
    store.dispose();
  });
});

describe("host-global tool result merge", () => {
  it("combines the private metadata envelope with public output for one task", () => {
    const task = makeTask("vt_g");
    const result = toolResultFromGlobals({
      toolOutput: { taskId: task.id, task },
      toolResponseMetadata: {
        mcp_tool_result: {
          content: [{ type: "text", text: "t" }],
          structuredContent: { taskId: task.id, task },
          _meta: { [TASK_CAPABILITY_META_KEY]: "cap_g" },
        },
      },
    });
    assert.ok(result);
    assert.equal(result._meta?.[TASK_CAPABILITY_META_KEY], "cap_g");
    assert.equal((result.structuredContent as { taskId: string }).taskId, "vt_g");
  });

  it("drops a stale metadata envelope when the public output names a different task", () => {
    // A new public task B paired with the previously cached task A envelope:
    // B wins and A's private metadata is never borrowed.
    const result = toolResultFromGlobals({
      toolOutput: { taskId: "vt_b", task: makeTask("vt_b") },
      toolResponseMetadata: {
        mcp_tool_result: {
          structuredContent: { taskId: "vt_a", task: makeTask("vt_a") },
          _meta: { [TASK_CAPABILITY_META_KEY]: "cap_a" },
        },
      },
    });
    assert.ok(result);
    assert.equal((result.structuredContent as { taskId: string }).taskId, "vt_b");
    assert.equal(result._meta, undefined);
  });

  it("drops a meta-only envelope that cannot be correlated to the output's task", () => {
    // Lacking identity, the envelope cannot be bound safely: the view shows
    // limited refresh until an identifiable delivery can bind the credential.
    const result = toolResultFromGlobals({
      toolOutput: { taskId: "vt_b", task: makeTask("vt_b") },
      toolResponseMetadata: { mcp_tool_result: { _meta: { [TASK_CAPABILITY_META_KEY]: "cap" } } },
    });
    assert.ok(result);
    assert.equal((result.structuredContent as { taskId: string }).taskId, "vt_b");
    assert.equal(result._meta, undefined);
  });

  it("returns a meta-only envelope when no public output exists to conflict with", () => {
    const result = toolResultFromGlobals({
      toolResponseMetadata: { mcp_tool_result: { _meta: { [TASK_CAPABILITY_META_KEY]: "cap" } } },
    });
    assert.equal(result?._meta?.[TASK_CAPABILITY_META_KEY], "cap");
  });

  it("returns public output alone and null when neither global exists", () => {
    assert.deepEqual(toolResultFromGlobals({ toolOutput: { taskId: "vt_x" } }), {
      structuredContent: { taskId: "vt_x" },
    });
    assert.equal(toolResultFromGlobals({}), null);
  });
});

// ---------------------------------------------------------------------------
// Brief-004 follow-up regressions (coordinator probe, converted to assertions)
// ---------------------------------------------------------------------------

const STUB_TIMERS = {
  setTimeout: () => 1,
  clearTimeout: () => {},
  setInterval: () => 2,
  clearInterval: () => {},
};

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe("truthful confirmation time (follow-up)", () => {
  it("a failed retry does not advance the last-confirmed timestamp", async () => {
    let now = "2026-09-14T00:00:00.000Z";
    const cached = renderResult(makeTask("vt_a"), "cap_a");
    const store = new TaskDataStore({
      timers: STUB_TIMERS,
      nowIso: () => now,
      recheck: () => cached,
      callRead: async () => ({ isError: true }),
    });
    store.start();
    store.applyToolResult(cached);
    await flushMicrotasks(); // the initial read rejects → stale
    const before = store.snapshot().lastUpdatedAt;
    assert.equal(store.snapshot().refresh, "stale");

    now = "2026-09-14T01:00:00.000Z";
    store.retry();
    await flushMicrotasks();
    assert.equal(store.snapshot().lastUpdatedAt, before);
    assert.equal(store.snapshot().refresh, "stale");
    store.dispose();
  });

  it("a successful retry advances the timestamp and returns to live", async () => {
    let now = "2026-09-14T00:00:00.000Z";
    const cached = renderResult(makeTask("vt_a"), "cap_a");
    const store = new TaskDataStore({
      timers: STUB_TIMERS,
      nowIso: () => now,
      recheck: () => cached,
      callRead: async (taskId) => ({
        // A fresh read of unchanged data still confirms freshness.
        structuredContent: { taskId, task: makeTask(taskId), recentEvents: [] },
      }),
    });
    store.start();
    store.applyToolResult(cached);
    const before = store.snapshot().lastUpdatedAt;

    now = "2026-09-14T01:00:00.000Z";
    store.retry();
    await flushMicrotasks();
    assert.equal(store.snapshot().lastUpdatedAt, "2026-09-14T01:00:00.000Z");
    assert.notEqual(store.snapshot().lastUpdatedAt, before);
    assert.equal(store.snapshot().refresh, "live");
    store.dispose();
  });

  it("a replayed cached envelope does not claim a fresh confirmation", () => {
    const now = "2026-09-14T00:00:00.000Z";
    const cached = renderResult(makeTask("vt_a"), "cap_a");
    const store = new TaskDataStore({
      timers: STUB_TIMERS,
      nowIso: () => now,
      callRead: async () => ({ isError: true }),
    });
    store.applyToolResult(cached);
    const before = store.snapshot().lastUpdatedAt;
    store.applyToolResult(cached, { confirm: false }); // same data, replay
    assert.equal(store.snapshot().lastUpdatedAt, before);
    store.dispose();
  });
});

describe("terminal guards (follow-up)", () => {
  it("a late isError cannot relabel a terminal task stale or restart polling", async () => {
    let release: ((r: ToolResultMessage) => void) | undefined;
    const calls: string[] = [];
    const store = new TaskDataStore({
      timers: STUB_TIMERS,
      callRead: (taskId) => {
        calls.push(taskId);
        return new Promise<ToolResultMessage>((resolve) => {
          release = resolve;
        });
      },
    });
    store.applyToolResult(renderResult(makeTask("vt_t"), "cap_t"));
    await flushMicrotasks(); // read in flight while ACTIVE

    store.applyToolResult(
      renderResult(
        { ...makeTask("vt_t"), state: "COMPLETED", updatedAt: "2026-09-14T00:01:00.000Z" },
        "cap_t",
      ),
    );
    assert.equal(store.snapshot().task?.state, "COMPLETED");
    assert.equal(store.snapshot().refresh, "off");

    release?.({ isError: true });
    await flushMicrotasks();
    assert.equal(store.snapshot().task?.state, "COMPLETED");
    assert.equal(store.snapshot().refresh, "off");
    assert.equal(calls.length, 1); // polling was not restarted
    store.dispose();
  });

  it("a late rejected promise cannot relabel a terminal task stale", async () => {
    let fail: ((e: Error) => void) | undefined;
    const store = new TaskDataStore({
      timers: STUB_TIMERS,
      callRead: () =>
        new Promise<ToolResultMessage>((_resolve, reject) => {
          fail = reject;
        }),
    });
    store.applyToolResult(renderResult(makeTask("vt_t"), "cap_t"));
    await flushMicrotasks();

    store.applyToolResult(
      renderResult(
        { ...makeTask("vt_t"), state: "FAILED", updatedAt: "2026-09-14T00:01:00.000Z" },
        "cap_t",
      ),
    );
    fail?.(new Error("bridge timeout"));
    await flushMicrotasks();
    assert.equal(store.snapshot().task?.state, "FAILED");
    assert.equal(store.snapshot().refresh, "off");
    store.dispose();
  });
});

describe("task-switch scoping (follow-up)", () => {
  it("clears the previous task's events and capability on a partial task B", () => {
    const store = new TaskDataStore({ timers: STUB_TIMERS });
    store.applyToolResult(
      renderResult(makeTask("vt_a"), "cap_a"),
    );
    assert.equal(store.snapshot().recentEvents.length, 1);

    // Partial task B data omits recentEvents — A's events must not carry over.
    store.applyToolResult({ structuredContent: { task: makeTask("vt_b") } });
    assert.equal(store.snapshot().taskId, "vt_b");
    assert.equal(store.snapshot().task?.id, "vt_b");
    assert.deepEqual(store.snapshot().recentEvents, []);
    assert.equal(store.snapshot().hasCapability, false);
    store.dispose();
  });

  it("keeps fresh task B data usable as its pieces arrive", () => {
    const store = new TaskDataStore({ timers: STUB_TIMERS });
    store.applyToolResult(renderResult(makeTask("vt_a"), "cap_a"));
    store.applyToolResult({ structuredContent: { task: makeTask("vt_b") } });
    store.applyToolResult({
      structuredContent: { taskId: "vt_b", recentEvents: [{ ...EVENT, taskId: "vt_b", id: "evt_b" }] },
      _meta: { [TASK_CAPABILITY_META_KEY]: "cap_b" },
    });
    assert.equal(store.snapshot().task?.id, "vt_b");
    assert.equal(store.snapshot().recentEvents[0]?.taskId, "vt_b");
    assert.equal(store.snapshot().hasCapability, true);
    store.dispose();
  });
});

// ---------------------------------------------------------------------------
// HostBridge → TaskDataStore integration (synthetic host, stubbed window)
// ---------------------------------------------------------------------------

interface FakeHost {
  win: {
    parent: { postMessage: (msg: Record<string, unknown>) => void };
    openai?: { toolOutput?: unknown; toolResponseMetadata?: unknown };
  };
  sent: Array<Record<string, unknown>>;
  initialize: () => Promise<void>;
  deliver: (params: unknown) => void;
  setGlobals: (globals: Record<string, unknown>) => void;
  respondTo: (method: string, result: unknown) => void;
  restore: () => void;
}

function fakeHost(): FakeHost {
  const listeners = new Map<string, (event: unknown) => void>();
  const sent: Array<Record<string, unknown>> = [];
  const parent = { postMessage: (msg: Record<string, unknown>) => sent.push(msg) };
  const win = {
    parent,
    openai: undefined as FakeHost["win"]["openai"],
    addEventListener: (name: string, handler: (event: unknown) => void) => {
      listeners.set(name, handler);
    },
    matchMedia: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }),
  };
  const previous = (globalThis as { window?: unknown }).window;
  (globalThis as { window?: unknown }).window = win;
  return {
    win,
    sent,
    async initialize() {
      const request = sent.find((m) => m.method === "ui/initialize");
      assert.ok(request, "widget should send ui/initialize");
      listeners.get("message")?.({
        source: parent,
        data: { jsonrpc: "2.0", id: request.id, result: { hostContext: { displayMode: "inline" } } },
      });
      await flushMicrotasks();
      assert.ok(
        sent.some((m) => m.method === "ui/notifications/initialized"),
        "widget should announce initialized",
      );
    },
    deliver(params: unknown) {
      listeners.get("message")?.({
        source: parent,
        data: { jsonrpc: "2.0", method: "ui/notifications/tool-result", params },
      });
    },
    setGlobals(globals: Record<string, unknown>) {
      listeners.get("openai:set_globals")?.({ detail: { globals } });
    },
    respondTo(method: string, result: unknown) {
      const request = sent.find((m) => m.method === method);
      assert.ok(request, `expected a ${method} request`);
      listeners.get("message")?.({
        source: parent,
        data: { jsonrpc: "2.0", id: request.id, result },
      });
    },
    restore() {
      if (previous === undefined) delete (globalThis as { window?: unknown }).window;
      else (globalThis as { window?: unknown }).window = previous;
    },
  };
}

describe("host bridge → store bootstrap (synthetic)", () => {
  it("retains meta-then-public split parts delivered before subscription", async () => {
    const host = fakeHost();
    try {
      const bridge = new HostBridge();
      bridge.start();
      await host.initialize();

      host.deliver({ _meta: { [TASK_CAPABILITY_META_KEY]: "cap_a" } });
      host.deliver({ structuredContent: { taskId: "vt_a", task: makeTask("vt_a"), recentEvents: [] } });

      const store = new TaskDataStore({ timers: STUB_TIMERS });
      bridge.onToolResult((r) => store.applyToolResult(r));
      store.applyToolResult(bridge.currentToolResult());
      assert.equal(store.snapshot().phase, "ready");
      assert.equal(store.snapshot().task?.id, "vt_a");
      assert.equal(store.snapshot().hasCapability, true);
      store.dispose();
    } finally {
      host.restore();
    }
  });

  it("retains public-then-private split parts delivered before subscription", async () => {
    const host = fakeHost();
    try {
      const bridge = new HostBridge();
      bridge.start();
      await host.initialize();

      host.deliver({
        structuredContent: { taskId: "vt_a", task: makeTask("vt_a"), recentEvents: [] },
      });
      host.setGlobals({
        toolResponseMetadata: { mcp_tool_result: { _meta: { [TASK_CAPABILITY_META_KEY]: "cap_a" } } },
      });

      const store = new TaskDataStore({ timers: STUB_TIMERS });
      bridge.onToolResult((r) => store.applyToolResult(r));
      store.applyToolResult(bridge.currentToolResult());
      assert.equal(store.snapshot().phase, "ready");
      assert.equal(store.snapshot().task?.id, "vt_a");
      assert.equal(store.snapshot().hasCapability, true);
      store.dispose();
    } finally {
      host.restore();
    }
  });

  it("retains both split orders after subscription as well", async () => {
    const host = fakeHost();
    try {
      const bridge = new HostBridge();
      bridge.start();
      await host.initialize();
      const store = new TaskDataStore({ timers: STUB_TIMERS });
      bridge.onToolResult((r) => store.applyToolResult(r));
      store.applyToolResult(bridge.currentToolResult());

      // Public first, then private metadata.
      host.deliver({
        structuredContent: { taskId: "vt_a", task: makeTask("vt_a"), recentEvents: [] },
      });
      host.deliver({ _meta: { [TASK_CAPABILITY_META_KEY]: "cap_a" } });
      assert.equal(store.snapshot().task?.id, "vt_a");
      assert.equal(store.snapshot().hasCapability, true);
      store.dispose();
    } finally {
      host.restore();
    }
  });

  it("a partial task-B globals update cannot resurrect task A or borrow its capability", async () => {
    const host = fakeHost();
    try {
      const bridge = new HostBridge();
      bridge.start();
      await host.initialize();
      const store = new TaskDataStore({ timers: STUB_TIMERS });
      bridge.onToolResult((r) => store.applyToolResult(r));
      store.applyToolResult(bridge.currentToolResult());

      host.deliver(renderResult(makeTask("vt_a"), "cap_a"));
      assert.equal(store.snapshot().task?.id, "vt_a");
      assert.equal(store.snapshot().hasCapability, true);

      // Host updates toolOutput to task B while toolResponseMetadata still
      // holds task A's envelope — a partial update across the task change.
      host.win.openai = {
        toolResponseMetadata: { mcp_tool_result: renderResult(makeTask("vt_a"), "cap_a") },
      };
      host.setGlobals({ toolOutput: { taskId: "vt_b", task: makeTask("vt_b") } });

      const snap = store.snapshot();
      assert.equal(snap.task?.id, "vt_b");
      assert.equal(snap.hasCapability, false); // A's credential never binds to B
      assert.deepEqual(snap.recentEvents, []); // A's events cleared
      assert.equal(snap.refresh, "unavailable"); // limited refresh until B binds

      // B's own envelope (with identity) can then bind its capability.
      host.win.openai = {
        toolOutput: { taskId: "vt_b", task: makeTask("vt_b") },
      };
      host.setGlobals({
        toolResponseMetadata: { mcp_tool_result: renderResult(makeTask("vt_b"), "cap_b") },
      });
      assert.equal(store.snapshot().hasCapability, true);
      store.dispose();
    } finally {
      host.restore();
    }
  });

  it("askForRender resolves false when the host answers ui/message with isError", async () => {
    const host = fakeHost();
    try {
      const bridge = new HostBridge();
      bridge.start();
      await host.initialize();
      const pending = bridge.askForRender();
      host.respondTo("ui/message", { isError: true });
      assert.equal(await pending, false);
    } finally {
      host.restore();
    }
  });
});

// ---------------------------------------------------------------------------
// Recovery controls in markup (synthetic, static render)
// ---------------------------------------------------------------------------

const WORKER: WorkerSnapshot = {
  id: "w1",
  role: "lead",
  label: "Alex",
  state: "WORKING",
  stateProvenance: "observed",
  isWriter: true,
  updatedAt: "2026-09-14T00:00:00.000Z",
};

describe("recovery controls in markup", () => {
  it("the stale banner offers the render-recovery action, not just unavailable", () => {
    const stale = renderToStaticMarkup(
      createElement(RefreshNotice, {
        kind: "stale",
        lastUpdatedAt: "2026-09-14T00:00:00.000Z",
        onRetry: () => {},
        onAskHost: async () => true,
      }),
    );
    assert.match(stale, /Ask ChatGPT to render it again/);
    const unavailable = renderToStaticMarkup(
      createElement(RefreshNotice, {
        kind: "unavailable",
        lastUpdatedAt: null,
        onRetry: () => {},
        onAskHost: async () => true,
      }),
    );
    assert.match(unavailable, /Ask ChatGPT to render it again/);
  });

  it("a rejected render-recovery request maps to static guidance", () => {
    assert.equal(askStateMessage("failed"), "Ask ChatGPT to render the board again to restore this view.");
    assert.equal(askStateMessage("sent"), "Asked ChatGPT to render the board again.");
    assert.equal(askStateMessage("idle"), null);
  });

  it("a stale view does not animate a last-known WORKING worker", () => {
    const task = { ...makeTask("vt_anim"), workers: [WORKER] };
    const live = renderToStaticMarkup(
      createElement(InlineView, { task, recentEvents: [], stale: false }),
    );
    assert.match(live, /vt-bob/); // control: live data animates
    const stale = renderToStaticMarkup(
      createElement(InlineView, { task, recentEvents: [], stale: true }),
    );
    assert.doesNotMatch(stale, /vt-bob/); // last-known data must not look active
    const limited = renderToStaticMarkup(
      createElement(InlineView, { task, recentEvents: [], stale: true }),
    );
    assert.doesNotMatch(limited, /vt-bob/);
  });
});
