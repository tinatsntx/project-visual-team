# SWE-2 brief 010 — release preparation after M4 review

**Accepted at `9c8e825` — technical preparation complete.** Handed directly to
SWE-2 through Devin after M4 review; see `release-preparation-closeout.md`
for commits, review corrections, real evidence, and remaining owner gates.
This does not claim participant acceptance or public-release clearance.

## Outcome

A contributor can run the accepted software from a clean checkout, replay
a labeled synthetic example without a host account, and understand the
actual security, privacy, support, and installation limits. Release records
must describe what exists, with remaining human/owner gates explicit.

## Bounded work

1. Refresh README, architecture, privacy, threat model, contribution guide,
   changelog, and roadmap against the final accepted M4 implementation.
   Remove stale four-tool/skill-stub/PiP-disabled/global-routing claims.
   Describe the six tools, native session correlation, optional hooks,
   one-writer policy, private read capability, live/stale/unavailable states,
   terminal freeze, and in-memory retention precisely. Distinguish transport
   statelessness from application state. State every actual local/remote
   metadata store and restart/expiry consequence. Do not claim that opaque
   task/session identifiers authenticate writers or provide user isolation.
2. Document clean local setup, Windows native installation/trust, ChatGPT
   developer-app refresh, and self-hosting. Preserve the tested hosted
   configuration while showing an explicit local/self-host override; do not
   silently rewrite committed config. Include build/start/health commands,
   TTL configuration, HTTPS requirement, and current Sites-owner limitation
   as a dated observation rather than a universal plan claim. Explain that
   each in-memory deployment instance holds its own tasks and loses them on
   restart. Do not add a database, accounts, hosting provider, or framework.
3. Add a small documented replay command using the real engine and an
   existing synthetic fixture. It must work without ChatGPT/Codex/network,
   display provenance plus terminal/evidence summary, and give an actionable
   error for invalid fixture input. Reuse engine semantics; no second reducer
   or hard-coded final board. Test only meaningful input/engine boundaries.
4. Complete repository hygiene required by the plan: a useful lint command
   and CI check if absent; maintain existing typecheck/test/build/package
   checks; actionable issue templates. Prepare at least five bounded good
   first issue drafts with reproduction/context, file pointers, scope, and
   acceptance criteria. Do not open GitHub issues or publish a release.
5. Prepare a short, labeled synthetic demo script and five positive/three
   negative submission cases using the actual workflow. Reuse existing eval
   cases where accurate. List exact tool annotations/CSP/resource domains,
   starter prompts, screenshot needs, and release notes. Do not invent final
   branding, identity/domain verification, reviewer credentials, legal
   acceptance, private-alpha feedback, or Inspector results.
6. Security reporting: the coordinator enabled and read back GitHub private
   vulnerability reporting on 2026-09-15 CT. Link SECURITY.md to
   https://github.com/tinatsntx/project-visual-team/security/advisories/new
   for vulnerability reports. Do not invent a personal email or a response
   SLA the owner has not committed to. Keep any separate conduct/support
   contact requirement visibly pending if no verified route exists.

## Scope and evidence

- `docs/private-alpha-test-kit.md` already exists. Improve references as
  needed, but leave all human measures unfilled. M5 needs real participants.
- Do not change engine/hook/server behavior under a documentation brief.
  Report any concrete issue requiring product code separately.
- Preserve coordinator-owned milestone acceptance evidence; put this work
  in `docs/release-readiness.md` with complete/prepared/pending distinctions.
- Verify documented setup and offline replay from a clean committed-source
  export, not only the configured working tree. Label it as a clean export
  rather than claiming a remote clone if the commits are not pushed yet.
- Run lint, typecheck, tests, build, native compat verification, and existing
  coordinator probes. Record exact commands and counts. No invented demos.
- Commit locally and return the SHA, changed behavior/materials, checks, and
  precise remaining gates. Do not push, deploy, tag, submit, buy a domain, or
  contact testers. Coordinator will verify, capture the actual demo, publish
  reviewed materials, and handle real-host acceptance and owner decisions.
