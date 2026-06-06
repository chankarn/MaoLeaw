# PRD — MaoLeaw (เมาแล้ว) Event & Bill Splitter

> **Codename:** MaoLeaw
> **Author:** chanakarn.s
> **Last updated:** 2026-05-23
> **Status:** Draft v1.0

---

## 1. Feature Overview & KPIs

### 1.1 Problem Statement
กลุ่มเพื่อน/ก๊วนสังสรรค์มักประสบปัญหาในการ:
- **เก็บข้อมูลผู้เข้าร่วมงาน** ว่าใครจะมา ใครกินอะไร (เหล้า/เบียร์/ไม่กินแอล)
- **หารค่าใช้จ่าย** ที่ไม่แฟร์ เพราะคนที่ไม่กินแอลต้องช่วยจ่ายค่าเหล้า/เบียร์ด้วย
- **ติดตามบิล** หลังงานเลิก ใครต้องโอนเท่าไหร่ ไม่มีระบบกลาง

### 1.2 Solution
ระบบ 2 ส่วน:
1. **LIFF Web** (ฝั่ง user) — ติดกับ Rich Menu ของ LINE OA สำหรับ register, ดู events, join events, ดู bill
2. **Admin Web** (ฝั่ง admin) — สำหรับสร้าง/แก้ไข event, สร้าง bill, จัดการ member

### 1.3 KPIs / Success Metrics
| Metric | Target |
|---|---|
| Active user (LIFF) | 80%+ ของก๊วน register ภายใน 2 สัปดาห์ |
| Event submission rate | ≥ 90% ของผู้เข้าร่วมจริงกด "เข้าร่วม" ก่อนงาน |
| Bill payment cycle | ปิดบิลภายใน 7 วันหลัง event |
| LIFF load time (4G) | < 2.5s |
| Free-tier cost | $0/เดือน (ภายในขีดจำกัด free quota) |

### 1.4 Out of Scope (Phase 1)
- ระบบ verify การจ่ายเงินจริง (ยึดความซื่อสัตย์, admin mark paid เอง — ดูใน Phase 2)
- Multi-tenant (รองรับกลุ่มเดียวก่อน)
- Mobile native app
- Push notification ไปยัง browser (ใช้ LINE Push แทน)
- **Chat command bot (Reply)** — ดู §11 Phase 2 (F-7)
- **โหมดหารบิลทั่วไป (standalone bill, ไม่ผูก event)** — ดู §11 Phase 2 (F-8 / A-8)

---

## 2. Target Platforms & User Roles

### 2.1 Platforms

| Component | Platform | Framework | Hosting |
|---|---|---|---|
| LIFF Web | LINE LIFF (mobile-first WebView) | Next.js 16 (App Router) | Vercel (free) |
| Admin Web | Desktop-first Responsive Web | Next.js 16 | Vercel (free) |
| API | REST (JSON) | NestJS 11 | Render (free, มี cold start) |
| Database | PostgreSQL 16 | Prisma ORM | Supabase (free, 500MB) |
| Notification | LINE Messaging API (Push) | — | LINE OA (free 500 msg/เดือน) |

> **Note on cold start:** Render free tier sleep หลัง inactive 15 นาที → request แรกใช้ ~50s. แนะนำใช้ cron-job.org (ฟรี) ping `/health` ทุก 10 นาทีในช่วงเวลาใช้งาน (เช่น 17:00–02:00).

> **Note on Supabase pause:** Supabase pause project ถ้า inactive 1 อาทิตย์. แก้โดย cron ping ทุก 6 วัน หรือ admin ใช้งานสม่ำเสมอ.

### 2.2 User Roles

| Role | Auth | Access |
|---|---|---|
| **Guest (LIFF)** | ยังไม่ register | เฉพาะหน้า Register |
| **Member (LIFF)** | LINE Login + registered | ดู events, join, edit profile, ดู my events, ดู bill |
| **Admin (Web)** | Email/Password (JWT) | CRUD event, bill, member; ดู dashboard ทุก event |

---

## 3. User Stories & Functional Workflows

### 3.1 LIFF Web — User Flows

#### F-1: Login & Register (First-time)
```
User กด Rich Menu → เปิด LIFF
  ↓
LIFF auto-login (liff.login) → ได้ lineUserId, displayName, pictureUrl
  ↓
Backend: ค้น member by lineUserId
  ├─ พบ → ไปหน้า Main (F-2)
  └─ ไม่พบ → ไปหน้า Register
       ↓
       Register Form:
         • ชื่อ (text, default = LINE displayName, แก้ไขได้)
         • เครื่องดื่มที่ชอบ (dropdown: เหล้า / เบียร์) — required
         • ประเภท (dropdown: เด็ก BD / เด็ก TL / เด็ก KU / เพื่อนอีสเหล้า / อื่นๆ) — required
       ↓
       กด "ลงทะเบียน" → POST /members → กลับหน้า Main
```

**Edge cases:**
- ถ้า user ปฏิเสธสิทธิ์ LINE Profile → แสดง error "กรุณาอนุญาตเพื่อใช้งาน" + ปุ่ม retry
- ถ้าเปิดนอก LINE app (เปิด LIFF URL ตรงๆ) → redirect ไปยัง LINE
- displayName/pictureUrl จะถูก **sync จาก LINE ทุกครั้งที่ login** (เผื่อ user เปลี่ยนรูป/ชื่อใน LINE)

#### F-2: Main Page (Active Events)
```
แสดง list ของ events ที่:
  - status = 'active'
  - eventDate ≥ today - 1 day (กันเหลื่อมเวลา timezone)

แต่ละ item แสดง:
  • ชื่อ event
  • วันที่จัด (format: 23 พ.ค. 2026 - 19:00)
  • ร้านที่ไป
  • สถานะ badge (กำลังจะมาถึง / วันนี้ / ผ่านมาแล้ว — แต่ยังอยู่ใน list)

Header: รูปโปรไฟล์ LINE + ชื่อ (จาก liff.getProfile cached)
Bottom Tab: Main | My Events | Profile
```

#### F-3: Event Detail — Pre-event (eventDate > now)
```
หน้านี้เป็น "Dashboard ผู้เข้าร่วม":
  • ข้อมูล event (ชื่อ, วันที่, ร้าน, จำนวนคนรวม)
  • Stats card:
      - Total attendees: 12 คน
      - Pie/Bar chart: เหล้า X% / เบียร์ Y% / ไม่กินแอล Z%
  • List ผู้เข้าร่วม:
      - รูปโปรไฟล์ + ชื่อ + เครื่องดื่มที่จะกิน
      - (ถ้าเป็นตัวเองมี badge "คุณ")
  • ปุ่ม [เข้าร่วมงาน] (sticky bottom)
      ├─ ยังไม่เคย submit → label "เข้าร่วมงาน"
      └─ submit แล้ว → label "แก้ไขการเข้าร่วม"

กด ปุ่ม → เปิด Dialog (Modal):
  Form:
    • ชื่อ (default = member.displayName, แก้ไขได้)
    • เครื่องดื่มที่จะกิน (radio: เหล้า / เบียร์ / ไม่กินแอล)
      └─ default = member.preferredDrink
    • [Submit] (disabled จนกว่าทุก field จะกรอกครบ)

  Note: การร่วมหารค่ามิกเซอร์ (หรือเหล้า/เบียร์ข้ามประเภท) — admin เป็นคน
  pick รายคนตอนสร้างบิล ไม่ใช่ user เลือกตอน submit

  Submit → POST /events/:id/submissions → toast "บันทึกแล้ว" + ปิด dialog + refresh stats
```

**Edge cases:**
- ถ้า admin ลบ event ระหว่าง user เปิด dialog → submit returns 404 → show toast + redirect Main
- Optimistic UI: update list ทันทีก่อน server confirm

#### F-4: Event Detail — Post-event (eventDate < now AND bill exists)
```
แสดงหน้า "บิลของคุณ":
  • ข้อมูล event (header)
  • ยอดที่ต้องจ่าย: ฿XXX
  • Breakdown:
      - ค่าอาหาร/หารทุกคน: ฿XX
      - ค่าเครื่องดื่ม (เหล้า/เบียร์): ฿XX
      - ค่ามิกเซอร์: ฿XX (แสดงเฉพาะคนที่ admin เพิ่มให้ร่วมหาร)
  • ช่องทางการรับเงิน (ขึ้นกับ bill.paymentType ที่ admin ตั้งไว้):
      ─ PROMPTPAY:
          - generate QR จาก bill.promptpayId + amount ผ่าน promptpay-qr (client-side, ไม่กิน storage)
          - ปุ่ม "บันทึกรูป" (download QR PNG)
      ─ BANK:
          - แสดงข้อมูลบัญชี: logo + ชื่อธนาคาร, เลขบัญชี, ชื่อบัญชี, ยอดที่ต้องจ่าย
          - ปุ่ม "คัดลอกเลขบัญชี" (copy to clipboard)
  • Status: [⏳ รอชำระ] หรือ [✅ ชำระแล้ว]
```

**Edge cases:**
- ถ้า user submit แต่ admin ยังไม่ปิดบิล → แสดง "รอ admin คิดบิล"
- ถ้า user ไม่ได้ submit เข้าร่วม → แสดง "คุณไม่ได้เข้าร่วมงานนี้"

#### F-5: My Events
```
List events ที่ user เคย submit เข้าร่วม:
  • Sort: วันที่จัด (DESC)
  • Filter built-in (chip): ทั้งหมด / กำลังจะมา / ผ่านแล้ว
  • แต่ละ item เหมือน F-2 แต่มี badge "✓ เข้าร่วม"
  • Tap → ไป F-3 หรือ F-4 ตามเงื่อนไขเวลา
```

#### F-6: Edit Profile
```
ฟอร์ม:
  • ชื่อ (text)
  • เครื่องดื่มที่ชอบ (dropdown: เหล้า / เบียร์)
  • ประเภท (dropdown: เด็ก BD / เด็ก TL / เด็ก KU / เพื่อนอีสเหล้า / อื่นๆ)
  • [บันทึก]

Note: รูปและ LINE display name แก้ไขใน LINE app เอง (อ่านอย่างเดียว)
```

---

### 3.2 Admin Web — Admin Flows

#### A-1: Login
```
Email + Password → POST /auth/admin/login → JWT (httpOnly cookie, 7d)
Middleware ใน Next.js ตรวจ cookie ทุก route ยกเว้น /login
```

**Initial admin seed:** SQL migration หรือ CLI command `npm run seed:admin` (รัน manual ครั้งแรก).

#### A-2: Sidebar Navigation
```
┌─ Logo "MaoLeaw Admin"
├─ 📅 Events
├─ 💵 Bills
├─ 👥 Members
└─ ⚙️  Settings (logout, change password)
```

#### A-3: Events Table
```
Columns: Name | Date | Venue | Status | Attendees | Actions
Filter: Status (All / Active / Inactive), Date range
Search: by name/venue
Actions per row:
  [👁 View]  → ดู attendee list
  [✏️ Edit]  → ไปหน้า Create/Edit (A-4)
  [🗑 Delete] → confirm dialog → soft delete (set deletedAt)
  [💵 Create Bill] → ไปหน้า Bill create พร้อม pre-select event นี้

Top right:
  [+ Create Event] → A-4
```

#### A-4: Event Create/Edit
```
Form:
  • ชื่องาน (text, required, max 100)
  • ร้าน (text, required, max 200)
  • วันเวลาที่จัด (datetime-picker, required)
  • Status (dropdown: Active / Inactive, default Active)
  • [Save] [Cancel]
```

#### A-5: Bills Table
```
Columns: Bill Name | Event | Created Date | Total | Status | Actions
Status: Draft / Sent / Closed
Actions:
  [👁 View Detail]
  [✏️ Edit]  (อนุญาตเฉพาะ Draft)
  [📨 Send to Members] → trigger LINE Push (เปลี่ยน status → Sent)
  [🔒 Close]  → lock submissions (เปลี่ยน status → Closed)
  [🗑 Delete] (hard delete, allowed only for DRAFT/SENT — CLOSED is locked)

Top: [+ Create Bill]
```

#### A-6: Bill Create/Edit
```
Form:
  • ชื่อบิล (text, required)
  • Event (dropdown — load events ที่ status active หรือผ่านมาแล้วและยังไม่มี bill)
  • รายการ (dynamic list, มี [+ เพิ่มรายการ]):
      Row:
        - ชื่อ (text)
        - ราคา (number, ≥ 0)
        - ประเภท (dropdown: เหล้า / เบียร์ / มิกเซอร์ / หารทุกคน / เลือกเอง)
        - ร่วมหาร: 👥 N คน  [ปุ่มขึ้นกับประเภท ดูด้านล่าง]
            ─ เหล้า / เบียร์ / มิกเซอร์:
                └─ default set ตามประเภท + ปุ่ม [+ เพิ่มคน]
                   → popover แสดงคนนอก default (checkbox ติ๊กเพิ่ม)
            ─ หารทุกคน:
                └─ แสดง "ทุกคน (K คน)" อย่างเดียว ไม่มีปุ่มเพิ่ม
            ─ เลือกเอง:
                └─ checklist ของ attendees ทั้งหมด (pre-deselect ทั้งหมด)
                   admin ติ๊กเองอิสระ ต้องเลือกอย่างน้อย 1 คน
                   แสดง chip ชื่อที่เลือก + จำนวน "N คน"
        - [🗑]
  • Summary (auto-calc):
      Total: ฿XXX
      Liquor items: ฿XX (หาร eligible_i คน → ฿YY/คน)
      Beer items: ฿XX (หาร eligible_i คน → ฿YY/คน)
      Mixer items: ฿XX (หาร eligible_i คน → ฿YY/คน)
      Shared items: ฿XX (หารทุกคน K คน → ฿YY/คน)
      Custom items: ฿XX (หาร N คนที่เลือก → ฿YY/คน)
      *eligible_i คือ:
        - ประเภทอื่น: คน default ตามประเภท ∪ extraMemberIds
        - เลือกเอง: เฉพาะ customMemberIds ที่ admin เลือก (ไม่มี default)
  • ช่องทางการรับเงิน (required):
      Radio: [● PromptPay  ○ ธนาคาร]
      ─ PromptPay:
          - PromptPay ID (text, 10–15 digits, default จาก env PROMPTPAY_ID)
      ─ ธนาคาร:
          - ธนาคาร (dropdown: 13 ธนาคารหลัก — กรุงเทพ / กสิกร / กรุงไทย / SCB /
            กรุงศรี / TTB / ออมสิน / ธ.ก.ส. / ธอส. / UOB / CIMB / LH / TISCO / KKP)
          - เลขบัญชี (text, required)
          - ชื่อบัญชี (text, required)
  • Preview ตารางคิดเงินรายคน
  • [Save Draft] [Save & Send]
```

#### A-7: Members Table
```
Columns: Picture | Name | LINE Display Name | Type | Preferred Drink | Registered Date | Total Events | Actions
Search: by name
Filter: by type (เด็ก BD / TL / KU / etc.)
Actions: [👁 View] (ดู events ที่เข้าร่วม) | [🚫 Ban] (soft, ห้าม login)

> ไม่มี Create Member — register เฉพาะผ่าน LIFF
```

---

### 3.3 Bill Calculation Logic (Critical)

```
สำหรับ bill ที่ผูกกับ event E:
  attendees = list ของ submission ใน event E (after closed)

  สำหรับแต่ละ item i ใน bill:
    if i.type == 'shared':
      eligible = attendees                                    # ทุกคน
    elif i.type == 'liquor':
      base = attendees.filter(drink == 'liquor')
      eligible = base ∪ attendees.filter(id in i.extraMemberIds)
    elif i.type == 'beer':
      base = attendees.filter(drink == 'beer')
      eligible = base ∪ attendees.filter(id in i.extraMemberIds)
    elif i.type == 'mixer':
      base = attendees.filter(drink in ['liquor', 'beer'])
      eligible = base ∪ attendees.filter(id in i.extraMemberIds)
    elif i.type == 'custom':
      eligible = attendees.filter(id in i.customMemberIds)   # admin เลือกเองทั้งหมด

    if len(eligible) == 0: skip (warning to admin)
    perPerson_i = i.price / len(eligible)
    → add perPerson_i ให้คนใน eligible

  → คนที่เลือก 'ไม่กินแอล' จ่ายเฉพาะ shared + custom items ที่ admin เลือกชื่อไว้
    (เว้นแต่ admin จะ extraMemberIds เข้า liquor/beer/mixer เป็นรายตัว)

ปัดเศษ: round up ทศนิยม → ส่วนต่างเป็น "tip" ที่ admin/เจ้าภาพรับไป
```

---

### 3.4 Notification Flow (LINE Push)

```
Admin กด "Send Bill" → backend:
  1. คำนวณยอดต่อคน
  2. สำหรับแต่ละ attendee:
       POST https://api.line.me/v2/bot/message/push
       Body: Flex Message
         {
           header: "บิลพร้อมแล้ว 💸",
           body: {
             event: "งานเลี้ยงรุ่น 35",
             amount: "฿450",
             due: "ภายใน 7 วัน"
           },
           footer: [
             button(action=uri, label="ดูบิล + QR", uri=`liff://app/{liffId}?to=/bills/{billId}`)
           ]
         }
  3. Log push result (success/fail) → admin เห็นในหน้า bill detail
```

**Quota:** LINE OA free = 500 msg/เดือน → พอใช้สำหรับกลุ่ม ~50 คน × 10 events/เดือน.

---

## 4. Data Dictionary & Schema

### 4.1 ER Diagram (Mermaid)

```mermaid
erDiagram
  Member ||--o{ Submission : submits
  Event  ||--o{ Submission : has
  Event  ||--o| Bill       : has
  Bill   ||--o{ BillItem   : contains
  Bill   ||--o{ BillShare  : "splits to"
  Member ||--o{ BillShare  : owes
  AdminUser

  Member {
    uuid id PK
    string lineUserId UK
    string displayName
    string pictureUrl
    string customName
    enum preferredDrink "liquor|beer"
    enum memberType    "bd|tl|ku|friend|other"
    bool   banned
    datetime createdAt
  }

  Event {
    uuid id PK
    string name
    string venue
    datetime eventDate
    enum status "active|inactive"
    datetime createdAt
    datetime deletedAt "nullable"
  }

  Submission {
    uuid id PK
    uuid eventId FK
    uuid memberId FK
    string nameSnapshot
    enum   drinkChoice "liquor|beer|none"
    datetime createdAt
    datetime updatedAt
  }

  Bill {
    uuid id PK
    uuid eventId FK
    string name
    enum status "draft|sent|closed"
    int   total
    enum paymentType "promptpay|bank"
    string promptpayId "nullable"
    enum bankCode "nullable"
    string bankAccountNumber "nullable"
    string bankAccountName "nullable"
    datetime sentAt
    datetime closedAt
  }

  BillItem {
    uuid id PK
    uuid billId FK
    string name
    int price
    enum type "liquor|beer|mixer|shared|custom"
    uuid[] extraMemberIds "nullable — extras สำหรับ liquor/beer/mixer"
    uuid[] customMemberIds "nullable — ใช้เฉพาะ custom type"
  }

  BillShare {
    uuid id PK
    uuid billId FK
    uuid memberId FK
    int  amount
    enum paymentStatus "pending|paid"
    datetime paidAt
  }

  AdminUser {
    uuid id PK
    string email UK
    string passwordHash
    datetime createdAt
  }
```

### 4.2 Key Field Validations

| Field | Type | Rules |
|---|---|---|
| `Member.customName` | string | 1–50 chars, trim, ห้าม empty |
| `Member.preferredDrink` | enum | `liquor` หรือ `beer` (register หน้ามี 2 ตัว) |
| `Submission.drinkChoice` | enum | `liquor` / `beer` / `none` (มีตัวเลือกที่ 3 เฉพาะ submission) |
| `Event.eventDate` | datetime | future หรือ past ก็ได้ (แก้ย้อนหลังได้) |
| `BillItem.price` | int (THB) | ≥ 0, เก็บเป็น integer (บาท ไม่มีสตางค์) |
| `BillItem.type` | enum | `liquor` / `beer` / `mixer` / `shared` / `custom` |
| `BillItem.customMemberIds` | uuid[] | required เมื่อ type = `custom`, ต้องมีอย่างน้อย 1 รายการ; null สำหรับ type อื่น |
| `AdminUser.password` | string | bcrypt hash, plaintext min 10 chars |

### 4.3 UI Element Inventory (จะ map ในขั้นตอน UX/UI)

| Screen | Key Components |
|---|---|
| LIFF Register | Avatar, Input, Select×2, Button |
| LIFF Main | Card list, Pull-to-refresh, Tab bar |
| LIFF Event Detail | Stat cards, Chart, Avatar list, Sticky CTA, Bottom Sheet |
| LIFF Bill View | Amount header, QR image, Status badge, Download btn |
| Admin Events Table | DataTable (TanStack), Action menu, Modal confirm |
| Admin Bill Form | Repeater rows, Live summary, Preview drawer |

---

## 5. Edge Cases & Exception Handling

### 5.1 LIFF Edge Cases

| Scenario | Behavior |
|---|---|
| User เปิด LIFF ผ่าน external browser (ไม่ใช่ LINE) | แสดงหน้า "กรุณาเปิดผ่าน LINE" + QR ของ LINE OA |
| LINE Profile API ล่ม | Fallback: ใช้ค่าใน DB (ถ้ามี) หรือ retry button |
| Network offline | Toast "ไม่มี internet" + cache last response สำหรับ Main page |
| User ถูก ban (`banned = true`) | Login OK แต่ทุก API คืน 403 + แสดงหน้า "บัญชีถูกระงับ" |
| Event ถูก delete ระหว่าง user อยู่ในหน้า | API คืน 404 → toast + redirect Main |
| Submit เครื่องดื่มหลังบิลปิด (`status = closed`) | API คืน 409 → toast "ปิดบิลแล้ว แก้ไม่ได้" |
| Concurrent submission (user open 2 tab) | Use `updatedAt` optimistic lock → second submit เตือน "มีการอัพเดทใหม่" |

### 5.2 Admin Edge Cases

| Scenario | Behavior |
|---|---|
| Admin สร้าง bill โดยที่ event มี attendee = 0 | Block + warning "ไม่มีผู้เข้าร่วม" |
| Admin สร้าง item เหล้า แต่ไม่มีใครเลือกเหล้า | Allow แต่ flag warning + เงินก้อนนี้ admin รับผิดชอบเอง (หรือ skip — admin เลือก) |
| Admin ลบ event ที่มี bill อยู่ | Block + แจ้ง "ต้องลบ bill ก่อน" |
| 2 admin edit bill พร้อมกัน | Optimistic lock via `updatedAt`, last-write loses → reload prompt |
| LINE push quota หมด (500/เดือน) | API คืน error → admin เห็น "quota หมด, ส่ง manual" + ปุ่ม copy ข้อความ |
| ลบ admin คนเดียวในระบบ | Block (ต้องมี ≥ 1 admin) |

### 5.3 Data Integrity

- **Cascade delete:** Soft delete event → bill ที่ link ยังอยู่ แต่ flag warning
- **Hard delete member:** ห้าม (เพราะกระทบ submission history) → ใช้ ban แทน
- **Money rounding:** เก็บเป็น integer (THB) ตลอด → ป้องกัน floating point error

---

## 6. Compliance & Non-Functional Requirements

### 6.1 Privacy & PDPA

| Item | Handling |
|---|---|
| LINE userId, displayName, pictureUrl | จัดเก็บใน DB, ใช้เฉพาะใน app, ไม่แชร์บุคคลที่สาม |
| Consent | แสดง consent text ในหน้า Register: "ระบบจะเก็บข้อมูล LINE profile และข้อมูลการเข้าร่วมงาน" |
| Data deletion request | Admin manual delete (ใน Phase 2 จะมี self-service) |
| HTTPS | บังคับทุก endpoint (Vercel/Render auto) |
| Secrets | เก็บใน `.env` + Vercel env vars, ไม่ commit |

### 6.2 Security

- JWT secret rotate ทุก 90 วัน (manual)
- bcrypt rounds = 12 สำหรับ admin password
- Rate limit: 10 req/min ต่อ IP สำหรับ login endpoints
- Input sanitization: NestJS class-validator + Prisma escape
- LIFF: verify `idToken` server-side ทุก request (ไม่เชื่อ client-only)
- CORS: whitelist เฉพาะ domain ของ LIFF + Admin

### 6.3 Performance

| Metric | Target |
|---|---|
| LIFF first paint | < 2.5s on 4G |
| API p95 latency (warm) | < 500ms |
| API p95 latency (cold start) | < 60s (Render free) — mitigated by cron ping |
| DB connection pool | 5 connections (Supabase free limit) |
| Bundle size (LIFF) | < 200KB gzipped |

### 6.4 Cost Constraints (Free Tier)

| Service | Free Limit | Projected Usage |
|---|---|---|
| Vercel | 100GB bandwidth/mo | < 5GB |
| Render | 750 hr/mo, sleep after 15min | OK with cron ping |
| Supabase | 500MB DB, 1GB storage, pause after 7d inactive | DB ~20MB est., no storage upload (ใช้ Hybrid QR — fixed by default) |
| LINE OA | 500 push msg/mo | ~50 msg/event × ~10 events = 500 ✓ |
| LIFF | ฟรีไม่จำกัด | — |

---

## 7. Recommended Additional Flows (BA Suggestions)

> นอกเหนือจาก scope ที่คุณคิดมา ผมแนะนำเพิ่มเพื่อให้ระบบ practical:

### 7.1 Must-have (Phase 1)
1. **Bill confirmation by user** — ใน LIFF bill view มีปุ่ม "ฉันโอนแล้ว 📸" + upload slip (optional, base64 ไม่ต้องเก็บ) → mark `paid` (admin ตรวจอีกที). แก้ปัญหา admin ตามเงินยุ่งยาก.
2. **Admin can mark paid** — ในหน้า bill detail (admin) มี checkbox ข้างชื่อแต่ละคน → toggle paid/pending. + นับ "เก็บเงินครบแล้ว X/Y คน"
3. **My total debt summary** — ใน LIFF profile แสดง "ยอดค้างจ่ายรวม ฿XXX" ของทุก bill ที่ pending → กระตุ้นจ่าย
4. **Empty states & loading skeletons** — สำคัญสำหรับ LIFF UX

### 7.2 Nice-to-have (Phase 2)
5. **Event RSVP cap** — admin จำกัดจำนวนคนเข้าร่วมได้ (เช่นโต๊ะมีจำกัด)
6. **Recurring event template** — duplicate event เก่า (สำหรับงานประจำ)
7. **Export bill เป็น CSV/รูปภาพ** — admin ส่งสรุปให้กลุ่ม LINE
8. **Group chat integration** — admin pin announcement ใน LINE group ผ่าน Messaging API
9. **Member statistics** — "ไอ้คนนี้กินเหล้าไป 47 ครั้งในปีนี้ 🥃" (Fun & retention)
10. **Tip jar / round-up** — เผื่อ admin ขอ tip เล็กน้อยจากเศษเงิน

### 7.3 Operational
11. **Admin notification** — ส่งสรุปยอดหลัง close bill เข้า LINE Notify ของ admin
12. **Cron ping** — cron-job.org (ฟรี) → ping `/health` ทุก 10 นาทีในช่วง 17:00–02:00 (Thailand time) → กัน cold start
13. **DB backup** — Supabase free มี daily backup (รักษา 1 วัน) → admin export manual ทุกอาทิตย์

---

## 8. Tech Decisions Summary

| Decision | Choice | Rationale |
|---|---|---|
| Frontend | Next.js 16 App Router | SSR/ISR, deploy ฟรีบน Vercel, ใช้ component ร่วมกันได้ระหว่าง LIFF + Admin |
| Backend | NestJS 11 | ตาม user request, modular, มี built-in DI/validation |
| ORM | Prisma | type-safe, migration ดี, รองรับ Supabase |
| Auth (LIFF) | LINE Login (idToken verify) | Native ของ LIFF |
| Auth (Admin) | JWT (Email/Password) | แยกจาก LINE ตาม user choice |
| Payment channel | Per-bill: PROMPTPAY (QR generate client-side) หรือ BANK (logo + account info card). PromptPay default จาก env PROMPTPAY_ID, ปรับได้ต่อบิล | ยืดหยุ่นต่อ host (เจ้าภาพต่างคนต่างบัญชีก็ได้), ไม่กิน storage (no QR upload), รองรับ user ที่ไม่ใช้ PromptPay |
| LINE Profile | Cache `pictureUrl` + `displayName` in DB | offline-friendly, sync ทุก login |
| Bill split (ไม่กินแอล) | default = จ่ายเฉพาะ shared items; admin add เข้า liquor/beer/mixer items เป็นรายตัวได้ (`extraMemberIds[]` ต่อ item) | Fair-by-default + ยืดหยุ่นสำหรับ edge cases (เช่น คนไม่กินแอลแต่กินโซดา) — control อยู่ที่ admin ตอนสร้างบิล ไม่ต้องถาม user ตอน submit |
| Bill split (อาหารเฉพาะกลุ่ม) | type `custom` — admin เลือกรายชื่อคนที่ร่วมหารอิสระ (`customMemberIds[]`) | รองรับอาหารที่สั่งเฉพาะบางโต๊ะ/บางคน โดยไม่ผูกกับประเภทเครื่องดื่ม |
| Notification | LINE Push (Messaging API) | Native UX, ฟรี 500/เดือน |
| Edit submission | แก้ได้จนกว่า admin จะปิดบิล | Flexible |
| Hosting | Vercel + Render + Supabase | ฟรี 100% (มี cold-start trade-off) |

---

## 9. Open Questions / To Confirm

1. **PromptPay ID** — ต้องการเบอร์/เลข ID ของใครเป็น default? (เก็บใน .env)
2. **LINE OA channel** — มี existing channel อยู่แล้วหรือสร้างใหม่? (ต้องใช้ Messaging API + LIFF channel)
3. **Admin seed** — รายชื่อ admin ตัวแรก (email)?
4. **Member type label** — "เด็ก BD / TL / KU" เป็นชื่อเฉพาะกลุ่ม → อยากให้ admin แก้ list เองได้มั้ย (configurable enum) หรือ hardcode?
5. **Timezone** — ระบบใช้ Asia/Bangkok (UTC+7) ทั้งหมดใช่มั้ย?

---

## 10. Next Steps

1. ✅ **PRD approval** (this doc)
2. 🔜 **SA blueprint** — Database schema (Prisma), API contract (OpenAPI), folder structure → ใช้ `/sa` skill
3. 🔜 **UX/UI design** — Wireframes + Design system → ใช้ `/uxui` skill
4. 🔜 **Dev** — Scaffold Next.js + NestJS + Prisma → ใช้ `/dev` skill
5. 🔜 **QA** — Test cases + e2e → ใช้ `/qa` skill
6. 🔜 **DevOps** — CI/CD + cron ping setup → ใช้ `/devops` skill

---

## 11. Phase 2 Features (Detailed)

> **Status:** Approved for Phase 2 (added 2026-06-06). Phase 1 ต้อง stable ก่อนเริ่ม.
> ทั้งสองฟีเจอร์ออกแบบให้ **อยู่ใน free tier ($0)** — ไม่แตะ OCR/storage/queue.

### 11.1 Feature Overview & KPIs (Phase 2)

| Feature | Problem | Value |
|---|---|---|
| **F-7: Chat Command Bot (Reply)** | User ต้องเปิด LIFF ทุกครั้งเพื่อเช็คยอดค้าง/งาน | พิมพ์ในแชต 1-on-1 แล้ว bot ตอบทันที ลดแรงเสียดทาน |
| **F-8 / A-8: Standalone Bill (หารทั่วไป)** | บิลผูกกับ event เหล้าเสมอ → หารค่าข้าว/ทริปเร็วๆ ไม่ได้ | ขยาย use case ไปสู่การหารบิลทั่วไป (คู่แข่งขุนทอง) |

**KPIs (Phase 2):**
| Metric | Target |
|---|---|
| Bot reply latency (p95) | < 1.5s (ภายใน LINE reply token 30s window) |
| LINE Push quota usage | คงอยู่ใน free 500/เดือน (bot ใช้ **reply** ไม่กินโควต้า) |
| Standalone bill adoption | ≥ 30% ของบิลใหม่หลัง launch เป็นแบบ standalone |
| Bot command success rate | ≥ 95% (ไม่ error / ตอบถูก intent) |

**Out of Scope (Phase 2 — เลื่อนไป Phase 3):**
- OCR สลิป / verify การจ่ายจริงด้วยรูป
- บอทในแชตกลุ่ม (group chat) — Phase 2 ทำเฉพาะ **1-on-1** เท่านั้น
- รับ/เก็บรูปสลิปผ่าน bot (ไม่มี storage)
- หารบิลแบบ "ตามรายการ split ละเอียด" หรือยอดไม่เท่ากันต่อคนแบบ manual
- ad-hoc participant (คนนอกกลุ่มที่ไม่ได้ register)

---

### 11.2 F-7: Chat Command Bot (1-on-1 Reply)

**Actor:** Member (LIFF, registered — ผูกผ่าน `lineUserId`)
**Channel:** LINE 1-on-1 chat กับ OA · **Message type:** Reply (ฟรี ไม่กินโควต้า 500/เดือน)

#### Functional Workflow
```
User พิมพ์ข้อความใน 1-on-1 chat กับ OA
  ↓
LINE → POST /v1/line/webhook (มี X-Line-Signature)
  ↓
[Guard] verify signature (HMAC-SHA256 ด้วย LINE_CHANNEL_SECRET) บน raw body
  ├─ ไม่ผ่าน → 401 (ทิ้ง event)
  └─ ผ่าน → parse events[]
       ↓
       สำหรับ event type=message, message.type=text:
         • หา Member by event.source.userId (lineUserId)
         •   ไม่พบ → reply "ยังไม่ได้ลงทะเบียน" + ปุ่มเปิด LIFF Register
         •   พบ → match intent จากข้อความ (normalize: trim/lowercase/ตัดช่องว่าง)
       ↓
       reply ด้วย replyToken (ภายใน 30 วินาที)
```

#### Command Intent Map (Phase 2 = คำสั่งข้อความเท่านั้น)
| ผู้ใช้พิมพ์ (keyword, จับแบบ contains) | Intent | Bot Reply |
|---|---|---|
| `บิล`, `ค้าง`, `จ่าย`, `หนี้`, `bill` | **MY_DEBT** | Flex: ยอดค้างรวม ฿X จากทุกบิลที่ `paymentStatus ∈ {PENDING, CLAIMED}` และ bill ยัง `≠ CLOSED`/ไม่ถูกลบ + รายการบิลย่อย (ชื่อ + ยอด + ปุ่มเปิด LIFF) · ถ้าไม่มี → "ไม่มียอดค้าง 🎉" |
| `งาน`, `อีเวนต์`, `event`, `นัด` | **EVENTS** | Flex: event `status=ACTIVE` ที่ `eventDate ≥ today-1d` (เรียงใกล้สุดก่อน) + ปุ่มเปิด LIFF แต่ละงาน · ถ้าไม่มี → "ยังไม่มีงานที่จะถึง" |
| `เมนู`, `ช่วย`, `help`, `เริ่ม`, `hi`, อื่นๆ ที่ไม่ match | **HELP** | Flex เมนูช่วยเหลือ: อธิบายคำสั่ง (บิล / งาน) + ปุ่มเปิด LIFF หน้า Main |

> หมายเหตุ: ภาพ/สติกเกอร์/ข้อความอื่นที่ไม่ใช่ text → reply HELP (ยังไม่มี OCR ใน Phase 2)

#### Data Requirements
- ไม่มี model ใหม่ — query จาก `Member` → `BillShare` → `Bill` (relation มีอยู่แล้ว)
- **Env:** `LINE_CHANNEL_SECRET` (จำเป็นสำหรับ signature verify) — มีอยู่ใน `env.validation.ts` แล้ว ไม่ต้องเพิ่ม (ดู SA §8.A.1)

#### Edge Cases & Exception Handling
| กรณี | พฤติกรรม |
|---|---|
| Signature ไม่ผ่าน / ไม่มี header | ตอบ 401, log warn, ไม่ประมวลผล |
| `replyToken` หมดอายุ (เกิน 30s — เช่น cold start ของ Render) | log error, ข้าม (ไม่ fallback เป็น push เพื่อไม่กินโควต้า) |
| Member ถูก `banned=true` | reply "บัญชีถูกระงับ ติดต่อแอดมิน" |
| lineUserId ไม่พบใน DB (guest) | reply ชวนลงทะเบียน + ปุ่ม LIFF |
| LINE ส่ง event ซ้ำ (retry/redelivery) | reply ซ้ำได้ (idempotent อยู่แล้วเพราะเป็นการอ่าน) — ไม่เขียน DB |
| Webhook verify ของ LINE Console (ping ว่างเปล่า) | ตอบ 200 ทันที ไม่มี events |
| หลาย events ใน 1 request | loop ตอบทีละอัน (แต่ละ event มี replyToken ของตัวเอง) |

#### Non-Functional
- **Security:** signature verify บังคับ; ต้องอ่าน **raw body** (ตั้ง `rawBody:true` ใน `main.ts` — JSON parser ปกติจะทำให้ verify ไม่ผ่าน)
- **Cost:** reply = ฟรีไม่จำกัด → ไม่กระทบโควต้า push 500/เดือน
- **Perf:** ตอบภายใน 30s window; query ยอดค้างต้อง index `BillShare.memberId` + `paymentStatus` (มี `@@index([memberId])` แล้ว)

---

### 11.3 F-8 / A-8: Standalone Bill (โหมดหารบิลทั่วไป)

**Decision (locked 2026-06-06):**
- ผู้ร่วมบิล = **เฉพาะ member ที่ register แล้ว** (ไม่รองรับ ad-hoc name คนนอกกลุ่ม)
- วิธีหาร = **หารเท่ากัน (SHARED)** + **เฉพาะคน (CUSTOM)** เท่านั้น — ไม่มี logic เหล้า/เบียร์/mixer (เพราะไม่ใช่งานเหล้า)
- บิลไม่ผูก event (`eventId` optional)

**Actor:** Admin (สร้าง/จัดการ), Member (ดู + claim paid)

#### A-8: Admin Flow — สร้างบิลทั่วไป
```
Bills → [+ สร้างบิล] → เลือกโหมด:
  ○ ผูกกับงาน (เดิม — F-3/A-6)
  ● บิลทั่วไป (ไม่ผูกงาน)   ← ใหม่
       ↓
  ฟอร์มบิลทั่วไป:
    • ชื่อบิล (required) เช่น "ค่าข้าวเที่ยง", "ทริปเขาใหญ่"
    • เลือกผู้ร่วมบิล (multi-select จาก member ที่ register, banned=false) — required ≥ 1
    • payment channel (PromptPay default จาก env / Bank) — เหมือนบิล event
    • รายการ (items):
        - type SHARED (หารทุกคนในบิล) | type CUSTOM (เลือกเฉพาะคนในผู้ร่วมบิล)
        - (ไม่มี LIQUOR/BEER/MIXER ในโหมดนี้)
    • Live preview ยอดต่อคน (reuse calculateBill)
       ↓
  [สร้าง] → DRAFT → [ส่ง] push Flex หาผู้ร่วมบิล → SENT → [ปิดบิล] CLOSED
```

#### F-8: Member view (LIFF)
- หน้าใหม่ `/bills/[id]` (standalone) — โครงเดียวกับ `/events/[id]/bill` แต่ไม่มีข้อมูล event
- Tab "My Events" / Profile debt summary ต้องรวม standalone bills ที่ user มี share ด้วย
- Claim paid ("ฉันโอนแล้ว") ใช้ได้เหมือนกัน (by billId)

#### Data Dictionary Delta
| Model | เปลี่ยนแปลง |
|---|---|
| `Bill.eventId` | `String @unique` → **`String? @unique`** (Postgres ยอมหลาย NULL → event เดียวยัง 1 บิล) |
| `Bill.event` | relation → optional |
| `BillItem.itemType` | ใน standalone ใช้ได้เฉพาะ `SHARED` \| `CUSTOM` (validate ที่ service) |
| `CreateBillInput` (shared) | `eventId` optional + เพิ่ม `memberIds?: string[]`; rule: **ต้องมี `eventId` หรือ `memberIds` อย่างใดอย่างหนึ่ง** |

> ไม่ต้องเพิ่ม model ใหม่ — participants ของ standalone เก็บผ่าน `BillShare` ที่สร้างตรงจาก `memberIds`

#### Affected Code (ripple — สำหรับ SA/Dev)
- `bills.service.create()` — แยก path: ถ้า `memberIds` → ไม่ require event, attendees = memberIds (drinkChoice=NONE)
- `validateItemMembers()` — validate กับ participant set ที่ส่งเข้ามา (ไม่ใช่ event submissions เสมอ); ห้าม itemType ที่เป็น LIQUOR/BEER/MIXER ในโหมด standalone
- `bill-push.service.ts` — `event` optional → fallback `bill.name`, deep link `/bills/{id}` เมื่อไม่มี event
- `getMyBillForEvent` → เพิ่ม `getMyBillById(billId, memberId)`
- `claimPaid(eventId,...)` → เพิ่ม variant by billId
- `listAdmin` / `getAdminDetail` — `event` optional (`b.event?.name ?? b.name`)
- LIFF: route `/bills/[id]` + My Bills รวม standalone

#### Edge Cases & Exception Handling
| กรณี | พฤติกรรม |
|---|---|
| สร้าง standalone โดยไม่เลือกผู้ร่วมบิล | 400 "ต้องเลือกผู้ร่วมบิลอย่างน้อย 1 คน" |
| CUSTOM item เลือกคนนอก participant list | 400 (validate เหมือน event bill) |
| ส่ง itemType LIQUOR/BEER/MIXER ในโหมด standalone | 400 "โหมดหารทั่วไปรองรับเฉพาะหารทุกคน/เฉพาะคน" |
| member ถูกลบ/ban หลังสร้างบิล | share คงอยู่ (snapshot ยอด) — เหมือนพฤติกรรมเดิม |
| ส่งทั้ง `eventId` และ `memberIds` | 400 "ระบุได้อย่างใดอย่างหนึ่ง" |
| ปัดเศษ | ใช้ `Math.ceil` favors collector เหมือน Phase 1 |

#### Non-Functional
- **Cost:** $0 — ไม่มี dependency ใหม่; push ตอนสร้างบิลใช้โควต้าเดิม (ยอมรับได้ตามที่ตกลง)
- **Backward compatibility:** บิลแบบ event ต้องทำงานเหมือนเดิม 100% → regression test ครอบ A-6 / F-3 / calc logic เดิม
- **Migration:** เปลี่ยน `eventId` เป็น nullable เป็น non-breaking (ข้อมูลเดิมมีค่าอยู่แล้ว)

---

### 11.4 Phase 2 — Implementation Order (แนะนำ)
1. **F-7 Chat Command Bot** ก่อน — เสี่ยงต่ำ (เพิ่มโมดูลใหม่ล้วน ไม่แตะของเดิม), เห็นผลเร็ว, $0
2. **F-8 Standalone Bill** ตามมา — งานใหญ่ แตะ schema + bills.service หลายจุด, ต้องมี regression test คุ้มบิลแบบ event เดิม

---

**End of PRD — v1.0 (Phase 1) + Phase 2 addendum (2026-06-06)**
