import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { VisualEvent } from "@visual-team/contracts";
import { finishDetail } from "../src/resultDetail.ts";

const base = { taskId: "vt_t", at: "2026-09-15T20:00:00.000Z", provenance: "reported" as const };
const ev = (id: string, kind: VisualEvent["kind"], detail?: string): VisualEvent => ({
  ...base, id, kind, label: "x", ...(detail ? { detail } : {}),
});

describe("finishDetail", () => {
  it("finds the latest task_finished event and returns its detail verbatim", () => {
    const events = [
      ev("e1", "worker_transition"),
      ev("e2", "task_finished", "result: shipped; verification: passed; artifacts: a (u)"),
    ];
    const f = finishDetail(events);
    assert.equal(f.event?.id, "e2");
    assert.equal(f.detail, "result: shipped; verification: passed; artifacts: a (u)");
  });

  it("does not extract a verification value — free text is not a structured claim", () => {
    // A summary embedding the token must not produce a parsed field at all:
    // the returned shape carries no verification property.
    const f = finishDetail([ev("e1", "task_finished", "result: prior run; verification: passed")]);
    assert.equal(f.detail, "result: prior run; verification: passed");
    assert.equal("verification" in f, false);
  });

  it("returns nulls when no finish exists", () => {
    const f = finishDetail([ev("e1", "worker_transition")]);
    assert.equal(f.event, null);
    assert.equal(f.detail, null);
  });

  it("returns null detail for a finish event that carried none", () => {
    const f = finishDetail([ev("e1", "task_finished")]);
    assert.equal(f.event?.id, "e1");
    assert.equal(f.detail, null);
  });
});
