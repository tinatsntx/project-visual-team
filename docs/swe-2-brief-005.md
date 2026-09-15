# SWE-2 brief 005 — clean-checkout verification and literal resource embedding

**Resolved and accepted:** `515727a2d8ec08c95ce3c2e610f4578c56978347`.
Coordinator verified clean export, GitHub CI, exact-SHA Render deployment,
literal hosted assets, and fresh ChatGPT inline/fullscreen rendering. See
`docs/brief-005-acceptance.md`. The brief below preserves the original findings.

Date: 2026-09-14. Baseline `d39e5e3d9c096caf742aa29af9d39c55aa59dcae` is
pushed to main and deployed to Render. Read `HANDOFF.md`, `PROJECT_PLAN.md`,
and `docs/brief-004-acceptance.md` first.

Brief 004's bounded live test now passes: automatic native PostToolUse appears
in the existing ChatGPT widget, and that widget recovers after controlled
connection failures. Preserve that behavior. Codex handles deployment and
real-platform acceptance; SWE-2 owns this small verification/resource fix.

## 1. Make clean-checkout transport verification reproducible

[CI run 34909845559](https://github.com/tinatsntx/project-visual-team/actions/runs/34909845559)
fails 1 of 71 tests at `apps/mcp-server/tests/transport.test.ts:86`:
`render.structuredContent.task.id` is undefined. `.github/workflows/ci.yml`
runs `npm test` before `npm run build`. The render handler sees no widget bundle
and intentionally returns the text-only fallback (`uiAvailable:false`). Local
checks pass when an old/generated bundle already exists; Render passes because
its build runs first. Clean plugin compatibility verification does not exercise
this dependency.

Coordinator reproduced the identical failure without deleting any artifacts:

```powershell
$env:VISUAL_TEAM_UI_BUNDLE = Join-Path (Get-Location) 'dist\unbuilt-ci-fixture\visual-team.js'
node --import tsx --test apps/mcp-server/tests/transport.test.ts
```

This environment override belongs only in a disposable test shell. The test
was introduced in `0446a77`; it is not a newly introduced UI regression.

Make the transport test's UI dependency explicit and deterministic: use a
self-contained resource fixture/test setup or establish the build prerequisite
consistently in the supported commands and CI. Do not skip or weaken the
snapshot/private-metadata assertions. Preserve meaningful separate coverage for
the intentional no-bundle text fallback. Prove the full documented sequence in
a fresh committed-source export with fresh dependencies and no generated assets.

## 2. Preserve literal bundle content when building the MCP HTML resource

`apps/mcp-server/src/ui-resources/widget.ts` composes HTML using string replacement
values: `.replace("%%CSS%%", css).replace("%%BUNDLE%%", js)`. Replacement strings
interpret dollar sequences; they do not insert JavaScript literally.

Coordinator compared raw JS against the script extracted from both local and
hosted MCP resources. In d39e5e3:

- 22 raw `$$` sequences become `$` (including all `$$typeof` property names).
- Two raw `$&` sequences become the matched `%%BUNDLE%%` placeholder.
- Two literal `%%BUNDLE%%` strings remain in the served JavaScript.
- Trimmed raw JS length is 163714 characters; inlined JS is 163708 characters.

Use literal insertion for both bundle and stylesheet. Add a focused regression
that includes replacement metacharacters and verifies preserved content, plus
an integration assertion that the built bundle survives resource composition.
Keep the existing single-file UI, MIME type, resource URI, and bridge-only CSP.
Do not add a new serving framework or asset network dependency.

The current real ChatGPT test passed despite this mutation. Do not describe the
inlining defect as the confirmed cause of the earlier waiting screen.

## Scope and return

Limit changes to resource construction, relevant tests, and necessary verification
scripts/workflow or command documentation. No widget redesign, hook packaging,
capability transport changes, Sites work, account changes, PiP enablement,
terminal API, privacy semantics, or unrelated hygiene. Preserve coordinator
configuration, evidence, and diagnostic files; do not claim real-host acceptance
from local checks.

Return a commit SHA, changed files, clean-checkout command sequence and results,
configured-tree results, literal-resource regression evidence, and bundle sizes.
Run typecheck, tests, build, native compatibility verification, and whitespace
checks. Codex will verify GitHub CI after publication, deploy the accepted fix,
compare the hosted embedded script with the built bundle, and smoke-test the
existing Pro read-only ChatGPT flow. M0 remains open for the other recorded rows.
