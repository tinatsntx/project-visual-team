import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { buildApp } from "../apps/mcp-server/src/server.ts";
import { TASK_CAPABILITY_META_KEY } from "@visual-team/contracts/meta";

// Coordinator acceptance probe, synthetic metadata only. No hosted writes.
// Prints no capabilities; reads send credentials only in request _meta.
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
      params: {
        name, arguments: args,
        ...(capability ? { _meta: { [TASK_CAPABILITY_META_KEY]: capability } } : {}),
      },
    }),
  });
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.error, undefined);
  return payload.result;
}
async function start(title: string) {
  const result = await call("start_visual_task", {
    title, summary: "Synthetic coordinator regression check", mode: "solo", privacyMode: "standard",
  });
  return { taskId: result.structuredContent.taskId, capability: result._meta[TASK_CAPABILITY_META_KEY] };
}
const findings: Record<string, unknown>[] = [];
try {
  const failed = await start("Early failure probe");
  const finish = await call("finish_visual_task", { taskId: failed.taskId, outcome: "failed" });
  assert.equal(finish.structuredContent.applied, true);
  const before = await call("get_visual_task", { taskId: failed.taskId }, failed.capability);
  const late = await call("report_workflow_step", { taskId: failed.taskId, phase: "implementing" });
  const after = await call("get_visual_task", { taskId: failed.taskId }, failed.capability);
  const unchanged = JSON.stringify(before.structuredContent.task) === JSON.stringify(after.structuredContent.task);
  findings.push({
    case: "failed-during-planning-then-late-work-report",
    pass: late.structuredContent.applied === false && unchanged,
    before: { task: before.structuredContent.task.state, worker: before.structuredContent.task.workers[0].state },
    lateReportApplied: late.structuredContent.applied,
    after: { task: after.structuredContent.task.state, worker: after.structuredContent.task.workers[0].state },
    eventCountDelta: after.structuredContent.task.eventCount - before.structuredContent.task.eventCount,
  });

  const completed = await start("Finish metadata probe");
  await call("report_workflow_step", { taskId: completed.taskId, phase: "testing" });
  const finishResult = await call("finish_visual_task", {
    taskId: completed.taskId, outcome: "completed", summary: "S".repeat(500),
    verification: "failed", artifacts: [{ label: "Synthetic reference", uri: "https://example.test/artifact/1" }],
  });
  assert.equal(finishResult.structuredContent.applied, true);
  const read = await call("get_visual_task", { taskId: completed.taskId }, completed.capability);
  const event = read.structuredContent.recentEvents.find((e: { kind: string }) => e.kind === "task_finished");
  const detail = event?.detail ?? "";
  findings.push({
    case: "accepted-finish-preserves-verification-and-reference",
    pass: detail.includes("verification: failed") && detail.includes("https://example.test/artifact/1"),
    finishApplied: finishResult.structuredContent.applied,
    detailLength: detail.length,
    verificationRetained: detail.includes("verification: failed"),
    artifactRetained: detail.includes("https://example.test/artifact/1"),
  });
  for (const finding of findings) process.stdout.write(JSON.stringify(finding) + "\n");
  if (findings.some((finding) => !finding.pass)) process.exitCode = 1;
} finally {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}
