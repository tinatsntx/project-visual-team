import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { TaskResult, VisualEvent } from "@visual-team/contracts";
import { applyEvent, createTaskRecord } from "../src/index.ts";

/**
 * Brief 011 structured reported result: the receipt may ride only on a
 * *reported* `task_finished`; every other placement or provenance — and any
 * malformed receipt — is rejected before state or journal mutation. The
 * accepted receipt lands on the terminal snapshot verbatim.
 */

const T0 = "2026-09-16T12:00:00.000Z";
const TASK_ID = "vt_receipt";

function makeActive() {
  const rec = createTaskRecord(
    { title: "Receipt task", summary: "s", mode: "solo", privacyMode: "standard" },
    { taskId: TASK_ID, startedAt: T0, eventId: "start" },
  );
  // PLANNING -> ACTIVE via a reported work claim so completion is legal.
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

const RECEIPT: TaskResult = {
  summary: "summary text",
  verification: "not_run",
  artifacts: [{ label: "ref", uri: "file:ref" }],
};

function ev(partial: Partial<VisualEvent> & Pick<VisualEvent, "id" | "kind">): VisualEvent {
  return {
    taskId: TASK_ID,
    at: T0,
    provenance: "reported",
    label: "test",
    ...partial,
  } as VisualEvent;
}

/** Snapshot and journal must be byte-identical after a rejected event. */
function assertAtomic(rec: ReturnType<typeof makeActive>, event: VisualEvent): string {
  const before = JSON.stringify(rec.snapshot);
  const events = rec.events.length;
  const r = applyEvent(rec, event);
  assert.equal(r.ok, false, "event must reject");
  assert.equal(JSON.stringify(rec.snapshot), before, "snapshot must not mutate");
  assert.equal(rec.events.length, events, "journal must not grow");
  return r.ok === false ? r.error : "";
}

describe("structured result receipt", () => {
  it("an accepted reported finish carries the receipt onto the terminal snapshot", () => {
    const rec = makeActive();
    const r = applyEvent(
      rec,
      ev({ id: "fin", kind: "task_finished", to: "COMPLETED", result: RECEIPT }),
    );
    assert.ok(r.ok && r.changed);
    assert.equal(rec.snapshot.state, "COMPLETED");
    assert.deepEqual(rec.snapshot.result, RECEIPT);
    // The event journal keeps the same receipt — replay reconstructs it.
    const finish = rec.events.find((e) => e.kind === "task_finished");
    assert.deepEqual(finish?.result, RECEIPT);
  });

  it("rejects a receipt on any other event kind", () => {
    const rec = makeActive();
    const err = assertAtomic(
      rec,
      ev({ id: "a1", kind: "activity", provenance: "observed", result: RECEIPT }),
    );
    assert.match(err, /result receipt/);
    assertAtomic(rec, ev({ id: "a2", kind: "worker_transition", to: "WORKING", result: RECEIPT }));
    assertAtomic(rec, ev({ id: "a3", kind: "task_transition", to: "COMPLETED", result: RECEIPT }));
  });

  it("rejects a receipt carried by observed or derived finishes", () => {
    const rec = makeActive();
    assertAtomic(
      rec,
      ev({ id: "o1", kind: "task_finished", to: "COMPLETED", provenance: "observed", result: RECEIPT }),
    );
    assertAtomic(
      rec,
      ev({ id: "d1", kind: "task_finished", to: "COMPLETED", provenance: "derived", result: RECEIPT }),
    );
    assert.equal(rec.snapshot.state, "ACTIVE");
  });

  it("rejects malformed receipts atomically", () => {
    const malformed: Array<[string, unknown]> = [
      ["non-object", "done"],
      ["bad verification", { verification: "passed-ish" }],
      ["non-string summary", { summary: 42 }],
      ["non-array artifacts", { artifacts: "ref" }],
      ["artifact without label", { artifacts: [{ uri: "file:x" }] }],
      ["artifact label too long", { artifacts: [{ label: "x".repeat(121) }] }],
      ["unknown receipt key", { summary: "s", confidence: 0.9 }],
      ["unknown artifact key", { artifacts: [{ label: "ref", href: "https://x" }] }],
    ];
    for (const [name, result] of malformed) {
      const rec = makeActive();
      const err = assertAtomic(
        rec,
        ev({ id: "m1", kind: "task_finished", to: "COMPLETED", result: result as TaskResult }),
      );
      assert.match(err, /result receipt/, name);
      assert.equal(rec.snapshot.result, undefined, name);
    }
  });

  it("enforces the same combined bound as the legacy detail text", () => {
    const rec = makeActive();
    // Each field is within its own limit, but together they exceed 640 —
    // the same bound mapTaskFinish applies to the detail string.
    const err = assertAtomic(
      rec,
      ev({
        id: "big",
        kind: "task_finished",
        to: "COMPLETED",
        result: {
          summary: "s".repeat(500),
          verification: "passed",
          artifacts: [{ label: "l".repeat(120), uri: "u".repeat(500) }],
        },
      }),
    );
    assert.match(err, /combined/);
    assert.equal(rec.snapshot.state, "ACTIVE");
  });

  it("a finish without metadata leaves result absent — legacy stays honest", () => {
    const rec = makeActive();
    const r = applyEvent(rec, ev({ id: "fin", kind: "task_finished", to: "COMPLETED", detail: "result: done" }));
    assert.ok(r.ok && r.changed);
    assert.equal(rec.snapshot.state, "COMPLETED");
    assert.equal(rec.snapshot.result, undefined);
  });

  it("deduplicates a receipt-bearing finish by event id and freezes the terminal task", () => {
    const rec = makeActive();
    const finish = ev({ id: "fin", kind: "task_finished", to: "COMPLETED", result: RECEIPT });
    const applied = applyEvent(rec, finish);
    assert.ok(applied.ok && applied.changed);
    const first = JSON.stringify(rec.snapshot);

    // Same id, different claimed receipt: idempotent replay, not a rewrite.
    const replay = applyEvent(
      rec,
      ev({ id: "fin", kind: "task_finished", to: "COMPLETED", result: { summary: "other" } }),
    );
    assert.equal(replay.ok, true);
    assert.equal(replay.changed, false);
    assert.equal(JSON.stringify(rec.snapshot), first);

    // A new finish event after the terminal state cannot replace the receipt.
    const late = applyEvent(
      rec,
      ev({ id: "fin2", kind: "task_finished", to: "FAILED", result: { verification: "failed" } }),
    );
    assert.equal(late.ok, false);
    assert.equal(JSON.stringify(rec.snapshot), first);
    assert.deepEqual(rec.snapshot.result, RECEIPT);
  });

  it("the stored receipt is a copy — mutating the caller's object cannot rewrite the snapshot", () => {
    const rec = makeActive();
    const receipt = { summary: "original", verification: "passed" as const };
    applyEvent(rec, ev({ id: "fin", kind: "task_finished", to: "COMPLETED", result: receipt }));
    receipt.summary = "mutated afterwards";
    assert.equal(rec.snapshot.result?.summary, "original");
  });

  it("the journaled event is detached too — caller mutation cannot rewrite history", () => {
    const rec = makeActive();
    const receipt = { artifacts: [{ label: "before" }] };
    applyEvent(rec, ev({ id: "fin", kind: "task_finished", to: "COMPLETED", result: receipt }));
    receipt.artifacts[0]!.label = "after";
    const logged = rec.events.at(-1);
    assert.equal(logged?.result?.artifacts?.[0]?.label, "before");
    assert.equal(rec.snapshot.result?.artifacts?.[0]?.label, "before");
  });
});
