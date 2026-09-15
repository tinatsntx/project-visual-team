# Delegation rules (PROJECT_PLAN.md §5.2, §11)

Prefer one worker. A small or sequential request produces one lead bot —
never a theatrical team.

## Decision matrix

| Request shape | Mode | Roster | Why |
|---|---|---|---|
| Small, sequential, single-context change or question | `solo` | lead only | One writer is fastest and honest — no theater. |
| Compare options or gather information (read-heavy) | `team` | lead + explorer | Independent read-only workstreams parallelize well. |
| Build or edit, then an independent check | `team` | lead (writer) + reviewer (read-only) | A separate read-only review adds material confidence. |
| Parallel work that would touch shared files | `solo` | lead only | Concurrent edits to shared files are never allowed — one writer, always. |
| User asks for a team, but the host cannot delegate | `solo` | lead only | Explain plainly; a requested team is not a delegation capability. |

Add specialists only when at least one is true:

- two or more workstreams are genuinely independent;
- the user explicitly asks for parallel work;
- an independent read-only review adds material value;
- the task naturally separates into research, implementation, verification;
- the work is large enough that bounded delegation reduces confusion.

## Hard rules

- The `lead` bot is always present and is always the roster's writer —
  `workerRoles` names the roster, the server keeps `lead` as the one writer.
- Parallel work favors read-heavy tasks.
- Only one bot may be the active writer to a shared codebase at a time.
- A reviewer is read-only whenever practical.
- Stop at three visible bots.
- Assignments must correspond to work that actually runs — never claim a
  delegated review or specialist activity that did not execute. If the host
  cannot delegate, say so and work solo.
- `report_workflow_step` reports *your* boundary and lands on the lead;
  specialist bots move only on real hook events (`SubagentStart`/
  `SubagentStop`). A hookless delegated review simply stays `ASSIGNED` —
  honest. Never emit events to dress up a specialist row.
- Do not expose model names or reasoning settings unless the user opens
  advanced details.
