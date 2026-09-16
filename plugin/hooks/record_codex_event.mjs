#!/usr/bin/env node
/**
 * Visual Team — bundled Codex hook (PROJECT_PLAN.md §10, §13.4).
 *
 * Usage: record_codex_event.mjs <CodexEventName>
 *
 * Reads the Codex hook payload (JSON) from stdin and forwards a bounded
 * metadata allowlist to the `record_codex_event` MCP tool on the Visual Team
 * server via Streamable HTTP. This hook RECORDS ONLY: it cannot approve,
 * deny, rewrite, or block any Codex action, it never writes to stdout or
 * stderr, and it always exits 0 — even on malformed input, bad
 * configuration, an unreachable server, or a timeout — so a delivery
 * failure never interrupts work.
 *
 * Correlation (M4): an event is normally delivered without a taskId and the
 * server binds it only when the session/agent was already correlated by
 * observed evidence — never a most-recent-task guess. The single bootstrap
 * is the start-tool receipt: a PostToolUse on `mcp__*__start_visual_task`
 * whose parsed tool_response carries a validated `vt_<24 hex>` taskId in
 * structuredContent. Only that structured field is read — tool inputs and
 * arbitrary response bodies are never scanned, stored, or sent. On the
 * pinned runtime (codex 0.154.x) subagent and resumed-session hooks share
 * the root session_id, so no local state file is needed.
 *
 * Endpoint resolution (brief 012): a defined VISUAL_TEAM_MCP_URL wins and
 * must be a valid http(s) URL — a defined but empty/malformed/non-http(s)
 * value records nothing. Otherwise the packaged MCP config is read relative
 * to the installed plugin root: <root>/.mcp.json (Legacy layout) is the
 * selected config when present, else <root>/mcp.json (portable layout).
 * Only mcpServers.visual-team.url is read. A missing, malformed, or
 * non-http(s) selected config records nothing. There is no implicit
 * localhost fallback and never a second endpoint tried after a selection.
 *         VISUAL_TEAM_TASK_ID (optional explicit override).
 *
 * Uses node:http (no fetch/undici) so the process exits cleanly on Windows.
 */

import { existsSync, readFileSync } from "node:fs";
import http from "node:http";
import https from "node:https";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const EVENT_NAME = process.argv[2] ?? "PostToolUse";
const TASK_ID = process.env.VISUAL_TEAM_TASK_ID || undefined;
const TIMEOUT_MS = 4_000;
const MAX_STDIN_BYTES = 64 * 1024;
const MAX_RESPONSE_BYTES = 256 * 1024;
const MAX_RUNTIME_MS = 9_000;
const TASK_ID_PATTERN = /^vt_[0-9a-f]{24}$/;

/** Accept only absolute http(s) URLs; anything else records nothing. */
function parseHttpUrl(value) {
  if (typeof value !== "string" || value.trim() === "") return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url : undefined;
  } catch {
    return undefined;
  }
}

function readSelectedConfigUrl() {
  // This script lives at <root>/hooks/record_codex_event.mjs; the packaged
  // MCP config sits at the installed root in either spelling.
  const root = dirname(dirname(fileURLToPath(import.meta.url)));
  for (const name of [".mcp.json", "mcp.json"]) {
    const path = join(root, name);
    if (!existsSync(path)) continue;
    // The first config that exists is the selected one — malformed JSON or a
    // missing/invalid url means record nothing, not fall back to another file.
    let parsed;
    try {
      parsed = JSON.parse(readFileSync(path, "utf8"));
    } catch {
      return undefined;
    }
    return parseHttpUrl(parsed?.mcpServers?.["visual-team"]?.url);
  }
  return undefined;
}

function resolveMcpUrl() {
  const override = process.env.VISUAL_TEAM_MCP_URL;
  if (override !== undefined) return parseHttpUrl(override); // defined wins; bad defined = silent
  return readSelectedConfigUrl();
}

const MCP_URL = resolveMcpUrl();

function readStdin() {
  return new Promise((resolve) => {
    const chunks = [];
    let bytes = 0;
    let truncated = false;
    process.stdin.on("data", (c) => {
      if (bytes + c.length > MAX_STDIN_BYTES) {
        truncated = true;
        const take = Math.max(0, MAX_STDIN_BYTES - bytes);
        if (take) chunks.push(c.subarray(0, take));
        bytes += take;
        return;
      }
      chunks.push(c);
      bytes += c.length;
    });
    process.stdin.on("end", () =>
      resolve({ text: Buffer.concat(chunks).toString("utf8"), truncated }),
    );
    process.stdin.on("error", () => resolve({ text: "", truncated: true }));
    setTimeout(() => resolve({ text: "", truncated: true }), TIMEOUT_MS).unref();
  });
}

function parsePayload(obj) {
  // Keep only non-sensitive correlation fields (plan §13.4). Prompt text,
  // tool inputs/responses, transcripts, paths, and cwd never leave stdin.
  const keep = ["session_id", "turn_id", "agent_id", "agent_type", "tool_name"];
  const payload = {};
  for (const k of keep) if (typeof obj[k] === "string") payload[k] = obj[k].slice(0, 256);
  return payload;
}

/**
 * The only receipt trusted to bootstrap a binding: a successful PostToolUse
 * on a Visual Team start tool. The task id comes exclusively from the
 * parsed structured result — never from tool_input or raw text.
 */
function extractReceiptTaskId(obj) {
  if (EVENT_NAME !== "PostToolUse") return undefined;
  const toolName = obj?.tool_name;
  if (
    typeof toolName !== "string" ||
    (toolName !== "start_visual_task" && !toolName.endsWith("__start_visual_task"))
  ) {
    return undefined;
  }
  let res = obj?.tool_response;
  if (typeof res === "string") {
    try {
      res = JSON.parse(res);
    } catch {
      return undefined;
    }
  }
  if (!res || typeof res !== "object" || res.isError === true) return undefined;
  const taskId = res?.structuredContent?.taskId;
  return typeof taskId === "string" && TASK_ID_PATTERN.test(taskId) ? taskId : undefined;
}

function rpc(method, params, id) {
  return new Promise((resolve) => {
    const body = JSON.stringify({ jsonrpc: "2.0", ...(id !== undefined ? { id } : {}), method, params });
    const mod = MCP_URL.protocol === "https:" ? https : http;
    const req = mod.request(
      {
        hostname: MCP_URL.hostname,
        port: MCP_URL.port || (MCP_URL.protocol === "https:" ? 443 : 80),
        path: MCP_URL.pathname + MCP_URL.search,
        method: "POST",
        agent: false,
        timeout: TIMEOUT_MS,
        headers: {
          "content-type": "application/json",
          accept: "application/json, text/event-stream",
          "content-length": Buffer.byteLength(body),
          connection: "close",
        },
      },
      (res) => {
        const chunks = [];
        let bytes = 0;
        res.on("data", (c) => {
          if (bytes + c.length > MAX_RESPONSE_BYTES) return req.destroy();
          chunks.push(c);
          bytes += c.length;
        });
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          const dataLine = text.split("\n").filter((l) => l.startsWith("data:")).at(-1);
          const raw = dataLine ? dataLine.slice(5).trim() : text;
          try {
            resolve(raw ? JSON.parse(raw) : null);
          } catch {
            resolve(null);
          }
        });
        res.on("error", () => resolve(null));
      },
    );
    req.on("timeout", () => req.destroy());
    req.on("error", () => resolve(null));
    req.end(body);
  });
}

async function main() {
  if (!MCP_URL) return; // unusable configuration — nothing to do
  const { text, truncated } = await readStdin();
  // Malformed, empty, or oversized input records nothing — the hook never
  // emits observed activity on data it could not fully parse.
  if (truncated || !text) return;
  let obj;
  try {
    obj = JSON.parse(text);
  } catch {
    return;
  }
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return;
  const payload = parsePayload(obj);
  const taskId = TASK_ID ?? extractReceiptTaskId(obj);
  const args = {
    name: EVENT_NAME,
    at: new Date().toISOString(),
    eventId: `hook_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    payload,
    ...(taskId ? { taskId } : {}),
  };
  await rpc("initialize", {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "visual-team-hook", version: "0.1.0" },
  }, 1);
  await rpc("notifications/initialized", {});
  await rpc("tools/call", { name: "record_codex_event", arguments: args }, 2);
}

// Record-only: hard total-runtime bound, no output, always exit 0.
const watchdog = setTimeout(() => process.exit(0), MAX_RUNTIME_MS);
main()
  .catch(() => undefined)
  .finally(() => {
    clearTimeout(watchdog);
    process.exitCode = 0;
  });
