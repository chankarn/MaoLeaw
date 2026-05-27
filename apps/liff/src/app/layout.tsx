// File: apps/liff/src/app/layout.tsx
import type { Metadata, Viewport } from 'next';
import { Providers } from './providers';
import { LiffBootstrap } from './liff-bootstrap';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'MaoLeaw',
  description: 'จัดการงานเลี้ยงและบิลกับเพื่อน',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#FAFAF9',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body>
        <Providers>
          <LiffBootstrap>{children}</LiffBootstrap>
        </Providers>
      </body>
    </html>
  );
}
