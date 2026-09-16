import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { WORKFLOW_PHASE_EVENT, type VisualEvent, type WorkflowPhase } from "@visual-team/contracts";
import { applyEvent, createTaskRecord, MAX_EVENTS_PER_TASK } from "../src/index.ts";

/**
 * Brief 011 review §4 — the reported workflow phase persists on the snapshot
 * separately from the lifecycle state and the latest activity line. Only a
 * reported event may carry it; observed/derived phase claims reject
 * atomically. The retained phase survives generic native activity, log
 * trimming, and terminal freeze — and never fabricates a phase for older
 * snapshots.
 */

const T0 = "2026-09-16T12:00:00.000Z";
const TASK_ID = "vt_phase";

function makeActive() {
  const rec = createTaskRecord(
    { title: "Phase task", summary: "s", mode: "solo", privacyMode: "standard" },
    { taskId: TASK_ID, startedAt: T0, eventId: "start" },
  );
  const r = applyEvent(rec, {
    id: "work",
    taskId: TASK_ID,
    at: T0,
    kind: "worker_transition",
    workerId: "lead",
    to: "WORKING",
    provenance: "reported",
    label: "work",
  });
  assert.ok(r.ok && r.changed);
  return rec;
}

function ev(partial: Partial<VisualEvent> & Pick<VisualEvent, "id" | "kind">): VisualEvent {
  return {
    taskId: TASK_ID,
    at: T0,
    provenance: "reported",
    label: "test",
    ...partial,
  } as VisualEvent;
}

describe("retained reported phase", () => {
  it("an accepted reported phase lands on the snapshot with provenance and time", () => {
    const rec = makeActive();
    const at = "2026-09-16T12:05:00.000Z";
    const r = applyEvent(
      rec,
      ev({ id: "ph", kind: "worker_transition", workerId: "lead", to: "WORKING", phase: "testing", at }),
    );
    assert.ok(r.ok);
    assert.deepEqual(rec.snapshot.phase, { name: "testing", provenance: "reported", at });
  });

  it("later generic native activity does not overwrite the reported phase", () => {
    const rec = makeActive();
    applyEvent(rec, ev({ id: "ph", kind: "worker_transition", workerId: "lead", to: "WORKING", phase: "testing" }));
    const r = applyEvent(
      rec,
      ev({
        id: "hook",
        kind: "activity",
        workerId: "lead",
        provenance: "observed",
        label: "tool ran",
        at: "2026-09-16T12:09:00.000Z",
      }),
    );
    assert.ok(r.ok);
    assert.equal(rec.snapshot.phase?.name, "testing");
    assert.equal(rec.snapshot.lastActivityAt, "2026-09-16T12:09:00.000Z");
  });

  it("observed and derived phase claims reject atomically", () => {
    for (const provenance of ["observed", "derived"] as const) {
      const rec = makeActive();
      const before = JSON.stringify(rec.snapshot);
      const events = rec.events.length;
      const r = applyEvent(
        rec,
        ev({ id: `bad-${provenance}`, kind: "activity", provenance, phase: "testing" }),
      );
      assert.equal(r.ok, false);
      assert.match(r.ok === false ? r.error : "", /phase/);
      assert.equal(JSON.stringify(rec.snapshot), before);
      assert.equal(rec.events.length, events);
    }
  });

  it("a phase may only ride its matching workflow event — others reject atomically", () => {
    const cases = [
      // A completed claim cannot piggyback a working transition.
      ["phase on an unrelated activity", { kind: "activity", phase: "completed" }],
      ["terminal claim on a working transition", { kind: "worker_transition", to: "WORKING", phase: "completed" }],
      ["a working phase cannot ride a terminal outcome", { kind: "task_finished", to: "COMPLETED", phase: "testing" }],
      ["the terminal outcome must match the phase", { kind: "task_finished", to: "COMPLETED", phase: "failed" }],
      ["reviewing requires the reviewing transition", { kind: "worker_transition", to: "WORKING", phase: "reviewing" }],
      ["planning requires the planning transition", { kind: "worker_transition", to: "WORKING", phase: "planning" }],
      ["waiting_for_user is a task transition", { kind: "worker_transition", to: "WAITING_FOR_APPROVAL", phase: "waiting_for_user" }],
    ] as const satisfies ReadonlyArray<readonly [string, Partial<VisualEvent>]>;
    for (const [name, partial] of cases) {
      const rec = makeActive();
      const before = JSON.stringify(rec.snapshot);
      const events = rec.events.length;
      const r = applyEvent(rec, ev({ id: `bad-${name}`, ...partial }));
      assert.equal(r.ok, false, `${name}: ${r.ok ? "accepted" : r.error}`);
      assert.equal(JSON.stringify(rec.snapshot), before, name);
      assert.equal(rec.events.length, events, name);
    }
  });

  it("rejects a phase value that is not a workflow phase", () => {
    const rec = makeActive();
    const before = JSON.stringify(rec.snapshot);
    const r = applyEvent(
      rec,
      ev({ id: "bad-value", kind: "worker_transition", to: "WORKING", phase: "not-a-workflow-phase" as WorkflowPhase }),
    );
    assert.equal(r.ok, false);
    assert.match(r.ok === false ? r.error : "", /unknown workflow phase/);
    assert.equal(JSON.stringify(rec.snapshot), before);
  });

  it("every valid phase lands on its matching workflow event", () => {
    for (const [phase, shape] of Object.entries(WORKFLOW_PHASE_EVENT)) {
      // `planning` is only legal from ASSIGNED — use a fresh record for it.
      const rec =
        phase === "planning"
          ? createTaskRecord(
              { title: "Phase task", summary: "s", mode: "solo", privacyMode: "standard" },
              { taskId: TASK_ID, startedAt: T0, eventId: `start-${phase}` },
            )
          : makeActive();
      const r = applyEvent(
        rec,
        ev({ id: `ok-${phase}`, kind: shape.kind, to: shape.to, phase: phase as WorkflowPhase }),
      );
      assert.equal(r.ok, true, `${phase}: ${r.ok ? "" : r.error}`);
      assert.equal(rec.snapshot.phase?.name, phase);
    }
  });

  it("a reported phase survives retained-log trimming — it is snapshot state", () => {
    const rec = makeActive();
    applyEvent(rec, ev({ id: "ph", kind: "worker_transition", workerId: "lead", to: "REVIEWING", phase: "reviewing" }));
    for (let i = 0; i < MAX_EVENTS_PER_TASK + 10; i++) {
      applyEvent(rec, ev({ id: `fill-${i}`, kind: "activity", label: `a${i}` }));
    }
    assert.equal(rec.events.length, MAX_EVENTS_PER_TASK);
    assert.equal(rec.events.at(0)?.id !== "ph", true, "phase event was trimmed from the log");
    assert.equal(rec.snapshot.phase?.name, "reviewing");
  });

  it("a duplicate phase event id is idempotent; the phase is frozen with the terminal snapshot", () => {
    const rec = makeActive();
    const phaseEvent = ev({
      id: "fin",
      kind: "task_finished",
      to: "COMPLETED",
      phase: "completed",
    });
    const first = applyEvent(rec, phaseEvent);
    assert.ok(first.ok && first.changed);
    assert.equal(rec.snapshot.phase?.name, "completed");
    const snapshotJson = JSON.stringify(rec.snapshot);
    // Replay of the same event id changes nothing.
    const replay = applyEvent(rec, ev({ ...phaseEvent, phase: "testing" }));
    assert.equal(replay.ok, true);
    assert.equal(replay.changed, false);
    // A new phase-bearing event on a frozen task rejects.
    const late = applyEvent(rec, ev({ id: "late", kind: "task_finished", phase: "testing" }));
    assert.equal(late.ok, false);
    assert.equal(JSON.stringify(rec.snapshot), snapshotJson);
  });

  it("a task that never received a phase keeps it absent — display reads not provided", () => {
    const rec = makeActive();
    assert.equal(rec.snapshot.phase, undefined);
  });
});
