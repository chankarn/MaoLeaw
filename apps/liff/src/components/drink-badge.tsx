// File: apps/liff/src/components/drink-badge.tsx
import type { DrinkChoice } from '@maoleaw/shared';
import { cn } from '@/lib/utils';

const MAP: Record<DrinkChoice, { label: string; cls: string }> = {
  LIQUOR: { label: '🥃 เหล้า', cls: 'bg-drink-liquor/10 text-drink-liquor border-drink-liquor/30' },
  BEER: { label: '🍺 เบียร์', cls: 'bg-drink-beer/10 text-drink-beer border-drink-beer/40' },
  NONE: { label: '💧 ไม่กิน', cls: 'bg-drink-none/10 text-drink-none border-drink-none/30' },
};

export function DrinkBadge({ choice }: { choice: DrinkChoice }) {
  const { label, cls } = MAP[choice];
  return <span className={cn('inline-flex h-6 items-center rounded-full border px-2 text-xs font-medium', cls)}>{label}</span>;
}
