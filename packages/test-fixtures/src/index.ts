import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  EvidenceLevel,
  RecordCodexEventInput,
  TaskResult,
  VisualEventKind,
} from "@visual-team/contracts";

/**
 * Replayable event fixtures (PROJECT_PLAN.md §14 Milestone 1). Replaying a
 * fixture must always produce the same snapshot.
 */

export interface FixtureStep {
  kind: "start" | "codex_event" | "visual_event";
  input?: {
    title: string;
    summary: string;
    mode: "solo" | "team";
    workerRoles?: Array<"lead" | "explorer" | "builder" | "reviewer">;
    privacyMode?: "standard" | "private";
  };
  event?: Omit<RecordCodexEventInput, "taskId">;
  /**
   * Literal visual event (M3 display fixtures): reported waits and finish
   * metadata are model calls, not hook traffic, so they cannot be expressed
   * as a codex_event. Applied through the real reducer like any event —
   * `taskId` and `at` are injected by the runner.
   */
  visual?: {
    id: string;
    kind: VisualEventKind;
    provenance?: EvidenceLevel;
    workerId?: string;
    to?: string;
    label: string;
    detail?: string;
    /** Structured reported receipt — legal only on reported task_finished. */
    result?: TaskResult;
    at?: string;
  };
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

/**
 * Ordered visual-event sequences (Milestone 1 replay fixtures). The runner
 * assigns the record's taskId and a monotonic `at` per step, so fixtures stay
 * free of ids and timestamps that would rot.
 *
 * A truncated `recentEvents` tail is NOT a full replay source: the retained
 * log is bounded, so replaying it later skips trimmed events. These fixtures
 * carry the complete ordered input.
 */
export interface SequenceStep {
  kind: "start" | "event" | "duplicate";
  input?: FixtureStep["input"];
  /** Literal event fields; `taskId` and `at` are injected by the runner. */
  event?: {
    id: string;
    kind: VisualEventKind;
    provenance?: EvidenceLevel;
    workerId?: string;
    to?: string;
    label: string;
    detail?: string;
    /** Structured reported receipt — legal only on reported task_finished. */
    result?: TaskResult;
  };
  /** Resend an earlier event verbatim — same id, exercised as a duplicate. */
  of?: string;
  /** Expected outcome: applied, rejected, or ignored as a duplicate. */
  expect?: "applied" | "rejected" | "duplicate";
}

export interface SequenceFixture {
  name: string;
  description: string;
  steps: SequenceStep[];
  expect: {
    taskState: string;
    workerStates: Record<string, string>;
    needsUser?: boolean;
    eventCount?: number;
    /** Expected retained log length (bounded at the engine's max). */
    logLength?: number;
  };
}

const here = dirname(fileURLToPath(import.meta.url));

export function loadFixture(name: string): ReplayFixture {
  const raw = readFileSync(join(here, "..", "fixtures", `${name}.json`), "utf8");
  return JSON.parse(raw) as ReplayFixture;
}

export function loadSequenceFixture(name: string): SequenceFixture {
  const raw = readFileSync(join(here, "..", "fixtures", `${name}.json`), "utf8");
  return JSON.parse(raw) as SequenceFixture;
}

export const FIXTURE_NAMES = [
  "solo-posttooluse",
  "team-with-permission",
  "review-untracked",
  "reported-question",
  "completed-verified",
  "failed-verification",
  "long-labels",
] as const;

export const SEQUENCE_FIXTURE_NAMES = [
  "seq-success",
  "seq-early-failure",
  "seq-permission-resume",
  "seq-rejected-input",
  "seq-duplicates",
] as const;
