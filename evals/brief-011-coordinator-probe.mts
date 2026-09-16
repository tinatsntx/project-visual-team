import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { TaskSnapshot, VisualEvent } from "@visual-team/contracts";
import { TASK_CAPABILITY_META_KEY } from "@visual-team/contracts/meta";
import { applyEvent, createTaskRecord, MAX_EVENTS_PER_TASK } from "@visual-team/state-machine";
import { buildApp } from "../apps/mcp-server/src/server.ts";
import { mapTaskFinish } from "../apps/mcp-server/src/reported-steps.ts";

// Local, synthetic coordinator acceptance probe for brief 011. It does not
// contact Render, execute hooks, or print private capabilities. The receipt
// field is deliberately discovered from an accepted public finish instead of
// assuming SWE-2's contract name.
const server = buildApp().listen(0, "127.0.0.1");
await new Promise<void>((resolve, reject) => {
  server.once("listening", resolve);
  server.once("error", reject);
});
const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/mcp`;
let requestId = 0;

type JsonRecord = Record<string, unknown>;
type Finding = { case: string; pass: boolean; [key: string]: unknown };
const findings: Finding[] = [];

function asRecord(value: unknown): JsonRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

async function call(name: string, args: JsonRecord, capability?: string): Promise<JsonRecord> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: ++requestId,
      method: "tools/call",
      params: {
        name,
        arguments: args,
        ...(capability ? { _meta: { [TASK_CAPABILITY_META_KEY]: capability } } : {}),
      },
    }),
  });
  assert.equal(response.status, 200);
  const payload = asRecord(await response.json());
  assert.ok(payload && payload.error === undefined);
  const result = asRecord(payload.result);
  assert.ok(result);
  return result;
}

async function start(title: string): Promise<{ taskId: string; capability: string }> {
  const result = await call("start_visual_task", {
    title,
    summary: "Synthetic brief-011 coordinator acceptance check",
    mode: "solo",
    privacyMode: "standard",
  });
  const content = asRecord(result.structuredContent);
  const meta = asRecord(result._meta);
  const taskId = content?.taskId;
  const capability = meta?.[TASK_CAPABILITY_META_KEY];
  assert.equal(typeof taskId, "string");
  assert.equal(typeof capability, "string");
  return { taskId: taskId as string, capability: capability as string };
}

async function read(task: { taskId: string; capability: string }): Promise<{ task: TaskSnapshot; events: VisualEvent[] }> {
  const result = await call("get_visual_task", { taskId: task.taskId, eventLimit: 20 }, task.capability);
  const content = asRecord(result.structuredContent);
  assert.ok(content);
  return {
    task: content.task as TaskSnapshot,
    events: content.recentEvents as VisualEvent[],
  };
}

const summaryWithFalseClaim = "Summary says verification: passed, but that is only free text.";
const artifactWithFalseClaim = "Reference labelled verification: passed";

/**
 * Find the one structured receipt field from its value, not its contract
 * spelling. A legacy `detail` string cannot satisfy this object shape.
 */
function findReceiptField(container: JsonRecord, where: string): { field: string; value: JsonRecord } {
  const matches = Object.entries(container).filter(([field, value]) => {
    const candidate = asRecord(value);
    const artifacts = candidate?.artifacts;
    return (
      field !== "workers" &&
      candidate?.summary === summaryWithFalseClaim &&
      candidate.verification === "not_run" &&
      Array.isArray(artifacts) &&
      artifacts.some((artifact) => asRecord(artifact)?.label === artifactWithFalseClaim)
    );
  }) as Array<[string, JsonRecord]>;
  assert.equal(matches.length, 1, `accepted finish must put one structured receipt on its ${where}`);
  return { field: matches[0][0], value: matches[0][1] };
}

function receiptBearingEvent(
  taskId: string,
  id: string,
  kind: VisualEvent["kind"],
  provenance: VisualEvent["provenance"],
  receiptField: string,
  receipt: JsonRecord,
): VisualEvent {
  return {
    id,
    taskId,
    at: "2026-09-16T12:00:00.000Z",
    kind,
    provenance,
    label: "Synthetic receipt placement probe.",
    ...(kind === "task_finished" ? { to: "COMPLETED" } : {}),
    [receiptField]: structuredClone(receipt),
  } as VisualEvent;
}

function assertAtomicRejection(record: ReturnType<typeof createTaskRecord>, event: VisualEvent): boolean {
  const before = structuredClone(record.snapshot);
  const beforeEvents = record.events.length;
  const result = applyEvent(record, event);
  return !result.ok && JSON.stringify(record.snapshot) === JSON.stringify(before) && record.events.length === beforeEvents;
}

try {
  const completed = await start("Brief 011 receipt probe");
  const work = await call("report_workflow_step", { taskId: completed.taskId, phase: "implementing" });
  assert.equal(asRecord(work.structuredContent)?.applied, true);

  const finish = await call("finish_visual_task", {
    taskId: completed.taskId,
    outcome: "completed",
    eventId: "brief-011-finish",
    summary: summaryWithFalseClaim,
    verification: "not_run",
    artifacts: [{ label: artifactWithFalseClaim, uri: "https://example.test/reference" }],
  });
  assert.equal(asRecord(finish.structuredContent)?.applied, true);
  const first = await read(completed);
  const receipt = findReceiptField(first.task as unknown as JsonRecord, "snapshot");
  const finishEvent = first.events.find((event) => event.kind === "task_finished");
  assert.ok(finishEvent);
  // The event and snapshot may intentionally use distinct property names;
  // wrong-placement checks must use the actual VisualEvent contract field.
  const eventReceipt = findReceiptField(finishEvent as unknown as JsonRecord, "finish event");
  findings.push({
    case: "http-finish-creates-structured-reported-receipt-without-free-text-verification",
    pass:
      first.task.state === "COMPLETED" &&
      receipt.value.verification === "not_run" &&
      receipt.value.summary === summaryWithFalseClaim &&
      finishEvent?.provenance === "reported",
    state: first.task.state,
    receiptVerification: receipt.value.verification,
    finishProvenance: finishEvent?.provenance ?? null,
  });

  // Same id is an idempotent replay even when its caller payload differs;
  // a new terminal finish must reject. Neither may replace the first receipt.
  const duplicate = await call("finish_visual_task", {
    taskId: completed.taskId,
    outcome: "completed",
    eventId: "brief-011-finish",
    summary: "A conflicting duplicate must not replace the first receipt.",
    verification: "passed",
  });
  const postTerminal = await call("finish_visual_task", {
    taskId: completed.taskId,
    outcome: "failed",
    eventId: "brief-011-late-finish",
    summary: "A late receipt must not replace the first receipt.",
    verification: "failed",
  });
  const after = await read(completed);
  findings.push({
    case: "replayed-and-post-terminal-finishes-leave-receipt-frozen",
    pass:
      asRecord(duplicate.structuredContent)?.applied === false &&
      asRecord(postTerminal.structuredContent)?.applied === false &&
      JSON.stringify(after.task) === JSON.stringify(first.task) &&
      JSON.stringify(after.events) === JSON.stringify(first.events),
    duplicateApplied: asRecord(duplicate.structuredContent)?.applied,
    lateApplied: asRecord(postTerminal.structuredContent)?.applied,
    eventCount: after.task.eventCount,
  });

  // Public MCP inputs cannot construct arbitrary VisualEvents. Exercise the
  // reducer boundary using the actual receipt field discovered above: wrong
  // event kinds/provenance must reject before any state or journal mutation.
  const at = "2026-09-16T12:00:00.000Z";
  function activeBoundaryRecord(suffix: string) {
    const record = createTaskRecord(
      { title: "Receipt boundary", summary: "Synthetic", mode: "solo", privacyMode: "standard" },
      { taskId: `vt_brief_011_${suffix}`, startedAt: at, eventId: "start" },
    );
    // Make completion legal before testing an observed finish. Otherwise a
    // PLANNING -> COMPLETED transition would reject for the wrong reason.
    const activated = applyEvent(record, {
      id: "activate", taskId: record.snapshot.id, at, kind: "worker_transition",
      provenance: "reported", to: "WORKING", label: "Reported: implementing.",
    });
    assert.equal(activated.ok, true);
    return record;
  }
  const wrongKindRecord = activeBoundaryRecord("wrong_kind");
  const wrongKind = assertAtomicRejection(
    wrongKindRecord,
    receiptBearingEvent(wrongKindRecord.snapshot.id, "wrong-kind", "activity", "observed", eventReceipt.field, eventReceipt.value),
  );
  const observedFinishRecord = activeBoundaryRecord("observed_finish");
  const observedFinish = assertAtomicRejection(
    observedFinishRecord,
    receiptBearingEvent(observedFinishRecord.snapshot.id, "observed-finish", "task_finished", "observed", eventReceipt.field, eventReceipt.value),
  );
  const derivedFinishRecord = activeBoundaryRecord("derived_finish");
  const derivedFinish = assertAtomicRejection(
    derivedFinishRecord,
    receiptBearingEvent(derivedFinishRecord.snapshot.id, "derived-finish", "task_finished", "derived", eventReceipt.field, eventReceipt.value),
  );
  findings.push({
    case: "receipt-on-wrong-kind-or-provenance-rejects-atomically",
    pass: wrongKind && observedFinish && derivedFinish,
    wrongKind,
    observedFinish,
    derivedFinish,
  });

  // Keep the reducer's direct-event limit exactly aligned with the mapper's
  // legacy detail representation: 500 summary chars + 119 artifact chars is
  // 640 with "result: " and "; artifacts: "; 120 is 641 and must reject.
  const exactReceipt = {
    summary: "s".repeat(500),
    artifacts: [{ label: "l".repeat(119) }],
  };
  const overflowReceipt = {
    summary: "s".repeat(500),
    artifacts: [{ label: "l".repeat(120) }],
  };
  const mapperExact = mapTaskFinish({
    taskId: "vt_brief_011_mapper_exact", outcome: "completed", at, eventId: "mapper-exact", ...exactReceipt,
  });
  const mapperOverflow = mapTaskFinish({
    taskId: "vt_brief_011_mapper_overflow", outcome: "completed", at, eventId: "mapper-overflow", ...overflowReceipt,
  });
  const directExactRecord = activeBoundaryRecord("exact");
  const directExact = applyEvent(
    directExactRecord,
    receiptBearingEvent(
      directExactRecord.snapshot.id,
      "exact", "task_finished", "reported", eventReceipt.field, exactReceipt,
    ),
  );
  const overflowRecord = activeBoundaryRecord("overflow");
  const overflowRejected = assertAtomicRejection(
    overflowRecord,
    receiptBearingEvent(
      overflowRecord.snapshot.id,
      "overflow", "task_finished", "reported", eventReceipt.field, overflowReceipt,
    ),
  );
  const unknownKeyRecord = activeBoundaryRecord("unknown_key");
  const unknownKeyRejected = assertAtomicRejection(
    unknownKeyRecord,
    receiptBearingEvent(
      unknownKeyRecord.snapshot.id,
      "unknown-key", "task_finished", "reported", eventReceipt.field,
      { artifacts: [{ label: "Reference", unexpected: "not-allowlisted" }] },
    ),
  );
  findings.push({
    case: "direct-receipts-respect-combined-bound-and-allowlist-atomically",
    pass:
      mapperExact.ok &&
      mapperExact.event.detail?.length === 640 &&
      !mapperOverflow.ok &&
      directExact.ok &&
      directExactRecord.snapshot.state === "COMPLETED" &&
      overflowRejected &&
      unknownKeyRejected,
    mapperExactDetailLength: mapperExact.ok ? mapperExact.event.detail?.length ?? null : null,
    mapperOverflowRejected: !mapperOverflow.ok,
    directExactAccepted: directExact.ok,
    overflowRejected,
    unknownKeyRejected,
  });

  const aliasRecord = activeBoundaryRecord("alias");
  const aliasEvent = receiptBearingEvent(
    aliasRecord.snapshot.id,
    "alias-finish", "task_finished", "reported", eventReceipt.field,
    { artifacts: [{ label: "before" }] },
  );
  assert.equal(applyEvent(aliasRecord, aliasEvent).ok, true);
  const sourceReceipt = asRecord((aliasEvent as unknown as JsonRecord)[eventReceipt.field]);
  const sourceArtifacts = sourceReceipt?.artifacts as JsonRecord[] | undefined;
  assert.ok(sourceArtifacts);
  sourceArtifacts[0].label = "after";
  const snapshotReceipt = asRecord((aliasRecord.snapshot as unknown as JsonRecord)[receipt.field]);
  const loggedReceipt = asRecord((aliasRecord.events.at(-1) as unknown as JsonRecord)[eventReceipt.field]);
  findings.push({
    case: "accepted-receipt-is-detached-from-caller-and-journal",
    pass:
      (snapshotReceipt?.artifacts as JsonRecord[] | undefined)?.[0]?.label === "before" &&
      (loggedReceipt?.artifacts as JsonRecord[] | undefined)?.[0]?.label === "before",
    snapshotLabel: (snapshotReceipt?.artifacts as JsonRecord[] | undefined)?.[0]?.label ?? null,
    journalLabel: (loggedReceipt?.artifacts as JsonRecord[] | undefined)?.[0]?.label ?? null,
  });

  // `summary` was already an optional max-only public input. An explicitly
  // empty legacy summary must still complete rather than becoming a new
  // receipt-validation rejection.
  const emptySummary = await start("Brief 011 empty summary compatibility");
  const emptyWork = await call("report_workflow_step", {
    taskId: emptySummary.taskId,
    phase: "implementing",
  });
  assert.equal(asRecord(emptyWork.structuredContent)?.applied, true);
  const emptyFinish = await call("finish_visual_task", {
    taskId: emptySummary.taskId,
    outcome: "completed",
    summary: "",
  });
  const emptyAfter = await read(emptySummary);
  findings.push({
    case: "http-empty-summary-retains-legacy-finish-compatibility",
    pass:
      asRecord(emptyFinish.structuredContent)?.applied === true &&
      emptyAfter.task.state === "COMPLETED",
    finishApplied: asRecord(emptyFinish.structuredContent)?.applied,
    state: emptyAfter.task.state,
  });

  // A recorded phase is independent of lifecycle/activity and must remain
  // available after its source event leaves the bounded retained log.
  const phaseTask = await start("Brief 011 recorded phase retention");
  const phaseBase = Date.now();
  const implementingAt = new Date(phaseBase + 1000).toISOString();
  const testingAt = new Date(phaseBase + 2000).toISOString();
  const nativeAt = new Date(phaseBase + 3000).toISOString();
  for (const [phase, phaseAt] of [["implementing", implementingAt], ["testing", testingAt]] as const) {
    const response = await call("report_workflow_step", {
      taskId: phaseTask.taskId, phase, at: phaseAt, eventId: `phase-${phase}`,
    });
    assert.equal(asRecord(response.structuredContent)?.applied, true);
  }
  const native = await call("record_codex_event", {
    taskId: phaseTask.taskId, eventId: "phase-native", name: "PostToolUse", at: nativeAt,
    payload: { tool_name: "shell_command" },
  });
  assert.equal(asRecord(native.structuredContent)?.applied, true);
  const phaseRead = await read(phaseTask);
  const phaseEntries = Object.entries(phaseRead.task).filter(([, value]) => {
    const candidate = asRecord(value);
    return candidate?.name === "testing" && candidate.provenance === "reported" && candidate.at === testingAt;
  });
  assert.equal(phaseEntries.length, 1, "one retained structured reported phase must exist");
  const [snapshotPhaseField, phaseValue] = phaseEntries[0];
  const testingEvent = phaseRead.events.find((event) => event.id === "phase-testing");
  assert.ok(testingEvent);
  const eventPhaseFields = Object.entries(testingEvent).filter(([, value]) => value === "testing");
  assert.equal(eventPhaseFields.length, 1);
  const eventPhaseField = eventPhaseFields[0][0];
  findings.push({
    case: "reported-phase-survives-later-native-activity-over-http",
    pass:
      phaseRead.task.state === "ACTIVE" &&
      phaseRead.events.at(-1)?.provenance === "observed" &&
      phaseRead.events.at(-1)?.at === nativeAt &&
      phaseRead.task.lastActivityAt === nativeAt,
    recordedPhase: phaseValue,
    latestActivitySource: phaseRead.events.at(-1)?.provenance,
  });

  const initialPhaseEvent = phaseRead.events[0];
  const replayedPhase = createTaskRecord(
    {
      title: phaseRead.task.title, summary: phaseRead.task.summary,
      mode: phaseRead.task.mode, privacyMode: phaseRead.task.privacyMode,
    },
    { taskId: phaseTask.taskId, startedAt: phaseRead.task.createdAt, eventId: initialPhaseEvent.id },
  );
  for (const event of phaseRead.events) assert.equal(applyEvent(replayedPhase, structuredClone(event)).ok, true);
  const replayEqual = JSON.stringify(replayedPhase.snapshot) === JSON.stringify(phaseRead.task);
  for (let i = 0; i <= MAX_EVENTS_PER_TASK; i++) {
    assert.equal(applyEvent(replayedPhase, {
      id: `phase-tail-${i}`, taskId: phaseTask.taskId, at: nativeAt,
      kind: "activity", provenance: "observed", label: "Synthetic generic native activity.",
    }).ok, true);
  }
  const retainedPhase = (replayedPhase.snapshot as unknown as JsonRecord)[snapshotPhaseField];
  findings.push({
    case: "reported-phase-replays-deterministically-and-survives-log-trimming",
    pass:
      replayEqual && replayedPhase.events.length === MAX_EVENTS_PER_TASK &&
      !replayedPhase.events.some((event) => event.id === "phase-testing") &&
      JSON.stringify(retainedPhase) === JSON.stringify(phaseValue),
    replayEqual,
    phaseEventRetained: replayedPhase.events.some((event) => event.id === "phase-testing"),
    retainedPhase,
  });

  // This is a direct engine boundary check, not a public MCP injection claim.
  // Only the matching accepted workflow event may carry a phase declaration.
  const phaseAdmissionCases: Array<{ name: string; event: JsonRecord }> = [
    { name: "observed", event: { kind: "worker_transition", to: "WORKING", provenance: "observed", [eventPhaseField]: "testing" } },
    { name: "derived", event: { kind: "activity", provenance: "derived", [eventPhaseField]: "testing" } },
    { name: "unrelated-activity", event: { kind: "activity", provenance: "reported", [eventPhaseField]: "completed" } },
    { name: "working-completed-mismatch", event: { kind: "worker_transition", to: "WORKING", provenance: "reported", [eventPhaseField]: "completed" } },
    { name: "terminal-outcome-mismatch", event: { kind: "task_finished", to: "COMPLETED", provenance: "reported", [eventPhaseField]: "failed" } },
    { name: "invalid-phase-value", event: { kind: "worker_transition", to: "WORKING", provenance: "reported", [eventPhaseField]: "not-a-workflow-phase" } },
  ];
  const phaseRejections = phaseAdmissionCases.map(({ name, event }) => {
    const record = activeBoundaryRecord(`phase_${name}`);
    return {
      name,
      rejectedAtomically: assertAtomicRejection(record, {
        id: `phase-invalid-${name}`, taskId: record.snapshot.id, at,
        label: "Synthetic invalid phase placement.", ...event,
      } as VisualEvent),
    };
  });
  findings.push({
    case: "phase-declarations-require-valid-correlated-workflow-events",
    pass: phaseRejections.every((entry) => entry.rejectedAtomically),
    cases: phaseRejections,
  });

  for (const finding of findings) process.stdout.write(`${JSON.stringify(finding)}\n`);
  if (findings.some((finding) => !finding.pass)) process.exitCode = 1;
} finally {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
}
