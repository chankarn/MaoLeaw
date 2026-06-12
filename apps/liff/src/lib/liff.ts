// File: apps/liff/src/lib/liff.ts
'use client';
import type { Liff } from '@line/liff';

let liffInstance: Liff | null = null;

// E2E mock interface — what Playwright must provide on window.__E2E_LIFF__
export interface E2ELiffMock {
  idToken: string;
  profile: { userId: string; displayName: string; pictureUrl?: string };
}

declare global {
  interface Window {
    __E2E_LIFF__?: E2ELiffMock;
  }
}

function buildMockLiff(mock: E2ELiffMock): Liff {
  // Minimal Liff surface needed by this app — cast to Liff for type compat.
  const fake = {
    init: async () => undefined,
    isLoggedIn: () => true,
    login: () => undefined,
    logout: () => undefined,
    getIDToken: () => mock.idToken,
    getProfile: async () => ({
      userId: mock.profile.userId,
      displayName: mock.profile.displayName,
      pictureUrl: mock.profile.pictureUrl,
    }),
    closeWindow: () => undefined,
    isInClient: () => false,
  };
  return fake as unknown as Liff;
}

export async function initLiff(): Promise<Liff> {
  if (liffInstance) return liffInstance;

  // E2E test mode — use injected mock instead of real LIFF SDK.
  if (typeof window !== 'undefined' && window.__E2E_LIFF__) {
    console.log('[LIFF] E2E mock detected, using fake LIFF instance');
    liffInstance = buildMockLiff(window.__E2E_LIFF__);
    return liffInstance;
  }
  if (typeof window !== 'undefined') {
    console.log('[LIFF] no E2E mock, using real LIFF SDK');
  }

  const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
  if (!liffId) throw new Error('NEXT_PUBLIC_LIFF_ID missing');

  const liff = (await import('@line/liff')).default;
  await liff.init({ liffId });

  if (!liff.isLoggedIn()) {
    liff.login({ redirectUri: window.location.href });
    // Halt — login() triggers a redirect.
    await new Promise(() => {});
  }

  liffInstance = liff;
  return liff;
}

export async function getLiffProfile() {
  const liff = await initLiff();
  return liff.getProfile();
}

/** True when running inside the LINE in-app browser (WebView), false on a normal browser. */
export async function isInLineClient(): Promise<boolean> {
  const liff = await initLiff();
  return liff.isInClient();
}

export async function getIdToken(): Promise<string> {
  const liff = await initLiff();
  const idToken = liff.getIDToken();
  if (!idToken) throw new Error('No idToken from LIFF');
  return idToken;
}
