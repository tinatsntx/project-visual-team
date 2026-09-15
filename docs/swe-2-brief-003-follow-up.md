# SWE-2 brief 003 follow-up: native launch path and clean-check verification

Date: 2026-09-14. Baseline: `fd3a5e883e714d8c3ef45d3ee408bf35dee91c81`.
Scope remains brief 003. Hold the broader brief 004 batch until this passes.
SWE-2 owns code; Codex owns installation, normal hook review, and real testing.
Preserve the coordinator's uncommitted deployment/app configuration and evidence.

## What now passes

Coordinator verified remote HEAD, typecheck, 38 tests plus compat verifier,
and build in the configured working tree. Generated/cache copies match.
Native 0.154.0-alpha.6.2 discovers the skill, linked Visual Team M0 app, and
exactly one PostToolUse hook from `visual-team@visual-team-native`.
The old `visual-team@personal` is disabled. Normal review/trust succeeded.

A fresh native session invoked the installed render tool at
17:57:12.776 UTC and a harmless shell action completed with exit 0 at
17:57:17.612 UTC. Native tool records identify the compatibility plugin.
The CLI emitted **Hook failed / hook exited with code 1** after both calls.
Task `vt_ee1c538478731e24cabb3635` remained at eventCount 1 at 17:57:49 UTC;
the already-open ChatGPT panel remained unchanged. No manual event injection.

The native model's final text said it saw no hook warning, contradicting the
CLI interface. Use the actual runtime evidence, not that final summary.

## 1. Fix the hook command's installed path

Current definition: `node "./hooks/record_codex_event.mjs" PostToolUse`.
That path is relative to the task's working directory, not the installed
plugin root. The test ran from `C:/Users/mstin/code/project-visual-team`.
An offline `node --check` against the relative path fails with MODULE_NOT_FOUND;
the installed script passes the same syntax check. This diagnostic did not
execute the script or send an event. Node is installed and available.

Source-backed diagnosis (the native UI itself only exposed exit code 1):

- [Discovery supplies PLUGIN_ROOT](https://github.com/openai/codex/blob/rust-v0.154.0/codex-rs/hooks/src/engine/discovery.rs#L263).
- [Discovery replaces `${...}` placeholders before execution](https://github.com/openai/codex/blob/rust-v0.154.0/codex-rs/hooks/src/engine/discovery.rs#L567).
- [Runner uses the supplied working directory](https://github.com/openai/codex/blob/rust-v0.154.0/codex-rs/hooks/src/engine/command_runner.rs#L217).

Use the supported installed-root placeholder with correct quoting, for example
`node "${PLUGIN_ROOT}/hooks/record_codex_event.mjs" PostToolUse`, after checking
the pinned runtime behavior. This substitution is performed by Codex; it is
not dependent on PowerShell expanding POSIX environment syntax.

Update the verifier, which currently demands the broken `./` form. Retain
source-derived artifacts and check that command targets resolve inside the
package. Include a meaningful launch check from a different working directory
and an installed path containing spaces. Such a check is a local regression,
not proof of automatic native delivery. Preserve fail-open, metadata-only,
append-only behavior and all existing trust/permission boundaries.

## 2. Make verification pass from committed source

The configured working tree passes, but a clean export of committed HEAD's
`scripts/` and `plugin/` fails `verify-native-codex-compat.mjs` at line 216:
actual URL `http://localhost:8787/mcp`, expected hosted Render URL.
This verifier is part of `npm test`, so clean checkout verification fails.
Committed `.app.json` is also empty; the working deployment mapping is local.

Make packaging verification derive and compare configuration with its source.
It must accept the repository's documented localhost development default and
preserve any configured hosted URL/app mapping without silently overwriting
either. Put hosted acceptance checks in an explicitly configured acceptance
path if needed. Do not commit the coordinator's local files or change their
values just to satisfy a test.

Verify both a clean committed-source checkout/export and the configured
working tree. Report them separately. Avoid unrelated validator/metadata
hygiene while resolving these two concrete failures.

## Return and coordinator retest

Run typecheck, tests, build, and diff whitespace checks. Return commit SHA,
changed files, clean/configured verification, and remaining native gaps.
No Render/UI redesign or later-milestone work is needed.

The coordinator left the compatibility plugin installed/enabled and the old
portable plugin disabled. The failed PostToolUse hook was toggled off through
the normal native UI after the test (installed 1 / active 0); its reviewed
trust was not bypassed. Coordinator must refresh/reinstall the new artifact,
review any changed hook definition, re-enable the hook normally, and repeat
the same live test. Do not modify installed caches or user hook settings.

Brief 003 is partially verified, not accepted end to end. M0 stays open.
