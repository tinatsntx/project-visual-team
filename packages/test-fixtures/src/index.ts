import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { RecordCodexEventInput } from "@visual-team/contracts";

/**
 * Replayable event fixtures (PROJECT_PLAN.md §14 Milestone 1). Replaying a
 * fixture must always produce the same snapshot.
 */

export interface FixtureStep {
  kind: "start" | "codex_event";
  input?: {
    title: string;
    summary: string;
    mode: "solo" | "team";
    workerRoles?: Array<"lead" | "explorer" | "builder" | "reviewer">;
    privacyMode?: "standard" | "private";
  };
  event?: Omit<RecordCodexEventInput, "taskId">;
}

export interface ReplayFixture {
  name: string;
  description: string;
  steps: FixtureStep[];
  expect: {
    taskState: string;
    workerStates: Record<string, string>;
    needsUser?: boolean;
    eventCount?: number;
  };
}

const here = dirname(fileURLToPath(import.meta.url));

export function loadFixture(name: string): ReplayFixture {
  const raw = readFileSync(join(here, "..", "fixtures", `${name}.json`), "utf8");
  return JSON.parse(raw) as ReplayFixture;
}

export const FIXTURE_NAMES = ["solo-posttooluse", "team-with-permission"] as const;
