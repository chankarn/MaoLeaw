// File: apps/liff/src/app/register/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ChevronRight, User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MEMBER_TYPES, DRINK_PREFERENCES, MAX_CUSTOM_NAME_LENGTH } from '@maoleaw/shared';
import type { DrinkPreference, MemberType } from '@maoleaw/shared';
import { useLineProfile } from '@/hooks/use-auth';
import { useRegisterMember } from '@/hooks/use-member';

export default function RegisterPage() {
  const router = useRouter();
  const { data: profile, isLoading: profileLoading } = useLineProfile();
  const { mutateAsync: register, isPending } = useRegisterMember();

  const [customName, setCustomName] = useState('');
  const [preferredDrink, setPreferredDrink] = useState<DrinkPreference | ''>('');
  const [memberType, setMemberType] = useState<MemberType | ''>('');

  useEffect(() => {
    if (profile && !customName) setCustomName(profile.displayName);
  }, [profile, customName]);

  const trimmedName = customName.trim();
  const canSubmit = trimmedName.length >= 1 && preferredDrink && memberType && !isPending;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await register({
        customName: trimmedName,
        preferredDrink: preferredDrink as DrinkPreference,
        memberType: memberType as MemberType,
      });
      toast.success('ลงทะเบียนสำเร็จ! ยินดีต้อนรับ 🍻');
      router.replace('/');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด ลองอีกครั้ง');
    }
  }

  if (profileLoading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-amber-50 px-5">
        <div className="mt-8 h-20 w-20 animate-pulse rounded-full bg-amber-200" />
        <div className="mt-6 w-full max-w-sm space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-xl bg-amber-200" />
          ))}
        </div>
      </main>
    );
  }

  return (
    <main
      className="relative flex min-h-screen flex-col overflow-hidden bg-amber-50"
      style={{
        backgroundImage:
          'radial-gradient(circle at 1px 1px, rgba(217,119,6,0.10) 1px, transparent 0)',
        backgroundSize: '18px 18px',
      }}
    >
      {/* Amber wave header */}
      <div className="relative overflow-hidden rounded-b-[2.5rem] bg-gradient-to-br from-amber-500 via-primary to-amber-600 px-6 pb-10 pt-10 text-white shadow-lg shadow-amber-900/20">
        <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-10 left-8 h-32 w-32 rounded-full bg-white/10" />
        <div className="relative text-center">
          <p className="text-lg font-bold tracking-wide">MaoLeaw</p>
          <p className="mt-0.5 text-sm text-white/80">ยินดีต้อนรับสู่วงเหล้า</p>
        </div>
      </div>

      {/* LINE Profile avatar — floats over the wave */}
      <div className="relative -mt-10 flex justify-center">
        <div className="rounded-full bg-amber-50 p-1.5 shadow-md shadow-amber-900/15">
          <Avatar className="h-20 w-20 ring-4 ring-white">
            <AvatarImage src={profile?.pictureUrl} alt={profile?.displayName} />
            <AvatarFallback className="bg-amber-100 text-2xl text-primary">
              <User className="h-8 w-8" />
            </AvatarFallback>
          </Avatar>
        </div>
      </div>

      {/* Form */}
      <div className="mx-auto w-full max-w-sm flex-1 px-5 pb-10 pt-4">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold text-stone-800">
            {profile?.displayName ? `สวัสดี, ${profile.displayName}!` : 'สร้างบัญชีใหม่'}
          </h1>
          <p className="mt-0.5 text-sm text-stone-500">กรอกข้อมูลเพื่อเริ่มใช้งาน</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-sm font-semibold text-stone-700">
              ชื่อที่ใช้แสดงในวง
            </Label>
            <div className="relative">
              <Input
                id="name"
                placeholder="เช่น เมา, ขาเหล้า"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                maxLength={MAX_CUSTOM_NAME_LENGTH}
                autoComplete="off"
                required
                className="h-12 rounded-xl border-amber-200 bg-white pl-4 text-base shadow-sm focus-visible:border-primary focus-visible:ring-primary"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-stone-400">
                {customName.length}/{MAX_CUSTOM_NAME_LENGTH}
              </span>
            </div>
          </div>

          {/* Drink preference */}
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold text-stone-700">เครื่องดื่มที่ชอบ</Label>
            <Select value={preferredDrink} onValueChange={(v) => setPreferredDrink(v as DrinkPreference)}>
              <SelectTrigger className="h-12 rounded-xl border-amber-200 bg-white shadow-sm">
                <SelectValue placeholder="เลือกเครื่องดื่ม" />
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

          {/* Member type */}
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold text-stone-700">ฉันเป็น</Label>
            <Select value={memberType} onValueChange={(v) => setMemberType(v as MemberType)}>
              <SelectTrigger className="h-12 rounded-xl border-amber-200 bg-white shadow-sm">
                <SelectValue placeholder="เลือกประเภท" />
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

          <Button
            type="submit"
            disabled={!canSubmit}
            size="lg"
            className="mt-2 w-full rounded-xl bg-gradient-to-r from-primary to-amber-500 text-base font-bold shadow-md shadow-amber-900/25 transition-all hover:shadow-lg active:scale-[0.98] disabled:opacity-50"
          >
            {isPending ? (
              'กำลังบันทึก…'
            ) : (
              <span className="flex items-center gap-2">
                เข้าร่วมวง
                <ChevronRight className="h-5 w-5" />
              </span>
            )}
          </Button>
        </form>

        <p className="mt-5 px-2 text-center text-[11px] leading-relaxed text-stone-400">
          การลงทะเบียนถือว่าคุณยอมรับให้เราเก็บข้อมูล LINE profile
          และข้อมูลการเข้าร่วมงานเพื่อใช้งานในแอปนี้
        </p>
      </div>
    </main>
  );
}
