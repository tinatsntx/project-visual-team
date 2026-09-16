# Roadmap

Milestone status as of 2026-09-15. `PROJECT_PLAN.md` is the controlling
specification; this file is a status map, not a plan. "Accepted" means the
coordinator's acceptance evidence exists in `docs/`; nothing here claims
public-release clearance.

| Milestone | Scope | Status |
| --- | --- | --- |
| M0 — Platform feasibility | ChatGPT web + Windows Codex CLI + hosted MCP spike | **Accepted** — `docs/m0-enablement-acceptance.md` |
| M1 — Core state engine | Deterministic reducer, provenance guards, dedup, replay fixtures | **Accepted** — `docs/m1-core-engine-acceptance.md` |
| M2 — Consumer workflow | `$visual-team` skill, reported boundaries, finish detail, PiP on tested path | **Accepted** — `docs/m2-consumer-workflow-acceptance.md` |
| M3 — Visual experience | Status clarity, results, accessibility, responsive layouts | **Accepted** — `docs/m3-visual-experience-acceptance.md` |
| M4 — Codex integration | Session/agent correlation, record-only lifecycle hooks | **Accepted** — `docs/m4-codex-integration-acceptance.md` + real native/ChatGPT evidence in `docs/m4-native-closeout.md` |
| M5 — Private alpha | Real-participant comprehension/preference/accessibility evaluation | **Prepared, not executed** — kit at `docs/private-alpha-test-kit.md`; no participant data exists |
| M6 — Open-source release | Repository quality: docs, demo, issues, security policy | **In preparation** — see `docs/release-readiness.md` |
| M7 — Public submission | Name, identity, domain, HTTPS endpoint, Inspector, review | **Pending** — no cleared name, widget domain, authentication, or submission yet |

## Near-term honest gaps

- Real participant feedback — M5 cannot be approximated synthetically.
- Public identity: name clearance, logo finalization, verified developer
  identity, public website, privacy policy, terms — all owner decisions.
- Production HTTPS endpoint, MCP Inspector pass, and plugin review.
