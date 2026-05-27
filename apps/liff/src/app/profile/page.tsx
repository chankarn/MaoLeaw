// File: apps/liff/src/app/profile/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BottomTab } from '@/components/bottom-tab';
import { DRINK_PREFERENCES, MAX_CUSTOM_NAME_LENGTH, MEMBER_TYPES } from '@maoleaw/shared';
import type { DrinkPreference, MemberType } from '@maoleaw/shared';
import { useMe } from '@/hooks/use-auth';
import { useUpdateMember } from '@/hooks/use-member';

export default function ProfilePage() {
  const { data: me, isLoading } = useMe();
  const { mutateAsync, isPending } = useUpdateMember();

  const [customName, setCustomName] = useState('');
  const [preferredDrink, setPreferredDrink] = useState<DrinkPreference | ''>('');
  const [memberType, setMemberType] = useState<MemberType | ''>('');

  useEffect(() => {
    if (me) {
      setCustomName(me.customName);
      setPreferredDrink(me.preferredDrink);
      setMemberType(me.memberType);
    }
  }, [me]);

  if (isLoading || !me) {
    return (
      <main className="mx-auto max-w-[480px] px-4 pb-24 pt-4">
        <div className="mb-6 flex flex-col items-center gap-3">
          <div className="h-20 w-20 animate-pulse rounded-full bg-muted" />
          <div className="h-5 w-32 animate-pulse rounded bg-muted" />
        </div>
      </main>
    );
  }

  async function handleSave() {
    if (preferredDrink === '' || memberType === '') return;
    try {
      await mutateAsync({
        customName: customName.trim(),
        preferredDrink: preferredDrink as DrinkPreference,
        memberType: memberType as MemberType,
      });
      toast.success('บันทึกแล้ว');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'ไม่สามารถบันทึกได้');
    }
  }

  const typeLabel = MEMBER_TYPES.find((t) => t.value === me.memberType)?.label ?? '';

  return (
    <>
      <main className="mx-auto max-w-[480px] pb-28">
        {/* Hero with avatar overflow trick */}
        <div className="relative">
          <div className="relative h-40 overflow-hidden rounded-b-3xl bg-gradient-to-br from-primary via-amber-500 to-amber-400 shadow-lg">
            <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10" />
            <div className="pointer-events-none absolute -bottom-12 left-8 h-28 w-28 rounded-full bg-white/10" />
            <div className="relative flex h-full items-start justify-between px-5 pt-6">
              <h1 className="text-lg font-semibold text-white">โปรไฟล์</h1>
              <span className="text-2xl">🍻</span>
            </div>
          </div>
          {/* Avatar overlapping the hero */}
          <div className="absolute left-1/2 -bottom-10 z-10 -translate-x-1/2 text-center">
            <Avatar className="h-24 w-24 ring-4 ring-background shadow-lg">
              {me.pictureUrl && <AvatarImage src={me.pictureUrl} alt={me.customName} />}
              <AvatarFallback className="text-2xl">{(me.customName || me.displayName)[0]}</AvatarFallback>
            </Avatar>
          </div>
        </div>

        <section className="mt-14 px-4 text-center">
          <h2 className="text-lg font-semibold">{me.customName || '(ยังไม่ตั้งชื่อ)'}</h2>
          <p className="text-xs text-muted-foreground">LINE: {me.displayName}</p>
          {typeLabel && (
            <span className="mt-2 inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              {typeLabel}
            </span>
          )}
        </section>

        <div className="mt-6 px-4">
          <Card className="space-y-4 p-5">
            <div className="space-y-2">
              <Label htmlFor="profile-name">ชื่อที่ใช้แสดง</Label>
              <Input
                id="profile-name"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                maxLength={MAX_CUSTOM_NAME_LENGTH}
              />
            </div>
            <div className="space-y-2">
              <Label>เครื่องดื่มที่ชอบ</Label>
              <Select value={preferredDrink} onValueChange={(v) => setPreferredDrink(v as DrinkPreference)}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือก" />
                </SelectTrigger>
                <SelectContent>
                  {DRINK_PREFERENCES.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.emoji} {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>ประเภท</Label>
              <Select value={memberType} onValueChange={(v) => setMemberType(v as MemberType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MEMBER_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSave} disabled={isPending || customName.trim() === ''} className="w-full" size="lg">
              {isPending ? 'กำลังบันทึก…' : 'บันทึก'}
            </Button>
          </Card>
        </div>
      </main>
      <BottomTab />
    </>
  );
}
