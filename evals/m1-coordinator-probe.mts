import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { TaskSnapshot, VisualEvent } from "@visual-team/contracts";
import { TASK_CAPABILITY_META_KEY } from "@visual-team/contracts/meta";
import { applyEvent, createTaskRecord } from "@visual-team/state-machine";
import { mapCodexEvent } from "@visual-team/codex-event-mapper";
import { buildApp } from "../apps/mcp-server/src/server.ts";

// Synthetic, local-only coordinator reproductions. No hook execution,
// browser interaction, hosted writes, or capability output.
const server = buildApp().listen(0, "127.0.0.1");
await new Promise<void>((resolve, reject) => {
  server.once("listening", resolve);
  server.once("error", reject);
});
const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/mcp`;
let id = 0;
async function call(name: string, args: Record<string, unknown>, capability?: string) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
    body: JSON.stringify({
      jsonrpc: "2.0", id: ++id, method: "tools/call",
      params: { name, arguments: args,
        ...(capability ? { _meta: { [TASK_CAPABILITY_META_KEY]: capability } } : {}) },
    }),
  });
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.error, undefined);
  assert.notEqual(payload.result?.isError, true);
  return payload.result;
}
async function start(title: string) {
  const result = await call("start_visual_task", {
    title, summary: "Synthetic coordinator review", mode: "solo", privacyMode: "standard",
  });
  return { taskId: result.structuredContent.taskId as string,
    capability: result._meta[TASK_CAPABILITY_META_KEY] as string };
}
async function read(task: Awaited<ReturnType<typeof start>>): Promise<TaskSnapshot> {
  return (await call("get_visual_task", { taskId: task.taskId }, task.capability)).structuredContent.task;
}
const findings: Array<Record<string, unknown> & { pass: boolean }> = [];
try {
  const collision = await start("Worker target collision");
  const join = await call("record_codex_event", {
    taskId: collision.taskId, name: "SubagentStart",
    eventId: "join", payload: { agent_id: "lead", agent_type: "review" },
  });
  assert.equal(join.structuredContent.applied, true);
  const before = await read(collision);
  const permission = await call("record_codex_event", {
    taskId: collision.taskId, name: "PermissionRequest",
    eventId: "permission", payload: { agent_id: "lead" },
  });
  const after = await read(collision);
  const lead = after.workers.find(w => w.id === "lead" && !w.externalId);
  const specialist = after.workers.find(w => w.externalId === "lead");
  const safelyRejected = permission.structuredContent.applied === false &&
    JSON.stringify(before) === JSON.stringify(after);
  findings.push({
    case: "hook-id-collision-must-not-target-lead",
    pass: safelyRejected || (lead?.state === "ASSIGNED" && specialist?.state === "WAITING_FOR_APPROVAL"),
    applied: permission.structuredContent.applied,
    leadState: lead?.state, specialistState: specialist?.state,
  });

  const waiting = await start("Reported user question");
  for (const phase of ["implementing", "waiting_for_user"]) {
    const report = await call("report_workflow_step", { taskId: waiting.taskId, phase });
    assert.equal(report.structuredContent.applied, true);
  }
  const waitSnapshot = await read(waiting);
  findings.push({
    case: "reported-wait-must-expose-pending-need",
    pass: waitSnapshot.state === "WAITING_FOR_USER" && waitSnapshot.needsUser &&
      waitSnapshot.needsUserProvenance === "reported",
    taskState: waitSnapshot.state, needsUser: waitSnapshot.needsUser,
    needProvenance: waitSnapshot.needsUserProvenance ?? null,
  });

  // Derived events are not an exposed write-tool input. Exercise that
  // engine path directly, then use the real mapper for unrelated activity.
  const at = "2026-09-15T17:00:00.000Z";
  const rec = createTaskRecord(
    { title: "Pending specialist question", summary: "Synthetic", mode: "solo", privacyMode: "standard" },
    { taskId: "vt_review_pending", startedAt: at, eventId: "start" },
  );
  function hook(name: Parameters<typeof mapCodexEvent>[0]["name"], payload: Record<string, string>, eventId: string) {
    const mapped = mapCodexEvent({ taskId: rec.snapshot.id, name, payload, at, eventId });
    assert.ok(mapped.ok);
    for (const event of mapped.events) assert.equal(applyEvent(rec, event).ok, true);
  }
  hook("SubagentStart", { agent_id: "agent_a" }, "join");
  hook("PreToolUse", {}, "work");
  hook("PermissionRequest", { agent_id: "agent_a" }, "ask");
  const inferred: VisualEvent = {
    id: "infer", taskId: rec.snapshot.id, at, kind: "worker_transition",
    workerId: "agent_a", to: "IDLE", provenance: "derived", label: "Inferred idle",
  };
  applyEvent(rec, inferred); // safe rejection or retained pending need is acceptable
  assert.equal(rec.snapshot.needsUser, true);
  hook("PreToolUse", {}, "unrelated-lead-work");
  findings.push({
    case: "unrelated-lead-activity-must-not-resolve-specialist-ask",
    pass: rec.snapshot.needsUser && rec.snapshot.needsUserProvenance === "observed" &&
      rec.snapshot.state === "WAITING_FOR_USER",
    needsUser: rec.snapshot.needsUser, taskState: rec.snapshot.state,
    workers: rec.snapshot.workers.map(({ id, state }) => ({ id, state })),
  });
  for (const finding of findings) process.stdout.write(JSON.stringify(finding) + "\n");
  if (findings.some(finding => !finding.pass)) process.exitCode = 1;
} finally {
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
}
