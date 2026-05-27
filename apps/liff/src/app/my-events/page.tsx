// File: apps/liff/src/app/my-events/page.tsx
'use client';
import Link from 'next/link';
import { Calendar, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { BottomTab } from '@/components/bottom-tab';
import { HeroHeader } from '@/components/hero-header';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { useMyEvents } from '@/hooks/use-events';
import { eventTimeStatus, formatThaiDateTime } from '@/lib/utils';

export default function MyEventsPage() {
  const { data, isLoading, isError, refetch } = useMyEvents();
  const count = data?.items.length ?? 0;

  return (
    <>
      <main className="mx-auto max-w-[480px] pb-28">
        <HeroHeader
          subtitle="งานที่คุณเข้าร่วม"
          rightLabel="Joined"
          rightValue={count}
        />
        <div className="px-4">

        {isLoading ? (
          <Skeleton />
        ) : isError ? (
          <ErrorState onRetry={refetch} />
        ) : !data?.items.length ? (
          <EmptyState emoji="📅" title="ยังไม่ได้เข้าร่วมงานใด" description="กลับไปหน้าหลักเพื่อเลือกงาน" />
        ) : (
          <ul className="space-y-3">
            {data.items.map((ev) => {
              const t = eventTimeStatus(ev.eventDate);
              const target = ev.hasBill && new Date(ev.eventDate).getTime() < Date.now()
                ? `/events/${ev.id}/bill`
                : `/events/${ev.id}`;
              return (
                <li key={ev.id}>
                  <Link href={target}>
                    <Card className="p-4 transition active:scale-[0.98]">
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <h2 className="line-clamp-2 font-semibold leading-snug">{ev.name}</h2>
                        <div className="flex gap-1.5">
                          {ev.hasBill && (
                            <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                              💵 มีบิล
                            </Badge>
                          )}
                          <Badge variant={t.variant}>{t.label}</Badge>
                        </div>
                      </div>
                      <div className="space-y-1.5 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>{formatThaiDateTime(ev.eventDate)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <span className="truncate">{ev.venue}</span>
                        </div>
                      </div>
                    </Card>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        </div>
      </main>
      <BottomTab />
    </>
  );
}

function Skeleton() {
  return (
    <ul className="space-y-3">
      {Array.from({ length: 2 }).map((_, i) => (
        <li key={i} className="h-28 animate-pulse rounded-lg bg-muted" />
      ))}
    </ul>
  );
}
