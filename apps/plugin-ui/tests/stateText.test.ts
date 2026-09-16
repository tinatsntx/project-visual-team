import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { TaskSnapshot, VisualEvent, WorkerSnapshot } from "@visual-team/contracts";
import {
  latestActivityLine,
  lastRefreshLine,
  needActions,
  NO_PENDING_NEEDS_TEXT,
  phaseLine,
  reportedChecksLine,
  TASK_STATE_TEXT,
  WORKER_STATE_TEXT,
  workerLine,
} from "../src/accessibility/stateText.ts";
import { TaskStateSchema, WorkerStateSchema } from "@visual-team/contracts";

/** Every visual state must also exist as text (plan §3.7). */
describe("state text coverage", () => {
  it("every worker state has a label", () => {
    for (const s of WorkerStateSchema.options) {
      assert.ok(WORKER_STATE_TEXT[s], `missing text for worker state ${s}`);
    }
  });
  it("every task state has a label", () => {
    for (const s of TaskStateSchema.options) {
      assert.ok(TASK_STATE_TEXT[s], `missing text for task state ${s}`);
    }
  });
});

const AT = "2026-09-15T20:00:00.000Z";
const leadWorker: WorkerSnapshot = {
  id: "lead", role: "lead", label: "Alex", state: "WORKING",
  stateProvenance: "reported", isWriter: true, updatedAt: AT,
};

function snap(overrides: Partial<TaskSnapshot>): TaskSnapshot {
  return {
    id: "vt_t", title: "t", summary: "s", mode: "solo", privacyMode: "standard",
    state: "ACTIVE", stateProvenance: "reported", workers: [leadWorker],
    createdAt: AT, updatedAt: AT, lastActivityAt: AT,
    noRecentActivity: false, needsUser: false, eventCount: 1,
    ...overrides,
  };
}

describe("needActions attribution", () => {
  it("worker:<id> needs point at the Codex permission prompt", () => {
    const lines = needActions(snap({ needsUser: true, pendingUserNeeds: { "worker:lead": "observed" } }));
    assert.deepEqual(lines, ["Alex needs approval — answer the Codex permission prompt."]);
  });
  it("a reported task need names the reported question and the originating chat", () => {
    const lines = needActions(snap({ needsUser: true, pendingUserNeeds: { task: "reported" } }));
    assert.deepEqual(lines, ["A reported question is waiting — answer it in the originating chat."]);
  });
  it("an observed task-level need points at the Codex prompt, never an invented question", () => {
    const lines = needActions(snap({ needsUser: true, pendingUserNeeds: { task: "observed" } }));
    assert.deepEqual(lines, ["Approval may be pending — answer the Codex permission prompt."]);
  });
  it("unknown need attribution degrades to the generic line — no invented question", () => {
    const lines = needActions(snap({ needsUser: true, pendingUserNeeds: { legacy: "reported" } }));
    assert.deepEqual(lines, ["This task needs you."]);
  });
  it("both needs produce both actions", () => {
    const lines = needActions(
      snap({ needsUser: true, pendingUserNeeds: { "worker:lead": "observed", task: "reported" } }),
    );
    assert.equal(lines.length, 2);
  });
  it("needsUser without attribution degrades to the generic line", () => {
    assert.deepEqual(needActions(snap({ needsUser: true })), ["This task needs you."]);
    assert.deepEqual(needActions(snap({ needsUser: true, pendingUserNeeds: {} })), ["This task needs you."]);
  });
  it("no need produces no lines", () => {
    assert.deepEqual(needActions(snap({})), []);
  });
});

describe("brief-011 status lines", () => {
  it("reported checks use the exact required text; absent checks read Not provided", () => {
    assert.equal(reportedChecksLine("passed"), "Reported checks: passed");
    assert.equal(reportedChecksLine("failed"), "Reported checks: failed");
    assert.equal(reportedChecksLine("not_run"), "Reported checks: not run");
    assert.equal(reportedChecksLine(undefined), "Reported checks: Not provided");
    assert.equal(NO_PENDING_NEEDS_TEXT, "No pending requests recorded.");
  });

  it("phase line shows the reported workflow phase, never the lifecycle state", () => {
    // Lifecycle ACTIVE with a retained reported phase shows the phase.
    const withPhase = snap({
      state: "ACTIVE",
      phase: { name: "testing", provenance: "reported", at: "2026-09-15T20:07:00.000Z" },
    });
    assert.match(phaseLine(withPhase), /^testing \(reported, /);
    // Older snapshots without a phase read honestly as not provided.
    assert.equal(phaseLine(snap({ state: "COMPLETED", stateProvenance: "reported" })), "not provided");
  });

  it("latest activity names the event, its source, and its time", () => {
    const events: VisualEvent[] = [
      {
        id: "e1", taskId: "vt_t", at: "2026-09-15T20:00:00.000Z",
        provenance: "observed", kind: "activity", label: "Observed tool run.",
      },
    ];
    const line = latestActivityLine(events);
    assert.match(line, /Latest recorded activity: Observed tool run\./);
    assert.match(line, /observed/);
    assert.match(line, /\d{2}:\d{2}/);
  });

  it("empty events read as limited visibility, never 'no work'", () => {
    assert.match(latestActivityLine([]), /No recorded activity visible/);
  });

  it("the last successful refresh is stated separately and honestly when absent", () => {
    assert.match(lastRefreshLine("2026-09-15T20:05:00.000Z"), /Last successful refresh:/);
    assert.equal(lastRefreshLine(null), "No successful refresh recorded.");
  });
});

describe("workerLine canceled-in-context", () => {
  const canceled: WorkerSnapshot = { ...leadWorker, id: "remy", label: "Remy", state: "CANCELED", isWriter: false };
  it("canceled under a completed task reads as ended tracking, not verified cancellation", () => {
    assert.match(workerLine(canceled, snap({ state: "COMPLETED" })), /tracking ended; no finish signal/);
  });
  it("canceled under a failed task reads as stopped by the failure", () => {
    assert.match(workerLine(canceled, snap({ state: "FAILED" })), /stopped when the task failed/);
  });
  it("canceled under a live task is plainly canceled", () => {
    assert.match(workerLine(canceled, snap({ state: "ACTIVE" })), /is canceled/);
  });
  it("canceled with no task context is plainly canceled", () => {
    assert.match(workerLine(canceled), /is canceled/);
  });
});
