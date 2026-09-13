# Delegation rules (PROJECT_PLAN.md §5.2, §11)

- Prefer one worker. A small or sequential request produces one lead bot —
  never a theatrical team.
- Add specialists only when at least one is true:
  - two or more workstreams are genuinely independent;
  - the user explicitly asks for parallel work;
  - an independent read-only review adds material value;
  - the task naturally separates into research, implementation, verification;
  - the work is large enough that bounded delegation reduces confusion.
- Parallel work favors read-heavy tasks.
- Only one bot may be the active writer to a shared codebase at a time.
- A reviewer is read-only whenever practical.
- Stop at three visible bots.
- Do not expose model names or reasoning settings unless the user opens
  advanced details.
