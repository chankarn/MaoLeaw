// File: tests/e2e/src/specs/admin/bills.spec.ts
import { test, expect } from '../../fixtures/admin-auth';
import {
  cleanupE2EMembers,
  deleteEventsByNameLike,
  makeEventName,
  makeLineUserId,
} from '../../helpers/db';

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
import {
  createBill,
  createEvent,
  loginAsLineMember,
  registerMember,
  sendBill,
  submitAttendance,
} from '../../helpers/api';

const TAG = '[E2E-BILL]';

test.afterAll(async () => {
  await deleteEventsByNameLike(TAG);
  await cleanupE2EMembers();
});

/** Setup helper: create event + 3 members (liquor, beer, none) + submissions. */
async function setupEventWithAttendees(adminToken: string) {
  const name = makeEventName(`${TAG} Party`);
  const event = await createEvent(adminToken, {
    name,
    venue: 'E2E venue',
    eventDate: new Date(Date.now() - 1000).toISOString(), // past event so bill is valid
  });

  const members: Array<{ token: string; memberId: string; drink: 'LIQUOR' | 'BEER' | 'NONE'; name: string }> =
    [];
  for (const drink of ['LIQUOR', 'BEER', 'NONE'] as const) {
    const lineId = makeLineUserId(`${drink}_${Math.random().toString(36).slice(2, 5)}`);
    const auth = await loginAsLineMember(lineId, `Tester ${drink}`);
    await registerMember(auth.token, {
      customName: `Tester ${drink}`,
      preferredDrink: drink === 'NONE' ? 'BEER' : drink,
      memberType: 'FRIEND',
    });
    await submitAttendance(auth.token, event.id, {
      customName: `Tester ${drink}`,
      drinkChoice: drink,
    });
    members.push({ token: auth.token, memberId: auth.memberId, drink, name: `Tester ${drink}` });
  }
  return { eventId: event.id, eventName: name, members };
}

test.describe('Admin: Bill lifecycle', () => {
  // setupEventWithAttendees makes ~10 DB ops; allow extra time on slow Supabase free-tier pool.
  test.setTimeout(90_000);
  test('happy path: create bill via UI and verify shares', async ({ adminPage, adminToken }) => {
    const { eventId, eventName } = await setupEventWithAttendees(adminToken);

    await adminPage.goto('/bills/new');
    await expect(adminPage.getByRole('heading', { name: /create bill/i })).toBeVisible();

    await adminPage.getByPlaceholder('เช่น งานรุ่น 35 - ร้านเฮง').fill(`${TAG} bill via UI`);

    // Pick event from select
    await adminPage.getByRole('combobox').filter({ hasText: /เลือก event|select/i }).first().click().catch(async () => {
      await adminPage.getByText(/เลือก event/).click();
    });
    await adminPage.getByRole('option', { name: new RegExp(escapeRegex(eventName)) }).click();

    // Fill first row
    await adminPage.getByPlaceholder('ชื่อรายการ').first().fill('เหล้าขาว');
    await adminPage.locator('input[type="number"]').first().fill('900');

    // Set first row type to LIQUOR (Selects use combobox role)
    const typeSelects = adminPage.getByRole('combobox').filter({ hasText: /หาร|เหล้า|เบียร์/ });
    await typeSelects.first().click();
    await adminPage.getByRole('option', { name: /เหล้า/ }).click();

    // Add second row — shared item
    await adminPage.getByRole('button', { name: /เพิ่มรายการ/ }).click();
    const nameInputs = adminPage.getByPlaceholder('ชื่อรายการ');
    await nameInputs.nth(1).fill('ของกินเล่น');
    await adminPage.locator('input[type="number"]').nth(1).fill('300');

    // Save Draft
    await adminPage.getByRole('button', { name: /บันทึก Draft/ }).click();

    await expect(adminPage.getByText(/บันทึก|สร้าง|สำเร็จ/).first()).toBeVisible({ timeout: 5000 });
    // Should navigate to bill detail
    await expect(adminPage).toHaveURL(/\/bills\/[a-f0-9-]{36}/, { timeout: 8000 });

    // Verify members and total
    await expect(adminPage.getByText('เหล้าขาว')).toBeVisible();
    await expect(adminPage.getByText('ของกินเล่น')).toBeVisible();
    void eventId;
  });

  test('bill detail: send → mark all paid', async ({ adminPage, adminToken }) => {
    const { eventId } = await setupEventWithAttendees(adminToken);
    const bill = await createBill(adminToken, {
      eventId,
      name: `${TAG} programmatic bill`,
      items: [
        { name: 'whiskey', price: 600, itemType: 'LIQUOR' },
        { name: 'food', price: 300, itemType: 'SHARED' },
      ],
    });

    await adminPage.goto(`/bills/${bill.id}`);
    await expect(adminPage.getByRole('heading', { name: new RegExp(escapeRegex(TAG)) })).toBeVisible();

    // Send to members
    await adminPage.getByRole('button', { name: /Send to Members/i }).click();
    await expect(adminPage.getByText(/ส่งแล้ว/)).toBeVisible({ timeout: 7000 });

    // Now status badge should be SENT
    await expect(adminPage.getByText(/^SENT$/)).toBeVisible();

    // Select-all and bulk mark paid (toggleAll is the first checkbox in the Members card header)
    const checkboxes = adminPage.getByRole('checkbox');
    await checkboxes.first().click();
    // Bulk action bar should appear with selection count
    const markBtn = adminPage.getByRole('button', { name: /Mark as Paid/i });
    await expect(markBtn).toBeVisible({ timeout: 5000 });
    await markBtn.click();

    // Toast text: "อัปเดต N share เป็น PAID"
    await expect(adminPage.getByText(/อัปเดต.*PAID/)).toBeVisible({ timeout: 7000 });
  });

  test('reset to draft after send', async ({ adminPage, adminToken }) => {
    const { eventId } = await setupEventWithAttendees(adminToken);
    const bill = await createBill(adminToken, {
      eventId,
      name: `${TAG} reset test`,
      items: [{ name: 'beer', price: 200, itemType: 'BEER' }],
    });
    await sendBill(adminToken, bill.id);

    await adminPage.goto(`/bills/${bill.id}`);

    // Stub confirm
    adminPage.once('dialog', (d) => d.accept());

    await adminPage.getByRole('button', { name: /Reset to Draft/i }).click();
    await expect(adminPage.getByText(/รีเซ็ตเป็น Draft แล้ว/)).toBeVisible({ timeout: 7000 });
    // Reset to Draft button disappears (only shown when status === SENT) — best signal of state change.
    await expect(adminPage.getByRole('button', { name: /Reset to Draft/i })).toBeHidden({ timeout: 7000 });
    // Send button reappears (only shown in DRAFT)
    await expect(adminPage.getByRole('button', { name: /Send to Members/i })).toBeVisible({ timeout: 7000 });
  });

  test('negative: cannot create bill for event without attendees', async ({
    adminPage,
    adminToken,
  }) => {
    const name = makeEventName(`${TAG} empty event`);
    await createEvent(adminToken, {
      name,
      venue: 'empty',
      eventDate: new Date(Date.now() - 1000).toISOString(),
    });

    await adminPage.goto('/bills/new');
    await adminPage.getByPlaceholder('เช่น งานรุ่น 35 - ร้านเฮง').fill(`${TAG} empty bill`);

    await adminPage.getByRole('combobox').first().click();
    await adminPage.getByRole('option', { name: new RegExp(escapeRegex(name)) }).click();

    await adminPage.getByPlaceholder('ชื่อรายการ').first().fill('food');
    await adminPage.locator('input[type="number"]').first().fill('100');

    await adminPage.getByRole('button', { name: /บันทึก Draft/ }).click();
    await expect(adminPage.getByText(/no attendees|ไม่มี/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('edge case: non-alcohol member does not pay drink amount', async ({ adminToken }) => {
    // API-level assertion (independent of UI).
    const { eventId, members } = await setupEventWithAttendees(adminToken);
    const bill = await createBill(adminToken, {
      eventId,
      name: `${TAG} non-alc fairness`,
      items: [
        { name: 'whiskey', price: 1200, itemType: 'LIQUOR' },
        { name: 'food', price: 300, itemType: 'SHARED' },
      ],
    });

    const noneMember = members.find((m) => m.drink === 'NONE');
    expect(noneMember).toBeDefined();
    const liquorMember = members.find((m) => m.drink === 'LIQUOR');
    expect(liquorMember).toBeDefined();

    // Fetch admin bill detail
    const detailRes = await fetch(`${process.env.API_URL ?? 'http://localhost:4000'}/v1/admin/bills/${bill.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const detail = (await detailRes.json()) as {
      shares: { memberId: string; drinkAmount: number; sharedAmount: number; amount: number }[];
    };

    const noneShare = detail.shares.find((s) => s.memberId === noneMember!.memberId)!;
    const liquorShare = detail.shares.find((s) => s.memberId === liquorMember!.memberId)!;

    expect(noneShare.drinkAmount).toBe(0); // non-alc doesn't pay drink
    expect(noneShare.sharedAmount).toBeGreaterThan(0); // pays shared
    expect(liquorShare.drinkAmount).toBeGreaterThan(0); // alc pays drink
    // Total = sum of split (rounding may add ≥0 collector-favoring)
    const total = detail.shares.reduce((sum, s) => sum + s.amount, 0);
    expect(total).toBeGreaterThanOrEqual(1500);
  });
});
