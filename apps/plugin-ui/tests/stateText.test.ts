import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { TASK_STATE_TEXT, WORKER_STATE_TEXT } from "../src/accessibility/stateText.ts";
import { TaskStateSchema, WorkerStateSchema } from "@visual-team/contracts";

/** Every visual state must also exist as text (plan §3.7). */
describe("state text coverage", () => {
  it("every worker state has a label", () => {
    for (const s of WorkerStateSchema.options) {
      assert.ok(WORKER_STATE_TEXT[s], `missing text for worker state ${s}`);
    }
  });
  it("every task state has a label", () => {
    for (const s of TaskStateSchema.options) {
      assert.ok(TASK_STATE_TEXT[s], `missing text for task state ${s}`);
    }
  });
});
