VISUAL TEAM — PRIVATE ALPHA (Windows + Codex CLI)
=================================================

A truthful status board for a running task: what needs you, what is
happening, what was delivered — with provenance on every claim. This is a
guided alpha: one participant at a time, disposable tasks, and a
coordinator-prepared setup.

PREREQUISITES
-------------
- Codex CLI 0.154.0-alpha.6.2 (the tested runtime — newer/other versions
  are not claimed to work; the installer checks and stops on anything else)
- Node 20.19+, 22.13+, or 24+ on PATH (the record hook runs under it)
- The coordinator must have already registered/attached the ChatGPT
  developer app for you — this package does not register testers.

TRY IT
------
1. Extract this folder somewhere stable and keep it — the plugin's
   marketplace source is local, so the folder must remain after install.
   Example:  C:\alpha\visual-team-alpha\
2. Open PowerShell in the extracted folder.
3. Run:
     powershell -NoProfile -ExecutionPolicy Bypass -File .\install.ps1
   If codex is not on PATH (or more than one is), pass it explicitly:
     .\install.ps1 -CodexPath "C:\full\path\to\codex.exe"
4. In Codex, open /hooks and review + trust the nine record_codex_event
   entries. The installer never does this for you.
5. Start a task with an explicit $visual-team invocation.

VERIFY
------
  powershell -NoProfile -ExecutionPolicy Bypass -File .\doctor.ps1
Doctor is read-only: it checks the package, Node, the endpoint, service
health, CLI version, and marketplace/plugin state. Passing checks mean the
setup is configured and healthy — real hook delivery is proven only by a
real task after /hooks trust.

RECOVER
-------
- Re-running install.ps1 is safe: an identical install is a no-op.
- If install stops with a FAIL line, follow the "->" remediation lines.
- To remove: disable/uninstall the plugin in Codex, then remove the
  marketplace registration. This package never removes anything itself.
- If the service health check fails repeatedly, report it to the
  coordinator — the alpha service is single-user and ephemeral; restarts
  drop all recorded task state.

SCOPE
-----
- No accounts, no authentication, no database, no public listing.
- The service is ephemeral: tasks vanish on restart/TTL by design.
- Nothing here approves, denies, rewrites, or blocks a Codex action — the
  hook is record-only and cannot affect your work.
