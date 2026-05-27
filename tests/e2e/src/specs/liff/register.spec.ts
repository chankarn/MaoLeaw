// File: tests/e2e/src/specs/liff/register.spec.ts
import { test, expect } from '../../fixtures/liff-mock';
import { cleanupE2EMembers } from '../../helpers/db';

test.afterAll(async () => {
  await cleanupE2EMembers();
});

test.describe('LIFF: Register flow', () => {
  test('happy path: new LINE user → form pre-fills → submit → home', async ({
    page,
    liff,
    newLineUser,
  }) => {
    await liff.install(newLineUser);
    await page.goto('/');

    // Bootstrap should redirect to /register because new user is unregistered.
    await expect(page).toHaveURL(/\/register$/, { timeout: 10_000 });

    await expect(page.getByRole('heading', { name: /สวัสดี/ })).toBeVisible();

    // Name input should be pre-filled with LINE displayName
    const nameInput = page.getByLabel(/ชื่อที่ใช้แสดงในวง/);
    await expect(nameInput).toHaveValue(newLineUser.displayName);

    // Submit disabled until drink + type selected
    const submit = page.getByRole('button', { name: /เข้าร่วมวง/ });
    await expect(submit).toBeDisabled();

    // Pick drink
    await page.getByRole('combobox').filter({ hasText: /เลือกเครื่องดื่ม/ }).click();
    await page.getByRole('option', { name: /เบียร์/ }).click();

    // Pick member type
    await page.getByRole('combobox').filter({ hasText: /เลือกประเภท/ }).click();
    await page.getByRole('option', { name: /เพื่อนอีสเหล้า/ }).click();

    await expect(submit).toBeEnabled();
    await submit.click();

    await expect(page.getByText(/ลงทะเบียนสำเร็จ/)).toBeVisible({ timeout: 5000 });
    await expect(page).toHaveURL(/\/$/, { timeout: 8000 });
  });

  test('negative: empty name keeps submit disabled', async ({ page, liff, newLineUser }) => {
    await liff.install(newLineUser);
    await page.goto('/register');

    await page.getByLabel(/ชื่อที่ใช้แสดงในวง/).fill('   '); // whitespace only
    await page.getByRole('combobox').filter({ hasText: /เลือกเครื่องดื่ม/ }).click();
    await page.getByRole('option', { name: /เหล้า/ }).click();
    await page.getByRole('combobox').filter({ hasText: /เลือกประเภท/ }).click();
    await page.getByRole('option', { name: /อื่นๆ/ }).click();

    await expect(page.getByRole('button', { name: /เข้าร่วมวง/ })).toBeDisabled();
  });

  test('boundary: name input enforces maxLength', async ({ page, liff, newLineUser }) => {
    await liff.install(newLineUser);
    await page.goto('/register');

    const input = page.getByLabel(/ชื่อที่ใช้แสดงในวง/);
    await input.fill('a'.repeat(100));
    const val = await input.inputValue();
    expect(val.length).toBeLessThanOrEqual(50);
  });

  test('registered user is NOT redirected to /register', async ({
    page,
    liff,
    newLineUser,
  }) => {
    await liff.installRegistered(newLineUser, {
      customName: 'AlreadyHere',
      preferredDrink: 'LIQUOR',
      memberType: 'FRIEND',
    });

    await page.goto('/');
    // Should stay on home (not redirect to register)
    await page.waitForLoadState('networkidle');
    expect(new URL(page.url()).pathname).not.toBe('/register');
  });
});
