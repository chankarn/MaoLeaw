// File: apps/admin/src/app/error.tsx
'use client';
import { Button } from '@/components/ui/button';

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center text-center">
      <div>
        <h1 className="text-2xl">😵 มีบางอย่างผิดพลาด</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <Button className="mt-6" onClick={reset}>
          ลองอีกครั้ง
        </Button>
      </div>
    </main>
  );
}
