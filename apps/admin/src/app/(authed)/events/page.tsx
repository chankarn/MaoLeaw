// File: apps/admin/src/app/(authed)/events/page.tsx
'use client';
import Link from 'next/link';
import { useState } from 'react';
import {
  Edit2,
  MapPin,
  MoreHorizontal,
  Plus,
  Receipt,
  Search,
  Trash2,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAdminEvents, useDeleteEvent } from '@/hooks/use-events';
import { cn, formatThaiDateTime } from '@/lib/utils';

type TabValue = 'all' | 'active' | 'inactive' | 'past';

export default function EventsPage() {
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<TabValue>('all');
  const { data, isLoading } = useAdminEvents({ search });
  const del = useDeleteEvent();

  const items = data?.items ?? [];
  const counts = {
    all: items.length,
    active: items.filter((e) => e.status === 'ACTIVE').length,
    inactive: items.filter((e) => e.status === 'INACTIVE').length,
    past: items.filter((e) => new Date(e.eventDate).getTime() < Date.now()).length,
  };

  const filtered = items.filter((e) => {
    if (tab === 'all') return true;
    if (tab === 'active') return e.status === 'ACTIVE';
    if (tab === 'inactive') return e.status === 'INACTIVE';
    if (tab === 'past') return new Date(e.eventDate).getTime() < Date.now();
    return true;
  });

  async function handleDelete(id: string, name: string) {
    if (!confirm(`ลบ event "${name}" ?`)) return;
    try {
      await del.mutateAsync(id);
      toast.success('ลบเรียบร้อย');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'ลบไม่สำเร็จ');
    }
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="border-b border-amber-700 bg-gradient-to-r from-primary to-amber-500 px-4 py-4 text-white md:px-8 md:py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold">Events</h1>
            <p className="text-sm text-white/80">จัดการงานเลี้ยงและกิจกรรม</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <Input
                placeholder="ค้นหา..."
                className="h-11 w-full bg-white pl-9 text-stone-900 shadow-lg shadow-amber-900/20 ring-1 ring-amber-900/5 transition-all focus-visible:shadow-xl focus-visible:shadow-amber-900/30 sm:w-64"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button
              asChild
              className="h-11 bg-white px-5 font-semibold text-primary shadow-lg shadow-amber-900/20 ring-1 ring-amber-900/5 transition-all hover:scale-[1.02] hover:bg-amber-50 hover:shadow-xl hover:shadow-amber-900/30 active:scale-95"
            >
              <Link href="/events/new">Create Event</Link>
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-4 flex gap-1 border-b -mb-5">
          {(
            [
              { v: 'all', label: 'All' },
              { v: 'active', label: 'Active' },
              { v: 'inactive', label: 'Inactive' },
              { v: 'past', label: 'Past' },
            ] as { v: TabValue; label: string }[]
          ).map((t) => (
            <button
              key={t.v}
              onClick={() => setTab(t.v)}
              className={cn(
                'flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm transition-colors',
                tab === t.v
                  ? 'border-white font-semibold text-white'
                  : 'border-transparent text-white/70 hover:text-white',
              )}
            >
              {t.label}
              <span
                className={cn(
                  'rounded px-1.5 py-0.5 text-[10px] font-medium',
                  tab === t.v ? 'bg-white text-primary' : 'bg-white/20 text-white/80',
                )}
              >
                {counts[t.v]}
              </span>
            </button>
          ))}
        </div>
      </header>

      <div className="space-y-3 p-4 md:p-8">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-lg bg-white" />
          ))
        ) : filtered.length === 0 ? (
          <Card className="py-16 text-center">
            <p className="text-3xl">📅</p>
            <p className="mt-2 font-medium">{tab === 'all' ? 'ยังไม่มี event' : 'ไม่มีในหมวดนี้'}</p>
            {tab === 'all' && (
              <p className="text-sm text-muted-foreground">กด Create Event เพื่อเริ่มต้น</p>
            )}
          </Card>
        ) : (
          filtered.map((ev) => {
            const isPast = new Date(ev.eventDate).getTime() < Date.now();
            return (
              <Card
                key={ev.id}
                className="group relative border bg-white p-4 transition hover:border-primary/40 hover:shadow-sm"
              >
                <Link
                  href={`/events/${ev.id}/edit`}
                  className="absolute inset-0 z-0 rounded-lg"
                  aria-label={`แก้ ${ev.name}`}
                />
                <div className="relative z-10 flex items-start gap-4">
                  {/* Date ticket */}
                  <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl bg-gradient-to-br from-primary to-amber-600 text-white shadow-sm">
                    <span className="text-[9px] font-medium uppercase">
                      {new Date(ev.eventDate).toLocaleDateString('th-TH', { month: 'short' })}
                    </span>
                    <span className="font-mono text-2xl font-bold leading-none">
                      {new Date(ev.eventDate).getDate()}
                    </span>
                  </div>

                  <div className="flex-1">
                    <div className="mb-2 flex items-start gap-2">
                      <h3 className="text-lg font-semibold leading-tight">{ev.name}</h3>
                      <div className="flex shrink-0 gap-1">
                        <Badge variant={ev.status === 'ACTIVE' ? 'success' : 'secondary'}>
                          ● {ev.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                        </Badge>
                        {ev.hasBill && (
                          <Badge variant="warning">
                            <Receipt className="mr-1 h-3 w-3" />
                            มีบิล
                          </Badge>
                        )}
                        {isPast && <Badge variant="outline">ผ่านแล้ว</Badge>}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-3">
                      <Meta label="Date" value={formatThaiDateTime(ev.eventDate)} />
                      <Meta label="Venue" value={ev.venue} icon={<MapPin className="h-3 w-3" />} />
                      <Meta
                        label="Attendees"
                        value={`${ev.attendeeCount} คน`}
                        icon={<Users className="h-3 w-3" />}
                      />
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/events/${ev.id}/edit`}>
                          <Edit2 className="mr-2 h-4 w-4" />
                          Edit
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/bills/new?eventId=${ev.id}`}>
                          <Receipt className="mr-2 h-4 w-4" />
                          Create Bill
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => handleDelete(ev.id, ev.name)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

function Meta({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wider text-stone-400">{label}</p>
      <p className="mt-0.5 flex items-center gap-1 truncate text-sm font-medium text-stone-700">
        {icon}
        {value}
      </p>
    </div>
  );
}
