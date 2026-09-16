# SWE-2 brief 009 — M4 native session and specialist integration

Prepared after independent review of M3 `f78eac1` (183 tests, seven new
probe cases, CI and deployment pass). Coordinator is completing its hosted
UI acceptance while M4 work proceeds locally. Preserve the M3 behavior;
do not repeat old platform matrices or redesign the consumer UI.

## Outcome

Real native events reach only their own visual task. A specialist's real
start, activity, permission request, and finish update that specialist.
Missing or uncorrelated hooks leave a useful model-reported workflow.
The visual recorder never controls a native action or approval.

The exact demonstrated failures are recorded in
`docs/m2-consumer-workflow-acceptance.md`: unrelated native events attached
to a concurrently active ChatGPT task through `mostRecentActive()`, and
real reviewer completion lacked a correlated SubagentStop signal.

## Bounded implementation

1. **Source-backed native contract.** Inventory the installed runtime and
   its actual hook schemas/discovery behavior before choosing fields. The
   coordinator verified Windows Codex `0.154.0-alpha.6.2` at
   `C:/Users/mstin/AppData/Local/OpenAI/Codex/bin/12219cbfbcbddde7/codex.exe`.
   Compare the pinned `rust-v0.154.0` source with current official hook docs
   at https://learn.chatgpt.com/docs/hooks. Record exact parent/child session
   semantics and fields. Do not assume child tool hooks and parent subagent
   hooks use interchangeable identities or that all named events exist on
   every runtime. Keep unsupported paths explicit.
2. **Explicit bounded correlation.** Remove most-recent-global-task routing
   for untargeted native events. Establish a real per-session task binding
   using the smallest supported mechanism. A runtime-observed start-tool
   receipt or explicit reported registration may establish a binding; a
   timing guess, unrelated task, or model-invented observed event may not.
   Session and child-agent mappings must be bounded and expire with their
   task; completed/expired/unknown/ambiguous bindings fail closed without
   disrupting native work. Preserve explicit target support where safe.
   Concurrent sessions and ChatGPT-only tasks must stay isolated. Document
   trust assumptions honestly; a correlation key is not an authentication
   credential or a new promise of multiuser security.
3. **Real lifecycle coverage.** Bundle only supported hooks required for
   SessionStart/resume, PreToolUse/PostToolUse, SubagentStart/SubagentStop,
   PermissionRequest, Stop, and Interrupt as justified by the native
   contract. Route child tool events to the correct specialist, retain
   observed provenance, and preserve one writer/three visible workers.
   Avoid recursive/self-generated Visual Team tool noise. Never treat Stop
   as task completion, invent hosted searches, or invent missing child
   finishes. Preserve accepted namespace collision handling in the engine.
4. **Record-only hook hardening.** All paths, including malformed payloads,
   bad configuration, network failure, timeout, and oversized input, must
   leave native actions alone: no decision output, no approval/denial, no
   input rewriting, bounded processing, success exit for recorder failure.
   Filter at the boundary. Only explicitly allowlisted bounded correlation
   metadata reaches storage/transport/logs. If reading a native tool receipt
   for binding, extract only the exact task id from a validated Visual Team
   start result; never forward/log tool inputs, transcripts, command text,
   arbitrary result bodies, or capabilities. Capabilities remain `_meta` only.
5. **Fallback and packaging.** Update the skill and trust explanation for
   the actual binding flow. Disabled/unavailable hooks must leave start,
   honest phase reports, finish, and text answers usable. Preserve portable
   source → generated native package, installed-root paths with spaces,
   endpoint/app mapping, and normal hook review/trust. Do not edit installed
   caches, auto-trust hashes, global permission settings, or add another
   hosting/runtime system.

## Evidence required

- A reproducible synthetic integration test/probe with two native sessions
  and a separate ChatGPT-only task: cross-session and unbound events cannot
  contaminate another board. Include explicit mismatches, stale binding,
  terminal task, expiry, duplicate delivery, and resume.
- Parent/child lifecycle tests using the actual native payload contract:
  reviewer start → child work → pending permission → finish affects the
  reviewer without changing the lead's ownership or another pending ask.
- Hook launch tests for each bundled event, safe failure paths, bounded
  metadata extraction, and no sensitive sentinel fields in the outbound
  request. Synthetic fixtures must be labeled synthetic.
- Native compatibility verification on the configured tree and a clean
  committed-source export. Full typecheck/tests/build plus the four
  unchanged coordinator probes. Keep bundle growth bounded.
- `docs/m4-codex-integration-acceptance.md`: map each M4 exit criterion to
  evidence; provide exact native acceptance commands and expected outcomes.
  Local fixture delivery is not automatic native delivery.

Coordinator will refresh the installed package through supported commands,
review hook changes in the normal native flow, and run real harmless actions
and a real specialist. Real native permission approval remains in its own
flow. Do not fabricate a permission event to satisfy acceptance.

## Return

Commit locally; do not push or deploy. Return the commit, binding design and
source references, check results, and any precise runtime limitation.
Coordinator will review and execute hosted/native acceptance directly, then
send the next bounded brief. M5 tester feedback and M7 identity/submission
requirements must never be replaced by invented results.
