# RESUME — MaoLeaw (session briefing)

> For a fresh AI session. Snapshot: 2026-10-04, `main` = `origin/main` @ `2129856`, working tree clean.
> Product is **live in production** with real members — every change ships to real users on push.

## 0. Working agreements (from the user — follow these)
- Reply in **Thai**; keep code identifiers/paths in English.
- **Commit directly on `main`**, never branch. **User pushes** — never `git push` yourself.
- **No superpowers process skills** (brainstorming/spec/plan docs). Ask only design-changing questions in chat, get a quick OK, implement.
- Secrets live in root `.env` (gitignored) and Render env. Never commit or echo values.

## 1. Pipeline position
`docs/PRD.md` ✅ · `docs/SA_BLUEPRINT.md` ✅ (§8 Phase 2, §9 slip verification + 9.3.x add-ons) · `docs/UXUI_DESIGN.md` ✅ · scaffold ✅ · dev 🚧 (Phase 1 done + many Phase 2-ish features) · QA: unit ✅, e2e written but **never run** · devops ✅ (Render Docker + Vercel + GH Actions).

Stack: Turborepo + pnpm · `apps/api` NestJS 10 (port 4000, prefix `/v1`) · `apps/liff` Next 16 (LIFF, :3000) · `apps/admin` Next 16 (:3001) · `packages/shared` (types, zod, `bill-calc`, `merge-items`) · `packages/db` Prisma 5 → Supabase Postgres.
Hosting: API on Render free (`https://maoleaw.onrender.com`, Docker, `render.yaml`) · LIFF/Admin on Vercel (`mao-leaw-liff`, `mao-leaw-admin`) · DB/Storage Supabase project `aeiqgoplmgyzfcuvzkhn`.

## 2. Done this session (all committed + pushed; see `git log 5343967..2129856`)
| Area | What | Where |
|---|---|---|
| Bill lifecycle | DRAFT shares recompute on attendance change + before send; submissions locked at SENT; members can't see DRAFT; send only DRAFT, close only SENT, claims can't downgrade PAID | `bills.service.ts`, `bills/recompute-shares.ts`, `submissions.service.ts` |
| Keep-warm | Pings `/v1/health/db` (real SELECT 1), re-enables itself via API, **only 10:00–19:00 UTC (17–02 BKK)** | `.github/workflows/keep-warm.yml` |
| Slip verification | Claim requires slip image → SlipOK → `evaluateSlip()` → PAID (`AUTO_OK`) or CLAIMED (`NEEDS_REVIEW` + image in private Supabase bucket `slips`, deleted on decision/close). Monthly SlipOK counter in `AppConfig` stops at limit | `modules/slips/*`, SA §9 |
| Reject slip | Admin ✗ → dialog → PENDING + Flex push with reason | `POST /admin/bills/:id/shares/:shareId/reject` |
| Thai copy | Member/admin-facing API errors in Thai; LIFF 404 check uses status code | commit `37c38a5` |
| CI | Flat ESLint configs (Next apps + root for api/shared); `pnpm test` excludes e2e | commit `ae83f74` |
| Migrations | Docker CMD runs `prisma migrate deploy` before start (verified in local Docker) | `apps/api/Dockerfile` |
| LINE bot | Webhook `/v1/line/webhook` (HMAC over rawBody, `LINE_MESSAGING_SECRET`); "บิล"/"งาน"/help + quick replies; replies are free | `modules/line-webhook/*` |
| Reminders | "ทวงเงิน (N)" pushes PENDING members; confirm shows live quota (`GET /admin/line/quota`) | admin bill page |
| Auto-close | Bill → CLOSED when every share with amount>0 is PAID | `closeIfFullyPaid()` |
| Outstanding | `GET /v1/members/me/bills` → LIFF profile card + bot | `outstanding-card.tsx` |
| LIFF links | Event page: แผนที่ (Google Maps), เพิ่มลงปฏิทิน (Google Calendar link), ชวนเพื่อน (`shareTargetPicker`); bill page: share "บิลออกแล้ว" card | `apps/liff/src/lib/{links,share}.ts` |
| Receipt AI | Admin "อ่านจากรูปบิล": 1–5 photos → one Gemini request → rows (type guessed; unsure rows highlighted); prompt includes the group's past item→type pairs | `modules/receipts/*`, SA §9.3.2 |
| Merge rows | "รวมรายการซ้ำ (N)" merges same name (ignoring xN) + type + member sets | `packages/shared/src/merge-items.ts` |

User confirmed in production: slip flow, bot replies, receipt reading + merge work.

## 3. Not done / known gaps (verified by grep, 2026-10-04)
- **F-8 standalone bill** (SA §8.B): not started — `Bill.eventId` still required (`schema.prisma`), no LIFF `/bills/[id]` route.
- **e2e never executed**: specs exist (`tests/e2e`, incl. new `bill-lifecycle.spec.ts`), not in `ci.yml`, no test DB. Running them against prod DB requires `E2E_TEST_MODE=true` = unsafe.
- Playwright artifacts are **tracked in git** (`tests/e2e/playwright-report/index.html`, `test-results/.last-run.json`) — untrack + `.gitignore`. Running `pnpm e2e` dirties them; restore with `git checkout --`.
- Admin Members page still uses hardcoded `MEMBER_TYPES` labels (LIFF uses `/v1/config` overrides).
- Unregistered placeholder members (`customName=''`) can call member GET endpoints (guard only checks banned).
- No Sentry wiring (only an env var in `env.validation.ts`).
- Ideas offered, not chosen yet: admin adds walk-in attendees (biggest real-world gap), duplicate event, cash payment marker, audit log, polls, badges, member stats, rich menu per state, test DB + e2e in CI, rotate leaked secrets.

## 4. Decisions locked (don't re-litigate)
- Submissions editable only while bill is DRAFT (user chose "lock at SENT"); PRD/SA updated.
- Slip: SlipOK free plan; slip **required** on claim; image kept **only** for NEEDS_REVIEW; we do our own receiver/amount/date/transRef checks (bills can use different accounts than SlipOK's branch).
- LINE push quota is **300/month** (read from LINE quota API, not 500 as old PRD said). Bot uses reply only; never fall back to push.
- Receipt AI: Gemini `gemini-3.5-flash` → fallback `gemini-3.5-flash-lite` (`GEMINI_MODELS`); multi-image = one request; merge is opt-in button, not automatic.
- Keep-warm evenings only (Render hours ~290/750); daytime cold start accepted (LIFF shows hint after 6s).
- Money integer baht, `Math.ceil` per item (unchanged).

## 5. Gotchas learned the hard way
- **Two LINE channels**: `LINE_CHANNEL_ID/SECRET` = Login channel (LIFF idToken). Webhook signature needs **Messaging API** channel secret → `LINE_MESSAGING_SECRET`. Webhook URL must be set in console (was missing at first). Check with `GET https://api.line.me/v2/bot/channel/webhook/endpoint` and `POST .../webhook/test`.
- `shareTargetPicker` is enabled at **LINE Login channel → LIFF tab (channel level)**, not inside the LIFF app detail page.
- Docker runtime user can't download Prisma engines → builder prefetches schema engine (`prisma migrate diff ...`) and installs openssl in base stage.
- Local `node dist/main.js` can't resolve externalized `@prisma/client`; run with `NODE_PATH="$(cd packages/db/node_modules && pwd -W)"`. Stop only your own PID (find via `netstat -ano | grep :PORT`) — never `taskkill /IM node.exe`.
- Prisma CLI doesn't read root `.env`: `set -a; source .env; set +a` first.
- Windows/Git Bash: Thai text in `curl -d`/argv gets mangled → use Node scripts or files for Thai payloads/HMAC.
- Many files are CRLF in the working copy → multi-line exact-match replacements fail; use the Edit tool for multi-line edits.
- Validate any new Flex JSON with LINE `POST /v2/bot/message/validate/{push|reply}` (no send) — used for every card so far.
- `gemini-2.5-flash` is unavailable to new users; the key is `AQ.`-prefixed and works.
- Supabase new secret keys (`sb_secret_…`) are sent as both `apikey` and `Authorization: Bearer` in `slip-storage.service.ts`; if uploads 401, use legacy `service_role` JWT.

## 6. Immediate next step
Nothing is in progress. Ask the user which item from §3 to do next — the strongest candidate is **admin adds walk-in attendees to an event** (people who came but never tapped join can't be billed today). If they prefer infra: untrack Playwright artifacts + add Postgres-service e2e job to CI.

## 7. Verify state before trusting this doc
```bash
git status -sb && git log --oneline -5
pnpm install --frozen-lockfile
# placeholders are enough for build/test (CI does the same)
DATABASE_URL='postgresql://postgres:postgres@localhost:5432/postgres?pgbouncer=true' \
DIRECT_URL='postgresql://postgres:postgres@localhost:5432/postgres' \
NEXT_PUBLIC_API_URL=http://localhost:4000 NEXT_PUBLIC_LIFF_ID=placeholder NEXT_PUBLIC_PROMPTPAY_ID=placeholder \
  sh -c 'pnpm lint && pnpm type-check && pnpm test && pnpm build'
# prod health (cold start up to ~50s outside 17–02 BKK)
curl -s https://maoleaw.onrender.com/v1/health/db
# DB migration status vs repo
set -a; source .env; set +a; (cd packages/db && npx prisma migrate status)
```
Expected: all turbo tasks successful (lint 6, type-check 7, test 4 incl. shared 36 + api 37 unit tests, build 6), health `{"status":"ok"}`, "Database schema is up to date".

## 8. Required env (names only — values in root `.env` / Render)
API (Render): `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `LINE_CHANNEL_ID`, `LINE_CHANNEL_SECRET`, `LINE_MESSAGING_TOKEN`, `LINE_MESSAGING_SECRET`, `LIFF_ID`, `PROMPTPAY_ID`, `CORS_ORIGINS`, `SLIPOK_API_KEY`, `SLIPOK_BRANCH_ID`, `SLIPOK_MONTHLY_LIMIT`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `GEMINI_MODELS` (opt), `E2E_TEST_MODE` (**must be false in prod**).
Vercel: `NEXT_PUBLIC_LIFF_ID`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_PROMPTPAY_ID`. GitHub secrets: `API_URL`, `DATABASE_URL` (opt, keep-warm fallback).
Free quotas: LINE push 300/mo · SlipOK 100 slips/mo · Gemini Flash ~tens/day (Flash-Lite more) · Supabase 500MB DB/1GB storage · Render 750 h/mo.
