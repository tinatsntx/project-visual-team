import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { EvidenceLevel, VisualEvent, VisualEventKind } from "@visual-team/contracts";
import {
  MAX_EVENTS_PER_TASK,
  TERMINAL_TASK_STATES,
  applyEvent,
  createTaskRecord,
  type TaskRecord,
} from "../src/index.ts";

/**
 * Deterministic property-style coverage (Milestone 1): seeded pseudo-random
 * event streams over every kind, provenance, and plausible target, checked
 * against invariants stated in PROJECT_PLAN.md §6 — independently of the
 * reducer's own transition tables. A failure prints the seed and the exact
 * event sequence so it reproduces verbatim.
 */

const T0 = Date.parse("2026-09-13T15:00:00.000Z");
const SEEDS = 64;
const MAX_STEPS = 24;

/** mulberry32 — tiny deterministic PRNG; same seed, same stream. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const KINDS: readonly VisualEventKind[] = [
  "task_started",
  "task_transition",
  "worker_assigned",
  "worker_transition",
  "activity",
  "specialist_joined",
  "specialist_finished",
  "permission_request",
  "turn_finished",
  "interrupted",
  "task_finished",
];
const PROVENANCES: readonly EvidenceLevel[] = ["observed", "reported", "derived"];
const TASK_STATES = [
  "DRAFT", "PLANNING", "ACTIVE", "WAITING_FOR_USER", "BLOCKED", "COMPLETED", "FAILED", "CANCELED",
] as const;
const WORKER_STATES = [
  "IDLE", "ASSIGNED", "PLANNING", "WORKING", "WAITING_FOR_APPROVAL", "BLOCKED", "REVIEWING",
  "COMPLETED", "FAILED", "CANCELED",
] as const;
const TARGETS = [...TASK_STATES, ...WORKER_STATES, "GIBBERISH", undefined] as const;
const WORKER_IDS = [undefined, "lead", "explorer", "builder", "reviewer", "ghost", "agent-x"] as const;

const TASK_STATE_SET = new Set<string>(TASK_STATES);
const WORKER_STATE_SET = new Set<string>(WORKER_STATES);
// Plan §6: derived evidence may never claim completion, failure, approval,
// review, or cancellation — on any path.
const FORBIDDEN_DERIVED_TASK = new Set(["COMPLETED", "FAILED", "CANCELED", "WAITING_FOR_USER"]);
const FORBIDDEN_DERIVED_WORKER = new Set([
  "COMPLETED", "FAILED", "CANCELED", "WAITING_FOR_APPROVAL", "REVIEWING",
]);
const TERMINAL_WORKER = new Set(["COMPLETED", "FAILED", "CANCELED"]);

function pick<T>(rand: () => number, pool: readonly T[]): T {
  return pool[Math.floor(rand() * pool.length)]!;
}

function generateEvents(rand: () => number, taskId: string): VisualEvent[] {
  const count = 4 + Math.floor(rand() * MAX_STEPS);
  const events: VisualEvent[] = [];
  let clock = T0 + 60_000;
  for (let i = 0; i < count; i++) {
    if (rand() < 0.15) clock -= 30_000; // occasional out-of-order timestamp
    else clock += 60_000;
    // ~15% of steps resend an earlier event — duplicate delivery coverage.
    if (events.length > 0 && rand() < 0.15) {
      const earlier = pick(rand, events);
      events.push({ ...earlier, at: new Date(clock).toISOString() });
      continue;
    }
    events.push({
      id: `s${i}_${Math.floor(rand() * 0xffff)}`,
      // ~5% of events name a different task — cross-task rejection coverage.
      taskId: rand() < 0.05 ? `${taskId}_other` : taskId,
      at: new Date(clock).toISOString(),
      provenance: pick(rand, PROVENANCES),
      kind: pick(rand, KINDS),
      label: `generated step ${i}`,
      ...(rand() < 0.7 ? { workerId: pick(rand, WORKER_IDS) } : {}),
      ...(rand() < 0.6 ? { to: pick(rand, TARGETS) as VisualEvent["to"] } : {}),
      ...(rand() < 0.3 ? { detail: `d${i}` } : {}),
    });
  }
  return events;
}

function newRecord(rand: () => number, tag: string): TaskRecord {
  const team = rand() < 0.4;
  return createTaskRecord(
    {
      title: `generated ${tag}`,
      summary: "property input",
      mode: team ? "team" : "solo",
      ...(team ? { workerRoles: ["lead", "explorer", "builder"] as const } : {}),
      privacyMode: "standard",
    },
    { taskId: `vt_prop_${tag}`, startedAt: new Date(T0).toISOString(), eventId: "evt_start" },
  );
}

interface PreImage {
  snapshot: unknown;
  snapshotState: string;
  logLength: number;
  seen: number;
}

function checkInvariants(
  rec: TaskRecord,
  event: VisualEvent,
  result: ReturnType<typeof applyEvent>,
  before: PreImage,
): void {
  if (!result.ok || !result.changed) {
    // Rejections and duplicates must leave the complete record intact.
    assert.deepEqual(rec.snapshot, before.snapshot, "record changed on a non-applied event");
    assert.equal(rec.events.length, before.logLength);
    assert.equal(rec.seenEventIds.size, before.seen);
    return;
  }
  const s = rec.snapshot;
  assert.ok(TASK_STATE_SET.has(s.state), `task state ${s.state}`);
  assert.ok(s.workers.length >= 1, "a task always has a lead");
  assert.ok(s.workers.length <= 3, "at most three visible workers");
  assert.equal(s.workers.filter((w) => w.isWriter).length, 1, "exactly one writer");
  for (const w of s.workers) assert.ok(WORKER_STATE_SET.has(w.state), `worker state ${w.state}`);
  // Counters/log: every accepted event is counted and remembered exactly once.
  assert.equal(s.eventCount, rec.seenEventIds.size);
  assert.ok(rec.events.length <= MAX_EVENTS_PER_TASK);
  assert.ok(rec.events.length <= s.eventCount);
  // Bookkeeping reflects the event just applied.
  assert.equal(s.lastActivityAt, event.at);
  assert.equal(s.updatedAt, event.at);
  assert.equal(s.noRecentActivity, false);
  // Provenance truthfulness on every stamped field.
  if (s.stateProvenance === "derived") {
    assert.ok(!FORBIDDEN_DERIVED_TASK.has(s.state), `derived claimed task ${s.state}`);
  }
  for (const w of s.workers) {
    if (w.stateProvenance === "derived") {
      assert.ok(!FORBIDDEN_DERIVED_WORKER.has(w.state), `derived claimed worker ${w.state}`);
    }
  }
  if (s.needsUser) {
    assert.ok(s.needsUserProvenance !== undefined && s.needsUserProvenance !== "derived");
  } else {
    assert.equal(s.needsUserProvenance, undefined, "stale needsUser provenance");
  }
  // Pending-need attribution: the flag and the need map never drift, derived
  // evidence never owns a need, and every waiting worker carries its ask.
  const needs = s.pendingUserNeeds ?? {};
  assert.equal(s.needsUser, Object.keys(needs).length > 0, "needsUser/pendingUserNeeds drift");
  for (const provenance of Object.values(needs)) {
    assert.notEqual(provenance, "derived", "derived provenance recorded a pending need");
  }
  for (const w of s.workers) {
    if (w.state === "WAITING_FOR_APPROVAL") {
      assert.ok(needs[`worker:${w.id}`], `waiting worker ${w.id} lacks an attributed need`);
    }
  }
  // A waiting task must hold a live need — the reverse (needs without WFU)
  // is legitimate while the task is still PLANNING or BLOCKED.
  if (s.state === "WAITING_FOR_USER") {
    assert.ok(s.needsUser, "waiting task holds no pending need");
  }
  // Terminal freeze: an event can only be applied to a terminal task via a bug.
  assert.equal(
    TERMINAL_TASK_STATES.has(before.snapshotState as Parameters<typeof TERMINAL_TASK_STATES.has>[0]),
    false,
    "an event applied to a terminal task",
  );
  if (TERMINAL_TASK_STATES.has(s.state)) {
    // A terminal task holds no pending ask and no mid-flight worker.
    assert.equal(s.needsUser, false, "terminal task still needs the user");
    assert.equal(s.needsUserProvenance, undefined);
    for (const w of s.workers) {
      assert.ok(TERMINAL_WORKER.has(w.state), `worker ${w.id} is ${w.state} under a terminal task`);
    }
  }
}

describe("seeded property checks", () => {
  it("invariants hold across generated legal and illegal sequences", () => {
    const seenKinds = new Set<string>();
    const seenProvenances = new Set<string>();
    let applied = 0;
    let rejections = 0;
    let duplicates = 0;
    let terminals = 0;
    for (let seed = 1; seed <= SEEDS; seed++) {
      const rand = rng(seed);
      const rec = newRecord(rand, `s${seed}`);
      const events = generateEvents(rand, rec.snapshot.id);
      for (const [i, event] of events.entries()) {
        seenKinds.add(event.kind);
        seenProvenances.add(event.provenance);
        const before: PreImage = {
          snapshot: structuredClone(rec.snapshot),
          snapshotState: rec.snapshot.state,
          logLength: rec.events.length,
          seen: rec.seenEventIds.size,
        };
        try {
          const result = applyEvent(rec, event);
          if (!result.ok) rejections++;
          else if (!result.changed) duplicates++;
          else {
            applied++;
            if (TERMINAL_TASK_STATES.has(rec.snapshot.state)) terminals++;
          }
          checkInvariants(rec, event, result, before);
        } catch (err) {
          console.error(
            `REPRODUCE seed=${seed} step=${i} task=${rec.snapshot.id}\n` +
              `event=${JSON.stringify(event)}\n` +
              `sequence=${JSON.stringify(events.slice(0, i + 1))}`,
          );
          throw err;
        }
      }
    }
    // Coverage floor: the corpus must actually exercise the space.
    assert.equal(seenKinds.size, KINDS.length, "not all event kinds exercised");
    assert.equal(seenProvenances.size, PROVENANCES.length);
    assert.ok(applied > 0, "no event applied");
    assert.ok(rejections > 0, "no illegal input was generated");
    assert.ok(duplicates > 0, "no duplicate delivery was generated");
    assert.ok(terminals > 0, "no terminal state was reached");
  });

  it("identical ordered input yields identical complete records", () => {
    for (let seed = 1000; seed < 1000 + 12; seed++) {
      const a = newRecord(rng(seed), `d${seed}`);
      const b = newRecord(rng(seed), `d${seed}`);
      assert.deepEqual(a.snapshot, b.snapshot); // same inputs, same start
      const events = generateEvents(rng(seed), a.snapshot.id);
      for (const event of events) {
        applyEvent(a, event);
        applyEvent(b, event);
      }
      try {
        assert.deepEqual(b.snapshot, a.snapshot);
        assert.deepEqual(b.events, a.events);
        assert.deepEqual([...b.seenEventIds].sort(), [...a.seenEventIds].sort());
        assert.equal(b.snapshot.eventCount, a.snapshot.eventCount);
      } catch (err) {
        console.error(`REPRODUCE seed=${seed}\nsequence=${JSON.stringify(events)}`);
        throw err;
      }
    }
  });

  it("the reducer never mutates the input snapshot across the corpus", () => {
    const rand = rng(424242);
    const rec = newRecord(rand, "immutable");
    for (const event of generateEvents(rand, rec.snapshot.id)) {
      const prev = rec.snapshot;
      const before = structuredClone(prev);
      applyEvent(rec, event);
      assert.deepEqual(prev, before, "the pre-apply snapshot object was mutated");
    }
  });
});
