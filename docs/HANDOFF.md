# 🤝 SESSION HANDOFF — PuffStick Order System

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
