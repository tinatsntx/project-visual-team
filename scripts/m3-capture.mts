import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { StartVisualTaskInput, TaskSnapshot, VisualEvent } from "@visual-team/contracts";
import { createRenderVisualTaskResult } from "@visual-team/contracts/meta";
import { mapCodexEvent } from "@visual-team/codex-event-mapper";
import { applyEvent, createTaskRecord, refreshDerivedFlags } from "@visual-team/state-machine";
import { loadFixture } from "@visual-team/test-fixtures";

/**
 * M3 capture pages (brief 008 evidence): deterministic per-scenario widget
 * pages under apps/plugin-ui/capture/. Each child page embeds a real replayed
 * snapshot (fixtures run through the actual mapper + reducer); the shared
 * frame.html plays the host role exactly like dev.html — it answers
 * ui/initialize, tools/call get_visual_task, and display-mode requests over
 * postMessage. Reads answer live data or a generic isError (the scenario's
 * baked `stale` flag), so refresh health in the shots is real, not mocked.
 *
 * Regenerate:  node --import tsx scripts/m3-capture.mts
 * Serve + shot: npm run dev:serve --workspace @visual-team/plugin-ui
 *   chrome --headless=new --virtual-time-budget=12000 \
 *     --window-size=<scenario W,H> \
 *     --screenshot=out.png "http://127.0.0.1:8788/capture/frame.html?n=<name>"
 * frame.html sizes its iframe from the scenario table below; match
 * --window-size to it. The virtual-time budget lets the first
 * get_visual_task read settle — stale scenarios only show the banner
 * after that read fails. Light theme: --blink-settings=preferredColorScheme=1.
 */

interface Scenario {
  name: string;
  fixture: string;
  mode: "inline" | "fullscreen" | "pip";
  /** Frame answers get_visual_task with isError — refresh goes stale. */
  stale?: boolean;
  /** Backdate lastActivityAt so refreshDerivedFlags sets noRecentActivity. */
  ageMin?: number;
  /** Root font-size for the text-enlargement capture, e.g. "175%". */
  fontSize?: string;
  /** Frame iframe size — matches how the host sizes the mode. */
  width: number;
  height: number;
}

const SCENARIOS: Scenario[] = [
  { name: "inline-permission-need", fixture: "team-with-permission", mode: "inline", width: 480, height: 420 },
  { name: "inline-reported-question", fixture: "reported-question", mode: "inline", width: 480, height: 400 },
  { name: "fullscreen-completed-verified", fixture: "completed-verified", mode: "fullscreen", width: 760, height: 900 },
  { name: "fullscreen-failed", fixture: "failed-verification", mode: "fullscreen", width: 760, height: 760 },
  { name: "fullscreen-review-untracked", fixture: "review-untracked", mode: "fullscreen", width: 760, height: 860 },
  { name: "fullscreen-long-labels", fixture: "long-labels", mode: "fullscreen", width: 760, height: 1000 },
  { name: "pip-permission-need", fixture: "team-with-permission", mode: "pip", width: 340, height: 260 },
  { name: "inline-narrow-320", fixture: "long-labels", mode: "inline", width: 320, height: 620 },
  { name: "inline-narrow-large-text", fixture: "long-labels", mode: "inline", fontSize: "175%", width: 320, height: 760 },
  // ACTIVE solo task aged past the stale threshold → real noRecentActivity.
  { name: "inline-stale-norecent", fixture: "solo-posttooluse", mode: "inline", stale: true, ageMin: 120, width: 480, height: 500 },
  { name: "pip-stale", fixture: "team-with-permission", mode: "pip", stale: true, width: 340, height: 280 },
];

function replay(fixtureName: string, ageMin?: number): { task: TaskSnapshot; recentEvents: VisualEvent[] } {
  const fixture = loadFixture(fixtureName);
  const start = fixture.steps.find((s) => s.kind === "start");
  if (!start?.input) throw new Error(`fixture ${fixtureName} has no start step`);
  const base = Date.parse("2026-09-15T20:30:00.000Z");
  const rec = createTaskRecord(start.input as StartVisualTaskInput, {
    taskId: `vt_cap_${fixtureName.replaceAll("-", "_")}`,
    startedAt: new Date(base).toISOString(),
    eventId: "evt_cap_start",
  });
  let step = 0;
  for (const s of fixture.steps) {
    const at = new Date(base + ++step * 1000).toISOString();
    if (s.event) {
      const mapped = mapCodexEvent({
        taskId: rec.snapshot.id,
        name: s.event.name,
        at,
        eventId: s.event.eventId ?? `evt_cap_${step}`,
        ...(s.event.payload ? { payload: s.event.payload } : {}),
      });
      if (mapped.ok) for (const e of mapped.events) applyEvent(rec, e);
    } else if (s.visual) {
      applyEvent(rec, {
        ...s.visual,
        provenance: s.visual.provenance ?? "reported",
        taskId: rec.snapshot.id,
        at,
      } as VisualEvent);
    }
  }
  let task = rec.snapshot;
  if (ageMin) {
    // Backdate, then run the real derivation — the flag is engine-derived,
    // not hand-set.
    const aged = { ...task, lastActivityAt: new Date(base - ageMin * 60_000).toISOString() };
    task = refreshDerivedFlags(aged, new Date(base + step * 1000).toISOString());
  }
  return { task, recentEvents: rec.events.slice(-20) };
}

/** Child page: real widget bundle + baked dev data. All host traffic goes to frame.html. */
function childPage(scenario: Scenario, toolResult: unknown): string {
  const fontSize = scenario.fontSize;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>capture — ${scenario.name}</title>
  <link rel="stylesheet" href="../dist/visual-team.css" />
  ${fontSize ? `<style>html { font-size: ${fontSize}; }</style>` : ""}
  <style>body { margin: 0; }</style>
</head>
<body>
<div id="root"></div>
<script>
  // Synthetic M3 capture — scenario "${scenario.name}". The payload was
  // produced by replaying a repo fixture through the real mapper/reducer.
  window.__VISUAL_TEAM_DEV__ = {
    displayMode: ${JSON.stringify(scenario.mode)},
    stale: ${scenario.stale === true},
    toolResult: ${JSON.stringify(toolResult)},
  };
</script>
<script type="module" src="../dist/visual-team.js"></script>
</body>
</html>
`;
}

/** Shared host frame: ?n=<scenario> sizes the iframe and answers the bridge. */
function framePage(sizes: Record<string, { width: number; height: number }>): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>capture frame</title>
  <style>html,body{margin:0;padding:0;background:#888}#w{border:0;display:block;background:#fff}</style>
</head>
<body>
<iframe id="w" title="Visual Team widget"></iframe>
<script>
(function () {
  var SIZES = ${JSON.stringify(sizes)};
  var q = new URLSearchParams(location.search);
  var name = q.get("n");
  var s = SIZES[name] || { width: 480, height: 400 };
  var iframe = document.getElementById("w");
  iframe.width = q.get("w") || String(s.width);
  iframe.height = q.get("h") || String(s.height);
  iframe.src = "./" + name + ".html";
  window.addEventListener("message", function (e) {
    if (e.source !== iframe.contentWindow) return;
    var m = e.data;
    if (!m || m.jsonrpc !== "2.0" || typeof m.id !== "number" || typeof m.method !== "string") return;
    var dev = iframe.contentWindow.__VISUAL_TEAM_DEV__ || {};
    var reply = function (r) { e.source.postMessage({ jsonrpc: "2.0", id: m.id, result: r }, "*"); };
    if (m.method === "ui/initialize") {
      return reply({ protocolVersion: "2025-06-18", hostContext: { displayMode: dev.displayMode } });
    }
    if (m.method === "tools/call" && m.params && m.params.name === "get_visual_task") {
      if (dev.stale) {
        return reply({ content: [{ type: "text", text: "Unknown task or invalid capability." }], isError: true });
      }
      var sc = dev.toolResult.structuredContent;
      return reply({ content: [{ type: "text", text: "ok" }], structuredContent: { task: sc.task, recentEvents: sc.recentEvents } });
    }
    if (m.method === "ui/request-display-mode") {
      return reply({ mode: (m.params && m.params.mode) || "inline" });
    }
    return reply({});
  });
})();
</script>
</body>
</html>
`;
}

const here = fileURLToPath(new URL(".", import.meta.url));
const outDir = join(here, "..", "apps", "plugin-ui", "capture");
mkdirSync(outDir, { recursive: true });

for (const scenario of SCENARIOS) {
  const { task, recentEvents } = replay(scenario.fixture, scenario.ageMin);
  const toolResult = createRenderVisualTaskResult({
    text: `Synthetic capture — ${scenario.name}`,
    task,
    recentEvents,
    capability: `vtc_capture_${scenario.name}`,
  });
  writeFileSync(join(outDir, `${scenario.name}.html`), childPage(scenario, toolResult));
  process.stdout.write(`capture/${scenario.name}.html — ${scenario.fixture} (${scenario.mode}${scenario.stale ? ", stale" : ""}) ${scenario.width}x${scenario.height}\n`);
}
writeFileSync(
  join(outDir, "frame.html"),
  framePage(
    Object.fromEntries(
      SCENARIOS.map((s) => [s.name, { width: s.width, height: s.height }]),
    ),
  ),
);
process.stdout.write(`wrote ${SCENARIOS.length} capture pages + frame.html\n`);
