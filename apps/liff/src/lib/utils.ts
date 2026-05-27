// File: apps/liff/src/lib/utils.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatThaiDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('th-TH', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatBaht(amount: number): string {
  return `฿${amount.toLocaleString('th-TH')}`;
}

export function eventTimeStatus(iso: string): { label: string; variant: 'default' | 'secondary' | 'outline' } {
  const d = new Date(iso);
  const diffMs = d.getTime() - Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  if (diffMs < -dayMs) return { label: 'ผ่านแล้ว', variant: 'secondary' };
  if (diffMs < dayMs) return { label: 'วันนี้', variant: 'default' };
  if (diffMs < 7 * dayMs) return { label: 'อีกไม่กี่วัน', variant: 'default' };
  return { label: 'กำลังจะมาถึง', variant: 'outline' };
}
