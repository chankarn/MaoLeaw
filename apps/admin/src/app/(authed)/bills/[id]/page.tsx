// File: apps/admin/src/app/(authed)/bills/[id]/page.tsx
'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  DollarSign,
  Edit2,
  Lock,
  RefreshCcw,
  RotateCcw,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  useAdminBill,
  useBulkMarkShares,
  useCloseBill,
  useDeleteBill,
  useMarkShare,
  useResetToDraft,
  useRetryPush,
  useSendBill,
} from '@/hooks/use-bills';
import { cn, formatBaht, formatThaiDateTime } from '@/lib/utils';

const STATUS_VARIANT = { DRAFT: 'outline', SENT: 'warning', CLOSED: 'success' } as const;

export default function BillDetailPage() {
  const { id } = useParams<{ id: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const { data: bill, isLoading } = useAdminBill(id);
  const send = useSendBill(id);
  const close = useCloseBill(id);
  const mark = useMarkShare(id);
  const bulkMark = useBulkMarkShares(id);
  const retry = useRetryPush(id);
  const del = useDeleteBill();
  const reset = useResetToDraft(id);

  const [autoSendDone, setAutoSendDone] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (search.get('action') === 'send' && bill?.status === 'DRAFT' && !autoSendDone) {
      setAutoSendDone(true);
      send
        .mutateAsync()
        .then((r) => {
          toast.success(`ส่งแล้ว ${r.sent}/${r.sent + r.failed} คน`);
          router.replace(`/bills/${id}`);
        })
        .catch((err) => toast.error(err instanceof Error ? err.message : 'ส่งไม่สำเร็จ'));
    }
  }, [search, bill, autoSendDone, send, router, id]);

  const stats = useMemo(() => {
    if (!bill) return null;
    const paid = bill.shares.filter((s) => s.paymentStatus === 'PAID');
    const claimed = bill.shares.filter((s) => s.paymentStatus === 'CLAIMED');
    const pending = bill.shares.filter((s) => s.paymentStatus === 'PENDING');
    return {
      paidCount: paid.length,
      paidAmount: paid.reduce((s, x) => s + x.amount, 0),
      claimedCount: claimed.length,
      claimedAmount: claimed.reduce((s, x) => s + x.amount, 0),
      pendingCount: pending.length,
      pendingAmount: pending.reduce((s, x) => s + x.amount, 0),
      totalShares: bill.shares.length,
    };
  }, [bill]);

  if (isLoading || !bill || !stats) {
    return <div className="p-8 text-muted-foreground">Loading…</div>;
  }

  const selectedShares = bill.shares.filter((s) => selected.has(s.id));
  const allSelected = bill.shares.length > 0 && selected.size === bill.shares.length;
  const someSelected = selected.size > 0 && selected.size < bill.shares.length;

  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(bill!.shares.map((s) => s.id)));
  }
  function toggleOne(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }
  function clearSelection() {
    setSelected(new Set());
  }

  async function handleSend() {
    try {
      const r = await send.mutateAsync();
      toast.success(`ส่งแล้ว ${r.sent} คน${r.failed > 0 ? ` (failed ${r.failed})` : ''}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'ส่งไม่สำเร็จ');
    }
  }

  async function handleClose() {
    if (!confirm('ปิดบิลแล้วจะแก้ submission ไม่ได้ ยืนยัน?')) return;
    try {
      await close.mutateAsync();
      toast.success('ปิดบิลแล้ว');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'ปิดบิลไม่สำเร็จ');
    }
  }

  async function handleDelete() {
    if (!confirm(`ลบบิล "${bill?.name}" ?`)) return;
    try {
      await del.mutateAsync(id);
      toast.success('ลบเรียบร้อย');
      router.push('/bills');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'ลบไม่สำเร็จ');
    }
  }

  async function handleReset() {
    if (
      !confirm(
        'รีเซ็ตเป็น Draft จะ:\n• ล้างสถานะแจ้งโอน/ชำระของทุกคน\n• ต้อง Send ใหม่หลังแก้\n\nยืนยัน?',
      )
    )
      return;
    try {
      await reset.mutateAsync();
      toast.success('รีเซ็ตเป็น Draft แล้ว');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'รีเซ็ตไม่สำเร็จ');
    }
  }

  async function handleBulk(status: 'PENDING' | 'CLAIMED' | 'PAID') {
    if (selected.size === 0) return;
    try {
      const r = await bulkMark.mutateAsync({ shareIds: [...selected], status });
      toast.success(`อัปเดต ${r.count} share เป็น ${status}`);
      clearSelection();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'ไม่สำเร็จ');
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 pb-24">
      {/* Amber header */}
      <header className="border-b border-amber-700 bg-gradient-to-r from-primary to-amber-500 px-8 py-5 text-white">
        <button
          onClick={() => router.back()}
          className="mb-2 inline-flex items-center gap-1 text-xs text-white/80 hover:text-white"
        >
          <ArrowLeft className="h-3 w-3" />
          กลับ
        </button>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold leading-tight">{bill.name}</h1>
            <p className="mt-0.5 text-sm text-white/80">
              {bill.event.name} · {formatThaiDateTime(bill.event.eventDate)}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Badge variant={STATUS_VARIANT[bill.status]} className="text-xs">
              {bill.status}
            </Badge>
            {bill.status === 'DRAFT' && (
              <>
                <Button
                  asChild
                  variant="secondary"
                  className="bg-white text-primary shadow hover:bg-amber-50"
                >
                  <Link href={`/bills/${id}/edit`}>
                    <Edit2 className="mr-1.5 h-4 w-4" /> Edit
                  </Link>
                </Button>
                <Button
                  onClick={handleSend}
                  disabled={send.isPending}
                  className="bg-stone-900 hover:bg-stone-800"
                >
                  <Send className="mr-1.5 h-4 w-4" />
                  {send.isPending ? 'กำลังส่ง…' : 'Send to Members'}
                </Button>
              </>
            )}
            {bill.status === 'SENT' && (
              <>
                <Button
                  variant="secondary"
                  className="bg-white text-primary shadow hover:bg-amber-50"
                  onClick={handleReset}
                  disabled={reset.isPending}
                >
                  <RotateCcw className="mr-1.5 h-4 w-4" />
                  {reset.isPending ? 'กำลังรีเซ็ต…' : 'Reset to Draft'}
                </Button>
                <Button
                  onClick={handleClose}
                  disabled={close.isPending}
                  className="bg-stone-900 hover:bg-stone-800"
                >
                  <Lock className="mr-1.5 h-4 w-4" />
                  {close.isPending ? 'กำลังปิด…' : 'Close Bill'}
                </Button>
              </>
            )}
            {bill.status !== 'CLOSED' && (
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/15 hover:text-white"
                onClick={handleDelete}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="space-y-6 p-8">
        {/* Stats */}
        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatBox
            icon={<DollarSign className="h-4 w-4" />}
            label="Total"
            value={formatBaht(bill.totalAmount)}
            sub={`${stats.totalShares} คน`}
            accent
          />
          <StatBox
            icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
            label="Paid"
            value={formatBaht(stats.paidAmount)}
            sub={`${stats.paidCount}/${stats.totalShares}`}
            tint="emerald"
          />
          <StatBox
            icon={<Clock className="h-4 w-4 text-sky-600" />}
            label="Claimed (รอตรวจ)"
            value={formatBaht(stats.claimedAmount)}
            sub={`${stats.claimedCount} คน`}
            tint="sky"
          />
          <StatBox
            icon={<AlertCircle className="h-4 w-4 text-amber-600" />}
            label="Pending"
            value={formatBaht(stats.pendingAmount)}
            sub={`${stats.pendingCount} คน`}
            tint="amber"
          />
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          <Card>
            <div className="flex items-center justify-between border-b p-4">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={allSelected}
                  indeterminate={someSelected}
                  onChange={toggleAll}
                />
                <h2 className="font-semibold">
                  Members
                  <span className="ml-1.5 rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-medium text-stone-600">
                    {bill.shares.length}
                  </span>
                </h2>
              </div>
              {selected.size === 0 && stats.claimedCount > 0 && (
                <p className="text-xs text-sky-700">
                  💡 มี {stats.claimedCount} claim รอตรวจ — เลือก row เพื่อ approve พร้อมกัน
                </p>
              )}
            </div>

            <ul className="divide-y">
              {bill.shares.map((s) => {
                const isSelected = selected.has(s.id);
                return (
                  <li
                    key={s.id}
                    className={cn(
                      'flex items-center gap-3 p-4 transition-colors',
                      isSelected && 'bg-primary/5',
                    )}
                  >
                    <Checkbox checked={isSelected} onChange={() => toggleOne(s.id)} />
                    <Avatar className="h-9 w-9">
                      {s.member.linePictureUrl && (
                        <AvatarImage
                          src={s.member.linePictureUrl}
                          alt={s.member.customName}
                        />
                      )}
                      <AvatarFallback>
                        {(s.member.customName || s.member.lineDisplayName)[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold">
                          {s.member.customName || s.member.lineDisplayName}
                        </p>
                        <PaymentBadge status={s.paymentStatus} />
                        <PushBadge status={s.pushStatus} onRetry={() => retry.mutate(s.id)} />
                      </div>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        Shared {formatBaht(s.sharedAmount)} · Drink{' '}
                        {formatBaht(s.drinkAmount)}
                      </p>
                      {s.claimNote && (
                        <p className="mt-0.5 truncate text-[11px] italic text-sky-700">
                          📝 "{s.claimNote}"
                          {s.claimedAt && (
                            <span className="ml-1 text-stone-500">
                              · {formatThaiDateTime(s.claimedAt)}
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-lg font-bold tabular-nums text-primary">
                        {formatBaht(s.amount)}
                      </p>
                      <RowActions
                        share={s}
                        onMark={(status) => mark.mutate({ shareId: s.id, status })}
                        disabled={mark.isPending}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>

          <aside className="space-y-4">
            <Card>
              <div className="border-b p-4">
                <h2 className="font-semibold">📋 รายการ</h2>
              </div>
              <ul className="divide-y">
                {bill.items.map((it) => (
                  <li key={it.id} className="flex items-center justify-between p-3 text-sm">
                    <div>
                      <p className="font-medium">{it.name}</p>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {it.itemType === 'LIQUOR'
                          ? '🥃 เหล้า'
                          : it.itemType === 'BEER'
                            ? '🍺 เบียร์'
                            : '👥 หาร'}
                      </p>
                    </div>
                    <span className="font-mono tabular-nums">{formatBaht(it.price)}</span>
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between border-t bg-amber-50/60 p-3 text-base font-semibold">
                <span>รวม</span>
                <span className="font-mono tabular-nums text-primary">
                  {formatBaht(bill.totalAmount)}
                </span>
              </div>
            </Card>
          </aside>
        </div>
      </div>

      {/* Bulk action floating bar */}
      {selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-white px-8 py-4 shadow-2xl">
          <div className="mx-auto flex max-w-5xl items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                {selected.size}
              </span>
              <p className="text-sm font-medium">
                เลือกแล้ว {selected.size} จาก {bill.shares.length}
              </p>
              <p className="font-mono text-xs text-muted-foreground">
                · {formatBaht(selectedShares.reduce((sum, s) => sum + s.amount, 0))}
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => handleBulk('PAID')}
                disabled={bulkMark.isPending}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <CheckCircle2 className="mr-1.5 h-4 w-4" />
                Mark as Paid
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulk('PENDING')}
                disabled={bulkMark.isPending}
              >
                Reset to Pending
              </Button>
              <Button size="sm" variant="ghost" onClick={clearSelection}>
                <X className="mr-1 h-4 w-4" />
                Clear
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatBox({
  icon,
  label,
  value,
  sub,
  accent,
  tint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  accent?: boolean;
  tint?: 'emerald' | 'sky' | 'amber';
}) {
  const tintBg = {
    emerald: 'bg-emerald-50 border-emerald-100',
    sky: 'bg-sky-50 border-sky-100',
    amber: 'bg-amber-50 border-amber-100',
  };
  return (
    <Card
      className={cn(
        accent
          ? 'bg-gradient-to-br from-primary to-amber-600 text-white shadow-md'
          : tint
            ? tintBg[tint]
            : 'bg-white',
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
            'mt-1 font-mono text-xl font-bold tabular-nums',
            accent ? 'text-white' : 'text-stone-900',
          )}
        >
          {value}
        </p>
        <p
          className={cn('mt-0.5 text-[11px]', accent ? 'text-white/80' : 'text-muted-foreground')}
        >
          {sub}
        </p>
      </div>
    </Card>
  );
}

function PaymentBadge({ status }: { status: 'PENDING' | 'CLAIMED' | 'PAID' }) {
  if (status === 'PAID') return <Badge variant="success">Paid</Badge>;
  if (status === 'CLAIMED') return <Badge variant="warning">📨 Claimed</Badge>;
  return <Badge variant="outline">Pending</Badge>;
}

function PushBadge({
  status,
  onRetry,
}: {
  status: 'PENDING' | 'SENT' | 'FAILED';
  onRetry: () => void;
}) {
  if (status === 'SENT')
    return (
      <span className="text-[10px] text-emerald-600" title="LINE Push sent">
        📨✓
      </span>
    );
  if (status === 'FAILED')
    return (
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-0.5 text-[10px] text-rose-600 hover:underline"
        title="Push failed — click to retry"
      >
        ⚠ <RefreshCcw className="h-2.5 w-2.5" />
      </button>
    );
  return null;
}

function RowActions({
  share,
  onMark,
  disabled,
}: {
  share: { id: string; paymentStatus: 'PENDING' | 'CLAIMED' | 'PAID' };
  onMark: (status: 'PENDING' | 'CLAIMED' | 'PAID') => void;
  disabled: boolean;
}) {
  if (share.paymentStatus === 'PAID') {
    return (
      <Button
        size="sm"
        variant="ghost"
        className="mt-1 h-7 text-[11px] text-stone-500"
        onClick={() => onMark('PENDING')}
        disabled={disabled}
      >
        Reset
      </Button>
    );
  }
  if (share.paymentStatus === 'CLAIMED') {
    return (
      <div className="mt-1 flex gap-1">
        <Button
          size="sm"
          className="h-7 bg-emerald-600 px-2 text-[11px] hover:bg-emerald-700"
          onClick={() => onMark('PAID')}
          disabled={disabled}
        >
          ✓ Confirm
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2 text-[11px]"
          onClick={() => onMark('PENDING')}
          disabled={disabled}
        >
          ✗
        </Button>
      </div>
    );
  }
  return (
    <Button
      size="sm"
      variant="outline"
      className="mt-1 h-7 text-[11px]"
      onClick={() => onMark('PAID')}
      disabled={disabled}
    >
      Mark paid
    </Button>
  );
}
