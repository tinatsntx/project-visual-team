import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import type { AddressInfo, Server } from "node:net";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

/**
 * Launch tests for the bundled hook script — the record-only contract that
 * native Codex will execute. Synthetic payloads only; this proves local
 * delivery and hardening, not automatic native hook delivery.
 */

const HOOK = fileURLToPath(new URL("../../../plugin/hooks/record_codex_event.mjs", import.meta.url));
const ALLOWLIST = ["session_id", "turn_id", "agent_id", "agent_type", "tool_name"];
const RECEIPT_TASK = "vt_0123456789abcdef01234567";
const FALSE_TASK = "vt_aaaaaaaaaaaaaaaaaaaaaaaa";

interface HookRun {
  code: number | null;
  stdout: string;
  stderr: string;
}

function runHook(
  eventName: string,
  stdinText: string,
  env: Record<string, string>,
): Promise<HookRun> {
  return new Promise((resolvePromise) => {
    const child = spawn(process.execPath, [HOOK, eventName], {
      env: { ...process.env, ...env },
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (c) => (stdout += c));
    child.stderr.on("data", (c) => (stderr += c));
    child.on("error", (e) => resolvePromise({ code: -1, stdout, stderr: String(e) }));
    child.on("close", (code) => resolvePromise({ code, stdout, stderr }));
    child.stdin.end(stdinText);
    setTimeout(() => child.kill(), 15_000).unref();
  });
}

interface Stub {
  server: Server;
  port: number;
  requests: Array<Record<string, unknown>>;
}

async function startStub(): Promise<Stub> {
  const requests: Array<Record<string, unknown>> = [];
  const server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      try {
        requests.push(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        requests.push({});
      }
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ jsonrpc: "2.0", result: {} }));
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  return { server, port: (server.address() as AddressInfo).port, requests };
}

function lastRecordCall(stub: Stub) {
  const calls = stub.requests.filter(
    (r) => r.method === "tools/call" && (r.params as Record<string, unknown>)?.name === "record_codex_event",
  );
  return calls.at(-1) as { params: { arguments: Record<string, unknown> } } | undefined;
}

function recordCallCount(stub: Stub) {
  return stub.requests.filter(
    (r) => r.method === "tools/call" && (r.params as Record<string, unknown>)?.name === "record_codex_event",
  ).length;
}

function withStub(run: (stub: Stub) => Promise<void>): () => Promise<void> {
  return async () => {
    const stub = await startStub();
    try {
      await run(stub);
    } finally {
      stub.server.close();
    }
  };
}

describe("bundled hook script (record-only)", () => {
  it(
    "forwards only allowlisted metadata and never writes to stdout",
    withStub(async (stub) => {
      const result = await runHook(
        "PreToolUse",
        JSON.stringify({
          session_id: "sess-1",
          turn_id: "turn-1",
          tool_name: "Bash",
          tool_input: { command: "echo secret-marker" },
          prompt: "secret prompt text",
          transcript_path: "C:/secret/transcript.jsonl",
          cwd: "C:/secret/cwd",
          last_assistant_message: "secret message",
        }),
        { VISUAL_TEAM_MCP_URL: `http://127.0.0.1:${stub.port}/mcp` },
      );
      assert.equal(result.code, 0);
      assert.equal(result.stdout, "", "hook must emit no decision payload");
      const call = lastRecordCall(stub);
      assert.ok(call, "no record_codex_event call reached the stub");
      const args = call.params.arguments;
      assert.equal(args.name, "PreToolUse");
      assert.equal(args.taskId, undefined);
      for (const key of Object.keys(args.payload as object)) {
        assert.ok(ALLOWLIST.includes(key), `non-allowlisted payload key forwarded: ${key}`);
      }
      const body = JSON.stringify(call);
      for (const sentinel of ["secret-marker", "secret prompt", "transcript", "secret/cwd", "secret message"]) {
        assert.ok(!body.includes(sentinel), `sensitive payload content leaked: ${sentinel}`);
      }
    }),
  );

  it(
    "extracts the task id only from a validated start-tool structured result",
    withStub(async (stub) => {
      const env = { VISUAL_TEAM_MCP_URL: `http://127.0.0.1:${stub.port}/mcp` };
      // A task-shaped id inside tool_input must never bind — only the
      // structured tool_response of the real start receipt counts.
      const receipt = await runHook(
        "PostToolUse",
        JSON.stringify({
          session_id: "sess-bound",
          tool_name: "mcp__codex_apps__start_visual_task",
          tool_input: { taskId: FALSE_TASK, secret: "SYNTHETIC_INPUT_MUST_NOT_BIND" },
          tool_response: {
            structuredContent: { taskId: RECEIPT_TASK, task: { id: RECEIPT_TASK } },
            content: [],
          },
        }),
        env,
      );
      assert.equal(receipt.code, 0);
      assert.equal(lastRecordCall(stub)?.params.arguments.taskId, RECEIPT_TASK);
    }),
  );

  it(
    "ignores taskId-shaped strings in tool_input and failed receipts",
    withStub(async (stub) => {
      const env = { VISUAL_TEAM_MCP_URL: `http://127.0.0.1:${stub.port}/mcp` };
      // tool_input trap: no tool_response at all — nothing to extract.
      const inputOnly = await runHook(
        "PostToolUse",
        JSON.stringify({
          session_id: "s1",
          tool_name: "mcp__codex_apps__start_visual_task",
          tool_input: { taskId: FALSE_TASK },
        }),
        env,
      );
      assert.equal(inputOnly.code, 0);
      assert.equal(lastRecordCall(stub)?.params.arguments.taskId, undefined);

      // A failed tool call cannot mint a binding.
      const failed = await runHook(
        "PostToolUse",
        JSON.stringify({
          session_id: "s1",
          tool_name: "mcp__codex_apps__start_visual_task",
          tool_response: { structuredContent: { taskId: RECEIPT_TASK }, isError: true },
        }),
        env,
      );
      assert.equal(failed.code, 0);
      assert.equal(lastRecordCall(stub)?.params.arguments.taskId, undefined);
    }),
  );

  it(
    "stays silent and exits 0 on malformed input, bad config, and unreachable servers",
    withStub(async (stub) => {
      const env = { VISUAL_TEAM_MCP_URL: `http://127.0.0.1:${stub.port}/mcp` };
      // Malformed JSON + explicit task override: no observed activity emitted.
      const before = recordCallCount(stub);
      const malformed = await runHook("PostToolUse", "{ broken", {
        ...env,
        VISUAL_TEAM_TASK_ID: RECEIPT_TASK,
      });
      assert.equal(malformed.code, 0);
      assert.equal(malformed.stdout, "");
      assert.equal(recordCallCount(stub), before, "malformed input must not emit a record call");

      // Oversized input is rejected, not partially parsed.
      const oversized = await runHook(
        "PostToolUse",
        JSON.stringify({ session_id: "x", blob: "y".repeat(200 * 1024) }),
        env,
      );
      assert.equal(oversized.code, 0);
      assert.equal(recordCallCount(stub), before, "oversized input must not emit a record call");

      // Bad MCP URL: silent exit 0, nothing written anywhere.
      const badUrl = await runHook("PostToolUse", "{}", {
        VISUAL_TEAM_MCP_URL: "not a URL",
      });
      assert.equal(badUrl.code, 0);
      assert.equal(badUrl.stdout, "");
      assert.equal(badUrl.stderr, "");

      // Unreachable server: still exits 0.
      const dead = await runHook("PostToolUse", "{}", {
        ...env,
        VISUAL_TEAM_MCP_URL: "http://127.0.0.1:1/mcp",
      });
      assert.equal(dead.code, 0);
    }),
  );

  it(
    "honors the explicit VISUAL_TEAM_TASK_ID override over observed receipts",
    withStub(async (stub) => {
      const env = {
        VISUAL_TEAM_MCP_URL: `http://127.0.0.1:${stub.port}/mcp`,
        VISUAL_TEAM_TASK_ID: "vt_launch_check",
      };
      const result = await runHook(
        "PostToolUse",
        JSON.stringify({
          session_id: "sess-bound",
          tool_name: "mcp__codex_apps__start_visual_task",
          tool_response: { structuredContent: { taskId: RECEIPT_TASK } },
        }),
        env,
      );
      assert.equal(result.code, 0);
      assert.equal(lastRecordCall(stub)?.params.arguments.taskId, "vt_launch_check");
    }),
  );
});
