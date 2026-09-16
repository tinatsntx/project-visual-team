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

  it("rejects a transition naming a nonexistent worker without mutating anyone", () => {
    const rec = makeSolo();
    const before = structuredClone(rec.snapshot);
    const r = applyEvent(rec, ev({ id: "e1", kind: "worker_transition", workerId: "ghost", to: "PLANNING" }));
    assert.equal(r.ok, false);
    assert.match(r.ok ? "" : r.error, /unknown worker ghost/);
    assert.deepEqual(rec.snapshot, before);
    assert.equal(rec.events.length, 1); // only the start event
    assert.equal(rec.seenEventIds.has("e1"), false);
  });

  it("still falls back to the writer when workerId is genuinely absent", () => {
    const rec = makeSolo();
    const r = applyEvent(rec, ev({ id: "e1", kind: "worker_transition", to: "WORKING" }));
    assert.equal(r.ok, true);
    assert.equal(rec.snapshot.workers[0]?.state, "WORKING");
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
      { taskId: "vt_test", startedAt: T0, eventId: "e0" },
    );
    const r = applyEvent(rec, ev({ id: "e1", kind: "specialist_joined", workerId: "agent-9", detail: "agent_type: review" }));
    assert.equal(r.ok, true);
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

describe("explicit targets and cross-task events", () => {
  it("rejects an event addressed to a different task without touching the record", () => {
    const rec = makeSolo();
    const before = structuredClone(rec.snapshot);
    const r = applyEvent(rec, ev({ id: "e1", kind: "worker_transition", to: "WORKING", taskId: "vt_other" }));
    assert.equal(r.ok, false);
    assert.match(r.ok ? "" : r.error, /targets task vt_other/);
    assert.deepEqual(rec.snapshot, before);
    assert.equal(rec.events.length, 1);
    assert.equal(rec.seenEventIds.has("e1"), false);
  });

  it("rejects a permission_request naming a nonexistent worker", () => {
    const rec = makeSolo();
    const before = structuredClone(rec.snapshot);
    const r = applyEvent(rec, ev({ id: "e1", kind: "permission_request", workerId: "ghost" }));
    assert.equal(r.ok, false);
    assert.match(r.ok ? "" : r.error, /unknown worker ghost/);
    assert.deepEqual(rec.snapshot, before);
  });

  it("a permission_request without workerId still reaches the writer", () => {
    const rec = makeSolo();
    const r = applyEvent(rec, ev({ id: "e1", kind: "permission_request" }));
    assert.equal(r.ok, true);
    assert.equal(rec.snapshot.workers[0]?.state, "WAITING_FOR_APPROVAL");
    assert.equal(rec.snapshot.needsUser, true);
    assert.equal(rec.snapshot.needsUserProvenance, "observed");
  });

  it("a permission request is recorded even before work starts", () => {
    const rec = makeSolo(); // lead is ASSIGNED, task PLANNING
    const r = applyEvent(rec, ev({ id: "e1", kind: "permission_request", workerId: "lead" }));
    assert.equal(r.ok, true);
    assert.equal(rec.snapshot.needsUser, true);
    assert.equal(rec.snapshot.state, "PLANNING"); // WAITING_FOR_USER requires ACTIVE
  });

  it("rejects specialist_finished naming a nonexistent worker", () => {
    const rec = makeSolo();
    const r = applyEvent(rec, ev({ id: "e1", kind: "specialist_finished", workerId: "agent-x" }));
    assert.equal(r.ok, false);
    assert.equal(rec.snapshot.eventCount, 1);
  });

  it("specialist_finished without workerId journals without completing anyone", () => {
    const rec = makeSolo();
    const r = applyEvent(rec, ev({ id: "e1", kind: "specialist_finished" }));
    assert.equal(r.ok, true);
    assert.equal(r.ok && r.changed, true);
    assert.equal(rec.snapshot.workers[0]?.state, "ASSIGNED");
    assert.equal(rec.snapshot.eventCount, 2);
  });

  it("activity naming an unknown worker journals without attributing it", () => {
    const rec = makeSolo();
    const r = applyEvent(rec, ev({ id: "e1", kind: "activity", workerId: "ghost" }));
    assert.equal(r.ok, true);
    assert.equal(rec.snapshot.workers[0]?.lastEventId, undefined);
    assert.equal(rec.snapshot.eventCount, 2);
  });
});

describe("indirect provenance paths (plan §6)", () => {
  it("derived specialist_finished cannot complete a worker", () => {
    const rec = makeSolo();
    applyEvent(rec, ev({ id: "e1", kind: "worker_transition", workerId: "lead", to: "WORKING" }));
    const r = applyEvent(rec, ev({ id: "e2", kind: "specialist_finished", workerId: "lead", provenance: "derived" }));
    assert.equal(r.ok, false);
    assert.equal(rec.snapshot.workers[0]?.state, "WORKING");
  });

  it("derived permission_request cannot claim a pending approval", () => {
    const rec = makeSolo();
    const r = applyEvent(rec, ev({ id: "e1", kind: "permission_request", provenance: "derived" }));
    assert.equal(r.ok, false);
    assert.equal(rec.snapshot.needsUser, false);
    assert.equal(rec.snapshot.needsUserProvenance, undefined);
  });

  it("derived specialist_joined cannot fabricate a roster member", () => {
    const rec = makeSolo();
    const r = applyEvent(rec, ev({ id: "e1", kind: "specialist_joined", workerId: "agent-1", provenance: "derived" }));
    assert.equal(r.ok, false);
    assert.equal(rec.snapshot.workers.length, 1);
  });

  it("derived task_transition cannot cancel a task", () => {
    const rec = makeSolo();
    const r = applyEvent(rec, ev({ id: "e1", kind: "task_transition", to: "CANCELED", provenance: "derived" }));
    assert.equal(r.ok, false);
    assert.equal(rec.snapshot.state, "PLANNING");
  });

  it("derived worker_transition cannot cancel a worker", () => {
    const rec = makeSolo();
    applyEvent(rec, ev({ id: "e1", kind: "worker_transition", workerId: "lead", to: "WORKING" }));
    const r = applyEvent(rec, ev({ id: "e2", kind: "worker_transition", workerId: "lead", to: "CANCELED", provenance: "derived" }));
    assert.equal(r.ok, false);
    assert.equal(rec.snapshot.workers[0]?.state, "WORKING");
  });

  it("the same indirect paths still work for observed/reported evidence", () => {
    const rec = makeSolo();
    applyEvent(rec, ev({ id: "e1", kind: "specialist_joined", workerId: "agent-1", detail: "agent_type: review" }));
    const r = applyEvent(rec, ev({ id: "e2", kind: "specialist_finished", workerId: "agent-1", provenance: "observed" }));
    assert.equal(r.ok, true);
    const agent = rec.snapshot.workers.find((w) => w.externalId === "agent-1");
    assert.equal(agent?.state, "COMPLETED");
    // Internal ids stay role-based; external ids only correlate, never collide.
    assert.equal(agent?.id, "reviewer");
  });
});

describe("task_finished validation", () => {
  it("a missing finish target defaults to COMPLETED", () => {
    const rec = makeSolo();
    applyEvent(rec, ev({ id: "e1", kind: "worker_transition", workerId: "lead", to: "WORKING" }));
    const r = applyEvent(rec, ev({ id: "e2", kind: "task_finished", provenance: "reported" }));
    assert.equal(r.ok, true);
    assert.equal(rec.snapshot.state, "COMPLETED");
  });

  it("rejects a finish target that is not a terminal outcome", () => {
    const rec = makeSolo();
    const before = structuredClone(rec.snapshot);
    const r = applyEvent(rec, ev({ id: "e1", kind: "task_finished", to: "CANCELED", provenance: "reported" }));
    assert.equal(r.ok, false);
    assert.match(r.ok ? "" : r.error, /cannot target CANCELED/);
    assert.deepEqual(rec.snapshot, before);
  });

  it("a failed finish never leaves a worker mid-flight", () => {
    const rec = makeSolo(); // lead ASSIGNED — FAILED is not legal from ASSIGNED
    const r = applyEvent(rec, ev({ id: "e1", kind: "task_finished", to: "FAILED", provenance: "reported" }));
    assert.equal(r.ok, true);
    assert.equal(rec.snapshot.state, "FAILED");
    assert.equal(rec.snapshot.workers[0]?.state, "CANCELED");
  });

  it("clears needsUser provenance when the task finishes", () => {
    const rec = makeSolo();
    applyEvent(rec, ev({ id: "e1", kind: "worker_transition", workerId: "lead", to: "WORKING" }));
    applyEvent(rec, ev({ id: "e2", kind: "permission_request", workerId: "lead" }));
    applyEvent(rec, ev({ id: "e3", kind: "worker_transition", workerId: "lead", to: "WORKING" }));
    applyEvent(rec, ev({ id: "e4", kind: "task_finished", to: "COMPLETED", provenance: "reported" }));
    assert.equal(rec.snapshot.needsUser, false);
    assert.equal(rec.snapshot.needsUserProvenance, undefined);
  });
});

describe("turn end and interruption", () => {
  it("turn_finished clears needsUser and its provenance", () => {
    const rec = makeSolo();
    applyEvent(rec, ev({ id: "e1", kind: "permission_request" }));
    const r = applyEvent(rec, ev({ id: "e2", kind: "turn_finished" }));
    assert.equal(r.ok, true);
    assert.equal(rec.snapshot.needsUser, false);
    assert.equal(rec.snapshot.needsUserProvenance, undefined);
  });

  it("interrupted idles a reviewing worker", () => {
    const rec = makeSolo();
    applyEvent(rec, ev({ id: "e1", kind: "worker_transition", workerId: "lead", to: "WORKING" }));
    applyEvent(rec, ev({ id: "e2", kind: "worker_transition", workerId: "lead", to: "REVIEWING" }));
    const r = applyEvent(rec, ev({ id: "e3", kind: "interrupted" }));
    assert.equal(r.ok, true);
    assert.equal(rec.snapshot.workers[0]?.state, "IDLE");
    assert.equal(rec.snapshot.state, "ACTIVE");
  });

  it("worker_assigned journals and attributes to a resolved worker", () => {
    const rec = makeSolo();
    const r = applyEvent(rec, ev({ id: "e1", kind: "worker_assigned", workerId: "lead", label: "Lead picked it up." }));
    assert.equal(r.ok, true);
    assert.equal(rec.snapshot.workers[0]?.lastEventId, "e1");
    assert.equal(rec.snapshot.eventCount, 2);
  });
});

describe("pending-need consistency", () => {
  it("resuming work clears the pending-need flag", () => {
    const rec = makeSolo();
    applyEvent(rec, ev({ id: "e1", kind: "worker_transition", workerId: "lead", to: "WORKING" }));
    applyEvent(rec, ev({ id: "e2", kind: "permission_request", workerId: "lead" }));
    assert.equal(rec.snapshot.needsUser, true);
    const r = applyEvent(rec, ev({ id: "e3", kind: "worker_transition", workerId: "lead", to: "WORKING" }));
    assert.equal(r.ok, true);
    assert.equal(rec.snapshot.needsUser, false);
    assert.equal(rec.snapshot.needsUserProvenance, undefined);
    assert.equal(rec.snapshot.state, "ACTIVE");
  });

  it("an explicit wait-for-approval transition flags the pending need", () => {
    const rec = makeSolo();
    applyEvent(rec, ev({ id: "e1", kind: "worker_transition", workerId: "lead", to: "WORKING" }));
    const r = applyEvent(rec, ev({ id: "e2", kind: "worker_transition", workerId: "lead", to: "WAITING_FOR_APPROVAL" }));
    assert.equal(r.ok, true);
    assert.equal(rec.snapshot.needsUser, true);
    assert.equal(rec.snapshot.needsUserProvenance, "observed");
    assert.equal(rec.snapshot.state, "WAITING_FOR_USER");
  });

  it("a task_transition to a terminal state still settles the board", () => {
    const rec = makeSolo();
    applyEvent(rec, ev({ id: "e1", kind: "worker_transition", workerId: "lead", to: "WORKING" }));
    applyEvent(rec, ev({ id: "e2", kind: "permission_request", workerId: "lead" }));
    assert.equal(rec.snapshot.needsUser, true);
    // WAITING_FOR_USER cannot complete, but it can fail — terminal either way.
    const r = applyEvent(rec, ev({ id: "e3", kind: "task_transition", to: "FAILED", provenance: "reported" }));
    assert.equal(r.ok, true);
    assert.equal(rec.snapshot.state, "FAILED");
    assert.equal(rec.snapshot.needsUser, false);
    assert.equal(rec.snapshot.needsUserProvenance, undefined);
    assert.equal(rec.snapshot.workers[0]?.state, "FAILED");
  });

  it("turn_finished moves a waiting task back to ACTIVE", () => {
    const rec = makeSolo();
    applyEvent(rec, ev({ id: "e1", kind: "worker_transition", workerId: "lead", to: "WORKING" }));
    applyEvent(rec, ev({ id: "e2", kind: "permission_request", workerId: "lead" }));
    assert.equal(rec.snapshot.state, "WAITING_FOR_USER");
    applyEvent(rec, ev({ id: "e3", kind: "turn_finished" }));
    assert.equal(rec.snapshot.state, "ACTIVE");
    assert.equal(rec.snapshot.needsUser, false);
  });

  it("interrupted resolves the pending-need flag and the waiting task", () => {
    const rec = makeSolo();
    applyEvent(rec, ev({ id: "e1", kind: "worker_transition", workerId: "lead", to: "WORKING" }));
    applyEvent(rec, ev({ id: "e2", kind: "permission_request", workerId: "lead" }));
    const r = applyEvent(rec, ev({ id: "e3", kind: "interrupted" }));
    assert.equal(r.ok, true);
    assert.equal(rec.snapshot.needsUser, false);
    assert.equal(rec.snapshot.state, "ACTIVE");
  });

  it("a permission request still flags needsUser when no worker can wait", () => {
    const rec = makeSolo();
    applyEvent(rec, ev({ id: "e1", kind: "worker_transition", workerId: "lead", to: "WORKING" }));
    // The writer is finished while the task stays ACTIVE.
    applyEvent(rec, ev({ id: "e2", kind: "specialist_finished", workerId: "lead", provenance: "reported" }));
    assert.equal(rec.snapshot.workers[0]?.state, "COMPLETED");
    const r = applyEvent(rec, ev({ id: "e3", kind: "permission_request" }));
    assert.equal(r.ok, true);
    assert.equal(rec.snapshot.needsUser, true);
    assert.equal(rec.snapshot.needsUserProvenance, "observed");
  });

  it("specialist_joined with an empty workerId gets a generated roster id", () => {
    const rec = makeSolo();
    const r = applyEvent(rec, ev({ id: "e1", kind: "specialist_joined", workerId: "", detail: "agent_type: build" }));
    assert.equal(r.ok, true);
    assert.equal(rec.snapshot.workers.length, 2);
    assert.ok(rec.snapshot.workers.every((w) => w.id.length > 0));
    assert.equal(rec.snapshot.workers[1]?.id, "builder");
  });

  it("a derived transition never stamps the task's wait claim", () => {
    const rec = createTaskRecord(
      { title: "t", summary: "s", mode: "team", workerRoles: ["lead", "explorer"], privacyMode: "standard" },
      { taskId: "vt_test", startedAt: T0, eventId: "e0" },
    );
    applyEvent(rec, ev({ id: "e1", kind: "worker_transition", workerId: "lead", to: "WORKING" }));
    applyEvent(rec, ev({ id: "e2", kind: "worker_transition", workerId: "lead", to: "WAITING_FOR_APPROVAL" }));
    assert.equal(rec.snapshot.needsUserProvenance, "observed");
    // A derived event on another worker may apply, but the wait claim keeps
    // the provenance of the evidence that created it — never "derived".
    const r = applyEvent(rec, ev({ id: "e3", kind: "worker_transition", workerId: "explorer", to: "WORKING", provenance: "derived" }));
    assert.equal(r.ok, true);
    assert.equal(rec.snapshot.state, "WAITING_FOR_USER");
    assert.equal(rec.snapshot.stateProvenance, "observed");
  });

  it("a derived event cannot dismiss a pending user decision", () => {
    const rec = makeSolo();
    applyEvent(rec, ev({ id: "e1", kind: "worker_transition", workerId: "lead", to: "WORKING" }));
    applyEvent(rec, ev({ id: "e2", kind: "permission_request", workerId: "lead" }));
    const r = applyEvent(rec, ev({ id: "e3", kind: "worker_transition", workerId: "lead", to: "WORKING", provenance: "derived" }));
    assert.equal(r.ok, true);
    assert.equal(rec.snapshot.workers[0]?.state, "WORKING");
    assert.equal(rec.snapshot.needsUser, true); // the ask outlives inferred evidence
    assert.equal(rec.snapshot.needsUserProvenance, "observed");
  });

  it("a specialist that finishes while idle still completes", () => {
    const rec = makeSolo();
    applyEvent(rec, ev({ id: "e1", kind: "specialist_joined", workerId: "agent-1" }));
    applyEvent(rec, ev({ id: "e2", kind: "turn_finished" })); // idles the specialist first
    const agent = rec.snapshot.workers.find((w) => w.externalId === "agent-1");
    assert.equal(agent?.state, "IDLE");
    const r = applyEvent(rec, ev({ id: "e3", kind: "specialist_finished", workerId: "agent-1" }));
    assert.equal(r.ok, true);
    const after = rec.snapshot.workers.find((w) => w.externalId === "agent-1");
    assert.equal(after?.state, "COMPLETED");
  });
});

describe("worker-id namespaces", () => {
  function makeColliding() {
    const rec = makeSolo();
    applyEvent(rec, ev({ id: "e1", kind: "specialist_joined", workerId: "lead", detail: "agent_type: review" }));
    return rec; // specialist: internal id "reviewer", externalId "lead"
  }

  it("a hook event colliding with a roster id reaches the specialist, not the lead", () => {
    const rec = makeColliding();
    const r = applyEvent(rec, ev({ id: "e2", kind: "permission_request", workerId: "lead" }));
    assert.equal(r.ok, true);
    assert.equal(rec.snapshot.workers.find((w) => w.id === "lead")?.state, "ASSIGNED");
    assert.equal(rec.snapshot.workers.find((w) => w.id === "reviewer")?.state, "WAITING_FOR_APPROVAL");
    assert.equal(rec.snapshot.needsUser, true);
  });

  it("a hook worker_transition colliding with a roster id reaches the specialist", () => {
    const rec = makeColliding();
    const r = applyEvent(rec, ev({ id: "e2", kind: "worker_transition", workerId: "lead", to: "IDLE" }));
    assert.equal(r.ok, true);
    assert.equal(rec.snapshot.workers.find((w) => w.id === "lead")?.state, "ASSIGNED");
    assert.equal(rec.snapshot.workers.find((w) => w.id === "reviewer")?.state, "IDLE");
  });

  it("hook activity attributes to the external id under collision", () => {
    const rec = makeColliding();
    const r = applyEvent(rec, ev({ id: "e2", kind: "activity", workerId: "lead" }));
    assert.equal(r.ok, true);
    assert.equal(rec.snapshot.workers.find((w) => w.id === "reviewer")?.lastEventId, "e2");
    assert.equal(rec.snapshot.workers.find((w) => w.id === "lead")?.lastEventId, undefined);
  });

  it("a reported event naming a roster id reaches the internal worker under collision", () => {
    const rec = makeColliding();
    const r = applyEvent(rec, ev({ id: "e2", kind: "worker_transition", workerId: "lead", to: "WORKING", provenance: "reported" }));
    assert.equal(r.ok, true);
    assert.equal(rec.snapshot.workers.find((w) => w.id === "lead")?.lastEventId, "e2");
    assert.equal(rec.snapshot.workers.find((w) => w.id === "reviewer")?.lastEventId, "e1");
  });

  it("non-colliding external ids and absent ids still resolve", () => {
    const rec = makeSolo();
    applyEvent(rec, ev({ id: "e1", kind: "specialist_joined", workerId: "agent-x" }));
    const r = applyEvent(rec, ev({ id: "e2", kind: "worker_transition", workerId: "agent-x", to: "IDLE" }));
    assert.equal(r.ok, true);
    assert.equal(rec.snapshot.workers.find((w) => w.externalId === "agent-x")?.state, "IDLE");
    const fallback = applyEvent(rec, ev({ id: "e3", kind: "worker_transition", to: "WORKING" }));
    assert.equal(fallback.ok, true);
    assert.equal(rec.snapshot.workers[0]?.state, "WORKING"); // lead
  });
});

describe("attributed pending needs", () => {
  it("a reported task-level wait records a pending need with reported provenance", () => {
    const rec = makeSolo();
    applyEvent(rec, ev({ id: "e1", kind: "worker_transition", workerId: "lead", to: "WORKING" }));
    const r = applyEvent(rec, ev({ id: "e2", kind: "task_transition", to: "WAITING_FOR_USER", provenance: "reported" }));
    assert.equal(r.ok, true);
    assert.equal(rec.snapshot.state, "WAITING_FOR_USER");
    assert.equal(rec.snapshot.needsUser, true);
    assert.equal(rec.snapshot.needsUserProvenance, "reported");
    assert.deepEqual(rec.snapshot.pendingUserNeeds, { task: "reported" });
  });

  it("a reported resume resolves the reported wait", () => {
    const rec = makeSolo();
    applyEvent(rec, ev({ id: "e1", kind: "worker_transition", workerId: "lead", to: "WORKING" }));
    applyEvent(rec, ev({ id: "e2", kind: "task_transition", to: "WAITING_FOR_USER", provenance: "reported" }));
    const r = applyEvent(rec, ev({ id: "e3", kind: "worker_transition", workerId: "lead", to: "WORKING", provenance: "reported" }));
    assert.equal(r.ok, true);
    assert.equal(rec.snapshot.needsUser, false);
    assert.equal(rec.snapshot.needsUserProvenance, undefined);
    assert.equal(rec.snapshot.pendingUserNeeds, undefined);
    assert.equal(rec.snapshot.state, "ACTIVE");
  });

  it("unrelated work cannot resolve another worker's pending ask", () => {
    const rec = makeSolo();
    applyEvent(rec, ev({ id: "e1", kind: "specialist_joined", workerId: "agent-a" }));
    applyEvent(rec, ev({ id: "e2", kind: "worker_transition", workerId: "lead", to: "WORKING" }));
    applyEvent(rec, ev({ id: "e3", kind: "permission_request", workerId: "agent-a" }));
    const agent = () => rec.snapshot.workers.find((w) => w.externalId === "agent-a");
    assert.equal(agent()?.state, "WAITING_FOR_APPROVAL");
    assert.equal(rec.snapshot.state, "WAITING_FOR_USER");
    // Inferred idle may move the worker; it cannot dismiss the real ask.
    applyEvent(rec, ev({ id: "e4", kind: "worker_transition", workerId: "agent-a", to: "IDLE", provenance: "derived" }));
    assert.equal(agent()?.state, "IDLE");
    assert.equal(rec.snapshot.needsUser, true);
    // Unrelated observed work on the lead does not resolve the specialist's ask.
    applyEvent(rec, ev({ id: "e5", kind: "worker_transition", workerId: "lead", to: "WORKING" }));
    assert.equal(rec.snapshot.needsUser, true);
    assert.equal(rec.snapshot.needsUserProvenance, "observed");
    assert.equal(rec.snapshot.state, "WAITING_FOR_USER");
    // Real evidence of the ask-holder resuming resolves exactly that ask.
    applyEvent(rec, ev({ id: "e6", kind: "worker_transition", workerId: "agent-a", to: "WORKING" }));
    assert.equal(rec.snapshot.needsUser, false);
    assert.equal(rec.snapshot.pendingUserNeeds, undefined);
    assert.equal(rec.snapshot.state, "ACTIVE");
  });

  it("independent needs keep their own provenance", () => {
    const rec = makeSolo();
    applyEvent(rec, ev({ id: "e1", kind: "specialist_joined", workerId: "agent-a" }));
    applyEvent(rec, ev({ id: "e2", kind: "specialist_joined", workerId: "agent-b", detail: "agent_type: review" }));
    applyEvent(rec, ev({ id: "e3", kind: "permission_request", workerId: "agent-a" })); // observed
    applyEvent(rec, ev({ id: "e4", kind: "permission_request", workerId: "agent-b", provenance: "reported" }));
    assert.equal(rec.snapshot.needsUserProvenance, "observed"); // earliest live need
    // Resolving the first ask surfaces the second's provenance.
    applyEvent(rec, ev({ id: "e5", kind: "worker_transition", workerId: "agent-a", to: "WORKING" }));
    assert.equal(rec.snapshot.needsUser, true);
    assert.equal(rec.snapshot.needsUserProvenance, "reported");
  });

  it("a specialist finishing while its derived-idled ask is pending resolves the wait", () => {
    const rec = makeSolo();
    applyEvent(rec, ev({ id: "e1", kind: "specialist_joined", workerId: "agent-1" }));
    applyEvent(rec, ev({ id: "e2", kind: "permission_request", workerId: "agent-1" }));
    applyEvent(rec, ev({ id: "e3", kind: "worker_transition", workerId: "agent-1", to: "IDLE", provenance: "derived" }));
    assert.equal(rec.snapshot.needsUser, true);
    assert.equal(rec.snapshot.state, "WAITING_FOR_USER");
    const r = applyEvent(rec, ev({ id: "e4", kind: "specialist_finished", workerId: "agent-1" }));
    assert.equal(r.ok, true);
    assert.equal(rec.snapshot.needsUser, false);
    assert.equal(rec.snapshot.pendingUserNeeds, undefined);
    // The emptied wait must reconcile — no resting WAITING_USER + no-need state.
    assert.equal(rec.snapshot.state, "ACTIVE");
  });

  it("an idle no-op does not resolve a pending ask", () => {
    const rec = makeSolo();
    applyEvent(rec, ev({ id: "e1", kind: "worker_transition", workerId: "lead", to: "WORKING" }));
    applyEvent(rec, ev({ id: "e2", kind: "permission_request", workerId: "lead" }));
    applyEvent(rec, ev({ id: "e3", kind: "worker_transition", workerId: "lead", to: "IDLE", provenance: "derived" }));
    // An observed IDLE no-op says the worker is still idle — not that the ask resolved.
    applyEvent(rec, ev({ id: "e4", kind: "worker_transition", workerId: "lead", to: "IDLE" }));
    assert.equal(rec.snapshot.needsUser, true);
    // Real resumption evidence resolves it.
    applyEvent(rec, ev({ id: "e5", kind: "worker_transition", workerId: "lead", to: "WORKING" }));
    assert.equal(rec.snapshot.needsUser, false);
  });

  it("turn end resolves every pending ask at once", () => {
    const rec = makeSolo();
    applyEvent(rec, ev({ id: "e1", kind: "specialist_joined", workerId: "agent-a" }));
    applyEvent(rec, ev({ id: "e2", kind: "permission_request", workerId: "agent-a" }));
    applyEvent(rec, ev({ id: "e3", kind: "permission_request", workerId: "lead" }));
    assert.deepEqual(Object.keys(rec.snapshot.pendingUserNeeds ?? {}).length, 2);
    applyEvent(rec, ev({ id: "e4", kind: "turn_finished" }));
    assert.equal(rec.snapshot.needsUser, false);
    assert.equal(rec.snapshot.pendingUserNeeds, undefined);
  });

  it("native order Pre -> Permission -> Post -> Stop completes without a fabricated second Pre", () => {
    const rec = makeSolo();
    applyEvent(rec, ev({ id: "e1", kind: "specialist_joined", workerId: "agent-p" }));
    applyEvent(rec, ev({ id: "e2", kind: "worker_transition", workerId: "agent-p", to: "WORKING" }));
    applyEvent(rec, ev({ id: "e3", kind: "permission_request", workerId: "agent-p" }));
    const agent = () => rec.snapshot.workers.find((w) => w.externalId === "agent-p");
    assert.equal(agent()?.state, "WAITING_FOR_APPROVAL");
    assert.equal(rec.snapshot.needsUser, true);
    // The approved tool ran — observed post-tool activity resolves the ask.
    const post = applyEvent(rec, ev({ id: "e4", kind: "activity", workerId: "agent-p" }));
    assert.equal(post.ok, true);
    assert.equal(agent()?.state, "WORKING");
    assert.equal(rec.snapshot.needsUser, false);
    assert.equal(rec.snapshot.state, "ACTIVE");
    // The subagent turn ends — a finished specialist reaches COMPLETED.
    const stop = applyEvent(rec, ev({ id: "e5", kind: "specialist_finished", workerId: "agent-p" }));
    assert.equal(stop.ok, true);
    assert.equal(agent()?.state, "COMPLETED");
  });

  it("a specialist ending while still waiting finishes — its ask is moot", () => {
    const rec = makeSolo();
    applyEvent(rec, ev({ id: "e1", kind: "specialist_joined", workerId: "agent-w" }));
    applyEvent(rec, ev({ id: "e2", kind: "permission_request", workerId: "agent-w" }));
    const agent = () => rec.snapshot.workers.find((w) => w.externalId === "agent-w");
    assert.equal(agent()?.state, "WAITING_FOR_APPROVAL");
    const stop = applyEvent(rec, ev({ id: "e3", kind: "specialist_finished", workerId: "agent-w" }));
    assert.equal(stop.ok, true);
    assert.equal(agent()?.state, "COMPLETED");
    assert.equal(rec.snapshot.needsUser, false);
    assert.equal(rec.snapshot.state, "ACTIVE");
  });
});
