import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import type { AddressInfo, Server } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

/**
 * Endpoint resolution for the bundled hook (brief 012): a defined
 * VISUAL_TEAM_MCP_URL wins and must be valid http(s); otherwise the packaged
 * MCP config is selected relative to the installed plugin root — .mcp.json
 * (Legacy) first, then mcp.json (portable). Only mcpServers.visual-team.url
 * is read. Any defined-but-invalid override, missing/malformed selected
 * config, or non-http(s) url means silent exit 0 with no network delivery —
 * never a fallback to another endpoint. No implicit localhost exists.
 *
 * Each case installs a real copy of the hook under a controlled root so the
 * repository's own plugin/mcp.json (which names the hosted endpoint) is
 * never consulted and nothing leaves this machine.
 */

const HOOK_SOURCE = fileURLToPath(new URL("../../../plugin/hooks/record_codex_event.mjs", import.meta.url));
const PAYLOAD = JSON.stringify({ session_id: "endpoint-check", tool_name: "Bash" });

interface HookRun {
  code: number | null;
  stdout: string;
  stderr: string;
}

interface Stub {
  server: Server;
  url: string;
  requests: number;
}

async function startStub(): Promise<Stub> {
  let requests = 0;
  const server = createServer((_req, res) => {
    requests += 1;
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ jsonrpc: "2.0", result: {} }));
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const port = (server.address() as AddressInfo).port;
  return {
    server,
    url: `http://127.0.0.1:${port}/mcp`,
    get requests() {
      return requests;
    },
  };
}

/** A temp plugin root: <root>/hooks/record_codex_event.mjs + chosen config. */
function installHook(root: string, config?: { name: ".mcp.json" | "mcp.json"; contents: string }): string {
  const hooksDir = join(root, "hooks");
  mkdirSync(hooksDir, { recursive: true });
  const script = join(hooksDir, "record_codex_event.mjs");
  copyFileSync(HOOK_SOURCE, script);
  if (config) writeFileSync(join(root, config.name), config.contents);
  return script;
}

function configJson(url: unknown): string {
  return JSON.stringify({ mcpServers: { "visual-team": { type: "http", url } } });
}

function runHook(
  script: string,
  options: { env?: Record<string, string | undefined>; cwd?: string } = {},
): Promise<HookRun> {
  const env: Record<string, string> = { ...process.env } as Record<string, string>;
  // Never inherit a developer/CI override — cases declare their own intent.
  delete env.VISUAL_TEAM_MCP_URL;
  delete env.VISUAL_TEAM_TASK_ID;
  for (const [key, value] of Object.entries(options.env ?? {})) {
    if (value === undefined) delete env[key];
    else env[key] = value;
  }
  return new Promise((resolvePromise) => {
    const child = spawn(process.execPath, [script, "PostToolUse"], {
      env,
      cwd: options.cwd,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (c) => (stdout += c));
    child.stderr.on("data", (c) => (stderr += c));
    child.on("error", (e) => resolvePromise({ code: -1, stdout, stderr: String(e) }));
    child.on("close", (code) => resolvePromise({ code, stdout, stderr }));
    child.stdin.end(PAYLOAD);
    setTimeout(() => child.kill(), 15_000).unref();
  });
}

function withTemp(run: (root: string) => Promise<void>): () => Promise<void> {
  return async () => {
    const root = mkdtempSync(join(tmpdir(), "vt-hook-endpoint-"));
    try {
      await run(root);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  };
}

function withStub(run: (stub: Stub, root: string) => Promise<void>): () => Promise<void> {
  return async () => {
    const stub = await startStub();
    const root = mkdtempSync(join(tmpdir(), "vt-hook-endpoint-"));
    try {
      await run(stub, root);
    } finally {
      stub.server.close();
      rmSync(root, { recursive: true, force: true });
    }
  };
}

function assertSilent(result: HookRun, label: string) {
  assert.equal(result.code, 0, `${label} must exit 0`);
  assert.equal(result.stdout, "", `${label} must not write stdout`);
  assert.equal(result.stderr, "", `${label} must not write stderr`);
}

describe("hook endpoint resolution (brief 012)", () => {
  it(
    "delivers via the portable mcp.json when no override is defined",
    withStub(async (stub, root) => {
      const script = installHook(root, { name: "mcp.json", contents: configJson(stub.url) });
      const result = await runHook(script);
      assertSilent(result, "portable config");
      assert.ok(stub.requests > 0, "portable config must deliver to its url");
    }),
  );

  it(
    "delivers via the Legacy .mcp.json when no override is defined",
    withStub(async (stub, root) => {
      const script = installHook(root, { name: ".mcp.json", contents: configJson(stub.url) });
      const result = await runHook(script);
      assertSilent(result, "legacy config");
      assert.ok(stub.requests > 0, "legacy config must deliver to its url");
    }),
  );

  it(
    "a valid defined override wins over a packaged config",
    withStub(async (stub, root) => {
      // Config points at a dead port; delivery must go to the override.
      const script = installHook(root, {
        name: ".mcp.json",
        contents: configJson("http://127.0.0.1:1/mcp"),
      });
      const result = await runHook(script, { env: { VISUAL_TEAM_MCP_URL: stub.url } });
      assertSilent(result, "override precedence");
      assert.ok(stub.requests > 0, "override url must receive delivery");
    }),
  );

  it(
    "a defined empty or malformed override never falls back to the config",
    withStub(async (stub, root) => {
      const script = installHook(root, { name: "mcp.json", contents: configJson(stub.url) });
      for (const [label, value] of [
        ["empty override", ""],
        ["whitespace override", "   "],
        ["malformed override", "not a URL"],
        ["non-http(s) override", "ftp://example.test/mcp"],
      ] as const) {
        const before = stub.requests;
        const result = await runHook(script, { env: { VISUAL_TEAM_MCP_URL: value } });
        assertSilent(result, label);
        assert.equal(stub.requests, before, `${label} must not fall back to the config`);
      }
    }),
  );

  it(
    "missing or malformed selected config records nothing",
    withTemp(async (root) => {
      // No config at all.
      let script = installHook(root);
      assertSilent(await runHook(script), "missing config");

      // Malformed JSON.
      script = installHook(root, { name: ".mcp.json", contents: "{ not json" });
      assertSilent(await runHook(script), "malformed config");

      // Well-formed JSON without the visual-team url.
      script = installHook(root, { name: ".mcp.json", contents: configJson(undefined) });
      assertSilent(await runHook(script), "config without url");
      script = installHook(root, { name: ".mcp.json", contents: JSON.stringify({ mcpServers: {} }) });
      assertSilent(await runHook(script), "config without visual-team entry");
    }),
  );

  it(
    "a non-http(s) config url records nothing",
    withTemp(async (root) => {
      for (const [label, url] of [
        ["ftp", "ftp://example.test/mcp"],
        ["file", "file:///tmp/mcp"],
        ["bare host", "example.test/mcp"],
      ] as const) {
        const dir = join(root, label);
        const script = installHook(dir, { name: "mcp.json", contents: configJson(url) });
        assertSilent(await runHook(script), `non-http(s) ${label}`);
      }
    }),
  );

  it(
    "the first existing config file is the selected one — no second file tried",
    withStub(async (stub, root) => {
      // Legacy .mcp.json malformed while portable mcp.json is valid:
      // selection is terminal, not a fallback chain.
      const script = installHook(root, { name: "mcp.json", contents: configJson(stub.url) });
      writeFileSync(join(root, ".mcp.json"), "{ broken");
      const result = await runHook(script);
      assertSilent(result, "malformed selected legacy config");
      assert.equal(stub.requests, 0, "must not fall back to the portable file");
    }),
  );

  it(
    "with both configs valid, only the Legacy .mcp.json endpoint receives traffic",
    async () => {
      const legacy = await startStub();
      const portable = await startStub();
      const root = mkdtempSync(join(tmpdir(), "vt-hook-endpoint-"));
      try {
        // Two valid configs at distinct endpoints — priority, not fallback.
        const script = installHook(root, { name: ".mcp.json", contents: configJson(legacy.url) });
        writeFileSync(join(root, "mcp.json"), configJson(portable.url));
        const result = await runHook(script);
        assertSilent(result, "both-valid precedence");
        assert.ok(legacy.requests > 0, "the Legacy .mcp.json endpoint must receive delivery");
        assert.equal(portable.requests, 0, "the portable mcp.json endpoint must not be tried");
      } finally {
        legacy.server.close();
        portable.server.close();
        rmSync(root, { recursive: true, force: true });
      }
    },
  );

  it(
    "resolves the config relative to the script root from a foreign cwd",
    withStub(async (stub, root) => {
      const foreign = join(root, "foreign task cwd");
      mkdirSync(foreign, { recursive: true });
      const script = installHook(root, { name: ".mcp.json", contents: configJson(stub.url) });
      const result = await runHook(script, { cwd: foreign });
      assertSilent(result, "foreign cwd");
      assert.ok(stub.requests > 0, "config must resolve relative to the script, not cwd");
    }),
  );

  it(
    "works from an installed path containing spaces",
    withStub(async (stub, parent) => {
      const root = join(parent, "installed plugin with spaces");
      const script = installHook(root, { name: ".mcp.json", contents: configJson(stub.url) });
      const result = await runHook(script);
      assertSilent(result, "spaced install path");
      assert.ok(stub.requests > 0, "spaced path must deliver");
    }),
  );
});
