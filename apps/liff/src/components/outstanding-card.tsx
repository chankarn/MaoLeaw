'use client';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { useMyOutstanding } from '@/hooks/use-bill';
import { formatBaht } from '@/lib/utils';

/** "ยอดค้างรวม" — total still owed across sent bills, each row opens that bill. */
export function OutstandingCard() {
  const { data, isLoading, isError } = useMyOutstanding();

  if (isLoading) return <div className="h-20 animate-pulse rounded-2xl bg-muted" />;
  if (isError || !data) return null;

  if (data.bills.length === 0) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm font-medium text-emerald-700">
        ไม่มียอดค้าง เคลียร์ครบทุกบิลแล้ว 🎉
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm">
      <div className="bg-amber-50 px-4 py-3">
        <p className="text-xs text-amber-800">ยอดค้างรวม</p>
        <p className="font-mono text-3xl font-bold tabular-nums text-primary">
          {formatBaht(data.totalOutstanding)}
        </p>
      </div>
      <ul className="divide-y">
        {data.bills.map((b, i) => {
          const row = (
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{b.title}</p>
                {b.paymentStatus === 'CLAIMED' && (
                  <p className="text-[11px] text-sky-700">ส่งสลิปแล้ว รอ admin เช็ค</p>
                )}
              </div>
              <span className="font-mono text-sm font-semibold tabular-nums">{formatBaht(b.amount)}</span>
              {b.eventId && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
            </div>
          );
          return (
            <li key={`${b.eventId ?? b.title}-${i}`}>
              {b.eventId ? (
                <Link href={`/events/${b.eventId}/bill`} className="block active:bg-stone-50">
                  {row}
                </Link>
              ) : (
                row
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
