import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { TaskSnapshot, TaskState, VisualEvent, WorkerSnapshot } from "@visual-team/contracts";
import { InlineView } from "../src/modes/InlineView.tsx";
import { FullscreenView } from "../src/modes/FullscreenView.tsx";
import { PipView } from "../src/modes/PipView.tsx";

/**
 * M3 display semantics (brief 008) — static-markup assertions on the real
 * views: attributed needs point at the right surface, canceled specialists
 * under a finished task read as ended tracking, finish metadata surfaces,
 * PiP keeps needs/refresh/stale visible as text, and the §13.6 notice is
 * present. Synthetic snapshots only.
 */

const AT = "2026-09-15T20:00:00.000Z";

function worker(id: string, role: WorkerSnapshot["role"], state: WorkerSnapshot["state"], isWriter = false): WorkerSnapshot {
  return { id, role, label: (id[0] ?? "w").toUpperCase() + id.slice(1), state, stateProvenance: "reported", isWriter, updatedAt: AT };
}

function task(overrides: Partial<TaskSnapshot> = {}): TaskSnapshot {
  return {
    id: "vt_view", title: "Change the button label", summary: "Update the label and rebuild.",
    mode: "solo", privacyMode: "standard", state: "ACTIVE", stateProvenance: "reported",
    workers: [worker("lead", "lead", "WORKING", true)],
    createdAt: AT, updatedAt: AT, lastActivityAt: AT,
    noRecentActivity: false, needsUser: false, eventCount: 2,
    ...overrides,
  };
}

function finishEvent(detail?: string, to: "COMPLETED" | "FAILED" = "COMPLETED"): VisualEvent {
  return {
    id: "evt_fin", taskId: "vt_view", at: AT, provenance: "reported",
    kind: "task_finished", to, label: "Reported: task completed.",
    ...(detail ? { detail } : {}),
  };
}

describe("inline needs and limits", () => {
  it("routes a worker-attributed need to the native permission prompt", () => {
    const t = task({ needsUser: true, pendingUserNeeds: { "worker:lead": "observed" } });
    const html = renderToStaticMarkup(createElement(InlineView, { task: t, recentEvents: [] }));
    assert.match(html, /answer the Codex permission prompt/);
    assert.doesNotMatch(html, /answer in the chat/);
  });

  it("routes a reported task need back to the chat", () => {
    const t = task({ needsUser: true, pendingUserNeeds: { task: "reported" } });
    const html = renderToStaticMarkup(createElement(InlineView, { task: t, recentEvents: [] }));
    assert.match(html, /answer in the chat/);
  });

  it("shows no-recent-activity visibly and the §13.6 notice once", () => {
    const t = task({ noRecentActivity: true });
    const html = renderToStaticMarkup(createElement(InlineView, { task: t, recentEvents: [] }));
    assert.match(html, /No recent activity\./);
    assert.match(html, /ephemeral metadata/);
  });

  it("keeps one primary action and compact secondaries", () => {
    const html = renderToStaticMarkup(createElement(InlineView, { task: task(), recentEvents: [] }));
    assert.equal((html.match(/vt-btn-primary/g) ?? []).length, 1);
    assert.match(html, /Open team/);
    assert.match(html, /vt-btn-compact/);
  });
});

describe("pip text equivalents", () => {
  it("renders needs and refresh state as text, not a bare dot", () => {
    const t = task({ needsUser: true, pendingUserNeeds: { "worker:lead": "observed" } });
    const html = renderToStaticMarkup(
      createElement(PipView, { task: t, refresh: "stale", onRetry: () => {} }),
    );
    assert.match(html, /permission prompt/);
    assert.match(html, /Updates paused/);
    assert.match(html, /Try again/);
  });

  it("shows no-recent-activity and unavailable-refresh text", () => {
    const t = task({ noRecentActivity: true });
    const html = renderToStaticMarkup(
      createElement(PipView, { task: t, refresh: "unavailable", onRetry: () => {} }),
    );
    assert.match(html, /No recent activity\./);
    assert.match(html, /Live updates unavailable/);
  });

  it("reads a canceled specialist under a completed task as ended tracking, not canceled", () => {
    const t = task({
      state: "COMPLETED",
      workers: [worker("lead", "lead", "COMPLETED", true), worker("remy", "reviewer", "CANCELED")],
    });
    const html = renderToStaticMarkup(createElement(PipView, { task: t }));
    assert.match(html, /tracking ended; no finish signal was recorded/);
    assert.doesNotMatch(html, /Remy — canceled/);
  });
});

describe("pip goal and stale-free motion", () => {
  it("shows the task title as visible text", () => {
    const html = renderToStaticMarkup(createElement(PipView, { task: task() }));
    const text = html.replace(/<[^>]*>/g, " ");
    assert.match(text, /Change the button label/);
  });

  it("suppresses activity motion when noRecentActivity is set, even on healthy reads", () => {
    const t = task({ noRecentActivity: true });
    for (const el of [
      createElement(InlineView, { task: t, recentEvents: [], stale: false }),
      createElement(FullscreenView, { task: t, recentEvents: [], stale: false }),
      createElement(PipView, { task: t, stale: false, refresh: "live" as const }),
    ]) {
      assert.doesNotMatch(renderToStaticMarkup(el), /\bvt-bob\b/);
    }
    assert.match(renderToStaticMarkup(createElement(InlineView, { task: t, recentEvents: [] })), /No recent activity\./);
  });

  it("keeps activity motion for a working worker with fresh evidence", () => {
    const t = task({ noRecentActivity: false });
    const html = renderToStaticMarkup(
      createElement(InlineView, { task: t, recentEvents: [], stale: false }),
    );
    assert.match(html, /\bvt-bob\b/);
  });
});

describe("fullscreen results and canceled specialists", () => {
  it("renders bounded finish detail verbatim under a reported label — no inferred badge", () => {
    const t = task({ state: "COMPLETED" });
    const events = [finishEvent("result: label changed; verification: passed; artifacts: app.ts (file:app.ts)")];
    const html = renderToStaticMarkup(
      createElement(FullscreenView, { task: t, recentEvents: events }),
    );
    assert.match(html, /Reported result/);
    assert.match(html, /result: label changed/);
    assert.match(html, /app\.ts/);
    // No structured verification claim is extracted from free text.
    assert.doesNotMatch(html, />Verification passed</);
  });

  it("shows finish detail without a verification badge when none exists", () => {
    const t = task({ state: "COMPLETED" });
    const html = renderToStaticMarkup(
      createElement(FullscreenView, { task: t, recentEvents: [finishEvent("result: done")] }),
    );
    assert.match(html, /Reported result/);
    assert.match(html, /result: done/);
    assert.doesNotMatch(html, /vt-verify-(passed|failed|not-run)/);
  });

  it("states the absence of a finish event honestly on a terminal task", () => {
    const t = task({ state: "FAILED" });
    const html = renderToStaticMarkup(
      createElement(FullscreenView, { task: t, recentEvents: [] }),
    );
    assert.match(html, /no finish event was recorded/i);
    assert.doesNotMatch(html, /Verification passed/);
  });

  it("never calls a canceled task 'in progress'", () => {
    const t = task({ state: "CANCELED" });
    const html = renderToStaticMarkup(
      createElement(FullscreenView, { task: t, recentEvents: [] }),
    );
    assert.match(html, /Task ended as canceled/);
    assert.doesNotMatch(html, /still in progress/);
  });

  it("does not mint a badge from a verification token embedded in the summary", () => {
    const t = task({ state: "COMPLETED" });
    const html = renderToStaticMarkup(
      createElement(FullscreenView, {
        task: t,
        recentEvents: [finishEvent("result: prior run; verification: passed")],
      }),
    );
    assert.doesNotMatch(html, />Verification passed</);
  });

  it("reads a canceled specialist under a completed task as ended tracking, not verified cancellation", () => {
    const t = task({
      state: "COMPLETED",
      workers: [worker("lead", "lead", "COMPLETED", true), worker("remy", "reviewer", "CANCELED")],
    });
    const html = renderToStaticMarkup(
      createElement(FullscreenView, { task: t, recentEvents: [finishEvent("result: done")] }),
    );
    assert.match(html, /tracking ended; no finish signal was recorded/);
    assert.doesNotMatch(html, /Remy is canceled/);
  });

  it("lists attributed needs in Needs you", () => {
    const t = task({
      state: "WAITING_FOR_USER",
      needsUser: true,
      pendingUserNeeds: { "worker:lead": "observed", task: "reported" },
    });
    const html = renderToStaticMarkup(
      createElement(FullscreenView, { task: t, recentEvents: [] }),
    );
    assert.match(html, /answer the Codex permission prompt/);
    assert.match(html, /answer in the chat/);
  });
});
