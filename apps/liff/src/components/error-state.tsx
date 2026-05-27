// File: apps/liff/src/components/error-state.tsx
'use client';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ErrorState({ onRetry, message }: { onRetry?: () => void; message?: string }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 text-center">
      <AlertCircle className="mb-3 h-12 w-12 text-destructive" />
      <h2 className="mb-1 text-lg font-semibold">ไม่สามารถโหลดข้อมูลได้</h2>
      <p className="mb-4 max-w-xs text-sm text-muted-foreground">{message ?? 'เกิดข้อผิดพลาด ลองอีกครั้ง'}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          ลองอีกครั้ง
        </Button>
      )}
    </div>
  );
}
