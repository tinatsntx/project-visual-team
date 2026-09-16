# M4 closeout — accepted on the supported native path

**COMPLETE / GO to private alpha preparation — 2026-09-15 CT.**
Product commit `0f0e3abc48ee7f5ce92153e371dc3308a15e5a8e` is published on
`main` and live on Render. This closes M4 for Windows Codex CLI
`0.154.0-alpha.6.2` plus ChatGPT web. It does not assert other-platform
support, participant feedback, multiuser security, or public release readiness.

## Independent verification

- Typecheck, 199 tests in 43 suites, build, literal widget embedding, and
  native package verification pass. Widget remains 162.7 KB.
- All four prior coordinator probes pass. New routing cases pass 4/4;
  hook-boundary cases pass 3/3. Clean `git archive` source export passes the
  native compatibility verifier, including installed paths containing spaces.
- [Exact-code CI](https://github.com/tinatsntx/project-visual-team/actions/runs/35046625539)
  passed. Render deployment `dep-dakvit740ujc73917cr0` became live at
  `2026-09-16T02:06:24.003328Z`; automatic deployment remains off.
- Supported `codex plugin add visual-team@visual-team-native` refreshed the
  package. Installed hook script matches source by SHA-256. Normal native
  `/hooks` review shows nine installed and nine active hooks; no installed
  cache, trust hash, or global permission-policy edits were used.

## Real acceptance

Full public metadata receipts: `docs/m4-native-host-evidence.json`.
The [ChatGPT board](https://chatgpt.com/c/6aa9fa96-db40-83ea-9129-2334afd9aef5)
mounted task `vt_f7f3a6406ac1e3cc127fdd44` once. It then updated from real
native events without another ChatGPT render call:

1. A real native start-tool receipt bound session A; its native date read
   appeared as observed PreToolUse/PostToolUse evidence.
2. Resuming the same native session retained routing. A real subagent
   (`01a0a7fe-137a-7aa3-8bac-c0745180ddea`) appeared as a non-writer specialist.
3. A process-local read-only/on-request native session displayed an actual
   permission prompt for one harmless date read. The widget showed
   `WAITING_FOR_USER`, Nova waiting for approval, and a direction to answer
   the **Codex** permission prompt. It exposed no approval control.
4. The coordinator selected native **Yes, proceed** for that one action,
   without a persistent command rule. The real PostToolUse cleared that
   specialist's ask; real SubagentStop completed Nova with observed
   provenance. Real Stop left Alex IDLE and the overall task ACTIVE.
5. A separate native task B stayed at eventCount 12. A separately created
   ChatGPT-only task C stayed PLANNING at eventCount 1 with no observed
   events. A's specialist and permission events did not enter either board.
6. A native turn was interrupted through Escape after a harmless wait call
   had returned. The widget received observed `interrupted` and remained
   resumable. This is not a claim that an in-flight command was cancelled.
7. The same task resumed, performed another real date read, and was
   truthfully finished by the native model. The mounted widget reached
   COMPLETED at eventCount 25 with reported task completion and retained
   observed specialist evidence. No completion was inferred from animation.
8. A separate process launched with `--disable hooks` completed the normal
   start/render/report/work/finish/render workflow and gave a useful text
   answer. Its final task had exactly three events, all reported, one lead,
   and no invented specialist or observed hook.

No manual hook invocation or hand-written `record_codex_event` call was
used for these live acceptance actions. Local synthetic probes remain
separately labeled. Private capabilities were excluded from captured evidence.

## Limits and next work

All four M4 exit criteria are met. Hosted-tool blind spots remain disclosed
in the skill and UI; supported generic native tool metadata does not prove
an unseen hosted search. Concurrent-session routing replaces M2's temporary
one-active-task restriction; explicit skill invocation remains required.

Headless process A's initial exit did not deliver a visible Stop before
shutdown; the interactive run subsequently demonstrated real Stop. Hosts
that end before asynchronous delivery completes can lose their last hook;
missing evidence must remain limited visibility, not a fabricated finish.
In-memory tasks and bindings still disappear on restart/expiry, and
correlation identifiers are not authentication credentials.

The bounded Render application-log review covered 02:06:24–02:21:02 UTC,
all nine returned records, with `hasMore: false`. Only Render lifecycle and
port messages appeared. This is bounded evidence, not a blanket privacy claim.

SWE-2 is executing `docs/swe-2-brief-010.md` for release preparation. The
private-alpha protocol is prepared in `docs/private-alpha-test-kit.md`;
real participant results are still required. Final name, identity/domain,
legal materials, and public submission remain explicit release gates.
