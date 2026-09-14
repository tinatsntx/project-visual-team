import {
  applyEvent,
  createTaskRecord,
  refreshDerivedFlags,
  type TaskRecord,
} from "@visual-team/state-machine";
import { mapCodexEvent } from "@visual-team/codex-event-mapper";
import {
  TASK_CAPABILITY_META_KEY,
  createRenderVisualTaskResult,
} from "@visual-team/contracts/meta";
import type {
  CodexEventName,
  CodexHookPayload,
  StartVisualTaskInput,
  TaskSnapshot,
  VisualEvent,
} from "@visual-team/contracts";
import type { ReplayFixture } from "@visual-team/test-fixtures";
import teamFixture from "../../../../packages/test-fixtures/fixtures/team-with-permission.json";
import soloFixture from "../../../../packages/test-fixtures/fixtures/solo-posttooluse.json";

/**
 * Simulated host for the dev harness (PROJECT_PLAN.md §7.4 approach 1).
 *
 * dev.html loads this bundle in the parent page and embeds the real widget
 * bundle in an iframe — the same topology as production, where the host owns
 * the widget iframe. It answers `ui/initialize` and `tools/call` JSON-RPC
 * over window.postMessage, replays a repo fixture through the real
 * mapCodexEvent/applyEvent pipeline, and delivers the same shared
 * render-result contract as the registered MCP handler. Nothing here fakes
 * state the reducer would not produce.
 */

const FIXTURES: Record<string, ReplayFixture> = {
  "team-with-permission": teamFixture as unknown as ReplayFixture,
  "solo-posttooluse": soloFixture as unknown as ReplayFixture,
};

const EVENT_STEP_MS = 3_000;
const AUTOFINISH_DELAY_MS = 7_000;

function nowIso(): string {
  return new Date().toISOString();
}

function createDevCapability(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return `vtc_${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

function log(line: string): void {
  const el = document.getElementById("hostlog");
  if (!el) return;
  el.textContent += `${new Date().toISOString().slice(11, 19)} ${line}\n`;
  el.scrollTop = el.scrollHeight;
}

function summarize(snapshot: TaskSnapshot): string {
  const lead = snapshot.workers.find((w) => w.role === "lead") ?? snapshot.workers[0];
  return [
    `Task "${snapshot.title}" is ${snapshot.state.toLowerCase().replaceAll("_", " ")}.`,
    lead ? `${lead.label} (${lead.role}) is ${lead.state.toLowerCase().replaceAll("_", " ")}.` : "",
    snapshot.needsUser ? "This task needs you — check approvals or questions." : "",
  ]
    .filter(Boolean)
    .join(" ");
}

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params?: Record<string, unknown>;
}

class DevHost {
  private record: TaskRecord;
  private readonly capability = createDevCapability();
  private readonly iframe: HTMLIFrameElement;
  private readonly queue: Array<NonNullable<ReplayFixture["steps"][number]["event"]>>;
  private displayMode: string;
  private polls = 0;
  private finished = false;

  constructor(fixture: ReplayFixture, displayMode: string) {
    const start = fixture.steps.find((s) => s.kind === "start");
    if (!start?.input) throw new Error(`fixture ${fixture.name} has no start step`);
    this.record = createTaskRecord(start.input as StartVisualTaskInput, {
      taskId: `vt_dev_${fixture.name.replaceAll("-", "_")}`,
      startedAt: nowIso(),
      eventId: "evt_dev_start",
    });
    this.queue = fixture.steps
      .map((s) => s.event)
      .filter((e): e is NonNullable<typeof e> => e !== undefined);
    this.displayMode = displayMode;
    this.iframe = document.getElementById("widget") as HTMLIFrameElement;
    window.addEventListener("message", (e) => this.onMessage(e));
    // Listener must exist before the widget can announce itself.
    this.iframe.src = "./widget.html";
    setInterval(() => this.tick(), EVENT_STEP_MS);
    log(
      `fixture "${fixture.name}" — task ${this.record.snapshot.id}, ` +
        `${this.queue.length} codex events queued, mode=${displayMode}`,
    );
  }

  private get snapshot(): TaskSnapshot {
    return refreshDerivedFlags(this.record.snapshot, nowIso());
  }

  private post(msg: unknown): void {
    this.iframe.contentWindow?.postMessage(msg, "*");
  }

  private onMessage(e: MessageEvent): void {
    if (e.source !== this.iframe.contentWindow) return;
    const msg = e.data as JsonRpcRequest;
    if (!msg || msg.jsonrpc !== "2.0" || typeof msg.method !== "string") return;

    switch (msg.method) {
      case "ui/initialize":
        log(`← ui/initialize from widget`);
        this.respond(msg.id, {
          protocolVersion: "2025-06-18",
          serverInfo: { name: "visual-team-dev-host", version: "0.1.0" },
          capabilities: {},
          hostContext: { displayMode: this.displayMode },
        });
        this.deliverInitialToolResult();
        break;
      case "tools/call":
        this.respond(msg.id, this.callTool(msg.params));
        break;
      case "ui/request-display-mode": {
        const mode = (msg.params as { mode?: string } | undefined)?.mode ?? "inline";
        log(`← ui/request-display-mode "${mode}" — resizing + reloading widget`);
        this.displayMode = mode;
        document.body.dataset.mode = mode;
        this.respond(msg.id, { mode });
        // Reload so the widget re-reads displayMode from ui/initialize.
        setTimeout(() => this.iframe.contentWindow?.location.reload(), 50);
        break;
      }
      default:
        this.error(msg.id, -32601, `unknown method: ${msg.method}`);
    }
  }

  private respond(id: number, result: unknown): void {
    this.post({ jsonrpc: "2.0", id, result });
  }

  private error(id: number, code: number, message: string): void {
    this.post({ jsonrpc: "2.0", id, error: { code, message } });
  }

  /** Delivers the same render-result contract used by the registered MCP tool. */
  private deliverInitialToolResult(): void {
    this.post({
      jsonrpc: "2.0",
      method: "ui/notifications/tool-result",
      params: createRenderVisualTaskResult({
        text: summarize(this.snapshot),
        task: this.snapshot,
        recentEvents: this.record.events.slice(-20),
        capability: this.capability,
      }),
    });
    log(`→ ui/notifications/tool-result (snapshot + capability)`);
  }

  private callTool(params: Record<string, unknown> | undefined): unknown {
    const name = params?.name;
    const args = (params?.arguments ?? {}) as Record<string, unknown>;
    const meta = (params?._meta ?? {}) as Record<string, unknown>;
    switch (name) {
      case "get_visual_task": {
        if (meta[TASK_CAPABILITY_META_KEY] !== this.capability || args.taskId !== this.record.snapshot.id) {
          log(`← tools/call get_visual_task — REJECTED (bad capability/taskId)`);
          return {
            content: [{ type: "text", text: "Unknown task or invalid capability." }],
            isError: true,
          };
        }
        const limit = typeof args.eventLimit === "number" ? args.eventLimit : 20;
        const snap = this.snapshot;
        this.polls += 1;
        log(
          `← tools/call get_visual_task #${this.polls} → ${snap.state}` +
            (snap.needsUser ? " (needs user)" : ""),
        );
        return {
          content: [{ type: "text", text: summarize(snap) }],
          structuredContent: { task: snap, recentEvents: this.record.events.slice(-limit) },
        };
      }
      case "record_codex_event":
        return this.recordCodexEvent(args);
      case "render_visual_task":
        return createRenderVisualTaskResult({
          text: summarize(this.snapshot),
          task: this.snapshot,
          recentEvents: this.record.events.slice(-20),
          capability: this.capability,
        });
      case "start_visual_task":
        return {
          content: [{ type: "text", text: summarize(this.snapshot) }],
          structuredContent: { taskId: this.record.snapshot.id, task: this.snapshot },
          _meta: { [TASK_CAPABILITY_META_KEY]: this.capability },
        };
      default:
        log(`← tools/call ${String(name)} — unknown tool`);
        return { content: [{ type: "text", text: `Unknown tool: ${String(name)}` }], isError: true };
    }
  }

  private recordCodexEvent(args: Record<string, unknown>): unknown {
    const mapped = mapCodexEvent({
      taskId: this.record.snapshot.id,
      name: args.name as CodexEventName,
      ...(args.payload ? { payload: args.payload as CodexHookPayload } : {}),
      at: typeof args.at === "string" ? args.at : nowIso(),
      eventId:
        typeof args.eventId === "string"
          ? args.eventId
          : `evt_${this.record.snapshot.id}_${this.record.snapshot.eventCount + 1}_${String(args.name)}`,
    });
    if (!mapped.ok) {
      log(`codex event ${String(args.name)} ignored: ${mapped.reason}`);
      return { content: [{ type: "text", text: `Ignored: ${mapped.reason}` }], structuredContent: { applied: false, reason: mapped.reason } };
    }
    const applied = applyAll(this.record, mapped.events);
    return {
      content: [{ type: "text", text: applied ? "Recorded." : "Duplicate event ignored." }],
      structuredContent: { applied, taskId: this.record.snapshot.id },
    };
  }

  private injectVisualEvent(event: VisualEvent): void {
    const result = applyEvent(this.record, event);
    if (!result.ok) log(`event ${event.kind} rejected: ${result.error ?? "unknown"}`);
  }

  /** Feed the next queued codex event through the real mapper, then autofinish. */
  private tick(): void {
    const next = this.queue.shift();
    if (next) {
      log(`codex → ${next.name}`);
      this.recordCodexEvent({ ...next, at: nowIso() });
      return;
    }
    if (this.finished) return;
    this.finished = true;
    setTimeout(() => {
      this.injectVisualEvent({
        id: "evt_dev_finish",
        taskId: this.record.snapshot.id,
        at: nowIso(),
        provenance: "observed",
        kind: "task_finished",
        label: "Task finished.",
      });
      log(`codex → task_finished (observed) — terminal state; widget stops polling`);
    }, AUTOFINISH_DELAY_MS);
  }
}

function applyAll(record: TaskRecord, events: VisualEvent[]): boolean {
  let changed = false;
  for (const event of events) {
    const result = applyEvent(record, event);
    if (!result.ok) return changed;
    changed = changed || result.changed;
  }
  return changed;
}

const params = new URLSearchParams(location.search);
const fixture = FIXTURES[params.get("fixture") ?? ""] ?? FIXTURES["team-with-permission"]!;
const mode = params.get("mode") ?? "inline";
document.body.dataset.mode = mode;
new DevHost(fixture, mode);
