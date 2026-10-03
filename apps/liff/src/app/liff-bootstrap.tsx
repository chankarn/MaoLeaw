'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useLineLoginBootstrap } from '@/hooks/use-auth';

/** After this long, assume the API is cold-starting (it sleeps outside party hours). */
const SLOW_MS = 6_000;

export function LiffBootstrap({ children }: { children: React.ReactNode }) {
  const { ready } = useLineLoginBootstrap();
  const path = usePathname();
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (ready) return;
    const t = setTimeout(() => setSlow(true), SLOW_MS);
    return () => clearTimeout(t);
  }, [ready]);

  // Register page renders immediately — no guard needed
  if (path === '/register') return <>{children}</>;

  if (!ready) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-amber-50 px-8 text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-stone-500">กำลังเข้าสู่ระบบ…</p>
        {slow && (
          <p className="text-xs text-stone-400">
            ช่วงกลางวันเซิร์ฟเวอร์พักอยู่ รอปลุกสักครู่ (ไม่เกิน 1 นาที) 😴
          </p>
        )}
      </div>
    );
  }

  return <>{children}</>;
}
