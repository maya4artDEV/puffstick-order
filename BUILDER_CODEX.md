# Builder Codex
## Master Reference for Multi-Device Sync Apps

> **เอกสารหลัก** สำหรับทุก app ที่ Tony / Maya สร้าง — ใช้ได้กับทุก project ใน ecosystem
>
> **เวอร์ชัน:** 1.0 (เปลี่ยนจาก PuffStick Sync Codex v3)
> **อัพเดทล่าสุด:** 2026-06-18
> **เจ้าของ:** Tony / Maya (maya4artdev)
> **ที่มา:** บทเรียนจาก PuffStick Order app v3.3.x → v3.5.0 + Cloudflare Worker
> **Applies to:** PuffStick Order, Production app, POS, Pippa, PIKA, Da'Neng, และทุก app ในอนาคต

---

## 📖 วิธีใช้ Codex นี้

### Storage Locations
- **Master copy:** GitHub repo (commit เก็บประวัติ)
- **Working copy:** Claude Projects → Project files (upload .md เข้าทุก project)
- **Quick access:** Bookmark URL ของ GitHub raw

### When to Reference
- 🎯 **ก่อนสร้าง app ใหม่:** อ่าน checklist + apply patterns ตั้งแต่ day 1
- 🐛 **ตอนแก้ bug:** ดู section "🧠 The Codex" หา pattern ที่ match
- 🤖 **ตอนใช้ AI helper:** Upload Codex เข้า Project + อ้างใน prompt ("ตาม P-XX")
- 📋 **ก่อน deploy:** วิ่งผ่าน Pre-Deployment Checklist

### When to Update
- เจอ bug ใหม่ที่ไม่อยู่ใน Codex → เพิ่ม P-XX
- Pattern เดิมเริ่ม out-of-date → revise + bump version
- Apps อื่นนำไปใช้แล้วเจอข้อจำกัด → document

---

## 🎯 Executive Summary

PuffStick Order app เจอ bug ซ้อนกันหลายชั้นในช่วง 2 สัปดาห์ที่ผ่านมา ทุกตัวมี root pattern เดียวกัน:

> **"ระบบทำงานเงียบเมื่อมีปัญหา — Tony ไม่รู้จนกว่าจะมีคนรายงาน"**

Codex นี้คือชุด patterns ที่ทำให้:
1. ✅ ทุก silent failure ดังขึ้น (admin เห็นก่อนใคร)
2. ✅ Branches ไม่ต้องจัดการอะไร (ใช้ link เดิมตลอด)
3. ✅ Token rotation = แก้ที่เดียว
4. ✅ Defense in depth — มี backup layer เสมอ

---

---

## 🔄 The Compounding Loop — Core Operating Principle

> **กฎเหล็ก:** ทุก project, ทุก work cycle, ทุก app ที่สร้าง ต้องใช้ loop นี้

ระบบ 3 ชั้นที่แยก **compounding** ออกจาก **repetition**:

| ชั้น | สิ่งที่ทำ | กฎ |
|---|---|---|
| **Do** | ลงมือทำงานจริง | ชั้นนี้ทุกคนมีอยู่แล้ว |
| **Capture** | หลังจบแต่ละ cycle: อะไรได้ผล, อะไรไม่ได้ผล, สมมติฐานไหนผิด | แค่ 2-3 บรรทัด — แต่ต้องมี |
| **Upgrade** | ทุก N cycles: ดู captures → ถาม "workflow ต้องเปลี่ยนตรงไหน?" → เปลี่ยนจริง | ถ้าข้ามชั้นนี้ = แค่ทำเร็วขึ้นแต่ไม่ฉลาดขึ้น |

> **"Without Capture + Upgrade, no amount of AI makes you smarter — it just makes you repeat faster."**

### ใช้กับทุก project — ตัวอย่าง

| Project | Do | Capture | Upgrade |
|---|---|---|---|
| **PuffStick** | สั่ง-ผลิต-ส่ง branches | order patterns, branch feedback, production cycle | feed back ออกแบบ FC system + production tracking |
| **PIKA** | Data Collection Loop + Scoring Loop | Source Map, Hypothesis Sheet, Decision Log | Sprint Review ทุก 2 สัปดาห์ |
| **Pippa** | feature usage logs | AI Q&A patterns, parent behavior | tune MoonOwl + UX adjustments |
| **Code sessions** | สร้าง app/feature | prompt patterns ที่ work, recurring bugs | เพิ่ม patterns ใน Builder Codex |
| **AI helpers** | ส่งงานให้ Claude / Antigravity / etc | อะไรที่ AI พลาด, prompt ไหน effective | refine system prompts + Codex |

### Apply ยังไงในแต่ละ session

**ตอนเริ่ม session:**
- เปิด Capture log ของ project นี้
- อ่าน 3-5 captures ล่าสุด → จำว่าอะไรพลาดไปแล้ว

**ระหว่าง session:**
- เจอสิ่งที่ effective → จด 2-3 บรรทัด
- เจอ pattern ที่ recurring (bug, friction) → mark เป็น Upgrade trigger

**ตอนจบ session:**
- ถาม: "session นี้ — อะไรที่ได้ผลดีที่สุด? อะไรที่ควรเพิ่มใน context ครั้งหน้า?"
- บันทึก capture entry

**ทุก 5-10 cycles หรือ End of Sprint:**
- รวบรวม captures → หา patterns
- ถาม: "workflow ของเรา outdated ตรงไหน?"
- Update: prompts, processes, Codex, AI personas
- Document การเปลี่ยนแปลง

### Capture Log Format (แนะนำ)

ไฟล์: `CAPTURE_LOG.md` ใน root ของแต่ละ project

```markdown
# Capture Log — [Project Name]

## 2026-06-18 — Order app v3.5.0 stabilization
- **Win:** Restoring v3.3.x architecture + adding safeguards >> rebuilding from scratch
- **Loss:** v3.4.0-4.1 over-engineering wasted 1 week + caused branch outage
- **Question:** Should we add "Restoration first, Refactor only when truly needed" as P-21? → Yes, added

## 2026-06-17 — Cloudflare Worker setup
- **Win:** Cron `* * * * *` runs reliably, no missed orders
- **Loss:** Initially forgot to set up cron trigger separately from secrets
- **Lesson:** Document multi-step deployment processes step-by-step
```

### Connecting Captures across Projects

Patterns ที่ recur ข้าม project → ย้ายเข้า **Builder Codex** (เอกสารนี้):

```
Project Capture Logs ──→ Recurring patterns ──→ Builder Codex Patterns
        ↑                                              │
        └──── Apply codex back to all projects ────────┘
```

→ Tony เก่งขึ้น ทุก app เก่งขึ้นพร้อมกัน

---

## 🧠 Pattern Library (P-01 to P-22)

### Foundation Patterns (P-01 to P-08)

#### P-01: r.ok check ทุก push function

❌ **ผิด:** Catch only network errors → silent fail when server returns 401/403/500
```js
fetch(url, {method:'PUT', body: data})
  .catch(function(e){ console.warn('failed'); });
```

✅ **ถูก:**
```js
return fetch(url, {method:'PUT', body: data})
  .then(function(r){
    if (r.ok) return {ok:true};
    markFailedForRetry(id, 'http-'+r.status);
    return {ok:false, reason:'http-'+r.status};
  })
  .catch(function(e){
    markFailedForRetry(id, 'network');
    return {ok:false, reason:'network'};
  });
```

#### P-02: Mark & Retry pattern

ทุก data ที่ต้อง sync → ต้องมี 3 functions: `markUnsynced`, `clearUnsynced`, `retryUnsynced`

```js
function retryUnsynced() {
  var pending = lsGet('unsynced_' + entityType) || {};
  Object.keys(pending).forEach(function(id) {
    var item = lookupLocal(id);
    if (item) syncToCloud(item);
    else clearUnsynced(id);
  });
}
// Wire: setTimeout(retryUnsynced, 2500) ใน initApp
```

#### P-03: Visible state — every async needs UI feedback

3 state banner เสมอ:
```js
showStatus('info', '⏳ กำลังบันทึก...');
syncToCloud(data).then(function(r){
  if (r.ok) showStatus('success', '✅ สำเร็จ');
  else showStatus('danger', '⚠️ ยังไม่สำเร็จ ('+r.reason+')');
});
```

#### P-04: Timestamp dual (created vs synced)

```js
{
  id: 'o'+Date.now(),     // creation timestamp encoded
  createdAt: Date.now(),
  orderDate: '14/06/69',  // human-readable
  syncedAt: null          // null until first successful push
}
```

#### P-05: ts sync after push

```js
function pushConfig() {
  var payload = { ...cfg, _ts: Date.now() };
  return fetch(url, {method:'PUT', body: JSON.stringify(payload)})
    .then(function(r){
      if (r.ok) {
        cfg._configTs = payload._ts;  // ← สำคัญ! บันทึก local ts
        lsSet('settings', cfg);
      }
    });
}
```

#### P-06: Reload to sync (cross-device localStorage limit)

```
[Device A localStorage] ── Firebase ── [Device B localStorage]
       ↑ instant            ↑ on save     ↑ ONLY on app reload
```

**Rule:** หลังเปลี่ยน config สำคัญ → suggest "เครื่องอื่นต้อง reload"

#### P-07: Credential rotation procedure

```
1. สร้าง credential ใหม่ที่ provider
2. Test ใน sandbox (token เก่า + ใหม่ ทำงานคู่กันได้ระยะหนึ่ง)
3. Update ใน app + verify push สำเร็จ
4. รอ ~5 นาที ให้เครื่องอื่น pull
5. Revoke credential เก่า
```

❌ **ห้าม:** Revoke ของเก่าก่อนทดสอบของใหม่ — ทำให้ระบบ down ทันที

#### P-08: Auto-update mechanism (3 layers)

```html
<!-- Layer 1: Meta no-cache -->
<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">

<!-- Layer 2: Version constants in JS -->
<script>
var APP_VERSION = '3.5.0';
var APP_BUILD = '2026.06.18';
</script>
```

```js
// Layer 3: Version check via Firebase + update banner
function checkVersionFromFirebase() {
  fetch(versionUrl, {cache:'no-store'}).then(r => r.json()).then(data => {
    if (compareVersion(data.version, APP_VERSION) > 0) {
      showUpdateBanner(data.version);
    }
  });
}
```

---

### Architecture & Sync Patterns (P-09 to P-14)

#### P-09: Background sync limitations (Web)

**ทำได้:**
- ✅ Retry on next app open (Mark & Retry P-02)
- ✅ Service Worker + Background Sync API (สำหรับ PWA จริง)

**ทำไม่ได้:**
- ❌ Force pull จาก localStorage ของลูกค้า โดยลูกค้าไม่เปิด app
- ❌ Push notification ปลุก app บนเครื่องลูกค้า

**ทางออก:** Server-side notification (Cloudflare Worker / Cloud Function) — ดู P-22

#### P-10: Firebase Rules — Whitelist approach

❌ **ผิด:** ตั้ง rules แต่ลืม path ของ app → falls into `$other` → block ทุก operation

✅ **ถูก:**
```json
{
  "rules": {
    "puffstick": { ".read": true, ".write": true },
    "productions": { /* complex rules */ },
    "$other": { ".read": false, ".write": false }
  }
}
```

#### P-11: Don't hide URL — Security through Rules

❌ **Anti-pattern:** ซ่อน Firebase URL ใน source code "เพื่อ security"
- ไฟล์อยู่ใน public GitHub Pages อยู่แล้ว
- URL ใน DevTools → Network tab ดูได้

✅ **Security จริง:**
- Firebase Rules (auth + read/write conditions)
- Server-side proxy (Cloudflare Worker — P-22)
- Token in env vars (not source)

#### P-12: Single source of truth = Git

✅ **กฎ:**
1. GitHub repo = source of truth สำหรับทุก app
2. ก่อนส่ง AI helper → **pull from GitHub** เป็น base
3. หลัง AI helper เสร็จ → **push to GitHub ทันที**
4. ห้าม 2 AI แก้ไฟล์เดียวกันพร้อมกัน

#### P-13: Hybrid/Layered Notification

**Best pattern — 2 paths working together:**

```
[Branch confirms order]
   ↓
Save to Firebase (notified=false)
   ↓
┌── ⚡ Branch tries Telegram (instant 3-5s)
│      ├─ Success → PATCH notified=true
│      └─ Fail → leave notified=false
│
└── 🔄 Server-side worker (Cloudflare, every minute)
       └─ Find notified=false → send → mark notified=true
```

→ Tony ได้ notification ทุกครั้ง — instant ถ้า branch ทำงาน, ช้า 1 นาทีถ้าใช้ failsafe

#### P-14: Telemetry First — Admin sees, before users have to call

3 channels of telemetry:

```js
// 1. Health ping (every 5 min while app open)
setInterval(function(){
  fetch(fbEndpoint('branch_health/pings/'+deviceId), {
    method:'PUT',
    body: JSON.stringify({
      ts, deviceId, branchId, appVersion, storageSizeKb,
      unsyncedOrders, page, online
    })
  });
}, 5*60*1000);

// 2. Error reporter (window.onerror catches uncaught crashes)
window.onerror = function(msg, src, line, col, err) {
  fetch(fbEndpoint('branch_health/errors'), {
    method:'POST',
    body: JSON.stringify({
      message, source, line, column, stack,
      ts, version, deviceId, branchId, userAgent
    })
  });
};

// 3. Storage failure reporter
function reportStorageFailure(key, err) {
  fetch(fbEndpoint('branch_health/storage_failures'), {
    method:'POST',
    body: JSON.stringify({ts, deviceId, branchId, key, error, storageSize})
  });
}
```

**Admin view:**
- 🟢 Online (<10min) · 🟡 Idle (<1h) · 🔴 Offline (>1h)
- Recent errors with stack traces
- Storage usage per device

---

### Robustness Patterns (P-15 to P-18)

#### P-15: Storage Budget Management

```js
function estimateStorageSize() {
  var total = 0;
  for (var i = 0; i < localStorage.length; i++) {
    var k = localStorage.key(i);
    var v = localStorage.getItem(k) || '';
    total += (k.length + v.length) * 2;  // UTF-16 ≈ 2 bytes/char
  }
  return Math.round(total / 1024);  // KB
}

function attemptStorageCleanup() {
  var orders = lsGet('orders') || [];
  if (orders.length > 100) {
    orders.sort(byTimestampDesc);
    lsSet('orders', orders.slice(0, 150));  // keep newest 150
  }
}
```

**Rule:** localStorage cap ≈ 5-10 MB → keep < 4 MB safety margin

#### P-16: Verified Writes — fail loudly, not silently

❌ **ผิด:**
```js
function lsSet(k,v) { try { localStorage.setItem(...); } catch(e) {} }
```

✅ **ถูก:**
```js
function lsSet(k, v) {
  try {
    localStorage.setItem(prefix+k, JSON.stringify(v));
    return true;
  } catch(e) {
    if (e.name === 'QuotaExceededError') {
      attemptStorageCleanup();
      try { localStorage.setItem(prefix+k, JSON.stringify(v)); return true; }
      catch(e2) { reportStorageFailure(k, e2.message); }
    }
    return false;
  }
}

// Call sites:
var ok = lsSet('orders', orders);
if (!ok) {
  alert('⚠️ ไม่สามารถบันทึก — กรุณารีเฟรช');
  return;
}
```

#### P-17: Element Reference Cleanup Discipline

**The bug:** ลบ HTML element แต่ลืม update JS references → null pointer crash

```js
// HTML deleted:
// <div id="tg-btn-wrap">...</div>

// JS still:
document.getElementById('tg-btn-wrap').style.display = ...; // CRASH
```

✅ **Pattern:**
```bash
# Before deleting any HTML element:
grep -rn "getElementById('elementId')" .
grep -rn "id=\"elementId\"" .
# Then delete JS first, then HTML
```

**Defensive coding:**
```js
// ❌ Crashes if missing
document.getElementById('btn').style.display = 'none';

// ✅ Null-safe
var btn = document.getElementById('btn');
if (btn) btn.style.display = 'none';
```

#### P-18: Active Polling — Admin views must auto-refresh

```js
function startAdminLoop() {
  pullFromCloud();  // initial
  setInterval(function(){
    pullFromCloud();  // every 30s
  }, 30000);
}

// pullFromCloud should also:
// - fetch with no-cache header
// - re-render UI if active
```

---

### Process Patterns (P-19 to P-22)

#### P-19: Optional Actions = After confirmation, never before

❌ **Anti-pattern:** ปุ่ม "Share to LINE" บนหน้า preview → กดแล้ว app เปลี่ยน state → main action lost

✅ **Rule:** Optional features (share, copy, print) อยู่ **หลัง** source-of-truth save เสมอ

```
[Order draft] → [Confirm + Save] → [Optional: Share, Download, Print]
                                     ↑ state can be lost safely here
```

#### P-20: Multi-AI Lockfile

Create `AI_LOCK.md` in repo:
```markdown
# AI Work Lock

| File | Locked By | Reason | Until |
|------|-----------|--------|-------|
| index.html | Antigravity | Security pass | 2026-06-14 22:00 |

## Process
1. Check this lockfile before editing
2. Add entry with deadline
3. Remove entry on done + commit
```

→ Stops Claude + Antigravity + other AIs from stepping on each other

#### P-21: Don't over-architect — restore working systems first ⚠️

**Lesson learned (v3.4.x mistake):**
- v3.3.x had working branch-side Telegram
- Antigravity removed credentials → some branches stopped working
- I (Claude) panicked and rebuilt entire architecture (v3.4.0 admin-side polling)
- Created new problems (admin must be online)
- Real answer: just restore the credentials + add safeguards

**Rules:**
1. เมื่อ **บาง part เสีย** → fix แค่ part นั้น (don't redesign)
2. เมื่อ **architecture จริงๆ ไม่ดี** → re-design ทั้งระบบโดยตั้งใจ
3. **ไม่ใช่:** Patch ด้วย redesign

**Before refactoring, ask:**
- ปัญหานี้ fix ที่ root cause ได้ไหม?
- มี smaller change ที่แก้ได้ไหม?
- ถ้า refactor — ทำลายอะไรที่ทำงานอยู่ไหม?

#### P-22: Defense in Depth — Multiple paths for critical operations

**For mission-critical actions (notifications, payments, alerts):**

```
[Critical action]
   ↓
┌─── Primary path (fastest, but fragile)
│       Branch-side Telegram (instant)
│
├─── Secondary path (server-side, slower, more reliable)
│       Cloudflare Worker (1 min interval)
│
└─── Tertiary path (manual recovery)
        Admin "🔁 ส่งแจ้งเตือนเดี๋ยวนี้" button
        Backlog recovery (24/48/168 hr scan)
```

**ลำดับ priority:**
1. Primary = best UX (instant) — try first
2. Secondary = guarantee (server runs 24/7) — failsafe
3. Tertiary = manual recovery — for edge cases

**Coordination มาตรฐาน:**
- Single source of truth flag (เช่น `notified: true/false` in Firebase)
- Atomic claim (PATCH before send) — avoid double-send across paths
- Each path checks flag before acting → respects others' work

**PuffStick implementation:**
```
v3.5.0 Branch Telegram:
  - Sends Telegram from branch device
  - On success → PATCH Firebase notified=true
  - Cloudflare Worker sees notified=true → skips

Cloudflare Worker (cloudflare-worker-telegram.js):
  - Runs cron every minute
  - PATCH notified=true BEFORE send (claim)
  - Send Telegram
  - On fail → PATCH notified=false (release)

Admin manual button:
  - Calls same dispatcher function
  - Same notified flag logic
```

→ Tony gets Telegram every time. No single point of failure.

---

## ✅ Pre-Deployment Checklist v3

ก่อน push ทุก app ที่มี multi-device sync:

### Code Layer
- [ ] ทุก push function เช็ค `r.ok` (P-01)
- [ ] ทุก async operation มี UI feedback (P-03)
- [ ] Mark & Retry pattern ครบ (P-02)
- [ ] Version constants set + แสดงใน footer (P-08)
- [ ] No-cache meta tags ครบ (P-08)
- [ ] Version check ผ่าน Firebase + update banner (P-08)
- [ ] localStorage key prefix unique per app
- [ ] ไม่มี nested template literals ใน render functions
- [ ] ใช้ `var`, `function(){}`, string concat

### Element Cleanup (P-17)
- [ ] grep `getElementById\(...\)\.(style|innerHTML|...)` — ทุกตัวต้อง null-safe
- [ ] หลังลบ HTML element → grep JS references → ลบ/guard

### Error Handling (P-14)
- [ ] `window.onerror` + `window.onunhandledrejection` ทำงาน → report Firebase
- [ ] try/catch รอบ critical flows (login, confirm, save settings)
- [ ] ไม่มี `.catch(function(){})` ที่กลืน error เงียบ

### Storage (P-15, P-16)
- [ ] `lsSet` return boolean — call sites ใช้ผลลัพธ์
- [ ] Auto-cleanup mechanism เมื่อ quota/count เกิน
- [ ] Storage size estimator + report to admin

### Telemetry (P-14)
- [ ] Health ping every 5 min
- [ ] Error reporter wired to Firebase
- [ ] Admin dashboard shows: pings, errors, storage usage

### Sync (P-04, P-05, P-06, P-18)
- [ ] localStorage = per-device cache (not source of truth)
- [ ] Firebase = source of truth
- [ ] Timestamp `_ts` ทุก write
- [ ] Pull on app load with timestamp comparison
- [ ] Push updates local `_ts` after success
- [ ] Admin dashboard active polling

### Critical Operations (P-22)
- [ ] Defense in depth: primary path + secondary failsafe
- [ ] Single source of truth flag for coordination
- [ ] Each path checks flag before acting

### Credentials (P-07, P-11)
- [ ] Defaults hardcoded as fallback (Firebase URL, Telegram token)
- [ ] Admin can override via Settings
- [ ] Settings push to Firebase config → all devices pull
- [ ] Rotation procedure documented
- [ ] Real security via Firebase Rules + server proxy (not URL hiding)

### Firebase Rules (P-10)
- [ ] Whitelist path ของ app explicitly
- [ ] Test ด้วย Rules Simulator
- [ ] `$other: false` แต่ whitelist apps ที่ใช้

### Multi-AI (P-12, P-20)
- [ ] `AI_LOCK.md` exists
- [ ] Before sending to AI → pull latest from Git
- [ ] After AI returns → diff carefully + test e2e

### Process (P-21)
- [ ] Before refactoring → ask "fix root cause ได้ไหม?"
- [ ] Don't redesign to patch — only redesign when architecture truly bad

---

## 📦 Standard Files for Every App

```
{app_name}/
├── index.html                           ← single-file app
├── README.md                            ← what this app does
├── CAPTURE_LOG.md                       ← compounding loop captures (per project)
├── AI_LOCK.md                           ← multi-AI coordination (P-20)
├── DEPLOY_CHECKLIST.md                  ← pre-deploy checklist (from Codex)
├── SYNC_ARCHITECTURE.md                 ← how this app syncs
├── CREDENTIALS_ROTATION.md              ← bot/secret rotation (P-07)
├── FIREBASE_RULES.md                    ← current rules + history
├── BUILDER_CODEX.md                     ← this document (master reference, global)
└── cloudflare-worker-{name}.js          ← server-side dispatcher (P-22)
```

---

## 🧰 Debugging Toolkit

### Step 1: เช็ค Firebase URL
- Console → `fbEndpoint('test')` → ต้องคืน URL ไม่ใช่ null

### Step 2: เช็ค Firebase Rules
- เปิด `https://<project>.firebaseio.com/<path>.json` ใน browser
- ถ้า 401 → Rules block → ตรวจ whitelist (P-10)

### Step 3: เช็ค HTTP response
- DevTools → Network tab
- กระทำ action → ดู PUT/PATCH → response ต้อง 200

### Step 4: เช็ค localStorage
- DevTools → Application → Local Storage
- เช็ค `unsynced_*` keys

### Step 5: เช็ค console logs
- Filter `[FB]`, `[Notify]`, `[Cleanup]`, `[GlobalError]`

### Step 6: เช็ค Branch Health card
- Admin → ดู ping ของ device นั้น
- เห็น version, storage, errors

### Step 7: เช็ค Cloudflare Worker logs
- Cloudflare dashboard → Worker → Logs
- ดู cron execution + dispatch results

---

## 📚 Apps Adoption Matrix

| App | Status | Patterns Applied |
|---|---|---|
| **PuffStick Order** | Production v3.5.0 + Worker | P-01..P-22 ✅ ทั้งหมด |
| **Production app** | Planning | จะใช้ P-01..P-22 ตั้งแต่ day 1 |
| **POS v9** | Live | TODO: P-01, P-02, P-14, P-16 |
| **Pippa** | Commercial dev | จะใช้ทั้งหมด — public users |
| **PIKA** | Design draft | จะใช้ทั้งหมด — B2B sensitive |
| **Da'Neng v2** | Future | จะใช้ทั้งหมด |

---

## 🎯 Quick Reference Card

```
ก่อน deploy:
  ✓ r.ok check ทุก push (P-01)
  ✓ Mark & retry (P-02)
  ✓ Banner feedback (P-03)
  ✓ Version + no-cache + auto-update (P-08)
  ✓ Firebase rules whitelist (P-10)
  ✓ Element refs null-safe (P-17)
  ✓ Health ping + error report (P-14)
  ✓ Defense in depth สำหรับ critical ops (P-22)

เมื่อมีปัญหา:
  1. Firebase URL set? fbEndpoint test
  2. Rules allow? manual GET .json
  3. r.ok? DevTools Network
  4. unsynced_* keys?
  5. Console [FB] / [GlobalError] warnings?
  6. Branch Health card → ดู device
  7. Cloudflare Worker logs?

เมื่อ rotate credentials (P-07):
  1. Create new
  2. Test both work
  3. Update in app + push
  4. Wait for sync
  5. Revoke old

เมื่อ refactor (P-21):
  1. Fix root cause ก่อน
  2. ใช้ minimal change
  3. Don't redesign unless architecture truly bad
  4. Test e2e before push
```

---

## 🎓 Mantras

> **"Trust the data, not the silence."**
> Make the invisible visible — to admin first, before users have to call.

> **"Restore before redesign."**
> Don't rebuild what was working. Fix what's broken.

> **"Defense in depth — primary fast, secondary reliable."**
> Best of both: instant UX + 24/7 guarantee.

> **"Do → Capture → Upgrade."**
> Without compounding loop, AI just makes you repeat faster.

> **"Same link, always."**
> Whatever changes underneath, branches use the same URL forever.

---

## 📝 Changelog

| Version | Date | Highlights |
|---|---|---|
| **Builder Codex 1.0** | 2026-06-18 | Renamed from PuffStick Sync Codex; + Compounding Loop section; + CAPTURE_LOG.md standard; global scope |
| PuffStick Sync Codex 3.0 | 2026-06-18 | + P-21 (don't over-engineer) + P-22 (defense in depth) + Cloudflare Worker integration |
| PuffStick Sync Codex 2.0 | 2026-06-18 | + P-13..P-20 (telemetry, storage, multi-AI) |
| PuffStick Sync Codex 1.0 | 2026-06-14 | Original P-01..P-12 |

---

🛠️ Stay safe, ship reliable, let no order go silently lost. Compound, don't repeat.

— Tony × Claude · maya4artdev
