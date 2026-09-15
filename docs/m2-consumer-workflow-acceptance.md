# Milestone 2 consumer workflow — acceptance evidence

**Status: implementation complete, coordinator host execution pending.**
Brief: `docs/swe-2-brief-007.md`. Scope: replace the feasibility skill stub
with an executable consumer workflow, add the §15 evaluations, and prove the
four exit criteria — no runtime, persistence, hook, UI, endpoint, engine, or
capability changes. This diff changes only `plugin/` skill content,
`evals/` specs plus one local probe, `HANDOFF.md`, and this record.

## Four exit criteria → evidence

| Exit criterion (brief §exit criteria) | Evidence | Result |
|---|---|---|
| Small tasks select one bot and produce useful work | Decision matrix defaults `solo` for small sequential work (`references/delegation-rules.md`); probe case `solo-small-workflow-one-writer` executes start → implement → finish and asserts exactly one `isWriter` lead and `COMPLETED/reported`; eval `positive/01-solo-small-change.md` gives the exact coordinator prompt; `negative/01-unnecessary-team.md` pins the fail condition (any team for a trivial task). | Server-side proven; host adherence coordinator-pending |
| Parallel write-heavy work uses one writer; reviewers remain read-only | `workerRoles` roster construction yields exactly one `isWriter` (probe `team-roster-one-writer`: lead+builder+reviewer → 1 writer); skill hard rules require one writer and read-only reviewers, with solo fallback when delegation is unavailable; evals `positive/02` and `positive/03` pin the real-delegation-or-honest-fallback outcomes. | Server-side proven; host adherence coordinator-pending |
| Unsupported requests/capabilities do not create fake tasks or approvals | Probe `unsupported-inputs-create-nothing`: unknown task ids reject `applied:false`, a contract-invalid event name fails input validation, and a real task's snapshot is byte-identical after all three. Probe `tools-list-excludes-approval-path`: exactly the six tools exist; none can approve, deny, or decide. Probe `permission-native-flow-preserved`: a permission ask pends (`WAITING_FOR_USER`/`needsUser`) until real resolution evidence — nothing auto-answers. Evals `negative/02` and `negative/03` pin host behavior. | Server-side proven; host adherence coordinator-pending |
| With UI unavailable, the installed skill still completes useful authorized work and returns a complete text answer | `transport.test.ts` headless render returns `uiAvailable:false` plus a text summary (pre-existing, still passing); `SKILL.md` §Headless instructs continued native work + complete text answer + one-line limitation, max one render retry; eval `positive/01` variant pins the criterion for the coordinator run. | Server-side proven; host adherence coordinator-pending |

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
- **Not yet proven (coordinator-run):** that an installed host actually
  follows the skill — the eight eval specs are the exact bounded
  prompts/criteria for those runs, and are marked unverified until executed.
  Static text review cannot prove host adherence.
- Interface-notice items deferred to M3 are unchanged; none were hidden.
