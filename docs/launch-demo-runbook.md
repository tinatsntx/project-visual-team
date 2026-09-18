# Current real-host launch demo

Prepared 2026-09-17. This is a recording plan, not evidence of execution.

## Capture boundaries

Record a fresh disposable solo Visual Team task on the real installed plugin.
Show the same ChatGPT widget progressing through activity, an actual native
approval need, resumed work, and the reported result. Keep the framing on
that widget so unrelated conversations, account details and task capabilities
are not recorded. A native prompt can be shown only after checking its frame
for private content. Never inject events or manually execute a hook.

Keep genuine event timestamps and evidence labels readable. Edit for length
with visible cuts; do not imply that cuts represent continuous execution.
Use captions and 60–90 seconds total. The old synthetic slideshow is not a
substitute. Save raw capture privately under ignored `dist/launch-recording/`;
publish only the reviewed video and approved gallery frames.

## Environment check

The September 16 accepted native runtime was 0.154.0-alpha.6.2. On September
17 the desktop-bundled executable reports **0.155.0-alpha.2.6**. Its real-hook
and approval behavior needs a fresh observation before it can be used in the
demo. The older acceptance remains valid only for its named runtime.

The coordinator task currently has approval policy `never`. A real approval
must occur in a separate user-visible session with normal on-request policy.
Do not fabricate an approval state or weaken hook trust to obtain footage.
The owner performs the approval; no persistent allow rule is added.

## Three native turns

First turn (paste into the prepared native session):

> Use $visual-team for a bounded real-host launch demonstration, solo only.
> Read the installed skill and required repository instructions. Create one
> fresh task titled Launch demonstration with a brief metadata-only summary.
> Render it once, report the genuine testing phase, and run exactly one
> harmless native shell action: Get-Date -Format o. Do not edit files,
> delegate, call record_codex_event, manually execute a hook, or finish the
> visual task. Return the taskId and pause. Keep capabilities private.

Mount that returned task in ChatGPT with the installed developer app. Render
it once, then keep the same widget mounted throughout the recording.

Second turn (replace TASK_ID with the actual first-turn receipt):

> Continue unfinished task TASK_ID. Report the genuine testing phase and
> request one-action native approval for exactly Get-Date -Format o through
> the normal on-request flow. Explain that this harmless action tests the
> permission display. Do not add a persistent allow rule. Wait at the actual
> prompt. After the owner approves, run that one command and pause. Do not
> finish, edit files, delegate, create another task, inject events, or manually
> run a hook.

Capture the attributed approval need before the owner approves once. Capture
the same widget after real work resumes. Do not use a reported question as a
stand-in for a native permission event.

Third turn, only after both actions really pass:

> Finish TASK_ID using finish_visual_task with outcome completed, summary
> "Two harmless native read checks completed; the second used one-action
> approval.", verification passed, and artifact label "Acceptance record"
> with URI https://github.com/tinatsntx/project-visual-team/blob/main/docs/attention-alpha-acceptance.md.
> The passed label refers only to the two native checks, not independent
> proof of product correctness. Run no more shell actions and do not re-render,
> edit files, create tasks, delegate, inject events, or manually execute a hook.

## Caption outline

1. “What needs your attention while Codex works?”
2. “Real native activity, with evidence source and time.”
3. “An approval is needed. The decision stays in Codex.”
4. “After one-time approval, recorded work resumes.”
5. “The agent reports its result and its checks. Reported is labelled.”
6. “Try the sample instantly. Run the open-source alpha yourself.”

## Evidence to retain after capture

Record date, product revision, actual runtime, taskId, public event counts,
the two command exit results, media paths and hashes. Do not copy private
capabilities or full native transcripts into the public record. Record any
missing hook honestly; a missing native permission event blocks that claim.
