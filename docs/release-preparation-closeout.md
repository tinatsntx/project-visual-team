# Release preparation — coordinator closeout

2026-09-15 CT. This closes the bounded technical preparation in SWE-2 brief
010. It does **not** declare private-alpha participant acceptance, cleared
public branding, or a submitted/approved public plugin.

## Accepted product and real-host evidence

M0–M4 are accepted on ChatGPT web + Windows Codex CLI + Render. The deployed
product remains `0f0e3abc48ee7f5ce92153e371dc3308a15e5a8e`; automatic deployment
is off. Real native specialist start, permission wait, one-action approval,
activity, specialist finish, interrupt/resume, session isolation, same-widget
completion, and hooks-disabled fallback are recorded in
[M4 closeout](m4-native-closeout.md). Release preparation changes contributor
tooling and materials, so it does not require a server restart or plugin
reinstallation.

## SWE-2 review and verification

Initial materials: `49d25ce`; first review correction: `fa6862b`. The
coordinator reproduced and returned the expected-rejection replay failure,
then the newly exposed file-input case that printed PASS without an
expectation block. Final correction `9c8e825` requires valid expectations
and rejects malformed/null steps before shape detection. The coordinator
re-ran the two unchanged reproductions and all 13 CLI boundary tests: pass.
The coordinator independently re-ran lint, typecheck, the full **212-test**
suite (44 suites), build, and native package checks at this final revision:
all pass. `git diff --check` is clean. Production dependency audit reports
zero vulnerabilities.

Independent clean committed-source export of `fa6862b` passes `npm ci`,
lint, typecheck, 208 tests in 44 suites, build, verbatim widget embed, and
native compatibility including installed-root launch checks. All **12**
registered fixture replays pass, including the negative/rejected-input
sequence. The configured-tree lint also includes the coordinator's demo
helper. This is a fresh `git archive` export, not a claimed remote clone.

Coordinator documentation corrections separate native installation from
ChatGPT attachment/Refresh, fix the committed hosted URL guidance, and
distinguish plugin memory retention from host conversation/tool history.
Titles and other caller-provided labels must remain sanitized.

## Hosted MCP Inspector check

`@modelcontextprotocol/inspector@2.6.0` CLI, Node 24.12.0, tested the accepted
HTTPS alpha endpoint on 2026-09-16 at 02:42 UTC. The 13 checks pass:
initialization; six-tool discovery and annotations; resource discovery/read;
render App metadata; task start/render; read rejection without the capability;
read with private request metadata; untargeted event rejection; reported work;
reported finish; final completed read. The disposable task ends with exactly
three reported events. Capability values are absent from the evidence file.

Strict schema checking reports **zero errors and one warning** at
`record_codex_event.inputSchema.properties.payload.additionalProperties`.
The input accepts unknown fields; the mapper/hook allowlist limits retained
metadata. This warning is retained, not presented as a clean warning-free
scan. [Sanitized evidence](mcp-inspector-evidence.json).

The Inspector [CLI smoke workflow](https://github.com/modelcontextprotocol/inspector/blob/main/docs/cli-smoke-testing.md)
is a protocol smoke check, not a full conformance suite. This result is not
an Inspector UI test, multiuser/authentication audit, or public-submission
approval. The endpoint still uses the documented single-user alpha model.

## Demo and contributor tickets

[Recorded demo](demo/index.html): a 36-second, silent H.264 video presenting
six real widget screenshots of **synthetic fixtures**, with captions and a
text alternative. It is a screenshot walkthrough, not a recording of live
ChatGPT/Codex interaction. FFmpeg decodes all 360 frames without errors; the
browser player shows the expected first image and 36-second duration.
Sources, SHA-256, and reproduction steps are in [demo details](demo/README.md).

Five bounded `good first issue` tickets are open and their labels/URLs were
read back: [#1](https://github.com/tinatsntx/project-visual-team/issues/1),
[#2](https://github.com/tinatsntx/project-visual-team/issues/2),
[#3](https://github.com/tinatsntx/project-visual-team/issues/3),
[#4](https://github.com/tinatsntx/project-visual-team/issues/4),
[#5](https://github.com/tinatsntx/project-visual-team/issues/5).
These are contributor backlog tasks, not unresolved M4 blockers.

## Gates that remain

- **M5:** the [private-alpha kit](private-alpha-test-kit.md) is ready; no real
  participant results exist. Comprehension, preference, accessibility, and
  animation-confusion measures require people. Routing denominators and
  log-review windows must be recorded alongside their runs.
- **M6 launch:** technical repository materials, demo, and tickets are ready.
  Public launch still depends on M5 and the owner choices below. The code of
  conduct exists; its non-security reporting contact is unresolved.
- **M7:** owner-selected and cleared name, final identity/logo/domain, public
  website and support/conduct contact, privacy policy/terms approval,
  authentication/deployment decision, production widget domain, and public
  review submission remain open. The current alpha endpoint's protocol check
  does not substitute for those decisions.

No participant data, legal assent, owner identity, or submission result has
been invented. No new product feature is needed merely to extend a completed
milestone. The next coding brief should come from actual alpha feedback or an
approved production/authentication scope.
