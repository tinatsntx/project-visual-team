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
import reviewUntrackedFixture from "../../../../packages/test-fixtures/fixtures/review-untracked.json";
import reportedQuestionFixture from "../../../../packages/test-fixtures/fixtures/reported-question.json";
import completedVerifiedFixture from "../../../../packages/test-fixtures/fixtures/completed-verified.json";
import failedVerificationFixture from "../../../../packages/test-fixtures/fixtures/failed-verification.json";
import longLabelsFixture from "../../../../packages/test-fixtures/fixtures/long-labels.json";
import { syntheticCompletionDiagnostic } from "./diagnostics.js";

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
  "review-untracked": reviewUntrackedFixture as unknown as ReplayFixture,
  "reported-question": reportedQuestionFixture as unknown as ReplayFixture,
  "completed-verified": completedVerifiedFixture as unknown as ReplayFixture,
  "failed-verification": failedVerificationFixture as unknown as ReplayFixture,
  "long-labels": longLabelsFixture as unknown as ReplayFixture,
};

const EVENT_STEP_MS = 3_000;
const AUTOFINISH_DELAY_MS = 7_000;
const SPLIT_META_DELAY_MS = 1_500;
const GLOBALS_DELAY_MS = 1_200;

/**
 * Harness delivery controls (?delivery=, ?read=, ?capability=) reproduce the
 * supported host orderings and failures the widget must survive. They are
 * synthetic host behavior — never evidence of native delivery.
 */
type DeliveryMode = "initialized" | "immediate" | "split" | "globals" | "never";
type ReadMode = "ok" | "reject" | "drop";
type QueueStep =
  | { codex: NonNullable<ReplayFixture["steps"][number]["event"]> }
  | { visual: NonNullable<ReplayFixture["steps"][number]["visual"]> };

interface DevHostOptions {
  fixture: ReplayFixture;
  displayMode: string;
  delivery: DeliveryMode;
  read: ReadMode;
  withCapability: boolean;
  /** Reject the widget's documented re-render request (ui/message). */
  askReject: boolean;
}

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
  private readonly queue: QueueStep[];
  private readonly delivery: DeliveryMode;
  /** Mutable so the harness can switch read behavior in the same iframe. */
  private readMode: ReadMode;
  private readonly withCapability: boolean;
  private readonly askReject: boolean;
  private displayMode: string;
  private polls = 0;
  private finished = false;

  constructor(options: DevHostOptions) {
    const { fixture, displayMode, delivery, read, withCapability, askReject } = options;
    const start = fixture.steps.find((s) => s.kind === "start");
    if (!start?.input) throw new Error(`fixture ${fixture.name} has no start step`);
    this.record = createTaskRecord(start.input as StartVisualTaskInput, {
      taskId: `vt_dev_${fixture.name.replaceAll("-", "_")}`,
      startedAt: nowIso(),
      eventId: "evt_dev_start",
    });
    // Ordered queue preserves fixture interleaving: literal visual events
    // (reported waits/finishes — model calls, not hook traffic) replay
    // through the real reducer alongside mapped codex events.
    this.queue = fixture.steps.flatMap((s): QueueStep[] => {
      if (s.event) return [{ codex: s.event }];
      if (s.visual) return [{ visual: s.visual }];
      return [];
    });
    this.displayMode = displayMode;
    this.delivery = delivery;
    this.readMode = read;
    this.withCapability = withCapability;
    this.askReject = askReject;
    this.iframe = document.getElementById("widget") as HTMLIFrameElement;
    window.addEventListener("message", (e) => this.onMessage(e));
    // Listener must exist before the widget can announce itself.
    this.iframe.src = "./widget.html";
    setInterval(() => this.tick(), EVENT_STEP_MS);
    document.querySelectorAll<HTMLButtonElement>("[data-host-mode]").forEach((button) => {
      button.addEventListener("click", () => {
        this.setDisplayMode(button.dataset.hostMode, "host-initiated control");
      });
    });
    // Runtime read-behavior switch: flip reject/drop to ok without recreating
    // the iframe, so a stale banner can recover to live in the same view.
    document.querySelectorAll<HTMLButtonElement>("[data-read-mode]").forEach((button) => {
      button.addEventListener("click", () => {
        const mode = button.dataset.readMode;
        if (mode === "ok" || mode === "reject" || mode === "drop") {
          this.readMode = mode;
          log(`read mode → ${mode} (runtime switch, iframe retained)`);
        }
      });
    });
    log(
      `fixture "${fixture.name}" — task ${this.record.snapshot.id}, ` +
        `${this.queue.length} codex events queued, mode=${displayMode}, ` +
        `delivery=${delivery}, read=${read}, capability=${withCapability ? "with" : "none"}`,
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

    if (typeof msg.id !== "number") {
      // Notifications expect no response.
      if (msg.method === "ui/notifications/initialized") {
        log(`← ui/notifications/initialized — widget ready`);
        this.onWidgetInitialized();
      }
      return;
    }

    switch (msg.method) {
      case "ui/initialize":
        log(`← ui/initialize from widget`);
        this.respond(msg.id, {
          protocolVersion: "2025-06-18",
          serverInfo: { name: "visual-team-dev-host", version: "0.1.0" },
          capabilities: {},
          hostContext: { displayMode: this.displayMode },
        });
        if (this.delivery === "immediate") this.deliverInitialToolResult();
        break;
      case "tools/call": {
        const result = this.callTool(msg.params);
        if (result !== undefined) this.respond(msg.id, result);
        break;
      }
      case "ui/message":
        if (this.askReject) {
          log(`← ui/message — REJECTED (ask=reject); widget must show static guidance`);
          this.respond(msg.id, { isError: true });
        } else {
          log(`← ui/message — widget asked the host to take a message`);
          this.respond(msg.id, {});
        }
        break;
      case "ui/request-display-mode": {
        const mode = (msg.params as { mode?: string } | undefined)?.mode ?? "inline";
        log(`← ui/request-display-mode "${mode}" — host accepted without reloading widget`);
        this.setDisplayMode(mode, "widget request");
        this.respond(msg.id, { mode });
        break;
      }
      default:
        this.error(msg.id, -32601, `unknown method: ${msg.method}`);
    }
  }

  /** Spec order: data may flow only after the View reports itself ready. */
  private onWidgetInitialized(): void {
    if (this.delivery !== "immediate") this.deliverInitialToolResult();
  }

  private respond(id: number, result: unknown): void {
    this.post({ jsonrpc: "2.0", id, result });
  }

  private error(id: number, code: number, message: string): void {
    this.post({ jsonrpc: "2.0", id, error: { code, message } });
  }

  /**
   * Test the documented host-global update path in the already-mounted iframe.
   * Deliberately do not reload: a reload would hide React subscription bugs.
   */
  private setDisplayMode(mode: string | undefined, source: string): void {
    if (mode !== "inline" && mode !== "fullscreen" && mode !== "pip") {
      log(`host mode "${String(mode)}" ignored — unsupported`);
      return;
    }
    this.displayMode = mode;
    document.body.dataset.mode = mode;
    const child = this.iframe.contentWindow;
    if (child) {
      child.dispatchEvent(
        new CustomEvent("openai:set_globals", {
          detail: { globals: { displayMode: mode } },
        }),
      );
    }
    log(`→ openai:set_globals displayMode="${mode}" (${source}; iframe retained)`);
  }

  private postGlobals(globals: Record<string, unknown>): void {
    this.iframe.contentWindow?.dispatchEvent(
      new CustomEvent("openai:set_globals", { detail: { globals } }),
    );
  }

  private fullResult() {
    return createRenderVisualTaskResult({
      text: summarize(this.snapshot),
      task: this.snapshot,
      recentEvents: this.record.events.slice(-20),
      capability: this.capability,
    });
  }

  private postToolResult(params: unknown, note: string): void {
    this.post({ jsonrpc: "2.0", method: "ui/notifications/tool-result", params });
    log(`→ ui/notifications/tool-result (${note})`);
  }

  /**
   * Delivers the same render-result contract used by the registered MCP tool,
   * through the selected supported ordering/channel. The capability lives
   * only in the private `_meta` envelope, as in production.
   */
  private deliverInitialToolResult(): void {
    const full = this.fullResult();
    const publicOnly = { content: full.content, structuredContent: full.structuredContent };
    const metaEnvelope = { _meta: full._meta };
    const result = this.withCapability ? full : publicOnly;

    switch (this.delivery) {
      case "never":
        log(`delivery=never — no initial result sent; widget must reach its bounded wait`);
        return;
      case "globals":
        setTimeout(() => {
          this.postGlobals({
            toolOutput: result.structuredContent,
            toolResponseMetadata: { mcp_tool_result: result },
          });
          log(`→ openai:set_globals toolOutput+toolResponseMetadata (globals-only delivery)`);
        }, GLOBALS_DELAY_MS);
        return;
      case "split":
        this.postToolResult(publicOnly, "public output only; private metadata delayed");
        if (this.withCapability) {
          setTimeout(() => {
            this.postGlobals({ toolResponseMetadata: { mcp_tool_result: metaEnvelope } });
            log(`→ openai:set_globals toolResponseMetadata (private metadata, delayed)`);
          }, SPLIT_META_DELAY_MS);
        }
        return;
      default:
        this.postToolResult(
          result,
          this.withCapability ? "snapshot + capability" : "snapshot only; no capability",
        );
    }
  }

  private callTool(params: Record<string, unknown> | undefined): unknown {
    const name = params?.name;
    const args = (params?.arguments ?? {}) as Record<string, unknown>;
    const meta = (params?._meta ?? {}) as Record<string, unknown>;
    switch (name) {
      case "get_visual_task": {
        if (this.readMode === "drop") {
          log(`← tools/call get_visual_task — read=drop, no response (bridge deadline applies)`);
          return undefined;
        }
        if (
          this.readMode === "reject" ||
          meta[TASK_CAPABILITY_META_KEY] !== this.capability ||
          args.taskId !== this.record.snapshot.id
        ) {
          log(
            `← tools/call get_visual_task — REJECTED ` +
              `(generic unknown-task/invalid-capability error)`,
          );
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

  private injectVisualEvent(event: VisualEvent) {
    const result = applyEvent(this.record, event);
    if (!result.ok) log(`event ${event.kind} rejected: ${result.error ?? "unknown"}`);
    return result;
  }

  /** Feed the next queued step through the real mapper/reducer, then autofinish. */
  private tick(): void {
    const next = this.queue.shift();
    if (next) {
      if ("codex" in next) {
        log(`codex → ${next.codex.name}`);
        this.recordCodexEvent({ ...next.codex, at: nowIso() });
      } else {
        log(`reported → ${next.visual.kind}`);
        const result = this.injectVisualEvent({
          ...next.visual,
          taskId: this.record.snapshot.id,
          at: next.visual.at ?? nowIso(),
          provenance: next.visual.provenance ?? "reported",
        } as VisualEvent);
        if (!result.ok) log(`visual event ${next.visual.id} rejected: ${result.error ?? "unknown"}`);
      }
      return;
    }
    if (this.finished) return;
    // A fixture that already reached a terminal or waiting state is its own
    // ending — don't force a finish on top of it.
    const terminalOrWaiting = new Set(["COMPLETED", "FAILED", "CANCELED", "WAITING_FOR_USER"]);
    if (terminalOrWaiting.has(this.record.snapshot.state)) {
      this.finished = true;
      log(`fixture ended in ${this.record.snapshot.state} — no autofinish`);
      return;
    }
    this.finished = true;
    setTimeout(() => {
      const result = this.injectVisualEvent({
        id: "evt_dev_finish",
        taskId: this.record.snapshot.id,
        at: nowIso(),
        provenance: "reported",
        kind: "task_finished",
        label: "Synthetic harness completion.",
      });
      log(syntheticCompletionDiagnostic(result));
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
const DELIVERIES = new Set(["initialized", "immediate", "split", "globals", "never"]);
const READS = new Set(["ok", "reject", "drop"]);
const deliveryParam = params.get("delivery") ?? "initialized";
const readParam = params.get("read") ?? "ok";
document.body.dataset.mode = mode;
new DevHost({
  fixture,
  displayMode: mode,
  delivery: (DELIVERIES.has(deliveryParam) ? deliveryParam : "initialized") as DeliveryMode,
  read: (READS.has(readParam) ? readParam : "ok") as ReadMode,
  withCapability: params.get("capability") !== "none",
  askReject: params.get("ask") === "reject",
});
