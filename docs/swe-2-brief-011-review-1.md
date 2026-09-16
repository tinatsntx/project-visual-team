# Brief 011 — coordinator review corrections

2026-09-16. Intermediate tree reviewed while SWE-2 was adding tests. Finish
these bounded corrections before calling 011 accepted. Independent 012 work
may continue, but both briefs require review before publication.
Do not stage this file or other coordinator-owned files. No push/deploy/install.
Preserve all previous brief requirements. These findings do not reopen old
milestones or imply an HTTP exploit for direct reducer-only cases.

## 1. Result receipt admission and retained history

**6180c21 recheck:** allowlist, journal detachment, empty-summary compatibility,
and the broad combined overflow now pass. One exact boundary still fails:
summary length 500 plus artifact label length 119 formats to 640 and is valid;
label length 120 formats to 641 and must reject atomically. The mapper rejects
641, but the reducer counts only raw values (620), so accepts it. The updated
coordinator probe verifies both boundaries against `mapTaskFinish` and fails
only the direct reducer 641 case. Include legacy formatting overhead in the
shared admission rule, not merely the sum of field lengths.

Independent `evals/brief-011-coordinator-probe.mts` currently fails new receipt
boundary cases; the original three checks pass. Keep its assertions unchanged.

- **Combined bound:** `validateResultReceipt` currently checks individual
  fields only. A direct reported finish with summary 500 + artifact label 120
  + URI 500 is accepted, whereas the mapper rejects the combined detail over
  640. Apply the same combined-size rule before reducer mutation, preferably
  sharing the formatting/bound logic so it cannot drift. Retain the existing
  valid 596-character case and legacy detail behavior.
- **Unknown fields:** `{artifacts:[{label:'reference',unexpected:'not-allowlisted'}]}`
  passes direct validation and spreads the extra field into the snapshot.
  Reject unknown receipt/artifact keys; clone only allowlisted fields. This
  is a direct-engine finding, not an HTTP injection claim.
- **Aliasing:** `record.events.push(event)` keeps the caller's result object.
  After a valid finish, changing the original artifact label changes the log
  and replay, while the frozen snapshot retains the old label. Journal an
  independent copy of the accepted receipt/event. Check snapshot, log, and
  replay after caller mutation, including nested artifacts.
- **Empty summary compatibility:** the unchanged public input allows
  `summary:''`; the new result schema/validator rejects it. Real HTTP finish
  returns `applied:false` with the new 1–500-character error. Preserve this
  previously valid call without changing the public input signature. Empty
  summary may remain absent/no summary; it must not reject an otherwise
  legal finish. Test the real registered HTTP handler.

## 2. Task-specific view state

`App` reuses unkeyed InlineView/FullscreenView across task IDs. Inline
`showTeam`/`showEvidence` and fullscreen native details remain open on B after
being opened for A. TeamView's motion reset runs in an effect, allowing a
first B render with A's opt-in. Reset synchronously by task identity (for
example key the task-specific mode roots), including disclosure state and
motion. Current controlled motion props bypass the internal reset; remove
unused test-only control or ensure the real controlled lifecycle obeys it.
Verify A team/motion on -> B starts with summary and motion off. Add a
bounded visible harness task-switch control if needed to exercise this in
the same mounted widget; do not fake a real platform claim.

## 3. Every display mode must preserve attention and refresh information

PiP currently renders phase before pending needs and only includes the last
successful refresh time when stale. Put pending needs first and show a compact
successful-refresh line in healthy, stale, unavailable, and terminal views.
Keep last activity distinct. This is required even though PiP is compact.

## 4. Preserve the recorded workflow phase

`phaseLine` currently displays task lifecycle state, so researching,
implementing, and testing all become ACTIVE. After an accepted testing report
and then a generic native event, the default views lose the recorded phase.
Persist optional reported phase metadata on accepted workflow events/snapshots
and show its provenance/time separately from lifecycle status/latest activity.
Do not infer a phase from native activity or free-text summaries. Preserve
replay, dedup, terminal freeze and six public tool input signatures. Older
snapshots without a phase remain readable with phase not provided. Test a
reported phase followed by generic native activity and retained-log trimming.

## 5. Truthful instructions and nonterminal results

- For a `task:reported` pending need, say a **reported question** is waiting
  and direct the user to the **originating chat**, not ambiguously 'the chat'
  in a read-only ChatGPT viewer of a Codex task. Preserve each need's source.
  Nonreported/legacy unknown attribution must not be invented as a question.
  Worker-attributed permissions still point to the Codex permission prompt.
- `ResultBlock` says 'Work is still in progress' for all nonterminal tasks,
  including waiting, blocked, and stale. Use evidence-bounded absence such as
  'No terminal result has been recorded', or hide results until terminal.

Run focused regressions, the updated coordinator probe, and the required full
checks. Existing test adjustments for optional characters must preserve the
truth assertions; a hidden native details section is not visible by default,
so avoid confusing static markup presence with an actual visible avatar.
Return the correction commit separately from the 012 implementation commit.

## Parallel 012 checkpoint

The coordinator independently ran the first nine endpoint tests; all pass.
Endpoint code review found no defect. Add one focused precedence case before
012 final checks: both valid `.mcp.json` and `mcp.json` in the same installed
root, pointing to distinct stub endpoints; only the Legacy endpoint receives
traffic. This distinguishes valid-config priority from the existing invalid-
Legacy no-fallback test. Installer/doctor review remains pending implementation.

Also read `docs/swe-2-brief-012-review-1.md` before final package handoff; it
tracks the independent package review separately from these 011 corrections.
