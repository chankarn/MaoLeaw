// File: apps/liff/src/app/liff-bootstrap.tsx
'use client';
import { usePathname } from 'next/navigation';
import { useLineLoginBootstrap } from '@/hooks/use-auth';

export function LiffBootstrap({ children }: { children: React.ReactNode }) {
  const { ready } = useLineLoginBootstrap();
  const path = usePathname();

  // Register page renders immediately — no guard needed
  if (path === '/register') return <>{children}</>;

  if (!ready) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-amber-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-stone-500">กำลังเข้าสู่ระบบ…</p>
      </div>
    );
  }

  return <>{children}</>;
}
