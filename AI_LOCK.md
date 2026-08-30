# 🔒 AI_LOCK.md — PuffStick FC Order System

> **Version:** 2.0
> **Last updated:** 2026-06-21
> **Status:** PRODUCTION LIVE — 20 สาขาใช้งานจริง
> **Repo:** https://github.com/maya4artDEV/puffstick-order
> **Live:** https://maya4artdev.github.io/puffstick-order/
> **Worker:** https://puffstick-telegram-notifier.92foodlimited.workers.dev

---

## 🚨 อ่านก่อนแตะโค้ดทุกครั้ง — ไม่มีข้อยกเว้น

ไฟล์นี้คือ **constitution** สำหรับ AI ทุกตัวที่จะแตะ repo นี้

- ไม่อ่าน = ไม่อนุญาตให้แก้
- ละเมิดกฎ = ห้ามส่งงาน
- ไม่แน่ใจ = หยุดถาม Tony

---

## 0. CRITICAL INCIDENT LOG

### 2026-06-19/21: "PNG หายจาก Telegram" — 6 investigation mistakes ของ AI

**Incident:** ลูกค้ารายงาน Telegram ได้ text แต่ไม่มี PNG ใบส่งของ (1 order จาก ปตท. M6)

**Real root cause:** Branch ส่ง text ผ่าน `sendTelegramRaw` ไม่สำเร็จ (network glitch) → ไม่เข้า `sendInvoiceToTelegram` → notified=false → Cloudflare Worker cron pick up → ส่ง text ผ่าน sendMessage → mark `notifiedBy: 'cloudflare-worker'` → ลูกค้าได้แค่ text เพราะ Worker ไม่มี DOM/html2canvas

**Investigation mistakes ที่ AI ทำ — ห้ามทำซ้ำ:**

1. ❌ **อ่าน `/mnt/project/puffstick-order.html` แทน live file** — ไฟล์ใน Project = stale cache, ไม่ใช่ deploy version
   → **Fix:** ก่อน investigate, `curl raw.githubusercontent.com/{repo}/main/index.html` ทุกครั้ง + md5sum compare

2. ❌ **Assume "rollback ตั้งใจ"** จาก diff ใหญ่ → เขียน narrative ผิดใน AI_LOCK.md ฉบับแรก
   → **Fix:** Verify ด้วย md5sum ของไฟล์ Tony upload vs live + git history ก่อนสรุป

3. ❌ **ไม่ดู Firebase data ก่อน** — Firebase order มี field `notifiedBy: 'cloudflare-worker'` ที่บอก root cause ทันที
   → **Fix:** Step 1 ของ investigation = ขอ Firebase export ก่อนอ่าน code

4. ❌ **Assume systemic bug** ทั้งที่เป็น 1 device — Tony test 2 devices → PNG มาครบ
   → **Fix:** ก่อน assume bug ทุก device, ถาม "ทุก device หรือ device เดียว?"

5. ❌ **เสนอ 4 fixes พร้อมกัน** (crossorigin + don't-mark-notified + retry + change CDN) ก่อนรู้ root cause
   → **Fix:** Diagnostic-first — 1 step ที่ unmask error → รอ data → fix ตรงจุด

6. ❌ **Assume code bug** ทั้งที่ Tony ปิด Telegram notification ใน Android Settings (phone-level)
   → **Fix:** เช็ค phone/app settings ก่อน blame code (especially Vivo/Oppo/Xiaomi aggressive battery)

### บทเรียนรวม
- **"Trust the data, not the briefing"** — Tony's brief อาจตามไม่ทันความจริงในไฟล์
- **"Diff before destroy"** — ก่อน rollback/restore: diff function list + md5sum + ask
- **"Iceberg problem"** — Symptom ที่เห็น ≠ root cause ใต้น้ำ

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
| **Diff > 100 lines = approach ผิด** | หยุด แจ้ง Tony ก่อนทำต่อ (ยกเว้น pure deletion ของ dead code) |
| **Atomic Task Execution** | ซอยงานเป็น module เล็กที่ test ได้ |
| **No blind patching** | ถ้า logic เดิมพัง → แจ้ง Tony "ต้องรื้อ" ไม่ patch ทับ |
| **No shotgun fix** | ห้ามเสนอ N fixes พร้อมกันโดยไม่รู้ root cause |

---

## 3. HARD RULES — Firebase + Worker

### Production paths (ห้ามแตะโดยไม่ขอ Tony)
- **Firebase URL:** `https://puff-stick-fc-order-default-rtdb.asia-southeast1.firebasedatabase.app`
- **Firebase Path:** `puffstick/` — ห้ามเปลี่ยน
- **Worker URL:** `https://puffstick-telegram-notifier.92foodlimited.workers.dev`
- **FB_DEFAULT_URL + WORKER_URL** ที่ top of script — ห้ามขยับ (P-11: Don't hide URL)

### Schema (live data — ห้าม break)
- `puffstick/branches_v2` → `{_ts, _payload}` (last-write-wins)
- `puffstick/orders/{id}` → individual orders
  - field `notifiedBy`: `'branch'` | `'worker-proxy'` | `'cloudflare-worker'` (legacy)
  - field `notified`: boolean
  - field `notifiedAt`: timestamp
- `puffstick/config` → admin password + (legacy) Telegram tokens
- `puffstick/branch_health/pings/{branchId}` → telemetry
- `puffstick/branch_health/errors/{push-id}` → JS errors

### Telegram credentials (v3.6.0+)
- ✅ **Token อยู่ใน Cloudflare Worker Secrets เท่านั้น**
  - `TELEGRAM_BOT_TOKEN`
  - `TELEGRAM_CHAT_ID`
  - `FIREBASE_URL`
  - `FIREBASE_PATH`
- ❌ **ห้าม hardcode token ใน source code** — ลบไปแล้วใน v3.6.0
- ❌ **ห้าม push token ผ่าน Firebase config** — token sync ถูกตัดออกใน v3.6.0
- ✅ **Revoke token:** อัพเดต Cloudflare Secret 1 ที่ → branches ไม่ต้องทำอะไร

---

## 4. ARCHITECTURE — v3.6.0 (current)

### Single-path Worker Proxy (replaced 3-Layer)

```
Branch confirm order
    ↓
render PNG locally (html2canvas, A4 794×1123)
    ↓
POST → Worker /send-order (multipart: orderId + photo + caption)
    ↓
Worker (Cloudflare):
   1. verify orderId in Firebase (anti-abuse)
   2. fetch Telegram sendPhoto (PNG + caption text)
   3. PATCH order: notified=true, notifiedBy='worker-proxy'
    ↓
ส่งสำเร็จ = ครบทั้ง text + PNG (atomic — 1 ข้อความใน Telegram)
ส่งไม่สำเร็จ = notified=false → admin manual resend ผ่านปุ่ม "📤 ส่งใบส่งของ PNG ซ้ำ"
```

### Worker endpoints
- `POST /send-order` — main path (branch confirms order)
- `POST /resend` — alias (admin resend from history)
- `GET /health` — uptime check
- **CORS:** restricted to `https://maya4artdev.github.io`
- **Cron trigger:** REMOVED (was `* * * * *` in v3.5.0)

### What changed from 3-Layer (v3.5.0)
| Component | v3.5.0 (old) | v3.6.0 (current) |
|---|---|---|
| Token location | Source code | Worker secrets |
| Worker role | Cron poller (text-only fallback) | HTTP proxy (text+PNG) |
| Branch → Telegram | Direct (2 API calls: sendMessage + sendPhoto) | Via Worker (1 sendPhoto) |
| Cron trigger | `* * * * *` | **REMOVED** |
| Failsafe | 3 layers (branch + worker + admin) | 1 path + admin manual resend |
| Mark notified | Branch self-mark | Worker marks after success |
| Invoice ratio | 780px width (variable height) | 794×1123 (A4 portrait, min-height) |

### Why this is better
- ✅ **Atomic:** text + PNG = 1 ข้อความ (ไม่มี case "ได้ text แต่ไม่ได้ PNG")
- ✅ **Secure:** Token revoke = แก้ใน Cloudflare → branches ไม่ต้องทำอะไร
- ✅ **Simple:** ลบ dead code ~100 บรรทัด (markNotifiedAfterBranchSend, attemptBranchTelegramNotify, doSendTelegram)
- ✅ **Recoverable:** admin resend button = manual fallback

---

## 5. PATTERNS ที่บังคับใช้ (จาก PUFFSTICK_SYNC_CODEX.md)

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
| **P-22** | Defense in depth (v3.6.0 = single path + manual resend) | critical ops |

---

## 6. SELF-REVIEW CHECKLIST (ห้ามข้าม)

ก่อน present file หรือ approve diff:

```
☐ Brace balance: count('{') == count('}')
☐ No bare `return` outside function
☐ All required functions present (compare ก่อน-หลัง edit)
☐ Variables declared before first use
☐ No nested template literals
☐ FB_DEFAULT_URL + FB_DEFAULT_PATH + WORKER_URL ที่ top ไม่ขยับ
☐ ไม่มี token literal (8751...) ใน source — view source ต้องไม่เจอ
☐ Test scenario อย่างน้อย 1 flow ใน mind
☐ ถ้า rollback/restore: diff function list + md5sum ก่อน push
☐ Diff size < 100 lines หรือเป็น pure deletion ของ dead code?
☐ JS syntax check ผ่าน (node --check)
```

---

## 7. INVESTIGATION CHECKLIST (ก่อน fix bug ใดๆ)

ลำดับที่ต้องทำเสมอ (เรียงจากเร็วสุด/ถูกสุด):

```
☐ 1. Fetch live URL — ไม่ใช่ /mnt/project/
     → curl https://raw.githubusercontent.com/maya4artDEV/puffstick-order/main/index.html
☐ 2. ขอ Firebase export → ดู order fields (notifiedBy, notifyAttempts, ts)
☐ 3. ถาม "ทุก device หรือ 1 device?" — Tony test 2 device ได้
☐ 4. ดู Branch Health + JS Errors panel ใน Admin Dashboard
☐ 5. ถ้าเห็น "Script error." → CORS-masked error → ดู crossorigin attribute
☐ 6. ก่อน blame code → เช็ค phone/app settings (notification permission, mute, DND)
☐ 7. ถ้าจะแก้: 1 fix ที่ตรงจุด — ไม่ shotgun 4 fixes
☐ 8. ถ้าไม่รู้ root cause → diagnostic step ก่อน (enable error visibility)
```

---

## 8. CROSS-SYSTEM AWARENESS

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

## 9. WHEN TO STOP AND ASK

### หยุดทันที + ถาม Tony ถ้า:
- Spec ขัดกับ existing code
- Schema change ที่จะ break user data
- จะแตะ Firebase rules หรือ paths
- ไฟล์โต > 3,500 lines
- Feature ใหม่กระทบ POS/CRM
- Diff > 100 lines (ยกเว้น pure deletion)
- เจอ rollback/restore ที่ดูเหมือนตัด features สำคัญออก
- User สั่งให้แก้ปัญหาเดิมเป็นครั้งที่ 2 → ต้อง RCA ก่อน ห้ามส่ง code ชุดเดิม
- คิดจะแก้ logic ที่ใช้ token / Worker / Firebase config sync

### ห้ามทำเงียบๆ:
- ห้ามลบ function โดยไม่บอก
- ห้าม rename schema field
- ห้ามเปลี่ยน Firebase URL/path/Worker URL
- ห้ามแตะ FB_DEFAULT_* constants ที่ top of script
- ห้าม push token (literal) เข้า source code

---

## 10. ANTI-PATTERNS (เคยเจอ — อย่าทำซ้ำ)

| Bug | Cause | Prevention |
|---|---|---|
| Silent push fail | ไม่เช็ค r.ok | P-01 mandatory |
| Date "--/---" + buttons dead | Variable used before declaration | Declare at top |
| `Illegal return statement` | Function header missing หลัง str_replace | Verify `function X() {` |
| PIN ผิดคนละเครื่อง | Branches ไม่ sync | Use `saveBranches()` wrapper |
| Admin pw ไม่ sync | Config ไม่ pull | initApp ต้องเรียก `pullConfigFromFirebase()` |
| Order หายไป | localStorage overflow | P-02 mark & retry + auto-cleanup |
| 2 AI แก้ไฟล์เดียวกัน | ไม่ pull GitHub ก่อน | P-12 — git as source |
| **"Script error." ใน Branch Health** | CDN script ไม่มี crossorigin | ใส่ `crossorigin="anonymous"` ทุก external script |
| **ภาพ PNG หาย** ใน Telegram | Worker fallback ส่งได้แต่ text | v3.6.0 Worker proxy ส่ง sendPhoto |
| **Shotgun fix anti-pattern** | เสนอ 4 fixes โดยไม่รู้ root cause | Diagnostic-first, 1 fix ที่ตรงจุด |
| **Investigation บนไฟล์ผิด** | อ่าน /mnt/project/ แทน live | Fetch raw GitHub main branch ก่อนเสมอ |

---

## 11. COMMUNICATION STYLE (Tony's requirements)

- **ภาษาคุย:** ไทย / **Code:** English
- **Visual proof required** — screenshot / terminal output / code diff
- **No satisficing** — ห้ามมักง่าย ห้ามหาทางลัด
- **No apology spam** — เน้น output + error log + solution ที่ใช้ได้จริง
- **Honest AI** — บอกตรงๆ ถ้าไม่รู้ ก่อนเดา
- **Token discipline** — review งานตัวเองก่อนส่ง ไม่ regenerate เพื่อแก้จุดเล็ก
- **Context preservation** — ทุก 5 turn หรือเปลี่ยนหัวข้อ → สรุป "Current State of Progress"
- **Push back when needed** — ถ้า Tony สั่งงานที่ผิด logic → ค้านและเสนอทางเลือก
- **Quote Tony's principle:** "ยิ่งแก้ยิ่งซับซ้อน" / "ห้ามแตะอะไรที่ไม่จำเป็น" — ใช้เป็น guard rails

---

## 12. PROJECT FILES REFERENCE

| File | Purpose |
|---|---|
| `index.html` | Production code (single-file HTML/JS) — v3.6.0 |
| `worker/index.js` | Cloudflare Worker proxy code — deployed |
| `BUILDER_CODEX.md` | P-01 to P-22 patterns + Compounding Loop |
| `AI_LOCK.md` | This file — constitution for AI helpers |
| `PUFFSTICK_SYNC_CODEX.md` | Sync architecture lessons (in Project) |
| `puffstick-order-state.md` | Current state + business logic (in Project) |
| `puffstick-conventions.md` | Code rules + patterns (in Project) |

---

## 13. KNOWN ISSUES / BACKLOG

### 🔴 Active bugs
**B1. Order count sync mismatch (admin view)**
- **Reporter:** Tony (admin only — สาขาเห็นถูก)
- **Symptom:** desktop vs mobile admin → orders count ต่างกัน
- **Specific case:** Tony ลบ order ปลอม (account PIN 0000 test) จากมือถือ → มือถือหาย → **desktop ยังเห็น order ปลอม**
- **Not investigated:** order ไหนอีกที่ตัวเลขไม่ตรง — Tony ยังไม่ได้ไล่
- **Hypothesis:** delete ไม่ propagate ผ่าน Firebase (deleteOrderFromFirebase อาจไม่ทำงาน หรือ pullOrdersFromFirebase merge แล้ว order กลับมา / มี local cache ที่ไม่ update ตอน sync)
- **Investigation plan:** ดู deleteOrderFromFirebase + pullOrdersFromFirebase + initApp order merge logic

### 🟡 Deferred
**D1. Step 4c — Admin Dispatcher loop + UI card cleanup**
- dead code ~200 บรรทัด (processNotificationQueue, startAdminNotificationLoop, etc.)
- UI card "✅ Notification Dispatcher" ยังแสดงใน Dashboard
- Tony ลังเล — ถ้าลบ UI หาย ต้องสร้างใหม่
- **Plan:** ทำเมื่อจำเป็น (e.g. break เพราะ feature ใหม่) — redesign เป็น Worker /health ping card

**D2. Hero/Logo image not synced across devices**
- **Design choice** — ไม่ใช่ bug — กิน Firebase storage/bandwidth ถ้า sync
- **Workaround:** ถ้า Tony เปลี่ยนภาพ → edit base64 ใน source → push GitHub

**D3. notifyLateSync ใช้ token ตรง (เก็บไว้)**
- cfg ว่าง = silent return → late-sync alert ไม่ส่งหลัง v3.6.0 token removal
- Future: เพิ่ม `/notify-late-sync` endpoint ใน Worker ถ้า Tony ต้องการ

### 🟢 Feature requests
**F1. Per-branch discount toggle**
- **Reporter:** Tony
- **Spec:** Admin setting — ON/OFF discount per branch
- **Reason:** คู่สัญญาแต่ละสาขามีเงื่อนไขส่วนลดต่างกัน (เช่นสาขา A 10%, สาขา B 0%, สาขา C 5%)
- **Scope:** ต้องดู discount logic ปัจจุบัน → เพิ่ม field ใน branches_v2 (discountEnabled?, discountPercent?) → UI ใน admin Settings → check ใน order calc
- **Risk:** กระทบ order calculation — ต้อง test กับสาขาตัวอย่าง

---

## 14. ENFORCEMENT

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
> **บทเรียนสำคัญที่สุด:** *Trust the data, not the briefing. Diff before destroy. Fetch live before assume.*
