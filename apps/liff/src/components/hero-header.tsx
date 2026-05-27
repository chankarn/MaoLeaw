// File: apps/liff/src/components/hero-header.tsx
'use client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useMe } from '@/hooks/use-auth';

interface Props {
  subtitle?: string;
  rightLabel?: string;
  rightValue?: string | number;
}

export function HeroHeader({ subtitle, rightLabel, rightValue }: Props) {
  const { data: me } = useMe();
  const greeting = getGreeting();
  const name = me?.customName || me?.displayName || '';

  return (
    <header className="relative mb-5 overflow-hidden rounded-b-3xl bg-gradient-to-br from-primary via-amber-500 to-amber-400 px-5 pb-7 pt-6 text-white shadow-lg">
      {/* decorative circles */}
      <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10" />
      <div className="pointer-events-none absolute -bottom-8 right-12 h-24 w-24 rounded-full bg-white/10" />

      <div className="relative flex items-center gap-3">
        <Avatar className="h-12 w-12 ring-2 ring-white/60">
          {me?.pictureUrl && <AvatarImage src={me.pictureUrl} alt={name} />}
          <AvatarFallback className="bg-white/20 text-white">{name[0] ?? '?'}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="text-xs opacity-90">{greeting}</p>
          <p className="truncate text-base font-semibold">{name}</p>
        </div>
      </div>

      {(subtitle || rightLabel) && (
        <div className="relative mt-5 flex items-end justify-between rounded-2xl bg-white/15 px-4 py-3 backdrop-blur-sm">
          <div>
            {subtitle && <p className="text-xs opacity-90">{subtitle}</p>}
            {rightLabel && <p className="mt-0.5 text-[11px] uppercase tracking-wider opacity-70">{rightLabel}</p>}
          </div>
          {rightValue !== undefined && (
            <p className="font-mono text-3xl font-semibold tabular-nums leading-none">{rightValue}</p>
          )}
        </div>
      )}
    </header>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'อรุณสวัสดิ์';
  if (h < 17) return 'สวัสดีตอนบ่าย';
  if (h < 20) return 'สวัสดีตอนเย็น';
  return 'ราตรีสวัสดิ์';
}
