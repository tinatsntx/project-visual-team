import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  FinishVisualTaskInputSchema,
  GetVisualTaskInputSchema,
  RecordCodexEventInputSchema,
  RenderVisualTaskInputSchema,
  ReportWorkflowStepInputSchema,
  StartVisualTaskInputSchema,
  UI_TEMPLATE_URI,
  type TaskSnapshot,
} from "@visual-team/contracts";
import {
  TASK_CAPABILITY_META_KEY,
  createRenderVisualTaskResult,
} from "@visual-team/contracts/meta";
import { mapCodexEvent } from "@visual-team/codex-event-mapper";
import { mapTaskFinish, mapWorkflowPhase } from "./reported-steps.js";
import { safeTokenEqual } from "./auth/tokens.js";
import type { Clock, InMemoryTaskRepository } from "./repositories/memory.js";
import { RateLimiter } from "./ratelimit.js";
import { bundleAvailable, uiResourceContents } from "./ui-resources/widget.js";

/**
 * Milestone-0 tools (PROJECT_PLAN.md §9, §14): start_visual_task,
 * report_workflow_step, record_codex_event, get_visual_task,
 * finish_visual_task, render_visual_task.
 *
 * `record_codex_event` is append-only and can never approve, deny, rewrite, or
 * block a Codex action (§9.3, §13.4). `report_workflow_step` and
 * `finish_visual_task` record model-reported boundaries only — reported
 * provenance, and the state machine still rejects unsupported transitions.
 * `render_visual_task` is the only tool that attaches the UI template (§9.6).
 */

export interface ToolDeps {
  repo: InMemoryTaskRepository;
  clock: Clock;
}

const eventLimiter = new RateLimiter(120, 60_000); // per task: 120 events/min

function textResult(text: string, structured?: Record<string, unknown>, meta?: Record<string, unknown>) {
  return {
    content: [{ type: "text" as const, text }],
    ...(structured ? { structuredContent: structured } : {}),
    ...(meta ? { _meta: meta } : {}),
  };
}

function summarize(snapshot: TaskSnapshot): string {
  const lead = snapshot.workers.find((w) => w.role === "lead") ?? snapshot.workers[0];
  const parts = [
    `Task "${snapshot.title}" is ${snapshot.state.toLowerCase().replaceAll("_", " ")}.`,
    lead ? `${lead.label} (${lead.role}) is ${lead.state.toLowerCase().replaceAll("_", " ")}.` : "",
    snapshot.workers.length > 1
      ? `Team: ${snapshot.workers.map((w) => `${w.label} the ${w.role}`).join(", ")}.`
      : "Working solo.",
    snapshot.needsUser ? "This task needs you — check approvals or questions." : "",
    snapshot.noRecentActivity ? "No recent activity." : "",
  ];
  return parts.filter(Boolean).join(" ");
}

export function registerTools(server: McpServer, deps: ToolDeps): void {
  const { repo, clock } = deps;

  server.registerTool(
    "start_visual_task",
    {
      description:
        "Create an ephemeral visual task and its initial bot roster. Call before substantive work begins. Returns a model-readable summary; the UI receives a task-scoped capability token privately.",
      inputSchema: StartVisualTaskInputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    },
    async (args) => {
      const { record, capability } = repo.createTask(args);
      const snapshot = record.snapshot;
      return textResult(
        summarize(snapshot),
        { taskId: snapshot.id, task: snapshot },
        { [TASK_CAPABILITY_META_KEY]: capability },
      );
    },
  );

  server.registerTool(
    "report_workflow_step",
    {
      description:
        "Report an explicit workflow phase boundary for your own task: planning, researching, implementing, testing, reviewing, waiting_for_user, completed, or failed. Recorded with reported provenance — a claim about your own work, never observed evidence. The server rejects unsupported transitions.",
      inputSchema: ReportWorkflowStepInputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    },
    async (args) => {
      const stored = repo.get(args.taskId);
      if (!stored) {
        return textResult("No active visual task to attach this report to.", {
          applied: false,
          reason: "no_active_task",
        });
      }
      const taskId = stored.record.snapshot.id;
      if (!eventLimiter.allow(taskId)) {
        return textResult("Rate limit reached for this task.", {
          applied: false,
          taskId,
          reason: "rate_limited",
        });
      }
      const event = mapWorkflowPhase({
        taskId,
        phase: args.phase,
        at: args.at ?? clock.nowIso(),
        eventId: args.eventId ?? `evt_${taskId}_${stored.record.snapshot.eventCount + 1}_report_${args.phase}`,
      });
      const applied = repo.apply(stored, event);
      if (!applied.ok) {
        return textResult(`Report rejected safely: ${applied.error}`, {
          applied: false,
          taskId,
          reason: applied.error,
        });
      }
      return textResult(applied.changed ? `Recorded. ${event.label}` : "Duplicate event ignored.", {
        applied: applied.changed,
        taskId,
      });
    },
  );

  server.registerTool(
    "record_codex_event",
    {
      description:
        "Record a supported Codex lifecycle event (SessionStart, UserPromptSubmit, SubagentStart, PreToolUse, PostToolUse, PermissionRequest, SubagentStop, Stop, Interrupt) as visual activity. Append-only: it can never approve, deny, rewrite, or block a Codex action.",
      inputSchema: RecordCodexEventInputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    },
    async (args) => {
      const stored = args.taskId ? repo.get(args.taskId) : repo.mostRecentActive();
      if (!stored) {
        return textResult("No active visual task to attach this event to.", {
          applied: false,
          reason: "no_active_task",
        });
      }
      const taskId = stored.record.snapshot.id;
      if (!eventLimiter.allow(taskId)) {
        return textResult("Rate limit reached for this task.", {
          applied: false,
          taskId,
          reason: "rate_limited",
        });
      }
      const mapped = mapCodexEvent({
        taskId,
        name: args.name,
        ...(args.payload ? { payload: args.payload } : {}),
        at: args.at ?? clock.nowIso(),
        eventId: args.eventId ?? `evt_${taskId}_${stored.record.snapshot.eventCount + 1}_${args.name}`,
      });
      if (!mapped.ok) {
        return textResult(`Ignored: ${mapped.reason}`, { applied: false, taskId, reason: mapped.reason });
      }
      const applied = repo.apply(stored, ...mapped.events);
      if (!applied.ok) {
        return textResult(`Event rejected safely: ${applied.error}`, {
          applied: false,
          taskId,
          reason: applied.error,
        });
      }
      const labels = mapped.events.map((e) => e.label).join(" ");
      return textResult(applied.changed ? `Recorded. ${labels}` : "Duplicate event ignored.", {
        applied: applied.changed,
        taskId,
      });
    },
  );

  server.registerTool(
    "get_visual_task",
    {
      description:
        "Read the current visual task snapshot and a bounded list of recent events. The mounted UI authorizes this read with its private MCP request metadata.",
      inputSchema: GetVisualTaskInputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async (args, extra) => {
      const stored = repo.get(args.taskId);
      const capability = extra._meta?.[TASK_CAPABILITY_META_KEY];
      if (!stored || typeof capability !== "string" || !safeTokenEqual(stored.capability, capability)) {
        return {
          content: [{ type: "text" as const, text: "Unknown task or invalid capability." }],
          isError: true,
        };
      }
      const snapshot = repo.readSnapshot(stored);
      const recentEvents = repo.recentEvents(stored, args.eventLimit);
      return textResult(summarize(snapshot), { task: snapshot, recentEvents });
    },
  );

  server.registerTool(
    "finish_visual_task",
    {
      description:
        "Report the final result for your own task: outcome (completed or failed), a short result summary, verification status, and artifact references. Recorded with reported provenance. Artifact contents are never uploaded or retained.",
      inputSchema: FinishVisualTaskInputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    },
    async (args) => {
      const stored = repo.get(args.taskId);
      if (!stored) {
        return textResult("No active visual task to attach this report to.", {
          applied: false,
          reason: "no_active_task",
        });
      }
      const taskId = stored.record.snapshot.id;
      if (!eventLimiter.allow(taskId)) {
        return textResult("Rate limit reached for this task.", {
          applied: false,
          taskId,
          reason: "rate_limited",
        });
      }
      const event = mapTaskFinish({
        taskId,
        outcome: args.outcome,
        ...(args.summary !== undefined ? { summary: args.summary } : {}),
        ...(args.verification !== undefined ? { verification: args.verification } : {}),
        ...(args.artifacts !== undefined ? { artifacts: args.artifacts } : {}),
        at: args.at ?? clock.nowIso(),
        eventId: args.eventId ?? `evt_${taskId}_${stored.record.snapshot.eventCount + 1}_finish`,
      });
      const applied = repo.apply(stored, event);
      if (!applied.ok) {
        return textResult(`Report rejected safely: ${applied.error}`, {
          applied: false,
          taskId,
          reason: applied.error,
        });
      }
      return textResult(applied.changed ? `Recorded. ${event.label}` : "Duplicate event ignored.", {
        applied: applied.changed,
        taskId,
      });
    },
  );

  server.registerTool(
    "render_visual_task",
    {
      description:
        "Render the Visual Team interface for a task. This is the only tool that attaches the UI template. Call get_visual_task from the UI for state refresh rather than re-rendering.",
      inputSchema: RenderVisualTaskInputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
      _meta: {
        ui: { resourceUri: UI_TEMPLATE_URI },
        "openai/outputTemplate": UI_TEMPLATE_URI,
      },
    },
    async (args) => {
      const stored = repo.get(args.taskId);
      if (!stored) {
        return {
          content: [{ type: "text" as const, text: "Unknown visual task." }],
          isError: true,
        };
      }
      if (!bundleAvailable()) {
        // Headless fallback (plan §11): the workflow stays useful without UI.
        return textResult(
          `${summarize(repo.readSnapshot(stored))} (Visual UI bundle not built — showing text status.)`,
          { taskId: args.taskId, uiAvailable: false },
        );
      }
      const snapshot = repo.readSnapshot(stored);
      return createRenderVisualTaskResult({
        text: summarize(snapshot),
        task: snapshot,
        recentEvents: repo.recentEvents(stored, 20),
        capability: stored.capability,
      });
    },
  );

  server.registerResource(
    "visual-team-ui",
    UI_TEMPLATE_URI,
    { mimeType: "text/html;profile=mcp-app", description: "Visual Team task interface" },
    async () => ({ contents: [uiResourceContents()] }),
  );
}
