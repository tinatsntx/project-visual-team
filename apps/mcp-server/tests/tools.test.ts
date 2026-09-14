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
});
