import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { TaskSnapshot, VisualEvent, WorkerSnapshot } from "@visual-team/contracts";
import { InlineView } from "../src/modes/InlineView.tsx";
import { FullscreenView } from "../src/modes/FullscreenView.tsx";
import { PipView } from "../src/modes/PipView.tsx";
import { TeamView } from "../src/components/TeamView.tsx";

/**
 * M3 display semantics (brief 008) + brief-011 attention-first defaults —
 * static-markup assertions on the real views: attributed needs point at the
 * right surface, canceled specialists under a finished task read as ended
 * tracking, finish metadata surfaces, PiP keeps needs/refresh/stale visible
 * as text, and the §13.6 notice is present. Characters and motion now live
 * in the opt-in team view only. Synthetic snapshots only.
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

  it("routes a reported task need back to the originating chat", () => {
    const t = task({ needsUser: true, pendingUserNeeds: { task: "reported" } });
    const html = renderToStaticMarkup(createElement(InlineView, { task: t, recentEvents: [] }));
    assert.match(html, /answer it in the originating chat/);
    assert.doesNotMatch(html, /answer the Codex permission prompt/);
  });

  it("shows no-recent-activity visibly and the §13.6 notice once", () => {
    const t = task({ noRecentActivity: true });
    const html = renderToStaticMarkup(createElement(InlineView, { task: t, recentEvents: [] }));
    assert.match(html, /No recent activity\./);
    assert.match(html, /ephemeral metadata/);
  });

  it("leads with needs, then phase/provenance, latest activity, and refresh", () => {
    const events = [finishEvent("result: done", "COMPLETED")];
    const t = task({ needsUser: true, pendingUserNeeds: { "worker:lead": "observed" } });
    const html = renderToStaticMarkup(
      createElement(InlineView, { task: t, recentEvents: events, lastUpdatedAt: "2026-09-15T20:05:00.000Z" }),
    );
    const needsAt = html.indexOf("answer the Codex permission prompt");
    const statusAt = html.indexOf("vt-status");
    assert.ok(needsAt !== -1 && statusAt !== -1 && needsAt < statusAt, "needs render before status");
    assert.match(html, /reported/);
    assert.match(html, /Latest recorded activity: Reported: task completed\. \(reported,/);
    assert.match(html, /Last successful refresh:/);
  });

  it("says 'No pending requests recorded' — never an unconditional all-clear", () => {
    const html = renderToStaticMarkup(createElement(InlineView, { task: task(), recentEvents: [] }));
    assert.match(html, /No pending requests recorded\./);
    assert.doesNotMatch(html, /Nothing needs you/);
  });

  it("states limited visibility honestly when no events are in view", () => {
    const html = renderToStaticMarkup(createElement(InlineView, { task: task(), recentEvents: [] }));
    assert.match(html, /No recorded activity visible/);
    assert.doesNotMatch(html, /nothing is happening|no work/i);
  });

  it("keeps one primary action; team is a secondary view", () => {
    const html = renderToStaticMarkup(createElement(InlineView, { task: task(), recentEvents: [] }));
    assert.equal((html.match(/vt-btn-primary/g) ?? []).length, 1);
    assert.match(html, /Open details/);
    assert.match(html, />View team</);
    assert.match(html, /vt-btn-compact/);
    assert.doesNotMatch(html, /Open team/);
  });

  it("shows the retained reported phase separately from lifecycle state and activity", () => {
    const t = task({
      state: "ACTIVE",
      stateProvenance: "observed",
      phase: { name: "testing", provenance: "reported", at: "2026-09-15T20:07:00.000Z" },
    });
    const html = renderToStaticMarkup(createElement(InlineView, { task: t, recentEvents: [] }));
    assert.match(html, /Reported phase: testing \(reported, /);
    const full = renderToStaticMarkup(createElement(FullscreenView, { task: t, recentEvents: [] }));
    assert.match(full, /Reported phase: testing \(reported, /);
    const pip = renderToStaticMarkup(createElement(PipView, { task: t, refresh: "live" }));
    assert.match(pip, /Reported phase: testing \(reported, /);
  });

  it("an older snapshot without a phase reads 'not provided', never inferred", () => {
    for (const el of [
      createElement(InlineView, { task: task(), recentEvents: [] }),
      createElement(FullscreenView, { task: task(), recentEvents: [] }),
      createElement(PipView, { task: task(), refresh: "live" as const }),
    ]) {
      assert.match(renderToStaticMarkup(el), /Reported phase: not provided/);
    }
  });

  it("shows the terminal outcome, reported checks, and artifacts in the default inline summary", () => {
    const t = task({
      state: "COMPLETED",
      workers: [worker("lead", "lead", "COMPLETED", true)],
      result: {
        summary: "label changed and build checked",
        verification: "passed",
        artifacts: [{ label: "package.json", uri: "file:package.json" }],
      },
    });
    const html = renderToStaticMarkup(
      createElement(InlineView, { task: t, recentEvents: [finishEvent("result: done")] }),
    );
    assert.match(html, /Reported result/);
    assert.match(html, /Reported checks: passed/);
    assert.match(html, /label changed and build checked/);
    assert.match(html, /package\.json/);
    assert.match(html, /file:package\.json/);
  });
});

describe("pip text equivalents", () => {
  it("renders needs and refresh state as text, not a bare dot", () => {
    const t = task({ needsUser: true, pendingUserNeeds: { "worker:lead": "observed" } });
    const html = renderToStaticMarkup(
      createElement(PipView, { task: t, refresh: "stale", onRetry: () => {} }),
    );
    assert.match(html, /permission prompt/);
    assert.match(html, /Updates paused — last confirmed state shown\./);
    assert.match(html, /Try again/);
  });

  it("shows no-recent-activity and unavailable-refresh text", () => {
    const t = task({ noRecentActivity: true });
    const html = renderToStaticMarkup(
      createElement(PipView, { task: t, refresh: "unavailable", onRetry: () => {} }),
    );
    assert.match(html, /No recent activity\./);
    assert.match(html, /Live updates unavailable — last confirmed state shown\./);
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

  it("keeps an accessible Results disclosure for a terminal task", () => {
    const t = task({
      state: "COMPLETED",
      workers: [worker("lead", "lead", "COMPLETED", true)],
      result: { summary: "shipped", verification: "passed" },
    });
    const html = renderToStaticMarkup(
      createElement(PipView, { task: t, recentEvents: [finishEvent("result: shipped")] }),
    );
    assert.match(html, /<summary>Results<\/summary>/);
    assert.match(html, /Reported checks: passed/);
    assert.match(html, /shipped/);
  });

  it("does not offer a results disclosure while work is live", () => {
    const html = renderToStaticMarkup(createElement(PipView, { task: task() }));
    assert.doesNotMatch(html, /<summary>Results<\/summary>/);
  });

  it("leads with pending needs before status — attention first even in the compact view", () => {
    const t = task({ needsUser: true, pendingUserNeeds: { "worker:lead": "observed" } });
    const html = renderToStaticMarkup(createElement(PipView, { task: t, refresh: "live" }));
    const needsAt = html.indexOf("permission prompt");
    const badgeAt = html.indexOf("vt-badge");
    assert.ok(needsAt !== -1 && badgeAt !== -1 && needsAt < badgeAt, "needs precede the state badge");
  });

  it("states the last successful refresh in every refresh state and on terminal tasks", () => {
    for (const refresh of ["live", "stale", "unavailable", "off"] as const) {
      const html = renderToStaticMarkup(
        createElement(PipView, {
          task: task({ state: refresh === "off" ? "COMPLETED" : "ACTIVE" }),
          refresh,
          lastUpdatedAt: "2026-09-15T20:05:00.000Z",
        }),
      );
      assert.match(html, /Last successful refresh:/, `refresh=${refresh}`);
    }
    const none = renderToStaticMarkup(createElement(PipView, { task: task(), refresh: "live" }));
    assert.match(none, /No successful refresh recorded\./);
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
      createElement(PipView, { task: t, refresh: "live" as const }),
    ]) {
      assert.doesNotMatch(renderToStaticMarkup(el), /\bvt-bob\b/);
    }
    assert.match(renderToStaticMarkup(createElement(InlineView, { task: t, recentEvents: [] })), /No recent activity\./);
  });
});

describe("characters and motion are opt-in (brief 011)", () => {
  it("no default view renders character markup — the roster is behind View team", () => {
    const t = task({ noRecentActivity: false });
    for (const el of [
      createElement(InlineView, { task: t, recentEvents: [], stale: false }),
      createElement(FullscreenView, { task: t, recentEvents: [], stale: false }),
      createElement(PipView, { task: t, refresh: "live" as const }),
    ]) {
      const html = renderToStaticMarkup(el);
      assert.doesNotMatch(html, /\bvt-bob\b/);
      // Robot avatars render only inside the team view.
      assert.doesNotMatch(html, /<svg/);
    }
  });

  it("team view keeps motion off by default — the opt-in control is present but inert", () => {
    const t = task({ noRecentActivity: false });
    const off = renderToStaticMarkup(createElement(TeamView, { task: t, stale: false }));
    assert.doesNotMatch(off, /\bvt-bob\b/);
    // The affordance exists; the real opt-in click path is covered by the
    // mounted viewState tests (react-test-renderer).
    assert.match(off, /Turn motion on/);
    assert.match(off, /aria-pressed="false"/);
  });

  it("terminal workers can never animate — even with motion opted in markup stays static", () => {
    // A COMPLETED worker has no animated state regardless of the opt-in;
    // mounted suppression cases live in viewState.test.ts.
    const terminal = renderToStaticMarkup(
      createElement(TeamView, {
        task: task({ noRecentActivity: false, workers: [worker("lead", "lead", "COMPLETED", true)] }),
      }),
    );
    assert.doesNotMatch(terminal, /\bvt-bob\b/);
  });

  it("fullscreen keeps the roster as a collapsed secondary section with writer ownership", () => {
    const t = task({
      workers: [worker("lead", "lead", "WORKING", true), worker("remy", "reviewer", "WORKING")],
    });
    const html = renderToStaticMarkup(createElement(FullscreenView, { task: t, recentEvents: [] }));
    // The disclosure is present but its roster mounts only on open —
    // characters never ship in the default markup.
    assert.match(html, /<summary>Team<\/summary>/);
    assert.doesNotMatch(html, /vt-roster-item/);
    const team = renderToStaticMarkup(createElement(TeamView, { task: t }));
    assert.match(team, /· writes/);
    assert.match(team, /· read-only/);
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

  it("a nonterminal task reads as no recorded terminal result — never 'in progress'", () => {
    for (const state of ["ACTIVE", "WAITING_FOR_USER", "BLOCKED"] as const) {
      const html = renderToStaticMarkup(
        createElement(FullscreenView, { task: task({ state }), recentEvents: [] }),
      );
      assert.match(html, /No terminal result has been recorded\./, state);
      assert.doesNotMatch(html, /still in progress/, state);
    }
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
    // The roster line lives in the optional team view; render it directly.
    const html = renderToStaticMarkup(createElement(TeamView, { task: t }));
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
    assert.match(html, /answer it in the originating chat/);
  });
});
