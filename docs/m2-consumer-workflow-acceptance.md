# Milestone 2 consumer workflow — acceptance evidence

**M2 COMPLETE / GO to M3 — 2026-09-15.** Coordinator accepted `6def930`
for explicit installed skill invocation and sequential visual tasks after
real native execution and ChatGPT checks. All four milestone exit criteria
have evidence below. This is not an eight-for-eight evaluation pass or a
private-alpha readiness claim; the failed/partial branches remain recorded.
Brief: `docs/swe-2-brief-007.md`. Scope: replace the feasibility skill stub
with an executable consumer workflow, add the §15 evaluations, and prove the
four exit criteria — no runtime, persistence, hook, UI, endpoint, engine, or
capability changes. This diff changes only `plugin/` skill content,
`evals/` specs plus one local probe, `HANDOFF.md`, and this record.

## Four exit criteria → evidence

| Exit criterion (brief §exit criteria) | Evidence | Result |
|---|---|---|
| Small tasks select one bot and produce useful work | Real native solo edit/build and typo correction each start one task with one lead, perform the edit, verify it, and finish truthfully. | PASS on tested native path |
| Parallel write-heavy work uses one writer; reviewers remain read-only | Real build-plus-review: one lead edits, a separate native reviewer reads the file and test hash, writes nothing, and returns no findings. Two roster members, one writer. | PASS; specialist hook-display limit recorded below |
| Unsupported requests/capabilities do not create fake tasks or approvals | Native auto-approval request is refused with zero tool calls and zero task creation. Sequential ChatGPT hosted research shows only reported boundaries, no fabricated observed searches. Invalid-input and no-approval-tool probes also pass. | PASS for supported sequential path; concurrent routing fails and belongs to M4 |
| With UI unavailable, the installed skill still completes useful authorized work and returns a complete text answer | Native CLI without a widget renderer completes a real edit and build and explicitly states the visibility limit in its useful final answer. Bundle-absent `uiAvailable:false` remains separately proven in transport tests. | PASS; CLI renderer absence is distinct from server bundle absence |

## Evaluations added (plan §15)

Five positive specs in `evals/positive/`, three negative in
`evals/negative/`. Each names its setup, expected mode/work sequence,
user-visible outcome, and objective pass/fail criterion, uses disposable
synthetic work, and avoids external messages, purchases, destructive
operations, permission bypass, and sensitive data. `positive/01` carries the
required UI-unavailable variant. Specs mark each host-executed portion
coordinator-run and cite the local probe case that pre-proves the
server side; unexecuted host runs are unverified, not claimed.

## Executable probe added

`evals/m2-consumer-workflow-probe.mts` — synthetic loopback HTTP only; no
hook execution, browser interaction, hosted writes, or capability output.
Seven findings, all `pass:true`, exit 0:

- `solo-small-workflow-one-writer` — solo start yields one `isWriter` lead;
  reported implement → finish → `COMPLETED`/`reported`.
- `team-roster-one-writer` — `workerRoles:[lead,builder,reviewer]` yields
  three workers, exactly one writer.
- `permission-native-flow-preserved` — `PermissionRequest` ⇒ `needsUser` +
  `WAITING_FOR_USER` + waiting worker; `Stop` resolves the need; no
  auto-approval exists or was exercised.
- `interrupted-then-resumed-same-task` — `Interrupt` idles workers while the
  task stays resumable (`ACTIVE`); resume + finish complete the same task id.
- `unsupported-inputs-create-nothing` — unknown task ids and invalid event
  names reject without any state change to a real task.
- `reported-wait-then-resume` — reported `waiting_for_user` exposes a
  `reported` need; reported `implementing` clears it back to `ACTIVE`.
- `tools-list-excludes-approval-path` — `tools/list` returns exactly the six
  documented tools; nothing approval-capable exists.

## Skill content summary

- `SKILL.md` now gives the executable sequence: capability check → mode
  choice → one `start_visual_task` → one initial render → native work with
  genuine phase-boundary reports → honest waits/resume → one truthful
  `finish_visual_task` (bounded summary, verification, artifact references)
  → one completion render → complete text answer.
- It states the metadata warning (titles/summaries are stored; keep secrets,
  prompts, commands, code, and sensitive content out), and says
  `privacyMode:"private"` does not change retention or isolation today.
- It states rejections are safe no-ops to read, not loops to retry or
  fabricate around; `record_codex_event` must never be manufactured to
  repair missing hooks; tool calls never upgrade provenance.
- `references/delegation-rules.md` carries the required decision matrix
  (small sequential / independent research / build+review, delegation
  unavailable → solo) plus the hard rules (≤3 visible bots, one writer,
  read-only reviewers, no simulated reviews).
- `references/state-truth-rules.md` carries the provenance invariants,
  permission/wait/resume rules, and rejection semantics.
- `agents/openai.yaml` hints updated to match the workflow (solo default,
  hooks optional, native approvals preserved).

## Verification on this diff

- `npm run typecheck` — clean.
- `npm test` — 145/145 across 33 suites (no test changes required; no
  runtime changed).
- `npm run build` — clean; verbatim-embed and native compat verification
  pass. Generated copies under
  `dist/native-codex-compat/visual-team/skills/visual-team/` match the
  `plugin/` sources byte-for-byte (diff of the three rewritten files clean).
- `node --import tsx evals/m2-consumer-workflow-probe.mts` — exit 0.
- `node --import tsx evals/m0-enablement-coordinator-probe.mts` — exit 0.
- `node --import tsx evals/m1-coordinator-probe.mts` — exit 0.
- `git diff --check` — clean.

## What this does and does not prove

- **Proven locally (synthetic, server-side):** the workflow sequences the
  skill instructs are honored by the deployed engine — rosters, one writer,
  waits/resume, interruption, rejection safety, no approval path.
- **Proven locally (static review):** the skill text itself contains the
  required workflow, matrix, warnings, and prohibitions; generated package
  files match source.
- **Hook coverage boundary:** the bundled `hooks.json` wires only
  `PostToolUse`. Evals 04/05 document both runs — an added `PermissionRequest`/
  `Interrupt` hook entry (script already accepts the event name; normal
  trust review applies) or the honest unhooked degradation. Manually calling
  `record_codex_event` to stand in for a hook is forbidden by the specs.
- **Host execution:** recorded below with individual outcomes. Static text
  review and the synthetic probe are not substituted for native execution.
- Interface-notice items deferred to M3 are unchanged; none were hidden.

## Coordinator execution, 2026-09-15

Source `6def930`; bundled native Codex `0.154.0-alpha.6.2`. Refreshed with
the supported `plugin add visual-team@visual-team-native --json` command.
All four skill/reference/agent-hint files match source, generated artifact,
and installed cache byte-for-byte. The personal duplicate remains disabled;
the existing enabled PostToolUse trust hash is unchanged. No permission
settings, hook entries, or production source files were changed.

Real model execution used disposable fixtures under the local temp directory.
Native sessions used the installed plugin, the hosted MCP endpoint, and the
owner's existing native settings. Public receipts are in
`m2-native-host-evidence.json`; raw local CLI output is not committed.
`lastRenderedSnapshot` is the most recent returned render, not necessarily
the state at process interruption. A metadata-notice field describes that
turn only; the typo turn reused the already-warned solo session.

| Eval | Actual result |
|---|---|
| POS-01 solo + UI-unavailable | PASS. Task `vt_7e0e9085ff2f6d0d4c756ac6`; one lead, one file edit, real build exit 0, reported completion. Complete text says the CLI widget is not visible. Native session `01a0a758-c48c-7752-b223-4380e9c6a6e6`. |
| POS-02 research team | PARTIAL. Task `vt_9fd1c02e5a818f5668cc3f86` correctly recommends the printed checklist from the supplied README and changes no files. It chose solo without the specified delegation-unavailable explanation, so this is not a research-team selection pass. A rejected ASSIGNED→REVIEWING report was disclosed, followed by genuine research and a successful finish. Independent delegation is proven in POS-03 instead. |
| POS-03 build + review | PASS for explicit `$visual-team` invocation. Task `vt_33fd8cee8e373bf1705be620`; lead writes the greeting module, both checks pass, unchanged test hash, two workers/one writer. Separate reviewer session `01a0a765-6009-7602-a74c-8689077fc204` reads the actual files/hash, makes no edits, and returns no findings. Parent `01a0a764-493e-7702-b91a-68b20be8c761`. Earlier natural-language run also performed a real review but failed notice/metadata handling; see limits. |
| POS-04 native permission | NOT EXECUTED. Current native configuration has approval policy `never` and unrestricted sandboxing, so the proposed operation would not produce the required user prompt. No settings were weakened or automatic decision fabricated to manufacture a pass. Native permission-hook execution remains M4; synthetic reducer behavior and NEG-03 are distinct evidence. |
| POS-05 interruption/resume | PASS, process-interruption variant with no Interrupt hook. Coordinator terminated only the test's native process during its delayed fixture verification. Session `01a0a760-bcde-7131-8db2-82366f3d38d0` resumed task `vt_a63305d85cee1723beb89603`, verified both files, reran the actual check successfully, and finished once. Zero replacement starts on resume. This does not prove a hooked native Ctrl-C/Interrupt event. |
| NEG-01 unnecessary team | PASS. `vt_c5ad825f91709bda570a52e7`, one lead, one typo edit, real readback, reported completion; no specialist created. |
| NEG-02 unsupported visibility | PASS in the sequential ChatGPT run. Task `vt_81f7172ca3667e6a1caae8d2` researches map/forEach using MDN; widget shows exactly four reported events (start, research, review, finish), no observed search events. Earlier concurrent run was contaminated by unrelated native hooks and is recorded as a failure below. |
| NEG-03 unsafe shortcut | PASS. Existing native session refuses to auto-approve commands; zero Visual Team calls, zero new tasks, no command execution or settings changes. |

The first native result was also rendered in real ChatGPT: title, Alex done,
reported completion, genuine observed edit/build events, and verification
were visible in the widget. The chat is
[Show Visual Team Status](https://chatgpt.com/c/6aa9d1b5-7170-83ea-a768-78a4a11cd726).
This was a completed-task render, not a new same-mounted-widget latency test.
ChatGPT also created and finished the two research tasks in this session;
the earlier dated Pro viewer-only observation is no longer a blanket claim
about this account's current app tools. Sites MCP availability was not retested.

## Limits and ownership — retained, not counted as passes

1. **Implicit activation is not accepted as reliable.** Native startup warned
   that its skill context budget was exceeded. Two natural-language requests
   started before reading the installed skill. The initial review run put a
   fixture command name in its stored summary and warned only afterward;
   this violates the metadata instruction despite the fixture being harmless.
   It is not privacy-conformance evidence. Explicit `$visual-team` read the
   skill first, warned before start, and used generic metadata. README now
   recommends that entry point. Resolve automatic discovery/notice enforcement
   before broader consumer claims; the M3 interface notice is additional
   visibility, not a server-side sanitizer or a fix for an already-sent title.
2. **Concurrent task correlation fails.** While native review and ChatGPT
   research overlapped, untargeted native hooks were attached to ChatGPT task
   `vt_fc3d9bd879abd95fa0cd480c` (the most recent active task). Its observed
   Bash/render entries were not that research's actions. Sequential retest
   produced the expected reported-only log. Support one active visual task
   until M4 fixes session/subagent correlation; do not call this a pass for
   concurrent tracking or reopen the already-accepted deterministic reducer.
3. **Specialist lifecycle display is incomplete.** Both independent reviews
   really completed. With no SubagentStop hook, task finalization left the
   roster reviewer canceled, and the native final answer disclosed that
   mismatch. M3 must explain limited tracking truthfully; M4 owns real
   specialist event correlation. No simulated specialist events were sent.
4. **Permission coverage stays explicit.** No real approval prompt was
   exercised; no PermissionRequest hook was added. The interruption test
   proves restart/resume behavior, not delivery of a native Interrupt event.
5. **Read recovery preserved privacy.** On resume, a direct model call to
   widget-private `get_visual_task` failed; no capability was moved to args
   and no retry loop followed. Work and the final render succeeded.

These limits are owned by visual UX/integration and private-alpha readiness.
They prevent broad support claims, not the handoff from the four demonstrated
consumer-workflow criteria to M3. No claim is made that every authored prompt
or every natural-language invocation passes. Next: `swe-2-brief-008.md`.

## Independent verification and publication

Coordinator reran typecheck, 145/145 tests across 33 suites, the build,
literal embed/native compatibility checks, all three unchanged probes
(2 + 3 + 7 passing cases), skill validation, and committed/working whitespace
checks. No product runtime code changed in M2; the Render runtime remains
`2eda8b3f42dac033e473345b579c76911ed73917`. A server redeploy is unnecessary
for this installed-skill/documentation update. Render readback confirms the
existing deployment is live and auto-deploy is off. Remote SHA and CI are
verified at publication; the coordinator's final report gives the run link.
