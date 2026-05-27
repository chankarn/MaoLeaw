# MaoLeaw 🍻

> Event & Bill Splitter for friend groups — LINE LIFF app + Admin dashboard.
> คนไม่กินแอลไม่ต้องจ่ายค่าเหล้า/เบียร์ — แฟร์ทุกบิล

**Docs:** [PRD](./docs/PRD.md) · [SA Blueprint](./docs/SA_BLUEPRINT.md) · [UX/UI Design](./docs/UXUI_DESIGN.md)

---

## Tech Stack

| Layer | Choice |
|---|---|
| Monorepo | Turborepo + pnpm workspaces |
| Frontend (LIFF) | Next.js 16 + Tailwind + shadcn-style components |
| Frontend (Admin) | Next.js 16 + Tailwind + shadcn-style components |
| Backend | NestJS 11 + Prisma |
| Database | PostgreSQL (Supabase free) |
| Auth | LINE Login (LIFF idToken) + JWT for admin |
| Notifications | LINE Messaging API (Flex Push) |
| Hosting (target) | Vercel (apps) + Render (api) + Supabase (db) |

---

## Repo Structure

```
maoleaw/
├── apps/
│   ├── api/           NestJS REST API
│   ├── liff/          LIFF mobile web (port 3000)
│   └── admin/         Admin dashboard (port 3001)
├── packages/
│   ├── shared/        Types + Zod schemas + bill-calc (used by FE & BE)
│   └── db/            Prisma schema + client + admin seed
├── docs/              PRD, SA blueprint, UX/UI doc
├── .env.example
├── turbo.json
└── pnpm-workspace.yaml
```

---

## Local Setup

### Prerequisites

- Node.js ≥ 20.10
- pnpm ≥ 9 (`npm i -g pnpm`)
- PostgreSQL (or Supabase project)
- LINE Developers account with:
  - One **LINE Login channel** (for LIFF)
  - One **Messaging API channel** (for Push)
  - A LIFF app configured to point to `https://your-liff-domain` with scope `profile openid`

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env — fill in DATABASE_URL, LINE_*, JWT_SECRET, PROMPTPAY_ID, ADMIN_SEED_*
```

Generate a strong JWT secret:

```bash
openssl rand -base64 32
```

### 3. Provision database

```bash
pnpm db:generate         # generate Prisma client
pnpm db:migrate          # run initial migration (dev)
pnpm db:seed             # create first admin user from ADMIN_SEED_*
```

> For Supabase prod / Render deploy use `pnpm db:deploy` instead of `db:migrate`.

### 4. Run everything

```bash
pnpm dev
```

This boots all three apps in parallel:

| App | URL |
|---|---|
| LIFF | http://localhost:3000 |
| Admin | http://localhost:3001 |
| API | http://localhost:4000/v1 |

You can also run individually:

```bash
pnpm --filter @maoleaw/api dev
pnpm --filter @maoleaw/liff dev
pnpm --filter @maoleaw/admin dev
```

### 5. Test the LIFF flow

LIFF requires running inside the LINE app. For local dev:

1. Set your LIFF endpoint URL to a public tunnel (e.g. `https://<random>.ngrok-free.app`) pointing to `localhost:3000`.
2. Open the LIFF URL in your phone's LINE browser.
3. After LINE login the LIFF bootstrap exchanges the idToken for an app JWT and lands you on Register (first time) or Main.

> Tip: keep ngrok running while developing LIFF features.

### 6. Test the Admin flow

1. Open `http://localhost:3001/login`.
2. Sign in with `ADMIN_SEED_EMAIL` / `ADMIN_SEED_PASSWORD`.
3. You're redirected to `/events`.

---

## Useful Commands

```bash
pnpm test                    # run all tests (Vitest)
pnpm --filter @maoleaw/shared test       # bill-calc tests only

pnpm lint                    # all lint
pnpm type-check              # all type-check

pnpm db:studio               # open Prisma Studio
pnpm db:migrate              # create + apply new migration locally

pnpm clean                   # remove dist/.next/.turbo
```

---

## Deployment

### Vercel (LIFF + Admin)

Each Next.js app is a Vercel project rooted at `apps/liff` / `apps/admin`:

- **Root directory:** `apps/liff` (or `apps/admin`)
- **Build command:** `cd ../.. && pnpm install --frozen-lockfile && pnpm --filter @maoleaw/liff build`
- **Install command:** *(leave default — handled in build)*
- **Env vars:** copy from `.env.example` (the `NEXT_PUBLIC_*` set)

### Render (API)

- **Root:** `apps/api`
- **Build:** `cd ../.. && pnpm install --frozen-lockfile && pnpm db:generate && pnpm --filter @maoleaw/api build`
- **Start:** `cd ../../apps/api && node dist/main.js`
- **Env vars:** all server vars from `.env.example`
- **Pre-deploy hook:** `pnpm db:deploy` (runs migrations against prod DB)

### Keeping Render free tier warm

Render free spins down after 15 min idle. Avoid 50s cold starts by pinging `/v1/health`:

1. Create a free job at https://cron-job.org
2. URL: `https://<your-render>.onrender.com/v1/health`
3. Schedule: every 10 minutes, 17:00–02:00 Asia/Bangkok

Also ping at least once every 6 days to keep Supabase free from auto-pausing.

---

## Key Architecture Decisions

- **Bill calc is a pure function** in `packages/shared/bill-calc.ts` — shared between Admin live preview and API computation, fully unit-tested. Single source of truth.
- **Money as integers** (baht) end-to-end. `Math.ceil` rounding always favors the bill collector.
- **`NONE` drinkers** pay only `SHARED` items. They are excluded from `LIQUOR`/`BEER` divisions.
- **Submission editable** until `Bill.status = CLOSED`.
- **LINE Push** is synchronous + per-share status tracking (no queue). Admin retries failed pushes via UI button.
- **JWT** stored in `localStorage` for LIFF, `httpOnly` cookie + `localStorage` for admin (admin uses both — cookie for SSR if added later, localStorage for current client-side calls).

See [docs/SA_BLUEPRINT.md](./docs/SA_BLUEPRINT.md) for full rationale.

---

## What's NOT in this scaffold (yet)

- Member-type Pi chart on member detail (Phase 2)
- Recurring event templates
- Auth-2FA for admin
- Export bill to CSV/PNG
- Background queue (BullMQ) for push retries
- Member ban audit log

PRs welcome.

---

## License

Private project — All rights reserved.
