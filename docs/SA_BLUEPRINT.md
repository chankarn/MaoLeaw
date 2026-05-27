# SA Blueprint — MaoLeaw

> **Source PRD:** `docs/PRD.md` v1.0
> **Last updated:** 2026-05-23
> **Status:** v1.0

---

## 0. Architecture Overview

### 0.1 System Topology

```mermaid
flowchart LR
  subgraph Client
    LIFF[LIFF Web<br/>Next.js 16<br/>Mobile WebView]
    ADMIN[Admin Web<br/>Next.js 16<br/>Desktop]
  end

  subgraph Vercel[Vercel Free]
    LIFF
    ADMIN
  end

  subgraph Render[Render Free]
    API[NestJS 11 API<br/>REST + JWT]
  end

  subgraph Supabase[Supabase Free]
    PG[(PostgreSQL 16<br/>+ Prisma)]
  end

  subgraph External[External]
    LINE[LINE Messaging<br/>+ Login + LIFF SDK]
    CRON[cron-job.org<br/>health ping]
  end

  LIFF -->|HTTPS+JWT| API
  ADMIN -->|HTTPS+JWT| API
  API --> PG
  API -->|Push Flex| LINE
  LIFF -->|liff.login| LINE
  CRON -->|GET /health| API
```

### 0.2 Repo Structure (Turborepo monorepo)

```
maoleaw/
├── apps/
│   ├── liff/              Next.js 16 — LIFF user app
│   ├── admin/             Next.js 16 — Admin dashboard
│   └── api/               NestJS 11 — REST API
├── packages/
│   ├── shared/            Shared TypeScript types, Zod schemas, constants
│   ├── db/                Prisma schema, client, migrations
│   ├── ui/                Shared shadcn/ui components (admin uses heavier set)
│   └── eslint-config/     Shared lint rules
├── turbo.json
├── package.json           pnpm workspaces
└── pnpm-lock.yaml
```

**Build pipeline (turbo.json):**
- `dev` — run all apps in parallel
- `build` — `db#generate` → `shared#build` → apps build
- `lint`, `type-check`, `test` — per-package

---

## 1. ER Diagram

```mermaid
erDiagram
  AdminUser {
    uuid id PK
    string email UK
    string passwordHash
    string name
    datetime createdAt
    datetime updatedAt
  }

  Member {
    uuid id PK
    string lineUserId UK "LINE user identifier"
    string lineDisplayName "from LINE, synced"
    string linePictureUrl "nullable"
    string customName "editable display name"
    DrinkPreference preferredDrink "LIQUOR|BEER"
    MemberType memberType "BD|TL|KU|FRIEND|OTHER"
    boolean banned "default false"
    datetime createdAt
    datetime updatedAt
  }

  Event {
    uuid id PK
    string name
    string venue
    datetime eventDate
    EventStatus status "ACTIVE|INACTIVE"
    string customQrUrl "nullable, per-event override"
    uuid createdBy FK
    datetime createdAt
    datetime updatedAt
    datetime deletedAt "nullable, soft delete"
  }

  Submission {
    uuid id PK
    uuid eventId FK
    uuid memberId FK
    string nameSnapshot "submission-time name"
    DrinkChoice drinkChoice "LIQUOR|BEER|NONE"
    datetime createdAt
    datetime updatedAt
  }

  Bill {
    uuid id PK
    uuid eventId FK "unique, 1 bill per event"
    string name
    BillStatus status "DRAFT|SENT|CLOSED"
    int totalAmount "computed, baht"
    uuid createdBy FK
    datetime sentAt "nullable"
    datetime closedAt "nullable"
    datetime createdAt
    datetime updatedAt
    datetime deletedAt
  }

  BillItem {
    uuid id PK
    uuid billId FK
    string name
    int price "baht, integer"
    BillItemType itemType "LIQUOR|BEER|SHARED"
    int sortOrder
  }

  BillShare {
    uuid id PK
    uuid billId FK
    uuid memberId FK
    int amount "baht, computed"
    int sharedAmount "breakdown"
    int drinkAmount "breakdown"
    PaymentStatus paymentStatus "PENDING|PAID"
    datetime paidAt "nullable"
    PushDeliveryStatus pushStatus "PENDING|SENT|FAILED"
    string pushError "nullable"
    datetime pushSentAt "nullable"
    datetime createdAt
    datetime updatedAt
  }

  Member       ||--o{ Submission : "submits"
  Event        ||--o{ Submission : "has"
  Event        ||--|| Bill       : "has 1"
  Bill         ||--o{ BillItem   : "contains"
  Bill         ||--o{ BillShare  : "splits to"
  Member       ||--o{ BillShare  : "owes"
  AdminUser    ||--o{ Event      : "creates"
  AdminUser    ||--o{ Bill       : "creates"
```

### 1.1 Relationship Cardinality

| Relation | Type | Notes |
|---|---|---|
| Member → Submission | 1:N | 1 submission per (member, event) — enforced by unique constraint |
| Event → Submission | 1:N | many members per event |
| Event → Bill | 1:0..1 | each event has at most one bill |
| Bill → BillItem | 1:N | dynamic line items |
| Bill → BillShare | 1:N | one share row per attendee |
| Member → BillShare | 1:N | a member can owe across multiple bills |

---

## 2. Database Schema Definition

### 2.1 Enums

```prisma
enum DrinkPreference { LIQUOR  BEER }
enum DrinkChoice     { LIQUOR  BEER  NONE }
enum MemberType      { BD  TL  KU  FRIEND  OTHER }
enum EventStatus     { ACTIVE  INACTIVE }
enum BillStatus      { DRAFT  SENT  CLOSED }
enum BillItemType    { LIQUOR  BEER  SHARED }
enum PaymentStatus   { PENDING  PAID }
enum PushDeliveryStatus { PENDING  SENT  FAILED }
```

### 2.2 `AdminUser`

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK, default `gen_random_uuid()` | |
| email | VARCHAR(255) | UNIQUE, NOT NULL, lowercase | Login email |
| passwordHash | VARCHAR(255) | NOT NULL | bcrypt cost 12 |
| name | VARCHAR(100) | NOT NULL | Display name |
| createdAt | TIMESTAMPTZ | NOT NULL, default `now()` | |
| updatedAt | TIMESTAMPTZ | NOT NULL | auto via Prisma `@updatedAt` |

**Indexes:** unique on `email`

### 2.3 `Member`

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | |
| lineUserId | VARCHAR(100) | UNIQUE, NOT NULL | from LINE `userId` |
| lineDisplayName | VARCHAR(100) | NOT NULL | synced each login |
| linePictureUrl | TEXT | NULLABLE | LINE profile image URL |
| customName | VARCHAR(50) | NOT NULL | editable name (1–50 chars) |
| preferredDrink | DrinkPreference | NOT NULL | LIQUOR/BEER |
| memberType | MemberType | NOT NULL | BD/TL/KU/FRIEND/OTHER |
| banned | BOOLEAN | NOT NULL, default false | soft ban |
| createdAt | TIMESTAMPTZ | NOT NULL | |
| updatedAt | TIMESTAMPTZ | NOT NULL | |

**Indexes:**
- unique on `lineUserId`
- index on `banned` (for filtering)

### 2.4 `Event`

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | |
| name | VARCHAR(100) | NOT NULL | |
| venue | VARCHAR(200) | NOT NULL | |
| eventDate | TIMESTAMPTZ | NOT NULL | when the party happens |
| status | EventStatus | NOT NULL, default ACTIVE | |
| customQrUrl | TEXT | NULLABLE | per-event QR override |
| createdBy | UUID | FK → AdminUser.id, NOT NULL | |
| createdAt | TIMESTAMPTZ | NOT NULL | |
| updatedAt | TIMESTAMPTZ | NOT NULL | |
| deletedAt | TIMESTAMPTZ | NULLABLE | soft delete |

**Indexes:**
- `(status, deletedAt, eventDate)` composite — for main listing
- `eventDate DESC` for sorting

### 2.5 `Submission`

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | |
| eventId | UUID | FK → Event.id, CASCADE on delete | |
| memberId | UUID | FK → Member.id, RESTRICT | |
| nameSnapshot | VARCHAR(50) | NOT NULL | name at submit time |
| drinkChoice | DrinkChoice | NOT NULL | LIQUOR/BEER/NONE |
| createdAt | TIMESTAMPTZ | NOT NULL | |
| updatedAt | TIMESTAMPTZ | NOT NULL | optimistic lock |

**Indexes:**
- UNIQUE `(eventId, memberId)` — 1 submission per member per event
- `eventId` index — for listing attendees

### 2.6 `Bill`

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | |
| eventId | UUID | FK → Event.id, UNIQUE, RESTRICT | 1 bill per event |
| name | VARCHAR(100) | NOT NULL | |
| status | BillStatus | NOT NULL, default DRAFT | |
| totalAmount | INTEGER | NOT NULL, default 0 | sum of items, baht |
| createdBy | UUID | FK → AdminUser.id | |
| sentAt | TIMESTAMPTZ | NULLABLE | when admin pressed Send |
| closedAt | TIMESTAMPTZ | NULLABLE | when admin closed (locks edits) |
| createdAt | TIMESTAMPTZ | NOT NULL | |
| updatedAt | TIMESTAMPTZ | NOT NULL | |
| deletedAt | TIMESTAMPTZ | NULLABLE | |

**Indexes:** unique on `eventId`, index on `status`

### 2.7 `BillItem`

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | |
| billId | UUID | FK → Bill.id, CASCADE | |
| name | VARCHAR(100) | NOT NULL | |
| price | INTEGER | NOT NULL, CHECK >= 0 | baht |
| itemType | BillItemType | NOT NULL | LIQUOR/BEER/SHARED |
| sortOrder | INTEGER | NOT NULL, default 0 | preserve UI order |

**Indexes:** `billId`

### 2.8 `BillShare`

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | |
| billId | UUID | FK → Bill.id, CASCADE | |
| memberId | UUID | FK → Member.id, RESTRICT | |
| amount | INTEGER | NOT NULL, CHECK >= 0 | total owed |
| sharedAmount | INTEGER | NOT NULL, default 0 | from SHARED items |
| drinkAmount | INTEGER | NOT NULL, default 0 | from LIQUOR/BEER |
| paymentStatus | PaymentStatus | NOT NULL, default PENDING | |
| paidAt | TIMESTAMPTZ | NULLABLE | |
| pushStatus | PushDeliveryStatus | NOT NULL, default PENDING | LINE push tracking |
| pushError | TEXT | NULLABLE | last error message |
| pushSentAt | TIMESTAMPTZ | NULLABLE | |
| createdAt | TIMESTAMPTZ | NOT NULL | |
| updatedAt | TIMESTAMPTZ | NOT NULL | |

**Indexes:**
- UNIQUE `(billId, memberId)`
- `memberId` (for "my debts" query)
- `pushStatus` (for retry queue)

### 2.9 Prisma Schema (excerpt)

```prisma
// packages/db/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Member {
  id              String           @id @default(uuid()) @db.Uuid
  lineUserId      String           @unique
  lineDisplayName String
  linePictureUrl  String?          @db.Text
  customName      String
  preferredDrink  DrinkPreference
  memberType      MemberType
  banned          Boolean          @default(false)
  createdAt       DateTime         @default(now()) @db.Timestamptz
  updatedAt       DateTime         @updatedAt @db.Timestamptz

  submissions     Submission[]
  billShares      BillShare[]

  @@index([banned])
}

// ... (similar for other models)
```

---

## 3. API Contracts

> **Base URL:** `https://api.maoleaw.example/v1`
> **Content-Type:** `application/json`
> **Auth:** `Authorization: Bearer <jwt>` (header) OR `Cookie: session=<jwt>` (admin)

### 3.1 Conventions

- **Path:** kebab-case, plural nouns
- **Time:** ISO 8601 UTC strings; client converts to Asia/Bangkok
- **Money:** integer baht
- **Pagination:** `?page=1&limit=20` (default limit 20, max 100)
- **Errors:** RFC 7807 Problem Details
  ```json
  { "type": "/errors/validation", "title": "Validation Error", "status": 400, "detail": "...", "fields": {...} }
  ```
- **Versioning:** URL prefix `/v1`

### 3.2 LIFF Endpoints (auth: `Bearer <line-jwt>`)

#### POST `/v1/auth/line`
Verify LINE idToken, upsert member, return app JWT.

**Request:**
```json
{ "idToken": "<line-id-token>", "accessToken": "<line-access-token>" }
```

**Response 200:**
```json
{
  "token": "<jwt>",
  "expiresAt": "2026-05-30T...",
  "member": {
    "id": "uuid",
    "lineUserId": "U123...",
    "displayName": "Mao",
    "pictureUrl": "https://...",
    "customName": "เมา",
    "preferredDrink": "LIQUOR",
    "memberType": "FRIEND",
    "isRegistered": true
  }
}
```

**Errors:** `401` invalid idToken · `403` banned

---

#### POST `/v1/members/register`
First-time registration (idempotent — if exists, update).

**Auth:** LINE JWT (member can be unregistered)

**Request:**
```json
{
  "customName": "เมา",
  "preferredDrink": "LIQUOR",
  "memberType": "FRIEND"
}
```

**Response 201:** `Member` object

**Validation:**
- `customName`: 1–50 chars, trim
- `preferredDrink`: enum
- `memberType`: enum

---

#### GET `/v1/members/me`
Get my profile.

**Response 200:** `Member`

---

#### PATCH `/v1/members/me`
Update my profile (customName, preferredDrink, memberType).

**Request:** partial `Member` fields

**Response 200:** updated `Member`

---

#### GET `/v1/events`
List active upcoming/ongoing events.

**Query:** `?scope=active` (default) | `mine`

**Response 200:**
```json
{
  "items": [
    {
      "id": "uuid",
      "name": "งานรุ่น 35",
      "venue": "ร้านเฮง",
      "eventDate": "2026-06-01T19:00:00Z",
      "status": "ACTIVE",
      "attendeeCount": 12,
      "hasSubmitted": true,
      "hasBill": false
    }
  ]
}
```

Rules:
- `scope=active`: `status=ACTIVE AND deletedAt=NULL AND eventDate >= now - 1 day`
- `scope=mine`: events where I have a submission

---

#### GET `/v1/events/:id`
Event detail + stats + attendee list.

**Response 200:**
```json
{
  "event": {
    "id": "uuid", "name": "...", "venue": "...", "eventDate": "...",
    "status": "ACTIVE",
    "isPast": false,
    "hasBill": false,
    "billClosed": false
  },
  "stats": {
    "total": 12,
    "liquor": { "count": 7, "percent": 58 },
    "beer":   { "count": 4, "percent": 33 },
    "none":   { "count": 1, "percent": 9 }
  },
  "attendees": [
    { "memberId": "uuid", "name": "Mao", "pictureUrl": "...", "drinkChoice": "LIQUOR", "isMe": true }
  ],
  "mySubmission": {
    "id": "uuid", "nameSnapshot": "Mao", "drinkChoice": "LIQUOR",
    "updatedAt": "..."
  } | null
}
```

---

#### PUT `/v1/events/:id/submission`
Create or update my submission. Idempotent (upsert).

**Auth:** registered member only

**Request:**
```json
{ "nameSnapshot": "Mao", "drinkChoice": "LIQUOR" }
```

**Response 200:** `Submission`

**Errors:**
- `404` event not found
- `409` event has bill with `status=CLOSED` (locked)
- `400` validation

---

#### GET `/v1/events/:id/my-bill`
Get my bill share for this event.

**Response 200:**
```json
{
  "bill": {
    "id": "uuid",
    "name": "งานรุ่น 35 - บิลร้านเฮง",
    "status": "SENT",
    "totalAmount": 5400
  },
  "myShare": {
    "amount": 450,
    "sharedAmount": 200,
    "drinkAmount": 250,
    "paymentStatus": "PENDING",
    "paidAt": null
  },
  "qrPayload": {
    "type": "PROMPTPAY" | "CUSTOM_URL",
    "value": "0812345678",
    "amount": 450,
    "customUrl": null
  }
}
```

> Client (LIFF) renders QR locally using `promptpay-qr` lib when type=PROMPTPAY; otherwise show `<img src={customUrl}/>`.

---

#### POST `/v1/events/:id/my-bill/mark-paid`
User claims they paid (optional Phase 1.5 — see PRD §7.1.1).

**Response 200:** updated `BillShare`

---

### 3.3 Admin Endpoints (auth: `Bearer <admin-jwt>`)

#### POST `/v1/auth/admin/login`
```json
Request:  { "email": "...", "password": "..." }
Response: { "token": "<jwt>", "expiresAt": "...", "admin": { "id":..., "email":..., "name":... } }
```
Sets httpOnly cookie `session` + 7-day expiry.

---

#### POST `/v1/auth/admin/logout`
Clears cookie. Response 204.

---

#### Events CRUD

| Method | Path | Description |
|---|---|---|
| GET | `/v1/admin/events` | List with filters: `?status=ACTIVE&search=...&page=1&limit=20` |
| GET | `/v1/admin/events/:id` | Detail incl. attendees |
| POST | `/v1/admin/events` | Create — body: `{name, venue, eventDate, status}` |
| PATCH | `/v1/admin/events/:id` | Partial update |
| DELETE | `/v1/admin/events/:id` | Soft delete (sets `deletedAt`) |

**Constraints:**
- Can't delete if event has non-deleted bill (409)

---

#### Bills CRUD

| Method | Path | Description |
|---|---|---|
| GET | `/v1/admin/bills` | List |
| GET | `/v1/admin/bills/:id` | Detail incl. items + shares + push status |
| POST | `/v1/admin/bills` | Create — body below |
| PATCH | `/v1/admin/bills/:id` | Edit (only DRAFT) |
| DELETE | `/v1/admin/bills/:id` | Soft delete |
| POST | `/v1/admin/bills/:id/calculate-preview` | Dry run — returns share breakdown w/o saving |
| POST | `/v1/admin/bills/:id/send` | Send LINE push, transition DRAFT→SENT |
| POST | `/v1/admin/bills/:id/close` | Lock submissions, transition SENT→CLOSED |
| POST | `/v1/admin/bills/:id/shares/:shareId/retry-push` | Retry failed push |
| PATCH | `/v1/admin/bills/:id/shares/:shareId` | Mark paid/pending |

**POST /v1/admin/bills body:**
```json
{
  "eventId": "uuid",
  "name": "งานรุ่น 35 - บิลร้านเฮง",
  "items": [
    { "name": "ข้าวเย็น", "price": 1200, "itemType": "SHARED", "sortOrder": 0 },
    { "name": "เหล้าขาว 1 ขวด", "price": 350, "itemType": "LIQUOR", "sortOrder": 1 },
    { "name": "เบียร์ลีโอ 6 ขวด", "price": 600, "itemType": "BEER", "sortOrder": 2 }
  ]
}
```

**Response 201:** Bill with computed shares.

---

#### Members CRUD

| Method | Path | Description |
|---|---|---|
| GET | `/v1/admin/members` | List with filter `?type=&banned=&search=&page=&limit=` |
| GET | `/v1/admin/members/:id` | Detail incl. event history |
| PATCH | `/v1/admin/members/:id` | Update (admin can fix names/types) |
| POST | `/v1/admin/members/:id/ban` | `{ "banned": true|false }` |

**No create/delete** — members self-register via LIFF; deletion would break submission history.

---

### 3.4 Health

```
GET  /health      → { "status": "ok", "ts": "...", "db": "ok" }
GET  /health/db   → 200/503 based on DB ping
```

Used by cron-job.org to keep Render warm.

---

### 3.5 External Integrations

#### LINE Messaging API — Push

**Endpoint:** `POST https://api.line.me/v2/bot/message/push`
**Headers:** `Authorization: Bearer <CHANNEL_ACCESS_TOKEN>`

**Body (Flex Message):**
```json
{
  "to": "<lineUserId>",
  "messages": [{
    "type": "flex",
    "altText": "บิลพร้อมแล้ว ฿450",
    "contents": {
      "type": "bubble",
      "header": { "...": "บิลพร้อมแล้ว 💸" },
      "body":   { "...": "งานรุ่น 35 — ยอด ฿450" },
      "footer": {
        "type": "box",
        "contents": [{
          "type": "button",
          "action": {
            "type": "uri",
            "label": "ดูบิล + QR",
            "uri": "https://liff.line.me/<LIFF_ID>?to=/bills/<billId>"
          }
        }]
      }
    }
  }]
}
```

**Rate limit:** 500 msg/month (free tier).
**Retry policy:** sync API call. On HTTP non-2xx, store `pushError` in `BillShare`; admin retries manually via `/retry-push`.

#### LINE Login / LIFF SDK
- LIFF JS SDK (`liff.init`, `liff.login`, `liff.getProfile`, `liff.getIDToken`)
- Server verifies idToken via `POST https://api.line.me/oauth2/v2.1/verify`

---

## 4. Security & Authentication Setup

### 4.1 LIFF Auth Flow

```
1. Client: liff.init({ liffId })
2. Client: if !liff.isLoggedIn() → liff.login()
3. Client: idToken = liff.getIDToken()
4. Client: POST /v1/auth/line { idToken }
5. Server:
     - POST https://api.line.me/oauth2/v2.1/verify
       body: id_token=<idToken>&client_id=<LIFF_CHANNEL_ID>
     - Validate aud, iss, exp
     - Upsert Member by lineUserId
     - Sign app JWT (HS256, 7d)
6. Client: store token in localStorage + memory; attach Bearer header
7. Subsequent requests: Authorization: Bearer <appJwt>
```

**Token claims:**
```json
{
  "sub": "<memberId>",
  "lineUserId": "U...",
  "role": "MEMBER",
  "iat": ..., "exp": ...,
  "iss": "maoleaw-api"
}
```

### 4.2 Admin Auth Flow

```
1. POST /v1/auth/admin/login { email, password }
2. Server:
     - Lookup AdminUser by email (lowercase)
     - bcrypt.compare(password, passwordHash)
     - Sign JWT (HS256, 7d, role=ADMIN)
     - Set Set-Cookie: session=<jwt>; HttpOnly; Secure; SameSite=Lax; Max-Age=604800
3. Next.js middleware (admin app) checks cookie → forwards to API
4. API: extracts JWT from cookie OR Bearer header
```

**Password rules:** min 10 chars, mixed case OR digit (NestJS `class-validator`).

### 4.3 Authorization Matrix

| Endpoint pattern | Guest | Member | Banned | Admin |
|---|:-:|:-:|:-:|:-:|
| `POST /v1/auth/line` | ✅ | ✅ | ✅(*) | — |
| `POST /v1/members/register` | ✅ | ✅(no-op) | ❌ | — |
| `GET /v1/members/me` | ❌ | ✅ | ❌ | — |
| `PATCH /v1/members/me` | ❌ | ✅ | ❌ | — |
| `GET /v1/events*` | ❌ | ✅ | ❌ | — |
| `PUT /v1/events/:id/submission` | ❌ | ✅ | ❌ | — |
| `GET /v1/events/:id/my-bill` | ❌ | ✅ | ❌ | — |
| `/v1/admin/*` | ❌ | ❌ | ❌ | ✅ |

(*) Banned member can call `/auth/line` but receives 403 with reason `BANNED`.

### 4.4 Other Security Concerns

- **HTTPS-only** (enforced by Vercel/Render).
- **CORS** (NestJS):
  ```ts
  origin: [LIFF_URL, ADMIN_URL]
  credentials: true
  ```
- **Rate limit** (NestJS Throttler):
  - `/auth/*`: 10/min/IP
  - default: 60/min/IP
- **Helmet** for HTTP headers.
- **CSP** on Admin app: strict; LIFF inherits LINE's WebView constraints.
- **Input validation:** Zod schemas in `packages/shared`, used by both NestJS (via `ZodValidationPipe`) and Next.js Server Actions.
- **Secrets:** stored in Vercel env (`VERCEL_*`) and Render env. Never commit `.env`. Use `.env.example` only.
- **bcrypt:** rounds = 12.
- **JWT secret:** 256-bit random; rotate quarterly (manual). Store in env `JWT_SECRET`.
- **PII:** `lineUserId` and `linePictureUrl` are sensitive — log redaction in production.
- **SQL injection:** Prisma parameterizes everything; no raw SQL except read-only analytics.
- **Mass-assignment:** explicit DTOs at controller boundary.

---

## 5. Technical Notes & Best Practices

### 5.1 Bill Calculation Algorithm (canonical)

```ts
// packages/shared/src/bill-calc.ts

type ItemType = 'LIQUOR' | 'BEER' | 'SHARED';
type DrinkChoice = 'LIQUOR' | 'BEER' | 'NONE';

interface Item { id: string; price: number; itemType: ItemType; }
interface Attendee { memberId: string; drinkChoice: DrinkChoice; }
interface Share { memberId: string; sharedAmount: number; drinkAmount: number; amount: number; }

export function calculateBill(items: Item[], attendees: Attendee[]): {
  shares: Share[];
  warnings: string[];
  total: number;
} {
  const warnings: string[] = [];
  const shares = new Map<string, Share>(
    attendees.map(a => [a.memberId, { memberId: a.memberId, sharedAmount: 0, drinkAmount: 0, amount: 0 }])
  );

  if (attendees.length === 0) {
    warnings.push('NO_ATTENDEES');
    return { shares: [], warnings, total: 0 };
  }

  const liquorEligible = attendees.filter(a => a.drinkChoice === 'LIQUOR');
  const beerEligible   = attendees.filter(a => a.drinkChoice === 'BEER');

  for (const item of items) {
    if (item.itemType === 'SHARED') {
      const per = Math.ceil(item.price / attendees.length);
      for (const a of attendees) shares.get(a.memberId)!.sharedAmount += per;

    } else if (item.itemType === 'LIQUOR') {
      if (liquorEligible.length === 0) { warnings.push(`NO_LIQUOR_DRINKERS:${item.id}`); continue; }
      const per = Math.ceil(item.price / liquorEligible.length);
      for (const a of liquorEligible) shares.get(a.memberId)!.drinkAmount += per;

    } else if (item.itemType === 'BEER') {
      if (beerEligible.length === 0) { warnings.push(`NO_BEER_DRINKERS:${item.id}`); continue; }
      const per = Math.ceil(item.price / beerEligible.length);
      for (const a of beerEligible) shares.get(a.memberId)!.drinkAmount += per;
    }
  }

  let total = 0;
  const result: Share[] = [];
  for (const s of shares.values()) {
    s.amount = s.sharedAmount + s.drinkAmount;
    total += s.amount;
    result.push(s);
  }

  return { shares: result, warnings, total };
}
```

**Properties:**
- Pure function — no DB, no time, deterministic. Easy to unit-test.
- `Math.ceil` ensures rounding favors the bill collector (slight surplus).
- Single source of truth — shared between API (compute on save) and Admin UI (preview).

### 5.2 State Transitions

**Bill:**
```
DRAFT --[POST /send + push success]--> SENT --[POST /close]--> CLOSED
DRAFT --[DELETE]--> deleted
SENT  --[DELETE blocked unless force]--> ...
```

**Submission editability:**
- Editable while `event.bill IS NULL OR event.bill.status IN ('DRAFT', 'SENT')`
- Locked when `event.bill.status = 'CLOSED'`

### 5.3 Indexing & Performance

| Query | Index Used |
|---|---|
| Active events list | `Event(status, deletedAt, eventDate)` |
| Member's events | `Submission(memberId)` |
| Event attendees | `Submission(eventId)` |
| Find member by LINE | `Member(lineUserId)` UNIQUE |
| Failed pushes | `BillShare(pushStatus)` |
| Bill by event | `Bill(eventId)` UNIQUE |

**Connection pool:** Supabase free = 60 connections shared. NestJS Prisma default pool = `num_physical_cpus * 2 + 1` ≈ 5 — safe.

**Cold start mitigation:** cron-job.org GET `/health` every 10 min between 17:00–02:00 Asia/Bangkok.

### 5.4 Caching Strategy

- **Next.js LIFF:** React Query, `staleTime: 30s`, `refetchInterval: 15s` for event detail page.
- **Server:** no Redis (cost). For repeated reads (e.g., event list), rely on Postgres + connection pooling.
- **CDN:** Vercel auto-caches static assets.

### 5.5 Observability (lite, free tier)

- **Logs:** NestJS `pino` JSON logs → Render dashboard. Structured fields: `requestId`, `memberId/adminId`, `path`, `status`, `durationMs`.
- **Errors:** Sentry free (5k events/mo) — Next.js + NestJS plugins.
- **Metrics:** none (skip Prometheus). Use Sentry performance for now.
- **Audit log:** not in Phase 1. Use `createdBy/updatedBy` columns where present.

### 5.6 Migration & Seed

- **Migrations:** `prisma migrate dev` locally; `prisma migrate deploy` in CI.
- **Seed admin:** `pnpm db:seed` — uses `ADMIN_SEED_EMAIL`, `ADMIN_SEED_PASSWORD` env (one-shot).
- **Backups:** Supabase daily snapshot (free, 1-day retention). Manual export weekly via `pg_dump` cron.

### 5.7 Environment Variables

```env
# Shared
NODE_ENV=production
TZ=Asia/Bangkok

# API (Render)
DATABASE_URL=postgresql://...supabase...
DIRECT_URL=postgresql://...supabase...     # Prisma direct (non-pooled for migrations)
JWT_SECRET=<256-bit>
LINE_CHANNEL_ID=...
LINE_CHANNEL_SECRET=...
LINE_MESSAGING_TOKEN=...                    # Channel access token (long-lived)
LIFF_ID=...
PROMPTPAY_ID=0812345678                     # default QR
ADMIN_SEED_EMAIL=admin@maoleaw.local
ADMIN_SEED_PASSWORD=<one-time>
SENTRY_DSN=...

# LIFF app (Vercel)
NEXT_PUBLIC_LIFF_ID=...
NEXT_PUBLIC_API_URL=https://api.maoleaw.example
NEXT_PUBLIC_PROMPTPAY_ID=0812345678         # for client QR generation

# Admin app (Vercel)
NEXT_PUBLIC_API_URL=https://api.maoleaw.example
```

### 5.8 Folder Structure (API)

```
apps/api/src/
├── main.ts
├── app.module.ts
├── common/
│   ├── filters/             ExceptionFilter (RFC7807)
│   ├── guards/              JwtAuthGuard, RoleGuard, BannedGuard
│   ├── pipes/               ZodValidationPipe
│   ├── decorators/          @CurrentUser, @Roles
│   └── interceptors/        LoggingInterceptor
├── modules/
│   ├── auth/                LIFF + Admin auth controllers, services
│   ├── members/
│   ├── events/
│   ├── submissions/
│   ├── bills/
│   │   ├── bills.controller.ts
│   │   ├── bills.service.ts
│   │   ├── bill-calc.service.ts (uses shared/bill-calc)
│   │   └── line-push.service.ts
│   └── health/
├── prisma/                  PrismaService (singleton)
└── config/                  ConfigModule schemas
```

### 5.9 Testing Strategy

| Layer | Tool | Coverage Goal |
|---|---|---|
| Pure logic (`bill-calc`) | Vitest | 100% — critical |
| API unit | Jest + Prisma mock | 70% services |
| API e2e | Supertest + Testcontainers PG | Golden paths + auth |
| LIFF e2e | Playwright (LIFF mock mode) | Register, submit, view bill |
| Admin e2e | Playwright | CRUD event, create+send bill |

### 5.10 Deploy Pipeline

```
GitHub PR
  → GitHub Actions: pnpm lint && type-check && test
  → Vercel preview (apps/liff, apps/admin auto-detect)
  → Render preview (apps/api — requires paid; on free, deploy on merge to main)
  → Merge to main
  → Vercel production
  → Render auto-deploy (free) from main branch
  → Run `prisma migrate deploy` via Render pre-deploy hook
```

### 5.11 Known Risks / Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Render free cold start | 50s wait on first request | Cron ping `/health` |
| Supabase pause after 7d idle | DB unreachable | Cron ping every 6d |
| LINE push quota (500/mo) | Can't notify everyone | Phase 2: upgrade or use LINE Notify |
| 1 share per (bill, member) computed wrong | Money disputes | `bill-calc` unit tests + admin preview before send |
| LIFF idToken replay | Account takeover | Verify aud/iss/exp; short JWT lifetime |
| Admin compromised | Full data access | bcrypt 12, rate-limit, JWT rotation, 2FA in Phase 2 |

---

## 6. Open Items (Carried from PRD §9)

| # | Item | Owner | Needed for |
|---|---|---|---|
| 1 | PromptPay ID for default QR | Product | Env config |
| 2 | LINE OA channel & LIFF channel setup | Product | Auth, push |
| 3 | Admin seed email | Product | First deploy |
| 4 | MemberType configurable vs hardcode | Product | Enum decision (current: hardcode) |
| 5 | Confirm timezone Asia/Bangkok | Product | `TZ` env |

> **Default assumption for now:** hardcode `MemberType` enum (matches PRD); revisit in Phase 2 if labels change.

---

## 7. Next Steps

1. ✅ SA blueprint (this doc)
2. 🔜 `/uxui` — Wireframes + Design system (shadcn/ui based)
3. 🔜 `/dev` — Scaffold monorepo, models, API endpoints
4. 🔜 `/qa` — Test cases & e2e suite
5. 🔜 `/devops` — GitHub Actions, Render deploy hook, cron-job.org setup

---

**End of SA Blueprint v1.0**
