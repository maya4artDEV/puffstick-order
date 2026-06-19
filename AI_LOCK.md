# 🔒 AI_LOCK.md — PuffStick FC Order System

> **Version:** 1.0
> **Last updated:** 2026-06-19
> **Status:** PRODUCTION LIVE — 20 สาขาใช้งานจริง
> **Repo:** https://github.com/maya4artDEV/puffstick-order
> **Live:** https://maya4artdev.github.io/puffstick-order/

---

## 🚨 อ่านก่อนแตะโค้ดทุกครั้ง — ไม่มีข้อยกเว้น

ไฟล์นี้คือ **constitution** สำหรับ AI ทุกตัวที่จะแตะ repo นี้

- ไม่อ่าน = ไม่อนุญาตให้แก้
- ละเมิดกฎ = ห้ามส่งงาน
- ไม่แน่ใจ = หยุดถาม Tony

---

## 0. CRITICAL INCIDENT LOG

### 2026-06-18: "restore" rollback ลึกเกินไป
- Commit `b5059af` ถูก label เป็น "v3.5.0 restore architecture"
- **แต่จริงๆ ตัดออกไป 49 functions / ~1,694 บรรทัด** เทียบกับ commit ก่อนหน้า (`0586e5d`)
- Features ที่หายไป (Tony คิดว่ายังอยู่):
  - ❌ Invoice PNG → Telegram sendPhoto
  - ❌ Branch Health telemetry
  - ❌ Backlog recovery (24/48/168hr)
  - ❌ localStorage auto-cleanup
  - ❌ Verified writes (lsSet→boolean)
  - ❌ Global error handler (window.onerror)
  - ❌ Mark & Retry pattern (P-02)
  - ❌ Version check + auto-update (P-08)
  - ❌ Branch order history
  - ❌ Admin notification loop

### 📌 บทเรียน
- **"restore" ≠ ลบโค้ดออกแล้วเขียนใหม่**
- ก่อน rollback ใหญ่: diff function list ก่อน push
- Briefing อาจตามไม่ทันความจริงในไฟล์ — เช็ค code เป็นหลัก

---

## 1. HARD RULES — JavaScript

### ใช้เท่านั้น (DO)
- `var` — ไม่ใช้ `let`, `const`
- `function(){}` — ไม่ใช้ arrow functions ใน render-heavy code
- **String concatenation** (`'a' + b + 'c'`)
- Top-level variable declarations ก่อนใช้งาน
- `lsGet/lsSet` wrapper สำหรับ localStorage
- `fbEndpoint` helper สำหรับ Firebase REST

### ห้ามเด็ดขาด (DON'T)
- ❌ **Nested template literals** — เคย CRASH production
- ❌ ES6+ syntax ที่ WebView เก่าไม่รองรับ (`?.`, `??`, spread, destructuring ใน function params)
- ❌ External dependencies ใหม่ (no npm packages, no build tools)
- ❌ Arrow functions ใน render functions

---

## 2. HARD RULES — File Editing

| กฎ | รายละเอียด |
|---|---|
| **ห้าม regenerate ทั้งไฟล์** | ใช้ `str_replace` ทีละจุดเท่านั้น |
| **View ก่อนแก้เสมอ** | `view` tool ก่อน `str_replace` |
| **Diff > 100 lines = approach ผิด** | หยุด แจ้ง Tony ก่อนทำต่อ |
| **Atomic Task Execution** | ซอยงานเป็น module เล็กที่ test ได้ |
| **No blind patching** | ถ้า logic เดิมพัง → แจ้ง Tony "ต้องรื้อ" ไม่ patch ทับ |

---

## 3. HARD RULES — Firebase

### Production paths (ห้ามแตะโดยไม่ขอ Tony)
- **URL:** `https://puff-stick-fc-order-default-rtdb.asia-southeast1.firebasedatabase.app`
- **Path:** `puffstick/` — ห้ามเปลี่ยน
- **FB_DEFAULT_URL** ที่ top of script — ห้ามขยับ (P-11: Don't hide URL)

### Schema (live data — ห้าม break)
- `puffstick/branches_v2` → `{_ts, _payload}` (last-write-wins)
- `puffstick/orders/{id}` → individual orders
- `puffstick/config` → admin password + Telegram (synced)
- `puffstick/branch_health/{branchId}` → telemetry (ถ้า restore แล้ว)
- `puffstick/js_errors/{branchId}` → error reports (ถ้า restore แล้ว)

### Telegram credentials (hardcoded fallback)
- **Bot Token:** `8751318167:AAEKTOhObZEMntTzAMBIY...`
- **Chat ID:** `5566010745`
- ห้ามลบออกจาก source (security ผ่าน Firebase Rules + bot scope ไม่ใช่ผ่านการซ่อน)

---

## 4. PATTERNS ที่บังคับใช้ (จาก PUFFSTICK_SYNC_CODEX.md)

| Pattern | บทสรุป | ใช้เมื่อ |
|---|---|---|
| **P-01** | r.ok check ทุก fetch push | ทุก PUT/POST/DELETE |
| **P-02** | Mark & Retry — markUnsynced + clearUnsynced + retryUnsynced | ทุก failed sync |
| **P-03** | Visible state — banner loading/success/failure | ทุก async op |
| **P-04** | Timestamp dual — orderDate (lock) + syncedAt | ทุก order create |
| **P-05** | ts sync — update local _ts หลัง push สำเร็จ | ทุก config push |
| **P-06** | Reload to sync — admin มีปุ่ม Force Reload | shared config changes |
| **P-07** | Credential rotation procedure | bot token / passwords |
| **P-08** | Version + no-cache + auto-update banner | ทุก deploy |
| **P-09** | Background sync limit — web app ทำไม่ได้ | ใช้ retry on next open |
| **P-10** | Firebase Rules whitelist path explicitly | ก่อน deploy app ใหม่ |
| **P-11** | Don't hide URL — security ผ่าน Rules ไม่ใช่ obscurity | FB_DEFAULT_URL stay |
| **P-12** | Git = single source of truth | ก่อน multi-AI work pull จาก main |
| **P-14** | Health ping + error report telemetry | production reliability |
| **P-17** | Element refs null-safe | ทุก getElementById |
| **P-21** | Restore before redesign | bug ใน critical path |
| **P-22** | Defense in depth สำหรับ critical ops | order submission |

---

## 5. SELF-REVIEW CHECKLIST (ห้ามข้าม)

ก่อน present file หรือ approve diff:

```
☐ Brace balance: count('{') == count('}')
☐ No bare `return` outside function
☐ All required functions present (compare ก่อน-หลัง edit)
☐ Variables declared before first use
☐ No nested template literals
☐ FB_DEFAULT_URL + FB_DEFAULT_PATH ที่ top ไม่ขยับ
☐ Telegram DEFAULT_TOKEN + CHATID ยังอยู่
☐ Test scenario อย่างน้อย 1 flow ใน mind
☐ ถ้า rollback/restore: diff function list ก่อน push
☐ Diff size < 100 lines หรือไม่ใช่? ถ้าใหญ่กว่า → แจ้ง Tony
```

---

## 6. ARCHITECTURE — 3-Layer Telegram Delivery

```
[Branch confirms order]
       ↓
   Firebase RTDB (notified=false, slip data)
       ↓
   ┌── Layer 1: Branch sends Telegram immediately (3-5s)
   │      ├─ sendPhoto (invoice PNG)
   │      └─ PATCH notified=true on success
   │
   ├── Layer 2: Cloudflare Worker cron (* * * * *)
   │      └─ Picks up notified=false → sends → marks true
   │
   └── Layer 3: Admin manual "🔁 ส่งแจ้งเตือนเดี๋ยวนี้" button
```

**Cloudflare Worker:**
- Name: `puffstick-telegram-notifier`
- Cron: `* * * * *` (every minute)
- Secrets: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, FIREBASE_URL, FIREBASE_PATH

---

## 7. CROSS-SYSTEM AWARENESS

PuffStick ecosystem มี 3 ระบบ ใช้ Firebase project เดียวกัน:

```
Order (this)  → B2B franchise ordering (PRODUCTION)
POS          → B2C in-store sales (separate project)
CRM          → Branch + customer management (separate project)
```

### เมื่อเสนอเปลี่ยนแปลง — ถามตัวเองก่อน:
- กระทบ schema ที่ POS/CRM ใช้ไหม?
- เปลี่ยน Firebase paths ที่มี data live ไหม?
- ถ้า YES → **flag Tony ก่อนทำ** ขอคุยกับ project อื่นก่อน

---

## 8. WHEN TO STOP AND ASK

### หยุดทันที + ถาม Tony ถ้า:
- Spec ขัดกับ existing code
- Schema change ที่จะ break user data
- จะแตะ Firebase rules หรือ paths
- ไฟล์โต > 3,000 lines
- Feature ใหม่กระทบ POS/CRM
- Diff > 100 lines
- เจอ rollback/restore ที่ดูเหมือนตัด features สำคัญออก
- User สั่งให้แก้ปัญหาเดิมเป็นครั้งที่ 2 → ต้อง RCA ก่อน ห้ามส่ง code ชุดเดิม

### ห้ามทำเงียบๆ:
- ห้ามลบ function โดยไม่บอก
- ห้าม rename schema field
- ห้ามเปลี่ยน Firebase URL/path
- ห้ามแตะ FB_DEFAULT_* constants ที่ top of script

---

## 9. ANTI-PATTERNS (เคยเจอ — อย่าทำซ้ำ)

| Bug | Cause | Prevention |
|---|---|---|
| Silent push fail | ไม่เช็ค r.ok | P-01 mandatory |
| Date "--/---" + buttons dead | Variable used before declaration | Declare at top |
| `Illegal return statement` | Function header missing หลัง str_replace | Verify `function X() {` |
| PIN ผิดคนละเครื่อง | Branches ไม่ sync | Use `saveBranches()` wrapper |
| Admin pw ไม่ sync | Config ไม่ pull | initApp ต้องเรียก `pullConfigFromFirebase()` |
| Order หายไป | localStorage overflow | P-02 mark & retry + auto-cleanup |
| 2 AI แก้ไฟล์เดียวกัน | ไม่ pull GitHub ก่อน | P-12 — git as source |

---

## 10. COMMUNICATION STYLE (Tony's requirements)

- **ภาษาคุย:** ไทย / **Code:** English
- **Visual proof required** — screenshot / terminal output / code diff
- **No satisficing** — ห้ามมักง่าย ห้ามหาทางลัด
- **No apology spam** — เน้น output + error log + solution ที่ใช้ได้จริง
- **Honest AI** — บอกตรงๆ ถ้าไม่รู้ ก่อนเดา
- **Token discipline** — review งานตัวเองก่อนส่ง ไม่ regenerate เพื่อแก้จุดเล็ก
- **Context preservation** — ทุก 5 turn หรือเปลี่ยนหัวข้อ → สรุป "Current State of Progress"
- **Push back when needed** — ถ้า Tony สั่งงานที่ผิด logic → ค้านและเสนอทางเลือก

---

## 11. PROJECT FILES REFERENCE

| File | Purpose |
|---|---|
| `index.html` | Production code (single-file HTML/JS) |
| `BUILDER_CODEX.md` | P-01 to P-22 patterns + Compounding Loop |
| `AI_LOCK.md` | This file — constitution for AI helpers |
| `PUFFSTICK_SYNC_CODEX.md` | Sync architecture lessons (in Project) |
| `puffstick-order-state.md` | Current state + business logic + credentials (in Project) |
| `puffstick-conventions.md` | Code rules + patterns (in Project) |

---

## 12. ENFORCEMENT

หาก AI ตัวใดละเมิดกฎใน AI_LOCK.md:
1. Tony จะปฏิเสธงาน + แจ้งใน chat
2. AI ต้อง **อ้าง** rule ที่ละเมิด + แก้ไข
3. ห้ามแก้ตัว ห้าม apologize เกินจำเป็น

หาก rule ไหนล้าสมัย:
1. AI แจ้ง Tony ก่อน
2. Tony approve → update AI_LOCK.md
3. Bump version + log ใน "Critical Incident Log"

---

> **ลายเซ็น:** Tony / 92 Food Limited
> **AI ที่ใช้ไฟล์นี้:** ทุก instance ของ Claude / Antigravity / GPT / Gemini ที่จะแตะ repo นี้
> **บทเรียนสำคัญที่สุด:** *Trust the data, not the briefing. Diff before destroy.*
