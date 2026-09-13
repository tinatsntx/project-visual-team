import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mapCodexEvent } from "../src/index.ts";

const base = { taskId: "vt_1", at: "2026-09-13T15:00:00.000Z", eventId: "e1" };

describe("mapCodexEvent (plan §10)", () => {
  it("rejects unsupported event names", () => {
    const r = mapCodexEvent({ ...base, name: "NotARealEvent" as never });
    assert.equal(r.ok, false);
  });

  it("SessionStart is activity only — never claims work", () => {
    const r = mapCodexEvent({ ...base, name: "SessionStart" });
    assert.ok(r.ok);
    assert.equal(r.events[0]?.kind, "activity");
  });

  it("UserPromptSubmit maps to planning, not execution", () => {
    const r = mapCodexEvent({ ...base, name: "UserPromptSubmit" });
    assert.ok(r.ok);
    assert.equal(r.events[0]?.to, "PLANNING");
  });

  it("Stop is a finished turn, never task completion", () => {
    const r = mapCodexEvent({ ...base, name: "Stop" });
    assert.ok(r.ok);
    assert.equal(r.events[0]?.kind, "turn_finished");
    assert.notEqual(r.events[0]?.to, "COMPLETED");
  });

  it("PostToolUse is activity, not success", () => {
    const r = mapCodexEvent({ ...base, name: "PostToolUse", payload: { tool_name: "apply_patch" } });
    assert.ok(r.ok);
    assert.equal(r.events[0]?.kind, "activity");
  });

  it("PermissionRequest records only", () => {
    const r = mapCodexEvent({ ...base, name: "PermissionRequest" });
    assert.ok(r.ok);
    assert.equal(r.events[0]?.kind, "permission_request");
  });

  it("SubagentStart carries agent correlation ids", () => {
    const r = mapCodexEvent({
      ...base,
      name: "SubagentStart",
      payload: { agent_id: "a1", agent_type: "review" },
    });
    assert.ok(r.ok);
    assert.equal(r.events[0]?.workerId, "a1");
    assert.match(r.events[0]?.detail ?? "", /review/);
  });

  it("all mapped events are observed provenance", () => {
    for (const name of ["SessionStart", "UserPromptSubmit", "SubagentStart", "PreToolUse", "PostToolUse", "PermissionRequest", "SubagentStop", "Stop", "Interrupt"] as const) {
      const r = mapCodexEvent({ ...base, name });
      assert.ok(r.ok);
      for (const e of r.events) assert.equal(e.provenance, "observed");
    }
  });
});
