# MEMORY.md
> AI operational mistakes log (แยกจาก CAPTURE_LOG.md = human strategic)

- 2026-10-15 — Gave Tony a "deploy" block whose push silently didn't happen; he then tested the old build. → Before reading any test result, confirm the build is live (origin/main + poll live page for APP_VERSION).
- 2026-10-15 — PowerShell blocks broke 5 times (no `& { }`, Thai output shown as boxes, clipboard overwritten, `Var` reserved word, `$r`/`$R` same variable). → AI_LOCK §6 "PowerShell blocks"; run every block in pwsh against a local harness before sending — a parser check is not enough.
- 2026-10-15 — Told Tony to revoke the bot token without putting "update the prod Worker secret immediately" in the same step → Telegram was down for every branch in between. → Credential rotation = one block: revoke → new secret → verify.

- 2026-10-16 — A Worker probe used `Invoke-WebRequest -Form`: PowerShell writes multipart with unquoted names (`name=orderId`) + a quoted boundary; the harness parser rejected it (`bad-multipart`) → the block would have rolled back a healthy Worker. Found by the local harness before sending. → multipart from PowerShell = `curl.exe -F`; probes must speak the same wire format as the real client (browser FormData).
