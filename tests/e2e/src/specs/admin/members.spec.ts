// File: tests/e2e/src/specs/admin/members.spec.ts
import { test, expect } from '../../fixtures/admin-auth';
import { cleanupE2EMembers, makeLineUserId } from '../../helpers/db';
import { loginAsLineMember, registerMember } from '../../helpers/api';

const TAG_NAME = 'E2EMemberTest';

test.afterAll(async () => {
  await cleanupE2EMembers();
});

test.describe('Admin: Members', () => {
  test('happy path: list shows registered member', async ({ adminPage }) => {
    // Create a fake member via API
    const lineId = makeLineUserId('list');
    const auth = await loginAsLineMember(lineId, `${TAG_NAME} List Member`);
    await registerMember(auth.token, {
      customName: `${TAG_NAME} List`,
      preferredDrink: 'LIQUOR',
      memberType: 'BD',
    });

    await adminPage.goto('/members');
    await expect(adminPage.getByRole('heading', { name: /members/i }).first()).toBeVisible();

    // Search for it
    await adminPage.getByPlaceholder(/search|ค้นหา/i).fill(TAG_NAME);
    await expect(adminPage.getByText(`${TAG_NAME} List`, { exact: true })).toBeVisible({ timeout: 5000 });
  });

  test('ban member then unban', async ({ adminPage }) => {
    const lineId = makeLineUserId('ban');
    const auth = await loginAsLineMember(lineId, `${TAG_NAME} Ban Target`);
    await registerMember(auth.token, {
      customName: `${TAG_NAME} BanMe`,
      preferredDrink: 'BEER',
      memberType: 'OTHER',
    });

    await adminPage.goto('/members');
    await adminPage.getByPlaceholder(/search|ค้นหา/i).fill(`${TAG_NAME} BanMe`);
    await expect(adminPage.getByText(`${TAG_NAME} BanMe`)).toBeVisible();

    // Click ban — confirm dialog appears
    adminPage.once('dialog', (d) => d.accept());
    await adminPage.getByRole('button', { name: /^ban$/i }).first().click();
    await expect(adminPage.getByText(/Banned|สำเร็จ/i).first()).toBeVisible({ timeout: 5000 });

    // Unban
    adminPage.once('dialog', (d) => d.accept());
    await adminPage.getByRole('button', { name: /unban/i }).first().click();
    await expect(adminPage.getByText(/Unbanned|สำเร็จ/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('filter by member type', async ({ adminPage }) => {
    await adminPage.goto('/members');
    // Click a type filter chip if it exists
    const bdChip = adminPage.getByRole('button', { name: /^BD$|เด็ก BD/i }).first();
    if (await bdChip.isVisible().catch(() => false)) {
      await bdChip.click();
    }
    // No crash & list renders (or empty state)
    await expect(adminPage.getByRole('table').or(adminPage.getByText(/no members|ไม่พบ/i))).toBeVisible();
  });
});
