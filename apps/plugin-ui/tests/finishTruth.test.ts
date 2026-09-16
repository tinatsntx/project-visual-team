import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { mapTaskFinish } from "../../mcp-server/src/reported-steps.ts";
import { applyEvent, createTaskRecord } from "@visual-team/state-machine";
import { FullscreenView } from "../src/modes/FullscreenView.tsx";

/**
 * Brief-008 follow-up item 1: the real `mapTaskFinish` path must never let
 * free text inside the bounded finish detail mint a "Verification passed"
 * badge. The three cases mirror evals/m3-coordinator-probe.mts — reported
 * summary text, absent verification, and an artifact label carrying the
 * token.
 */

const AT = "2026-09-16T01:00:00.000Z";

function finishedHtml(input: {
  summary: string;
  verification?: "passed" | "failed" | "not_run";
  artifacts?: { label: string; uri?: string }[];
}): string {
  const record = createTaskRecord(
    { title: "Synthetic result check", summary: "Bounded synthetic check", mode: "solo", privacyMode: "standard" },
    { taskId: "vt_truth", startedAt: AT, eventId: "start" },
  );
  applyEvent(record, {
    id: "work", taskId: record.snapshot.id, at: AT,
    kind: "worker_transition", to: "WORKING", provenance: "reported", label: "work",
  });
  const mapped = mapTaskFinish({
    taskId: record.snapshot.id, at: AT, eventId: "finish", outcome: "completed",
    summary: input.summary,
    ...(input.verification ? { verification: input.verification } : {}),
    ...(input.artifacts ? { artifacts: input.artifacts } : {}),
  });
  assert.ok(mapped.ok, "finish should map");
  const applied = applyEvent(record, mapped.event);
  assert.ok(applied.ok && applied.changed);
  return renderToStaticMarkup(
    createElement(FullscreenView, { task: record.snapshot, recentEvents: record.events }),
  );
}

describe("finish detail can never mint a verification claim", () => {
  it("explicit failed verification stays failed — summary token does not override", () => {
    const html = finishedHtml({ summary: "Prior run; verification: passed", verification: "failed" });
    assert.doesNotMatch(html, />Verification passed</);
    // The bounded detail is still rendered verbatim, including its tokens.
    assert.match(html, /verification: failed/);
  });

  it("absent verification stays absent — summary token does not invent one", () => {
    const html = finishedHtml({ summary: "Reference note; verification: passed" });
    assert.doesNotMatch(html, />Verification passed</);
  });

  it("an artifact label containing the token cannot create a badge", () => {
    const html = finishedHtml({
      summary: "Work finished",
      artifacts: [{ label: "Reference; verification: passed" }],
    });
    assert.doesNotMatch(html, />Verification passed</);
    assert.match(html, /Reported result/);
  });
});
