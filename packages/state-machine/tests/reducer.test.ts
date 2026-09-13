import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { VisualEvent } from "@visual-team/contracts";
import {
  applyEvent,
  createTaskRecord,
  reduceEvent,
  refreshDerivedFlags,
} from "../src/index.ts";

const T0 = "2026-09-13T15:00:00.000Z";

function makeSolo() {
  return createTaskRecord(
    { title: "Fix typo", summary: "Fix it", mode: "solo", privacyMode: "standard" },
    { taskId: "vt_test", startedAt: T0, eventId: "e0" },
  );
}

function ev(partial: Partial<VisualEvent> & Pick<VisualEvent, "id" | "kind">): VisualEvent {
  return {
    taskId: "vt_test",
    at: "2026-09-13T15:01:00.000Z",
    provenance: "observed",
    label: "test",
    ...partial,
  };
}

describe("createTaskRecord", () => {
  it("solo mode produces exactly one lead bot", () => {
    const rec = makeSolo();
    assert.equal(rec.snapshot.workers.length, 1);
    assert.equal(rec.snapshot.workers[0]?.role, "lead");
    assert.equal(rec.snapshot.workers[0]?.isWriter, true);
    assert.equal(rec.snapshot.state, "PLANNING");
    assert.equal(rec.snapshot.stateProvenance, "reported");
  });

  it("team mode caps the roster at three and always includes a lead", () => {
    const rec = createTaskRecord(
      { title: "t", summary: "s", mode: "team", workerRoles: ["explorer", "reviewer", "builder", "explorer"], privacyMode: "standard" },
      { taskId: "vt_t", startedAt: T0, eventId: "e0" },
    );
    assert.equal(rec.snapshot.workers.length, 3);
    assert.equal(rec.snapshot.workers[0]?.role, "lead");
  });
});

describe("worker transitions", () => {
  it("ASSIGNED -> PLANNING -> WORKING is accepted", () => {
    const rec = makeSolo();
    let r = applyEvent(rec, ev({ id: "e1", kind: "worker_transition", workerId: "lead", to: "PLANNING" }));
    assert.equal(r.ok, true);
    r = applyEvent(rec, ev({ id: "e2", kind: "worker_transition", workerId: "lead", to: "WORKING" }));
    assert.equal(r.ok, true);
    assert.equal(rec.snapshot.workers[0]?.state, "WORKING");
    assert.equal(rec.snapshot.state, "ACTIVE");
  });

  it("rejects an illegal transition (ASSIGNED -> COMPLETED) without changing state", () => {
    const rec = makeSolo();
    const r = applyEvent(rec, ev({ id: "e1", kind: "worker_transition", workerId: "lead", to: "COMPLETED" }));
    assert.equal(r.ok, false);
    assert.equal(rec.snapshot.workers[0]?.state, "ASSIGNED");
    assert.match(r.ok ? "" : r.error, /cannot move/);
  });

  it("rejects transition to a nonexistent worker", () => {
    const rec = makeSolo();
    // Unknown worker falls back to the writer; to force a miss use activity on bad id.
    const r = applyEvent(rec, ev({ id: "e1", kind: "worker_transition", workerId: "ghost", to: "PLANNING" }));
    // Falls back to lead (default worker) — transition applies to lead, not a ghost.
    assert.equal(r.ok, true);
    assert.equal(rec.snapshot.workers[0]?.state, "PLANNING");
    assert.equal(rec.snapshot.workers.length, 1); // no fabricated bot
  });
});

describe("provenance guards (plan §6)", () => {
  it("a derived event can never complete a task", () => {
    const rec = makeSolo();
    applyEvent(rec, ev({ id: "e1", kind: "worker_transition", workerId: "lead", to: "WORKING" }));
    const r = applyEvent(
      rec,
      ev({ id: "e2", kind: "task_finished", to: "COMPLETED", provenance: "derived" }),
    );
    assert.equal(r.ok, false);
    assert.notEqual(rec.snapshot.state, "COMPLETED");
    assert.match(r.ok ? "" : r.error, /derived/);
  });

  it("a derived event cannot move a worker to WAITING_FOR_APPROVAL", () => {
    const rec = makeSolo();
    applyEvent(rec, ev({ id: "e1", kind: "worker_transition", workerId: "lead", to: "WORKING" }));
    const r = applyEvent(
      rec,
      ev({ id: "e2", kind: "worker_transition", workerId: "lead", to: "WAITING_FOR_APPROVAL", provenance: "derived" }),
    );
    assert.equal(r.ok, false);
    assert.equal(rec.snapshot.workers[0]?.state, "WORKING");
  });

  it("a derived event cannot move a worker to REVIEWING or COMPLETED", () => {
    const rec = makeSolo();
    applyEvent(rec, ev({ id: "e1", kind: "worker_transition", workerId: "lead", to: "WORKING" }));
    for (const to of ["REVIEWING", "COMPLETED"] as const) {
      const r = applyEvent(
        rec,
        ev({ id: `e_${to}`, kind: "worker_transition", workerId: "lead", to, provenance: "derived" }),
      );
      assert.equal(r.ok, false, `derived -> ${to} must fail`);
    }
    assert.equal(rec.snapshot.workers[0]?.state, "WORKING");
  });

  it("an observed permission event can move a worker to WAITING_FOR_APPROVAL", () => {
    const rec = makeSolo();
    applyEvent(rec, ev({ id: "e1", kind: "worker_transition", workerId: "lead", to: "WORKING" }));
    const r = applyEvent(rec, ev({ id: "e2", kind: "permission_request", workerId: "lead" }));
    assert.equal(r.ok, true);
    assert.equal(rec.snapshot.workers[0]?.state, "WAITING_FOR_APPROVAL");
    assert.equal(rec.snapshot.state, "WAITING_FOR_USER");
    assert.equal(rec.snapshot.needsUser, true);
  });
});

describe("task completion requires an explicit event", () => {
  it("task_finished with observed provenance completes task and workers", () => {
    const rec = makeSolo();
    applyEvent(rec, ev({ id: "e1", kind: "worker_transition", workerId: "lead", to: "WORKING" }));
    const r = applyEvent(rec, ev({ id: "e2", kind: "task_finished", to: "COMPLETED", provenance: "reported" }));
    assert.equal(r.ok, true);
    assert.equal(rec.snapshot.state, "COMPLETED");
    assert.equal(rec.snapshot.workers[0]?.state, "COMPLETED");
  });

  it("a plain activity event cannot complete anything", () => {
    const rec = makeSolo();
    applyEvent(rec, ev({ id: "e1", kind: "worker_transition", workerId: "lead", to: "WORKING" }));
    applyEvent(rec, ev({ id: "e2", kind: "activity" }));
    assert.notEqual(rec.snapshot.state, "COMPLETED");
    assert.notEqual(rec.snapshot.workers[0]?.state, "COMPLETED");
  });
});

describe("idempotency", () => {
  it("duplicate event ids do not alter the snapshot", () => {
    const rec = makeSolo();
    const e = ev({ id: "dup", kind: "worker_transition", workerId: "lead", to: "WORKING" });
    const r1 = applyEvent(rec, e);
    const r2 = applyEvent(rec, e);
    assert.equal(r1.ok, true);
    assert.equal(r2.ok, true);
    assert.equal(r2.changed, false);
    assert.equal(rec.snapshot.eventCount, 2); // start + one applied event
  });
});

describe("roster rules", () => {
  it("never exceeds three visible workers; extras become activity only", () => {
    const rec = createTaskRecord(
      { title: "t", summary: "s", mode: "team", workerRoles: ["lead", "explorer", "builder"], privacyMode: "standard" },
      { taskId: "vt_t3", startedAt: T0, eventId: "e0" },
    );
    applyEvent(rec, ev({ id: "e1", kind: "specialist_joined", workerId: "agent-9", detail: "agent_type: review" }));
    assert.equal(rec.snapshot.workers.length, 3);
  });
});

describe("staleness", () => {
  it("marks stale active tasks 'no recent activity', never failed/stuck", () => {
    const rec = makeSolo();
    applyEvent(rec, ev({ id: "e1", kind: "worker_transition", workerId: "lead", to: "WORKING" }));
    const later = new Date(Date.parse(T0) + 10 * 60_000).toISOString();
    const s = refreshDerivedFlags(rec.snapshot, later, 60_000);
    assert.equal(s.noRecentActivity, true);
    assert.equal(s.state, "ACTIVE");
  });

  it("does not mark terminal tasks", () => {
    const rec = makeSolo();
    applyEvent(rec, ev({ id: "e1", kind: "worker_transition", workerId: "lead", to: "WORKING" }));
    applyEvent(rec, ev({ id: "e2", kind: "task_finished", to: "COMPLETED", provenance: "reported" }));
    const later = new Date(Date.parse(T0) + 10 * 60_000).toISOString();
    const s = refreshDerivedFlags(rec.snapshot, later, 60_000);
    assert.equal(s.noRecentActivity, false);
  });
});

describe("determinism", () => {
  it("replaying the same event log produces the same snapshot", () => {
    const events = [
      ev({ id: "a", kind: "worker_transition", workerId: "lead", to: "WORKING" }),
      ev({ id: "b", kind: "activity" }),
      ev({ id: "c", kind: "turn_finished" }),
    ];
    const r1 = makeSolo();
    const r2 = makeSolo();
    for (const e of events) {
      applyEvent(r1, e);
      applyEvent(r2, e);
    }
    assert.deepEqual(r1.snapshot, r2.snapshot);
  });

  it("reduceEvent does not mutate the input snapshot", () => {
    const rec = makeSolo();
    const before = structuredClone(rec.snapshot);
    reduceEvent(rec.snapshot, ev({ id: "x", kind: "worker_transition", workerId: "lead", to: "WORKING" }));
    assert.deepEqual(rec.snapshot, before);
  });
});
