# SWE-2 brief 003: make the plugin's hooks load in native Codex

Date: 2026-09-14. Scope: Milestone 0 packaging compatibility only.

## Working arrangement and baseline

SWE-2 owns code. Codex coordinates installation, normal hook review, native
acceptance, Render, and ChatGPT. The owner relays this brief and results.
Read HANDOFF, AGENTS, PROJECT_PLAN, and docs/native-acceptance.md first.
Preserve the coordinator's uncommitted configuration and evidence documents.

Code `31d416594aea42648edb415aedc454a5e2f293ca` is deployed. Typecheck,
38 tests, and both bundles passed. ChatGPT web render/private refresh work
with CSP enforcement on. Do not change that transport or UI for this brief.

## Verified failure

Portable `visual-team@personal` 0.1.0 installs and exposes its skill and MCP.
Native CLI 0.149.0 `/plugins` reports no plugin hooks and no plugin apps;
`/hooks` reports PostToolUse installed 0 / active 0. The desktop-bundled
0.154.0-alpha.6.2 also reports zero PostToolUse hooks.

The newer runtime successfully called the installed render tool, returned
useful text, and executed a harmless native action at 16:32:06 UTC. The
pinned task stayed at four events. No manual hook/event call was used.
This is a discovery failure, before trust or command execution.

Upstream [0.149.0 loader, lines 936-952](https://github.com/openai/codex/blob/rust-v0.149.0/codex-rs/core-plugins/src/loader.rs#L936)
and the [0.154.0 loader](https://github.com/openai/codex/blob/rust-v0.154.0/codex-rs/core-plugins/src/loader.rs)
explicitly skip apps/hooks for AgentPlugin format. The
[manifest selector](https://github.com/openai/codex/blob/rust-v0.149.0/codex-rs/utils/plugins/src/plugin_namespace.rs)
prefers recognized root `plugin.json`. A compatibility overlay beside it
alone cannot solve this. Published extension guidance is ahead of this
tested loader behavior.

## Required change

Provide a reproducible native Codex compatibility distribution using the
supported Legacy loader path, while preserving the portable source package
for its intended surfaces. Prefer a generated separate package root with
`.codex-plugin/plugin.json`, `.mcp.json`, `.app.json`, skills, assets, and
hooks derived from the existing source. An equivalent small supported
solution is acceptable if it actually selects the working loader path.

- The compatibility install root must not select the portable AgentPlugin
  manifest. Avoid maintaining two independently edited hook/MCP/skill copies.
- Preserve hosted URL and current app mapping; avoid absolute developer
  paths in distributable files. Document source-to-distribution-to-installed
  cache flow and supported version assumptions.
- Hook discovery must work with normal Codex review/trust. Do not pre-trust,
  write global user hooks, bypass permissions, patch Codex, or add a custom
  execution runtime. Installation alone is not automatic-delivery proof.
- Keep hook delivery append-only, metadata-only, bounded, and fail-open.
  Preserve private `_meta` capability handling and truthful provenance.
- Native Windows command execution is still untested. Check the supported
  hook command environment/path behavior and handle spaces if necessary;
  do not present `${PLUGIN_ROOT}` shell compatibility as already verified.
- Leave hook trust and real account/runtime installation to the coordinator.
  No Render deployment should be needed for a packaging-only change.

## Verification and return

Run typecheck, tests, build, and diff whitespace checks. Add only focused
packaging verification that catches the actual failure: the install artifact
selects the intended loader, includes its declared resources, and derives its
MCP/skills/hooks from the source without drift. Report the exact install
artifact path and reproducible commands. Do not hand-edit installed caches.

Return changed files, rationale, checks, remaining native gaps, and commit
SHA. Do not claim native hook delivery from synthetic stdin or unit tests.

Coordinator acceptance after return: refresh/install the artifact via the
supported CLI flow, verify Visual Team PostToolUse is listed, review/trust
only that hook normally, then run a real harmless action with a pinned task.
The automatic metadata-only event must reach the already-open ChatGPT panel
without a manual hook call or another model render. Recheck useful CLI text.

Do not begin later milestones or mark M0 complete. Preserve all existing
ChatGPT fixes; no App Server, model orchestration, persistence, or UI redesign.
