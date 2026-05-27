// File: tests/e2e/src/fixtures/liff-mock.ts
import { test as base, type Page } from '@playwright/test';
import { loginAsLineMember, registerMember } from '../helpers/api';
import { makeLineUserId } from '../helpers/db';
import { ENV } from '../helpers/env';

export interface LiffProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
}

export interface LiffFixtures {
  /**
   * Inject a LIFF mock into the browser context. The next page.goto() will
   * see `window.__E2E_LIFF__` populated so the app skips real LIFF SDK.
   * Returns a helper to also seed the JWT directly (skip auth round-trip).
   */
  liff: {
    install: (profile: LiffProfile) => Promise<void>;
    installAndAuth: (profile: LiffProfile) => Promise<{ token: string; memberId: string }>;
    installRegistered: (profile: LiffProfile, register: {
      customName: string;
      preferredDrink: 'LIQUOR' | 'BEER';
      memberType: string;
    }) => Promise<{ token: string; memberId: string }>;
  };
  liffPage: Page;
  newLineUser: LiffProfile;
}

export const test = base.extend<LiffFixtures>({
  newLineUser: async ({}, use, testInfo) => {
    const safe = testInfo.title.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12);
    await use({
      userId: makeLineUserId(safe),
      displayName: `Tester ${safe}`,
    });
  },

  liff: async ({ page }, use) => {
    // Forward browser console to test stdout for debugging.
    page.on('console', (msg) => {
      const t = msg.text();
      if (t.includes('[LIFF]') || t.includes('LINE login') || t.includes('ApiError')) {
        process.stdout.write(`  [browser ${msg.type()}] ${t}\n`);
      }
    });
    page.on('pageerror', (err) => process.stdout.write(`  [pageerror] ${err.message}\n`));

    async function install(profile: LiffProfile) {
      const idToken = `e2e:${profile.userId}:${profile.displayName.replace(/ /g, '_')}`;
      await page.addInitScript(
        ({ idToken, profile }) => {
          (window as unknown as { __E2E_LIFF__: unknown }).__E2E_LIFF__ = {
            idToken,
            profile,
          };
        },
        { idToken, profile },
      );
    }

    async function installAndAuth(profile: LiffProfile) {
      await install(profile);
      const auth = await loginAsLineMember(profile.userId, profile.displayName);
      await page.addInitScript((token) => {
        try {
          localStorage.setItem('maoleaw_token', token);
        } catch {
          /* ignore */
        }
      }, auth.token);
      return { token: auth.token, memberId: auth.memberId };
    }

    async function installRegistered(
      profile: LiffProfile,
      reg: { customName: string; preferredDrink: 'LIQUOR' | 'BEER'; memberType: string },
    ) {
      const auth = await installAndAuth(profile);
      await registerMember(auth.token, reg);
      return auth;
    }

    await use({ install, installAndAuth, installRegistered });
  },

  liffPage: async ({ page }, use) => {
    await page.goto(`${ENV.liffUrl}/`);
    await use(page);
  },
});

export const expect = test.expect;
