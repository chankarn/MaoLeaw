// File: tests/e2e/src/specs/liff/bill-flow.spec.ts
import { test, expect } from '../../fixtures/liff-mock';
import {
  cleanupE2EMembers,
  deleteEventsByNameLike,
  makeEventName,
} from '../../helpers/db';
import {
  createBill,
  e2eSlip,
  createEvent,
  loginAdmin,
  sendBill,
  submitAttendance,
} from '../../helpers/api';

const TAG = '[E2E-LIFFBILL]';

test.afterAll(async () => {
  await deleteEventsByNameLike(TAG);
  await cleanupE2EMembers();
});

test.describe('LIFF: My bill flow', () => {
  test('happy path: view share + claim paid', async ({ page, liff, newLineUser }) => {
    // 1. Auth as a registered member
    const auth = await liff.installRegistered(newLineUser, {
      customName: newLineUser.displayName,
      preferredDrink: 'BEER',
      memberType: 'FRIEND',
    });

    // 2. Admin creates past event + bill, with this member as attendee
    const adminToken = await loginAdmin();
    const ev = await createEvent(adminToken, {
      name: makeEventName(`${TAG} Past`),
      venue: 'Bar',
      eventDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    });
    await submitAttendance(auth.token, ev.id, {
      customName: newLineUser.displayName,
      drinkChoice: 'BEER',
    });
    const bill = await createBill(adminToken, {
      eventId: ev.id,
      name: `${TAG} dinner`,
      items: [
        { name: 'beer x4', price: 600, itemType: 'BEER' },
        { name: 'food', price: 400, itemType: 'SHARED' },
      ],
    });
    await sendBill(adminToken, bill.id);

    // 3. LIFF: navigate to bill page
    await page.goto(`/events/${ev.id}/bill`);

    await expect(page.getByText(`${TAG} dinner`)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/ยอดที่ต้องจ่าย/)).toBeVisible();

    // QR canvas rendered
    await expect(page.locator('canvas')).toBeVisible();

    // Initial state: button reads "ฉันโอนแล้ว"
    const claimBtn = page.getByRole('button', { name: /ฉันโอนแล้ว/ });
    await expect(claimBtn).toBeVisible();
    await claimBtn.click();

    // Dialog
    await expect(page.getByRole('heading', { name: /แจ้งโอนเงิน/ })).toBeVisible();
    await page.locator('#note').fill('โอน 21:30 ผ่าน app');

    // Slip is required — submit stays disabled until one is attached.
    const submit = page.getByRole('button', { name: /^ส่งสลิป$/ });
    await expect(submit).toBeDisabled();
    // share = beer 600 (sole beer drinker) + food 400 = 1000
    await page.locator('#slip').setInputFiles({
      name: 'slip.png',
      mimeType: 'image/png',
      buffer: e2eSlip({ amount: 1000 }),
    });
    await submit.click();

    // Valid slip → settled automatically, no admin step.
    await expect(page.getByRole('button', { name: /ชำระเรียบร้อย/ })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/ระบบตรวจสลิปแล้ว/)).toBeVisible();
  });

  test('unreadable slip → waits for admin review', async ({ page, liff, newLineUser }) => {
    const auth = await liff.installRegistered(newLineUser, {
      customName: newLineUser.displayName,
      preferredDrink: 'BEER',
      memberType: 'FRIEND',
    });
    const adminToken = await loginAdmin();
    const ev = await createEvent(adminToken, {
      name: makeEventName(`${TAG} Review`),
      venue: 'Bar',
      eventDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    });
    await submitAttendance(auth.token, ev.id, { customName: newLineUser.displayName, drinkChoice: 'BEER' });
    const bill = await createBill(adminToken, {
      eventId: ev.id,
      name: `${TAG} review`,
      items: [{ name: 'food', price: 300, itemType: 'SHARED' }],
    });
    await sendBill(adminToken, bill.id);

    await page.goto(`/events/${ev.id}/bill`);
    await page.getByRole('button', { name: /ฉันโอนแล้ว/ }).click();
    await page.locator('#slip').setInputFiles({
      name: 'blurry.png',
      mimeType: 'image/png',
      buffer: Buffer.from('not a readable slip'),
    });
    await page.getByRole('button', { name: /^ส่งสลิป$/ }).click();

    await expect(page.getByRole('button', { name: /รอตรวจสลิป/ })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/ส่งให้ admin เช็คเพราะ/)).toBeVisible();
  });

  test('event detail of past event with bill → auto-redirects to /bill', async ({
    page,
    liff,
    newLineUser,
  }) => {
    const auth = await liff.installRegistered(newLineUser, {
      customName: newLineUser.displayName,
      preferredDrink: 'LIQUOR',
      memberType: 'OTHER',
    });
    const adminToken = await loginAdmin();
    const ev = await createEvent(adminToken, {
      name: makeEventName(`${TAG} Past Auto`),
      venue: 'V',
      eventDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    });
    await submitAttendance(auth.token, ev.id, {
      customName: newLineUser.displayName,
      drinkChoice: 'LIQUOR',
    });
    const bill = await createBill(adminToken, {
      eventId: ev.id,
      name: `${TAG} auto`,
      items: [{ name: 'shot', price: 200, itemType: 'LIQUOR' }],
    });
    await sendBill(adminToken, bill.id);

    await page.goto(`/events/${ev.id}`);
    // Allow time for: bootstrap → event detail fetch → useEffect redirect
    await page.waitForURL(new RegExp(`/events/${ev.id}/bill$`), { timeout: 15_000 });
  });

  test('negative: bill page for non-attendee returns NotFound state', async ({
    page,
    liff,
    newLineUser,
  }) => {
    await liff.installRegistered(newLineUser, {
      customName: newLineUser.displayName,
      preferredDrink: 'BEER',
      memberType: 'FRIEND',
    });

    const adminToken = await loginAdmin();
    const ev = await createEvent(adminToken, {
      name: makeEventName(`${TAG} OtherEvent`),
      venue: 'X',
      eventDate: new Date(Date.now() - 1000).toISOString(),
    });
    // Note: this member did NOT submit attendance → bill access denied.

    await page.goto(`/events/${ev.id}/bill`);
    // App shows ErrorState component with a retry button (handles 404 from API).
    await expect(page.getByRole('button', { name: /ลอง|retry|try again/i })).toBeVisible({
      timeout: 10_000,
    });
  });
});
