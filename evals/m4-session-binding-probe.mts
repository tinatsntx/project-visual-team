import assert from "node:assert/strict";
import type { AddressInfo, Server } from "node:net";
import type { TaskSnapshot } from "@visual-team/contracts";
import { TASK_CAPABILITY_META_KEY } from "@visual-team/contracts/meta";
import { buildApp } from "../apps/mcp-server/src/server.ts";

// M4 session-binding probe: synthetic, local-only evidence that real hook
// metadata correlates to exactly one visual task. Two "native sessions" are
// simulated with distinct session_ids (the values the pinned Codex runtime
// puts on hook payloads); a third task stands in for a ChatGPT-only board.
// Everything here is local fixture delivery — NOT automatic native delivery.
// Real hook payloads, trust review, and a real specialist are covered by the
// coordinator runbook in docs/m4-codex-integration-acceptance.md.

interface Server_ { server: Server; url: string }

async function startServer(): Promise<Server_> {
  const server = buildApp().listen(0, "127.0.0.1");
  await new Promise<void>((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  return { server, url: `http://127.0.0.1:${(server.address() as AddressInfo).port}/mcp` };
}
function stopServer(server: Server) {
  return new Promise<void>((resolve, reject) => server.close((e) => (e ? reject(e) : resolve())));
}

let id = 0;
async function rpc(url: string, method: string, params: Record<string, unknown>, capability?: string) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
    body: JSON.stringify({
      jsonrpc: "2.0", id: ++id, method, params: {
        ...params,
        ...(capability ? { _meta: { [TASK_CAPABILITY_META_KEY]: capability } } : {}),
      },
    }),
  });
  assert.equal(response.status, 200);
  return response.json();
}
async function call(url: string, name: string, args: Record<string, unknown>, capability?: string) {
  const payload = await rpc(url, "tools/call", { name, arguments: args }, capability);
  assert.equal(payload.error, undefined);
  assert.notEqual(payload.result?.isError, true);
  return payload.result;
}
async function start(url: string, title: string, args: Record<string, unknown> = {}) {
  const result = await call(url, "start_visual_task", {
    title, summary: "Synthetic M4 binding probe", mode: "solo",
    privacyMode: "standard", ...args,
  });
  return { taskId: result.structuredContent.taskId as string,
    task: result.structuredContent.task as TaskSnapshot,
    capability: result._meta[TASK_CAPABILITY_META_KEY] as string };
}
async function read(url: string, task: { taskId: string; capability: string }): Promise<TaskSnapshot> {
  return (await call(url, "get_visual_task", { taskId: task.taskId }, task.capability)).structuredContent.task;
}
const hook = (url: string, args: Record<string, unknown>) => call(url, "record_codex_event", args);
/** The observed start receipt the bundled hook sends after start_visual_task. */
const receipt = (url: string, sessionId: string, taskId: string, eventId?: string) =>
  hook(url, {
    taskId, name: "PostToolUse", ...(eventId ? { eventId } : {}),
    payload: { session_id: sessionId, tool_name: "mcp__codex_apps__start_visual_task" },
  });
const preTool = (url: string, payload: Record<string, string>, extra: Record<string, unknown> = {}) =>
  hook(url, { name: "PreToolUse", payload: { tool_name: "Bash", ...payload }, ...extra });

const findings: Array<Record<string, unknown> & { pass: boolean }> = [];
const { server, url } = await startServer();
try {
  // --- Case 1: receipt binding + untargeted delivery to exactly that task ---
  const a = await start(url, "Native session A");
  const receiptA = await receipt(url, "sess-A", a.taskId, "evt_receipt_a");
  const workA = await preTool(url, { session_id: "sess-A" }, { eventId: "evt_a_work" });
  const snapA = await read(url, a);
  findings.push({
    case: "receipt-binds-session-untargeted-events-route",
    pass: receiptA.structuredContent.reason === "self_referential_visual_team_tool" &&
      workA.structuredContent.applied === true && workA.structuredContent.taskId === a.taskId &&
      snapA.state === "ACTIVE",
    receiptApplied: receiptA.structuredContent.applied, receiptReason: receiptA.structuredContent.reason,
    routedTaskId: workA.structuredContent.taskId, state: snapA.state,
  });

  // --- Case 2: two native sessions + a ChatGPT-only task stay isolated ---
  const b = await start(url, "Native session B");
  const chat = await start(url, "ChatGPT-only task");
  await receipt(url, "sess-B", b.taskId, "evt_receipt_b");
  await preTool(url, { session_id: "sess-B", tool_name: "apply_patch" }, { eventId: "evt_b_work" });
  const snapB = await read(url, b);
  const snapChat = await read(url, chat);
  findings.push({
    case: "concurrent-sessions-and-chatgpt-task-isolated",
    pass: snapB.state === "ACTIVE" && snapChat.eventCount === 1 &&
      snapChat.workers.every((w) => w.state === "ASSIGNED"),
    sessionBState: snapB.state, chatTaskEventCount: snapChat.eventCount,
    chatWorkerStates: snapChat.workers.map((w) => w.state),
  });

  // --- Case 3: unbound events fail closed and mutate nothing ---
  const chatBefore = await read(url, chat);
  const noSession = await hook(url, { name: "PreToolUse", payload: { tool_name: "Bash" } });
  const unknownSession = await preTool(url, { session_id: "sess-unknown" });
  const chatAfter = await read(url, chat);
  findings.push({
    case: "unbound-events-fail-closed",
    pass: noSession.structuredContent.applied === false &&
      noSession.structuredContent.reason === "unbound_session" &&
      unknownSession.structuredContent.applied === false &&
      unknownSession.structuredContent.reason === "unbound_session" &&
      JSON.stringify(chatBefore) === JSON.stringify(chatAfter),
    noSessionReason: noSession.structuredContent.reason,
    unknownSessionReason: unknownSession.structuredContent.reason,
    chatUnchanged: JSON.stringify(chatBefore) === JSON.stringify(chatAfter),
  });

  // --- Case 4: explicit taskId conflicting with a live binding is rejected ---
  const mismatch = await preTool(url, { session_id: "sess-A", tool_name: "Bash" }, { taskId: b.taskId });
  const bAfterMismatch = await read(url, b);
  findings.push({
    case: "explicit-target-conflicting-live-binding-rejected",
    pass: mismatch.structuredContent.applied === false &&
      mismatch.structuredContent.reason === "session_bound_to_other_task" &&
      bAfterMismatch.eventCount === 2, // start + own work (receipts are dropped)
    reason: mismatch.structuredContent.reason, bEventCount: bAfterMismatch.eventCount,
  });

  // --- Case 5: duplicate delivery is a no-op ---
  const dupEvent = { name: "PostToolUse", eventId: "evt_dup_once",
    payload: { session_id: "sess-A", tool_name: "Bash" } };
  const dup1 = await hook(url, dupEvent);
  const dup2 = await hook(url, dupEvent);
  findings.push({
    case: "duplicate-delivery-idempotent",
    pass: dup1.structuredContent.applied === true && dup2.structuredContent.applied === false,
    first: dup1.structuredContent.applied, second: dup2.structuredContent.applied,
  });

  // --- Case 6: terminal binding fails closed, then a new receipt rebinds ---
  await call(url, "finish_visual_task", { taskId: a.taskId, outcome: "completed", summary: "done" });
  const onTerminal = await preTool(url, { session_id: "sess-A" });
  const a2 = await start(url, "Native session A follow-up");
  await receipt(url, "sess-A", a2.taskId, "evt_receipt_a2");
  const routedToA2 = await preTool(url, { session_id: "sess-A" }, { eventId: "evt_a2_work" });
  findings.push({
    case: "terminal-binding-fails-closed-then-rebinds",
    pass: onTerminal.structuredContent.applied === false &&
      routedToA2.structuredContent.taskId === a2.taskId,
    terminalApplied: onTerminal.structuredContent.applied,
    reboundTaskId: routedToA2.structuredContent.taskId,
  });

  // --- Case 7: expiry — a swept task releases its binding (short-TTL server) ---
  process.env.VISUAL_TEAM_TTL_MS = "250";
  const { server: ttlServer, url: ttlUrl } = await startServer();
  delete process.env.VISUAL_TEAM_TTL_MS;
  try {
    const short = await start(ttlUrl, "Short-lived task");
    await receipt(ttlUrl, "sess-short", short.taskId, "evt_receipt_short");
    await new Promise((resolve) => setTimeout(resolve, 400));
    const afterExpiry = await preTool(ttlUrl, { session_id: "sess-short" });
    findings.push({
      case: "binding-expires-with-task",
      pass: afterExpiry.structuredContent.applied === false &&
        afterExpiry.structuredContent.reason === "unbound_session",
      reason: afterExpiry.structuredContent.reason,
    });
  } finally {
    await stopServer(ttlServer);
  }

  // --- Case 8: resume — the pinned runtime keeps the root session_id, so a
  // bound session keeps routing across a resume with no new evidence; an
  // unrelated new session still fails closed ---
  const resumedRouted = await preTool(url, { session_id: "sess-A-resumed-same" });
  // Model the runtime contract directly: resume presents the SAME root
  // session_id — the existing binding continues to apply.
  const sameSession = await preTool(url, { session_id: "sess-A" });
  findings.push({
    case: "resumed-session-keeps-binding-new-sessions-fail-closed",
    pass: sameSession.structuredContent.taskId === a2.taskId &&
      resumedRouted.structuredContent.reason === "unbound_session",
    boundRoutedTaskId: sameSession.structuredContent.taskId,
    newSessionReason: resumedRouted.structuredContent.reason,
    note: "rust-v0.154.0 shares the root session_id across resume and subagents",
  });

  // --- Case 9: real specialist lifecycle via agent correlation ---
  const team = await start(url, "Delegated review task");
  const other = await start(url, "Task with its own pending ask");
  await receipt(url, "sess-team", team.taskId, "evt_receipt_team");
  await receipt(url, "sess-other", other.taskId, "evt_receipt_other");
  // Task "other": a specialist joins and asks for permission — stays pending.
  await hook(url, { name: "SubagentStart", eventId: "evt_other_join",
    payload: { session_id: "sess-other", agent_id: "agent-other", agent_type: "explorer" } });
  await hook(url, { name: "PermissionRequest", eventId: "evt_other_ask",
    payload: { session_id: "sess-other", agent_id: "agent-other", tool_name: "Bash" } });
  const otherPending = await read(url, other);
  // Task "team": reviewer start → child work → child permission → work
  // resumes after the native approval → child finish. On the pinned runtime
  // child events share the root session_id and are distinguished by
  // agent_id (rust-v0.154.0 core/src/session/session.rs).
  await hook(url, { name: "SubagentStart", eventId: "evt_rev_join",
    payload: { session_id: "sess-team", agent_id: "agent-rev", agent_type: "reviewer" } });
  await hook(url, { name: "PreToolUse", eventId: "evt_rev_work",
    payload: { session_id: "sess-team", agent_id: "agent-rev", tool_name: "Bash" } });
  await hook(url, { name: "PermissionRequest", eventId: "evt_rev_ask",
    payload: { session_id: "sess-team", agent_id: "agent-rev", tool_name: "Bash" } });
  const duringAsk = await read(url, team);
  // Native approval granted → work resumes (PreToolUse maps to WORKING,
  // which is the legal exit from WAITING_FOR_APPROVAL) → the subagent ends.
  await hook(url, { name: "PreToolUse", eventId: "evt_rev_resumed",
    payload: { session_id: "sess-team", agent_id: "agent-rev", tool_name: "Bash" } });
  await hook(url, { name: "SubagentStop", eventId: "evt_rev_stop",
    payload: { session_id: "sess-team", agent_id: "agent-rev", agent_type: "reviewer" } });
  const teamFinal = await read(url, team);
  const otherFinal = await read(url, other);
  const revWorker = (snap: TaskSnapshot) => snap.workers.find((w) => w.externalId === "agent-rev");
  const lead = (snap: TaskSnapshot) => snap.workers.find((w) => w.role === "lead");
  const otherAgent = otherFinal.workers.find((w) => w.externalId === "agent-other");
  findings.push({
    case: "specialist-lifecycle-correlated-lead-and-other-asks-unchanged",
    pass:
      duringAsk.needsUser === true && revWorker(duringAsk)?.state === "WAITING_FOR_APPROVAL" &&
      revWorker(teamFinal)?.state === "COMPLETED" && teamFinal.needsUser === false &&
      lead(teamFinal)?.state === "ASSIGNED" &&
      otherPending.needsUser === true && otherFinal.needsUser === true &&
      otherAgent?.state === "WAITING_FOR_APPROVAL",
    reviewerDuringAsk: revWorker(duringAsk)?.state, needsUserDuringAsk: duringAsk.needsUser,
    reviewerAfterStop: revWorker(teamFinal)?.state, needsUserAfterStop: teamFinal.needsUser,
    leadState: lead(teamFinal)?.state,
    otherNeedsUser: otherFinal.needsUser, otherAgentState: otherAgent?.state,
  });

  // --- Case 10: the recorder's own tool calls never write onto a board ---
  const quiet = await start(url, "Self-call hygiene task");
  await receipt(url, "sess-quiet", quiet.taskId, "evt_receipt_quiet");
  const before = await read(url, quiet);
  const selfCalls = [
    ["PreToolUse", "mcp__codex_apps__get_visual_task"],
    ["PostToolUse", "mcp__codex_apps__report_workflow_step"],
    ["PostToolUse", "mcp__codex_apps__finish_visual_task"],
    ["PermissionRequest", "mcp__codex_apps__render_visual_task"],
  ] as const;
  const selfResults = [];
  for (const [i, [name, tool]] of selfCalls.entries()) {
    selfResults.push(await hook(url, { name, eventId: `evt_self_${i}`,
      payload: { session_id: "sess-quiet", tool_name: tool } }));
  }
  const after = await read(url, quiet);
  findings.push({
    case: "self-referential-tool-calls-not-recorded",
    pass: selfResults.every((r) => r.structuredContent.applied === false &&
      r.structuredContent.reason === "self_referential_visual_team_tool") &&
      after.eventCount === before.eventCount,
    selfApplied: selfResults.map((r) => r.structuredContent.applied),
    eventCountBefore: before.eventCount, eventCountAfter: after.eventCount,
  });

  for (const finding of findings) process.stdout.write(JSON.stringify(finding) + "\n");
  if (findings.some((finding) => !finding.pass)) process.exitCode = 1;
} finally {
  await stopServer(server);
}
