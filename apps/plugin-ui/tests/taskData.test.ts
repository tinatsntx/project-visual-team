import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { TaskSnapshot, TaskState, VisualEvent } from "@visual-team/contracts";
import { TASK_CAPABILITY_META_KEY } from "@visual-team/contracts/meta";
import { toolResultFromGlobals, type ToolResultMessage } from "../src/bridge/hostBridge.ts";
import { TaskDataStore } from "../src/bridge/taskData.ts";

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
  it("combines the private metadata envelope with public output", () => {
    const task = makeTask("vt_g");
    const result = toolResultFromGlobals({
      toolOutput: { taskId: task.id, task },
      toolResponseMetadata: {
        mcp_tool_result: {
          content: [{ type: "text", text: "t" }],
          _meta: { [TASK_CAPABILITY_META_KEY]: "cap_g" },
        },
      },
    });
    assert.ok(result);
    assert.equal(result._meta?.[TASK_CAPABILITY_META_KEY], "cap_g");
    assert.equal((result.structuredContent as { taskId: string }).taskId, "vt_g");
  });

  it("keeps envelope structuredContent over the separate output global", () => {
    const task = makeTask("vt_g");
    const result = toolResultFromGlobals({
      toolOutput: { taskId: "vt_other" },
      toolResponseMetadata: { call_tool_result: { structuredContent: { task } } },
    });
    assert.equal((result?.structuredContent as { task: TaskSnapshot }).task.id, "vt_g");
  });

  it("returns public output alone and null when neither global exists", () => {
    assert.deepEqual(toolResultFromGlobals({ toolOutput: { taskId: "vt_x" } }), {
      structuredContent: { taskId: "vt_x" },
    });
    assert.equal(toolResultFromGlobals({}), null);
  });
});
