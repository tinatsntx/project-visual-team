# SWE-2 brief 001: make the real render flow initialize the widget

Date: 2026-09-14

## Working arrangement

SWE-2 owns code changes. Codex coordinates scope, reviews returned changes,
handles Render hosting/deployment and ChatGPT registration, and verifies the
installed plugin in ChatGPT. The owner relays briefs and results. SWE-2 does
not need Render access, ChatGPT account access, or deployment credentials.
Read `HANDOFF.md`, `AGENTS.md`, and `PROJECT_PLAN.md` before changing code.
Stay within Milestone 0.

## Objective

Make `start_visual_task` followed by `render_visual_task` produce a usable
widget from the actual render result, with working read-only refresh and
capability tokens confined to private `_meta` transport.

This is a bounded integration fix, not a new feature or UI redesign.

## Verified baseline

- Local and remote `main` were `852a5a8603b3bcfef2019ce83511ea4f3eaa5a06`.
- Typecheck, all 32 tests, and both build bundles passed on this host.
- The real-platform matrix remains untested; local success is not ChatGPT proof.
- The checked-in MCP URL is localhost and `.app.json` is empty.
- ChatGPT web is accessible with a Create app control. The Personal page
  showed no Visual Team registration. Account registration and live surface
  verification are coordinator follow-up work.

Recheck repository status before edits and preserve unrelated owner changes.

## Reproduced failure

Codex started `buildApp()` on an ephemeral loopback port and called the actual
Streamable HTTP endpoint with `initialize`, `start_visual_task`,
`render_visual_task`, and `tools/list`. Only response keys and booleans were
printed; no capability value was logged.

Observed:

```json
{
  "start": {
    "structuredKeys": ["taskId", "task"],
    "hasPrivateCapability": true
  },
  "render": {
    "structuredKeys": ["taskId", "uiAvailable"],
    "hasTaskSnapshot": false,
    "hasPrivateCapability": false
  },
  "getTool": {
    "capabilityInArgumentsSchema": true
  }
}
```

Relevant paths:

- `apps/mcp-server/src/tools.ts`: only `render_visual_task` attaches a UI
  template, but its result lacks the task snapshot and private capability.
- `apps/plugin-ui/src/bridge/useVisualTask.ts`: polling requires both a task
  and capability. An ID-only result increments `tick`, but no effect consumes
  that state to fetch the task. `refresh()` likewise only increments it.
- `apps/plugin-ui/src/dev/devHost.ts`: the simulated host supplies a complete
  snapshot and capability directly. It masks the actual render-result gap.
- `packages/contracts/src/index.ts` and the UI polling call: the capability
  currently travels in ordinary tool arguments, conflicting with AGENTS.md's
  requirement that capability tokens live in `_meta` only.
- `apps/mcp-server/tests/tools.test.ts` exercises the repository, not the
  registered render-tool/bootstrap sequence.

The empty-widget outcome is inferred from the reproduced server response
and widget guard. It has not yet been observed in a registered ChatGPT app.

## Required changes

1. Fix render-result delivery and widget initialization so a newly mounted
   iframe works using its own render result. Do not rely on receiving a
   previous data tool's private result or on synthetic host injection.
2. Keep the capability out of public tool schemas, ordinary arguments,
   content, structuredContent, URLs, logs, and model-visible state. Use
   supported request/result `_meta` paths and retain task-scoped validation.
   Verify current host/SDK support; do not weaken authorization to make the
   demo work. Report a concrete platform limitation if private transport is
   unsupported.
3. Make the existing refresh behavior work through the host bridge. Active
   tasks should update without remounting the iframe; terminal tasks should
   stop polling. Address the disconnected refresh trigger within this flow.
4. Make the harness exercise the same initialization contract and add focused
   regression coverage through actual registered MCP tool handlers/transport.
   Avoid a second hand-written response shape that can drift from the server.
5. Update the handoff/feasibility notes with the local evidence and remaining
   gaps. Keep real ChatGPT/Codex rows untested until someone runs them.

Preserve the existing portable `plugin.json`/`mcp.json` layout; current official
documentation supports it. Do not migrate to the compatibility layout merely
because an older helper expects `.codex-plugin/plugin.json`.

## Acceptance criteria

- A fresh widget receives the actual render result, shows the correct task
  and lead worker, and can fetch subsequent state without any earlier start
  response being injected into the iframe.
- Valid private metadata authorizes reads; missing, wrong, cross-task, and
  expired capabilities fail safely. Capability values never enter model-visible
  payloads, ordinary arguments, or logs.
- A metadata-only event sent to the real service appears through a subsequent
  widget read. The iframe remains mounted. Record observed local timing;
  ChatGPT refresh latency remains a separate test.
- Existing refresh controls perform a read. Terminal polling stops. A failed
  refresh does not fabricate progress or success.
- Useful headless text remains available.
- `npm run typecheck`, `npm test`, and `npm run build` all pass.

Every visual state retains provenance. `record_codex_event` remains append-only
and never controls Codex actions or approvals. Do not add model API calls,
App Server integration, persistence, accounts, new workflow tools, polished
animation, deployment, or public publication in this brief.

## Return to the coordinator

Provide changed files, the cause and fix, exact verification commands and
results, an actual start-to-render-to-refresh reproduction, remaining issues,
and a commit SHA if committed. Explicitly distinguish local evidence from
real-platform evidence. Do not mark Milestone 0 complete.

Codex will review the actual diff, rerun the relevant checks, then handle
Render service setup/deployment, verify the HTTPS MCP endpoint, and perform
ChatGPT registration and live installation/render/fullscreen/refresh testing.
SWE-2 should report any required build/start commands or runtime settings;
Codex applies hosting configuration. A real Codex hook reaching that same task view remains a later M0
acceptance check; a simulated stdin payload does not satisfy it.

## Official references checked by the coordinator

- [Portable plugin packaging](https://developers.openai.com/plugins/build/plugins)
- [MCP Apps UI and decoupled render flow](https://developers.openai.com/plugins/build/chatgpt-ui)
- [Connect and test](https://developers.openai.com/plugins/deploy/connect-chatgpt)

Use current official bridge specifications when implementing request metadata.
