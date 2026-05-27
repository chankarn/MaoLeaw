// File: tests/e2e/src/specs/admin/events.spec.ts
import { test, expect } from '../../fixtures/admin-auth';
import { deleteEventsByNameLike, makeEventName } from '../../helpers/db';
import { createEvent } from '../../helpers/api';

const TAG = '[E2E-EVENT]';

test.afterAll(async () => {
  await deleteEventsByNameLike(TAG);
});

test.describe('Admin: Events CRUD', () => {
  test('happy path: create event from UI', async ({ adminPage }) => {
    const name = makeEventName(`${TAG} New Bar Night`);

    await adminPage.goto('/events');
    await expect(adminPage.getByRole('heading', { name: /events/i }).first()).toBeVisible();

    await adminPage.getByRole('link', { name: /create event/i }).click();
    await adminPage.waitForURL(/\/events\/new$/, { timeout: 15_000 });
    await expect(adminPage.getByRole('heading', { name: /create event/i })).toBeVisible();

    await adminPage.getByLabel(/ชื่องาน/).fill(name);
    await adminPage.getByLabel(/ร้าน \/ สถานที่/).fill('ร้านทดสอบ E2E');

    // Set datetime — must be a future date
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const dt = `${future.toISOString().slice(0, 16)}`;
    await adminPage.getByLabel(/วันเวลาที่จัด/).fill(dt);

    await adminPage.getByRole('button', { name: /สร้าง Event/ }).click();

    await expect(adminPage.getByText(/สร้างเรียบร้อย/)).toBeVisible();
    await adminPage.waitForURL(/\/events$/, { timeout: 15_000 });
    // List query may need a moment to refetch after invalidation.
    await expect(adminPage.getByText(name)).toBeVisible({ timeout: 10_000 });
  });

  test('negative: submit button stays disabled when required fields are empty', async ({
    adminPage,
  }) => {
    await adminPage.goto('/events/new');
    const submit = adminPage.getByRole('button', { name: /สร้าง Event/ });
    await expect(submit).toBeDisabled();

    await adminPage.getByLabel(/ชื่องาน/).fill('only name');
    await expect(submit).toBeDisabled();
  });

  test('happy path: edit existing event', async ({ adminPage, adminToken }) => {
    const original = makeEventName(`${TAG} Edit Me`);
    const ev = await createEvent(adminToken, {
      name: original,
      venue: 'old venue',
      eventDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    });

    await adminPage.goto(`/events/${ev.id}/edit`);
    await expect(adminPage.getByRole('heading', { name: /edit event/i })).toBeVisible();

    const venue = adminPage.getByLabel(/ร้าน \/ สถานที่/);
    await venue.fill('new venue 2026');

    await adminPage.getByRole('button', { name: /บันทึกการแก้ไข/ }).click();
    await expect(adminPage.getByText(/อัปเดตเรียบร้อย|บันทึกเรียบร้อย|สำเร็จ/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('happy path: delete event from list', async ({ adminPage, adminToken }) => {
    const name = makeEventName(`${TAG} Delete Me`);
    await createEvent(adminToken, {
      name,
      venue: 'temp',
      eventDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });

    await adminPage.goto('/events');
    await expect(adminPage.getByText(name)).toBeVisible();

    // Stub the confirm dialog
    adminPage.once('dialog', (d) => d.accept());

    // Scope to the row card that contains the event name, then click its trigger button
    const card = adminPage.locator('div').filter({ hasText: name }).filter({ has: adminPage.locator('button') }).last();
    await card.getByRole('button').last().click();

    await adminPage.getByRole('menuitem', { name: /delete/i }).click();
    await expect(adminPage.getByText(/ลบเรียบร้อย|deleted/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('boundary: very long name is rejected by max length', async ({ adminPage }) => {
    await adminPage.goto('/events/new');
    const huge = 'A'.repeat(500);
    await adminPage.getByLabel(/ชื่องาน/).fill(huge);
    // Input maxLength caps the value — verify it didn't store all 500 chars.
    const val = await adminPage.getByLabel(/ชื่องาน/).inputValue();
    expect(val.length).toBeLessThan(500);
  });
});
