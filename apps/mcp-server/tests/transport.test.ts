import assert from "node:assert/strict";
import type { AddressInfo, Server } from "node:net";
import { describe, it } from "node:test";
import { TASK_CAPABILITY_META_KEY } from "@visual-team/contracts/meta";
import { buildApp } from "../src/server.ts";

interface ToolResult {
  content?: Array<{ type: string; text?: string }>;
  structuredContent?: {
    taskId?: string;
    task?: { id: string; title: string; workers: Array<{ role: string; label: string }>; eventCount: number };
    recentEvents?: Array<{ id: string }>;
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

describe("registered Streamable HTTP tool transport", () => {
  it("delivers a render snapshot privately authorizes refreshes, and rejects invalid metadata", async () => {
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
  });
});
