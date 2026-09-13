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
      toolOutput?: ToolResultMessage;
      displayMode?: string;
      callTool?: (name: string, args: Record<string, unknown>) => Promise<ToolResultMessage>;
      sendFollowUpMessage?: (args: { prompt: string }) => Promise<void>;
      requestDisplayMode?: (args: { mode: string }) => Promise<{ mode: string }>;
      setWidgetState?: (state: unknown) => Promise<void>;
    };
    __VISUAL_TEAM_DEV__?: {
      toolResult: ToolResultMessage;
      displayMode: string;
    };
  }
}

type NotificationHandler = (method: string, params: unknown) => void;

class HostBridge {
  private pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
  private handlers = new Set<NotificationHandler>();
  private nextId = 1;
  private started = false;
  private displayMode: string | null = null;

  /** Dev harness support: dev.html injects window.__VISUAL_TEAM_DEV__. */
  get devData(): { toolResult: ToolResultMessage; displayMode: string } | null {
    return typeof window !== "undefined" ? window.__VISUAL_TEAM_DEV__ ?? null : null;
  }

  start(): void {
    if (this.started || typeof window === "undefined") return;
    this.started = true;
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
        for (const h of this.handlers) h(msg.method, msg.params);
      }
    });
    // Announce ourselves per MCP Apps; failure is fine on dev/unsupported hosts.
    void this.request("ui/initialize", {
      protocolVersion: "2025-06-18",
      clientInfo: { name: "visual-team-ui", version: "0.1.0" },
      capabilities: {},
    }).then((result) => {
      const hostContext = (result as { hostContext?: { displayMode?: string } } | undefined)?.hostContext;
      if (hostContext?.displayMode) this.displayMode = hostContext.displayMode;
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

  /** Call an MCP tool through the host (`tools/call`), with window.openai fallback. */
  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResultMessage> {
    if (window.openai?.callTool) return window.openai.callTool(name, args);
    const result = await this.request("tools/call", { name, arguments: args });
    return result as ToolResultMessage;
  }

  async requestDisplayMode(mode: "inline" | "fullscreen" | "pip"): Promise<void> {
    if (window.openai?.requestDisplayMode) {
      await window.openai.requestDisplayMode({ mode });
      return;
    }
    await this.request("ui/request-display-mode", { mode }).catch(() => undefined);
  }

  currentDisplayMode(): string {
    return this.devData?.displayMode ?? window.openai?.displayMode ?? this.displayMode ?? "inline";
  }
}

export const hostBridge = new HostBridge();
