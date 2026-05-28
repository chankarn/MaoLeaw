// File: apps/admin/src/app/(authed)/layout.tsx
'use client';
import { useState } from 'react';
import { Menu } from 'lucide-react';
import { AuthGuard } from '@/components/auth-guard';
import { Sidebar } from '@/components/sidebar';

export default function AuthedLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <AuthGuard>
      <div className="flex h-screen">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {/* Mobile topbar — hidden on desktop */}
          <header className="flex shrink-0 items-center gap-3 border-b bg-stone-900 px-4 py-3 md:hidden">
            <button
              className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-800 hover:text-stone-100"
              onClick={() => setSidebarOpen(true)}
              aria-label="เปิดเมนู"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="font-semibold text-stone-100">MaoLeaw Admin</span>
          </header>
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}
