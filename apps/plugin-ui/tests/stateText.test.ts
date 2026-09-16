import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { TaskSnapshot, WorkerSnapshot } from "@visual-team/contracts";
import {
  needActions,
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
  it("a task need points back at the chat", () => {
    const lines = needActions(snap({ needsUser: true, pendingUserNeeds: { task: "reported" } }));
    assert.deepEqual(lines, ["A question is waiting — answer in the chat."]);
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
