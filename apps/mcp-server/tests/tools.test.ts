import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { InMemoryTaskRepository, type Clock } from "../src/repositories/memory.ts";
import { mapCodexEvent } from "@visual-team/codex-event-mapper";
import { applyEvent } from "@visual-team/state-machine";

const clock: Clock = {
  nowIso: () => "2026-09-13T15:00:00.000Z",
  nowMs: () => Date.parse("2026-09-13T15:00:00.000Z"),
};

describe("InMemoryTaskRepository", () => {
  it("creates a task with a high-entropy id and capability token", () => {
    const repo = new InMemoryTaskRepository(clock);
    const { record, capability } = repo.createTask({
      title: "t", summary: "s", mode: "solo", privacyMode: "standard",
    });
    assert.match(record.snapshot.id, /^vt_[0-9a-f]{24}$/);
    assert.match(capability, /^vtc_[0-9a-f]{48}$/);
  });

  it("verifies capabilities per task", () => {
    const repo = new InMemoryTaskRepository(clock);
    const a = repo.createTask({ title: "a", summary: "s", mode: "solo", privacyMode: "standard" });
    const b = repo.createTask({ title: "b", summary: "s", mode: "solo", privacyMode: "standard" });
    assert.equal(repo.verifyCapability(a.record.snapshot.id ? repo.get(a.record.snapshot.id)! : ({} as never), a.capability), true);
    assert.equal(repo.verifyCapability(repo.get(b.record.snapshot.id)!, a.capability), false);
  });

  it("expires a task and its capability with the repository TTL", () => {
    let nowMs = Date.parse("2026-09-13T15:00:00.000Z");
    const expiringClock: Clock = {
      nowIso: () => new Date(nowMs).toISOString(),
      nowMs: () => nowMs,
    };
    const repo = new InMemoryTaskRepository(expiringClock, 1_000);
    const { record } = repo.createTask({ title: "a", summary: "s", mode: "solo", privacyMode: "standard" });
    nowMs += 1_001;
    assert.equal(repo.get(record.snapshot.id), undefined);
  });

  it("attaches untargeted hook events to the most recent active task", () => {
    const repo = new InMemoryTaskRepository(clock);
    const { record } = repo.createTask({ title: "a", summary: "s", mode: "solo", privacyMode: "standard" });
    const stored = repo.mostRecentActive();
    assert.ok(stored);
    const mapped = mapCodexEvent({
      taskId: stored.record.snapshot.id,
      name: "PreToolUse",
      at: clock.nowIso(),
      eventId: "evt_x",
      payload: { tool_name: "shell" },
    });
    assert.ok(mapped.ok);
    repo.apply(stored, ...mapped.events);
    assert.equal(record.snapshot.state, "ACTIVE");
  });

  it("rejects events addressed to a different task across the repository boundary", () => {
    const repo = new InMemoryTaskRepository(clock);
    const a = repo.createTask({ title: "a", summary: "s", mode: "solo", privacyMode: "standard" });
    const b = repo.createTask({ title: "b", summary: "s", mode: "solo", privacyMode: "standard" });
    const stored = repo.get(a.record.snapshot.id);
    assert.ok(stored);
    const before = structuredClone(stored.record.snapshot);
    const result = repo.apply(stored, {
      id: "evt_cross",
      taskId: b.record.snapshot.id,
      at: clock.nowIso(),
      provenance: "observed",
      kind: "worker_transition",
      to: "WORKING",
      label: "Work claim aimed at another task.",
    });
    assert.equal(result.ok, false);
    assert.match(result.error ?? "", /targets task/);
    assert.deepEqual(stored.record.snapshot, before);
    assert.equal(stored.record.events.length, 1);
  });

  it("stops a batch at the first rejected event; earlier events stay applied", () => {
    const repo = new InMemoryTaskRepository(clock);
    const { record } = repo.createTask({ title: "a", summary: "s", mode: "solo", privacyMode: "standard" });
    const stored = repo.get(record.snapshot.id);
    assert.ok(stored);
    const result = repo.apply(
      stored,
      {
        id: "evt_ok",
        taskId: record.snapshot.id,
        at: clock.nowIso(),
        provenance: "reported",
        kind: "worker_transition",
        workerId: "lead",
        to: "WORKING",
        label: "Working.",
      },
      {
        id: "evt_bad",
        taskId: record.snapshot.id,
        at: clock.nowIso(),
        provenance: "observed",
        kind: "worker_transition",
        workerId: "ghost",
        to: "WORKING",
        label: "Unresolvable worker claim.",
      },
      {
        id: "evt_never",
        taskId: record.snapshot.id,
        at: clock.nowIso(),
        provenance: "observed",
        kind: "activity",
        label: "Must never be reached.",
      },
    );
    assert.equal(result.ok, false);
    assert.equal(result.changed, true); // the first event committed
    assert.equal(stored.record.snapshot.workers[0]?.state, "WORKING");
    assert.equal(stored.record.snapshot.eventCount, 2); // start + first event only
    assert.equal(stored.record.events.length, 2);
    assert.equal(stored.record.seenEventIds.has("evt_bad"), false);
    assert.equal(stored.record.seenEventIds.has("evt_never"), false);
  });

  it("readSnapshot refreshes derived flags without mutating the stored record", () => {
    let nowMs = Date.parse("2026-09-13T15:00:00.000Z");
    const driftClock: Clock = {
      nowIso: () => new Date(nowMs).toISOString(),
      nowMs: () => nowMs,
    };
    const repo = new InMemoryTaskRepository(driftClock);
    const { record } = repo.createTask({ title: "a", summary: "s", mode: "solo", privacyMode: "standard" });
    const stored = repo.get(record.snapshot.id);
    assert.ok(stored);
    applyEvent(stored.record, {
      id: "evt_work",
      taskId: record.snapshot.id,
      at: driftClock.nowIso(),
      provenance: "reported",
      kind: "worker_transition",
      workerId: "lead",
      to: "WORKING",
      label: "Working.",
    });
    nowMs += 5 * 60_000; // beyond the derived staleness window
    const view = repo.readSnapshot(stored);
    assert.equal(view.noRecentActivity, true);
    assert.equal(view.state, "ACTIVE"); // degraded display, never a failure claim
    assert.equal(stored.record.snapshot.noRecentActivity, false); // stored record untouched
  });
});
