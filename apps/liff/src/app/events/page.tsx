// File: apps/liff/src/app/events/page.tsx
'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, MapPin, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { BottomTab } from '@/components/bottom-tab';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { useActiveEvents } from '@/hooks/use-events';
import { useMe } from '@/hooks/use-auth';
import { eventTimeStatus, formatThaiDateTime } from '@/lib/utils';

export default function AllEventsPage() {
  const router = useRouter();
  const { data: me } = useMe();
  const { data, isLoading, isError, refetch } = useActiveEvents();
  const items = data?.items ?? [];
  const total = items.length;
  const joined = items.filter((e) => e.hasSubmitted).length;
  const name = me?.customName || me?.displayName || 'คุณ';

  return (
    <>
      <main className="relative mx-auto min-h-screen max-w-[480px] overflow-hidden bg-stone-50 pb-28">
        {/* ─── Blob backgrounds ─── */}
        <div className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 opacity-70 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 top-24 h-72 w-72 rounded-full bg-gradient-to-br from-pink-400 to-amber-500 opacity-50 blur-3xl" />
        <div className="pointer-events-none absolute right-10 top-72 h-40 w-40 rounded-full bg-gradient-to-br from-yellow-300 to-amber-400 opacity-40 blur-2xl" />

        {/* ─── Top bar ─── */}
        <div className="relative flex items-center justify-between px-4 pt-4">
          <button
            onClick={() => router.back()}
            className="rounded-full bg-white/40 p-2 text-stone-700 backdrop-blur-md hover:bg-white/60"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="rounded-full bg-white/40 px-3 py-1 text-xs font-medium text-stone-700 backdrop-blur-md">
            🍻 MaoLeaw
          </span>
        </div>

        {/* ─── Primary header card ─── */}
        <div className="relative mx-4 mt-5 overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-amber-500 to-amber-600 p-5 text-white shadow-xl ring-1 ring-white/40">
          <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-12 left-8 h-24 w-24 rounded-full bg-white/10" />

          <div className="relative flex items-center gap-3">
            <Avatar className="h-12 w-12 ring-2 ring-white/80">
              {me?.pictureUrl && <AvatarImage src={me.pictureUrl} alt={name} />}
              <AvatarFallback className="bg-white/20 text-white">{name[0] ?? '?'}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="text-xs opacity-90">สวัสดี 👋</p>
              <p className="font-semibold">{name}</p>
            </div>
          </div>

          <div className="relative mt-4 grid grid-cols-3 gap-2">
            <Stat label="งานทั้งหมด" value={total} />
            <Stat label="เข้าร่วมแล้ว" value={joined} />
            <Stat label="ยังไม่ตอบ" value={total - joined} />
          </div>
        </div>

        {/* ─── Section title ─── */}
        <div className="relative mt-6 flex items-baseline justify-between px-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-600">
            📅 รายการทั้งหมด
          </h2>
          <span className="font-mono text-xs text-stone-500">{total} งาน</span>
        </div>

        {/* ─── List ─── */}
        <section className="relative mt-3 px-4">
          {isLoading ? (
            <ListSkeleton />
          ) : isError ? (
            <ErrorState onRetry={refetch} />
          ) : items.length === 0 ? (
            <EmptyState emoji="🍻" title="ยังไม่มีงานเลี้ยง" description="รอ admin สร้างงานใหม่นะ" />
          ) : (
            <ul className="space-y-3">
              {items.map((ev) => {
                const t = eventTimeStatus(ev.eventDate);
                const d = new Date(ev.eventDate);
                return (
                  <li key={ev.id}>
                    <Link
                      href={`/events/${ev.id}`}
                      className="block rounded-2xl border-2 border-primary/25 bg-white/85 p-4 shadow-sm backdrop-blur-sm transition active:scale-[0.98] hover:border-primary/50"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-gradient-to-br from-primary to-amber-600 text-white shadow">
                          <span className="text-[9px] font-medium uppercase">
                            {d.toLocaleDateString('th-TH', { month: 'short' })}
                          </span>
                          <span className="font-mono text-xl font-bold leading-none">
                            {d.getDate()}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="line-clamp-2 font-semibold leading-snug">{ev.name}</h3>
                            <Badge variant={t.variant} className="shrink-0">
                              {t.label}
                            </Badge>
                          </div>
                          <div className="mt-1.5 space-y-1 text-xs text-muted-foreground">
                            <Row icon={<Calendar className="h-3 w-3" />} text={formatThaiDateTime(ev.eventDate)} />
                            <Row icon={<MapPin className="h-3 w-3" />} text={ev.venue} />
                            <Row
                              icon={<Users className="h-3 w-3" />}
                              text={`${ev.attendeeCount} คน${ev.hasSubmitted ? ' · มีคุณ ✓' : ''}`}
                            />
                          </div>
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
      <BottomTab />
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-white p-2.5 text-center shadow-sm">
      <p className="font-mono text-2xl font-bold text-primary">{value}</p>
      <p className="text-[11px] font-medium text-stone-600">{label}</p>
    </div>
  );
}

function Row({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="shrink-0 text-muted-foreground">{icon}</span>
      <span className="truncate">{text}</span>
    </div>
  );
}

function ListSkeleton() {
  return (
    <ul className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <li key={i} className="rounded-2xl border bg-white/70 p-4 backdrop-blur">
          <div className="flex gap-3">
            <div className="h-14 w-14 animate-pulse rounded-xl bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
              <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
