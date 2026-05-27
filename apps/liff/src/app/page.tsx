// File: apps/liff/src/app/page.tsx
'use client';
import Link from 'next/link';
import { ArrowRight, Calendar, MapPin, Users } from 'lucide-react';
import { BottomTab } from '@/components/bottom-tab';
import { HeroHeader } from '@/components/hero-header';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { useActiveEvents } from '@/hooks/use-events';
import { cn, formatThaiDateTime } from '@/lib/utils';
import type { EventListItemDto } from '@maoleaw/shared';

export default function MainPage() {
  const { data, isLoading, isError, refetch } = useActiveEvents();
  const all = data?.items ?? [];
  const upcoming = all.slice(0, 3);
  const totalCount = all.length;

  return (
    <>
      <main className="mx-auto max-w-[480px] pb-28">
        <HeroHeader subtitle="งานที่ใกล้ที่สุด" rightLabel="Upcoming" rightValue={totalCount} />

        {/* Carousel */}
        <section className="pl-4">
          <div className="mb-3 flex items-baseline justify-between pr-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              🔥 มาแรง
            </h2>
            {totalCount > upcoming.length && (
              <Link
                href="/events"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary"
              >
                ดูทั้งหมด <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </div>

          {isLoading ? (
            <CarouselSkeleton />
          ) : isError ? (
            <div className="pr-4">
              <ErrorState onRetry={refetch} />
            </div>
          ) : upcoming.length === 0 ? (
            <div className="pr-4">
              <EmptyState
                emoji="🍻"
                title="ยังไม่มีงานเลี้ยง"
                description="รอ admin สร้างงานใหม่นะ"
              />
            </div>
          ) : (
            <div
              className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-3 pr-4"
              style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
            >
              {upcoming.map((ev, idx) => (
                <CarouselCard key={ev.id} ev={ev} highlight={idx === 0} />
              ))}
            </div>
          )}
        </section>

        {/* View all CTA */}
        <section className="px-4 pt-2">
          <Link
            href="/events"
            className="flex items-center justify-between rounded-2xl border bg-card p-4 shadow-sm transition active:scale-[0.98]"
          >
            <div>
              <p className="font-semibold">ดูงานทั้งหมด</p>
              <p className="text-xs text-muted-foreground">
                {totalCount > 0 ? `${totalCount} งานกำลังจะมาถึง` : 'ยังไม่มีงาน'}
              </p>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <ArrowRight className="h-5 w-5" />
            </span>
          </Link>
        </section>

        {/* Quick links */}
        <section className="grid grid-cols-2 gap-3 px-4 pt-4">
          <Link
            href="/my-events"
            className="rounded-2xl border bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-4 transition active:scale-[0.98]"
          >
            <p className="text-2xl">📅</p>
            <p className="mt-2 font-semibold">งานของฉัน</p>
            <p className="text-xs text-muted-foreground">ดูที่เข้าร่วมแล้ว</p>
          </Link>
          <Link
            href="/profile"
            className="rounded-2xl border bg-gradient-to-br from-amber-50 to-amber-100/50 p-4 transition active:scale-[0.98]"
          >
            <p className="text-2xl">👤</p>
            <p className="mt-2 font-semibold">โปรไฟล์</p>
            <p className="text-xs text-muted-foreground">แก้ไขข้อมูล</p>
          </Link>
        </section>
      </main>
      <BottomTab />
    </>
  );
}

function CarouselCard({ ev, highlight }: { ev: EventListItemDto; highlight: boolean }) {
  const d = new Date(ev.eventDate);
  return (
    <Link
      href={`/events/${ev.id}`}
      className={cn(
        'flex w-72 shrink-0 snap-start flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition active:scale-[0.98]',
        highlight && 'ring-2 ring-primary/30',
      )}
    >
      {/* Gradient banner top */}
      <div className="relative h-20 overflow-hidden bg-gradient-to-br from-primary via-amber-500 to-amber-400 px-4 py-3">
        <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-white/15" />
        <div className="relative flex items-start justify-between text-white">
          <div className="flex h-12 w-12 flex-col items-center justify-center rounded-xl bg-white text-stone-900 shadow">
            <span className="text-[9px] font-medium uppercase text-primary">
              {d.toLocaleDateString('th-TH', { month: 'short' })}
            </span>
            <span className="font-mono text-lg font-bold leading-none">{d.getDate()}</span>
          </div>
          {ev.hasSubmitted && (
            <span className="rounded-full bg-white/30 px-2 py-0.5 text-[10px] font-semibold backdrop-blur">
              ✓ เข้าร่วม
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <h3 className="line-clamp-2 font-semibold leading-snug">{ev.name}</h3>
        <div className="mt-auto space-y-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3 w-3 shrink-0" />
            <span className="truncate">{formatThaiDateTime(ev.eventDate)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{ev.venue}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="h-3 w-3 shrink-0" />
            <span>{ev.attendeeCount} คน</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function CarouselSkeleton() {
  return (
    <div className="flex gap-3 overflow-hidden pr-4">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="w-72 shrink-0 overflow-hidden rounded-2xl border bg-card">
          <div className="h-20 animate-pulse bg-muted" />
          <div className="space-y-2 p-3">
            <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}
