# CLAUDE.md — puffstick-order

Claude Code specifics:
- A **SessionEnd hook auto-captures** this session to Context Hub at the end.
  -> In Claude Code, only **retrieve** from Context Hub at the start of work.
  Do NOT manually capture — the hook handles it.
- **Live, revenue-critical, branch-facing** order app (NOT the factory production
  app). Production discipline on every change: branches use the same link, Tony is
  the only one who should see errors, and admin/dispatch changes must not break the
  branch-side ordering path.

Full project rules, stack, code standards, and the Context Hub protocol:

@AGENTS.md
