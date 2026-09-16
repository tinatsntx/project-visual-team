#!/usr/bin/env node
/**
 * Replay a committed synthetic fixture through the real engine — offline,
 * with no ChatGPT, Codex, host account, or network.
 *
 *   npm run replay -- <fixture-name>
 *   npm run replay -- --list
 *   npm run replay -- --file <path-to-fixture.json>
 *
 * Uses the same `createTaskRecord` + `mapCodexEvent` + `applyEvent` path as
 * the replay tests (packages/state-machine/tests): the runner injects the
 * record's taskId and a monotonic clock, every step is applied by the real
 * reducer, each step's declared expectation is enforced, and the final
 * snapshot is compared against the fixture's recorded expectations. Output
 * marks provenance on every event — fixtures are synthetic evidence, never
 * real host activity.
 *
 * Exit 0 on a clean replay that matches expectations; exit 1 with an
 * actionable message on unknown names, unreadable/invalid fixture input, a
 * step whose actual outcome differs from its declared expectation, an
 * unexpected engine rejection, or an expectation mismatch.
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
import { readFileSync } from "node:fs";

const T0 = Date.parse("2026-09-13T15:00:00.000Z");

type StepOutcome = "applied" | "duplicate" | "rejected" | "dropped";

interface StepLine {
  id: string;
  kind: string;
  provenance: string;
  label: string;
  outcome: StepOutcome;
  /** Declared per-step expectation (sequence fixtures); enforced, not just printed. */
  expected?: StepOutcome;
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

function applyVisual(
  rec: TaskRecord,
  event: VisualEvent,
  lines: StepLine[],
  expected?: StepOutcome,
  extraNote?: string,
): void {
  const r = applyEvent(rec, event);
  const outcome: StepOutcome = !r.ok ? "rejected" : r.changed ? "applied" : "duplicate";
  const note = !r.ok
    ? r.error
    : expected && outcome !== expected
      ? `expected ${expected}`
      : extraNote;
  lines.push({
    id: event.id,
    kind: event.kind,
    provenance: event.provenance,
    label: event.label,
    outcome,
    ...(expected ? { expected } : {}),
    ...(note ? { note } : {}),
  });
}

/** Outcomes a sequence step may declare; anything else is malformed input. */
const STEP_OUTCOMES = new Set(["applied", "rejected", "duplicate"]);

/**
 * Minimum shape a fixture must have for a verified PASS: a non-empty steps
 * list of objects with string kinds, a usable start input, and a final
 * expectation block with taskState + workerStates. Without expectations
 * there is nothing to verify against — print an actionable error instead
 * of claiming a match.
 */
function validateFixtureShape(fixture: ReplayFixture | SequenceFixture, displayName: string): void {
  const bad = (msg: string): never => fail(`fixture '${displayName}': ${msg}`);
  if (fixture.name !== undefined && typeof fixture.name !== "string") {
    bad("name must be a string when present");
  }
  if (!Array.isArray(fixture.steps) || fixture.steps.length === 0) {
    bad("expected a non-empty steps[] array");
  }
  fixture.steps.forEach((s, i) => {
    if (!s || typeof s !== "object" || typeof s.kind !== "string") {
      bad(`steps[${i}] must be an object with a string kind`);
    }
  });
  const start = fixture.steps.find((s) => s.kind === "start");
  if (start?.input) {
    const inp = start.input;
    if (typeof inp.title !== "string" || typeof inp.summary !== "string" || (inp.mode !== "solo" && inp.mode !== "team")) {
      bad('start step input requires string title, string summary, and mode "solo" | "team"');
    }
  }
  const e = fixture.expect as Record<string, unknown> | undefined;
  if (!e || typeof e !== "object" || Array.isArray(e)) {
    bad("missing expect block — a verified PASS requires recorded expectations: expect: { taskState: \"<state>\", workerStates: { \"<roster id>\": \"<state>\" } }");
  }
  if (typeof e.taskState !== "string" || e.taskState.length === 0) {
    bad("expect.taskState must be a non-empty task-state string");
  }
  if (!e.workerStates || typeof e.workerStates !== "object" || Array.isArray(e.workerStates)) {
    bad("expect.workerStates must be an object mapping roster ids to worker states");
  }
  for (const [wid, st] of Object.entries(e.workerStates)) {
    if (typeof st !== "string") bad(`expect.workerStates.${wid} must be a state string`);
  }
  if (e.needsUser !== undefined && typeof e.needsUser !== "boolean") bad("expect.needsUser must be a boolean");
  if (e.eventCount !== undefined && !Number.isInteger(e.eventCount)) bad("expect.eventCount must be an integer");
  if (e.logLength !== undefined && !Number.isInteger(e.logLength)) bad("expect.logLength must be an integer");
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
  if (!start?.input) fail(`fixture '${fixture.name}' has no start step — expected a step with kind = "start" and input`);
  const rec = startRecord(start.input!, fixture.name);
  const lines: StepLine[] = [];
  const byId = new Map<string, VisualEvent>();
  let clock = T0 + 60_000;
  for (const [i, step] of fixture.steps.entries()) {
    const at = new Date(clock).toISOString();
    clock += 60_000;
    if (step.kind === "start") continue;
    const expected = step.expect ?? "applied";
    if (!STEP_OUTCOMES.has(expected)) {
      fail(`fixture '${fixture.name}' step ${i}: invalid expect '${step.expect}' — use applied | rejected | duplicate`);
    }
    if (step.kind === "event") {
      if (
        !step.event ||
        typeof step.event !== "object" ||
        typeof step.event.id !== "string" ||
        typeof step.event.kind !== "string" ||
        typeof step.event.label !== "string"
      ) {
        fail(`fixture '${fixture.name}' step ${i}: kind "event" requires string event.id, event.kind, and event.label`);
      }
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
      applyVisual(rec, e, lines, expected as StepOutcome);
    } else if (step.kind === "duplicate") {
      if (!step.of || typeof step.of !== "string") {
        fail(`fixture '${fixture.name}' step ${i}: kind "duplicate" requires the of: <event id> field`);
      }
      const original = byId.get(step.of);
      if (!original) fail(`fixture '${fixture.name}': duplicate step references unknown event id '${step.of}'`);
      applyVisual(rec, { ...original, at }, lines, expected as StepOutcome, `duplicate of ${step.of}`);
    } else {
      fail(`fixture '${fixture.name}' step ${i}: unknown kind '${step.kind}' — use start | event | duplicate`);
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
    process.stdout.write(`Available synthetic fixtures:\n${names.map((n) => `  ${n}`).join("\n")}\n\nRun: npm run replay -- <name>\nOr:  npm run replay -- --file <path-to-fixture.json>\n`);
    process.exit(arg === "--list" ? 0 : 1);
  }

  let fixture: ReplayFixture | SequenceFixture;
  let isSequence: boolean;
  let displayName = arg;
  if (arg === "--file") {
    const filePath = process.argv[3];
    if (!filePath) fail("--file requires a path to a fixture JSON file");
    let raw: unknown;
    try {
      raw = JSON.parse(readFileSync(filePath, "utf8"));
    } catch (err) {
      fail(`could not read fixture file '${filePath}': ${err instanceof Error ? err.message : String(err)}`);
    }
    if (!raw || typeof raw !== "object" || !Array.isArray((raw as ReplayFixture).steps)) {
      fail(`fixture file '${filePath}' is not a replay/sequence fixture — expected a JSON object with a steps[] array`);
    }
    fixture = raw as ReplayFixture | SequenceFixture;
    displayName = typeof fixture.name === "string" ? fixture.name : filePath;
    // Validate before shape detection touches step objects — a null or
    // non-object step must surface as an actionable error, not a TypeError.
    validateFixtureShape(fixture, displayName);
    // Shape detection: workflow fixtures carry codex_event/visual_event
    // steps; sequence fixtures carry literal event/duplicate steps.
    isSequence = !fixture.steps.some((s) => s.kind === "codex_event" || s.kind === "visual_event");
  } else {
    isSequence = (SEQUENCE_FIXTURE_NAMES as readonly string[]).includes(arg);
    const isReplay = (FIXTURE_NAMES as readonly string[]).includes(arg);
    if (!isSequence && !isReplay) {
      fail(`unknown fixture '${arg}'. Run \`npm run replay -- --list\` for the committed synthetic fixtures.`);
    }
    try {
      fixture = isSequence ? loadSequenceFixture(arg) : loadFixture(arg);
    } catch (err) {
      fail(`could not load fixture '${arg}': ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const description = fixture.description ?? "";
  fixture.name ??= displayName;
  if (arg !== "--file") validateFixtureShape(fixture, displayName);
  let rec: TaskRecord;
  let lines: StepLine[];
  try {
    ({ rec, lines } = isSequence
      ? runSequenceFixture(fixture as SequenceFixture)
      : runReplayFixture(fixture as ReplayFixture));
  } catch (err) {
    // Unexpected engine/input errors surface as actionable text, never a
    // bare stack trace.
    fail(`replay of '${displayName}' failed: ${err instanceof Error ? err.message : String(err)}`);
  }
  const expect = fixture.expect;

  const snap = rec.snapshot;
  process.stdout.write(`Fixture: ${displayName}${description ? ` — ${description}` : ""}\n`);
  process.stdout.write(`[synthetic fixture replayed through the real engine — not real host activity]\n\n`);

  const counts = { applied: 0, duplicate: 0, rejected: 0, dropped: 0 };
  const mismatched: StepLine[] = [];
  for (const l of lines) {
    counts[l.outcome]++;
    if (l.expected && l.outcome !== l.expected) mismatched.push(l);
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

  // A step whose actual outcome differs from its declared expectation is a
  // failure even when the final snapshot happens to match.
  if (mismatched.length > 0) {
    process.stderr.write(
      `\nreplay: ${mismatched.length} step outcome(s) differ from their declared expect in '${displayName}':\n` +
        mismatched.map((m) => `  - ${m.id}: expected ${m.expected}, engine produced ${m.outcome}`).join("\n") +
        "\n",
    );
    process.exit(1);
  }
  const mismatches = checkExpect(rec, expect);
  if (mismatches.length > 0) {
    process.stderr.write(`\nreplay: expectation mismatch for '${displayName}':\n${mismatches.map((m) => `  - ${m}`).join("\n")}\n`);
    process.exit(1);
  }
  // Rejections are fine only when declared: an unexpected engine rejection is
  // a real signal even when the final expectations happened to match.
  const unexpected = lines.filter((l) => l.outcome === "rejected" && l.expected !== "rejected");
  if (unexpected.length > 0) {
    process.stderr.write(
      `\nreplay: ${unexpected.length} unexpected engine rejection(s) in '${displayName}':\n` +
        unexpected.map((u) => `  - ${u.id}: ${u.note ?? "rejected"}`).join("\n") +
        "\n",
    );
    process.exit(1);
  }
  process.stdout.write(`\nexpect: PASS — final snapshot matches the fixture's recorded expectations\n`);
}

main();
