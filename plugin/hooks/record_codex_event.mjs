#!/usr/bin/env node
/**
 * Visual Team — bundled Codex hook (PROJECT_PLAN.md §10, §13.4).
 *
 * Usage: record_codex_event.mjs <CodexEventName>
 *
 * Reads the Codex hook payload (JSON) from stdin and forwards it to the
 * `record_codex_event` MCP tool on the already-connected Visual Team server
 * via Streamable HTTP. This hook RECORDS ONLY: it cannot approve, deny,
 * rewrite, or block any Codex action, it never prints a decision payload,
 * and it always exits 0 so a delivery failure never interrupts work.
 *
 * Uses node:http (no fetch/undici) so the process exits cleanly on Windows.
 *
 * Config: VISUAL_TEAM_MCP_URL (default http://localhost:8787/mcp),
 *         VISUAL_TEAM_TASK_ID (optional; otherwise the server attaches to the
 *         most recently active task).
 */

import http from "node:http";
import https from "node:https";

const MCP_URL = new URL(process.env.VISUAL_TEAM_MCP_URL ?? "http://localhost:8787/mcp");
const EVENT_NAME = process.argv[2] ?? "PostToolUse";
const TASK_ID = process.env.VISUAL_TEAM_TASK_ID;
const TIMEOUT_MS = 4_000;

function readStdin() {
  return new Promise((resolve) => {
    const chunks = [];
    process.stdin.on("data", (c) => chunks.push(c));
    process.stdin.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    process.stdin.on("error", () => resolve(""));
    setTimeout(() => resolve(""), TIMEOUT_MS).unref();
  });
}

function parsePayload(raw) {
  try {
    const obj = JSON.parse(raw || "{}");
    // Keep only non-sensitive correlation fields (plan §13.4).
    const keep = ["session_id", "turn_id", "agent_id", "agent_type", "tool_name"];
    const payload = {};
    for (const k of keep) if (typeof obj[k] === "string") payload[k] = obj[k].slice(0, 256);
    return payload;
  } catch {
    return {};
  }
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
        res.on("data", (c) => chunks.push(c));
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
      },
    );
    req.on("timeout", () => req.destroy());
    req.on("error", () => resolve(null));
    req.end(body);
  });
}

async function main() {
  const payload = parsePayload(await readStdin());
  const args = {
    name: EVENT_NAME,
    at: new Date().toISOString(),
    eventId: `hook_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    payload,
    ...(TASK_ID ? { taskId: TASK_ID } : {}),
  };
  await rpc("initialize", {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "visual-team-hook", version: "0.1.0" },
  }, 1);
  await rpc("notifications/initialized", {});
  await rpc("tools/call", { name: "record_codex_event", arguments: args }, 2);
}

// Record-only: swallow everything, exit 0, let the event loop drain.
main().catch(() => undefined).then(() => { process.exitCode = 0; });
