# 🤝 SESSION HANDOFF — PuffStick Order System

## ⚡ LATEST (2026-10-14) — read this block first; older notes below are history

**Live:** v3.8.2 (main, `97bcd00`). **Worker:** v2.2 (Cloudflare version 1b6b94de) — caption >1000 chars → short photo caption + full text via sendMessage. Token only in Worker secrets.

| Version | What |
|---|---|
| Worker v2.2 | Fix: Telegram caption limit 1024 → multi-location orders (b05 นครนายก) failed `tg-failed` deterministically |
| v3.6.1 | Branches cloud-fresh at login/preview/confirm/visibilitychange; field-level `patchBranchCloud`; orders PATCH without notify fields; Telegram sent after FB sync; Worker resend queue; login audit `branch_health/logins`; version marker only from newer build |
| v3.7.0 | Discount rule SSOT `puffstick/discount_rule {type pct|baht, value, minQty, note, ver}`; no node = legacy 10%/4500; orders snapshot `disc` + `discAmt`; in-app notice once per rule ver; acks `branch_health/rule_acks/{ver}/{branchId}` |
| v3.7.1 | `summarizeMonths()` → admin 📊 monthly report (fresh from Firebase), branch monthly history, monthly CSV |
| v3.7.2–3 | ONE save path `saveBlobAs` + `exportTable` (CSV + TSV copy). Mobile export sheet. In-app browsers (WebView: Messenger/LINE/FB — UA `Version/4.0`) cannot save files at all → sheet offers copy + "open in Chrome" |
| v3.8.0 | Token purge (client never stores/syncs `tgBotToken`; admin login PATCHes `config` to null); legacy token dispatcher + late-sync alert deleted (late-synced orders now send invoice via Worker); T7 branch picker + 5-wrong-PIN 5-min lockout (device remembers branch; wrong PINs logged `ok:false` → Branch Health 🔒); local order cache bounded to ~13 months |
| v3.8.1 | Invoice PNG text drawn below table lines on phones with large text (Android font scale / in-app WebView): html2canvas `FontMetrics` copies the already-scaled computed font-size into its baseline probe → scaled twice. Fix: `html.inv-capturing {text-size-adjust:100%}` only during capture; `renderInvoiceToCanvas` has ONE `finish()` exit |
| v3.8.2 | Branch auto-update, no tap. SSOT = Firebase `version` marker. Check on boot + foreground (`visibilitychange`) + every 5 min (`checkVersionThrottled`). `maybeAutoUpdate` reloads only when `isSafeToAutoReload`: landing / PIN empty / history / order page with 0 qty + no notes. Waits on qty, preview, success, `APP.orderInFlight` (FB save + Telegram), PIN typing; deferred update fires from `goPage`. 10-min loop guard `ps_autoupd`. Admin keeps banner. ONE reload path `reloadFromServer` (manual `forceReload` = confirm + same). Reload → landing, branch re-enters PIN (Tony chose B) |
| v3.8.3 | Lot rollback (SECURITY_PLAN_C §6). Admin deletes an order → only after the cloud DELETE returns ok, `rollbackLotIfLatest` reads FRESH cloud `branches_v2/_payload/{id}/currentLot`; if it equals `lotNo+1` and no other local order of that branch holds the same lot → `patchBranchCloud({currentLot: lotNo})`. Middle lot = gap kept (issued invoices never renumbered). Existing ตลาดยิ่งเจริญ lots 6/7 untouched. `deleteOrderFromFirebase` now returns Promise<ok> (P-01). Known window: a branch confirming in the same ~1 s as the admin delete could reuse the number — accepted (rare, admin-only action) |

**Decisions (Tony):** discount 1A baht-per-order or % · 2A global rule + per-branch toggle · 3A next order once then reset · 4B single tier · 5A rule change applies immediately · in-app notice only (no push) · default PINs kept for now to catch misuse via audit.
**Deploy step (v3.8.2+):** after every push, Tony opens the app once on his phone → new build writes the `version` marker → branches auto-update. Devices still on ≤3.8.1 get the old banner one last time.
**Lessons:** html2canvas + device text scaling = mismatched glyph baseline; desktop Chromium cannot emulate Android font scale → real-device check required. Deliverable files are named `<repo>_vX.Y.Z.html` (PuffStick + Pippa both shipped `index.html` into Downloads; a Pippa block pasted in this repo was stopped only by its precheck); every PowerShell block starts with `Set-Location` to its own repo. jsdom tests prove code paths, NOT that a phone saved a file — for platform behaviour ask for a real-device check + UA. Tony opens admin from Messenger (WebView) unless using the Chrome home-screen icon.
**POS/CRM:** POS (`puff-pos`) has no Firebase/Telegram usage (checked 2026-10-14). Orders gained `disc`, `discAmt`, `deviceId` — read `price`/`discAmt`, don't recompute `hasDiscount × 0.9`.
**Open:** v3.8.1 real-device test (Android font size max → test order → Telegram PNG). Resend clean PNG for คลอง 5 Lot 29 (admin 📤) once fixed build is on the sending device. Telegram bot token was public in Firebase until v3.8.0 → rotate it in BotFather + Worker secret when convenient. Default PINs `10xx` still in place (Tony's call).

---

> **From:** Claude session 2026-06-19 → 06-21
> **To:** Next AI instance
> **Working on:** PuffStick FC Order System (production)
> **Tony's project:** บจก. 92 คำอิ่ม / PuffStick franchise 20 branches

---

## 📖 READ FIRST (mandatory — 3 นาที)

1. **`AI_LOCK.md` v2.0** — constitution (rules, patterns, incident log, backlog)
2. **`puffstick-order-state.md`** — business logic + credentials (Project files)
3. **`puffstick-conventions.md`** — code patterns (Project files)

**อย่าเริ่มแก้ code จนกว่าจะอ่านครบ + ทำตาม Investigation Checklist (AI_LOCK §7)**

---

## ✅ COMPLETED THIS SESSION (v3.6.0)

### Architectural changes
- ✅ Replaced 3-Layer Telegram dispatch → single-path Worker proxy
- ✅ Cloudflare Worker deployed: `https://puffstick-telegram-notifier.92foodlimited.workers.dev`
- ✅ Cron trigger REMOVED (was `* * * * *`)
- ✅ Token moved from source code → Worker secrets (security goal)
- ✅ Atomic text+PNG dispatch (1 Telegram message instead of 2)
- ✅ Invoice template resized to A4 portrait (794×1123)
- ✅ Admin manual resend button in order history
- ✅ Dead code cleanup: -98 lines (3 unused functions removed)

### Features
- ✅ **F1:** Per-branch discount toggle (admin sets ON/OFF per branch card)
  - Default: ON (backward-compat with 20 existing branches)
  - OFF = no accumulation, no discount at all
  - Schema: added `discountEnabled: boolean` to branches_v2

### Bug fixes
- ✅ **B1:** Delete-aware order sync
  - Old bug: pullOrdersFromFirebase used union merge → deletion didn't propagate
  - Fix: remote-authoritative + `unsynced_orders` safeguard (P-02)
  - Now: delete on device A → propagates to device B on next pull

### Documentation
- ✅ AI_LOCK.md rewritten to v2.0 (comprehensive — see file for full log)

---

## 🚀 DEPLOY STATUS

**All code changes are in `/mnt/user-data/outputs/index.html`**

### Tony's deploy sequence (via browser upload to GitHub):
1. `index.html` — has ALL changes: Worker routing + F1 + B1 + cleanup
2. `AI_LOCK.md` — v2.0 doc (repo root)
3. `worker/index.js` — Worker code (deployed to Cloudflare already ✅)

**Verify after deploy:**
- View source live URL → search `8751318167` → must be **0 occurrences** (token removed)
- Test order → Telegram gets PNG + text as 1 message
- Admin history → "📤 ส่งใบส่งของ PNG ซ้ำ" button visible + works
- Branch list → toggle discount ON/OFF works
- Delete order from device A → device B pull → order disappears

---

## ⏳ PENDING / BACKLOG

### 🟡 Testing needed (Tony's next actions)
- Deploy latest `index.html` (has F1 + B1)
- Test F1: toggle discount → verify accumulation stops when OFF
- Test B1: delete PIN 0000 test orders on mobile → refresh desktop → confirm they disappear

### 🔵 Deferred features
- **D1:** Admin Notification Dispatcher card cleanup (~200 lines dead code)
  - Reason deferred: UI card still shows in Dashboard, Tony hesitant to lose visibility
  - When to do: only if new feature breaks it, or Tony asks
  - Redesign path: replace with Worker `/health` ping card

- **D2:** Hero/Logo image sync across devices
  - Reason: design choice (Firebase quota concern)
  - Workaround: edit base64 in source + push GitHub

- **D3:** `notifyLateSync` alert via Worker
  - Currently uses direct Telegram token → silent-fails after v3.6.0 token removal
  - When to do: only if Tony reports missing late-sync alerts

---

## 🚨 CRITICAL RULES (from AI_LOCK — do not violate)

### Investigation before fix
1. Fetch live URL FIRST — never trust `/mnt/project/`
   ```
   curl https://raw.githubusercontent.com/maya4artDEV/puffstick-order/main/index.html
   ```
2. Get Firebase export — look at `notifiedBy`, `notifyAttempts` fields
3. Ask "all devices or one device?" before assuming systemic bug
4. Check phone/app settings before blaming code

### Code changes
- `var` only (no let/const)
- `function(){}` only (no arrow functions in render)
- String concat only (no template literals — nested caused prod crash)
- `str_replace` one location at a time — never regenerate whole file
- Diff > 100 lines = wrong approach, stop and ask

### Don't touch
- `FB_DEFAULT_URL` + `FB_DEFAULT_PATH` + `WORKER_URL` at top of script
- Telegram token — must stay in Cloudflare Secrets only
- Firebase paths (`puffstick/branches_v2`, `orders`, `config`, `branch_health`)
- Worker code without confirming with Tony

### Communication style
- Thai for discussion, English for code
- No apology spam
- Diagnostic-first — never shotgun 4 fixes at once
- Quote Tony's principle: "ยิ่งแก้ยิ่งซับซ้อน" as guard rail
- Push back when he's wrong — don't just agree

---

## 🎓 LESSONS FROM THIS SESSION (don't repeat these mistakes)

1. **Read the live file, not `/mnt/project/`** — I wasted 3 turns investigating a stale cached file
2. **Check Firebase data before blaming code** — the `notifiedBy: 'cloudflare-worker'` field would have told me the root cause immediately
3. **Ask "all devices or one?"** — I assumed systemic bug when Tony's test showed only 1 device affected
4. **Don't shotgun fixes** — I proposed 4 fixes before knowing root cause; Tony corrected me
5. **Check phone settings before code** — Telegram notification issue turned out to be Android permission OFF, not code
6. **Trust the data, not the briefing** — Tony's brief said "features stable" but the file was different

---

## 🎯 IF TONY REPORTS A NEW BUG IN NEXT CHAT

**Investigation Order (from AI_LOCK §7):**

```
1. Fetch live URL from GitHub raw
2. Ask Tony for Firebase export
3. Ask "reproducible on all devices, or one?"
4. Ask "did anything change recently?" (deploy, phone settings, network)
5. Check Branch Health JS Errors panel
6. Check phone/app settings (if UX-related)
7. THEN look at code — with hypothesis, not shotgun
```

**Don't:**
- Assume you know what changed based on briefing
- Propose multiple fixes before verifying root cause
- Skip Firebase data — it's the ground truth
- Trust `/mnt/project/` — always verify against live

---

## 📁 KEY FILES REFERENCE

| File | Location | Purpose |
|---|---|---|
| `index.html` | GitHub main + `/mnt/user-data/outputs/` | Production frontend v3.6.0 |
| `worker/index.js` | `/mnt/user-data/outputs/worker/` | Cloudflare Worker (deployed) |
| `AI_LOCK.md` | GitHub main + `/mnt/user-data/outputs/` | AI constitution v2.0 |
| `puffstick-order-state.md` | Project files | State + business logic |
| `puffstick-conventions.md` | Project files | Code rules |
| `BUILDER_CODEX.md` | GitHub main | P-01 to P-22 patterns |

---

## 📞 QUICK CONTEXT FOR NEW AI

**Tony is:**
- Solo builder + tech lead + designer
- Runs 92 Food Limited (PuffStick franchise, 20 branches)
- Prefers Thai discussion, English code/docs
- Direct, no-nonsense, corrects mistakes immediately
- Values simplicity: "ยิ่งแก้ยิ่งซับซ้อน" (the more you fix, the more complex)
- Uses this app in production — real customers depending on it

**System stack:**
- Frontend: single-file HTML/JS on GitHub Pages
- Backend: Firebase Realtime Database (`puffstick/` path)
- Notifications: Cloudflare Worker → Telegram sendPhoto
- No build tools, no npm, no framework

**Latest deploy: v3.6.0** — 2026-06-21

---

> **Signed off by previous AI session — 2026-06-21**
> **Tony, safe travels to next chat 🌙**
