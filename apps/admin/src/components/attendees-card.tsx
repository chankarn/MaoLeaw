'use client';
import { useState } from 'react';
import { UserPlus, X } from 'lucide-react';
import { toast } from 'sonner';
import type { DrinkChoice } from '@maoleaw/shared';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useAddAttendee, useRemoveAttendee, type EventAttendee } from '@/hooks/use-events';
import { useAdminMembers } from '@/hooks/use-members';
import { cn } from '@/lib/utils';

const DRINKS: { value: DrinkChoice; label: string }[] = [
  { value: 'BEER', label: '🍺 เบียร์' },
  { value: 'LIQUOR', label: '🥃 เหล้า' },
  { value: 'NONE', label: '🥤 ไม่ดื่ม' },
];
const DRINK_SHORT: Record<DrinkChoice, string> = { BEER: '🍺', LIQUOR: '🥃', NONE: '🥤' };

/**
 * Who's on the bill. Admins can add people who came but never tapped join (a member, or a
 * guest without LINE) and remove no-shows — only while the bill is still a draft.
 */
export function AttendeesCard({
  eventId,
  attendees,
  onRemoved,
}: {
  eventId: string;
  attendees: EventAttendee[];
  /** Lets the form drop the member from any item rows it still has in local state. */
  onRemoved: (memberId: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const remove = useRemoveAttendee(eventId);

  async function handleRemove(a: EventAttendee) {
    if (!confirm(`เอา ${a.name} ออกจากงานนี้?${a.isGuest ? '\n(แขกจะถูกลบออกจากระบบด้วย)' : ''}`)) return;
    try {
      await remove.mutateAsync(a.memberId);
      onRemoved(a.memberId);
      toast.success(`เอา ${a.name} ออกแล้ว`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'เอาออกไม่สำเร็จ');
    }
  }

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold">ผู้เข้าร่วม ({attendees.length})</h3>
        <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
          <UserPlus className="mr-1.5 h-4 w-4" /> เพิ่มคน
        </Button>
      </div>
      {attendees.length === 0 ? (
        <p className="text-sm text-muted-foreground">ยังไม่มีใครกดเข้าร่วม เพิ่มคนที่มาได้เลย</p>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {attendees.map((a) => (
            <li
              key={a.memberId}
              className="inline-flex items-center gap-1 rounded-full border bg-white py-0.5 pl-2.5 pr-1 text-xs"
            >
              <span>{DRINK_SHORT[a.drinkChoice]}</span>
              <span className="max-w-[9rem] truncate">{a.name}</span>
              {a.isGuest && <span className="rounded bg-stone-100 px-1 text-[10px] text-stone-500">แขก</span>}
              <button
                type="button"
                onClick={() => handleRemove(a)}
                disabled={remove.isPending}
                className="rounded-full p-0.5 text-stone-400 hover:bg-red-50 hover:text-red-600"
                aria-label={`เอา ${a.name} ออก`}
              >
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <AddAttendeeDialog
        open={adding}
        onClose={() => setAdding(false)}
        eventId={eventId}
        attendingIds={new Set(attendees.map((a) => a.memberId))}
      />
    </Card>
  );
}

function AddAttendeeDialog({
  open,
  onClose,
  eventId,
  attendingIds,
}: {
  open: boolean;
  onClose: () => void;
  eventId: string;
  attendingIds: Set<string>;
}) {
  const [mode, setMode] = useState<'member' | 'guest'>('member');
  const [search, setSearch] = useState('');
  const [memberId, setMemberId] = useState<string | null>(null);
  const [guestName, setGuestName] = useState('');
  const [drink, setDrink] = useState<DrinkChoice | null>(null);
  const members = useAdminMembers({ search: search.trim() || undefined, banned: false });
  const add = useAddAttendee(eventId);

  const candidates = (members.data?.items ?? []).filter((m) => m.customName && !m.isGuest && !attendingIds.has(m.id));
  const ready = !!drink && (mode === 'member' ? !!memberId : guestName.trim().length > 0);

  function reset() {
    setMode('member');
    setSearch('');
    setMemberId(null);
    setGuestName('');
    setDrink(null);
  }

  async function handleAdd() {
    if (!ready) return;
    try {
      const r = await add.mutateAsync(
        mode === 'member' ? { memberId: memberId!, drinkChoice: drink! } : { guestName: guestName.trim(), drinkChoice: drink! },
      );
      toast.success(`เพิ่ม ${r.name} แล้ว`);
      reset();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'เพิ่มไม่สำเร็จ');
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          reset();
          onClose();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>เพิ่มคนที่มางาน</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-stone-100 p-1">
            {(
              [
                ['member', 'สมาชิกในกลุ่ม'],
                ['guest', 'แขก (ไม่มี LINE ในระบบ)'],
              ] as const
            ).map(([m, label]) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cn('rounded-md px-2 py-1.5 text-xs font-medium', mode === m ? 'bg-white shadow' : 'text-stone-500')}
              >
                {label}
              </button>
            ))}
          </div>

          {mode === 'member' ? (
            <div className="space-y-2">
              <Input placeholder="ค้นหาชื่อ…" value={search} onChange={(e) => setSearch(e.target.value)} />
              <ul className="max-h-56 divide-y overflow-y-auto rounded-md border">
                {members.isLoading ? (
                  <li className="p-3 text-muted-foreground">กำลังโหลด…</li>
                ) : candidates.length === 0 ? (
                  <li className="p-3 text-muted-foreground">ไม่พบสมาชิก (หรือเข้าร่วมงานนี้แล้ว)</li>
                ) : (
                  candidates.map((m) => (
                    <li key={m.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setMemberId(m.id);
                          if (!drink) setDrink(m.preferredDrink);
                        }}
                        className={cn(
                          'flex w-full items-center justify-between px-3 py-2 text-left hover:bg-amber-50',
                          memberId === m.id && 'bg-amber-50 font-semibold text-primary',
                        )}
                      >
                        <span className="truncate">{m.customName}</span>
                        <span className="ml-2 truncate text-xs text-muted-foreground">{m.displayName}</span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>
          ) : (
            <div className="space-y-1">
              <Input
                placeholder="ชื่อแขก เช่น เพื่อนต้น"
                value={guestName}
                maxLength={50}
                onChange={(e) => setGuestName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                แขกจะไม่ได้รับข้อความ LINE แจ้งบิลหรือทวงเงิน เก็บเงินแล้วกด &quot;💵 เงินสด&quot; หรือ &quot;โอนแล้ว&quot; ในหน้าบิลแทน
              </p>
            </div>
          )}

          <div>
            <p className="mb-1.5 text-xs font-medium">คืนนั้นดื่มอะไร</p>
            <div className="grid grid-cols-3 gap-2">
              {DRINKS.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setDrink(d.value)}
                  className={cn(
                    'rounded-md border px-2 py-2 text-xs font-medium',
                    drink === d.value ? 'border-primary bg-primary/10 text-primary' : 'hover:border-primary/40',
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              reset();
              onClose();
            }}
          >
            ยกเลิก
          </Button>
          <Button onClick={handleAdd} disabled={!ready || add.isPending}>
            {add.isPending ? 'กำลังเพิ่ม…' : 'เพิ่มเข้างาน'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
