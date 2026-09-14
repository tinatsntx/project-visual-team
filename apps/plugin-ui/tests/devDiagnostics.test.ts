import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { VisualEvent } from "@visual-team/contracts";
import { applyEvent, createTaskRecord } from "@visual-team/state-machine";
import { syntheticCompletionDiagnostic } from "../src/dev/diagnostics.ts";

const AT = "2026-09-14T12:00:00.000Z";

function makeRecord() {
  return createTaskRecord(
    { title: "Harness task", summary: "Test harness diagnostics", mode: "solo", privacyMode: "standard" },
    { taskId: "vt_harness", startedAt: AT, eventId: "evt_start" },
  );
}

function event(partial: Pick<VisualEvent, "id" | "kind"> & Partial<VisualEvent>): VisualEvent {
  return {
    taskId: "vt_harness",
    at: AT,
    provenance: "reported",
    label: "Synthetic harness event.",
    ...partial,
  };
}

describe("synthetic completion diagnostics", () => {
  it("reports an accepted harness completion without claiming a native Codex event", () => {
    const record = makeRecord();
    applyEvent(record, event({ id: "evt_work", kind: "worker_transition", workerId: "lead", to: "WORKING" }));
    const result = applyEvent(record, event({ id: "evt_finish", kind: "task_finished" }));
    const diagnostic = syntheticCompletionDiagnostic(result);

    assert.match(diagnostic, /harness → synthetic task_finished accepted/);
    assert.match(diagnostic, /task is COMPLETED; widget stops polling/);
    assert.doesNotMatch(diagnostic, /codex/i);
  });

  it("reports a reducer-rejected completion and preserves polling", () => {
    const record = makeRecord();
    applyEvent(record, event({ id: "evt_work", kind: "worker_transition", workerId: "lead", to: "WORKING" }));
    applyEvent(record, event({ id: "evt_permission", kind: "permission_request", workerId: "lead" }));
    const result = applyEvent(record, event({ id: "evt_finish", kind: "task_finished" }));
    const diagnostic = syntheticCompletionDiagnostic(result);

    assert.equal(result.ok, false);
    assert.match(diagnostic, /synthetic task_finished REJECTED/);
    assert.match(diagnostic, /task remains WAITING_FOR_USER; widget keeps polling/);
  });
});
