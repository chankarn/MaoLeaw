// File: apps/liff/src/app/not-found.tsx
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-[480px] flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl">🤷 ไม่เจอหน้านี้</h1>
      <Button asChild className="mt-6">
        <Link href="/">กลับหน้าหลัก</Link>
      </Button>
    </main>
  );
}
