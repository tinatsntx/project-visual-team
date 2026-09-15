import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { DEFAULT_TTL_MS, InMemoryTaskRepository, systemClock } from "./repositories/memory.js";
import { registerTools } from "./tools.js";

/**
 * MCP state service (PROJECT_PLAN.md §7.2): Streamable HTTP at /mcp,
 * in-memory repository, structured JSON logging.
 *
 * Stateless transport mode: a fresh server+transport per request, with the
 * shared in-memory repository holding task state. No session affinity needed
 * for the alpha.
 */

const PORT = Number(process.env.PORT ?? 8787);

/**
 * Optional TTL override in milliseconds (acceptance/testing only). The default
 * remains the 2h ephemeral retention in repositories/memory.ts (§13.2).
 */
export function taskTtlMs(): number {
  const raw = Number(process.env.VISUAL_TEAM_TTL_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_TTL_MS;
}

function log(level: "info" | "warn" | "error", msg: string, fields: Record<string, unknown> = {}) {
  // Never log capability tokens, prompts, command text, or user payloads (§13.4).
  process.stdout.write(JSON.stringify({ level, msg, at: new Date().toISOString(), ...fields }) + "\n");
}

function createServer(repo: InMemoryTaskRepository): McpServer {
  const server = new McpServer(
    { name: "visual-team", version: "0.1.0" },
    { capabilities: { tools: {}, resources: {} } },
  );
  registerTools(server, { repo, clock: systemClock });
  return server;
}

export function buildApp(): express.Express {
  const repo = new InMemoryTaskRepository(systemClock, taskTtlMs());
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "64kb" }));

  app.get("/healthz", (_req, res) => {
    res.json({ ok: true, service: "visual-team-mcp" });
  });

  app.post("/mcp", async (req, res) => {
    try {
      const server = createServer(repo);
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined, // stateless
        enableJsonResponse: true,
      });
      res.on("close", () => {
        void transport.close();
        void server.close();
      });
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (err) {
      log("error", "mcp_request_failed", { error: err instanceof Error ? err.message : String(err) });
      if (!res.headersSent) {
        res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: "Internal error" }, id: null });
      }
    }
  });

  // Stateless mode does not support the SSE stream or session teardown.
  app.get("/mcp", (_req, res) => res.status(405).json({ error: "Method not allowed in stateless mode" }));
  app.delete("/mcp", (_req, res) => res.status(405).json({ error: "Method not allowed in stateless mode" }));

  return app;
}

const isMain = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1].replaceAll("\\", "/")}`).href;

if (isMain) {
  const app = buildApp();
  app.listen(PORT, () => {
    log("info", "visual_team_mcp_listening", {
      port: PORT,
      endpoint: `http://localhost:${PORT}/mcp`,
      taskTtlMs: taskTtlMs(),
    });
  });
}
