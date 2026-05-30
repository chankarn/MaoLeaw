// File: apps/admin/src/components/bill-form.tsx
'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { calculateBill, type BillItemType } from '@maoleaw/shared';
import { useEventAttendees, useEventsForBill } from '@/hooks/use-events';
import { useCreateBill, useUpdateBill } from '@/hooks/use-bills';
import { formatBaht } from '@/lib/utils';

interface RowState {
  tempId: string;
  name: string;
  price: number | '';
  itemType: BillItemType;
}

function newRow(itemType: BillItemType = 'SHARED'): RowState {
  return { tempId: crypto.randomUUID(), name: '', price: '', itemType };
}

export interface BillFormInitial {
  id: string;
  name: string;
  eventId: string;
  eventName: string;
  items: Array<{ name: string; price: number; itemType: BillItemType; sortOrder: number }>;
}

interface Props {
  /** Provide for edit mode. Omit for create mode. */
  initial?: BillFormInitial;
  /** Used only in create mode to pre-select an event. */
  presetEventId?: string;
}

export function BillForm({ initial, presetEventId = '' }: Props) {
  const router = useRouter();
  const editing = !!initial;

  const [eventId, setEventId] = useState(initial?.eventId ?? presetEventId);
  const [billName, setBillName] = useState(initial?.name ?? '');
  const [rows, setRows] = useState<RowState[]>(
    initial?.items.length
      ? initial.items.map((it) => ({
          tempId: crypto.randomUUID(),
          name: it.name,
          price: it.price,
          itemType: it.itemType,
        }))
      : [newRow()],
  );

  const events = useEventsForBill();
  const attendees = useEventAttendees(eventId || undefined);
  const create = useCreateBill();
  const update = useUpdateBill(initial?.id ?? '');

  const submitting = create.isPending || update.isPending;

  const total = useMemo(
    () => rows.reduce((s, r) => s + (typeof r.price === 'number' ? r.price : 0), 0),
    [rows],
  );

  const preview = useMemo(() => {
    if (!attendees.data) return null;
    const items = rows
      .filter((r) => r.name.trim() && typeof r.price === 'number' && r.price > 0)
      .map((r) => ({ id: r.tempId, price: r.price as number, itemType: r.itemType }));
    if (items.length === 0) return null;
    try {
      return calculateBill(
        items,
        attendees.data.map((a) => ({
          memberId: a.memberId,
          drinkChoice: a.drinkChoice,
          sharesMixer: a.sharesMixer,
        })),
      );
    } catch {
      return null;
    }
  }, [rows, attendees.data]);

  const canSubmit =
    !!eventId &&
    !!billName.trim() &&
    rows.every((r) => r.name.trim() && typeof r.price === 'number' && r.price >= 0) &&
    total > 0 &&
    !submitting;

  async function handleSave(send: boolean) {
    if (!canSubmit) return;
    const items = rows.map((r, idx) => ({
      name: r.name.trim(),
      price: r.price as number,
      itemType: r.itemType,
      sortOrder: idx,
    }));

    try {
      if (editing) {
        await update.mutateAsync({ name: billName.trim(), items });
        toast.success('อัปเดต bill แล้ว');
        if (send) {
          router.push(`/bills/${initial!.id}?action=send`);
        } else {
          router.push(`/bills/${initial!.id}`);
        }
      } else {
        const bill = (await create.mutateAsync({ eventId, name: billName.trim(), items })) as {
          id: string;
        };
        if (send) {
          router.push(`/bills/${bill.id}?action=send`);
        } else {
          toast.success('บันทึก Draft แล้ว');
          router.push(`/bills/${bill.id}`);
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'บันทึกไม่สำเร็จ');
    }
  }

  function updateRow(idx: number, patch: Partial<RowState>) {
    setRows((rs) => rs.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }
  function removeRow(idx: number) {
    setRows((rs) => rs.filter((_, i) => i !== idx));
  }

  return (
    <div className="p-4 md:p-8">
      <h1 className="mb-6 text-2xl font-semibold">{editing ? 'Edit Bill' : 'Create Bill'}</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <Card className="space-y-6 p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>ชื่อบิล</Label>
              <Input
                value={billName}
                onChange={(e) => setBillName(e.target.value)}
                placeholder="เช่น งานรุ่น 35 - ร้านเฮง"
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label>Event</Label>
              {editing ? (
                <Input value={initial!.eventName} disabled />
              ) : (
                <Select value={eventId} onValueChange={setEventId}>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือก event" />
                  </SelectTrigger>
                  <SelectContent>
                    {events.data?.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">รายการ</h2>
              <Button size="sm" variant="outline" onClick={() => setRows([...rows, newRow()])}>
                <Plus className="mr-1.5 h-4 w-4" />
                เพิ่มรายการ
              </Button>
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-[1fr_120px_160px_40px] gap-2 px-1 text-xs text-muted-foreground">
                <span>ชื่อ</span>
                <span>ราคา (฿)</span>
                <span>ประเภท</span>
                <span />
              </div>

              {rows.map((r, idx) => (
                <div key={r.tempId} className="grid grid-cols-[1fr_120px_160px_40px] gap-2">
                  <Input
                    value={r.name}
                    onChange={(e) => updateRow(idx, { name: e.target.value })}
                    placeholder="ชื่อรายการ"
                    maxLength={100}
                  />
                  <Input
                    type="number"
                    min={0}
                    value={r.price === '' ? '' : r.price}
                    onChange={(e) =>
                      updateRow(idx, {
                        price: e.target.value === '' ? '' : Math.max(0, Number(e.target.value)),
                      })
                    }
                  />
                  <Select value={r.itemType} onValueChange={(v) => updateRow(idx, { itemType: v as BillItemType })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LIQUOR">🥃 เหล้า</SelectItem>
                      <SelectItem value="BEER">🍺 เบียร์</SelectItem>
                      <SelectItem value="MIXER">🧊 มิกเซอร์</SelectItem>
                      <SelectItem value="SHARED">👥 หารทุกคน</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeRow(idx)}
                    disabled={rows.length === 1}
                    type="button"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between border-t pt-4 text-lg">
            <span className="font-semibold">รวม</span>
            <span className="font-mono font-semibold tabular-nums">{formatBaht(total)}</span>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              ยกเลิก
            </Button>
            <Button variant="outline" disabled={!canSubmit} onClick={() => handleSave(false)}>
              {editing ? 'บันทึก' : 'บันทึก Draft'}
            </Button>
            <Button disabled={!canSubmit} onClick={() => handleSave(true)}>
              บันทึก + ส่งให้สมาชิก
            </Button>
          </div>
        </Card>

        <aside className="space-y-4">
          <Card className="p-4">
            <h3 className="mb-3 font-semibold">Preview การคิดเงิน</h3>
            {!eventId ? (
              <p className="text-sm text-muted-foreground">เลือก event เพื่อดู preview</p>
            ) : !attendees.data ? (
              <p className="text-sm text-muted-foreground">กำลังโหลด…</p>
            ) : attendees.data.length === 0 ? (
              <p className="text-sm text-amber-600">⚠️ ยังไม่มีผู้เข้าร่วม event นี้</p>
            ) : !preview ? (
              <p className="text-sm text-muted-foreground">กรอกรายการเพื่อดู preview</p>
            ) : (
              <>
                <ul className="space-y-2 text-sm">
                  {preview.shares.map((s) => {
                    const a = attendees.data?.find((x) => x.memberId === s.memberId);
                    return (
                      <li key={s.memberId} className="flex items-center justify-between border-b pb-2 last:border-0">
                        <span className="truncate">{a?.name ?? s.memberId.slice(0, 8)}</span>
                        <span className="font-mono font-medium tabular-nums">{formatBaht(s.amount)}</span>
                      </li>
                    );
                  })}
                </ul>
                {preview.warnings.length > 0 && (
                  <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
                    ⚠️ {preview.warnings.join(', ')}
                  </div>
                )}
              </>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}
