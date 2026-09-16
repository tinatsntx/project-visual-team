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

  it("resolves untargeted events only through an observed session binding", () => {
    const repo = new InMemoryTaskRepository(clock);
    const { record } = repo.createTask({ title: "a", summary: "s", mode: "solo", privacyMode: "standard" });
    const taskId = record.snapshot.id;
    // Unbound sessions resolve to nothing — there is no recency fallback.
    assert.equal(repo.resolveBoundSession("sess-unbound"), undefined);
    repo.bindSession("sess-a", taskId);
    const stored = repo.resolveBoundSession("sess-a");
    assert.equal(stored?.record.snapshot.id, taskId);
    const mapped = mapCodexEvent({
      taskId,
      name: "PreToolUse",
      at: clock.nowIso(),
      eventId: "evt_x",
      payload: { tool_name: "shell", session_id: "sess-a" },
    });
    assert.ok(mapped.ok);
    repo.apply(stored!, ...mapped.events);
    assert.equal(record.snapshot.state, "ACTIVE");
  });

  it("resolves a child session through its agent binding and expires bindings with the task", () => {
    let nowMs = Date.parse("2026-09-13T15:00:00.000Z");
    const movingClock: Clock = {
      nowIso: () => new Date(nowMs).toISOString(),
      nowMs: () => nowMs,
    };
    const repo = new InMemoryTaskRepository(movingClock, 1_000);
    const { record } = repo.createTask({ title: "a", summary: "s", mode: "solo", privacyMode: "standard" });
    const taskId = record.snapshot.id;
    // Parent session bound; SubagentStart then introduces the child agent.
    repo.bindSession("sess-parent", taskId);
    repo.bindAgent("agent-reviewer", taskId);
    assert.equal(repo.boundTaskForSession("sess-parent"), taskId);
    assert.equal(repo.boundTaskForAgent("agent-reviewer"), taskId);
    // A later child-session event resolves via the agent id.
    const viaAgent = repo.resolveBoundAgent("agent-reviewer");
    assert.equal(viaAgent?.record.snapshot.id, taskId);
    // When the task sweeps, every binding expires with it.
    nowMs += 1_001;
    assert.equal(repo.get(taskId), undefined);
    assert.equal(repo.boundTaskForSession("sess-parent"), undefined);
    assert.equal(repo.boundTaskForAgent("agent-reviewer"), undefined);
    assert.equal(repo.resolveBoundAgent("agent-reviewer"), undefined);
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

  it("a hook agent_id colliding with a roster id resolves the specialist, not the lead", () => {
    const repo = new InMemoryTaskRepository(clock);
    const { record } = repo.createTask({ title: "a", summary: "s", mode: "solo", privacyMode: "standard" });
    const stored = repo.get(record.snapshot.id);
    assert.ok(stored);
    const join = mapCodexEvent({
      taskId: record.snapshot.id,
      name: "SubagentStart",
      at: clock.nowIso(),
      eventId: "evt_join",
      payload: { agent_id: "lead", agent_type: "review" },
    });
    assert.ok(join.ok);
    repo.apply(stored, ...join.events);
    const ask = mapCodexEvent({
      taskId: record.snapshot.id,
      name: "PermissionRequest",
      at: clock.nowIso(),
      eventId: "evt_ask",
      payload: { agent_id: "lead" },
    });
    assert.ok(ask.ok);
    repo.apply(stored, ...ask.events);
    const workers = stored.record.snapshot.workers;
    assert.equal(workers.find((w) => w.id === "lead" && !w.externalId)?.state, "ASSIGNED");
    assert.equal(workers.find((w) => w.externalId === "lead")?.state, "WAITING_FOR_APPROVAL");
    assert.equal(stored.record.snapshot.needsUser, true);
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
