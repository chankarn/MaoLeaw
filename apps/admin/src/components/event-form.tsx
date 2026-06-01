// File: apps/admin/src/components/event-form.tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, Calendar, MapPin, Tag, Type } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateEvent, useUpdateEvent } from '@/hooks/use-events';
import { fromDatetimeLocal, toDatetimeLocal } from '@/lib/utils';
import type { EventStatus } from '@maoleaw/shared';

export interface EventFormInitial {
  id?: string;
  name: string;
  venue: string;
  eventDate: string;
  status: EventStatus;
}

export function EventForm({ initial }: { initial?: EventFormInitial }) {
  const router = useRouter();
  const create = useCreateEvent();
  const update = useUpdateEvent(initial?.id ?? '');

  const [name, setName] = useState(initial?.name ?? '');
  const [venue, setVenue] = useState(initial?.venue ?? '');
  const [eventDate, setEventDate] = useState(toDatetimeLocal(initial?.eventDate));
  const [status, setStatus] = useState<EventStatus>(initial?.status ?? 'ACTIVE');

  const editing = !!initial?.id;
  const submitting = create.isPending || update.isPending;
  const canSubmit = !!name.trim() && !!venue.trim() && !!eventDate && !submitting;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name: name.trim(),
      venue: venue.trim(),
      eventDate: fromDatetimeLocal(eventDate),
      status,
    };
    try {
      if (editing) {
        await update.mutateAsync(payload);
        toast.success('อัปเดตเรียบร้อย');
      } else {
        await create.mutateAsync(payload);
        toast.success('สร้างเรียบร้อย');
      }
      router.push('/events');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'บันทึกไม่สำเร็จ');
    }
  }

  return (
    <form onSubmit={onSubmit} className="min-h-screen bg-stone-50">
      {/* Simple page header */}
      <header className="border-b bg-white px-4 py-4 md:px-8 md:py-5">
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-3 w-3" />
          กลับ
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">{editing ? 'Edit Event' : 'Create Event'}</h1>
            <p className="text-sm text-muted-foreground">
              {editing ? 'แก้ไขรายละเอียดงานเลี้ยง' : 'สร้างงานเลี้ยงใหม่'}
            </p>
          </div>
          {initial?.id && (
            <span className="rounded-full bg-stone-100 px-3 py-1 font-mono text-[10px] text-stone-500">
              ID: {initial.id.slice(0, 8)}…
            </span>
          )}
        </div>
      </header>

      <div className="p-4 md:p-8">
        <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_300px]">
          {/* Main form */}
          <Card className="p-6">
            <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-stone-400">
              ข้อมูลพื้นฐาน
            </h2>

            <div className="space-y-5">
              <Field icon={<Type className="h-4 w-4" />} label="ชื่องาน" htmlFor="name">
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                  required
                  placeholder="เช่น งานรุ่น 35 ปีนี้เจอกัน"
                />
                <CountHint count={name.length} max={100} />
              </Field>

              <Field icon={<MapPin className="h-4 w-4" />} label="ร้าน / สถานที่" htmlFor="venue">
                <Input
                  id="venue"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  maxLength={200}
                  required
                  placeholder="เช่น ร้านเฮง สาขาลาดพร้าว"
                />
              </Field>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field icon={<Calendar className="h-4 w-4" />} label="วันเวลาที่จัด" htmlFor="date">
                  <Input
                    id="date"
                    type="datetime-local"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    required
                  />
                </Field>

                <Field icon={<Tag className="h-4 w-4" />} label="สถานะ">
                  <Select value={status} onValueChange={(v) => setStatus(v as EventStatus)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">
                        <span className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Active — สมาชิกเห็น
                        </span>
                      </SelectItem>
                      <SelectItem value="INACTIVE">
                        <span className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-stone-400" />
                          Inactive — ซ่อนจากสมาชิก
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-2 border-t pt-5">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                ยกเลิก
              </Button>
              <Button type="submit" disabled={!canSubmit}>
                {submitting ? 'กำลังบันทึก…' : editing ? '✓ บันทึกการแก้ไข' : '✨ สร้าง Event'}
              </Button>
            </div>
          </Card>

          {/* Preview side panel */}
          <aside className="space-y-4">
            <Card className="overflow-hidden">
              <div className="border-b border-amber-100 bg-amber-50/60 p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-800">
                  Preview
                </p>
              </div>
              <div className="p-4">
                <div className="rounded-2xl border bg-white p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-gradient-to-br from-primary to-amber-600 text-white shadow-sm">
                      <span className="text-[9px] font-medium uppercase">
                        {eventDate
                          ? new Date(eventDate).toLocaleDateString('th-TH', { month: 'short' })
                          : '—'}
                      </span>
                      <span className="font-mono text-xl font-bold leading-none">
                        {eventDate ? new Date(eventDate).getDate() : '—'}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{name || 'ชื่องาน...'}</p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        📍 {venue || 'สถานที่...'}
                      </p>
                      <span
                        className={
                          'mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ' +
                          (status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-stone-100 text-stone-600')
                        }
                      >
                        ● {status}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="mt-3 text-[10px] text-muted-foreground">
                  นี่คือลักษณะการ์ดที่สมาชิกเห็นใน LIFF
                </p>
              </div>
            </Card>

            <Card className="bg-amber-50/50 p-4 text-xs text-amber-900">
              <p className="mb-1 font-semibold">💡 Tip</p>
              <ul className="space-y-1 text-[11px] leading-relaxed text-amber-800">
                <li>• ตั้ง status = <b>Inactive</b> ถ้ายังไม่ต้องการให้สมาชิกเห็น</li>
                <li>• ช่องทางชำระเงินตั้งได้ตอนสร้าง Bill</li>
                <li>• แก้ไขได้ตลอดเวลา ก่อน Bill จะปิด</li>
              </ul>
            </Card>
          </aside>
        </div>
      </div>
    </form>
  );
}

function Field({
  icon,
  label,
  htmlFor,
  optional,
  children,
}: {
  icon?: React.ReactNode;
  label: string;
  htmlFor?: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor} className="flex items-center gap-1.5">
        <span className="text-stone-400">{icon}</span>
        {label}
        {optional && (
          <span className="text-[10px] font-normal text-stone-400">(optional)</span>
        )}
      </Label>
      {children}
    </div>
  );
}

function CountHint({ count, max }: { count: number; max: number }) {
  return (
    <p className="text-right text-[10px] text-muted-foreground">
      {count}/{max}
    </p>
  );
}
