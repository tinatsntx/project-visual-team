import assert from "node:assert/strict";
import type { AddressInfo, Server } from "node:net";
import { describe, it } from "node:test";
import { TASK_CAPABILITY_META_KEY } from "@visual-team/contracts/meta";
import { buildApp } from "../src/server.ts";

/**
 * M4 session/agent binding through the real transport. The receipt pattern:
 * a PostToolUse on `mcp__*__start_visual_task` carries the observed taskId +
 * session_id, which binds the session; later untargeted events on that
 * session (or on a known agent) resolve to the bound task. Everything else
 * fails closed.
 */

interface ToolResult {
  structuredContent?: {
    taskId?: string;
    applied?: boolean;
    reason?: string;
    task?: {
      id: string;
      state?: string;
      workers: Array<{ id: string; role: string; externalId?: string; state?: string }>;
      eventCount: number;
      needsUser?: boolean;
    };
    recentEvents?: Array<{ kind?: string; workerId?: string }>;
  };
  _meta?: Record<string, unknown>;
  isError?: boolean;
}

let requestId = 0;

async function callMcp(baseUrl: string, method: string, params: Record<string, unknown>): Promise<ToolResult> {
  const response = await fetch(`${baseUrl}/mcp`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
    body: JSON.stringify({ jsonrpc: "2.0", id: ++requestId, method, params }),
  });
  assert.equal(response.status, 200);
  const payload = (await response.json()) as { result?: ToolResult; error?: { message: string } };
  assert.equal(payload.error, undefined);
  return payload.result as ToolResult;
}

async function startServer(): Promise<{ server: Server; baseUrl: string }> {
  const server = buildApp().listen(0, "127.0.0.1");
  await new Promise<void>((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  const address = server.address() as AddressInfo;
  return { server, baseUrl: `http://127.0.0.1:${address.port}` };
}

function stopServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
}

async function startTask(baseUrl: string, title: string) {
  const result = await callMcp(baseUrl, "tools/call", {
    name: "start_visual_task",
    arguments: { title, summary: "s", mode: "solo", privacyMode: "standard" },
  });
  const taskId = result.structuredContent?.taskId;
  const capability = result._meta?.[TASK_CAPABILITY_META_KEY];
  assert.equal(typeof taskId, "string");
  assert.equal(typeof capability, "string");
  return { taskId: taskId as string, capability: capability as string };
}

function hookEvent(baseUrl: string, args: Record<string, unknown>) {
  return callMcp(baseUrl, "tools/call", { name: "record_codex_event", arguments: args });
}

/** The observed start receipt: PostToolUse on our start tool for a session. */
function startReceipt(baseUrl: string, sessionId: string, taskId: string) {
  return hookEvent(baseUrl, {
    taskId,
    name: "PostToolUse",
    payload: { session_id: sessionId, tool_name: "mcp__codex_apps__start_visual_task" },
  });
}

function eventCount(task: ToolResult["structuredContent"]) {
  return task?.task?.eventCount ?? -1;
}

describe("record_codex_event session/agent binding (M4)", () => {
  it("rejects untargeted events with no binding and never guesses a task", async () => {
    const { server, baseUrl } = await startServer();
    try {
      const a = await startTask(baseUrl, "task A");
      const chat = await startTask(baseUrl, "chatgpt-only task");

      // No taskId, no session metadata at all.
      const bare = await hookEvent(baseUrl, { name: "PreToolUse", payload: { tool_name: "Bash" } });
      assert.equal(bare.structuredContent?.applied, false);
      assert.equal(bare.structuredContent?.reason, "unbound_session");

      // A session id the server has never correlated is rejected too.
      const unbound = await hookEvent(baseUrl, {
        name: "PreToolUse",
        payload: { session_id: "never-seen", tool_name: "Bash" },
      });
      assert.equal(unbound.structuredContent?.applied, false);
      assert.equal(unbound.structuredContent?.reason, "unbound_session");

      // Neither existing task was touched.
      for (const t of [a, chat]) {
        const read = await callMcp(baseUrl, "tools/call", {
          name: "get_visual_task",
          arguments: { taskId: t.taskId },
          _meta: { [TASK_CAPABILITY_META_KEY]: t.capability },
        });
        assert.equal(eventCount(read.structuredContent), 1, "rejected events must not mutate any task");
      }
    } finally {
      await stopServer(server);
    }
  });

  it("binds a session on the observed start receipt and routes only that session's events", async () => {
    const { server, baseUrl } = await startServer();
    try {
      const a = await startTask(baseUrl, "native task A");
      const b = await startTask(baseUrl, "native task B");
      const chat = await startTask(baseUrl, "chatgpt-only task");

      // Receipts observed by the hook: each session binds to its own task.
      const receiptA = await startReceipt(baseUrl, "sess-A", a.taskId);
      assert.equal(receiptA.structuredContent?.reason, "self_referential_visual_team_tool");
      const receiptB = await startReceipt(baseUrl, "sess-B", b.taskId);
      assert.equal(receiptB.structuredContent?.reason, "self_referential_visual_team_tool");

      // Untargeted events resolve per-session.
      const workA = await hookEvent(baseUrl, {
        name: "PreToolUse",
        payload: { session_id: "sess-A", tool_name: "Bash" },
      });
      assert.equal(workA.structuredContent?.applied, true);
      assert.equal(workA.structuredContent?.taskId, a.taskId);
      const workB = await hookEvent(baseUrl, {
        name: "PreToolUse",
        payload: { session_id: "sess-B", tool_name: "apply_patch" },
      });
      assert.equal(workB.structuredContent?.taskId, b.taskId);

      // Cross-session events cannot contaminate another board; the
      // ChatGPT-only task is untouched by native traffic entirely.
      const readChat = await callMcp(baseUrl, "tools/call", {
        name: "get_visual_task",
        arguments: { taskId: chat.taskId },
        _meta: { [TASK_CAPABILITY_META_KEY]: chat.capability },
      });
      assert.equal(eventCount(readChat.structuredContent), 1);
    } finally {
      await stopServer(server);
    }
  });

  it("rejects an explicit taskId that conflicts with the session's live binding", async () => {
    const { server, baseUrl } = await startServer();
    try {
      const a = await startTask(baseUrl, "task A");
      const b = await startTask(baseUrl, "task B");
      await startReceipt(baseUrl, "sess-A", a.taskId);

      const conflict = await hookEvent(baseUrl, {
        taskId: b.taskId,
        name: "PreToolUse",
        payload: { session_id: "sess-A", tool_name: "Bash" },
      });
      assert.equal(conflict.structuredContent?.applied, false);
      assert.equal(conflict.structuredContent?.reason, "session_bound_to_other_task");

      // A foreign session may still target task B explicitly — no conflict.
      const other = await hookEvent(baseUrl, {
        taskId: b.taskId,
        name: "PreToolUse",
        payload: { session_id: "sess-B", tool_name: "Bash" },
      });
      assert.equal(other.structuredContent?.applied, true);
    } finally {
      await stopServer(server);
    }
  });

  it("routes subagent tool events to the specialist via the shared root session", async () => {
    const { server, baseUrl } = await startServer();
    try {
      const a = await startTask(baseUrl, "task A");
      await startReceipt(baseUrl, "sess-parent", a.taskId);

      // SubagentStart introduces agent_id on the root session.
      const joined = await hookEvent(baseUrl, {
        name: "SubagentStart",
        eventId: "evt_join_reviewer",
        payload: { session_id: "sess-parent", agent_id: "agent-rev-1", agent_type: "reviewer" },
      });
      assert.equal(joined.structuredContent?.applied, true);

      // On the pinned runtime the child's tool events share the root
      // session_id; agent_id distinguishes them and targets the specialist.
      const childWork = await hookEvent(baseUrl, {
        name: "PreToolUse",
        payload: { session_id: "sess-parent", agent_id: "agent-rev-1", tool_name: "Bash" },
      });
      assert.equal(childWork.structuredContent?.applied, true);
      assert.equal(childWork.structuredContent?.taskId, a.taskId);

      const read = await callMcp(baseUrl, "tools/call", {
        name: "get_visual_task",
        arguments: { taskId: a.taskId },
        _meta: { [TASK_CAPABILITY_META_KEY]: a.capability },
      });
      const reviewer = read.structuredContent?.task?.workers.find((w) => w.externalId === "agent-rev-1");
      assert.ok(reviewer, "the real specialist must join the roster");
      assert.equal(reviewer?.state, "WORKING");
      // Child-targeted events must not move the lead — its state is unchanged.
      const lead = read.structuredContent?.task?.workers.find((w) => w.role === "lead");
      assert.equal(lead?.state, "ASSIGNED");
    } finally {
      await stopServer(server);
    }
  });

  it("rejects conflicting session/agent envelopes without mutating any binding", async () => {
    const { server, baseUrl } = await startServer();
    try {
      const a = await startTask(baseUrl, "task A");
      const b = await startTask(baseUrl, "task B");
      await startReceipt(baseUrl, "sess-A", a.taskId);
      await startReceipt(baseUrl, "sess-B", b.taskId);
      // Reviewer-b joins task B through its own session.
      const joinB = await hookEvent(baseUrl, {
        name: "SubagentStart", eventId: "evt_join_b",
        payload: { session_id: "sess-B", agent_id: "reviewer-b", agent_type: "reviewer" },
      });
      assert.equal(joinB.structuredContent?.applied, true);

      // An event on session A claiming B's agent is ambiguous — rejected,
      // and it must not steal the binding for B's real child events.
      const conflict = await hookEvent(baseUrl, {
        name: "SubagentStart", eventId: "evt_conflict_steal",
        payload: { session_id: "sess-A", agent_id: "reviewer-b", agent_type: "reviewer" },
      });
      assert.equal(conflict.structuredContent?.applied, false);
      assert.equal(conflict.structuredContent?.reason, "ambiguous_correlation");

      // B's real child events still route to B; A gained nothing.
      const childB = await hookEvent(baseUrl, {
        name: "PreToolUse",
        payload: { session_id: "sess-B", agent_id: "reviewer-b", tool_name: "Bash" },
      });
      assert.equal(childB.structuredContent?.taskId, b.taskId);
      const readA = await callMcp(baseUrl, "tools/call", {
        name: "get_visual_task", arguments: { taskId: a.taskId },
        _meta: { [TASK_CAPABILITY_META_KEY]: a.capability },
      });
      assert.equal(readA.structuredContent?.task?.workers.some((w) => w.externalId === "reviewer-b"), false);
    } finally {
      await stopServer(server);
    }
  });

  it("rebinds a session when its bound task is already terminal", async () => {
    const { server, baseUrl } = await startServer();
    try {
      const a = await startTask(baseUrl, "task A");
      await startReceipt(baseUrl, "sess-A", a.taskId);
      // Drive A to ACTIVE first — PLANNING cannot reach a terminal state.
      await hookEvent(baseUrl, {
        name: "PreToolUse",
        payload: { session_id: "sess-A", tool_name: "Bash" },
      });
      await callMcp(baseUrl, "tools/call", {
        name: "finish_visual_task",
        arguments: { taskId: a.taskId, outcome: "completed", summary: "done" },
      });

      // Untargeted events on the still-bound session resolve to the terminal
      // task and fail closed — a binding to a finished task records nothing.
      const onTerminal = await hookEvent(baseUrl, {
        name: "PreToolUse",
        payload: { session_id: "sess-A", tool_name: "Bash" },
      });
      assert.equal(onTerminal.structuredContent?.applied, false);

      // The session continues with a new task; the receipt rebinds it.
      const c = await startTask(baseUrl, "task C");
      const rebind = await startReceipt(baseUrl, "sess-A", c.taskId);
      assert.equal(rebind.structuredContent?.taskId, c.taskId);
      const routed = await hookEvent(baseUrl, {
        name: "PreToolUse",
        payload: { session_id: "sess-A", tool_name: "Bash" },
      });
      assert.equal(routed.structuredContent?.taskId, c.taskId);

      // Late events aimed at the finished task still fail closed.
      const late = await hookEvent(baseUrl, {
        taskId: a.taskId,
        name: "PreToolUse",
        payload: { session_id: "sess-A", tool_name: "Bash" },
      });
      assert.equal(late.structuredContent?.applied, false);
    } finally {
      await stopServer(server);
    }
  });

  it("applies a delivered event once per eventId (duplicate delivery is a no-op)", async () => {
    const { server, baseUrl } = await startServer();
    try {
      const a = await startTask(baseUrl, "task A");
      await startReceipt(baseUrl, "sess-A", a.taskId);
      const event = {
        name: "PreToolUse",
        eventId: "evt_dup_1",
        payload: { session_id: "sess-A", tool_name: "Bash" },
      };
      const first = await hookEvent(baseUrl, event);
      const second = await hookEvent(baseUrl, event);
      assert.equal(first.structuredContent?.applied, true);
      assert.equal(second.structuredContent?.applied, false);
    } finally {
      await stopServer(server);
    }
  });
});
