import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { TaskSnapshot } from "@visual-team/contracts";
import { TASK_CAPABILITY_META_KEY } from "@visual-team/contracts/meta";
import { buildApp } from "../apps/mcp-server/src/server.ts";

// M2 consumer-workflow probe: synthetic, local-only server-side evidence for
// the sequences SKILL.md instructs the host to run. Host adherence is covered
// by evals/positive/* and evals/negative/* (coordinator-executed); this probe
// proves the server honors the workflow honestly. No hook execution, browser
// interaction, hosted writes, or capability output.
const server = buildApp().listen(0, "127.0.0.1");
await new Promise<void>((resolve, reject) => {
  server.once("listening", resolve);
  server.once("error", reject);
});
const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/mcp`;
let id = 0;
async function rpc(method: string, params: Record<string, unknown>, capability?: string) {
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
async function call(name: string, args: Record<string, unknown>, capability?: string) {
  const payload = await rpc("tools/call", { name, arguments: args }, capability);
  assert.equal(payload.error, undefined);
  assert.notEqual(payload.result?.isError, true);
  return payload.result;
}
async function start(title: string, args: Record<string, unknown> = {}) {
  const result = await call("start_visual_task", {
    title, summary: "Synthetic M2 workflow probe", mode: "solo",
    privacyMode: "standard", ...args,
  });
  return { taskId: result.structuredContent.taskId as string,
    task: result.structuredContent.task as TaskSnapshot,
    capability: result._meta[TASK_CAPABILITY_META_KEY] as string };
}
async function read(task: Awaited<ReturnType<typeof start>>): Promise<TaskSnapshot> {
  return (await call("get_visual_task", { taskId: task.taskId }, task.capability)).structuredContent.task;
}
const findings: Array<Record<string, unknown> & { pass: boolean }> = [];
try {
  // --- Case 1: solo small workflow, exactly one writer, truthful finish ---
  const solo = await start("Solo small change");
  const soloWorkers = solo.task.workers;
  await call("report_workflow_step", { taskId: solo.taskId, phase: "implementing" });
  const finished = await call("finish_visual_task", {
    taskId: solo.taskId, outcome: "completed",
    summary: "Changed the label; build check passed.", verification: "passed",
  });
  const soloFinal = await read(solo);
  findings.push({
    case: "solo-small-workflow-one-writer",
    pass: soloWorkers.length === 1 && soloWorkers[0].isWriter === true &&
      soloWorkers[0].role === "lead" && finished.structuredContent.applied === true &&
      soloFinal.state === "COMPLETED" && soloFinal.stateProvenance === "reported",
    roster: soloWorkers.map(({ id, role, isWriter }) => ({ id, role, isWriter })),
    finishApplied: finished.structuredContent.applied,
    finalState: soloFinal.state, provenance: soloFinal.stateProvenance,
  });

  // --- Case 2: team roster capped, exactly one writer ---
  const team = await start("Build plus review", {
    mode: "team", workerRoles: ["lead", "builder", "reviewer"],
  });
  const teamWorkers = team.task.workers;
  findings.push({
    case: "team-roster-one-writer",
    pass: teamWorkers.length === 3 &&
      teamWorkers.filter(w => w.isWriter).length === 1 &&
      teamWorkers.find(w => w.isWriter)?.role === "lead",
    roster: teamWorkers.map(({ id, role, isWriter }) => ({ id, role, isWriter })),
  });

  // --- Case 3: permission request stays native; nothing auto-approves ---
  const perm = await start("Permission-gated change");
  await call("report_workflow_step", { taskId: perm.taskId, phase: "implementing" });
  await call("record_codex_event", {
    taskId: perm.taskId, name: "PermissionRequest", eventId: "ask",
    payload: { tool_name: "Shell", detail: "rm scratch.txt" },
  });
  const waitingPerm = await read(perm);
  // A turn end resolves the pending need; the ask was never auto-answered.
  await call("record_codex_event", { taskId: perm.taskId, name: "Stop", eventId: "turn-end" });
  const resumedPerm = await read(perm);
  findings.push({
    case: "permission-native-flow-preserved",
    pass: waitingPerm.needsUser === true && waitingPerm.state === "WAITING_FOR_USER" &&
      waitingPerm.workers.some(w => w.state === "WAITING_FOR_APPROVAL") &&
      resumedPerm.needsUser === false && resumedPerm.state === "ACTIVE",
    whileAsked: { state: waitingPerm.state, needsUser: waitingPerm.needsUser },
    afterTurnEnd: { state: resumedPerm.state, needsUser: resumedPerm.needsUser },
  });

  // --- Case 4: interrupted work stays resumable on the same task ---
  const intr = await start("Interruptible change");
  await call("report_workflow_step", { taskId: intr.taskId, phase: "implementing" });
  await call("record_codex_event", { taskId: intr.taskId, name: "Interrupt", eventId: "user-stop" });
  const interrupted = await read(intr);
  await call("report_workflow_step", { taskId: intr.taskId, phase: "implementing" });
  await call("finish_visual_task", {
    taskId: intr.taskId, outcome: "completed",
    summary: "Resumed and finished.", verification: "not_run",
  });
  const intrFinal = await read(intr);
  findings.push({
    case: "interrupted-then-resumed-same-task",
    pass: interrupted.state === "ACTIVE" &&
      interrupted.workers.every(w => w.state === "IDLE") &&
      intrFinal.state === "COMPLETED",
    afterInterrupt: { state: interrupted.state,
      workers: interrupted.workers.map(w => w.state) },
    finalState: intrFinal.state, sameTask: intrFinal.id === intr.taskId,
  });

  // --- Case 5: unsupported inputs fabricate nothing ---
  const ghost = await start("Real task for contrast");
  const beforeGhost = await read(ghost);
  const badTaskEvent = await call("record_codex_event", {
    taskId: "vt_does_not_exist", name: "PreToolUse", eventId: "ghost-1",
  });
  const badTaskReport = await call("report_workflow_step", {
    taskId: "vt_does_not_exist", phase: "implementing",
  });
  // An event name outside the contract fails input validation outright.
  const badName = await rpc("tools/call", {
    name: "record_codex_event",
    arguments: { taskId: ghost.taskId, name: "AutoApprove", eventId: "ghost-2" },
  });
  const afterGhost = await read(ghost);
  const nameRejected = badName.error !== undefined || badName.result?.isError === true;
  findings.push({
    case: "unsupported-inputs-create-nothing",
    pass: badTaskEvent.structuredContent.applied === false &&
      badTaskReport.structuredContent.applied === false && nameRejected &&
      JSON.stringify(beforeGhost) === JSON.stringify(afterGhost),
    unknownTaskApplied: badTaskEvent.structuredContent.applied,
    unknownTaskReportApplied: badTaskReport.structuredContent.applied,
    invalidEventNameRejected: nameRejected,
    realTaskUnchanged: JSON.stringify(beforeGhost) === JSON.stringify(afterGhost),
  });

  // --- Case 6: reported wait/resume round trip ---
  const wait = await start("Question for the user");
  await call("report_workflow_step", { taskId: wait.taskId, phase: "implementing" });
  await call("report_workflow_step", { taskId: wait.taskId, phase: "waiting_for_user" });
  const waitingSnap = await read(wait);
  await call("report_workflow_step", { taskId: wait.taskId, phase: "implementing" });
  const resumedSnap = await read(wait);
  findings.push({
    case: "reported-wait-then-resume",
    pass: waitingSnap.state === "WAITING_FOR_USER" && waitingSnap.needsUser === true &&
      waitingSnap.needsUserProvenance === "reported" &&
      resumedSnap.state === "ACTIVE" && resumedSnap.needsUser === false,
    waiting: { state: waitingSnap.state, needsUser: waitingSnap.needsUser,
      provenance: waitingSnap.needsUserProvenance ?? null },
    resumed: { state: resumedSnap.state, needsUser: resumedSnap.needsUser },
  });

  // --- Case 7: no tool can approve, deny, or answer prompts ---
  // Pins the current six-tool surface; update when plan §9.7
  // (set_visual_preferences) or later tools land.
  const tools = await rpc("tools/list", {});
  const names = (tools.result?.tools ?? []).map((t: { name: string }) => t.name);
  const expected = ["start_visual_task", "report_workflow_step", "record_codex_event",
    "get_visual_task", "finish_visual_task", "render_visual_task"];
  findings.push({
    case: "tools-list-excludes-approval-path",
    pass: names.length === 6 && expected.every(n => names.includes(n)) &&
      !names.some((n: string) => /approv|deny|decid|permission/i.test(n)),
    tools: names,
  });

  for (const finding of findings) process.stdout.write(JSON.stringify(finding) + "\n");
  if (findings.some(finding => !finding.pass)) process.exitCode = 1;
} finally {
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
}
