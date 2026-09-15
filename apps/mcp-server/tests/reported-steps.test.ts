import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { InMemoryTaskRepository, type Clock } from "../src/repositories/memory.ts";
import { mapTaskFinish, mapWorkflowPhase } from "../src/reported-steps.ts";
import type { WorkflowPhase } from "@visual-team/contracts";

const clock: Clock = {
  nowIso: () => "2026-09-14T00:00:00.000Z",
  nowMs: () => Date.parse("2026-09-14T00:00:00.000Z"),
};

function startSolo(repo: InMemoryTaskRepository) {
  const { record } = repo.createTask({
    title: "t",
    summary: "s",
    mode: "solo",
    privacyMode: "standard",
  });
  const stored = repo.get(record.snapshot.id);
  assert.ok(stored);
  return stored;
}

function report(taskId: string, phase: WorkflowPhase, eventId: string) {
  return mapWorkflowPhase({ taskId, phase, at: clock.nowIso(), eventId });
}

describe("reported workflow boundaries", () => {
  it("moves worker and task truthfully with reported provenance", () => {
    const repo = new InMemoryTaskRepository(clock);
    const stored = startSolo(repo);
    const taskId = stored.record.snapshot.id;
    assert.equal(stored.record.snapshot.state, "PLANNING");

    const applied = repo.apply(stored, report(taskId, "implementing", "e1"));
    assert.equal(applied.ok, true);
    assert.equal(stored.record.snapshot.state, "ACTIVE");
    assert.equal(stored.record.snapshot.stateProvenance, "reported");
    assert.equal(stored.record.snapshot.workers[0]?.state, "WORKING");

    assert.equal(repo.apply(stored, report(taskId, "waiting_for_user", "e2")).ok, true);
    assert.equal(stored.record.snapshot.state, "WAITING_FOR_USER");

    assert.equal(repo.apply(stored, report(taskId, "testing", "e3")).ok, true);
    assert.equal(stored.record.snapshot.state, "ACTIVE");
    assert.equal(stored.record.snapshot.workers[0]?.state, "WORKING");
  });

  it("reaches a truthful terminal state and rejects later reports", () => {
    const repo = new InMemoryTaskRepository(clock);
    const stored = startSolo(repo);
    const taskId = stored.record.snapshot.id;

    repo.apply(stored, report(taskId, "implementing", "e1"));
    const applied = repo.apply(stored, report(taskId, "completed", "e2"));
    assert.equal(applied.ok, true);
    assert.equal(stored.record.snapshot.state, "COMPLETED");
    assert.equal(stored.record.snapshot.stateProvenance, "reported");
    assert.equal(stored.record.snapshot.workers[0]?.state, "COMPLETED");

    const late = repo.apply(stored, report(taskId, "testing", "e3"));
    assert.equal(late.ok, false);
    assert.equal(stored.record.snapshot.state, "COMPLETED");
  });

  it("rejects reported completion from PLANNING but allows reported failure", () => {
    const repoA = new InMemoryTaskRepository(clock);
    const completing = startSolo(repoA);
    const done = repoA.apply(
      completing,
      mapTaskFinish({
        taskId: completing.record.snapshot.id,
        outcome: "completed",
        at: clock.nowIso(),
        eventId: "f1",
      }),
    );
    assert.equal(done.ok, false);
    assert.equal(completing.record.snapshot.state, "PLANNING");

    const repoB = new InMemoryTaskRepository(clock);
    const failing = startSolo(repoB);
    const failed = repoB.apply(
      failing,
      mapTaskFinish({
        taskId: failing.record.snapshot.id,
        outcome: "failed",
        at: clock.nowIso(),
        eventId: "f1",
      }),
    );
    assert.equal(failed.ok, true);
    assert.equal(failing.record.snapshot.state, "FAILED");
  });

  it("rejects an unsupported reported transition", () => {
    const repo = new InMemoryTaskRepository(clock);
    const stored = startSolo(repo);
    const taskId = stored.record.snapshot.id;
    // waiting_for_user is only reachable from ACTIVE; PLANNING rejects it.
    const applied = repo.apply(stored, report(taskId, "waiting_for_user", "e1"));
    assert.equal(applied.ok, false);
    assert.equal(stored.record.snapshot.state, "PLANNING");
  });

  it("deduplicates replays by event id", () => {
    const repo = new InMemoryTaskRepository(clock);
    const stored = startSolo(repo);
    const taskId = stored.record.snapshot.id;
    const before = stored.record.snapshot.eventCount;

    assert.equal(repo.apply(stored, report(taskId, "implementing", "e1")).changed, true);
    const replay = repo.apply(stored, report(taskId, "implementing", "e1"));
    assert.equal(replay.ok, true);
    assert.equal(replay.changed, false);
    assert.equal(stored.record.snapshot.eventCount, before + 1);
  });

  it("keeps finish detail to bounded result labels and references", () => {
    const repo = new InMemoryTaskRepository(clock);
    const stored = startSolo(repo);
    const taskId = stored.record.snapshot.id;
    repo.apply(stored, report(taskId, "implementing", "e1"));

    const event = mapTaskFinish({
      taskId,
      outcome: "completed",
      summary: "Smoke test passed",
      verification: "passed",
      artifacts: [{ label: "PR #12", uri: "https://example.test/pr/12" }],
      at: clock.nowIso(),
      eventId: "f1",
    });
    assert.equal(repo.apply(stored, event).ok, true);
    assert.match(event.detail ?? "", /result: Smoke test passed; verification: passed; artifacts: PR #12/);
    assert.ok((event.detail ?? "").length <= 500);

    const bare = mapTaskFinish({ taskId, outcome: "completed", at: clock.nowIso(), eventId: "f2" });
    assert.equal(bare.detail, undefined);
  });
});
