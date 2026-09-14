/**
 * MCP Apps host bridge: `ui/*` JSON-RPC over window.postMessage, with
 * window.openai compatibility aliases (see plugins/build/chatgpt-ui docs).
 *
 * The UI never talks to the MCP server directly; all data flows through the
 * host, which is why the resource declares an empty connectDomains CSP.
 */

export interface ToolResultMessage {
  content?: Array<{ type: string; text?: string }>;
  structuredContent?: Record<string, unknown>;
  _meta?: Record<string, unknown>;
  isError?: boolean;
}

interface ToolResponseMetadata {
  mcp_tool_result?: ToolResultMessage;
  call_tool_result?: ToolResultMessage;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: number;
  result?: unknown;
  error?: { code: number; message: string };
}

interface JsonRpcNotification {
  jsonrpc: "2.0";
  method: string;
  params?: unknown;
}

declare global {
  interface Window {
    openai?: {
      toolInput?: unknown;
      /** Model-visible structured content, without private MCP result metadata. */
      toolOutput?: Record<string, unknown>;
      /** Widget-only MCP result envelope, including the result `_meta`. */
      toolResponseMetadata?: ToolResponseMetadata;
      displayMode?: string;
      callTool?: (name: string, args: Record<string, unknown>) => Promise<ToolResultMessage>;
      sendFollowUpMessage?: (args: { prompt: string }) => Promise<void>;
      requestDisplayMode?: (args: { mode: string }) => Promise<unknown>;
      setWidgetState?: (state: unknown) => Promise<void>;
    };
    __VISUAL_TEAM_DEV__?: {
      toolResult: ToolResultMessage;
      displayMode: string;
    };
  }
}

type NotificationHandler = (method: string, params: unknown) => void;

export type DisplayMode = "inline" | "fullscreen" | "pip";

const DISPLAY_MODES = new Set<DisplayMode>(["inline", "fullscreen", "pip"]);
const SET_GLOBALS_EVENT_TYPE = "openai:set_globals";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function asDisplayMode(value: unknown): DisplayMode | null {
  return typeof value === "string" && DISPLAY_MODES.has(value as DisplayMode)
    ? (value as DisplayMode)
    : null;
}

/**
 * React-facing state for a host-owned global. It changes only when the host
 * provides a supported actual mode: initialize context, a set-globals event,
 * or the result of a successful display-mode request.
 */
export class DisplayModeStore {
  private mode: DisplayMode = "inline";
  private readonly listeners = new Set<() => void>();

  current(): DisplayMode {
    return this.mode;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  apply(value: unknown): boolean {
    const mode = asDisplayMode(value);
    if (!mode || mode === this.mode) return false;
    this.mode = mode;
    for (const listener of this.listeners) listener();
    return true;
  }

  applyInitializeResult(result: unknown): boolean {
    return this.apply(asRecord(asRecord(result)?.hostContext)?.displayMode);
  }

  applyHostGlobals(detail: unknown): boolean {
    return this.apply(asRecord(asRecord(detail)?.globals)?.displayMode);
  }

  applyRequestResponse(result: unknown): boolean {
    const response = asRecord(result);
    return this.apply(
      response?.displayMode ?? response?.mode ?? asRecord(response?.hostContext)?.displayMode,
    );
  }
}

/**
 * A mode request is advisory. Do not optimistically change layout: only a
 * valid host response (or its updated global) can update the store.
 */
export async function applyDisplayModeRequest(
  request: () => Promise<unknown>,
  store: DisplayModeStore,
  readHostMode?: () => unknown,
): Promise<boolean> {
  try {
    const response = await request();
    return store.applyRequestResponse(response) || store.apply(readHostMode?.());
  } catch {
    return false;
  }
}

/**
 * Merge the host's `window.openai` compatibility globals (or the partial
 * `openai:set_globals` payload) into one tool-result envelope. The private
 * `_meta` only ever travels inside the metadata envelope; public output may
 * arrive on `toolOutput` alone.
 */
export function toolResultFromGlobals(globals: {
  toolOutput?: unknown;
  toolResponseMetadata?: unknown;
}): ToolResultMessage | null {
  const metadata = asRecord(globals.toolResponseMetadata) as ToolResponseMetadata | null;
  const envelope = asRecord(metadata?.mcp_tool_result) ?? asRecord(metadata?.call_tool_result);
  const output = asRecord(globals.toolOutput);
  if (envelope) {
    return {
      ...(envelope as ToolResultMessage),
      ...(envelope.structuredContent || !output ? {} : { structuredContent: output }),
    };
  }
  if (output) return { structuredContent: output };
  return null;
}

export class HostBridge {
  private pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
  private handlers = new Set<NotificationHandler>();
  private toolResultHandlers = new Set<(result: ToolResultMessage) => void>();
  private nextId = 1;
  private started = false;
  private readonly displayModes = new DisplayModeStore();
  private latestToolResult: ToolResultMessage | null = null;

  /** Dev harness support: dev.html injects window.__VISUAL_TEAM_DEV__. */
  get devData(): { toolResult: ToolResultMessage; displayMode: string } | null {
    return typeof window !== "undefined" ? window.__VISUAL_TEAM_DEV__ ?? null : null;
  }

  /**
   * Best currently available tool result, from whichever supported channel
   * delivered it: a captured tool-result notification, or the host globals.
   * Safe to call after subscribing — covers the gap before the subscription.
   */
  currentToolResult(): ToolResultMessage | null {
    const dev = this.devData;
    if (dev) return dev.toolResult;
    return this.latestToolResult ?? toolResultFromGlobals({
      toolOutput: window.openai?.toolOutput,
      toolResponseMetadata: window.openai?.toolResponseMetadata,
    });
  }

  /** Envelopes from any supported channel, newest first per channel. */
  onToolResult(handler: (result: ToolResultMessage) => void): () => void {
    this.toolResultHandlers.add(handler);
    return () => this.toolResultHandlers.delete(handler);
  }

  private deliverToolResult(result: ToolResultMessage): void {
    this.latestToolResult = result;
    for (const handler of this.toolResultHandlers) handler(result);
  }

  start(): void {
    if (this.started || typeof window === "undefined") return;
    this.started = true;
    this.displayModes.apply(this.devData?.displayMode ?? window.openai?.displayMode);
    window.addEventListener(
      SET_GLOBALS_EVENT_TYPE,
      (event) => {
        const detail = (event as CustomEvent<unknown>).detail;
        this.displayModes.applyHostGlobals(detail);
        // Host globals can deliver or refresh task data after mount; the
        // detail is partial, so fall back to the current global values.
        const globals = asRecord(asRecord(detail)?.globals);
        if (globals && ("toolOutput" in globals || "toolResponseMetadata" in globals)) {
          const result = toolResultFromGlobals({
            toolOutput: "toolOutput" in globals ? globals.toolOutput : window.openai?.toolOutput,
            toolResponseMetadata:
              "toolResponseMetadata" in globals
                ? globals.toolResponseMetadata
                : window.openai?.toolResponseMetadata,
          });
          if (result) this.deliverToolResult(result);
        }
      },
      { passive: true },
    );
    window.addEventListener("message", (event) => {
      if (event.source !== window.parent) return;
      const msg = event.data as JsonRpcResponse | JsonRpcNotification;
      if (!msg || msg.jsonrpc !== "2.0") return;
      if ("id" in msg && typeof msg.id === "number") {
        const p = this.pending.get(msg.id);
        if (p) {
          this.pending.delete(msg.id);
          if (msg.error) p.reject(new Error(msg.error.message));
          else p.resolve(msg.result);
        }
        return;
      }
      if ("method" in msg) {
        if (msg.method === "ui/notifications/tool-result") {
          this.deliverToolResult(msg.params as ToolResultMessage);
        }
        for (const h of this.handlers) h(msg.method, msg.params);
      }
    });
    // Announce ourselves per MCP Apps, then signal readiness with
    // ui/notifications/initialized — strict hosts gate tool-result delivery on
    // it. Failure is fine on dev/unsupported hosts.
    void this.request("ui/initialize", {
      protocolVersion: "2025-06-18",
      clientInfo: { name: "visual-team-ui", version: "0.1.0" },
      capabilities: {},
    }).then((result) => {
      this.displayModes.applyInitializeResult(result);
      this.notify("ui/notifications/initialized");
    }).catch(() => undefined);
  }

  onNotification(handler: NotificationHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  /** A JSON-RPC notification carries no id and expects no response. */
  notify(method: string, params?: unknown): void {
    if (typeof window === "undefined" || window.parent === window) return;
    window.parent.postMessage({ jsonrpc: "2.0", method, params }, "*");
  }

  request(method: string, params?: unknown, deadlineMs = 10_000): Promise<unknown> {
    if (typeof window === "undefined" || window.parent === window) {
      return Promise.reject(new Error("no host bridge"));
    }
    const id = this.nextId++;
    window.parent.postMessage({ jsonrpc: "2.0", id, method, params }, "*");
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      setTimeout(() => {
        if (this.pending.delete(id)) reject(new Error(`bridge timeout: ${method}`));
      }, deadlineMs);
    });
  }

  /** Call an MCP tool through the host with optional private request metadata. */
  async callTool(
    name: string,
    args: Record<string, unknown>,
    meta?: Record<string, unknown>,
  ): Promise<ToolResultMessage> {
    const result = await this.request("tools/call", {
      name,
      arguments: args,
      ...(meta ? { _meta: meta } : {}),
    });
    return result as ToolResultMessage;
  }

  /**
   * Documented host mechanism to recover from a missing render: ask the host
   * to pass a re-render request to the conversation. Never creates a task,
   * emits an event, or contacts the server directly. Returns false when the
   * host cannot take the message.
   */
  async askForRender(): Promise<boolean> {
    if (typeof window === "undefined") return false;
    const text = "Please render the Visual Team board again.";
    if (window.openai?.sendFollowUpMessage) {
      try {
        await window.openai.sendFollowUpMessage({ prompt: text });
        return true;
      } catch {
        return false;
      }
    }
    if (window.parent === window) return false;
    try {
      await this.request("ui/message", {
        role: "user",
        content: [{ type: "text", text }],
      });
      return true;
    } catch {
      return false;
    }
  }

  async requestDisplayMode(mode: DisplayMode): Promise<boolean> {
    if (window.openai?.requestDisplayMode) {
      return applyDisplayModeRequest(
        () => window.openai!.requestDisplayMode!({ mode }),
        this.displayModes,
        () => window.openai?.displayMode,
      );
    }
    return applyDisplayModeRequest(
      () => this.request("ui/request-display-mode", { mode }),
      this.displayModes,
    );
  }

  currentDisplayMode(): DisplayMode {
    return this.displayModes.current();
  }

  subscribeDisplayMode(listener: () => void): () => void {
    return this.displayModes.subscribe(listener);
  }
}

export const hostBridge = new HostBridge();
