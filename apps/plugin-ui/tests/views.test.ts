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

describe("fullscreen results and canceled specialists", () => {
  it("surfaces recorded finish detail and verification without claiming more", () => {
    const t = task({ state: "COMPLETED" });
    const events = [finishEvent("result: label changed; verification: passed; artifacts: app.ts (file:app.ts)")];
    const html = renderToStaticMarkup(
      createElement(FullscreenView, { task: t, recentEvents: events }),
    );
    assert.match(html, /Verification passed/);
    assert.match(html, /result: label changed/);
    assert.match(html, /app\.ts/);
  });

  it("states the absence of verification honestly", () => {
    const t = task({ state: "COMPLETED" });
    const html = renderToStaticMarkup(
      createElement(FullscreenView, { task: t, recentEvents: [finishEvent("result: done")] }),
    );
    assert.match(html, /No verification recorded/);
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

  it("marks the verification badge as reported, not system-verified", () => {
    const t = task({ state: "COMPLETED" });
    const html = renderToStaticMarkup(
      createElement(FullscreenView, {
        task: t,
        recentEvents: [finishEvent("result: done; verification: passed")],
      }),
    );
    assert.match(html, /Verification passed<\/span> <span class="vt-muted">reported<\/span>/);
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
