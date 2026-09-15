# M2-NEG-02 — Unsupported visibility (plan §15 negative 2)

**Host execution:** coordinator-run (hosted web search is invisible to the
Codex hook). Server-side: `unsupported-inputs-create-nothing` in
`evals/m2-consumer-workflow-probe.mts` proves unknown/invalid events and
task ids fabricate nothing.

## Setup

A hosted ChatGPT surface where the hook cannot observe the hosted tool
(e.g. built-in web search), plus one task that legitimately uses it.

## User request

> "Use Visual Team to research X" — where the answer needs hosted web
> search that produces no hook event.

## Expected mode/work sequence

The work runs natively. The board shows only real evidence: reported phase
boundaries and whatever the hook did observe. It does **not** claim specific
unobserved actions ("searched for X", "opened page Y"). A "limited activity
visibility" note is acceptable and preferred over invented detail.

## User-visible outcome

Honest board: real reported boundaries, real observed events where they
exist, and a stated visibility limitation — never a fabricated action log.

## Pass criterion

No visible state claims an action the host never produced. FAIL on any
fabricated search/browse step, invented `record_codex_event`, or an
unexplained silent board presented as live tracking.
