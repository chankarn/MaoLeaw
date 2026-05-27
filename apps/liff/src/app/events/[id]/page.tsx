// File: apps/liff/src/app/events/[id]/page.tsx
'use client';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, Calendar, Clock, Filter, MapPin, Users, X } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ErrorState } from '@/components/error-state';
import { useEventDetail } from '@/hooks/use-events';
import { useMe } from '@/hooks/use-auth';
import { useSubmitAttendance } from '@/hooks/use-submission';
import { cn } from '@/lib/utils';
import { MEMBER_TYPES, type DrinkChoice, type MemberType } from '@maoleaw/shared';

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useEventDetail(id);
  const { data: me } = useMe();
  const [open, setOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<MemberType | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    if (data?.event.isPast && data.event.hasBill) {
      router.replace(`/events/${id}/bill`);
    }
  }, [data, id, router]);

  if (isLoading || !data) return <DetailSkeleton />;
  if (isError) return <ErrorState onRetry={refetch} />;

  const { event, stats, attendees, mySubmission } = data;
  const date = new Date(event.eventDate);
  const countdown = getCountdown(date);
  const availableTypes = Array.from(new Set(attendees.map((a) => a.memberType)));
  const filtered = typeFilter ? attendees.filter((a) => a.memberType === typeFilter) : attendees;

  return (
    <main
      className="mx-auto min-h-screen max-w-[480px] bg-amber-50 pb-28"
      style={{
        backgroundImage:
          'radial-gradient(circle at 1px 1px, rgba(217, 119, 6, 0.12) 1px, transparent 0)',
        backgroundSize: '18px 18px',
      }}
    >
      {/* ─── Hero ─── */}
      <header className="relative overflow-hidden rounded-b-3xl bg-gradient-to-br from-primary via-amber-500 to-amber-400 px-5 pb-8 pt-5 text-white shadow-lg">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-12 left-12 h-28 w-28 rounded-full bg-white/10" />

        <button
          onClick={() => router.back()}
          className="relative -ml-2 inline-flex items-center gap-1 rounded-full p-2 text-white/90 hover:bg-white/10"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="relative mt-2 flex items-start gap-3">
          {/* Date ticket */}
          <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-white text-stone-900 shadow-md">
            <span className="text-[10px] font-medium uppercase text-primary">
              {date.toLocaleDateString('th-TH', { month: 'short' })}
            </span>
            <span className="font-mono text-2xl font-bold leading-none">{date.getDate()}</span>
            <span className="text-[10px] text-muted-foreground">
              {date.toLocaleDateString('th-TH', { year: '2-digit' }).replace('พ.ศ. ', '')}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="line-clamp-2 text-xl font-bold leading-snug">{event.name}</h1>
            {countdown && (
              <span className="mt-1.5 inline-flex items-center rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-medium backdrop-blur-sm">
                {countdown}
              </span>
            )}
          </div>
        </div>

        <div className="relative mt-4 space-y-1.5 text-sm">
          <Row icon={<Clock className="h-4 w-4" />} text={formatTime(date)} />
          <Row icon={<MapPin className="h-4 w-4" />} text={event.venue} />
        </div>
      </header>

      {/* ─── Stats cards ─── */}
      <section className="relative px-4 pt-5">
        <div className="mb-3 flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            ผู้เข้าร่วม
          </h2>
          <span className="ml-auto font-mono text-2xl font-bold tabular-nums">{stats.total}</span>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <DrinkStat
            emoji="🥃"
            label="เหล้า"
            count={stats.liquor.count}
            percent={stats.liquor.percent}
            color="from-amber-500 to-amber-600"
            ring="ring-amber-200"
          />
          <DrinkStat
            emoji="🍺"
            label="เบียร์"
            count={stats.beer.count}
            percent={stats.beer.percent}
            color="from-yellow-400 to-yellow-500"
            ring="ring-yellow-200"
          />
          <DrinkStat
            emoji="💧"
            label="ไม่กิน"
            count={stats.none.count}
            percent={stats.none.percent}
            color="from-sky-400 to-sky-500"
            ring="ring-sky-200"
          />
        </div>

        {/* progress bar */}
        {stats.total > 0 && (
          <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-stone-200">
            {stats.liquor.count > 0 && (
              <div
                className="bg-gradient-to-r from-amber-500 to-amber-600 transition-all"
                style={{ width: `${stats.liquor.percent}%` }}
              />
            )}
            {stats.beer.count > 0 && (
              <div
                className="bg-gradient-to-r from-yellow-400 to-yellow-500 transition-all"
                style={{ width: `${stats.beer.percent}%` }}
              />
            )}
            {stats.none.count > 0 && (
              <div
                className="bg-gradient-to-r from-sky-400 to-sky-500 transition-all"
                style={{ width: `${stats.none.percent}%` }}
              />
            )}
          </div>
        )}
      </section>

      {/* ─── Attendee list ─── */}
      <section className="relative mt-6 px-4">
        <div className="mb-3 flex items-center gap-2">
          <h2 className="shrink-0 font-semibold">รายชื่อ</h2>

          {/* Horizontal chip strip — slides out from filter icon */}
          <div
            className={cn(
              'flex-1 overflow-hidden transition-all duration-300 ease-out',
              filterOpen ? 'max-w-[400px] opacity-100' : 'max-w-0 opacity-0',
            )}
          >
            <div
              className="flex gap-2 overflow-x-auto pr-2"
              style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
            >
              <FilterChip active={typeFilter === null} onClick={() => setTypeFilter(null)}>
                ทั้งหมด · {attendees.length}
              </FilterChip>
              {MEMBER_TYPES.filter((t) => availableTypes.includes(t.value)).map((t) => {
                const count = attendees.filter((a) => a.memberType === t.value).length;
                return (
                  <FilterChip
                    key={t.value}
                    active={typeFilter === t.value}
                    onClick={() =>
                      setTypeFilter(typeFilter === t.value ? null : t.value)
                    }
                  >
                    {t.label} · {count}
                  </FilterChip>
                );
              })}
            </div>
          </div>

          {/* Count — collapses when filter open */}
          <span
            className={cn(
              'shrink-0 overflow-hidden whitespace-nowrap text-xs text-muted-foreground transition-all duration-300',
              filterOpen ? 'max-w-0 opacity-0' : 'max-w-[160px] opacity-100',
            )}
          >
            {filtered.length}
            {typeFilter && ` / ${attendees.length}`} คน
          </span>

          {attendees.length > 0 && availableTypes.length > 1 && (
            <button
              onClick={() => setFilterOpen((v) => !v)}
              className={cn(
                'relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors',
                filterOpen || typeFilter
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-stone-200 bg-white text-stone-600 hover:border-primary/40 hover:text-primary',
              )}
              aria-label={filterOpen ? 'ปิดตัวกรอง' : 'กรองตามประเภท'}
            >
              <Filter
                className={cn(
                  'h-4 w-4 transition-all duration-300',
                  filterOpen && 'rotate-180 scale-90',
                )}
              />
              {typeFilter && !filterOpen && (
                <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-amber-50" />
              )}
            </button>
          )}
        </div>

        {filtered.length === 0 ? (
          <Card className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <span className="text-3xl">{typeFilter ? '🔍' : '🎉'}</span>
            <p className="text-sm font-medium">
              {typeFilter ? 'ไม่มีคนประเภทนี้' : 'ยังไม่มีใครเข้าร่วม'}
            </p>
            <p className="text-xs text-muted-foreground">
              {typeFilter ? 'ลองเลือกตัวกรองอื่น' : 'เป็นคนแรกที่ลงชื่อสิ!'}
            </p>
          </Card>
        ) : (
          <ul className="space-y-2">
            {filtered.map((a) => (
              <li
                key={a.memberId}
                className={cn(
                  'flex items-center gap-3 rounded-2xl border bg-white p-3 shadow-sm transition',
                  a.isMe && 'border-primary/40 ring-1 ring-primary/20',
                )}
              >
                <Avatar className="h-10 w-10 ring-2 ring-background">
                  {a.pictureUrl && <AvatarImage src={a.pictureUrl} alt={a.name} />}
                  <AvatarFallback>{a.name[0] ?? '?'}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold">{a.name}</span>
                    {a.isMe && (
                      <Badge variant="default" className="h-5 px-1.5 text-[10px]">
                        คุณ
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {drinkText(a.drinkChoice)} · {memberTypeLabel(a.memberType)}
                  </p>
                </div>
                <div
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-full text-lg',
                    a.drinkChoice === 'LIQUOR' && 'bg-amber-100',
                    a.drinkChoice === 'BEER' && 'bg-yellow-100',
                    a.drinkChoice === 'NONE' && 'bg-sky-100',
                  )}
                >
                  {drinkEmoji(a.drinkChoice)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ─── Sticky CTA (raised like bottom nav) ─── */}
      <div
        className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[480px] rounded-t-3xl bg-white px-4 pb-5 pt-4"
        style={{
          boxShadow:
            '0 -8px 24px -8px rgba(0,0,0,0.12), 0 -2px 6px -2px rgba(0,0,0,0.06)',
        }}
      >
        <Button
          size="lg"
          className="w-full shadow-md"
          onClick={() => setOpen(true)}
          disabled={event.billClosed}
        >
          {event.billClosed
            ? '🔒 ปิดบิลแล้ว — แก้ไม่ได้'
            : mySubmission
              ? '✏️  แก้ไขการเข้าร่วม'
              : '🎉 เข้าร่วมงาน'}
        </Button>
      </div>

      <JoinDialog
        open={open}
        onOpenChange={setOpen}
        eventId={event.id}
        defaultName={mySubmission?.nameSnapshot ?? me?.customName ?? ''}
        defaultDrink={mySubmission?.drinkChoice ?? (me?.preferredDrink as DrinkChoice | undefined)}
      />
    </main>
  );
}

function Row({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="opacity-90">{icon}</span>
      <span className="truncate">{text}</span>
    </div>
  );
}

function DrinkStat({
  emoji,
  label,
  count,
  percent,
  color,
  ring,
}: {
  emoji: string;
  label: string;
  count: number;
  percent: number;
  color: string;
  ring: string;
}) {
  return (
    <div className={cn('rounded-2xl border bg-card p-3 text-center shadow-sm ring-1', ring)}>
      <div
        className={cn(
          'mx-auto mb-1.5 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br text-xl shadow-sm',
          color,
        )}
      >
        {emoji}
      </div>
      <p className="font-mono text-lg font-bold tabular-nums leading-none">{count}</p>
      <p className="mt-0.5 text-[10px] font-medium uppercase text-muted-foreground">{label}</p>
      <p className="text-[10px] font-mono text-muted-foreground tabular-nums">{percent}%</p>
    </div>
  );
}

function getCountdown(date: Date): string | null {
  const diffMs = date.getTime() - Date.now();
  if (diffMs < 0) return 'ผ่านมาแล้ว';
  const dayMs = 24 * 60 * 60 * 1000;
  const days = Math.floor(diffMs / dayMs);
  const hours = Math.floor((diffMs % dayMs) / (60 * 60 * 1000));
  if (days === 0 && hours === 0) return 'กำลังเริ่ม!';
  if (days === 0) return `อีก ${hours} ชม.`;
  if (days < 7) return `อีก ${days} วัน`;
  if (days < 30) return `อีก ${Math.floor(days / 7)} สัปดาห์`;
  return `อีก ${Math.floor(days / 30)} เดือน`;
}

function formatTime(d: Date): string {
  return d.toLocaleString('th-TH', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function drinkEmoji(c: DrinkChoice): string {
  return c === 'LIQUOR' ? '🥃' : c === 'BEER' ? '🍺' : '💧';
}

function drinkText(c: DrinkChoice): string {
  return c === 'LIQUOR' ? 'เหล้า' : c === 'BEER' ? 'เบียร์' : 'ไม่กินแอลกอฮอล์';
}

function memberTypeLabel(t: MemberType): string {
  return MEMBER_TYPES.find((m) => m.value === t)?.label ?? t;
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
        active
          ? 'border-primary bg-primary text-primary-foreground shadow-sm'
          : 'border-stone-200 bg-white text-stone-600 hover:border-primary/40 hover:text-primary',
      )}
    >
      {children}
    </button>
  );
}

function JoinDialog({
  open,
  onOpenChange,
  eventId,
  defaultName,
  defaultDrink,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  eventId: string;
  defaultName: string;
  defaultDrink: DrinkChoice | undefined;
}) {
  const { mutateAsync, isPending } = useSubmitAttendance(eventId);
  const [name, setName] = useState(defaultName);
  const [drink, setDrink] = useState<DrinkChoice | ''>(defaultDrink ?? '');

  useEffect(() => {
    if (open) {
      setName(defaultName);
      setDrink(defaultDrink ?? '');
    }
  }, [open, defaultName, defaultDrink]);

  const canSubmit = name.trim().length > 0 && drink !== '' && !isPending;

  async function handleSubmit() {
    try {
      await mutateAsync({ nameSnapshot: name.trim(), drinkChoice: drink as DrinkChoice });
      toast.success('บันทึกแล้ว');
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'ไม่สามารถบันทึกได้');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{defaultDrink ? 'แก้ไขการเข้าร่วม' : 'เข้าร่วมงาน'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>ชื่อ</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={50} />
          </div>
          <div className="space-y-2">
            <Label>เครื่องดื่มที่จะกิน</Label>
            <RadioGroup
              value={drink}
              onValueChange={(v) => setDrink(v as DrinkChoice)}
              className="grid grid-cols-3 gap-2"
            >
              {(
                [
                  ['LIQUOR', '🥃', 'เหล้า'],
                  ['BEER', '🍺', 'เบียร์'],
                  ['NONE', '💧', 'ไม่กิน'],
                ] as const
              ).map(([v, emoji, l]) => (
                <label
                  key={v}
                  className={cn(
                    'flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border bg-card p-3 text-sm font-medium transition-all',
                    drink === v
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/40 shadow-sm scale-105'
                      : 'hover:bg-muted/50',
                  )}
                >
                  <RadioGroupItem value={v} className="sr-only" />
                  <span className="text-2xl">{emoji}</span>
                  <span>{l}</span>
                </label>
              ))}
            </RadioGroup>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            ยกเลิก
          </Button>
          <Button disabled={!canSubmit} onClick={handleSubmit}>
            {isPending ? 'กำลังบันทึก…' : 'บันทึก'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DetailSkeleton() {
  return (
    <main className="mx-auto max-w-[480px] bg-stone-50">
      <div className="h-56 animate-pulse rounded-b-3xl bg-muted" />
      <div className="space-y-4 p-4">
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
    </main>
  );
}
