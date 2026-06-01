// File: apps/admin/src/components/bill-form.tsx
'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronUp, Plus, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BANK_OPTIONS, calculateBill, type BankCode, type BillItemType, type DrinkChoice, type PaymentType } from '@maoleaw/shared';
import { useEventAttendees, useEventsForBill } from '@/hooks/use-events';
import { useCreateBill, useUpdateBill } from '@/hooks/use-bills';
import { cn, formatBaht } from '@/lib/utils';

interface RowState {
  tempId: string;
  name: string;
  price: number | '';
  itemType: BillItemType;
  extraMemberIds: string[];
  expanded: boolean; // local UI state for the per-row member picker
}

function newRow(itemType: BillItemType = 'SHARED'): RowState {
  return { tempId: crypto.randomUUID(), name: '', price: '', itemType, extraMemberIds: [], expanded: false };
}

/** Members who share an item by default, based purely on item type. */
function defaultMemberIdsForType(
  type: BillItemType,
  attendees: { memberId: string; drinkChoice: DrinkChoice }[],
): string[] {
  switch (type) {
    case 'SHARED':
      return attendees.map((a) => a.memberId);
    case 'LIQUOR':
      return attendees.filter((a) => a.drinkChoice === 'LIQUOR').map((a) => a.memberId);
    case 'BEER':
      return attendees.filter((a) => a.drinkChoice === 'BEER').map((a) => a.memberId);
    case 'MIXER':
      return attendees.filter((a) => a.drinkChoice !== 'NONE').map((a) => a.memberId);
  }
}

export interface BillFormInitial {
  id: string;
  name: string;
  eventId: string;
  eventName: string;
  paymentType: PaymentType;
  promptpayId: string | null;
  bankCode: BankCode | null;
  bankAccountNumber: string | null;
  bankAccountName: string | null;
  items: Array<{
    name: string;
    price: number;
    itemType: BillItemType;
    extraMemberIds: string[];
    sortOrder: number;
  }>;
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
  const [paymentType, setPaymentType] = useState<PaymentType>(initial?.paymentType ?? 'PROMPTPAY');
  const [promptpayId, setPromptpayId] = useState(initial?.promptpayId ?? '');
  const [bankCode, setBankCode] = useState<BankCode | ''>(initial?.bankCode ?? '');
  const [bankAccountNumber, setBankAccountNumber] = useState(initial?.bankAccountNumber ?? '');
  const [bankAccountName, setBankAccountName] = useState(initial?.bankAccountName ?? '');
  const [rows, setRows] = useState<RowState[]>(
    initial?.items.length
      ? initial.items.map((it) => ({
          tempId: crypto.randomUUID(),
          name: it.name,
          price: it.price,
          itemType: it.itemType,
          extraMemberIds: it.extraMemberIds ?? [],
          expanded: false,
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
      .map((r) => ({
        id: r.tempId,
        price: r.price as number,
        itemType: r.itemType,
        extraMemberIds: r.extraMemberIds,
      }));
    if (items.length === 0) return null;
    try {
      return calculateBill(
        items,
        attendees.data.map((a) => ({ memberId: a.memberId, drinkChoice: a.drinkChoice })),
      );
    } catch {
      return null;
    }
  }, [rows, attendees.data]);

  const paymentValid =
    paymentType === 'PROMPTPAY'
      ? /^[0-9]{10,15}$/.test(promptpayId.trim())
      : !!bankCode && !!bankAccountNumber.trim() && !!bankAccountName.trim();

  const canSubmit =
    !!eventId &&
    !!billName.trim() &&
    rows.every((r) => r.name.trim() && typeof r.price === 'number' && r.price >= 0) &&
    total > 0 &&
    paymentValid &&
    !submitting;

  async function handleSave(send: boolean) {
    if (!canSubmit) return;
    const items = rows.map((r, idx) => ({
      name: r.name.trim(),
      price: r.price as number,
      itemType: r.itemType,
      extraMemberIds: r.extraMemberIds,
      sortOrder: idx,
    }));
    const paymentFields =
      paymentType === 'PROMPTPAY'
        ? { paymentType: 'PROMPTPAY' as const, promptpayId: promptpayId.trim() }
        : {
            paymentType: 'BANK' as const,
            bankCode: bankCode as BankCode,
            bankAccountNumber: bankAccountNumber.trim(),
            bankAccountName: bankAccountName.trim(),
          };

    try {
      if (editing) {
        await update.mutateAsync({ name: billName.trim(), items, ...paymentFields });
        toast.success('อัปเดต bill แล้ว');
        if (send) {
          router.push(`/bills/${initial!.id}?action=send`);
        } else {
          router.push(`/bills/${initial!.id}`);
        }
      } else {
        const bill = (await create.mutateAsync({ eventId, name: billName.trim(), items, ...paymentFields })) as {
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

          {/* ─── Payment section ─── */}
          <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
            <h2 className="font-semibold">ช่องทางชำระเงิน</h2>
            <div className="flex gap-3">
              {(['PROMPTPAY', 'BANK'] as PaymentType[]).map((pt) => (
                <label
                  key={pt}
                  className={cn(
                    'flex flex-1 cursor-pointer items-center gap-2 rounded-md border p-3 text-sm transition-colors',
                    paymentType === pt ? 'border-primary bg-primary/5 font-medium' : 'bg-card',
                  )}
                >
                  <input
                    type="radio"
                    name="paymentType"
                    value={pt}
                    checked={paymentType === pt}
                    onChange={() => setPaymentType(pt)}
                    className="accent-primary"
                  />
                  {pt === 'PROMPTPAY' ? '📱 PromptPay' : '🏦 โอนธนาคาร'}
                </label>
              ))}
            </div>

            {paymentType === 'PROMPTPAY' ? (
              <div className="space-y-2">
                <Label htmlFor="ppid">หมายเลข PromptPay</Label>
                <Input
                  id="ppid"
                  type="tel"
                  inputMode="numeric"
                  className="font-mono"
                  placeholder="เช่น 0812345678 หรือ 1234567890123"
                  value={promptpayId}
                  onChange={(e) => setPromptpayId(e.target.value.replace(/[^0-9]/g, '').slice(0, 15))}
                  maxLength={15}
                />
                <p className="text-xs text-muted-foreground">เบอร์ 10 หลัก หรือบัตรประชาชน 13 หลัก</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>ธนาคาร</Label>
                  <Select value={bankCode} onValueChange={(v) => setBankCode(v as BankCode)}>
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกธนาคาร" />
                    </SelectTrigger>
                    <SelectContent>
                      {BANK_OPTIONS.map((b) => (
                        <SelectItem key={b.value} value={b.value}>
                          {b.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="acctNo">เลขบัญชี</Label>
                  <Input
                    id="acctNo"
                    type="tel"
                    inputMode="numeric"
                    className="font-mono"
                    placeholder="เช่น 1234567890"
                    value={bankAccountNumber}
                    onChange={(e) => setBankAccountNumber(e.target.value.replace(/[^0-9-]/g, '').slice(0, 30))}
                    maxLength={30}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="acctName">ชื่อบัญชี</Label>
                  <Input
                    id="acctName"
                    placeholder="เช่น นาย สมชาย ใจดี"
                    value={bankAccountName}
                    onChange={(e) => setBankAccountName(e.target.value.slice(0, 100))}
                    maxLength={100}
                  />
                </div>
              </div>
            )}
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">รายการ</h2>
              <Button size="sm" variant="outline" onClick={() => setRows([...rows, newRow()])}>
                <Plus className="mr-1.5 h-4 w-4" />
                เพิ่มรายการ
              </Button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-[1fr_110px_150px_140px_40px] gap-2 px-1 text-xs text-muted-foreground">
                <span>ชื่อ</span>
                <span>ราคา (฿)</span>
                <span>ประเภท</span>
                <span>ร่วมหาร</span>
                <span />
              </div>

              {rows.map((r, idx) => {
                const baseIds = attendees.data
                  ? defaultMemberIdsForType(r.itemType, attendees.data)
                  : [];
                const baseSet = new Set(baseIds);
                const eligibleCount = new Set([...baseIds, ...r.extraMemberIds]).size;
                const candidateExtras = (attendees.data ?? []).filter((a) => !baseSet.has(a.memberId));

                return (
                  <div key={r.tempId} className="space-y-2">
                    <div className="grid grid-cols-[1fr_110px_150px_140px_40px] gap-2">
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
                      <Select
                        value={r.itemType}
                        onValueChange={(v) =>
                          updateRow(idx, { itemType: v as BillItemType, extraMemberIds: [] })
                        }
                      >
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
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => updateRow(idx, { expanded: !r.expanded })}
                        disabled={!attendees.data || candidateExtras.length === 0}
                        className="justify-start gap-1.5 px-2"
                      >
                        <Users className="h-3.5 w-3.5" />
                        <span className="font-mono tabular-nums">{eligibleCount}</span>
                        <span className="text-xs text-muted-foreground">คน</span>
                        {r.extraMemberIds.length > 0 && (
                          <span className="ml-auto rounded bg-drink-mixer/15 px-1 text-[10px] font-medium text-drink-mixer">
                            +{r.extraMemberIds.length}
                          </span>
                        )}
                        {candidateExtras.length > 0 &&
                          (r.expanded ? (
                            <ChevronUp className="ml-auto h-3.5 w-3.5 opacity-60" />
                          ) : (
                            <ChevronDown className="ml-auto h-3.5 w-3.5 opacity-60" />
                          ))}
                      </Button>
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

                    {r.expanded && candidateExtras.length > 0 && (
                      <div className="ml-1 rounded-md border bg-muted/30 p-3">
                        <p className="mb-2 text-xs font-medium text-muted-foreground">
                          เพิ่มคนเข้ารายการนี้เป็นพิเศษ — คน default ตามประเภท
                          ({baseIds.length} คน) ร่วมหารอยู่แล้ว
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {candidateExtras.map((a) => {
                            const checked = r.extraMemberIds.includes(a.memberId);
                            return (
                              <label
                                key={a.memberId}
                                className={cn(
                                  'flex cursor-pointer items-center gap-2 rounded-md border bg-card px-3 py-1.5 text-sm transition-colors',
                                  checked && 'border-drink-mixer bg-drink-mixer/5',
                                )}
                              >
                                <Checkbox
                                  checked={checked}
                                  onChange={(e) =>
                                    updateRow(idx, {
                                      extraMemberIds: e.target.checked
                                        ? [...r.extraMemberIds, a.memberId]
                                        : r.extraMemberIds.filter((id) => id !== a.memberId),
                                    })
                                  }
                                />
                                <span>{a.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  ({drinkLabel(a.drinkChoice)})
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
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

function drinkLabel(c: DrinkChoice): string {
  return c === 'LIQUOR' ? 'เหล้า' : c === 'BEER' ? 'เบียร์' : 'ไม่กิน';
}
