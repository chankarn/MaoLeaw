// File: apps/admin/src/app/(authed)/dashboard/page.tsx
'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  ArrowRight,
  Calendar,
  DollarSign,
  RefreshCw,
  Receipt,
  TrendingUp,
  Trophy,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useDashboard, type DashboardData, type DashboardRange } from '@/hooks/use-dashboard';
import { useMarkShare } from '@/hooks/use-bills';
import { cn, formatBaht, formatThaiDateTime } from '@/lib/utils';

const RANGE_TABS: { value: DashboardRange; label: string }[] = [
  { value: 'today', label: 'วันนี้' },
  { value: 'week', label: 'สัปดาห์' },
  { value: 'month', label: 'เดือน' },
  { value: '3months', label: '3 เดือน' },
  { value: 'all', label: 'ทั้งหมด' },
];

export default function DashboardPage() {
  const [range, setRange] = useState<DashboardRange>('month');
  const { data, isLoading, isFetching, dataUpdatedAt, refetch } = useDashboard(range);
  const qc = useQueryClient();

  if (isLoading || !data) {
    return (
      <div className="p-4 md:p-8">
        <div className="mb-6 h-10 w-64 animate-pulse rounded bg-muted" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  const { stats, claims, upcomingEvents } = data;

  return (
    <div className="space-y-6 p-4 md:p-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">สวัสดี Admin 👋</h1>
          <p className="text-sm text-muted-foreground">ภาพรวมระบบประจำวันนี้</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Range tabs */}
          <div className="flex rounded-lg border bg-white p-0.5">
            {RANGE_TABS.map((t) => (
              <button
                key={t.value}
                onClick={() => setRange(t.value)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                  range === t.value
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-stone-600 hover:bg-stone-100',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>อัพเดท{timeAgo(new Date(dataUpdatedAt).toISOString())}</span>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => {
                refetch();
                toast.success('Refresh แล้ว');
              }}
              disabled={isFetching}
            >
              <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
            </Button>
          </div>
        </div>
      </header>

      {/* Top KPIs — clickable */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          href="/events"
          icon={<Calendar className="h-4 w-4" />}
          label="Events ทั้งหมด"
          value={stats.totalEvents}
          subtitle={
            stats.eventsThisWeek > 0
              ? `+${stats.eventsThisWeek} สัปดาห์นี้`
              : 'ไม่มี event ใหม่สัปดาห์นี้'
          }
          subtitleColor={stats.eventsThisWeek > 0 ? 'text-emerald-600' : 'text-stone-500'}
        />
        <StatCard
          href="/bills"
          icon={<DollarSign className="h-4 w-4" />}
          label="ค้างชำระ"
          value={formatBaht(stats.pendingAmount)}
          subtitle={`${stats.pendingCount} share รอตรวจ`}
          subtitleColor="text-stone-500"
          accent
        />
        <StatCard
          href="/members"
          icon={<Users className="h-4 w-4" />}
          label="Members"
          value={stats.totalMembers}
          subtitle={
            stats.membersThisWeek > 0
              ? `+${stats.membersThisWeek} ใหม่สัปดาห์นี้`
              : 'ไม่มีคนใหม่สัปดาห์นี้'
          }
          subtitleColor={stats.membersThisWeek > 0 ? 'text-emerald-600' : 'text-stone-500'}
        />
        <StatCard
          href="/bills"
          icon={<Receipt className="h-4 w-4" />}
          label="Bills เดือนนี้"
          value={stats.billsThisMonth}
          subtitle={`${formatBaht(stats.billsAmountThisMonth)} รวม`}
          subtitleColor="text-stone-500"
        />
      </section>

      {/* Claims + Upcoming */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card className="border-2 border-sky-200 bg-sky-50/30">
          <div className="flex items-center justify-between border-b border-sky-100 p-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">📨</span>
              <h2 className="font-semibold text-sky-900">
                ต้อง verify การโอน
                {claims.length > 0 && (
                  <span className="ml-1.5 rounded-full bg-sky-600 px-2 py-0.5 text-xs font-bold text-white">
                    {claims.length}
                  </span>
                )}
              </h2>
            </div>
          </div>
          <div className="p-3">
            {claims.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                🎉 ไม่มีรายการรอตรวจสอบ
              </p>
            ) : (
              <ul className="space-y-2">
                {claims.map((c) => (
                  <ClaimItem key={c.id} claim={c} onChanged={() => qc.invalidateQueries({ queryKey: ['admin-dashboard'] })} />
                ))}
              </ul>
            )}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between border-b p-4">
            <h2 className="font-semibold">📅 Events ที่กำลังจะมา</h2>
            <Button asChild variant="ghost" size="sm">
              <Link href="/events">
                ดูทั้งหมด <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </div>
          <div className="p-3">
            {upcomingEvents.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">ยังไม่มี event กำลังจะมา</p>
            ) : (
              <ul className="space-y-2">
                {upcomingEvents.map((ev) => (
                  <li key={ev.id}>
                    <Link
                      href={`/events/${ev.id}/edit`}
                      className="flex items-center gap-3 rounded-lg p-2 hover:bg-stone-50"
                    >
                      <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-gradient-to-br from-primary to-amber-600 text-white shadow-sm">
                        <span className="text-[9px] font-medium uppercase">
                          {new Date(ev.eventDate).toLocaleDateString('th-TH', { month: 'short' })}
                        </span>
                        <span className="font-mono text-sm font-bold leading-none">
                          {new Date(ev.eventDate).getDate()}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{ev.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {ev.venue} · 👥 {ev.attendeeCount}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-stone-400" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>

      {/* Drink + Bills + Weekly */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <DrinkWidget data={data.drinkBreakdown} />
        <BillsProgressWidget bills={data.activeBills} />
        <WeeklyEventsWidget data={data.weeklyEvents} />
      </div>

      {/* Top spenders + Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.4fr]">
        <TopSpendersWidget data={data.topSpenders} />
        <ActivityFeedWidget data={data.activityFeed} />
      </div>
    </div>
  );
}

/* ═══════════════════════════ Widgets ═══════════════════════════ */

function DrinkWidget({ data }: { data: DashboardData['drinkBreakdown'] }) {
  const { total, liquor, beer, none } = data;
  const pct = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100));
  return (
    <Card>
      <div className="border-b p-4">
        <h2 className="font-semibold">🍷 เครื่องดื่ม</h2>
        <p className="text-xs text-muted-foreground">{total} submissions ในช่วงนี้</p>
      </div>
      <div className="space-y-3 p-4">
        <BarRow color="bg-amber-500" label="🥃 เหล้า" count={liquor} percent={pct(liquor)} />
        <BarRow color="bg-yellow-400" label="🍺 เบียร์" count={beer} percent={pct(beer)} />
        <BarRow color="bg-sky-400" label="💧 ไม่กิน" count={none} percent={pct(none)} />
      </div>
    </Card>
  );
}

function BarRow({ color, label, count, percent }: { color: string; label: string; count: number; percent: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-medium">{label}</span>
        <span className="font-mono text-muted-foreground">
          {count} · {percent}%
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-stone-100">
        <div className={cn('h-full transition-all', color)} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function BillsProgressWidget({ bills }: { bills: DashboardData['activeBills'] }) {
  return (
    <Card>
      <div className="flex items-center justify-between border-b p-4">
        <h2 className="font-semibold">💳 Bills เก็บเงิน</h2>
        <Button asChild variant="ghost" size="sm">
          <Link href="/bills">
            ดู <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        </Button>
      </div>
      <div className="p-3">
        {bills.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">ไม่มี bill เปิดอยู่</p>
        ) : (
          <ul className="space-y-3">
            {bills.map((b) => {
              const pct = b.totalShares === 0 ? 0 : Math.round((b.paidShares / b.totalShares) * 100);
              return (
                <li key={b.id}>
                  <Link href={`/bills/${b.id}`} className="block rounded-lg p-2 hover:bg-stone-50">
                    <div className="mb-1 flex items-baseline justify-between">
                      <p className="truncate text-sm font-medium">{b.name}</p>
                      <span className="font-mono text-xs text-muted-foreground">
                        {b.paidShares}/{b.totalShares}
                      </span>
                    </div>
                    <p className="mb-1.5 truncate text-[11px] text-muted-foreground">
                      {b.eventName} · {formatBaht(b.paidAmount)} / {formatBaht(b.totalAmount)}
                    </p>
                    <div className="h-1.5 overflow-hidden rounded-full bg-stone-100">
                      <div
                        className={cn(
                          'h-full transition-all',
                          pct === 100
                            ? 'bg-emerald-500'
                            : 'bg-gradient-to-r from-primary to-amber-500',
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Card>
  );
}

function WeeklyEventsWidget({ data }: { data: DashboardData['weeklyEvents'] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  // Gridlines: 0, max/2, max
  return (
    <Card>
      <div className="border-b p-4">
        <h2 className="font-semibold">📈 Events 8 สัปดาห์</h2>
        <p className="text-xs text-muted-foreground">
          รวม {data.reduce((s, d) => s + d.count, 0)} events · max {max}/week
        </p>
      </div>
      <div className="relative px-4 pb-3 pt-4">
        {/* Gridlines */}
        <div className="absolute inset-x-4 top-4 bottom-12 flex flex-col justify-between">
          <div className="h-px bg-stone-100" />
          <div className="h-px bg-stone-100" />
          <div className="h-px bg-stone-100" />
        </div>

        <div className="relative flex h-28 items-end justify-between gap-1.5">
          {data.map((d, i) => {
            const h = (d.count / max) * 100;
            const isCurrent = i === data.length - 1;
            return (
              <div
                key={d.weekStart}
                className="group flex flex-1 flex-col items-center justify-end"
              >
                <div
                  className={cn(
                    'mb-1 font-mono text-[9px] font-medium transition-opacity',
                    d.count === 0 ? 'opacity-0' : 'text-stone-600',
                  )}
                >
                  {d.count}
                </div>
                <div
                  className={cn(
                    'w-full rounded-t transition-all',
                    isCurrent
                      ? 'bg-gradient-to-t from-primary to-amber-400 shadow-sm'
                      : 'bg-stone-200 group-hover:bg-stone-300',
                  )}
                  style={d.count > 0 ? { height: `${Math.max(4, h)}%` } : { height: '2px' }}
                  title={`${new Date(d.weekStart).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} – ${new Date(d.weekEnd).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} · ${d.count}`}
                />
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex justify-between gap-1.5 text-[9px] text-stone-400">
          {data.map((d, i) => (
            <span key={d.weekStart} className="flex-1 text-center">
              {i === data.length - 1
                ? 'นี้'
                : new Date(d.weekStart).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
            </span>
          ))}
        </div>
      </div>
    </Card>
  );
}

function TopSpendersWidget({ data }: { data: DashboardData['topSpenders'] }) {
  return (
    <Card>
      <div className="border-b p-4">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-500" />
          <h2 className="font-semibold">Top Spenders</h2>
        </div>
        <p className="text-xs text-muted-foreground">รวมยอดทุกบิลในช่วงนี้</p>
      </div>
      <div className="p-3">
        {data.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">ยังไม่มีข้อมูล</p>
        ) : (
          <ul className="space-y-2">
            {data.map((s, i) => {
              const prev = i > 0 ? data[i - 1] : null;
              const isTied = prev?.totalAmount === s.totalAmount;
              return (
                <li
                  key={s.memberId}
                  className="flex items-center gap-3 rounded-lg p-2 hover:bg-stone-50"
                >
                  <RankBadge rank={i + 1} />
                  <Avatar className="h-8 w-8">
                    {s.pictureUrl && <AvatarImage src={s.pictureUrl} alt={s.name} />}
                    <AvatarFallback>{s.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{s.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {s.billsCount} bills · {s.preferredDrink === 'LIQUOR' ? '🥃' : '🍺'}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {isTied && (
                      <span
                        className="rounded bg-stone-100 px-1 py-0.5 text-[9px] font-medium text-stone-500"
                        title="ยอดเท่าอันดับก่อนหน้า"
                      >
                        tied
                      </span>
                    )}
                    <p className="font-mono text-sm font-bold text-primary">
                      {formatBaht(s.totalAmount)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Card>
  );
}

function RankBadge({ rank }: { rank: number }) {
  const medal = ['🥇', '🥈', '🥉'][rank - 1];
  if (medal) {
    return <div className="flex w-7 shrink-0 items-center justify-center text-lg">{medal}</div>;
  }
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-stone-100 text-xs font-bold text-stone-600">
      {rank}
    </div>
  );
}

function ActivityFeedWidget({ data }: { data: DashboardData['activityFeed'] }) {
  const groups = groupByDay(data);

  return (
    <Card>
      <div className="border-b p-4">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4" />
          <h2 className="font-semibold">Activity ล่าสุด</h2>
        </div>
      </div>
      <div className="max-h-[420px] overflow-y-auto p-3">
        {data.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">ยังไม่มี activity</p>
        ) : (
          <div className="space-y-4">
            {groups.map((g) => (
              <div key={g.label}>
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                    {g.label}
                  </span>
                  <div className="h-px flex-1 bg-stone-100" />
                </div>
                <ul className="space-y-1">
                  {g.items.map((a, idx) => (
                    <li key={idx} className="flex items-start gap-3 rounded-lg p-2 hover:bg-stone-50">
                      <ActivityIcon type={a.type} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm">
                          <span className="font-semibold">{a.memberName}</span>{' '}
                          <span className="text-muted-foreground">{a.detail}</span>
                        </p>
                        <p className="text-[10px] text-muted-foreground">{timeAgo(a.at)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

function ActivityIcon({ type }: { type: 'SUBMIT' | 'CLAIM' | 'PAID' | 'REGISTER' }) {
  const map = {
    SUBMIT: { bg: 'bg-amber-100', icon: '🎉' },
    CLAIM: { bg: 'bg-sky-100', icon: '📨' },
    PAID: { bg: 'bg-emerald-100', icon: '✅' },
    REGISTER: { bg: 'bg-violet-100', icon: '👋' },
  };
  const { bg, icon } = map[type];
  return (
    <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm', bg)}>
      {icon}
    </span>
  );
}

/* ═══════════════════════════ helpers ═══════════════════════════ */

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(ms / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  if (sec < 60) return 'เมื่อสักครู่';
  if (min < 60) return `${min} นาทีที่แล้ว`;
  if (hr < 24) return `${hr} ชั่วโมงที่แล้ว`;
  if (day < 7) return `${day} วันที่แล้ว`;
  return new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
}

function groupByDay(items: DashboardData['activityFeed']) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  const todayItems: DashboardData['activityFeed'] = [];
  const yesterdayItems: DashboardData['activityFeed'] = [];
  const weekItems: DashboardData['activityFeed'] = [];
  const olderItems: DashboardData['activityFeed'] = [];

  for (const a of items) {
    const at = new Date(a.at);
    if (at >= today) todayItems.push(a);
    else if (at >= yesterday) yesterdayItems.push(a);
    else if (at >= weekAgo) weekItems.push(a);
    else olderItems.push(a);
  }

  return [
    { label: 'วันนี้', items: todayItems },
    { label: 'เมื่อวาน', items: yesterdayItems },
    { label: 'สัปดาห์นี้', items: weekItems },
    { label: 'ก่อนหน้านี้', items: olderItems },
  ].filter((g) => g.items.length > 0);
}

/* ═══════════════════════════ Stat + Claim ═══════════════════════════ */

function StatCard({
  href,
  icon,
  label,
  value,
  subtitle,
  subtitleColor,
  accent,
}: {
  href?: string;
  icon: React.ReactNode;
  label: string;
  value: number | string;
  subtitle: string;
  subtitleColor: string;
  accent?: boolean;
}) {
  const inner = (
    <Card
      className={cn(
        'transition-all',
        accent
          ? 'bg-gradient-to-br from-primary to-amber-600 text-white shadow-md hover:shadow-lg'
          : 'bg-white hover:border-primary/40 hover:shadow-sm',
      )}
    >
      <div className="p-4">
        <div
          className={cn(
            'flex items-center gap-1.5 text-xs',
            accent ? 'text-white/90' : 'text-muted-foreground',
          )}
        >
          {icon}
          <span>{label}</span>
        </div>
        <p
          className={cn(
            'mt-1 font-mono text-3xl font-bold tabular-nums',
            accent ? 'text-white' : 'text-stone-900',
          )}
        >
          {value}
        </p>
        <p
          className={cn(
            'mt-0.5 flex items-center gap-1 text-xs',
            accent ? 'text-white/80' : subtitleColor,
          )}
        >
          {!accent && subtitleColor === 'text-emerald-600' && <TrendingUp className="h-3 w-3" />}
          {subtitle}
        </p>
      </div>
    </Card>
  );
  if (href) return <Link href={href}>{inner}</Link>;
  return inner;
}

function ClaimItem({
  claim,
  onChanged,
}: {
  claim: {
    id: string;
    amount: number;
    claimedAt: string | null;
    claimNote: string | null;
    member: { name: string; pictureUrl: string | null };
    bill: { id: string; name: string; eventName: string };
  };
  onChanged: () => void;
}) {
  const mark = useMarkShare(claim.bill.id);

  async function confirm() {
    try {
      await mark.mutateAsync({ shareId: claim.id, status: 'PAID' });
      toast.success(`✓ Confirm ${claim.member.name} แล้ว`);
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'ผิดพลาด');
    }
  }
  async function reject() {
    try {
      await mark.mutateAsync({ shareId: claim.id, status: 'PENDING' });
      toast.success(`✗ Reject ${claim.member.name}`);
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'ผิดพลาด');
    }
  }

  return (
    <li className="flex items-center gap-3 rounded-lg bg-white p-3 shadow-sm">
      <Avatar className="h-9 w-9">
        {claim.member.pictureUrl && (
          <AvatarImage src={claim.member.pictureUrl} alt={claim.member.name} />
        )}
        <AvatarFallback>{claim.member.name[0] ?? '?'}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">
          {claim.member.name} · <span className="text-primary">{formatBaht(claim.amount)}</span>
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {claim.bill.eventName} · {claim.claimedAt && formatThaiDateTime(claim.claimedAt)}
        </p>
        {claim.claimNote && (
          <p className="mt-0.5 truncate text-[11px] italic text-stone-600">"{claim.claimNote}"</p>
        )}
      </div>
      <div className="flex shrink-0 gap-1">
        <Button size="sm" onClick={confirm} disabled={mark.isPending}>
          ✓ Confirm
        </Button>
        <Button size="sm" variant="outline" onClick={reject} disabled={mark.isPending}>
          ✗
        </Button>
      </div>
    </li>
  );
}
