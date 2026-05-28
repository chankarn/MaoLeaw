// File: apps/admin/src/app/(authed)/bills/page.tsx
'use client';
import { useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  CheckCircle2,
  Edit2,
  Eye,
  Lock,
  MoreHorizontal,
  Search,
  Send,
  Trash2,
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
import { useAdminBills, useDeleteBill } from '@/hooks/use-bills';
import { cn, formatBaht, formatThaiDateTime } from '@/lib/utils';

type TabValue = 'all' | 'draft' | 'sent' | 'closed' | 'needs-attention';

const STATUS_LABEL = {
  DRAFT: 'Draft',
  SENT: 'Sent',
  CLOSED: 'Closed',
} as const;

const STATUS_VARIANT = {
  DRAFT: 'outline',
  SENT: 'warning',
  CLOSED: 'success',
} as const;

export default function BillsPage() {
  const [tab, setTab] = useState<TabValue>('all');
  const [search, setSearch] = useState('');
  const { data, isLoading } = useAdminBills();
  const del = useDeleteBill();

  const allItems = data?.items ?? [];
  const q = search.trim().toLowerCase();
  const items = q
    ? allItems.filter(
        (b) =>
          b.name.toLowerCase().includes(q) || b.eventName.toLowerCase().includes(q),
      )
    : allItems;
  const counts = {
    all: items.length,
    draft: items.filter((b) => b.status === 'DRAFT').length,
    sent: items.filter((b) => b.status === 'SENT').length,
    closed: items.filter((b) => b.status === 'CLOSED').length,
    'needs-attention': items.filter((b) => b.claimedShares > 0).length,
  };

  const filtered = items.filter((b) => {
    if (tab === 'all') return true;
    if (tab === 'needs-attention') return b.claimedShares > 0;
    return b.status.toLowerCase() === tab;
  });

  async function handleDelete(id: string, name: string) {
    if (!confirm(`ลบบิล "${name}" ?`)) return;
    try {
      await del.mutateAsync(id);
      toast.success('ลบเรียบร้อย');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'ลบไม่สำเร็จ');
    }
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header — amber gradient เหมือน Events */}
      <header className="border-b border-amber-700 bg-gradient-to-r from-primary to-amber-500 px-4 py-4 text-white md:px-8 md:py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold">Bills</h1>
            <p className="text-sm text-white/80">คิดเงินและส่งบิลให้สมาชิก</p>
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
              <Link href="/bills/new">Create Bill</Link>
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="-mb-5 mt-4 flex gap-1 border-b">
          {(
            [
              { v: 'all', label: 'All' },
              { v: 'draft', label: 'Draft' },
              { v: 'sent', label: 'Sent' },
              { v: 'closed', label: 'Closed' },
              { v: 'needs-attention', label: '⚠ ต้องตรวจ' },
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
            <div key={i} className="h-32 animate-pulse rounded-lg bg-white" />
          ))
        ) : filtered.length === 0 ? (
          <Card className="py-16 text-center">
            <p className="text-3xl">💵</p>
            <p className="mt-2 font-medium">
              {tab === 'all' ? 'ยังไม่มีบิล' : 'ไม่มีบิลในหมวดนี้'}
            </p>
            {tab === 'all' && <p className="text-sm text-muted-foreground">สร้างบิลแรกของคุณ</p>}
          </Card>
        ) : (
          filtered.map((b) => {
            const paidPct =
              b.totalShares === 0 ? 0 : Math.round((b.paidShares / b.totalShares) * 100);
            return (
              <Card
                key={b.id}
                className="group relative border bg-white p-4 transition hover:border-primary/40 hover:shadow-sm"
              >
                <Link
                  href={`/bills/${b.id}`}
                  className="absolute inset-0 z-0 rounded-lg"
                  aria-label={`ดู ${b.name}`}
                />
                <div className="relative z-10 flex items-start gap-4">
                  {/* Status icon block */}
                  <div
                    className={cn(
                      'flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-white shadow-sm',
                      b.status === 'DRAFT' && 'bg-gradient-to-br from-stone-400 to-stone-500',
                      b.status === 'SENT' && 'bg-gradient-to-br from-amber-400 to-amber-600',
                      b.status === 'CLOSED' && 'bg-gradient-to-br from-emerald-400 to-emerald-600',
                    )}
                  >
                    {b.status === 'DRAFT' && <Edit2 className="h-5 w-5" />}
                    {b.status === 'SENT' && <Send className="h-5 w-5" />}
                    {b.status === 'CLOSED' && <Lock className="h-5 w-5" />}
                  </div>

                  <div className="flex-1">
                    <div className="mb-2 flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-lg font-semibold leading-tight">{b.name}</h3>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {b.eventName} · {formatThaiDateTime(b.eventDate)}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Badge variant={STATUS_VARIANT[b.status]}>{STATUS_LABEL[b.status]}</Badge>
                        {b.claimedShares > 0 && (
                          <Badge variant="default" className="bg-sky-600">
                            <AlertCircle className="mr-1 h-3 w-3" />
                            {b.claimedShares} รอตรวจ
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Stats + progress */}
                    <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-[1fr_1fr_2fr]">
                      <Meta label="Total" value={formatBaht(b.totalAmount)} accent />
                      <Meta
                        label="Paid"
                        value={`${formatBaht(b.paidAmount)} · ${b.paidShares}/${b.totalShares}`}
                      />
                      <div>
                        <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-stone-400">
                          Progress
                        </p>
                        <div className="flex items-center gap-2">
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-stone-100">
                            <div
                              className={cn(
                                'h-full transition-all',
                                paidPct === 100
                                  ? 'bg-emerald-500'
                                  : 'bg-gradient-to-r from-primary to-amber-500',
                              )}
                              style={{ width: `${paidPct}%` }}
                            />
                          </div>
                          <span className="font-mono text-xs font-medium tabular-nums text-stone-600">
                            {paidPct}%
                          </span>
                          {paidPct === 100 && (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          )}
                        </div>
                      </div>
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
                        <Link href={`/bills/${b.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </Link>
                      </DropdownMenuItem>
                      {b.status === 'DRAFT' && (
                        <DropdownMenuItem asChild>
                          <Link href={`/bills/${b.id}/edit`}>
                            <Edit2 className="mr-2 h-4 w-4" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                      )}
                      {b.status !== 'CLOSED' && (
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleDelete(b.id, b.name)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      )}
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

function Meta({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wider text-stone-400">{label}</p>
      <p
        className={cn(
          'mt-0.5 truncate font-mono text-sm font-semibold tabular-nums',
          accent ? 'text-primary' : 'text-stone-700',
        )}
      >
        {value}
      </p>
    </div>
  );
}
