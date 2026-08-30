# Session Briefing — PuffStick Order App

> **วิธีใช้:** Copy ทั้งไฟล์นี้ → Paste เป็น message แรกของ chat ใหม่
> **อัพเดท:** หลังจบ session สำคัญ — แก้ "ตอนนี้กำลังทำ" + "Status ล่าสุด"

---

## Persona Loading

โหลด Nova persona จาก userPreferences + Builder Codex ที่ upload ไว้ใน project

## Project Context

**App:** PuffStick FC Order System
**Repo:** https://github.com/maya4artdev/puffstick-order
**Live:** https://maya4artdev.github.io/puffstick-order/
**Stack:** Single-file HTML/JS + Firebase RTDB + Cloudflare Worker
**Active branches:** ~30 สาขา
**Codebase:** Vanilla JS, var only, function(){}, string concat, no template literals

## Architecture (ตอนนี้)

```
[Branch confirms order]
       ↓
   Firebase RTDB (notified=false)
       ↓
   ┌── Layer 1: Branch sends Telegram (instant 3-5s)
   │      └─ PATCH notified=true
   │
   ├── Layer 2: Cloudflare Worker (cron * * * * *)
   │      └─ Picks up notified=false → sends → marks notified=true
   │
   └── Layer 3: Admin manual "🔁 ส่งแจ้งเตือนเดี๋ยวนี้" button
```

**Firebase:**
- URL: `https://puff-stick-fc-order-default-rtdb.asia-southeast1.firebasedatabase.app`
- Path: `puffstick/`
- Rules: whitelist `puffstick/` + `productions/` + `lot_counters/`

**Telegram Bot:**
- Bot ID: `8751318167`
- Chat ID: `5566010745`
- Active token starts: `AAEKTOh...`

**Cloudflare Worker:**
- Name: `puffstick-telegram-notifier`
- Cron: `* * * * *` (every minute)
- Secrets set: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, FIREBASE_URL, FIREBASE_PATH

## Current Version

- **App:** v3.5.0 (build 2026.06.18-restore)
- **Builder Codex:** v1.0 (P-01 to P-22 + Compounding Loop)

## Status ล่าสุด (อัพเดท: 2026-06-18)

✅ **เสถียร / Production Ready:**
- Branch-side Telegram (v3.5.0 restore architecture)
- Cloudflare Worker failsafe
- Branch Health telemetry
- Global error handler
- Backlog recovery tools (24/48/168 hr)
- localStorage auto-cleanup
- Verified writes (lsSet returns boolean)

⏳ **กำลัง monitor:**
- รอดู production จริง 1-2 สัปดาห์ — ถ้าไม่มี issue = Phase 1 จบ

📋 **TODO ถัดไป:**
- [ ] Production App development (separate chat)
- [ ] Apply patterns ไป POS v9 (P-01, P-02, P-14, P-16)
- [ ] PIKA + Pippa ใช้ Codex ตั้งแต่ day 1

## ตอนนี้กำลังทำ

[เปลี่ยนตามจริงทุก session — เช่น:]
- Build production tracking app from scratch
- หรือ: Fix bug X ใน Order app
- หรือ: Start Pippa commercial rebuild

## ที่อยากให้ทำใน session นี้

[ระบุงานที่ต้องการให้ Claude ทำ]

---

## Rules ที่ต้อง enforce (จาก Builder Codex)

- **P-01:** r.ok check ทุก push
- **P-02:** Mark & Retry pattern ทุก sync
- **P-03:** Visible state ทุก async
- **P-08:** Version + no-cache + auto-update
- **P-14:** Health ping + error report telemetry
- **P-17:** Element refs null-safe
- **P-21:** Don't over-architect — restore before redesign
- **P-22:** Defense in depth สำหรับ critical ops

Code rules:
- `var` only, `function(){}`, string concat
- No nested template literals ใน render functions
- `data-id` pattern สำหรับ onclick
- `lsSet` returns boolean — call sites check
- ZERO duplicate logic — extend, don't parallel

---

🛠️ พร้อมเริ่มงานต่อ
