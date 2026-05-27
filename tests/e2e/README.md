# E2E Tests (Playwright)

End-to-end tests for the MaoLeaw monorepo — covers the **admin web** and **LIFF web** flows
against a real running API + PostgreSQL.

## ⚠️ Test Mode (REQUIRED)

The API must be started with `E2E_TEST_MODE=true` so it accepts fake LINE ID tokens
in the form `e2e:<lineUserId>[:<displayName>]` and **silently swallows LINE Push calls**.

> **NEVER set `E2E_TEST_MODE=true` in production** — anyone could impersonate any LINE user.

## Setup

```bash
# 1. Install
pnpm install

# 2. Install browsers (first time only)
pnpm --filter @maoleaw/e2e exec playwright install --with-deps chromium

# 3. Configure test env (copy + edit)
cp tests/e2e/.env.example tests/e2e/.env
```

Edit `tests/e2e/.env` — set `ADMIN_EMAIL` / `ADMIN_PASSWORD` to match your seeded admin
(usually whatever `ADMIN_SEED_EMAIL` / `ADMIN_SEED_PASSWORD` in root `.env`).

## Running

You need 3 dev servers running in one terminal:

```bash
# Terminal 1 — start API in test mode + LIFF + Admin
E2E_TEST_MODE=true pnpm dev
```

Then in another terminal:

```bash
# Run everything
pnpm --filter @maoleaw/e2e test

# Only admin specs
pnpm --filter @maoleaw/e2e test:admin

# Only LIFF specs
pnpm --filter @maoleaw/e2e test:liff

# Headed mode (watch the browser)
pnpm --filter @maoleaw/e2e test:headed

# Interactive UI
pnpm --filter @maoleaw/e2e test:ui

# View last HTML report
pnpm --filter @maoleaw/e2e report
```

## Architecture

```
tests/e2e/
├── src/
│   ├── helpers/
│   │   ├── env.ts        — env validation
│   │   ├── api.ts        — direct HTTP client (skip UI for setup)
│   │   └── db.ts         — Prisma helpers + cleanup utilities
│   ├── fixtures/
│   │   ├── admin-auth.ts — fixture: logged-in admin Page
│   │   └── liff-mock.ts  — fixture: injects window.__E2E_LIFF__ + JWT
│   └── specs/
│       ├── admin/        — auth, events, bills, members, settings
│       └── liff/         — register, event-flow, bill-flow, profile
├── playwright.config.ts
└── package.json
```

### How LIFF auth is faked

1. **Frontend:** `apps/liff/src/lib/liff.ts` checks `window.__E2E_LIFF__` first. If present,
   skips the real LIFF SDK and returns a fake `{ getIDToken, getProfile, ... }` object.
2. **Backend:** `apps/api/src/modules/auth/line.service.ts` checks `E2E_TEST_MODE === 'true'`.
   When set, an idToken starting with `e2e:` is parsed (no LINE API call) — the user/displayName
   come from the token itself.

### Cleanup

All test members use `lineUserId` starting with `U_e2e_`. All test events have a `[E2E-*]` tag in
their name. Each spec file's `afterAll` cleans these out, so the DB stays tidy.

If something crashes mid-test:

```sql
-- Manual cleanup
DELETE FROM "Member" WHERE "lineUserId" LIKE 'U_e2e_%';
DELETE FROM "Event"  WHERE "name" LIKE '%[E2E-%]%';
```

(Cascades handle Submission / Bill / BillShare / BillItem.)

## CI

In GitHub Actions / Render PR previews, set the following:

```yaml
env:
  E2E_TEST_MODE: 'true'
  ADMIN_EMAIL: admin@example.com
  ADMIN_PASSWORD: ${{ secrets.ADMIN_PASSWORD }}
  API_URL: http://localhost:4000
  ADMIN_URL: http://localhost:3001
  LIFF_URL: http://localhost:3000
```

`webServer` is intentionally NOT configured in `playwright.config.ts` — the assumption is your
CI script starts all 3 servers (via `pnpm dev` or `pnpm start`) before invoking Playwright.
