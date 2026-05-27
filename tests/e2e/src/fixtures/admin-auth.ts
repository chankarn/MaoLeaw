// File: tests/e2e/src/fixtures/admin-auth.ts
import { test as base, type Page } from '@playwright/test';
import { loginAdmin } from '../helpers/api';
import { ENV } from '../helpers/env';

export interface AdminFixtures {
  adminToken: string;
  adminPage: Page;
}

/**
 * `adminToken`: JWT for direct API setup calls.
 * `adminPage`: a Page that already has the admin JWT in localStorage and is on /dashboard.
 */
export const test = base.extend<AdminFixtures>({
  adminToken: async ({}, use) => {
    const token = await loginAdmin();
    await use(token);
  },

  adminPage: async ({ page, adminToken }, use) => {
    // Pre-seed localStorage with the JWT before any page script runs.
    await page.addInitScript((token) => {
      try {
        localStorage.setItem('maoleaw_admin_token', token);
      } catch {
        /* iframe / SSR — ignore */
      }
    }, adminToken);
    await page.goto(`${ENV.adminUrl}/dashboard`);
    await use(page);
  },
});

export const expect = test.expect;
