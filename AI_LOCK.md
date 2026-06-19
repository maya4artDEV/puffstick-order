# AI_LOCK.md — PuffStick FC Order System
> Version: 1.0 | Last updated: 2026-06-19
> อ่านไฟล์นี้ก่อนแตะโค้ดทุกครั้ง — ไม่มีข้อยกเว้น

---

## ⚠️ HARD RULES (ละเมิดไม่ได้)

### JavaScript
- ใช้ `var` เท่านั้น — ห้าม `let`, `const`
- ใช้ `function(){}` — ห้าม arrow functions ใน render-heavy code
- String concat เท่านั้น — ห้าม nested template literals (เคย CRASH production)
- Variable declarations ที่ top-level ก่อนใช้งาน

### Editing
- ใช้ `str_replace` ทีละจุดเท่านั้น
- ห้าม regenerate ทั้งไฟล์เด็ดขาด
- Diff > 100 lines = approach ผิด → หยุด แจ้ง Tony

### Firebase (PRODUCTION DATA — ห้ามแตะโดยไม่ขอ Tony)
- URL: `https://puff-stick-fc-order-default-rtdb.asia-southeast1.firebasedatabase.app`
- Path: `puffstick/` — ห้ามเปลี่ยน
- ห้ามลบ FB_DEFAULT_URL ออกจาก code (P-11)

---

## 📋 SELF-REVIEW CHECKLIST (ส่งทุกครั้งก่อน present code)

- [ ] Brace balance — `{` กับ `}` เท่ากัน
- [ ] ไม่มี bare `return` นอก function
- [ ] ทุก function ที่ควรมียังอยู่ครบ
- [ ] Variables declared ก่อนใช้
- [ ] ไม่มี nested template literals
- [ ] FB_DEFAULT_URL ยังอยู่ที่ top ของ script

---

## 🏗️ Architecture
[Branch confirms order]

↓

Firebase RTDB (notified=false)

↓

Layer 1: Branch sends Telegram (instant)

└─ PATCH notified=true

Layer 2: Cloudflare Worker (cron * * * * *)

└─ Picks up notified=false → sends → marks true

Layer 3: Admin manual button

**Stack:** Single-file HTML/JS, Firebase REST API, Cloudflare Worker
**Version:** v3.5.0

---

## 🚦 Patterns ที่บังคับใช้

| Pattern | สรุป |
|---|---|
| P-01 | r.ok check ทุก fetch push |
| P-02 | Mark & Retry — ทุก failed sync |
| P-03 | Visible state ทุก async op |
| P-08 | Version + no-cache + auto-update |
| P-14 | Health ping + error telemetry |
| P-21 | Restore before redesign |
| P-22 | Defense in depth สำหรับ critical ops |

---

## ❓ เมื่อไม่แน่ใจ → หยุดถาม Tony ก่อน

- Schema change ที่อาจ break user data
- Firebase paths หรือ rules
- Feature ใหม่ที่อาจกระทบ POS/CRM
- ไฟล์โตเกิน 3,000 lines
