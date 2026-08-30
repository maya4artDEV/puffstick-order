---
name: debugging-discipline
description: Activate BEFORE proposing any fix for a bug, intermittent issue, or unexpected behavior. Mandatory trigger when user reports symptoms like "ยังผิด", "intermittent", "sometimes works", "works locally but not in production", "เกิดเฉพาะบางหน้า/บางคน", "ทำไมหน้านี้พังหน้านั้นไม่พัง", "I've tried fixing this 3+ times". CRITICAL: This skill stops AI agents from guessing fixes — it forces measuring before theorizing, holding multiple hypotheses, treating user reports as ground truth (not arguing back), and 6-layer verification before claiming "done". Use INSTEAD of jumping to solution. If you find yourself thinking "I bet it's X" before measuring — this is the trigger.
---

# Debugging Discipline

> **Purpose:** Stop AI agents from guessing fixes. Force evidence-based debugging.
> **When to load:** ก่อน propose fix ทุกครั้งที่เกี่ยวข้องกับ bug / unexpected behavior
> **Codex layer:** L5 Meta-cognitive (controls how AI thinks, not what it codes)

## The Core Problem This Skill Fixes

AI agents have 4 instincts that cause debugging disasters:

1. **เดา** — jump to "I bet it's X" before measuring
2. **โกหก** — claim "fixed" without proving causation
3. **ทำเกิน** — propose elaborate fix when simple measurement would diagnose
4. **ลืม** — argue with user's symptom report instead of treating it as truth

This skill forces 7 disciplines + 6-layer verification to combat all 4.

---

## 🚦 The First Question (always)

Before ANY action, answer:

> **"Am I about to theorize, or measure?"**

If theorize → **STOP**. Go to D1 (Measure First).
If measure → proceed.

This is the load-bearing question. 80% of bad debugging starts with skipping it.

---

## 7 Disciplines

### D1. Measure Before Theorize

**Rule:** No hypothesis without ≥1 concrete measurement first.

**What "measure" means by bug type:**
| Bug type | Measurement tool |
|---|---|
| Layout / UI | DevTools Computed panel — read parent width, child width, flex values |
| Logic / state | Console.log actual values OR step debugger OR inspect storage |
| Async / timing | Log timestamps before/after, watch order of operations |
| Network | DevTools Network tab — request, response code, timing |
| Data | Query the DB / storage directly, see actual stored values |
| Multi-actor | Reproduce with 2 sessions/devices, observe real interaction |

**Anti-pattern (forbidden):**
> "ปัญหาน่าจะอยู่ที่ CSS ของ badge — ลองแก้ position: absolute ดู"
> ← ไม่มีการวัด เป็น guess ล้วน

**Correct:**
> "ก่อนแก้ — ขอ DevTools Computed width ของ #badge + parent .container ทั้งหน้าที่ทำงานและไม่ทำงาน"
> ← measurement first

---

### D2. Hold 3-5 Hypotheses — Disprove, Don't Prove

**Rule:** หลังมีข้อมูลแล้ว ต้องตั้ง 3-5 hypotheses ก่อน design fix และพยายาม **disprove** แต่ละข้อ

**Why disprove instead of prove:**
- การ "prove" → confirmation bias → หาแต่หลักฐานสนับสนุน
- การ "disprove" → ตัดออกได้จริง → เหลือข้อที่เป็นไปได้สูงสุด

**Format:**
```
Hypothesis 1: <claim>
Test to disprove: <observable result if H1 is wrong>
Result: <PASS = disproven / FAIL = still possible>

Hypothesis 2: <claim>
Test to disprove: ...
```

**Anti-pattern:**
> "ผมว่าเป็น CSS — แก้แล้วน่าจะหาย"
> ← 1 hypothesis ที่ไม่มี disproving test

**Correct:**
> "5 hypotheses:
> H1: CSS rule override — disprove by Computed panel (rule active = H1 ผิด)
> H2: Flex value wrong — disprove by Computed panel
> H3: DOM structure ผิด — disprove by count div depth
> H4: JS mutates style — disprove by remove JS, reload
> H5: Browser cache — disprove by hard reload"

---

### D3. Symptom = Ground Truth

**Rule:** เมื่อ user report ขัดกับ mental model ของเรา — **model ผิด ไม่ใช่ความจริงผิด**

**Triggers that should make you pause:**
- User says "ยังผิด" → STOP arguing, re-investigate
- "I tried that already" → believe them, change angle
- "It works on my machine" → environment diff is the bug, not user's mistake
- "Sometimes works" → not random — there's a hidden variable

**Anti-pattern:**
> User: "ยังผิดอยู่"
> AI: "แต่ผมแก้แล้วนะ ลองเคลียร์ cache ดู / ไฟล์เก่าหรือเปล่า"
> ← arguing with ground truth

**Correct:**
> User: "ยังผิดอยู่"
> AI: "รับทราบ ขอข้อมูล: ตอนนี้เห็นอะไร? ส่ง screenshot + console output ได้ไหม? ผมจะ re-investigate"

---

### D4. Differential Debugging

**Rule:** บั๊กอยู่ใน **diff** ระหว่างที่ work กับที่ไม่ work เสมอ

**Compare:**
- Page that works vs page that breaks
- Device that works vs device that breaks
- Time before bug vs after bug (git bisect)
- User A who has it vs User B who doesn't
- Environment dev vs production

**Smallest diff = highest signal.** บั๊กซ่อนใน detail ที่เล็กที่สุด

**Process:**
```
1. Identify "working case" (must be ≥1 known-good baseline)
2. Identify "broken case"
3. List ALL differences (no matter how trivial)
4. Eliminate differences one-by-one until cause isolated
```

**Example:**
- Overview page works (810px width) / Plan page broken (149px width)
- Diff: ? → ตรวจ DOM structure → พบ extra `</div>` → fixed

---

### D5. Right Tool for Bug Type

**Rule:** ใช้ "เครื่องมือ inspect ตรงกับ bug type" ไม่ใช่ debugger-first ทุกครั้ง

**Don't default to one tool:**
| Bug type | First tool (cheapest, highest signal) |
|---|---|
| Layout | DevTools Computed + Elements panel |
| Visual rendering | DevTools Layers + screenshot diff |
| Logic | Console.log key values OR debugger breakpoint |
| Async / order | console.log with timestamps |
| Network failure | DevTools Network tab |
| Storage / persistence | DevTools Application tab → inspect actual data |
| Race condition | Add logging at every actor, reproduce with delay |
| Build / deploy | Check deployed artifact (md5/hash) vs source |
| Performance | DevTools Performance tab profile |

**For AI agents specifically (no live debugger):**
- Grep file for actual content
- Ask user to read specific computed value
- Run script against actual file
- **Measure real artifact, never assume from memory**

---

### D6. Toggle Test (Prove Causation, Not Just Correlation)

**Rule:** เจอ "สาเหตุ" ยังไม่พอ — ต้อง **toggle** ดูว่า symptom มา-หายตามได้

**The test:**
```
1. Apply fix    → bug should disappear
2. Revert fix   → bug should return
3. Apply again  → bug should disappear again
```

ถ้าทำได้ทั้ง 3 → causation proven
ถ้าทำไม่ได้ → แค่ correlation อาจมีสาเหตุอื่น

**Anti-pattern:**
> "แก้ละ ผ่าน ✅"
> ← ไม่ได้ revert ทดสอบ

**Correct:**
> "Toggle test: revert change → bug returns confirmed
> apply change again → bug gone confirmed
> Causation proven. Safe to commit."

---

### D7. Reproduce as Goal, Not Gate

**Rule:** Reproduce เป็น **เป้าหมาย** ไม่ใช่ ประตูที่ไม่ผ่านแล้วยอมแพ้

**If can reproduce directly:**
→ great, use it to test hypotheses

**If can't reproduce directly:**
- ❌ Don't say "I can't reproduce, no idea" และเดา fix
- ✅ Do: change task to "make it reproducible"
  - Add logging / telemetry
  - Narrow conditions
  - Collect multiple occurrences
  - Find correlation pattern

**The forbidden response:**
> "ผมไม่สามารถ reproduce ได้ — ลองแก้ X ดู น่าจะใช่"
> ← reproduce fail + เดา = double failure

**Correct:**
> "Reproduce ไม่ได้ตรงๆ — propose: เพิ่ม logging ที่ X / Y / Z แล้ว deploy
> รอเก็บ ≥3 occurrences ก่อน design fix
> ไม่แก้ blind"

---

## 🔒 6-Layer Verification (Before Claiming "Fixed")

ห้าม claim "เสร็จ" จนกว่าผ่าน 6 layers นี้:

### V1. Toggle Test
- Apply fix → bug gone
- Revert fix → bug returns
- Apply again → bug gone

### V2. Regression Check
- เคสที่ดีอยู่แล้ว ยังดีไหม?
- (ในตัวอย่าง: Overview page ที่ work อยู่ ยังต้อง work)

### V3. All Instances
- ทุกหน้า/case ที่ report ว่าพัง → ต้องหายหมด ไม่ใช่แค่ที่ทดสอบ
- (Plan, Variance, Record, FG Stock — ทุกอันต้องหาย ไม่ใช่แค่ Plan)

### V4. Minimality — No Compensating Hack
**🚨 สำคัญที่สุด:** ถ้ายังเห็น `calc()`, negative margin, `!important`, position absolute, z-index ที่ใส่เพื่อ "ชดเชย" — **ยังกลบอยู่ ไม่ใช่แก้**

> "ถ้ารู้สึกว่ากำลัง edit เพื่อ compensate มากกว่า root fix → หยุด"

### V5. Automated Check Re-runs
- Lint pass
- Type check pass
- Syntax check (เช่น `node --check`)
- DOM structure script (div depth balance)
- Test suite pass

### V6. Verify Deployed Artifact
- ตรวจ deployed version จริง — ไม่ใช่ source ในหัว
- Hard reload + clear cache
- Check md5/hash ของไฟล์ที่ deploy = ตรงกับ source ที่ commit
- "ผมเขียนแล้ว" ≠ "deploy แล้ว"

---

## 🎬 Output Format When Skill Active

เมื่อ skill นี้ trigger ทุกการตอบ Nova/AI ต้องใช้ structure:

```
[DEBUGGING DISCIPLINE ACTIVE]

Bug summary: <what user reported>

Step 1 — Measurements taken:
- <measurement 1 + actual value>
- <measurement 2 + actual value>

Step 2 — Hypotheses (3-5):
H1: <claim> — Test to disprove: <how>
H2: ...
H3: ...

Step 3 — Differential:
- Works: <case + value>
- Broken: <case + value>
- Smallest diff: <isolated variable>

Step 4 — Proposed fix:
<fix>

Step 5 — Verification plan (6 layers):
[ ] V1 Toggle test: ...
[ ] V2 Regression: ...
[ ] V3 All instances: ...
[ ] V4 Minimality: ...
[ ] V5 Automated check: ...
[ ] V6 Deployed artifact: ...

PROCEED? <wait for user confirm — do not implement until measurements done>
```

---

## 🚨 Red Flag Phrases — Self-Check

ถ้า Nova/AI พิมพ์/คิดประโยคพวกนี้ → **trigger skill ทันที**:

- "I bet it's..."
- "น่าจะเป็นที่..."
- "ลองแก้ X ดูก่อน"
- "Should work now"
- "Maybe try..."
- "อาจจะเป็น..."
- "Probably the issue is..."
- "Quick fix: ..."
- "Try this: ..."

ทุกประโยคพวกนี้ = AI กำลัง **theorize without measurement** = skill เข้าควบคุม

---

## 🪞 Anti-patterns (Real Failures to Learn From)

### Anti-pattern 1: "Element ผิด ก็แก้ element" (skip parent)
```
User: "Badge แสดงผิด"
❌ AI: แก้ CSS ของ badge → ไม่หาย → แก้อีก → 6 รอบ
✅ AI: วัด parent ของ badge ก่อน → เห็น parent width = 149px (ควรเป็น 810px)
       → ปัญหาที่ parent ไม่ใช่ badge
```

### Anti-pattern 2: "ใช้ DevTools เพื่อพิสูจน์ตัวเองถูก"
```
❌ AI: แก้ position: absolute → เปิด DevTools เพื่อ confirm CSS rule active
✅ AI: เปิด DevTools เพื่อหา anomaly — วัดทุกชั้นของ parent, ดู computed values
       เทียบกับสิ่งที่คาด
```

### Anti-pattern 3: "เถียงกับ user ที่บอกว่ายังผิด"
```
User: "ยังผิดนะ"
❌ AI: "แต่ผมแก้แล้ว — เคลียร์ cache หรือยัง?"
✅ AI: "รับทราบ ขอ screenshot ปัจจุบัน + DevTools value — re-investigate"
```

### Anti-pattern 4: "Compensating hack แทน root fix"
```
❌ AI: "เพิ่ม margin-left: -50px เพื่อให้ badge ไปอยู่ที่ที่ควร"
       → กลบ symptom, root cause ยังอยู่
✅ AI: หาว่าทำไม badge อยู่ผิดที่ → root cause = parent layout → fix parent
```

### Anti-pattern 5: "Claim fixed without toggle test"
```
❌ AI: แก้ → "เสร็จแล้ว ✅"
✅ AI: แก้ → revert → bug returns → apply → bug gone → "Causation proven ✅"
```

---

## 🎯 Quick Decision Tree

```
User reports bug
  │
  ├── Am I about to theorize before measuring?
  │     YES → STOP. Go to D1.
  │     NO  → continue
  │
  ├── Have I measured ≥1 concrete value?
  │     NO  → measure first
  │     YES → continue
  │
  ├── Do I have 3-5 hypotheses?
  │     NO  → generate, with disproving test for each
  │     YES → continue
  │
  ├── Have I compared working vs broken case?
  │     NO  → do differential debugging
  │     YES → continue
  │
  ├── Propose fix
  │
  ├── Pass all 6 verification layers?
  │     NO  → keep investigating
  │     YES → safe to commit
  │
  └── Toggle test passed?
        NO  → not proven causation, keep going
        YES → ✅ done
```

---

## 🧬 Connection to Builder Codex

This skill operationalizes:
- **4 AI Misbehaviors framework** — directly combats เดา (D1, D2) + โกหก (V1-V6) + ทำเกิน (V4) + ลืม (D3)
- **P-29 Spec-Driven** — verification layers = spec for "fixed"
- **P-30 AI as Second Reviewer** — disproving hypothesis = self-review
- **P-31 R0/R1/R2** — debugging fixes are usually R1 (must report what + why + rollback)
- **Compounding Loop** — every bug caught → log to MEMORY.md + CAPTURE_LOG

When a bug exposes a new pattern (e.g., "extra div in 10k-line HTML"), promote it to Codex Pattern Library.

---

## 📝 Memory Capture Format (when skill prevents a bad fix)

```markdown
[date] — debugging-discipline prevented:
- About to: <bad action AI almost took>
- Caught by: <which discipline D1-D7 or V1-V6>
- Real cause: <actual root>
- Time saved: <estimate>
- New pattern? <if recurring across projects, promote>
```

---

## 🪐 Final Rule

**If you feel certain about the cause without measuring — that certainty is the bug.**

The bugs that this skill catches are the bugs you don't see coming. They feel "obvious" until you measure and realize the obvious answer was wrong.

Trust measurements over intuition. Trust user symptoms over your model. Verify causation, not correlation. Six layers before "done".

---

*Synthesized from: Tony's debugging framework + Nova's Role Banner post-mortem + universal debugging discipline literature. Universal across stack — applies to layout, logic, async, network, data, multi-actor bugs equally.*
