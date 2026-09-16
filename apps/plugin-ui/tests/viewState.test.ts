import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement, type ReactElement } from "react";
import TestRenderer, { act } from "react-test-renderer";
import type { TaskSnapshot, WorkerSnapshot } from "@visual-team/contracts";
import { InlineView } from "../src/modes/InlineView.tsx";
import { TeamView } from "../src/components/TeamView.tsx";

/**
 * Brief-011 review §2 — task-scoped view state, exercised on the real mounted
 * tree (react-test-renderer, no DOM needed): disclosures and the motion
 * opt-in are per-task. A switch from task A to task B must reset both —
 * synchronously, so B's first render never shows A's open team or motion.
 *
 * `key={task.id}` on the mode roots in App.tsx is the reset mechanism; the
 * Scoped wrapper below mounts InlineView exactly the way App does, so the
 * test exercises the real keyed-remount path rather than a component-local
 * shortcut.
 */

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

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

/** The App-level contract: the mode view is keyed by task identity. */
function Scoped({ task: t }: { task: TaskSnapshot }): ReactElement {
  return createElement(InlineView, { key: t.id, task: t, recentEvents: [] });
}

function mount(el: ReactElement): TestRenderer.ReactTestRenderer {
  let r!: TestRenderer.ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(el);
  });
  return r;
}

function buttonByText(r: TestRenderer.ReactTestRenderer, text: string): TestRenderer.ReactTestInstance {
  return r.root.find(
    (n) => n.type === "button" && (n.children.join("").includes(text) || n.props["aria-label"] === text),
  );
}

function click(el: TestRenderer.ReactTestInstance): void {
  act(() => {
    el.props.onClick();
  });
}

describe("task-scoped view state (brief 011 review §2)", () => {
  it("open team + motion on task A reset to closed + motion off on task B", () => {
    const a = task({ id: "vt_a", title: "Task A" });
    const b = task({ id: "vt_b", title: "Task B" });
    const r = mount(createElement(Scoped, { task: a }));

    // A: open the team view and opt into motion — real controls only.
    click(buttonByText(r, "View team"));
    assert.ok(r.root.findAll((n) => n.props.className === "vt-roster").length > 0, "team view should mount");
    click(buttonByText(r, "Turn motion on"));
    assert.ok(r.root.findAll((n) => n.props.className === "vt-bob").length > 0, "motion should animate");
    assert.ok(buttonByText(r, "Turn motion off")); // opt-in state shown

    // Switch to B through the same keyed path App uses — same mounted widget.
    act(() => {
      r.update(createElement(Scoped, { task: b }));
    });

    // B's first render: team closed (no roster), motion off (no animation).
    assert.equal(r.root.findAll((n) => n.props.className === "vt-roster").length, 0, "roster must not leak to B");
    assert.equal(r.root.findAll((n) => n.props.className === "vt-bob").length, 0, "motion must not leak to B");
    assert.ok(buttonByText(r, "View team"));
    assert.ok(buttonByText(r, "View evidence"));
  });

  it("evidence disclosure also resets on a task switch", () => {
    const a = task({ id: "vt_a2" });
    const b = task({ id: "vt_b2" });
    const r = mount(createElement(Scoped, { task: a }));
    click(buttonByText(r, "View evidence"));
    assert.ok(r.root.findAll((n) => n.props.id === "vt-inline-evidence").length > 0);
    act(() => {
      r.update(createElement(Scoped, { task: b }));
    });
    assert.equal(r.root.findAll((n) => n.props.id === "vt-inline-evidence").length, 0);
  });

  it("TeamView resets its motion opt-in synchronously even without a key", () => {
    const a = task({ id: "vt_a3" });
    const b = task({ id: "vt_b3" });
    // Deliberately unkeyed: the component's own render-time reset must cover
    // any future unkeyed usage, not only the keyed mode roots.
    const r = mount(createElement(TeamView, { task: a }));
    click(buttonByText(r, "Turn motion on"));
    assert.ok(r.root.findAll((n) => n.props.className === "vt-bob").length > 0);
    act(() => {
      r.update(createElement(TeamView, { task: b }));
    });
    assert.equal(r.root.findAll((n) => n.props.className === "vt-bob").length, 0);
    assert.ok(buttonByText(r, "Turn motion on"));
  });

  it("opt-in motion stays suppressed by stale data and inactivity after real opt-in", () => {
    for (const t of [
      { stale: true, task: task({ noRecentActivity: false }) },
      { stale: false, task: task({ noRecentActivity: true }) },
    ]) {
      const r = mount(createElement(TeamView, { task: t.task, stale: t.stale }));
      click(buttonByText(r, "Turn motion on"));
      assert.equal(r.root.findAll((n) => n.props.className === "vt-bob").length, 0);
      r.unmount();
    }
  });
});
