// File: apps/liff/src/components/bottom-tab.tsx
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Calendar, CalendarCheck, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/', icon: Home, label: 'Home' },
  { href: '/events', icon: Calendar, label: 'Events' },
  { href: '/my-events', icon: CalendarCheck, label: 'My Events' },
  { href: '/profile', icon: User, label: 'Profile' },
];

export function BottomTab() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[480px] rounded-t-3xl bg-white px-2 pb-4 pt-2"
      style={{
        boxShadow: '0 -8px 24px -8px rgba(0,0,0,0.12), 0 -2px 6px -2px rgba(0,0,0,0.06)',
      }}
    >
      <ul className="flex items-center justify-around">
        {TABS.map((t) => {
          const active = pathname === t.href;
          return (
            <li key={t.href} className="flex-1">
              <Link
                href={t.href}
                className={cn(
                  'flex flex-col items-center gap-0.5 rounded-2xl py-2 transition-all',
                  active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <span
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-full transition-all',
                    active && 'scale-110 bg-primary/10 shadow-sm',
                  )}
                >
                  <t.icon className={cn('h-5 w-5', active && 'stroke-[2.5]')} />
                </span>
                <span className={cn('text-[11px]', active && 'font-semibold')}>{t.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
