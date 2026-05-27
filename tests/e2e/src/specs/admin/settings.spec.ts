// File: tests/e2e/src/specs/admin/settings.spec.ts
import { test, expect } from '../../fixtures/admin-auth';
import { ENV } from '../../helpers/env';

test.describe('Admin: Settings', () => {
  test('profile tab is default and shows admin info', async ({ adminPage }) => {
    await adminPage.goto('/settings');
    await expect(adminPage.getByLabel(/^ชื่อ$/)).toBeVisible();
    const email = adminPage.getByLabel(/email/i);
    await expect(email).toBeVisible();
    await expect(email).toHaveValue(ENV.adminEmail);
  });

  test('switch to App Config tab and edit PromptPay', async ({ adminPage }) => {
    await adminPage.goto('/settings');
    await adminPage.getByRole('button', { name: /App Config/i }).click();

    const ppid = adminPage.getByLabel(/PromptPay ID/i);
    await expect(ppid).toBeVisible();
    const original = await ppid.inputValue();

    await ppid.fill('0812345678');
    await adminPage.getByRole('button', { name: /^Save$|บันทึก/i }).first().click();
    await expect(adminPage.getByText(/saved|สำเร็จ|บันทึก/i).first()).toBeVisible({ timeout: 5000 });

    // Restore
    await ppid.fill(original);
    await adminPage.getByRole('button', { name: /^Save$|บันทึก/i }).first().click();
  });

  test('Export tab: download Events CSV', async ({ adminPage }) => {
    await adminPage.goto('/settings');
    await adminPage.getByRole('button', { name: /Export Data/i }).click();
    await expect(adminPage.getByText(/Events.*CSV|events\.csv/i)).toBeVisible();

    // Trigger download
    const downloadPromise = adminPage.waitForEvent('download', { timeout: 10_000 });
    await adminPage.getByRole('button', { name: /Download/i }).first().click();
    const dl = await downloadPromise;
    expect(dl.suggestedFilename()).toMatch(/events.*\.csv/i);
  });

  test('negative: change-password mismatch is rejected', async ({ adminPage }) => {
    await adminPage.goto('/settings');
    const newPw = adminPage.getByLabel(/^New password$/i);
    const confirm = adminPage.getByLabel(/Confirm new password/i);
    const current = adminPage.getByLabel(/Current password/i);

    await current.fill(ENV.adminPassword);
    await newPw.fill('NewPass1234');
    await confirm.fill('Mismatch_____');

    const btn = adminPage.getByRole('button', { name: /Change password|เปลี่ยน/i });
    // Either disabled (FE validates) or rejected after click
    if (await btn.isEnabled().catch(() => false)) {
      await btn.click();
      await expect(adminPage.getByText(/match|ตรง|ไม่/i).first()).toBeVisible();
    } else {
      await expect(btn).toBeDisabled();
    }
  });
});
