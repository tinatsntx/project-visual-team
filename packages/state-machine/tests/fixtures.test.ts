import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mapCodexEvent } from "@visual-team/codex-event-mapper";
import { FIXTURE_NAMES, loadFixture } from "@visual-team/test-fixtures";
import { applyEvent, createTaskRecord } from "../src/index.ts";

/** Fixture replay: same log in, same snapshot out (Milestone 1 exit seed). */
describe("replayable fixtures", () => {
  for (const name of FIXTURE_NAMES) {
    it(`replays ${name}`, () => {
      const fixture = loadFixture(name);
      const start = fixture.steps.find((s) => s.kind === "start");
      assert.ok(start?.input, "fixture needs a start step");
      const rec = createTaskRecord(
        { ...start.input, workerRoles: start.input.workerRoles, privacyMode: start.input.privacyMode ?? "standard" },
        { taskId: `vt_fx_${name}`, startedAt: "2026-09-13T15:00:00.000Z", eventId: "evt_start" },
      );
      // Monotonic injected clock: explicit fixture `at` wins, otherwise each
      // step ticks +1s so lastActivityAt never regresses mid-replay.
      let tick = 0;
      const stepAt = (explicit?: string) =>
        explicit ?? new Date(Date.parse("2026-09-13T15:00:00.000Z") + ++tick * 1000).toISOString();
      for (const step of fixture.steps) {
        if (step.kind === "visual_event" && step.visual) {
          const r = applyEvent(rec, {
            ...step.visual,
            taskId: rec.snapshot.id,
            at: stepAt(step.visual.at),
            provenance: step.visual.provenance ?? "reported",
          } as Parameters<typeof applyEvent>[1]);
          assert.ok(r.ok, `visual event ${step.visual.id} should apply: ${r.ok ? "" : r.error}`);
          continue;
        }
        if (step.kind !== "codex_event" || !step.event) continue;
        const mapped = mapCodexEvent({
          taskId: rec.snapshot.id,
          name: step.event.name,
          at: stepAt(step.event.at),
          eventId: step.event.eventId ?? `evt_${step.event.name}`,
          ...(step.event.payload ? { payload: step.event.payload } : {}),
        });
        assert.ok(mapped.ok, `event ${step.event.name} should map`);
        for (const e of mapped.events) {
          const r = applyEvent(rec, e);
          assert.ok(r.ok, `event ${e.id} should apply: ${r.ok ? "" : r.error}`);
        }
      }
      assert.equal(rec.snapshot.state, fixture.expect.taskState);
      for (const [wid, st] of Object.entries(fixture.expect.workerStates)) {
        const w = rec.snapshot.workers.find((x) => x.id === wid || x.externalId === wid);
        assert.ok(w, `worker ${wid} should exist`);
        assert.equal(w.state, st, `worker ${wid}`);
      }
      if (fixture.expect.needsUser !== undefined) {
        assert.equal(rec.snapshot.needsUser, fixture.expect.needsUser);
      }
      if (fixture.expect.eventCount !== undefined) {
        assert.equal(rec.snapshot.eventCount, fixture.expect.eventCount);
      }
    });
  }
});
