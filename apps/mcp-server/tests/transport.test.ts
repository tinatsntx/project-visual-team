import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import type { AddressInfo, Server } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { TASK_CAPABILITY_META_KEY } from "@visual-team/contracts/meta";
import { buildApp } from "../src/server.ts";

interface ToolResult {
  content?: Array<{ type: string; text?: string }>;
  structuredContent?: {
    taskId?: string;
    applied?: boolean;
    reason?: string;
    task?: {
      id: string;
      title: string;
      state?: string;
      stateProvenance?: string;
      workers: Array<{ role: string; label: string }>;
      eventCount: number;
    };
    recentEvents?: Array<{ id: string; kind?: string; provenance?: string; detail?: string }>;
    uiAvailable?: boolean;
  };
  _meta?: Record<string, unknown>;
  isError?: boolean;
}

let requestId = 0;

async function callMcp(baseUrl: string, method: string, params: Record<string, unknown>): Promise<unknown> {
  const response = await fetch(`${baseUrl}/mcp`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
    body: JSON.stringify({ jsonrpc: "2.0", id: ++requestId, method, params }),
  });
  assert.equal(response.status, 200);
  const payload = (await response.json()) as { result?: unknown; error?: { message: string } };
  assert.equal(payload.error, undefined);
  return payload.result;
}

async function startServer(): Promise<{ server: Server; baseUrl: string }> {
  const server = buildApp().listen(0, "127.0.0.1");
  await new Promise<void>((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  const address = server.address() as AddressInfo;
  return { server, baseUrl: `http://127.0.0.1:${address.port}` };
}

async function stopServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
}

// render_visual_task only needs an existing file at bundlePath(); tests supply
// their own fixture via VISUAL_TEAM_UI_BUNDLE so `npm test` does not depend on
// a prior `npm run build` (clean-checkout CI runs tests first).
function withBundleEnv(bundleFile: string, run: () => Promise<void>): Promise<void> {
  const previous = process.env.VISUAL_TEAM_UI_BUNDLE;
  process.env.VISUAL_TEAM_UI_BUNDLE = bundleFile;
  return run().finally(() => {
    if (previous === undefined) delete process.env.VISUAL_TEAM_UI_BUNDLE;
    else process.env.VISUAL_TEAM_UI_BUNDLE = previous;
  });
}

describe("registered Streamable HTTP tool transport", () => {
  it("delivers a render snapshot privately authorizes refreshes, and rejects invalid metadata", async () => {
    const bundleDir = mkdtempSync(join(tmpdir(), "visual-team-ui-"));
    const bundleFile = join(bundleDir, "visual-team.js");
    writeFileSync(bundleFile, "globalThis.__visualTeamTestBundle = true;\n");
    await withBundleEnv(bundleFile, async () => {
      const { server, baseUrl } = await startServer();
      try {
        await callMcp(baseUrl, "initialize", {
          protocolVersion: "2025-06-18",
          capabilities: {},
          clientInfo: { name: "transport-regression", version: "1.0.0" },
        });

        const listed = (await callMcp(baseUrl, "tools/list", {})) as {
          tools: Array<{ name: string; inputSchema: { properties?: Record<string, unknown> } }>;
        };
        const getTool = listed.tools.find((tool) => tool.name === "get_visual_task");
        assert.ok(getTool);
        assert.equal(getTool.inputSchema.properties?.capability, undefined);
        const toolNames = listed.tools.map((tool) => tool.name);
        assert.ok(toolNames.includes("report_workflow_step"));
        assert.ok(toolNames.includes("finish_visual_task"));

        const start = (await callMcp(baseUrl, "tools/call", {
          name: "start_visual_task",
          arguments: {
            title: "Transport render regression",
            summary: "Verify the mounted result can refresh safely.",
            mode: "solo",
            privacyMode: "standard",
          },
        })) as ToolResult;
        const taskId = start.structuredContent?.taskId;
        const capability = start._meta?.[TASK_CAPABILITY_META_KEY];
        assert.equal(typeof taskId, "string");
        assert.equal(typeof capability, "string");
        assert.doesNotMatch(
          JSON.stringify({ content: start.content, structuredContent: start.structuredContent }),
          new RegExp(capability as string),
        );

        const render = (await callMcp(baseUrl, "tools/call", {
          name: "render_visual_task",
          arguments: { taskId },
        })) as ToolResult;
        assert.equal(render.structuredContent?.task?.id, taskId);
        assert.equal(render.structuredContent?.task?.title, "Transport render regression");
        assert.equal(render.structuredContent?.task?.workers[0]?.role, "lead");
        assert.equal(render.structuredContent?.uiAvailable, true);
        assert.equal(render._meta?.[TASK_CAPABILITY_META_KEY], capability);
        assert.doesNotMatch(
          JSON.stringify({ content: render.content, structuredContent: render.structuredContent }),
          new RegExp(capability as string),
        );

        const missing = (await callMcp(baseUrl, "tools/call", {
          name: "get_visual_task",
          arguments: { taskId },
        })) as ToolResult;
        assert.equal(missing.isError, true);

        const wrong = (await callMcp(baseUrl, "tools/call", {
          name: "get_visual_task",
          arguments: { taskId },
          _meta: { [TASK_CAPABILITY_META_KEY]: "vtc_wrong" },
        })) as ToolResult;
        assert.equal(wrong.isError, true);

        const other = (await callMcp(baseUrl, "tools/call", {
          name: "start_visual_task",
          arguments: {
            title: "Other task",
            summary: "Prove task capabilities do not cross scopes.",
            mode: "solo",
            privacyMode: "standard",
          },
        })) as ToolResult;
        const otherCapability = other._meta?.[TASK_CAPABILITY_META_KEY];
        const crossTask = (await callMcp(baseUrl, "tools/call", {
          name: "get_visual_task",
          arguments: { taskId },
          _meta: { [TASK_CAPABILITY_META_KEY]: otherCapability },
        })) as ToolResult;
        assert.equal(crossTask.isError, true);

        await callMcp(baseUrl, "tools/call", {
          name: "record_codex_event",
          arguments: {
            taskId,
            name: "SubagentStart",
            eventId: "evt_transport_refresh",
            payload: { agent_id: "transport-helper", agent_type: "explorer" },
          },
        });

        const refreshed = (await callMcp(baseUrl, "tools/call", {
          name: "get_visual_task",
          arguments: { taskId, eventLimit: 20 },
          _meta: { [TASK_CAPABILITY_META_KEY]: capability },
        })) as ToolResult;
        assert.equal(refreshed.isError, undefined);
        assert.ok((refreshed.structuredContent?.task?.eventCount ?? 0) > (render.structuredContent?.task?.eventCount ?? 0));
        assert.ok((refreshed.structuredContent?.recentEvents?.length ?? 0) > 0);
      } finally {
        await stopServer(server);
      }
    }).finally(() => rmSync(bundleDir, { recursive: true, force: true }));
  });

  it("returns the text-only fallback without private metadata when no UI bundle exists", async () => {
    const bundleDir = mkdtempSync(join(tmpdir(), "visual-team-no-ui-"));
    const missingBundle = join(bundleDir, "visual-team.js");
    await withBundleEnv(missingBundle, async () => {
      const { server, baseUrl } = await startServer();
      try {
        const start = (await callMcp(baseUrl, "tools/call", {
          name: "start_visual_task",
          arguments: {
            title: "No-bundle fallback",
            summary: "Render degrades to text when the widget bundle is absent.",
            mode: "solo",
            privacyMode: "standard",
          },
        })) as ToolResult;
        const taskId = start.structuredContent?.taskId;
        const capability = start._meta?.[TASK_CAPABILITY_META_KEY];
        assert.equal(typeof taskId, "string");
        assert.equal(typeof capability, "string");

        const render = (await callMcp(baseUrl, "tools/call", {
          name: "render_visual_task",
          arguments: { taskId },
        })) as ToolResult;
        assert.equal(render.isError, undefined);
        assert.equal(render.structuredContent?.taskId, taskId);
        assert.equal(render.structuredContent?.uiAvailable, false);
        assert.equal(render.structuredContent?.task, undefined);
        assert.equal(render._meta?.[TASK_CAPABILITY_META_KEY], undefined);
        assert.match(render.content?.[0]?.text ?? "", /UI bundle not built/);
        assert.doesNotMatch(
          JSON.stringify({ content: render.content, structuredContent: render.structuredContent }),
          new RegExp(capability as string),
        );
      } finally {
        await stopServer(server);
      }
    }).finally(() => rmSync(bundleDir, { recursive: true, force: true }));
  });

  it("records reported boundaries and reaches a terminal state truthfully", async () => {
    const { server, baseUrl } = await startServer();
    try {
      const start = (await callMcp(baseUrl, "tools/call", {
        name: "start_visual_task",
        arguments: {
          title: "Reported finish regression",
          summary: "Verify reported boundary tools reach terminal state.",
          mode: "solo",
          privacyMode: "standard",
        },
      })) as ToolResult;
      const taskId = start.structuredContent?.taskId;
      const capability = start._meta?.[TASK_CAPABILITY_META_KEY];
      assert.equal(typeof taskId, "string");
      assert.equal(typeof capability, "string");

      // PLANNING -> COMPLETED is unsupported; the report is rejected safely.
      const early = (await callMcp(baseUrl, "tools/call", {
        name: "finish_visual_task",
        arguments: { taskId, outcome: "completed" },
      })) as ToolResult;
      assert.equal(early.structuredContent?.applied, false);
      assert.match(early.structuredContent?.reason ?? "", /cannot move/);

      const step = (await callMcp(baseUrl, "tools/call", {
        name: "report_workflow_step",
        arguments: { taskId, phase: "implementing" },
      })) as ToolResult;
      assert.equal(step.structuredContent?.applied, true);

      const finish = (await callMcp(baseUrl, "tools/call", {
        name: "finish_visual_task",
        arguments: {
          taskId,
          outcome: "completed",
          summary: "Reported done",
          verification: "passed",
          artifacts: [{ label: "PR #1", uri: "https://example.test/pr/1" }],
        },
      })) as ToolResult;
      assert.equal(finish.structuredContent?.applied, true);

      const read = (await callMcp(baseUrl, "tools/call", {
        name: "get_visual_task",
        arguments: { taskId, eventLimit: 20 },
        _meta: { [TASK_CAPABILITY_META_KEY]: capability },
      })) as ToolResult;
      assert.equal(read.structuredContent?.task?.state, "COMPLETED");
      assert.equal(read.structuredContent?.task?.stateProvenance, "reported");
      const finished = read.structuredContent?.recentEvents?.find((e) => e.kind === "task_finished");
      assert.equal(finished?.provenance, "reported");
      assert.match(finished?.detail ?? "", /Reported done/);
      // The structured reported receipt survives serialization on both the
      // snapshot and the journaled finish event (brief 011).
      const taskResult = (read.structuredContent?.task as Record<string, unknown> | undefined)?.result;
      assert.deepEqual(taskResult, {
        summary: "Reported done",
        verification: "passed",
        artifacts: [{ label: "PR #1", uri: "https://example.test/pr/1" }],
      });
      assert.deepEqual((finished as Record<string, unknown> | undefined)?.result, taskResult);

      const late = (await callMcp(baseUrl, "tools/call", {
        name: "report_workflow_step",
        arguments: { taskId, phase: "testing" },
      })) as ToolResult;
      assert.equal(late.structuredContent?.applied, false);
    } finally {
      await stopServer(server);
    }
  });

  it("rejects a work report after early failure over HTTP, snapshot unchanged", async () => {
    const { server, baseUrl } = await startServer();
    try {
      const start = (await callMcp(baseUrl, "tools/call", {
        name: "start_visual_task",
        arguments: {
          title: "Early failure regression",
          summary: "Verify a report after failure cannot resume work.",
          mode: "solo",
          privacyMode: "standard",
        },
      })) as ToolResult;
      const taskId = start.structuredContent?.taskId;
      const capability = start._meta?.[TASK_CAPABILITY_META_KEY];

      const finish = (await callMcp(baseUrl, "tools/call", {
        name: "finish_visual_task",
        arguments: { taskId, outcome: "failed" },
      })) as ToolResult;
      assert.equal(finish.structuredContent?.applied, true);

      const before = (await callMcp(baseUrl, "tools/call", {
        name: "get_visual_task",
        arguments: { taskId },
        _meta: { [TASK_CAPABILITY_META_KEY]: capability },
      })) as ToolResult;
      assert.equal(before.structuredContent?.task?.state, "FAILED");
      assert.equal(before.structuredContent?.task?.stateProvenance, "reported");

      const late = (await callMcp(baseUrl, "tools/call", {
        name: "report_workflow_step",
        arguments: { taskId, phase: "implementing" },
      })) as ToolResult;
      assert.equal(late.structuredContent?.applied, false);

      const after = (await callMcp(baseUrl, "tools/call", {
        name: "get_visual_task",
        arguments: { taskId },
        _meta: { [TASK_CAPABILITY_META_KEY]: capability },
      })) as ToolResult;
      assert.equal(
        JSON.stringify(after.structuredContent?.task),
        JSON.stringify(before.structuredContent?.task),
      );
    } finally {
      await stopServer(server);
    }
  });

  it("expires tasks on the real HTTP path when VISUAL_TEAM_TTL_MS is set", async () => {
    const previous = process.env.VISUAL_TEAM_TTL_MS;
    process.env.VISUAL_TEAM_TTL_MS = "50";
    try {
      const { server, baseUrl } = await startServer();
      try {
        const start = (await callMcp(baseUrl, "tools/call", {
          name: "start_visual_task",
          arguments: {
            title: "Expiry regression",
            summary: "Verify real task expiry on the HTTP path.",
            mode: "solo",
            privacyMode: "standard",
          },
        })) as ToolResult;
        const taskId = start.structuredContent?.taskId;
        const capability = start._meta?.[TASK_CAPABILITY_META_KEY];
        assert.equal(typeof taskId, "string");

        await new Promise((resolve) => setTimeout(resolve, 120));

        const read = (await callMcp(baseUrl, "tools/call", {
          name: "get_visual_task",
          arguments: { taskId },
          _meta: { [TASK_CAPABILITY_META_KEY]: capability },
        })) as ToolResult;
        assert.equal(read.isError, true);

        const render = (await callMcp(baseUrl, "tools/call", {
          name: "render_visual_task",
          arguments: { taskId },
        })) as ToolResult;
        assert.equal(render.isError, true);
      } finally {
        await stopServer(server);
      }
    } finally {
      if (previous === undefined) delete process.env.VISUAL_TEAM_TTL_MS;
      else process.env.VISUAL_TEAM_TTL_MS = previous;
    }
  });
});
