// File: apps/liff/src/hooks/use-auth.ts
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getIdToken, getLiffProfile, initLiff } from '@/lib/liff';
import { apiFetch, setToken } from '@/lib/api';
import type { LineAuthResponse, MemberDto } from '@maoleaw/shared';

export function useLineLoginBootstrap() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        await initLiff();
        const idToken = await getIdToken();
        const res = await apiFetch<LineAuthResponse>('/auth/line', {
          method: 'POST',
          body: JSON.stringify({ idToken }),
        });
        setToken(res.token);
        // Cache member on first paint
        localStorage.setItem('maoleaw_me', JSON.stringify(res.member));
        if (!res.member.isRegistered) {
          router.replace('/register');
        }
        setReady(true);
      } catch (err) {
        console.error('LINE login failed', err);
        // Token expired หรือ auth fail — force re-login ผ่าน LIFF
        try {
          const { default: liff } = await import('@line/liff');
          liff.logout();
          liff.login({ redirectUri: window.location.href });
        } catch {
          // fallback: reload หน้าเพื่อให้ LIFF init ใหม่
          window.location.reload();
        }
        // ไม่ set ready — หน้าจะ redirect/reload ก่อนถึง render
      }
    })();
  }, [router]);

  return { ready };
}

export function useLineProfile() {
  return useQuery({
    queryKey: ['liff-profile'],
    queryFn: () => getLiffProfile(),
    staleTime: Infinity,
  });
}

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => apiFetch<MemberDto>('/members/me'),
    staleTime: 60_000,
  });
}
