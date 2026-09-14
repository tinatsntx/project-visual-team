import type { TaskSnapshot, VisualEvent } from "./index.js";

/**
 * Private MCP request/result metadata key for a task-scoped read capability.
 *
 * This value must only occur in a tool result `_meta` or a subsequent
 * `tools/call` request `_meta`. It is deliberately absent from every
 * model-visible input/output contract.
 *
 * This module is dependency-free on purpose: the widget bundle imports the
 * key at runtime, and pulling in the zod schemas from `./index.js` would add
 * ~450 KB to a bundle that is inlined into every render result. Import
 * private-transport pieces from `@visual-team/contracts/meta`, not the root.
 */
export const TASK_CAPABILITY_META_KEY = "com.visual-team/task-capability";

/** Minimal MCP tool-result envelope shared by the server and the dev host. */
export interface VisualTaskToolResult {
  [key: string]: unknown;
  content: Array<{ type: "text"; text: string }>;
  structuredContent: {
    taskId: string;
    task: TaskSnapshot;
    recentEvents: VisualEvent[];
    uiAvailable: true;
  };
  _meta: Record<string, string>;
}

/**
 * Construct the complete result that mounts the Visual Team widget.
 *
 * The snapshot is model-readable so the widget can render immediately. The
 * capability is intentionally private metadata so only the mounted component
 * can present it on its later read-only `tools/call` request.
 */
export function createRenderVisualTaskResult(input: {
  text: string;
  task: TaskSnapshot;
  recentEvents: VisualEvent[];
  capability: string;
}): VisualTaskToolResult {
  return {
    content: [{ type: "text", text: input.text }],
    structuredContent: {
      taskId: input.task.id,
      task: input.task,
      recentEvents: input.recentEvents,
      uiAvailable: true,
    },
    _meta: { [TASK_CAPABILITY_META_KEY]: input.capability },
  };
}
