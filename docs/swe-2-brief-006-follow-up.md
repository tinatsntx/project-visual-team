# Brief 006 follow-up — three reproduced targeting/wait cases

**Resolved and accepted 2026-09-15:** `2eda8b3`. Coordinator reran the unchanged
probe: all three cases PASS, exit 0. Typecheck, 145 tests, compatibility,
build, original M0 probe, and committed-diff checks pass. M1 is COMPLETE;
proceed to brief 007. The original reproduction below is historical.

Coordinator review of `a4ffe13e8055496f284b14a52c17713412b08107`, 2026-09-15.
M0 stays COMPLETE. M1 acceptance and publication are held for the cases below;
this is not another platform-matrix gate. GitHub main remains `daa32ad` and
Render remains on product code `4fb3548`.

Independent checks: typecheck PASS, 131/131 tests PASS, native compatibility
PASS, build/literal embedding PASS, original M0 coordinator probe exit 0,
committed-diff whitespace PASS. Widget 160.1 KB, dev host 465.1 KB.
HANDOFF and M1 acceptance originally said 120 tests; actual final count is 131.

Run the fixed coordinator reproduction:

```powershell
node --import tsx evals/m1-coordinator-probe.mts
```

The first two cases call registered handlers over isolated loopback HTTP;
reads use private request metadata. The third exercises the pure engine with
the real mapper because derived events are not exposed tool input. All data
is synthetic; no hosted writes, actual hook invocation, or capability output.

## 1. Colliding external IDs still target the wrong worker

Sequence: start solo -> `SubagentStart(agent_id="lead", agent_type="review")`
-> `PermissionRequest(agent_id="lead")`.

The new specialist has internal id `reviewer`, external id `lead`. The
permission event nevertheless changes the original lead to WAITING_FOR_APPROVAL
and leaves the actual specialist WORKING. `findWorker` checks internal ids
first, while only `specialist_finished` uses external-first resolution.
This defeats the namespace separation added in this commit. The risk is a
valid identifier collision, not evidence that native Codex normally uses
role names as IDs.

Preserve the intended namespace from the mapper through worker-targeting
events, or reject ambiguity without mutating the record. Do not simply reverse
all lookups: that would misroute model reports naming the internal lead.
Cover permission, worker transition, and activity attribution through the
mapper, with non-colliding IDs and absent-ID fallback still working.

## 2. Reported waiting does not populate the pending need

Registered API: start -> report `implementing` -> report `waiting_for_user`
-> private read. Actual: task WAITING_FOR_USER, `needsUser:false`, no
`needsUserProvenance`. Fullscreen uses that flag and therefore says
"Nothing needs you right now." while the task explicitly waits for the user.

The mapper emits `task_transition`, whose reducer branch does not set the
pending need. This API inconsistency predates the commit but is omitted from
the expanded wait-state reconciliation and would immediately affect M2.
Make a genuine reported wait carry `needsUser:true` and reported provenance;
only a relevant resolution clears it. Cover the real report/read path and
resume. No UI workaround or new permission decision mechanism.

## 3. Unrelated lead work clears a specialist's unresolved ask

Sequence: join `agent_a` -> lead PreToolUse -> specialist PermissionRequest
-> derived specialist transition to IDLE -> unrelated lead PreToolUse.

The derived event itself preserves the ask, but the later lead event calls
`settleNeedsUser`, sees no worker in WAITING_FOR_APPROVAL, and clears the ask.
No event resolved the specialist's decision. Actual result: `needsUser:false`,
task ACTIVE. Retaining a flag for only one event does not preserve the pending
decision across unrelated work.

Keep pending-need identity/evidence sufficient to distinguish a relevant
resolution from unrelated activity, or safely reject the derived transition
that loses the only waiting attribution. Preserve deliberate Stop/Interrupt
and terminal semantics and multiple waiting workers. Do not infer approval
or change native permissions.

## Finish line and return

Only fix these three cases and focused regressions. Retain all accepted
terminal, metadata, replay, dedup, and provenance guarantees. Preserve the
coordinator probe/evidence; do not weaken the probe to hide a failed case.
Update the four-criterion evidence mapping with the final checks.

Run typecheck, the full tests, build, both coordinator probes, and working /
committed diff checks. Commit locally, no push/deploy. Return the commit and
three probe outcomes. On acceptance, proceed to the already-prepared
`docs/swe-2-brief-007.md` consumer workflow; no additional M0 tests required.
