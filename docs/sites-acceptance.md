# Sites migration acceptance

Owner request: coordinator implements the Sites port and proves one automatic
native Codex event reaches the embedded ChatGPT widget before replacing Render.

## Implementation and local evidence — 2026-09-14

- Isolated branch: `codex/sites-mcp-port`, based on SWE-2 commit `8ef7822`.
- Existing coordinator changes in the original checkout are preserved.
- Cloudflare Worker adapter at `/mcp`; D1 `DB` holds shared task state.
- Existing widget and tool handlers are reused, including private `_meta` reads
  and bridge-only CSP. Render/Node entry point still builds and passes its test.
- Typecheck passes; 43/43 tests pass; native packaging verifier and Windows
  installed-root launch regression pass; widget, dev-host and Worker build.
- New tests execute the Worker in workerd with D1: concurrent appends,
  idempotency, expiry and late-write rejection, shared rate limiting, private
  capability bootstrap/refresh, wrong/missing/cross-task/expired rejection,
  metadata filtering and request limits.
- Local Sites preview responds on `http://127.0.0.1:8789/`.
- Production dependency audit: no advisories. Drizzle's development-only loader
  retains an older esbuild advisory; its development server is not used or deployed.
- The Sites build helper failed on this Windows npm shim; the same project
  `npm run build` succeeds and produces the connector's required layout.

## Hosting and acceptance

- Registered owner-private Site: `appgprj_6aa84616178c81918e49948aa8a9375a`.
- Assigned origin: `https://visual-team-mcp.tinatsntx.chatgpt.site`.
- Published source: `433d93dec2b57c7a2d79fd1b1b829707a87c151b` (Sites source
  Git only, not pushed to GitHub). This declares `capabilities: ["mcp"]` in
  `.openai/hosting.json` and builds on implementation commit `e015860`.
- Version: `appgprj_6aa84616178c81918e49948aa8a9375a~appgver_b8a00069f6dc81919d28836e0a0ff263`.
- Deployment: `appgdep_6aa84af768488191886457391c357405`, succeeded
  `2026-09-14T19:29:21Z`. Worker and initial Drizzle migration applied.
- Owner-private browser access: PASS after normal ChatGPT sign-in; deployed
  Visual Team landing page rendered. No audience expansion occurred.
- Sites MCP lookup: **BLOCKED**, exact error:
  `SitesConnectorError: Sites MCP is not enabled for this Site owner.`
  Before declaring MCP, lookup reported that the published Site did not declare
  an MCP server. The current error follows the successful declaration/deploy.
- No documented owner MCP switch was found in the current Sites skills, tool
  inventory, official Sites guide, or workspace administration guidance. This
  appears to be account feature availability; Support must confirm the cause
  and enablement path. No alternative route or token was used to bypass it.
- Remote MCP authentication, native hook authentication, private capability
  forwarding, and real automatic native-to-widget delivery through Sites are
  still unverified. A working browser landing does not establish these.
- Render remains active at `https://project-visual-team-mcp.onrender.com/mcp`.
- M0 remains open until the native-to-widget gate has direct runtime evidence.

## Native hook retest on existing Render

The corrected `8ef7822` package was refreshed and reviewed/trusted through the
normal native UI, with only one Visual Team plugin enabled. A real native
action automatically appended observed event `hook_1789414476481_471owdl1`
at `2026-09-14T19:34:36.48Z` to `vt_d0f77f031b4c1437abdb0e67`, advancing
eventCount 1 -> 2. No manual hook/event call was made. Runtime session
`01a0a165-e72d-7392-b8c0-3d6f147928a9` exited cleanly. This proves corrected
native backend delivery on Render only. The ChatGPT widget initially stayed
on its waiting screen and browser recovery became unresponsive; direct
same-widget observation remains pending. Original checkout contains the full
coordinator record in `docs/native-acceptance.md`.

## Pro availability decision — 2026-09-14

The owner confirmed a Pro subscription and supplied an AI-assisted Support
response pointing to the [MCP availability FAQ](https://help.openai.com/en/articles/12584461).
The coordinator opened that article: it states Pro can build Apps SDK apps
and use read/fetch MCP connections in developer mode, while full MCP is
currently limited to Business and Enterprise/Edu. It does not explicitly
document this Sites-specific owner error; that causal link remains inferred.

Pause the Sites migration on this account. Preserve the port and private
deployment; no cutover, account upgrade, or further enablement workaround.
Render remains the acceptance backend, but changing hosting does not change
ChatGPT plan permissions. Test a read-only ChatGPT viewer: create the task
through Codex, append activity through the native hook, and use only existing
render/read tools from ChatGPT. Full Pro acceptance of that precise flow is
still required. Keep write tools honestly annotated and never disguise them
as read-only. The widget recovery brief remains the next bounded coding task.

## Earlier owner support handoff (superseded by the decision above)

Open the chat bubble at [OpenAI Help](https://help.openai.com/) while signed in
as the Site owner. Suggested request (not sent by the coordinator):

> Please confirm whether Sites MCP is available for my account and how to
> enable it. My owner-private Site, https://visual-team-mcp.tinatsntx.chatgpt.site,
> has a successfully published MCP capability, but requesting its MCP connection
> returns "Sites MCP is not enabled for this Site owner."
> Site ID: appgprj_6aa84616178c81918e49948aa8a9375a.
> Deployment: appgdep_6aa84af768488191886457391c357405, September 14, 2026,
> 19:29 UTC. Is this an account rollout, a workspace setting, or a product issue?

Official references checked September 14, 2026:
[Sites guide](https://learn.chatgpt.com/docs/sites),
[workspace controls](https://help.openai.com/en/articles/20001338), and
[contact Support](https://help.openai.com/en/articles/6614161-how-can-i-contact-support).
Workspace create/publish controls are documented; they do not document a
specific owner MCP switch. A plan change is not established as a remedy.

If the owner later explicitly resumes Sites after eligibility is confirmed:
fetch the advertised MCP connection/OAuth resource,
verify both ChatGPT and the native hook can authenticate, render a fresh task,
run one real native action, and observe its event in the same widget without
reload or another model render. Replace Render only after that passes.

## Reproduce locally

Run `npm ci --include=dev`, `npm run build`, `npm run typecheck`, `npm test`,
then `npm run dev:sites`. The preview uses a local D1 database under ignored
`dist/sites-local-d1`. Generate new schema migrations with `npm run db:generate`.
Never rewrite a migration after it has been applied to the hosted Site.

Storage and retention decision: [ADR-007 in the Sites worktree](../../project-visual-team-sites/docs/adr/007-sites-storage.md).

