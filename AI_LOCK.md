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
