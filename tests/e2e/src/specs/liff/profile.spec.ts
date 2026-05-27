// File: tests/e2e/src/specs/liff/profile.spec.ts
import { test, expect } from '../../fixtures/liff-mock';
import { cleanupE2EMembers } from '../../helpers/db';

test.afterAll(async () => {
  await cleanupE2EMembers();
});

test.describe('LIFF: Profile edit', () => {
  test('happy path: update customName', async ({ page, liff, newLineUser }) => {
    await liff.installRegistered(newLineUser, {
      customName: 'OriginalName',
      preferredDrink: 'BEER',
      memberType: 'FRIEND',
    });

    await page.goto('/profile');
    const nameInput = page.getByLabel(/ชื่อที่ใช้แสดง/);
    await expect(nameInput).toHaveValue('OriginalName', { timeout: 7000 });

    await nameInput.fill('UpdatedName');
    await page.getByRole('button', { name: /^บันทึก$/ }).click();

    await expect(page.getByText(/บันทึก|สำเร็จ/).first()).toBeVisible({ timeout: 5000 });
  });

  test('negative: empty name disables save', async ({ page, liff, newLineUser }) => {
    await liff.installRegistered(newLineUser, {
      customName: 'Tester',
      preferredDrink: 'LIQUOR',
      memberType: 'OTHER',
    });

    await page.goto('/profile');
    await page.getByLabel(/ชื่อที่ใช้แสดง/).fill('   ');
    await expect(page.getByRole('button', { name: /^บันทึก$/ })).toBeDisabled();
  });
});
