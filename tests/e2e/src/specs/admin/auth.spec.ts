// File: tests/e2e/src/specs/admin/auth.spec.ts
import { test, expect } from '@playwright/test';
import { ENV } from '../../helpers/env';

test.describe('Admin auth', () => {
  test('happy path: login → dashboard', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /Welcome back/i })).toBeVisible();

    await page.getByLabel('Email', { exact: true }).fill(ENV.adminEmail);
    await page.getByLabel('Password', { exact: true }).fill(ENV.adminPassword);
    await page.getByRole('button', { name: /sign in/i }).click();

    await page.waitForURL(/\/dashboard$/, { timeout: 15_000 });
    await expect(page.getByText(/Dashboard/i).first()).toBeVisible();
  });

  test('negative: wrong password shows error toast', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email', { exact: true }).fill(ENV.adminEmail);
    await page.getByLabel('Password', { exact: true }).fill('definitely-wrong-password-x99');
    await page.getByRole('button', { name: /sign in/i }).click();

    // Toast (sonner) appears with the API error.
    await expect(page.getByText(/Invalid credentials|Login failed/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('negative: empty form keeps submit disabled', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('button', { name: /sign in/i })).toBeDisabled();
    await page.getByLabel('Email', { exact: true }).fill(ENV.adminEmail);
    await expect(page.getByRole('button', { name: /sign in/i })).toBeDisabled();
  });

  test('protected route: unauth visit to /dashboard redirects to /login', async ({ page }) => {
    await page.context().clearCookies();
    await page.addInitScript(() => {
      try {
        localStorage.removeItem('maoleaw_admin_token');
      } catch {
        /* ignore */
      }
    });
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login(\?|$)/);
  });

  test('password show/hide toggle works', async ({ page }) => {
    await page.goto('/login');
    const pw = page.getByLabel('Password', { exact: true });
    await pw.fill('hello123');
    await expect(pw).toHaveAttribute('type', 'password');
    await page.getByRole('button', { name: /show password/i }).click();
    await expect(pw).toHaveAttribute('type', 'text');
    await page.getByRole('button', { name: /hide password/i }).click();
    await expect(pw).toHaveAttribute('type', 'password');
  });
});
