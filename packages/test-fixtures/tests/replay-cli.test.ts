import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

/**
 * CLI boundary tests for scripts/replay-fixture.mts — the documented offline
 * replay. The command accepts only committed fixture names, so the
 * meaningful boundaries are: valid replay, list, unknown name, missing arg.
 */

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..", "..", "..");
const script = join(repoRoot, "scripts", "replay-fixture.mts");

function run(args: string[]): { status: number | null; stdout: string; stderr: string } {
  const r = spawnSync("node", ["--import", "tsx", script, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
    timeout: 60_000,
  });
  return { status: r.status, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
}

describe("replay-fixture CLI", () => {
  it("replays a workflow fixture with provenance and a PASS verdict", () => {
    const r = run(["team-with-permission"]);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /synthetic fixture/);
    assert.match(r.stdout, /observed/);
    assert.match(r.stdout, /reported/);
    assert.match(r.stdout, /expect: PASS/);
    assert.match(r.stdout, /needsUser/);
  });

  it("replays a sequence fixture including duplicate handling", () => {
    const r = run(["seq-duplicates"]);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /duplicate of/);
    assert.match(r.stdout, /expect: PASS/);
  });

  it("lists available fixtures", () => {
    const r = run(["--list"]);
    assert.equal(r.status, 0);
    assert.match(r.stdout, /team-with-permission/);
    assert.match(r.stdout, /seq-success/);
  });

  it("rejects an unknown fixture name with an actionable error", () => {
    const r = run(["not-a-fixture"]);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /unknown fixture 'not-a-fixture'/);
    assert.match(r.stderr, /--list/);
  });

  it("rejects a missing fixture argument", () => {
    const r = run([]);
    assert.equal(r.status, 1);
    assert.match(r.stdout, /Available synthetic fixtures/);
  });

  it("accepts declared rejections in seq-rejected-input", () => {
    // Every rejection in this fixture is explicitly expected — it must pass.
    const r = run(["seq-rejected-input"]);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /3 rejected/);
    assert.match(r.stdout, /expect: PASS/);
  });

  it("fails when a step's actual outcome differs from its declared expect", () => {
    // A derived completion claim is rejected by the engine; declaring it
    // "applied" must fail even though the fixture's expect block also fails.
    const dir = mkdtempSync(join(tmpdir(), "vt-fx-"));
    const file = join(dir, "mismatch.json");
    writeFileSync(
      file,
      JSON.stringify({
        name: "mismatch",
        steps: [
          { kind: "start", input: { title: "t", summary: "s", mode: "solo" } },
          { kind: "event", event: { id: "e1", kind: "task_finished", provenance: "derived", label: "x" }, expect: "applied" },
        ],
        expect: { taskState: "COMPLETED", workerStates: {} },
      }),
    );
    const r = run(["--file", file]);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /expected applied, engine produced rejected/);
  });

  it("fails on malformed sequence steps instead of silently skipping", () => {
    const dir = mkdtempSync(join(tmpdir(), "vt-fx-"));
    const file = join(dir, "malformed.json");
    writeFileSync(
      file,
      JSON.stringify({
        name: "malformed",
        steps: [
          { kind: "start", input: { title: "t", summary: "s", mode: "solo" } },
          { kind: "event" },
        ],
        expect: { taskState: "COMPLETED", workerStates: {} },
      }),
    );
    const r = run(["--file", file]);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /requires string event\.id, event\.kind, and event\.label/);
  });

  it("rejects an unreadable --file path with an actionable error", () => {
    const r = run(["--file", join(tmpdir(), "vt-definitely-missing-fixture.json")]);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /could not read fixture file/);
  });

  it("refuses to print PASS for a fixture with no expect block", () => {
    const dir = mkdtempSync(join(tmpdir(), "vt-fx-"));
    const file = join(dir, "no-expect.json");
    writeFileSync(
      file,
      JSON.stringify({
        steps: [{ kind: "start", input: { title: "t", summary: "s", mode: "solo" } }],
      }),
    );
    const r = run(["--file", file]);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /missing expect block/);
    assert.doesNotMatch(r.stdout, /expect: PASS/);
  });

  it("rejects malformed expectation blocks with actionable errors", () => {
    const dir = mkdtempSync(join(tmpdir(), "vt-fx-"));
    const start = { kind: "start", input: { title: "t", summary: "s", mode: "solo" } };
    const cases: Array<[string, unknown, RegExp]> = [
      ["string-expect", "COMPLETED", /missing expect block/],
      ["missing-workerStates", { taskState: "PLANNING" }, /expect\.workerStates/],
      ["bad-worker-state", { taskState: "PLANNING", workerStates: { lead: 5 } }, /expect\.workerStates\.lead/],
      ["bad-needsUser", { taskState: "PLANNING", workerStates: {}, needsUser: "yes" }, /expect\.needsUser/],
    ];
    for (const [name, expect, re] of cases) {
      const file = join(dir, `${name}.json`);
      writeFileSync(file, JSON.stringify({ name, steps: [start], expect }));
      const r = run(["--file", file]);
      assert.equal(r.status, 1, `${name} should fail`);
      assert.match(r.stderr, re, name);
      assert.doesNotMatch(r.stdout, /expect: PASS/, name);
    }
  });

  it("fails on null steps without leaking a stack trace", () => {
    const dir = mkdtempSync(join(tmpdir(), "vt-fx-"));
    const file = join(dir, "null-step.json");
    writeFileSync(
      file,
      JSON.stringify({
        name: "null-step",
        steps: [{ kind: "start", input: { title: "t", summary: "s", mode: "solo" } }, null],
        expect: { taskState: "PLANNING", workerStates: { lead: "ASSIGNED" } },
      }),
    );
    const r = run(["--file", file]);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /steps\[1\] must be an object with a string kind/);
    assert.doesNotMatch(r.stderr + r.stdout, /TypeError|at .*\.mts:/);
  });

  it("fails a wrong step expectation even when the final snapshot matches", () => {
    // The activity event applies without changing task state — the declared
    // "duplicate" is wrong even though every final expectation holds.
    const dir = mkdtempSync(join(tmpdir(), "vt-fx-"));
    const file = join(dir, "mismatch-matching-final.json");
    writeFileSync(
      file,
      JSON.stringify({
        name: "mismatch-matching-final",
        steps: [
          { kind: "start", input: { title: "t", summary: "s", mode: "solo" } },
          { kind: "event", event: { id: "a1", kind: "activity", label: "tick" }, expect: "duplicate" },
        ],
        expect: { taskState: "PLANNING", workerStates: { lead: "ASSIGNED" } },
      }),
    );
    const r = run(["--file", file]);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /expected duplicate, engine produced applied/);
  });
});
