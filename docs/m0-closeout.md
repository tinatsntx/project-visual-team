# Milestone 0 closeout — GO

Date: 2026-09-15. Product baseline: `4fb3548`, published and live on Render.
Decision follows the owner's request to finish this phase and move forward.

**M0 is COMPLETE for ChatGPT web + Windows Codex CLI + Render. Proceed to
Milestone 1, core state engine.** The feasibility question has been answered:
the installed plugin and native hook can drive a truthful embedded ChatGPT
experience. The prior decision kept broader compatibility and UX checks in
the critical path after that proof existed. This closeout corrects the scope;
it does not turn untested matrix cells into passes.

## Evidence against the eight exit criteria

| Criterion | Accepted evidence |
|---|---|
| Install and invoke without editing source | Generated native package installs/refreshes through supported CLI flow; installed skill, six tools, and one active hook work; no product source edits during invocation |
| Reliable inline render | Fresh Pro render initializes with correct task and evidence; controlled read failure/recovery preserves the same view |
| Fullscreen | Open team, Back to chat, and host Close pass, including after task completion |
| PiP or documented fallback | Actual ChatGPT web PiP and return pass on a completed solo task |
| Refresh without recreating the view | Native observed activity appears in the already-mounted details panel; connection recovery keeps the same view |
| Real Codex lifecycle event reaches that view | Automatic PostToolUse on d39e5e3 reaches the pinned ChatGPT task; refreshed 4fb3548 skill also delivers a real observed event |
| Useful headless text | Installed native skill renders readable planning and completed-task results |
| Metadata-only visual state | Bounded hook allowlist and transport tests pass; actual workflow needs no command, prompt, transcript, or code contents; capabilities remain private metadata |

Detailed evidence: `docs/brief-004-acceptance.md`,
`docs/brief-005-acceptance.md`, and `docs/m0-enablement-acceptance.md`.
The 4fb3548 review passed 88 tests, the unchanged blocker probe, typecheck,
build, native compatibility, exact-tip GitHub CI, and deployed-asset checks.
The later completed-task render is not substituted for the earlier real
same-widget update evidence.

## Supported scope and deferred validation

| Work | Owner and next gate |
|---|---|
| ChatGPT desktop/mobile and Codex desktop | Coordinator tests before support is claimed for each surface; keep matrix cells unverified |
| Actual expiry/missing-capability UX, genuine rejected mode request, active PiP updates | Coordinator validation before Milestone 5 private alpha; send SWE-2 a bounded fix only if a defect is reproduced |
| Sensitive-title notice, privacy-mode semantics, consumer-facing guidance | Include in consumer workflow/visual experience work before private alpha, as required by the controlling plan |
| Sites migration | Paused while owner MCP availability is blocked; Render remains the working host |
| Public distribution/authentication/persistence | Later release decisions; this development installation does not assert public readiness |

No new browser matrix sweep or Render redeploy is needed for this closeout.
Reopen feasibility only for a demonstrated regression of a hard GO criterion
on the supported path or a plan §14 pivot condition. Product invariants remain
mandatory throughout later work.

## Next action

Relay `docs/swe-2-brief-006.md` to SWE-2. Much of Milestone 1 already exists;
complete its missing contract/property/replay guarantees and fix defects
those checks expose. Do not rebuild the engine or add later milestones.
The coordinator reviews the returned diff and evidence against the four
Milestone 1 exit criteria, then advances to the consumer workflow skill.
