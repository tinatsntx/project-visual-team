import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { VisualEvent } from "@visual-team/contracts";
import {
  SEQUENCE_FIXTURE_NAMES,
  loadSequenceFixture,
  type SequenceFixture,
} from "@visual-team/test-fixtures";
import {
  MAX_EVENTS_PER_TASK,
  applyEvent,
  createTaskRecord,
  type TaskRecord,
} from "../src/index.ts";

const T0 = Date.parse("2026-09-13T15:00:00.000Z");

function freshRecord(fixture: SequenceFixture): TaskRecord {
  const start = fixture.steps.find((s) => s.kind === "start");
  assert.ok(start?.input, "fixture needs a start step");
  return createTaskRecord(
    { ...start.input, privacyMode: start.input.privacyMode ?? "standard" },
    { taskId: `vt_seq_${fixture.name}`, startedAt: new Date(T0).toISOString(), eventId: "evt_start" },
  );
}

/**
 * Expand a fixture into the complete ordered event list. The runner injects
 * taskId and a monotonic `at`; a duplicate step resends the original event
 * verbatim except for its (later) timestamp — the id is what must dedupe.
 */
function buildEvents(fixture: SequenceFixture, taskId: string): VisualEvent[] {
  const byId = new Map<string, VisualEvent>();
  const ordered: VisualEvent[] = [];
  let clock = T0 + 60_000;
  for (const step of fixture.steps) {
    const at = new Date(clock).toISOString();
    clock += 60_000;
    if (step.kind === "event" && step.event) {
      const e: VisualEvent = {
        id: step.event.id,
        taskId,
        at,
        provenance: step.event.provenance ?? "observed",
        kind: step.event.kind,
        label: step.event.label,
        ...(step.event.workerId !== undefined ? { workerId: step.event.workerId } : {}),
        ...(step.event.to !== undefined ? { to: step.event.to as VisualEvent["to"] } : {}),
        ...(step.event.detail !== undefined ? { detail: step.event.detail } : {}),
      };
      byId.set(e.id, e);
      ordered.push(e);
    } else if (step.kind === "duplicate" && step.of) {
      const original = byId.get(step.of);
      assert.ok(original, `duplicate step references unknown event ${step.of}`);
      ordered.push({ ...original, at });
    }
  }
  return ordered;
}

interface RecordShape {
  snapshot: unknown;
  events: VisualEvent[];
  seenEventIds: string[];
}

/** The complete record state a replay must reproduce. */
function shape(rec: TaskRecord): RecordShape {
  return {
    snapshot: rec.snapshot,
    events: rec.events,
    seenEventIds: [...rec.seenEventIds].sort(),
  };
}

function applyWithExpectation(rec: TaskRecord, event: VisualEvent, expect: string, ctx: string): void {
  const before = {
    snapshot: structuredClone(rec.snapshot),
    logLength: rec.events.length,
    seen: rec.seenEventIds.size,
  };
  const r = applyEvent(rec, event);
  if (expect === "rejected") {
    assert.equal(r.ok, false, `${ctx}: expected rejection`);
    assert.deepEqual(rec.snapshot, before.snapshot, `${ctx}: rejection must not change the snapshot`);
    assert.equal(rec.events.length, before.logLength, `${ctx}: rejection must not log`);
    assert.equal(rec.seenEventIds.size, before.seen, `${ctx}: rejection must not mark seen`);
    return;
  }
  assert.equal(r.ok, true, `${ctx}: expected apply, got ${r.ok ? "" : r.error}`);
  if (expect === "duplicate") {
    assert.equal(r.changed, false, `${ctx}: expected dedup no-op`);
    assert.deepEqual(rec.snapshot, before.snapshot, `${ctx}: duplicate must not change the snapshot`);
    assert.equal(rec.events.length, before.logLength);
  } else {
    assert.equal(r.changed, true, `${ctx}: expected a real apply`);
  }
}

function checkExpectations(rec: TaskRecord, fixture: SequenceFixture): void {
  assert.equal(rec.snapshot.state, fixture.expect.taskState, "final task state");
  for (const [wid, state] of Object.entries(fixture.expect.workerStates)) {
    const w = rec.snapshot.workers.find((x) => x.id === wid || x.externalId === wid);
    assert.equal(w?.state, state, `worker ${wid}`);
  }
  if (fixture.expect.needsUser !== undefined) {
    assert.equal(rec.snapshot.needsUser, fixture.expect.needsUser);
  }
  if (fixture.expect.eventCount !== undefined) {
    assert.equal(rec.snapshot.eventCount, fixture.expect.eventCount);
  }
  if (fixture.expect.logLength !== undefined) {
    assert.equal(rec.events.length, fixture.expect.logLength);
  }
}

describe("replayable event sequences (Milestone 1)", () => {
  for (const name of SEQUENCE_FIXTURE_NAMES) {
    it(`replays ${name} deterministically into fresh records`, () => {
      const fixture = loadSequenceFixture(name);

      // First pass asserts each step's expected outcome.
      const first = freshRecord(fixture);
      const events = buildEvents(fixture, first.snapshot.id);
      const steps = fixture.steps.filter((s) => s.kind !== "start");
      assert.equal(events.length, steps.length);
      steps.forEach((step, i) => {
        applyWithExpectation(first, events[i]!, step.expect ?? "applied", `${name} step ${i}`);
      });
      checkExpectations(first, fixture);

      // Second pass replays the identical ordered input into a fresh record
      // and compares the complete record: snapshot, accepted log, counters,
      // provenance, and dedup state.
      const second = freshRecord(fixture);
      for (const event of events) applyEvent(second, event);
      assert.deepEqual(shape(second), shape(first), `${name}: replay diverged`);
    });
  }

  it("duplicate ids dedupe beyond the retained log window", () => {
    const rec = createTaskRecord(
      { title: "t", summary: "s", mode: "solo", privacyMode: "standard" },
      { taskId: "vt_seq_window", startedAt: new Date(T0).toISOString(), eventId: "evt_start" },
    );
    const first = {
      id: "ev_0",
      taskId: rec.snapshot.id,
      at: new Date(T0 + 60_000).toISOString(),
      provenance: "observed",
      kind: "activity",
      label: "first",
    } satisfies VisualEvent;
    applyEvent(rec, first);
    for (let i = 1; i <= MAX_EVENTS_PER_TASK + 20; i++) {
      const r = applyEvent(rec, {
        id: `ev_${i}`,
        taskId: rec.snapshot.id,
        at: new Date(T0 + (i + 1) * 60_000).toISOString(),
        provenance: "observed",
        kind: "activity",
        label: `activity ${i}`,
      });
      assert.equal(r.ok, true);
    }
    // The retained log is trimmed, but dedup state is not: the trimmed first
    // event still dedupes. The log tail is not a full replay source.
    assert.equal(rec.events.length, MAX_EVENTS_PER_TASK);
    assert.equal(rec.snapshot.eventCount, MAX_EVENTS_PER_TASK + 22);
    assert.equal(rec.seenEventIds.has("ev_0"), true);
    const dup = applyEvent(rec, { ...first, at: new Date().toISOString() });
    assert.equal(dup.ok, true);
    assert.equal(dup.ok && dup.changed, false);
    assert.equal(rec.snapshot.eventCount, MAX_EVENTS_PER_TASK + 22);
  });
});
