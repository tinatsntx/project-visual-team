import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { VisualEvent } from "@visual-team/contracts";
import { finishDetail } from "../src/resultDetail.ts";

const base = { taskId: "vt_t", at: "2026-09-15T20:00:00.000Z", provenance: "reported" as const };
const ev = (id: string, kind: VisualEvent["kind"], detail?: string): VisualEvent => ({
  ...base, id, kind, label: "x", ...(detail ? { detail } : {}),
});

describe("finishDetail", () => {
  it("finds the latest task_finished event and extracts the verification enum", () => {
    const events = [
      ev("e1", "worker_transition"),
      ev("e2", "task_finished", "result: shipped; verification: passed; artifacts: a (u)"),
    ];
    const f = finishDetail(events);
    assert.equal(f.event?.id, "e2");
    assert.equal(f.verification, "passed");
    assert.match(f.detail ?? "", /result: shipped/);
  });

  it("keeps the raw detail verbatim even when segments are unfamiliar", () => {
    const f = finishDetail([ev("e1", "task_finished", "result: x; something: else")]);
    assert.equal(f.detail, "result: x; something: else");
    assert.equal(f.verification, null);
  });

  it("treats an unknown verification token as absent, never success", () => {
    const f = finishDetail([ev("e1", "task_finished", "result: x; verification: green")]);
    assert.equal(f.verification, null);
  });

  it("returns empty detail and null verification when no finish exists", () => {
    const f = finishDetail([ev("e1", "worker_transition")]);
    assert.equal(f.event, null);
    assert.equal(f.detail, null);
    assert.equal(f.verification, null);
  });

  it("does not match a verification token embedded mid-segment", () => {
    const f = finishDetail([ev("e1", "task_finished", "result: verification: passed, actually; note: y")]);
    assert.equal(f.verification, null);
  });
});
