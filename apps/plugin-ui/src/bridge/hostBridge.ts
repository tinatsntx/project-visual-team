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

export class HostBridge {
  private pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
  private handlers = new Set<NotificationHandler>();
  private nextId = 1;
  private started = false;
  private readonly displayModes = new DisplayModeStore();
  private latestToolResult: ToolResultMessage | null = null;

  /** Dev harness support: dev.html injects window.__VISUAL_TEAM_DEV__. */
  get devData(): { toolResult: ToolResultMessage; displayMode: string } | null {
    return typeof window !== "undefined" ? window.__VISUAL_TEAM_DEV__ ?? null : null;
  }

  /**
   * Return the result that caused this widget to mount. ChatGPT exposes the
   * model-visible structured content and the private result envelope on
   * separate bridge globals, so merge them before React initializes.
   */
  initialToolResult(): ToolResultMessage | null {
    const dev = this.devData;
    if (dev) return dev.toolResult;

    const metadata = window.openai?.toolResponseMetadata;
    const fromMetadata = metadata?.mcp_tool_result ?? metadata?.call_tool_result;
    const structuredContent = window.openai?.toolOutput;
    if (fromMetadata) {
      return {
        ...fromMetadata,
        ...(fromMetadata.structuredContent ? {} : { structuredContent }),
      };
    }
    if (this.latestToolResult) {
      return {
        ...this.latestToolResult,
        ...(this.latestToolResult.structuredContent ? {} : { structuredContent }),
      };
    }
    if (structuredContent) return { structuredContent };
    return null;
  }

  start(): void {
    if (this.started || typeof window === "undefined") return;
    this.started = true;
    this.displayModes.apply(this.devData?.displayMode ?? window.openai?.displayMode);
    window.addEventListener(
      SET_GLOBALS_EVENT_TYPE,
      (event) => {
        this.displayModes.applyHostGlobals((event as CustomEvent<unknown>).detail);
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
          this.latestToolResult = msg.params as ToolResultMessage;
        }
        for (const h of this.handlers) h(msg.method, msg.params);
      }
    });
    // Announce ourselves per MCP Apps; failure is fine on dev/unsupported hosts.
    void this.request("ui/initialize", {
      protocolVersion: "2025-06-18",
      clientInfo: { name: "visual-team-ui", version: "0.1.0" },
      capabilities: {},
    }).then((result) => {
      this.displayModes.applyInitializeResult(result);
    }).catch(() => undefined);
  }

  onNotification(handler: NotificationHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  request(method: string, params?: unknown): Promise<unknown> {
    if (typeof window === "undefined" || window.parent === window) {
      return Promise.reject(new Error("no host bridge"));
    }
    const id = this.nextId++;
    window.parent.postMessage({ jsonrpc: "2.0", id, method, params }, "*");
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      setTimeout(() => {
        if (this.pending.delete(id)) reject(new Error(`bridge timeout: ${method}`));
      }, 10_000);
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
