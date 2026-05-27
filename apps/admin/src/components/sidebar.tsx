// File: apps/admin/src/components/sidebar.tsx
'use client';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Calendar, Receipt, Users, LogOut, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { apiFetch, setAdminToken } from '@/lib/api';

const NAV_MAIN = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/events', icon: Calendar, label: 'Events' },
  { href: '/bills', icon: Receipt, label: 'Bills' },
  { href: '/members', icon: Users, label: 'Members' },
];

export function Sidebar() {
  const path = usePathname();
  const router = useRouter();

  async function logout() {
    try {
      await apiFetch('/auth/admin/logout', { method: 'POST' });
    } catch {
      /* ignore */
    }
    setAdminToken(null);
    router.replace('/login');
  }

  return (
    <aside className="relative flex h-screen w-64 flex-col overflow-hidden bg-stone-900 text-stone-100 shadow-xl">
      {/* Decorative subtle amber glow */}
      <div className="pointer-events-none absolute -left-12 -top-12 h-32 w-32 rounded-full bg-primary/20 blur-2xl" />
      <div className="pointer-events-none absolute -right-12 bottom-40 h-40 w-40 rounded-full bg-amber-500/10 blur-3xl" />

      {/* Brand */}
      <div className="relative flex flex-col items-center gap-1 border-b border-stone-800 px-4 py-4">
        <div className="relative h-40 w-full">
          <Image
            src="/logo.png"
            alt="MaoLeaw"
            fill
            className="object-contain object-center"
          />
        </div>
        <span className="text-[9px] font-bold uppercase tracking-widest text-primary">Admin Panel</span>
      </div>

      <nav className="relative flex-1 px-3 py-4">
        <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-stone-500">
          General
        </p>
        <ul className="space-y-1">
          {NAV_MAIN.map((n) => {
            const active = path === n.href || (n.href !== '/dashboard' && path.startsWith(n.href));
            return (
              <li key={n.href}>
                <Link
                  href={n.href}
                  className={cn(
                    'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all',
                    active
                      ? 'bg-gradient-to-r from-primary to-amber-500 font-semibold text-white shadow-md shadow-amber-900/40'
                      : 'text-stone-400 hover:bg-stone-800 hover:text-stone-100',
                  )}
                >
                  <n.icon className={cn('h-4 w-4 transition', active && 'scale-110')} />
                  {n.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <p className="mt-6 px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-stone-500">
          Account
        </p>
        <ul className="space-y-1">
          <li>
            <Link
              href="/settings"
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-stone-400 transition-colors hover:bg-stone-800 hover:text-stone-100"
            >
              <Settings className="h-4 w-4" />
              Settings
            </Link>
          </li>
        </ul>
      </nav>

      <div className="relative border-t border-stone-800 p-3">
        <Button
          variant="ghost"
          className="w-full justify-start text-stone-400 hover:bg-stone-800 hover:text-stone-100"
          onClick={logout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </aside>
  );
}
