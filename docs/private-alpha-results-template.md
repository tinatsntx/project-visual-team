# Private-alpha results template — blank

This template is intentionally blank. It records M5 observations without
claiming participant acceptance. Use anonymous identifiers only and retain no
personal chat content, credentials, work files, or recordings without separate
consent.

## Run metadata

| Field | Value |
|---|---|
| Study coordinator | |
| Product code SHA | |
| Widget/package version | |
| MCP endpoint revision | |
| Native Codex version | |
| ChatGPT surface and browser/device | |
| Study dates | |
| Declared supported limitations | |

## Participant and setup log

| Tester | Category | Assigned order | Node prerequisite | Codex prerequisite | Endpoint reachable | ChatGPT registration | Prerequisite minutes | Install/configuration minutes | Assistance level | Outcome | Non-sensitive obstacle/recovery |
|---|---|---|---|---|---|---|---:|---:|---|---|---|
| T01 | | board first | | | | | | | | | |
| T02 | | native first | | | | | | | | | |
| T03 | | board first | | | | | | | | | |
| T04 | | native first | | | | | | | | | |
| T05 | | board first | | | | | | | | | |

Assistance level: `none`, `written instruction only`, `coordinator verbal guidance`,
`coordinator operating controls`, or `abandoned`. Report guided and unassisted
setup outcomes separately.

## Timed comprehension observations

Create one row for every attempted observation. Do not omit errors, timeouts,
or missing trials.

| Tester | Pair/fixture | Arm | Case | Real hooks or reported fallback | Expected goal/owner/status/action | Goal correct | Owner correct | Status correct | Action/location correct | Core status/action correct | Time ms | Within 10 sec | Error or missing reason | Board mistaken for proof | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---:|---|---|---|---|---|
| T01 | | board/native | | | | | | | | | | | | | |
| T02 | | board/native | | | | | | | | | | | | | |
| T03 | | board/native | | | | | | | | | | | | | |
| T04 | | board/native | | | | | | | | | | | | | |
| T05 | | board/native | | | | | | | | | | | | | |

`Core status/action correct` is `yes` only when both fields are correct.
`Within 10 sec` is `no` for a correct answer after 10 seconds. Pair only
matched board/native trials with the same fixture and expected answer.

## Participant comprehension and time roll-up

| Tester | Permission core status/action within 10 sec | Reported-question core status/action within 10 sec | Reported-finish core status/action within 10 sec | Stale/unavailable core status/action within 10 sec | Participant comprehension pass | Valid matched board/native core-status/action pairs | Time coverage status |
|---|---|---|---|---|---|---:|---|
| T01 | | | | | | | |
| T02 | | | | | | | |
| T03 | | | | | | | |
| T04 | | | | | | | |
| T05 | | | | | | | |

A participant comprehension pass requires `yes` in all four required board
observations. Time coverage is `complete` only with at least one valid matched
pair; otherwise use `missing` or `invalid` and state the reason in the trial
log.

## Preference, repeat use, and accessibility

| Tester | Future multi-step preference | Reason | Follow-up date (2–7 days) | Voluntarily chose board before coaching | Follow-up status/reason | Keyboard | Reduced motion | Enlarged text | Screen reader/device | Blocked control or finding |
|---|---|---|---|---|---|---|---|---|---|---|
| T01 | | | | | | | | | | |
| T02 | | | | | | | | | | |
| T03 | | | | | | | | | | |
| T04 | | | | | | | | | | |
| T05 | | | | | | | | | | |

## Acceptance calculation

| Measure | Numerator/denominator | Raw evidence | Result |
|---|---|---|---|
| Required board status/action observations within 10 seconds (>= 4/5 participants) | | pending permission: ; reported question: ; reported finish: ; stale/unavailable: | pending |
| Visual-summary preference for future multi-step work (>= 4/5) | | | pending |
| Valid paired core-status/action median improvement, board vs native (>= 20%) | | board median: ; native median: ; valid-pair coverage T01–T05: ; excluded pairs: | pending |
| Voluntary board choice at 2–7-day follow-up (>= 3/5) | | | pending |
| No animation/reported-finish false-proof inference (0 cases) | | | pending |
| Solo routing (>= 9/10 declared cases) | | | pending |
| Deployed log audit: no sensitive sentinel payload | | revision/window: | pending |

For median improvement, use only valid matched board/native pairs in which
both arms correctly identify core status/action. Calculate `(native median -
board median) / native median`. Each participant must contribute at least one
valid pair. If there are no valid pairs, any participant has no valid pair, or
the native median is at or below zero, report `invalid`; do not call it a pass.
List every excluded pair and reason above.
