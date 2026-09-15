# Project Visual Team — Implementation Plan

**Status:** Approved for planning  
**Working codename:** Project Visual Team  
**Public name:** To be selected after name, domain, repository, and trademark screening  
**Product form:** Open-source ChatGPT/Codex Plugin  
**Primary surface:** ChatGPT Plugin UI  
**Secondary surface:** Codex skills, MCP tools, and lifecycle hooks  
**Explicitly excluded from MVP:** Agents API, Codex App Server, a standalone desktop client, and a provider-neutral agent runtime

---

## 1. Executive decision

Build an open-source Plugin that makes existing ChatGPT and Codex workflows easier to understand by representing real work as a small visual team.

The product will not create a new AI agent platform. ChatGPT and Codex remain responsible for reasoning, coding, file work, web work, tool use, subagents, permissions, and results. The Plugin contributes:

1. A consumer-friendly interaction model.
2. A visual team interface in ChatGPT.
3. A thin MCP state service.
4. A focused workflow skill.
5. Optional Codex lifecycle hooks that convert supported runtime events into truthful visual states.

The project proceeds through a **hard feasibility gate** before the polished visual interface is built. The first proof must demonstrate that an embedded Plugin UI can remain visible, update from real events, and work without inventing activity.

---

## 2. Product thesis

> ChatGPT and Codex already contain most of the intelligence and tools. Project Visual Team makes those capabilities understandable by showing who is handling each part, what is happening now, what needs the user, and what was completed.

### Primary target user

A nontechnical founder, creator, operator, or power user who uses ChatGPT or Codex to build and manage projects but does not want to understand:

- subagent configuration;
- model selection;
- reasoning levels;
- MCP terminology;
- sandbox modes;
- hooks;
- terminal processes;
- thread lifecycle details.

### Initial job to be done

> “I should be able to describe a goal normally, see whether one AI role or a small team is handling it, understand progress at a glance, respond when I am needed, and inspect the finished work.”

---

## 3. Product principles

### 3.1 One bot by default

A small request should produce one visible lead bot, not a theatrical team. Specialists appear only when the work has genuinely separate workstreams or an independent review is justified.

### 3.2 Truth before animation

Every meaningful state must be backed by one of the following:

- a real Codex hook event;
- a real MCP tool call;
- an explicit workflow transition reported by the host model;
- a direct user action.

The interface must never animate a bot as “testing,” “reviewing,” or “waiting for approval” without evidence.

### 3.3 Native capabilities first

Use ChatGPT and Codex capabilities before adding new execution infrastructure. No Agents API or custom model orchestration in the MVP.

### 3.4 Consumer language, inspectable details

The default view uses ordinary language. Technical details remain available in an expandable evidence panel.

Example:

- Default: **Alex is checking the latest changes.**
- Details: `PostToolUse · apply_patch · turn 01J... · observed by Codex hook`

### 3.5 Permissions stay native

Project Visual Team may explain that permission is needed, but it will not replace, obscure, automatically approve, or automatically deny native ChatGPT/Codex permission controls.

### 3.6 Minimal data collection

Do not store prompts, transcripts, source code, command output, file contents, or generated artifacts by default. Store only the minimum state needed to display progress.

### 3.7 Accessible without animation

Every visual state must also exist as text. Support reduced motion, keyboard navigation, screen readers, text resizing, and WCAG AA contrast.

---

## 4. Scope

## 4.1 MVP includes

- One visual lead bot.
- Up to two additional specialist bots.
- Solo-versus-team routing rules.
- Inline ChatGPT status card.
- Fullscreen visual team view.
- Picture-in-picture compact roster, if the platform feasibility test passes.
- A task state machine with event provenance.
- One focused `visual-team` skill.
- A small MCP server with structured tools.
- A headless text result for surfaces that do not render the custom UI.
- Optional Codex hooks for supported events.
- Original character art and visual identity.
- Anonymous, ephemeral task sessions for the first alpha.
- Open-source repository, documentation, examples, tests, and contribution guide.

## 4.2 MVP does not include

- An independent agent runtime.
- The OpenAI Agents API.
- Codex App Server.
- A standalone desktop or mobile application.
- Support for Claude, Gemini, OpenCode, or other providers.
- Cloud computers or remote browser sessions.
- A marketplace for bots or skills.
- Scheduled autonomous routines.
- Voice characters.
- Persistent long-term bot memories.
- A furniture editor or simulated office.
- Automatic approval of consequential actions.
- Storing repository contents or complete transcripts.
- A promise that the official Codex interface will be visually replaced.

---

## 5. Core user experience

## 5.1 Entry

The user installs the Plugin and invokes it directly or asks for a visual team.

Example:

> “Use Visual Team to review my onboarding flow, improve it, and check that nothing broke.”

## 5.2 Planning

The lead bot summarizes the goal and chooses one of two execution modes.

### Solo mode

Use one worker when the request is small, sequential, or best handled in one context.

### Team mode

Use specialists only when at least one condition is true:

- two or more workstreams are genuinely independent;
- the user explicitly asks for parallel work;
- an independent read-only review adds material value;
- the task naturally separates into research, implementation, and verification;
- the work is large enough that bounded delegation reduces confusion.

### Constraints

- Maximum three visible bots in the MVP.
- Parallel work should favor read-heavy tasks.
- Only one bot may be the active writer to a shared codebase at a time.
- A reviewer should be read-only whenever practical.

## 5.3 Active work

The user sees:

- current goal;
- bots assigned;
- current status of each bot;
- latest verified activity;
- blockers or approvals;
- finished outputs.

## 5.4 Completion

The final view must answer four questions:

1. What was requested?
2. What was actually done?
3. What was checked?
4. What still needs attention?

---

## 6. Visual states

### Task states

```text
DRAFT
PLANNING
ACTIVE
WAITING_FOR_USER
BLOCKED
COMPLETED
FAILED
CANCELED
```

### Worker states

```text
IDLE
ASSIGNED
PLANNING
WORKING
WAITING_FOR_APPROVAL
BLOCKED
REVIEWING
COMPLETED
FAILED
CANCELED
```

### Evidence levels

Every displayed state includes provenance:

| Level | Meaning | Example |
|---|---|---|
| `observed` | Direct runtime event | Codex `SubagentStart` hook |
| `reported` | Host model explicitly reported a workflow boundary | Skill called `report_workflow_step` |
| `derived` | Server inferred a display state from recent events | Recent tool activity implies active work |

Rules:

- `derived` may never claim completion, approval, review, or success.
- Completion requires an explicit completion event.
- Approval state requires an actual permission event or explicit user-decision request.
- A stale active state changes to **No recent activity**, not **stuck** or **failed**.
- Replayed or duplicate events must be idempotent.

---

## 7. Technical architecture

```text
┌─────────────────────────────────────────────────────────────┐
│ ChatGPT / Codex                                             │
│                                                             │
│  Visual Team Skill ───────────────┐                         │
│  Native work, tools, subagents     │                         │
│  Codex lifecycle hooks ────────────┼────┐                    │
└────────────────────────────────────┘    │                    │
                                          ▼                    │
                              ┌──────────────────────┐          │
                              │ MCP state service    │          │
                              │                      │          │
                              │ tools                │          │
                              │ state machine        │          │
                              │ event provenance     │          │
                              │ ephemeral storage    │          │
                              └──────────┬───────────┘          │
                                         │                      │
                                         ▼                      │
                              ┌──────────────────────┐          │
                              │ MCP Apps UI          │          │
                              │                      │          │
                              │ inline card          │          │
                              │ fullscreen view      │          │
                              │ PiP roster           │          │
                              └──────────────────────┘          │
```

### 7.1 Plugin package

Use the portable Agent Plugins layout with a root `plugin.json`. OpenAI-specific presentation and hooks belong under `extensions.com.openai`.

### 7.2 MCP server

Recommended stack:

- TypeScript;
- current supported Node.js LTS;
- `@modelcontextprotocol/sdk`;
- Zod for schemas and runtime validation;
- a small HTTP framework such as Express;
- structured JSON logging;
- an in-memory repository for the feasibility spike;
- PostgreSQL adapter only when public multiuser persistence is required.

The MCP endpoint uses Streamable HTTP at `/mcp`.

### 7.3 UI

Recommended stack:

- React 18;
- TypeScript;
- `@openai/apps-sdk-ui` where useful;
- CSS and lightweight SVG animation;
- esbuild for a single iframe-compatible JavaScript module.

Do not use a game engine in the MVP. The visual identity should be original and should not resemble Grok Bot, Pixel Agents, or an existing pixel office.

### 7.4 State refresh strategy

Test these approaches in order:

1. UI calls the read-only `get_visual_task` MCP tool through the MCP Apps bridge while the task is active.
2. If host-mediated polling is too restricted or slow, use authenticated server-sent events from the approved MCP origin with an exact CSP declaration.
3. Do not introduce WebSockets unless both simpler approaches fail.

The feasibility report must record which method works on ChatGPT web, desktop, mobile, and supported Codex surfaces.

### 7.5 No Agents API in the MVP

The architecture must contain an `ExecutionAdapter` boundary, but only the native-host adapter is implemented.

```ts
interface ExecutionAdapter {
  start(request: VisualTaskRequest): Promise<ExecutionHandle>;
  cancel(handle: ExecutionHandle): Promise<void>;
  getCapabilities(): ExecutionCapabilities;
}
```

The Agents API becomes a separate future decision only if native ChatGPT/Codex execution cannot provide durable work, required events, or adequate subagent behavior. Adding it must not happen silently because it changes billing, account setup, and product positioning.

---

## 8. Proposed repository structure

```text
project-visual-team/
├── plugin/
│   ├── plugin.json
│   ├── mcp.json
│   ├── .app.json                     # local registered MCP mapping, when used
│   ├── skills/
│   │   └── visual-team/
│   │       ├── SKILL.md
│   │       ├── agents/
│   │       │   └── openai.yaml
│   │       └── references/
│   │           ├── delegation-rules.md
│   │           └── state-truth-rules.md
│   ├── hooks/
│   │   └── hooks.json
│   └── assets/
│       ├── logo.svg
│       ├── composer-icon.svg
│       └── screenshots/
├── apps/
│   ├── mcp-server/
│   │   ├── src/
│   │   │   ├── server.ts
│   │   │   ├── tools/
│   │   │   ├── auth/
│   │   │   ├── repositories/
│   │   │   └── ui-resources/
│   │   └── tests/
│   └── plugin-ui/
│       ├── src/
│       │   ├── App.tsx
│       │   ├── modes/
│       │   │   ├── InlineView.tsx
│       │   │   ├── FullscreenView.tsx
│       │   │   └── PipView.tsx
│       │   ├── components/
│       │   ├── accessibility/
│       │   └── bridge/
│       └── tests/
├── packages/
│   ├── contracts/
│   ├── state-machine/
│   ├── codex-event-mapper/
│   └── test-fixtures/
├── evals/
│   ├── positive/
│   ├── negative/
│   └── platform-matrix.md
├── docs/
│   ├── architecture.md
│   ├── security.md
│   ├── privacy.md
│   ├── product-principles.md
│   ├── feasibility-report.md
│   └── adr/
├── .github/
│   ├── ISSUE_TEMPLATE/
│   └── workflows/
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
├── SECURITY.md
├── LICENSE
├── README.md
└── CHANGELOG.md
```

Recommended license: **Apache-2.0** for the code. Keep the eventual project name and logo outside the open-source license through a simple trademark policy.

---

## 9. MCP tool contract

Keep the tool set small and focused.

### 9.1 `start_visual_task`

Creates an ephemeral task and initial roster.

Inputs:

- user-visible task title;
- concise task summary;
- `solo` or `team` mode;
- requested worker roles;
- optional privacy mode.

Returns:

- task ID;
- initial task state;
- roster;
- opaque task capability token in UI-private metadata;
- model-readable summary.

Annotations:

- `readOnlyHint: false`
- `destructiveHint: false`
- `openWorldHint: false`

### 9.2 `report_workflow_step`

Records an explicit, model-reported phase boundary.

Allowed phases:

- planning;
- researching;
- implementing;
- testing;
- reviewing;
- waiting for user;
- completed;
- failed.

The server rejects unsupported transitions.

### 9.3 `record_codex_event`

Receives supported Codex hook events and maps them to visual events. This tool records activity only. It must never return a decision that allows, denies, rewrites, or blocks a Codex action.

### 9.4 `get_visual_task`

Returns the current task snapshot and a bounded recent event list.

Annotations:

- `readOnlyHint: true`
- `destructiveHint: false`
- `openWorldHint: false`

### 9.5 `finish_visual_task`

Records the final result summary, verification status, and artifact references. It does not upload or retain artifact contents.

### 9.6 `render_visual_task`

Returns the MCP Apps UI resource. This is the only tool that should attach the visual template. Data and rendering remain decoupled so routine state updates do not repeatedly recreate the iframe.

### 9.7 `set_visual_preferences`

Stores only presentation preferences for the current task or anonymous session:

- reduced motion;
- compact view;
- character labels;
- high-contrast preference.

---

## 10. Codex hook mapping

Use plugin-bundled MCP tool hooks when supported. Hooks use the already-connected MCP server.

| Codex event | Visual interpretation | Notes |
|---|---|---|
| `SessionStart` | Ready / resumed | Do not claim active work yet |
| `UserPromptSubmit` | Planning | Observed prompt submission, not proof of execution |
| `SubagentStart` | Add or activate specialist | Use `agent_id` and `agent_type` |
| `PreToolUse` | Working on a concrete action | Map only supported local tool paths |
| `PostToolUse` | Recent action finished | Not equivalent to task success |
| `PermissionRequest` | Waiting for approval | Record only; preserve native approval flow |
| `SubagentStop` | Specialist finished its delegated turn | Do not assume overall task completion |
| `Stop` | Current turn finished | Show “turn finished,” not “project completed” |
| `Interrupt` | Work interrupted | Keep resumable state |

Important limitations to expose honestly:

- Hosted tools such as web search may not appear through ordinary tool hooks.
- Hook availability depends on surface and execution environment.
- Non-managed hooks require user trust review.
- Plugin installation on the web does not automatically deploy local hook scripts.
- A missing hook must degrade to model-reported status rather than fabricated detail.

---

## 11. Skill design

Create one focused skill: `visual-team`.

### Skill responsibilities

1. Detect when the user explicitly invokes the Plugin or asks for a visible team.
2. Summarize the goal in plain language.
3. Choose solo or team mode using the delegation rules.
4. Start the visual task before substantive work.
5. Use native ChatGPT/Codex capabilities to perform the work.
6. Report only meaningful workflow boundaries.
7. Render the visual interface after the initial plan and at completion.
8. Preserve native permission handling.
9. Never invent a bot, action, result, review, test, or approval.
10. Provide a complete text response when custom UI is unavailable.

### Delegation rules

- Prefer one worker.
- Use parallel workers for independent, read-heavy work.
- Avoid concurrent edits to the same files.
- Use a separate reviewer only when independent review materially improves confidence.
- Stop at three visible workers.
- Do not expose model names or reasoning settings unless the user opens advanced details.

---

## 12. UI specification

## 12.1 Inline card

Purpose: quick task status and entry into richer views.

Contents:

- lead bot;
- concise task title;
- current verified status;
- up to two supporting bots;
- one primary action: **Open team**;
- optional secondary action: **View details**.

Do not place tabs, deep navigation, or an internal chat composer in the inline card.

## 12.2 Fullscreen view

Purpose: the main visual team experience.

Sections:

1. **Goal** — current task and definition of done.
2. **Team** — visible roles and states.
3. **Workstreams** — what each role owns.
4. **Needs you** — approvals, questions, or decisions.
5. **Results** — completed work and verification.
6. **Evidence** — event provenance and technical details.

ChatGPT’s native composer remains the conversational control surface. The Plugin must not recreate it.

## 12.3 Picture-in-picture

Purpose: a glanceable ongoing activity display.

Contents:

- no more than three compact bot avatars;
- one-line state per bot;
- a visible user-needed indicator;
- no dense controls.

PiP automatically closes or returns inline when the active session ends.

## 12.4 Visual language

- Original small robot characters, not human employees.
- No simulated office in the MVP.
- Motion communicates state but is never the only indicator.
- Use system fonts and system colors.
- Use brand accents only for logos, badges, and primary actions.
- Honor `prefers-reduced-motion`.
- All states have accessible text labels.

---

## 13. Privacy and security model

### 13.1 Data minimization

Do not store by default:

- complete user prompts;
- chat transcripts;
- repository paths beyond an optional project label;
- source code;
- command text;
- command output;
- file contents;
- generated artifacts;
- API keys or credentials.

Store only:

- opaque task ID;
- optional user-chosen title;
- role labels;
- state events;
- timestamps;
- provenance;
- non-sensitive result labels;
- artifact references supplied by the host, not artifact contents.

### 13.2 Anonymous alpha

The initial alpha uses high-entropy, task-scoped capability tokens and short retention. It does not support cross-device history or permanent bot memory.

### 13.3 Public beta

Before a public multiuser release, decide between:

- remaining anonymous and conversation-scoped; or
- adding OAuth 2.1 for persistent, user-specific state.

Do not add accounts merely for marketing analytics.

### 13.4 Hook safety

- `record_codex_event` is append-only.
- It cannot approve, deny, rewrite, or block work.
- It ignores unexpected fields.
- It never stores raw command arguments unless an explicit debug build is used locally.
- Production logs redact capability tokens and user-supplied text.

### 13.5 Server controls

- Validate every input with Zod.
- Rate-limit state-changing tools.
- Enforce task-token scope.
- Use exact CSP domains.
- Use TLS in production.
- Separate read and write capabilities when persistence is added.
- Maintain audit records for server errors without recording sensitive payloads.

### 13.6 Product boundary

The MVP is not marketed for regulated data, PHI, classified information, or secrets. The interface should warn users not to include sensitive content in visual task titles.

---

## 14. Development milestones and gates

## Milestone 0 — Platform feasibility proof

### Closeout decision — 2026-09-15

**COMPLETE / GO to Milestone 1** for the initial supported path: ChatGPT web
on the tested Pro account, Windows Codex CLI with the installed native
compatibility package, and Render hosting. All eight hard GO criteria below
have evidence on that path. See `docs/m0-closeout.md` and
`docs/feasibility-report.md`.

Following the owner's direction to finish feasibility and move forward,
untested desktop/mobile surfaces remain compatibility work before support is
claimed for those surfaces. Real-host expiry/rejection UX and active PiP
updates remain validation work before private alpha (Milestone 5). They do
not block core-engine development. Pending matrix cells stay unverified;
this closeout does not assert universal platform support or public readiness.
The eight criteria and product invariants are unchanged. Reopen feasibility
only if new evidence breaks a hard criterion on the supported path or triggers
a pivot condition below.

### Build

- Minimal MCP server.
- `start_visual_task`, `record_codex_event`, `get_visual_task`, and `render_visual_task` tools.
- One static robot character.
- Inline, fullscreen, and PiP presentation tests.
- One bundled Codex hook, preferably `SubagentStart` or `PostToolUse`.
- Headless text output in Codex.

### Test matrix

- ChatGPT web.
- ChatGPT desktop.
- ChatGPT mobile, where available.
- Codex in the ChatGPT desktop app.
- Codex CLI for skills/tools/hooks without custom UI.
- Windows as the primary local development environment.

### Hard GO criteria

Proceed only if all are true:

1. The Plugin can be installed and invoked without editing source files.
2. Inline UI renders reliably.
3. Fullscreen view works.
4. PiP either works or has a documented platform limitation and a satisfactory inline fallback.
5. The UI can refresh active task state without recreating the entire experience on every event.
6. At least one real Codex lifecycle event reaches the same task view.
7. Codex receives useful text output when the custom UI is unavailable.
8. No raw prompt, transcript, command, or code content is required for the visual state.

### Pivot conditions

- If Codex events cannot reach the Plugin state service, release ChatGPT-only visual mode first and keep Codex as a headless skill.
- If PiP is unreliable, use inline plus fullscreen only.
- If live UI refresh is impossible, stop the “live team” concept rather than fake it.
- If a separate App Server client is required, return for a new product decision before building it.

## Milestone 1 — Core state engine

**COMPLETE / GO to Milestone 2 — 2026-09-15.** Coordinator accepted
`2eda8b3f42dac033e473345b579c76911ed73917` after re-review of all three
follow-up cases. All four exit criteria below have passing evidence:
145 tests, seeded invariant checks, complete-record replay, both unchanged
coordinator probes, typecheck, build, and native compatibility verification.
See `docs/m1-core-engine-acceptance.md`. Next: `docs/swe-2-brief-007.md`.

### Deliverables

- Typed event schema.
- Deterministic task and worker reducers.
- Event deduplication.
- Provenance tracking.
- In-memory repository.
- Contract tests.
- Property tests for invalid transitions.
- Replayable event fixtures.

### Exit criteria

- Replaying the same event log always produces the same snapshot.
- Unsupported transitions fail safely.
- No derived event can mark work complete or approved.
- Duplicate hook events do not alter the result.

## Milestone 2 — Consumer workflow skill

### Deliverables

- `SKILL.md`.
- Delegation rules.
- Solo/team decision matrix.
- Headless fallback behavior.
- Five positive and three negative evaluation prompts.

### Exit criteria

- Small tasks select one bot.
- Parallel write-heavy tasks do not launch multiple writers.
- Unsupported requests do not create fake tasks.
- The skill completes useful work even when UI is unavailable.

## Milestone 3 — Visual experience

### Deliverables

- Inline card.
- Fullscreen view.
- PiP view if feasible.
- Original character set: lead, explorer, builder, reviewer.
- Reduced-motion mode.
- Keyboard navigation.
- Evidence panel.
- Responsive mobile layout.

### Exit criteria

- A user can identify the goal, current owner, status, and needed action within ten seconds.
- The interface remains understandable with all animation disabled.
- The UI never claims unsupported activity.
- Inline mode contains no deep navigation or duplicate composer.

## Milestone 4 — Codex integration

### Deliverables

- Bundled hooks.
- Codex event mapper.
- Hook trust explanation.
- Windows validation.
- Session and subagent correlation.
- Graceful fallback for unavailable hooks.

### Exit criteria

- A real `SubagentStart`, `PostToolUse`, `PermissionRequest`, and `SubagentStop` sequence produces the expected visual states.
- Permission events remain in the native approval flow.
- Hosted-tool blind spots are disclosed rather than inferred as specific actions.
- Disabling hooks does not break the core Plugin workflow.

## Milestone 5 — Private alpha

### Participants

Use a small group containing:

- nontechnical ChatGPT users;
- a nontechnical or lightly technical builder;
- an experienced Codex user;
- an accessibility-focused tester.

### Tasks

- simple edit;
- research-only task;
- multi-part build task;
- task that requests permission;
- interrupted task;
- failed task;
- task where a team would be unnecessary.

### Exit criteria

- At least 80% of testers correctly identify what is happening and what requires them.
- At least 80% prefer the visual summary for multi-step work.
- Solo routing is correct for at least 90% of small-task evaluation cases.
- No tester mistakes animation for proof of success.
- No sensitive payload appears in server logs.

## Milestone 6 — Open-source release

### Required repository quality

- Architecture document.
- Threat model.
- Privacy model.
- Recorded demo.
- Installation instructions.
- Self-host instructions.
- Example event replay.
- Roadmap.
- Contribution guide.
- Code of conduct.
- Security reporting policy.
- Changelog.
- Issue templates.
- At least five `good first issue` tickets that are genuinely bounded.

### Launch message

Do not position it as “Grok Bot for ChatGPT.”

Use:

> An open-source visual team interface that makes native ChatGPT and Codex work easier to understand—without creating another agent platform.

## Milestone 7 — Public Plugin submission

### Required materials

- cleared public name;
- final logo and screenshots;
- verified developer identity;
- public website;
- support URL;
- privacy policy;
- terms;
- production HTTPS MCP endpoint;
- verified domain;
- exact CSP;
- accurate MCP tool annotations;
- five positive test cases;
- three negative test cases;
- starter prompts;
- release notes.

### Exit criteria

- Production endpoint passes MCP Inspector.
- Every tool has accurate read-only, destructive, and open-world annotations.
- Reviewer test credentials, if needed, require no MFA or private network.
- The published privacy policy matches actual payloads and retention.

---

## 15. Evaluation suite

### Positive cases

1. **Solo:** “Change the onboarding button label and confirm the app still builds.”
2. **Research team:** “Compare three onboarding approaches and recommend one.”
3. **Build plus review:** “Improve onboarding, test it, and have a separate reviewer check the change.”
4. **Permission:** A Codex operation triggers a native permission request.
5. **Interrupted and resumed:** The user interrupts active work, then resumes it.

### Negative cases

1. **Unnecessary team:** “Fix this typo.” The Plugin must use one bot.
2. **Unsupported visibility:** Hosted web search occurs without a supported hook. The Plugin must not claim a specific search action unless the workflow explicitly reports it.
3. **Unsafe shortcut:** A user asks the Plugin to auto-approve all commands. It must preserve native permission handling and refuse to automate approval.

### State integrity tests

- duplicated events;
- events arriving out of order;
- missing `SubagentStop`;
- task completion before worker completion;
- permission resolved after interruption;
- expired task token;
- stale active task;
- UI reload during active work;
- hook disabled mid-session.

---

## 16. Success metrics

### Usability

- 80% of nontechnical testers identify the current state and required action within ten seconds.
- 80% can explain the difference between “working” and “completed.”
- 90% of small tasks remain solo in the evaluation set.

### Truthfulness

- Zero completion states without an explicit completion event.
- Zero approval states without a permission or user-decision event.
- 100% of displayed states include provenance internally.

### Reliability

- Active UI state refreshes within five seconds under normal test conditions.
- Event replay is deterministic.
- Hook failure degrades to a clear “limited activity visibility” state.

### Accessibility

- WCAG AA contrast.
- Full keyboard navigation.
- Screen-reader labels for all bot states.
- No loss of meaning with reduced motion enabled.

### Open-source health

- A contributor can run the server and UI from a clean clone using the documented setup.
- CI runs linting, type checks, unit tests, contract tests, and build validation.
- At least one example can replay a recorded event stream without ChatGPT or Codex access.

---

## 17. Risk register

| Risk | Severity | Mitigation |
|---|---:|---|
| Plugin UI cannot remain live | Critical | Milestone 0 hard gate; test bridge polling and SSE before visual build |
| Codex hooks cannot correlate with the visual task | Critical | Test `session_id`, `turn_id`, and MCP tool hooks first; fall back to ChatGPT-only live view |
| Product becomes decorative agent theater | Critical | Event provenance, state invariants, evidence panel, no unsupported animations |
| Consumers find a team more confusing | High | One bot by default; specialists appear only for real independent work |
| Platform adds the feature natively | High | Open-source the interaction model, event mapper, and usability research; remain lightweight and complementary |
| Plugin is rejected as duplicative or cosmetic | High | Demonstrate workflow value: routing, task ownership, permissions clarity, evidence, and artifact summary |
| Hook trust creates setup friction | High | Hooks optional; explain clearly; core Plugin works without them |
| Visual design resembles competitors | Medium | Original robots, no office simulation, no copied names, assets, or layouts |
| State service stores sensitive data | High | Metadata-only design, private mode, short retention, redacted logs |
| Multiple agents increase usage and conflicts | High | Solo default, maximum three roles, read-heavy parallelism, one active writer |
| Public name conflicts | High | Naming and clearance workstream before public repository and submission |
| Scope expands into Agents API platform | High | ADR prohibiting Agents API in MVP; require explicit architecture review to add it |

---

## 18. Architecture decisions to record

Create these ADRs immediately:

1. **ADR-001:** Plugin-first architecture.
2. **ADR-002:** No Agents API in MVP.
3. **ADR-003:** No Codex App Server or standalone client in MVP.
4. **ADR-004:** Truthful event provenance and no agent theater.
5. **ADR-005:** Solo worker by default.
6. **ADR-006:** Metadata-only persistence.
7. **ADR-007:** Native approvals are never replaced.
8. **ADR-008:** Portable Agent Plugins package format.
9. **ADR-009:** Apache-2.0 code license.
10. **ADR-010:** Public name selected only after clearance.

---

## 19. Initial GitHub epics

### Epic 0 — Feasibility

- Scaffold portable plugin package.
- Create local MCP endpoint.
- Register in ChatGPT developer mode.
- Render inline component.
- Expand to fullscreen.
- Test PiP.
- Add read-only state refresh.
- Add one MCP tool hook.
- Publish feasibility report.

### Epic 1 — State engine

- Define contracts.
- Implement reducers.
- Add event provenance.
- Add replay fixtures.
- Add transition tests.
- Add stale-state behavior.

### Epic 2 — Skill

- Write `SKILL.md`.
- Implement routing rules.
- Add headless fallback.
- Add positive and negative evals.

### Epic 3 — UI

- Create original visual language.
- Implement inline mode.
- Implement fullscreen mode.
- Implement PiP mode if supported.
- Add evidence panel.
- Add reduced motion and keyboard support.

### Epic 4 — Codex

- Map hook events.
- Add plugin-bundled hook definitions.
- Validate trust flow.
- Test subagents.
- Test permission event display.
- Document unsupported hosted tools.

### Epic 5 — Security and publication

- Threat model.
- Privacy policy draft.
- Retention controls.
- Rate limits.
- CSP.
- Tool annotation review.
- Submission fixtures.

---

## 20. First implementation prompt for Codex

Use this only after the repository name and location are selected:

```text
Create the Milestone 0 feasibility skeleton for Project Visual Team.

Read PROJECT_PLAN.md first and treat it as the controlling specification.

Constraints:
- Build a portable ChatGPT/Codex Plugin, not a standalone application.
- Do not use the OpenAI Agents API.
- Do not use Codex App Server.
- Do not add any model API calls.
- Use TypeScript, the official MCP SDK, Zod, React 18, and esbuild.
- Implement only an in-memory state repository.
- Store no prompts, transcripts, source code, command input, or command output.
- Use one simple original SVG robot placeholder; do not imitate an existing product.
- Every state must include provenance: observed, reported, or derived.
- The Codex hook recorder must never approve, deny, modify, or block a tool call.

Deliver:
1. The repository structure from the plan.
2. A root workspace configuration.
3. A portable plugin package under plugin/.
4. An MCP server exposing start_visual_task, record_codex_event, get_visual_task, and render_visual_task.
5. A React inline component that displays one task and one bot.
6. A minimal fullscreen component.
7. A placeholder PiP component behind a feature flag.
8. One bundled Codex MCP-tool hook using a supported lifecycle event.
9. Unit tests for the state reducer and invalid transitions.
10. A docs/feasibility-report.md template with the required platform matrix and GO criteria.
11. A README with local setup and testing steps.

Do not build later milestones. Stop after the Milestone 0 skeleton compiles, tests pass, and the feasibility report template is complete.
```

---

## 21. Final planning determination

Proceed with **Milestone 0 only**.

Do not invest in polished character animation, persistent accounts, a production database, or public branding until the feasibility gate proves:

- the Plugin UI can remain useful through a task;
- task state can update without fabricated activity;
- at least one real Codex event can reach the visual view;
- the workflow remains useful without custom UI;
- setup does not require rebuilding Codex or launching a separate client.

If those conditions pass, the project has a coherent and defensible path to an open-source MVP.

---

## 22. Official references

- Plugin architecture: https://developers.openai.com/plugins/concepts/plugins
- Package a plugin: https://developers.openai.com/plugins/build/plugins
- Build an MCP server: https://developers.openai.com/plugins/build/mcp-server
- Add UI to an MCP server: https://developers.openai.com/plugins/build/chatgpt-ui
- UI guidelines: https://developers.openai.com/plugins/concepts/ui-guidelines
- Build skills: https://developers.openai.com/plugins/build/skills
- Connect and test: https://developers.openai.com/plugins/deploy/connect-chatgpt
- Submit plugins: https://developers.openai.com/plugins/deploy/submission
- Plugin security and privacy: https://developers.openai.com/plugins/guides/security-privacy
- Codex hooks: https://learn.chatgpt.com/docs/hooks
- Codex subagents: https://learn.chatgpt.com/docs/agent-configuration/subagents
- Codex open-source components: https://learn.chatgpt.com/docs/open-source
