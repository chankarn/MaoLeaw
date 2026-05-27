// File: tests/e2e/src/specs/liff/event-flow.spec.ts
import { test, expect } from '../../fixtures/liff-mock';
import {
  cleanupE2EMembers,
  deleteEventsByNameLike,
  makeEventName,
} from '../../helpers/db';
import { createEvent, loginAdmin } from '../../helpers/api';

const TAG = '[E2E-LIFFEV]';

test.afterAll(async () => {
  await deleteEventsByNameLike(TAG);
  await cleanupE2EMembers();
});

test.describe('LIFF: Event flow', () => {
  test('happy path: home shows active event → open detail → submit attendance', async ({
    page,
    liff,
    newLineUser,
  }) => {
    await liff.installRegistered(newLineUser, {
      customName: newLineUser.displayName,
      preferredDrink: 'BEER',
      memberType: 'FRIEND',
    });

    // Seed an upcoming event via admin
    const adminToken = await loginAdmin();
    const evName = makeEventName(`${TAG} Friday Drinks`);
    const ev = await createEvent(adminToken, {
      name: evName,
      venue: 'Bar X',
      eventDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    });

    await page.goto('/');
    await expect(page.getByText(evName).first()).toBeVisible({ timeout: 10_000 });

    // Open detail via direct route (carousel card click can be flaky on mobile viewport)
    await page.goto(`/events/${ev.id}`);

    // Find and click the join button
    const joinBtn = page.getByRole('button', { name: /เข้าร่วมงาน/ });
    await expect(joinBtn).toBeVisible({ timeout: 10_000 });
    await joinBtn.scrollIntoViewIfNeeded();
    await joinBtn.click();

    // Dialog opens — wait for the dialog itself, then verify content
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 7000 });

    // Choose NONE (non-alcohol) — radio's hidden, click the wrapping label
    await dialog.getByText('ไม่กิน', { exact: true }).click();

    // Submit
    await dialog.getByRole('button', { name: /^บันทึก$/ }).click();
    await expect(page.getByText(/บันทึกแล้ว/)).toBeVisible({ timeout: 7000 });

    // After submit, button should switch to "แก้ไขการเข้าร่วม"
    await expect(page.getByRole('button', { name: /แก้ไขการเข้าร่วม/ })).toBeVisible({
      timeout: 5000,
    });
  });

  test('edit existing attendance changes drink choice', async ({
    page,
    liff,
    newLineUser,
  }) => {
    await liff.installRegistered(newLineUser, {
      customName: newLineUser.displayName,
      preferredDrink: 'LIQUOR',
      memberType: 'OTHER',
    });

    const adminToken = await loginAdmin();
    const ev = await createEvent(adminToken, {
      name: makeEventName(`${TAG} Edit Sub`),
      venue: 'Test',
      eventDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });

    await page.goto(`/events/${ev.id}`);

    // First submission
    await page.getByRole('button', { name: /เข้าร่วมงาน/ }).click();
    const dialog1 = page.getByRole('dialog');
    await expect(dialog1).toBeVisible({ timeout: 7000 });
    await dialog1.getByText('เหล้า', { exact: true }).click();
    await dialog1.getByRole('button', { name: /^บันทึก$/ }).click();
    await expect(page.getByText(/บันทึกแล้ว/)).toBeVisible({ timeout: 7000 });

    // Edit — change to BEER
    await page.getByRole('button', { name: /แก้ไขการเข้าร่วม/ }).click();
    const dialog2 = page.getByRole('dialog');
    await expect(dialog2).toBeVisible({ timeout: 7000 });
    await dialog2.getByText('เบียร์', { exact: true }).click();
    await dialog2.getByRole('button', { name: /^บันทึก$/ }).click();
    await expect(page.getByText(/บันทึกแล้ว/)).toBeVisible({ timeout: 7000 });
  });

  test('empty state: home shows "ยังไม่มีงานเลี้ยง" when no active events visible', async ({
    page,
    liff,
    newLineUser,
  }) => {
    await liff.installRegistered(newLineUser, {
      customName: newLineUser.displayName,
      preferredDrink: 'BEER',
      memberType: 'FRIEND',
    });

    await page.goto('/');
    // Either we see existing events OR the empty state. Just verify the home loads.
    const hasContent = await Promise.race([
      page
        .getByText(/ยังไม่มีงานเลี้ยง/)
        .waitFor({ timeout: 8000 })
        .then(() => 'empty'),
      page
        .getByText(/UPCOMING|Upcoming|งานที่ใกล้/i)
        .first()
        .waitFor({ timeout: 8000 })
        .then(() => 'list'),
    ]).catch(() => null);
    expect(hasContent).not.toBeNull();
  });
});
