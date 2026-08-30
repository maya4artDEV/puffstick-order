# AGENTS.md — puffstick-order

> Canonical agent instructions for this repo. `CLAUDE.md` imports this file.
> ⚠️ This is the **live, revenue-critical, branch-facing** app. A mistake here
> blocks a real franchise branch from ordering. Treat every change as production.
> ⚠️ Version-specific facts below (v3.5.0, Telegram) are from prior context —
> confirm they're still current before relying on them; the architecture is stable.

## Project
Branch-facing **franchise ordering** PWA for PuffStick FC branches. Single-file
**vanilla HTML/JS**, **Firebase** backend, **Telegram** branch notifications,
hosted on **GitHub Pages** (`maya4artdev.github.io/puffstick-order/`, repo
`maya4artDEV/puffstick-order`). Serves ~20-30 franchise branches — Tony's primary
revenue-generating business. **Distinct from `puffstick-production`** (that one is
internal factory software; this one is what branches use to order).
Current stable line: **v3.5.0** (branch-side Telegram architecture, restored after
the v3.3.x admin-dispatcher regression).

## Golden rules — do not break
1. **Branches always use the SAME link.** Never change the branch-facing URL or make
   a branch re-bookmark / re-learn anything.
2. **Tony is the only one who should know about problems.** Fail safe, degrade
   gracefully — never surface a raw error, crash, or blank screen to a branch.
3. **No risky migrations** (Supabase, backend swaps, schema rewrites). Off-limits —
   live operational risk.
4. **Admin / dispatch features = extreme caution.** History: an admin-side
   notification dispatcher cascaded into a null-pointer crash that blocked a live
   branch for *hours* before rollback to v3.5.0. Any admin/notify/dispatch change
   must be proven not to break the branch-side ordering path first.

## Keep-alive / telemetry (already in place — preserve)
- Branch health pings every 5 min -> the branch status dashboard.
- Cloudflare Worker **cron failsafe** for 24/7 operation.
- JS error viewer. Don't remove or bypass these when editing.

## Code rules (vanilla HTML/JS + Firebase)
- `render:` `function(){}` + string concatenation only. **Never nested backtick
  template literals.**
- `onclick:` `data-id` + event delegation. **Never inline string escaping.**
- `localStorage:` quota-check + fallback before `setItem`.
- **Firebase write:** never without an error handler.
- **ZERO duplicate logic.** One single source of truth per feature. Extend, never
  parallel.
- Before coding: identify the affected function -> state the single source of truth
  -> list side effects -> **ask if scope is unclear.**
- On "review first" / "refactor": find duplicates -> propose the single source of
  truth -> show a diff -> **never silently rewrite unrelated sections.**

## Build discipline
- **Brainstorm before building** any feature.
- Use the **hard-task protocol** for multi-step or shared-state work.
- Run the **concurrency / hidden-bug review** before touching Firebase writes,
  counters, or order-ID generation (multi-branch = concurrent writes).
- **Verify at the write-site before claiming done.** Never trust "done",
  `tsc passed`, or a change summary — confirm the branch-side order path still works.
- Sandbox with deny-list: `rm`, `git push`, `firebase`, `npm install`,
  `npm publish`, `git reset`. Deploys need Tony's explicit go-ahead.
- Run to completion autonomously, then review against the Brief/goal.

## Context Hub (shared memory) — retrieve first
Backend: `https://context-hub.92foodlimited.workers.dev` (see `CONTEXT-HUB.md`).
- **At the START of work,** retrieve prior context:
  `GET /retrieve?q=<topic>&project=puffstick-order&topK=5`
  Header: `Authorization: Bearer $HUB_TOKEN` (token is in the environment).
- **Claude Code** auto-captures at session end via a SessionEnd hook -> in Claude
  Code, only retrieve; do not double-capture.
- **Other agents:** on a durable decision/learning, `POST /capture` with body
  `{"project":"puffstick-order","content":"<decision>","tags":["decision"],"source":"agent"}`
  and `Content-Type: application/json; charset=utf-8`.
- Never print/echo `HUB_TOKEN`. Never capture secrets, tokens, or full file dumps.

## Compounding loop
Keep `CAPTURE_LOG.md` (human strategic) and `MEMORY.md` (AI operational) separate.
This repo also carries `AI_LOCK.md` and `BUILDER_CODEX.md` — respect them.
Do -> Capture -> Upgrade.
