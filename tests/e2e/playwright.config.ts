// File: tests/e2e/playwright.config.ts
import { defineConfig, devices } from '@playwright/test';
import { config as loadEnv } from 'dotenv';
import path from 'node:path';

// Load root .env so test runner can see DATABASE_URL, etc.
loadEnv({ path: path.resolve(__dirname, '../../.env') });
loadEnv({ path: path.resolve(__dirname, '.env'), override: true });

const ADMIN_URL = process.env.ADMIN_URL ?? 'http://localhost:3001';
const LIFF_URL = process.env.LIFF_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir: './src/specs',
  fullyParallel: false, // Sequential — tests share one DB instance.
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],
  timeout: 30_000,
  expect: { timeout: 7_000 },

  use: {
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'th-TH',
    timezoneId: 'Asia/Bangkok',
  },

  projects: [
    {
      name: 'admin',
      testMatch: /specs\/admin\/.+\.spec\.ts$/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: ADMIN_URL,
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: 'liff',
      testMatch: /specs\/liff\/.+\.spec\.ts$/,
      use: {
        // Chromium with mobile viewport — avoids needing webkit install.
        ...devices['Pixel 7'],
        baseURL: LIFF_URL,
      },
    },
  ],
});
