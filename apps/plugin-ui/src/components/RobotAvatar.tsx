import type { WorkerRole, WorkerState } from "@visual-team/contracts";

/**
 * Original small robot character (PROJECT_PLAN.md §12.4). Deliberately simple:
 * a rounded-square head, antenna, and two eyes. Not modeled on Grok Bot,
 * Pixel Agents, or any existing pixel office.
 */

const STATE_COLOR: Record<WorkerState, string> = {
  IDLE: "var(--vt-muted)",
  ASSIGNED: "var(--vt-muted)",
  PLANNING: "var(--vt-info)",
  WORKING: "var(--vt-accent)",
  WAITING_FOR_APPROVAL: "var(--vt-warn)",
  BLOCKED: "var(--vt-warn)",
  REVIEWING: "var(--vt-info)",
  COMPLETED: "var(--vt-ok)",
  FAILED: "var(--vt-danger)",
  CANCELED: "var(--vt-muted)",
};

const ROLE_ANTENNA: Record<WorkerRole, "dot" | "bar" | "fork" | "ring"> = {
  lead: "dot",
  explorer: "bar",
  builder: "fork",
  reviewer: "ring",
};

export function RobotAvatar({
  role,
  state,
  size = 40,
  animated = true,
}: {
  role: WorkerRole;
  state: WorkerState;
  /** Display name, retained for callers; adjacent text lines are the
   *  accessible state (the avatar is aria-hidden decoration). */
  label?: string;
  size?: number;
  animated?: boolean;
}) {
  const color = STATE_COLOR[state];
  const bob = animated && (state === "WORKING" || state === "REVIEWING" || state === "PLANNING");
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      aria-hidden="true"
      className={bob ? "vt-bob" : undefined}
    >
      {/* antenna — per-role silhouette */}
      {ROLE_ANTENNA[role] === "dot" && <circle cx="24" cy="6" r="3" fill={color} />}
      {ROLE_ANTENNA[role] === "bar" && <rect x="19" y="3" width="10" height="4" rx="2" fill={color} />}
      {ROLE_ANTENNA[role] === "fork" && (
        <path d="M19 9 V4 M24 9 V3 M29 9 V4" stroke={color} strokeWidth="2.4" strokeLinecap="round" fill="none" />
      )}
      {ROLE_ANTENNA[role] === "ring" && <circle cx="24" cy="6" r="3" fill="none" stroke={color} strokeWidth="2.4" />}
      <line x1="24" y1="9" x2="24" y2="13" stroke={color} strokeWidth="2.4" />
      {/* head */}
      <rect x="8" y="13" width="32" height="26" rx="8" fill="none" stroke={color} strokeWidth="3" />
      {/* eyes */}
      <circle cx="18" cy="26" r="3" fill={color} />
      <circle cx="30" cy="26" r="3" fill={color} />
      {/* mouth */}
      {state === "FAILED" ? (
        <path d="M19 34 L29 32" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
      ) : state === "COMPLETED" ? (
        <path d="M18 32 q6 5 12 0" stroke={color} strokeWidth="2.4" strokeLinecap="round" fill="none" />
      ) : (
        <line x1="19" y1="33" x2="29" y2="33" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
      )}
      {/* base */}
      <rect x="15" y="41" width="18" height="4" rx="2" fill={color} opacity="0.5" />
    </svg>
  );
}
