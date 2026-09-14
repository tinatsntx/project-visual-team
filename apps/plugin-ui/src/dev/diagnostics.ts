import type { ReduceResult } from "@visual-team/contracts";

/**
 * Dev-host diagnostics must describe reducer output, not what the synthetic
 * event attempted to do. A harness-generated completion is never a native
 * Codex lifecycle event.
 */
export function syntheticCompletionDiagnostic(result: ReduceResult): string {
  if (!result.ok) {
    return (
      `harness → synthetic task_finished REJECTED — ${result.error}; ` +
      `task remains ${result.snapshot.state}; widget keeps polling`
    );
  }
  return (
    `harness → synthetic task_finished accepted — task is ${result.snapshot.state}; ` +
    "widget stops polling"
  );
}
