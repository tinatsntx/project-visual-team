# SWE-2 brief 007 — Milestone 2 consumer workflow

**Cleared to execute, 2026-09-15.** Brief 006's three-case follow-up is accepted
at `2eda8b3f42dac033e473345b579c76911ed73917`. M0 and M1 are complete;
do not repeat the M0 browser matrix. Start from this accepted product code
plus any coordinator closeout documentation commits.
Read `HANDOFF.md`, `PROJECT_PLAN.md` §5/§6/§9/§14/§15, and final M1 evidence.

## Outcome

Replace the feasibility skill stub with a useful consumer workflow. Small
work stays solo; larger work delegates only when useful and supported; one
writer works at a time. The board tells the truth and the user gets a complete
result even if the visual service or custom UI is unavailable. Use native
ChatGPT/Codex execution and the existing six tools.

## Bounded work

1. Update `plugin/skills/visual-team/SKILL.md` and its two reference files.
   Replace M0-stub framing with a concise executable sequence: check supported
   work/capabilities, choose mode, start once, render initially, do real work,
   report genuine phase boundaries, handle waits/resume, truthfully finish
   with bounded result/verification/artifact labels, final render and text.
   Ordinary progress uses the existing board. Never report fictitious work
   merely to unlock a terminal transition.
2. Add a solo/team decision matrix for small sequential work, independent
   research, and build-plus-review. At most three visible workers and one
   actual writer. Prefer read-only specialists/reviewers. A request for a team
   does not prove the host can delegate: use solo with a plain explanation
   when delegation is unavailable. Assignments must correspond to actual
   planned/native work; no simulated reviews or fabricated tool activity.
3. Keep permissions in the native approval flow. Interrupted/unfinished work
   stays unfinished; resume the valid existing task where possible. Rejected
   state reports are not success. Never manufacture `record_codex_event`
   calls to repair missing hooks. Treat hook data as observed and genuine
   self-reported phase boundaries as reported; a tool call does not upgrade
   the underlying claim's provenance.
4. Define headless and limited-access paths. If writes are unavailable, as
   in the tested Pro viewer flow, render an existing task when available or
   explain the supported creation path; never invent task IDs or unavailable
   actions. If UI/reads/hooks fail, continue authorized native work and give
   a complete text result with a short visibility limitation. Avoid retry loops
   and repeated renders. Do not request broad new permissions to make a demo work.
5. Give a concise warning before sending task metadata to keep secrets and
   sensitive content out of titles (§13.6). Use minimal sanitized labels; no
   prompts, commands, transcripts, code, or artifact contents. Do not claim
   `privacyMode: private` changes retention/isolation without implementation.
   Keep semantics honest; record any remaining interface notice for M3.
6. Add the five positive and three negative evaluations from plan §15. Each
   needs setup, expected mode/work sequence, user-visible outcome, and an
   objective pass/fail criterion. Use disposable synthetic work for edits and
   builds, including a UI-unavailable variant. No external messages, purchases,
   destructive operations, permission bypass, or sensitive data.

## Four exit criteria and evidence

- Small tasks select one bot and produce useful work.
- Parallel write-heavy work uses one writer; reviewers remain read-only.
- Unsupported requests/capabilities do not create fake tasks or approvals.
- With UI unavailable, the installed skill still completes useful authorized
  work and returns a complete text answer.

Map these to executed evidence in `docs/m2-consumer-workflow-acceptance.md`.
Distinguish real native/model execution from synthetic fixtures and static
review. Keyword checks on skill text do not prove the host follows it. If the
needed host is unavailable, provide the exact bounded prompt/setup for the
coordinator and mark that execution unverified. Codex handles installed
refresh, real ChatGPT viewer acceptance, and final phase review.

## Scope, checks, return

Primary scope: skill/references, eight evaluations, and M2 evidence. Preserve
loader, hook command, endpoint/app mapping, engine invariants, and private
capability transport. No new runtime, persistence, hooks, UI redesign, host
migration, or generic refactor. Reproduce any missing server behavior that
blocks a required workflow and propose the smallest fix; do not fake progress.

Run typecheck, tests, build (including generated native package), both
coordinator probes, and working/committed diff checks. Verify generated skill
and reference files match source. Return commits, changed files, eight-case
results/limits, and the four-criterion map. Commit locally; do not push/deploy.
Stop when the four criteria are proven. Broader surfaces remain separate work.
