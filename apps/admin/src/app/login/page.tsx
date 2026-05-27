// File: apps/admin/src/app/login/page.tsx
'use client';
import Image from 'next/image';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Eye, EyeOff, KeyRound, Lock, Mail, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiFetch, setAdminToken } from '@/lib/api';
import type { AdminAuthResponse } from '@maoleaw/shared';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await apiFetch<AdminAuthResponse>('/auth/admin/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setAdminToken(res.token);
      router.replace('/dashboard');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="relative flex min-h-screen overflow-hidden bg-stone-950 text-white">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-[28rem] w-[28rem] rounded-full bg-amber-500/20 blur-3xl" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-rose-500/10 blur-3xl" />

      <div className="relative mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-8 px-6 py-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:px-12">
        {/* ─── Left: Brand panel (hide on mobile) ─── */}
        <aside className="hidden flex-col gap-10 lg:flex">
          <div className="flex flex-col gap-3">
            <Image
              src="/logo.png"
              alt="MaoLeaw"
              width={320}
              height={128}
              className="h-40 w-auto object-contain"
            />
            <p className="text-xs font-medium uppercase tracking-wider text-primary">Admin Panel</p>
          </div>

          <div className="space-y-6">
            <h2 className="text-5xl font-bold leading-tight xl:text-6xl">
              จัดการงานเลี้ยง
              <br />
              <span className="bg-gradient-to-r from-amber-300 to-primary bg-clip-text text-transparent">
                และคิดบิลให้แฟร์
              </span>
            </h2>
            <p className="max-w-md text-base text-stone-400">
              ระบบสำหรับ admin จัดการ event, สมาชิก และเก็บเงินผ่าน LINE
            </p>

            <ul className="space-y-3 text-sm">
              <FeatureLi>📅 จัดการ events และวันเวลา</FeatureLi>
              <FeatureLi>💵 คิดบิลแบบแฟร์ — คนไม่กินแอลไม่จ่ายค่าเหล้า</FeatureLi>
              <FeatureLi>📨 ส่ง LINE Push อัตโนมัติ + verify การโอน</FeatureLi>
              <FeatureLi>📊 Dashboard real-time + export CSV</FeatureLi>
            </ul>
          </div>

          <p className="text-xs text-stone-500">© {new Date().getFullYear()} MaoLeaw · ทำกับ 🍻</p>
        </aside>

        {/* ─── Right: Login form ─── */}
        <section className="flex items-center justify-center lg:justify-start">
          <div className="w-full max-w-md">
            {/* Mobile brand (above form) */}
            <div className="mb-8 flex flex-col items-center text-center lg:hidden">
              <Image
                src="/logo.png"
                alt="MaoLeaw"
                width={280}
                height={112}
                className="h-28 w-auto object-contain"
              />
              <p className="mt-2 text-[10px] font-medium uppercase tracking-wider text-primary">
                Admin Panel
              </p>
            </div>

            {/* Form card */}
            <div className="rounded-3xl border border-white/10 bg-stone-900/80 p-8 shadow-2xl shadow-amber-900/30 backdrop-blur-xl lg:p-10">
              <div className="mb-7">
                <h1 className="flex items-center gap-2 text-2xl font-bold">
                  <ShieldCheck className="h-6 w-6 text-primary" />
                  Welcome back
                </h1>
                <p className="mt-1.5 text-sm text-stone-400">เข้าสู่ระบบเพื่อจัดการ</p>
              </div>

              <form onSubmit={onSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-stone-300">
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@maoleaw.com"
                      className="h-12 border-stone-700 bg-stone-800 pl-10 text-base text-white placeholder:text-stone-500 focus-visible:border-primary focus-visible:ring-primary"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-stone-300">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
                    <Input
                      id="password"
                      type={showPw ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••"
                      className="h-12 border-stone-700 bg-stone-800 pl-10 pr-10 text-base text-white placeholder:text-stone-500 focus-visible:border-primary focus-visible:ring-primary"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300"
                      aria-label={showPw ? 'Hide password' : 'Show password'}
                    >
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="h-12 w-full bg-gradient-to-r from-primary to-amber-500 text-base font-semibold shadow-lg shadow-amber-900/40 transition-all hover:shadow-xl hover:shadow-amber-900/50 active:scale-[0.98]"
                  disabled={submitting || !email || !password}
                >
                  <KeyRound className="mr-2 h-4 w-4" />
                  {submitting ? 'Signing in…' : 'Sign in'}
                </Button>
              </form>

              <p className="mt-6 text-center text-[11px] text-stone-500">
                ลืม password? ติดต่อทีม dev เพื่อ reset
              </p>
            </div>

            {/* Mobile footer */}
            <p className="mt-6 text-center text-xs text-stone-500 lg:hidden">
              © {new Date().getFullYear()} MaoLeaw
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

function FeatureLi({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-stone-300">
      <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
      {children}
    </li>
  );
}
