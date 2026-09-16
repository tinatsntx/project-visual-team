#!/usr/bin/env node
/**
 * Replay a committed synthetic fixture through the real engine — offline,
 * with no ChatGPT, Codex, host account, or network.
 *
 *   npm run replay -- <fixture-name>
 *   npm run replay -- --list
 *
 * Uses the same `createTaskRecord` + `mapCodexEvent` + `applyEvent` path as
 * the replay tests (packages/state-machine/tests): the runner injects the
 * record's taskId and a monotonic clock, every step is applied by the real
 * reducer, and the final snapshot is compared against the fixture's recorded
 * expectations. Output marks provenance on every event — fixtures are
 * synthetic evidence, never real host activity.
 *
 * Exit 0 on a clean replay that matches expectations; exit 1 with an
 * actionable message on unknown names, unreadable/invalid fixture input, a
 * step the engine rejects, or an expectation mismatch.
 */

import { mapCodexEvent } from "@visual-team/codex-event-mapper";
import {
  applyEvent,
  createTaskRecord,
  type TaskRecord,
} from "@visual-team/state-machine";
import {
  FIXTURE_NAMES,
  SEQUENCE_FIXTURE_NAMES,
  loadFixture,
  loadSequenceFixture,
  type ReplayFixture,
  type SequenceFixture,
} from "@visual-team/test-fixtures";
import type { VisualEvent } from "@visual-team/contracts";

const T0 = Date.parse("2026-09-13T15:00:00.000Z");

interface StepLine {
  id: string;
  kind: string;
  provenance: string;
  label: string;
  outcome: "applied" | "duplicate" | "rejected" | "dropped";
  note?: string;
}

function fail(message: string): never {
  process.stderr.write(`replay: ${message}\n`);
  process.exit(1);
}

function startRecord(input: NonNullable<ReplayFixture["steps"][number]["input"]>, name: string): TaskRecord {
  return createTaskRecord(
    { ...input, privacyMode: input.privacyMode ?? "standard" },
    { taskId: `vt_replay_${name}`, startedAt: new Date(T0).toISOString(), eventId: "evt_start" },
  );
}

function applyVisual(rec: TaskRecord, event: VisualEvent, lines: StepLine[], note?: string): void {
  const r = applyEvent(rec, event);
  if (!r.ok) {
    lines.push({ id: event.id, kind: event.kind, provenance: event.provenance, label: event.label, outcome: "rejected", note: r.error });
    return;
  }
  lines.push({
    id: event.id,
    kind: event.kind,
    provenance: event.provenance,
    label: event.label,
    outcome: r.changed ? "applied" : "duplicate",
    ...(note ? { note } : {}),
  });
}

function runReplayFixture(fixture: ReplayFixture): { rec: TaskRecord; lines: StepLine[] } {
  const start = fixture.steps.find((s) => s.kind === "start");
  if (!start?.input) fail(`fixture '${fixture.name}' has no start step — expected steps[0].kind = "start" with input`);
  const rec = startRecord(start.input!, fixture.name);
  const lines: StepLine[] = [];
  let tick = 0;
  const stepAt = (explicit?: string) => explicit ?? new Date(T0 + ++tick * 1000).toISOString();
  for (const step of fixture.steps) {
    if (step.kind === "start") continue;
    if (step.kind === "visual_event" && step.visual) {
      applyVisual(rec, {
        ...step.visual,
        taskId: rec.snapshot.id,
        at: stepAt(step.visual.at),
        provenance: step.visual.provenance ?? "reported",
      } as VisualEvent, lines);
      continue;
    }
    if (step.kind === "codex_event" && step.event) {
      const mapped = mapCodexEvent({
        taskId: rec.snapshot.id,
        name: step.event.name,
        at: stepAt(step.event.at),
        eventId: step.event.eventId ?? `evt_${step.event.name}_${lines.length}`,
        ...(step.event.payload ? { payload: step.event.payload } : {}),
      });
      if (!mapped.ok) {
        lines.push({
          id: step.event.eventId ?? `evt_${step.event.name}_${lines.length}`,
          kind: step.event.name,
          provenance: "observed",
          label: "(not recorded)",
          outcome: "dropped",
          note: mapped.reason,
        });
        continue;
      }
      for (const e of mapped.events) applyVisual(rec, e, lines);
      continue;
    }
    fail(`fixture '${fixture.name}' has a step with kind '${step.kind}' but no event payload`);
  }
  return { rec, lines };
}

function runSequenceFixture(fixture: SequenceFixture): { rec: TaskRecord; lines: StepLine[] } {
  const start = fixture.steps.find((s) => s.kind === "start");
  if (!start?.input) fail(`fixture '${fixture.name}' has no start step — expected steps[0].kind = "start" with input`);
  const rec = startRecord(start.input!, fixture.name);
  const lines: StepLine[] = [];
  const byId = new Map<string, VisualEvent>();
  let clock = T0 + 60_000;
  for (const step of fixture.steps) {
    const at = new Date(clock).toISOString();
    clock += 60_000;
    if (step.kind === "event" && step.event) {
      const e: VisualEvent = {
        id: step.event.id,
        taskId: rec.snapshot.id,
        at,
        provenance: step.event.provenance ?? "observed",
        kind: step.event.kind,
        label: step.event.label,
        ...(step.event.workerId !== undefined ? { workerId: step.event.workerId } : {}),
        ...(step.event.to !== undefined ? { to: step.event.to as VisualEvent["to"] } : {}),
        ...(step.event.detail !== undefined ? { detail: step.event.detail } : {}),
      };
      byId.set(e.id, e);
      applyVisual(rec, e, lines, step.expect ? `expected ${step.expect}` : undefined);
    } else if (step.kind === "duplicate" && step.of) {
      const original = byId.get(step.of);
      if (!original) fail(`fixture '${fixture.name}': duplicate step references unknown event id '${step.of}'`);
      applyVisual(rec, { ...original, at }, lines, `duplicate of ${step.of}`);
    }
  }
  return { rec, lines };
}

function checkExpect(rec: TaskRecord, expect: ReplayFixture["expect"] | SequenceFixture["expect"]): string[] {
  const mismatches: string[] = [];
  if (rec.snapshot.state !== expect.taskState) {
    mismatches.push(`taskState: expected ${expect.taskState}, got ${rec.snapshot.state}`);
  }
  for (const [wid, state] of Object.entries(expect.workerStates)) {
    const w = rec.snapshot.workers.find((x) => x.id === wid || x.externalId === wid);
    if (!w) mismatches.push(`worker ${wid}: not on roster`);
    else if (w.state !== state) mismatches.push(`worker ${wid}: expected ${state}, got ${w.state}`);
  }
  if (expect.needsUser !== undefined && rec.snapshot.needsUser !== expect.needsUser) {
    mismatches.push(`needsUser: expected ${expect.needsUser}, got ${rec.snapshot.needsUser}`);
  }
  if (expect.eventCount !== undefined && rec.snapshot.eventCount !== expect.eventCount) {
    mismatches.push(`eventCount: expected ${expect.eventCount}, got ${rec.snapshot.eventCount}`);
  }
  if ("logLength" in expect && expect.logLength !== undefined && rec.events.length !== expect.logLength) {
    mismatches.push(`logLength: expected ${expect.logLength}, got ${rec.events.length}`);
  }
  return mismatches;
}

function main(): void {
  const arg = process.argv[2];
  if (!arg || arg === "--list") {
    const names = [...FIXTURE_NAMES, ...SEQUENCE_FIXTURE_NAMES];
    process.stdout.write(`Available synthetic fixtures:\n${names.map((n) => `  ${n}`).join("\n")}\n\nRun: npm run replay -- <name>\n`);
    process.exit(arg === "--list" ? 0 : 1);
  }

  const isSequence = (SEQUENCE_FIXTURE_NAMES as readonly string[]).includes(arg);
  const isReplay = (FIXTURE_NAMES as readonly string[]).includes(arg);
  if (!isSequence && !isReplay) {
    fail(`unknown fixture '${arg}'. Run \`npm run replay -- --list\` for the committed synthetic fixtures.`);
  }

  let rec: TaskRecord;
  let lines: StepLine[];
  let expect: ReplayFixture["expect"];
  let description = "";
  try {
    if (isSequence) {
      const fixture = loadSequenceFixture(arg);
      description = fixture.description;
      ({ rec, lines } = runSequenceFixture(fixture));
      expect = fixture.expect;
    } else {
      const fixture = loadFixture(arg);
      description = fixture.description;
      ({ rec, lines } = runReplayFixture(fixture));
      expect = fixture.expect;
    }
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("replay:")) throw err;
    fail(`could not load fixture '${arg}': ${err instanceof Error ? err.message : String(err)}`);
  }

  const snap = rec!.snapshot;
  process.stdout.write(`Fixture: ${arg}${description ? ` — ${description}` : ""}\n`);
  process.stdout.write(`[synthetic fixture replayed through the real engine — not real host activity]\n\n`);

  const counts = { applied: 0, duplicate: 0, rejected: 0, dropped: 0 };
  for (const l of lines!) {
    counts[l.outcome]++;
    const mark = { applied: "+", duplicate: "=", rejected: "!", dropped: "x" }[l.outcome];
    const note = l.note ? `  [${l.note}]` : "";
    process.stdout.write(`  ${mark} ${l.id.padEnd(28)} ${l.kind.padEnd(20)} ${l.provenance.padEnd(9)} ${l.label}${note}\n`);
  }

  process.stdout.write(`\nFinal snapshot (event count ${snap.eventCount}):\n`);
  process.stdout.write(`  task       ${snap.state} (provenance: ${snap.stateProvenance})\n`);
  for (const w of snap.workers) {
    const ext = w.externalId ? ` external:${w.externalId}` : "";
    process.stdout.write(`  worker     ${w.label} [${w.role}]${ext} — ${w.state} (${w.stateProvenance})\n`);
  }
  const needs = snap.pendingUserNeeds
    ? ` ${JSON.stringify(snap.pendingUserNeeds)}`
    : "";
  process.stdout.write(`  needsUser  ${snap.needsUser}${snap.needsUserProvenance ? ` (${snap.needsUserProvenance})` : ""}${needs}\n`);
  process.stdout.write(`  steps      ${counts.applied} applied · ${counts.duplicate} duplicate · ${counts.rejected} rejected · ${counts.dropped} dropped\n`);

  const mismatches = checkExpect(rec!, expect!);
  if (mismatches.length > 0) {
    process.stderr.write(`\nreplay: expectation mismatch for '${arg}':\n${mismatches.map((m) => `  - ${m}`).join("\n")}\n`);
    process.exit(1);
  }
  if (counts.rejected > 0) {
    // A step the engine rejected that the fixture expected to apply is a
    // real signal — report it even when final expectations happened to match.
    const bad = lines!.filter((l) => l.outcome === "rejected");
    process.stderr.write(`\nreplay: ${bad.length} step(s) rejected by the engine in '${arg}' — inspect before trusting this fixture.\n`);
    process.exit(1);
  }
  process.stdout.write(`\nexpect: PASS — final snapshot matches the fixture's recorded expectations\n`);
}

main();
