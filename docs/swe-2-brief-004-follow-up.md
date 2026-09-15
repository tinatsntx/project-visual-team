# SWE-2 brief 004 follow-up — close reproduced recovery gaps

**Historical brief, resolved by d39e5e3 on the bounded acceptance paths.**
See `docs/brief-004-acceptance.md`; new CI/resource findings are brief 005.

Coordinator review: 2026-09-14. Candidate:
`0e9bcc34d8917254808d26a6abe8568d0195b99b`.
**Held before push/deployment.** Continue the original brief's bounded scope.
Codex coordinates acceptance; SWE-2 owns these product fixes.

## Verified baseline

Coordinator independently reran typecheck, 54/54 tests, configured-tree
compatibility/Windows launch verification, build, and whitespace checks: pass.
Clean committed-source export compatibility verification also passes. Widget
158.7 KB, dev host 462.2 KB, CSS 3.6 KB. These checks do not cover the failures below.

In the rebuilt local browser harness, initialized-gated delivery renders the
board. With `?delivery=never`, the initial waiting screen reaches the unavailable
state with Try again, Ask ChatGPT to render it again, and static guidance.
This verifies local behavior, not the cause or resolution of the ChatGPT hang.

Run the synthetic diagnostic from the repo root:

```powershell
node --import tsx evals/brief-004-coordinator-probe.mts
```

[Probe source](../evals/brief-004-coordinator-probe.mts) imports the actual bridge
and store. It uses stubbed timers/window and synthetic metadata, makes no network
calls, and prints no capabilities. It prints observed outcomes; exit 0 only means
the diagnostic executed. Convert the expected behaviors below into regression
assertions rather than treating this diagnostic as a passing test suite.

## 1. Preserve correlated bootstrap data across late subscription (P1)

`HostBridge.deliverToolResult()` replaces `latestToolResult` on every delivery.
Starting the listener before React is insufficient when both split parts arrive
before React subscribes and reads the cache:

- Private metadata, then public snapshot: late mount is ready but has no capability.
- Public snapshot, then private-only globals: late mount has no task and stays
  loading, despite both parts having arrived.

The probe completes the initialize handshake before these deliveries. Existing
store-only split tests bypass this bridge-cache gap. Preserve enough bounded,
task-correlated bootstrap state, or ingest into the store before React subscribes.
Keep private metadata private; never merge credentials across tasks.

Also cover partial host globals across task changes. `toolResultFromGlobals()`
unconditionally favors a metadata envelope's structured content. A new public
task B paired with the previously cached task A envelope selects A. Simply
reversing precedence is insufficient: the opposite delivery order also needs
coverage. Respect which field actually arrived and reject mismatched credentials;
do not assume all current globals belong to one render. If a delivery lacks
enough identity to correlate safely, show limited refresh until it can be bound.

Acceptance: both supported split orders before and after subscription retain the
correct snapshot and its own capability; mixed A/B globals cannot restore A as
the current task or bind A's capability to B. Include an actual HostBridge-to-store
test, not only separate `applyToolResult()` calls.

## 2. Preserve truthful confirmation time and terminal refresh state (P1/P2)

`retry()` replays `currentToolResult()` through `applyToolResult()`, which sets
`lastUpdatedAt` to now even for the same cached render. Every read can fail while
Try again claims the data was just confirmed.

Browser reproduction: serve the rebuilt harness, open
`/dev.html?delivery=initialized&read=reject`, wait for the stale banner, then click
Try again. The coordinator observed the last-confirmed time advance from
**6:07:41 PM to 6:07:56 PM America/Chicago**, while the host log contained only
rejected reads and the displayed snapshot was unchanged. The synthetic probe
reproduces the same issue with deterministic times.

Distinguish replaying cached data from receiving a successful fresh read or a
new validated host delivery. Cached replay must not advance confirmation time.
A successful fresh read of unchanged data does confirm freshness and should
advance it; do not fix this by ignoring all equal snapshots.

The probe also starts a read while ACTIVE, applies a newer COMPLETED host
notification, then resolves the earlier read with `isError`. The terminal task
ends with `refresh=stale` instead of `off`. Guard late errors as well as data
against superseding terminal transitions; preserve single-flight behavior.

Acceptance: failed retry keeps the previous timestamp; successful recovery
updates it and returns to live; a late error cannot relabel a terminal task as
stale or restart its polling. Apply the same guarantee to rejected promises.

## 3. Reset task-scoped data on a task switch (P1)

`applyToolResult()` clears the old capability on a new task but retains old
`recentEvents` when the new result omits them. The probe applies task A with
event A, then a partial task B snapshot: the resulting B view contains A's event.
This is a reproduced partial-delivery fault, not a claim that the server's normal
full render result omits events.

Reset the old task's event list and task-scoped refresh/recovery state when
identity changes. Correlate partial data to the new identity; never show another
task's events or inherit its credential. Audit pending private metadata under
the same rule without printing or persisting tokens.

Acceptance: A-to-B transitions, including partial B data and late A reads,
cannot mix task data. Fresh B data remains usable as it arrives.

## 4. Complete recovery controls and same-view harness evidence (P2)

The stale banner currently shows only Try again: `RefreshNotice` gates the
ask-render action on `kind === "unavailable"`. This was confirmed in the browser.
A task whose private reads keep failing has no route to the existing documented
render recovery action or its static fallback. Make that recovery reachable
from stale states too; preserve truthful sent/rejected handling.

Source inspection also shows refresh health is not passed to the task views;
active robot animation defaults remain enabled. Ensure last-known working or
planning data does not animate as current activity while refresh is stale or
unavailable. This animation concern is source-derived, not a recorded browser
failure with a working worker. Verify it using such a fixture.

The harness's read failure modes are fixed at page load. Add a small control to
change read behavior from reject/drop to success without recreating the iframe.
Demonstrate stale -> successful retry -> live in the same widget, plus a rejected
ask-render request with useful guidance. Label all harness evidence synthetic.

## Boundaries, references, and return

Preserve private `_meta`, bridge-only CSP, metadata-only telemetry, provenance,
append-only hooks, the small contracts import, terminal polling, and independent
display-mode updates. No Sites/account work, hook repackaging, new lifecycle API,
tool-annotation changes, PiP enablement, or unrelated hygiene. Preserve coordinator
config and evidence; do not rewrite this review to claim acceptance.

Current official references checked by the coordinator:
[Apps SDK UI](https://developers.openai.com/apps-sdk/build/chatgpt-ui) and
[Apps SDK reference](https://developers.openai.com/apps-sdk/reference).
Keep full-envelope private metadata handling and documented host messaging.
Local ordering probes do not establish how the real ChatGPT host delivered the
earlier failing render.

Return the new SHA, changed files, before/after regressions, local browser
evidence, required checks, clean-source/configured compatibility results, and
bundle sizes. Report anything not exercised honestly.

After the follow-up passes review, Codex will publish/deploy the accepted code
to the existing Render service and refresh the development app. Acceptance stays:
fresh task through Codex -> read-only ChatGPT render with CSP on -> one automatic
native hook event observed in the same mounted widget -> truthful read recovery.
The earlier automatic native-to-Render backend pass remains valid; same-widget
observation and the remaining M0 gates remain open. Sites stays paused.
