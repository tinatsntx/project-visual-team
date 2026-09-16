import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
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
});
