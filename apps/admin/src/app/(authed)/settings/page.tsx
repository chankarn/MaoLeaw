// File: apps/admin/src/app/(authed)/settings/page.tsx
'use client';
import { useEffect, useState } from 'react';
import {
  Calendar,
  Download,
  FileText,
  KeyRound,
  Lock,
  Receipt,
  User,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  useChangePassword,
  useProfile,
  useUpdateProfile,
} from '@/hooks/use-settings';
import { downloadCsv } from '@/lib/download';
import { cn } from '@/lib/utils';

type Tab = 'profile' | 'export';

const TABS: { value: Tab; label: string; icon: React.ReactNode }[] = [
  { value: 'profile', label: 'Profile', icon: <User className="h-4 w-4" /> },
  { value: 'export', label: 'Export Data', icon: <Download className="h-4 w-4" /> },
];

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('profile');

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="border-b border-amber-700 bg-gradient-to-r from-primary to-amber-500 px-4 py-4 text-white md:px-8 md:py-5">
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-sm text-white/80">จัดการ profile, app config และ export ข้อมูล</p>
      </header>

      <div className="grid grid-cols-1 gap-6 p-4 md:p-8 lg:grid-cols-[220px_1fr]">
        {/* Tab nav */}
        <nav className="space-y-1">
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                tab === t.value
                  ? 'bg-primary/10 font-semibold text-primary'
                  : 'text-stone-600 hover:bg-stone-100',
              )}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </nav>

        <div className="max-w-2xl">
          {tab === 'profile' && <ProfileTab />}
          {tab === 'export' && <ExportTab />}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════ Profile Tab ═══════════════════════ */

function ProfileTab() {
  const { data: me, isLoading } = useProfile();
  const update = useUpdateProfile();
  const changePw = useChangePassword();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');

  useEffect(() => {
    if (me) {
      setName(me.name);
      setEmail(me.email);
    }
  }, [me]);

  async function saveProfile() {
    try {
      await update.mutateAsync({ name: name.trim(), email: email.trim() });
      toast.success('อัปเดต profile แล้ว');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'อัปเดตไม่สำเร็จ');
    }
  }

  async function savePassword() {
    if (newPw !== confirmPw) {
      toast.error('New password และ Confirm ไม่ตรงกัน');
      return;
    }
    if (newPw.length < 10) {
      toast.error('Password ต้องอย่างน้อย 10 ตัว');
      return;
    }
    try {
      await changePw.mutateAsync({ currentPassword: currentPw, newPassword: newPw });
      toast.success('เปลี่ยน password เรียบร้อย');
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'เปลี่ยนไม่สำเร็จ');
    }
  }

  if (isLoading || !me) return <Skeleton />;

  return (
    <div className="space-y-6">
      <Card className="space-y-4 p-6">
        <SectionTitle icon={<User className="h-4 w-4" />} title="Profile" />
        <div className="space-y-2">
          <Label htmlFor="name">ชื่อ</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="flex justify-end pt-2">
          <Button onClick={saveProfile} disabled={update.isPending}>
            {update.isPending ? 'กำลังบันทึก…' : 'บันทึก Profile'}
          </Button>
        </div>
      </Card>

      <Card className="space-y-4 p-6">
        <SectionTitle icon={<KeyRound className="h-4 w-4" />} title="เปลี่ยน Password" />
        <div className="space-y-2">
          <Label htmlFor="current">Current password</Label>
          <Input
            id="current"
            type="password"
            value={currentPw}
            onChange={(e) => setCurrentPw(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="new">New password</Label>
          <Input
            id="new"
            type="password"
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            autoComplete="new-password"
            placeholder="อย่างน้อย 10 ตัว"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm new password</Label>
          <Input
            id="confirm"
            type="password"
            value={confirmPw}
            onChange={(e) => setConfirmPw(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        <div className="flex justify-end pt-2">
          <Button
            onClick={savePassword}
            disabled={changePw.isPending || !currentPw || !newPw || !confirmPw}
            variant="destructive"
          >
            <Lock className="mr-1.5 h-4 w-4" />
            {changePw.isPending ? 'กำลังเปลี่ยน…' : 'เปลี่ยน Password'}
          </Button>
        </div>
      </Card>
    </div>
  );
}

/* ═══════════════════════ Export Tab ═══════════════════════ */

function ExportTab() {
  const [downloading, setDownloading] = useState<string | null>(null);

  async function handleDownload(key: string, path: string, filename: string) {
    setDownloading(key);
    try {
      await downloadCsv(path, filename);
      toast.success(`ดาวน์โหลด ${filename} แล้ว`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'ดาวน์โหลดไม่สำเร็จ');
    } finally {
      setDownloading(null);
    }
  }

  const exports = [
    {
      key: 'events',
      label: 'Events',
      icon: <Calendar className="h-5 w-5" />,
      path: '/admin/export/events.csv',
      filename: 'maoleaw-events.csv',
      desc: 'ทุก event พร้อม status, attendees, bill info',
    },
    {
      key: 'bills',
      label: 'Bills',
      icon: <Receipt className="h-5 w-5" />,
      path: '/admin/export/bills.csv',
      filename: 'maoleaw-bills.csv',
      desc: 'ทุกบิล พร้อม total/paid/pending counts',
    },
    {
      key: 'members',
      label: 'Members',
      icon: <Users className="h-5 w-5" />,
      path: '/admin/export/members.csv',
      filename: 'maoleaw-members.csv',
      desc: 'รายชื่อสมาชิกทั้งหมด พร้อม type/drink/events count',
    },
    {
      key: 'shares',
      label: 'Bill Shares (รายบุคคล)',
      icon: <FileText className="h-5 w-5" />,
      path: '/admin/export/shares.csv',
      filename: 'maoleaw-shares.csv',
      desc: 'รายละเอียดยอด/สถานะการจ่าย ต่อคนต่อบิล',
    },
  ];

  return (
    <Card className="p-6">
      <SectionTitle icon={<Download className="h-4 w-4" />} title="Export Data" />
      <p className="mb-4 text-sm text-muted-foreground">
        ไฟล์ CSV รองรับ Excel/Google Sheets · มี BOM สำหรับภาษาไทย
      </p>

      <div className="space-y-3">
        {exports.map((e) => (
          <div
            key={e.key}
            className="flex items-center gap-4 rounded-lg border bg-white p-4 hover:border-primary/40 hover:shadow-sm"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-primary">
              {e.icon}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium">{e.label}</p>
              <p className="text-xs text-muted-foreground">{e.desc}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDownload(e.key, e.path, e.filename)}
              disabled={downloading === e.key}
            >
              <Download className="mr-1.5 h-4 w-4" />
              {downloading === e.key ? 'กำลังดาวน์โหลด…' : 'Download'}
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ═══════════════════════ Helpers ═══════════════════════ */

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 border-b pb-3">
      <span className="text-primary">{icon}</span>
      <h2 className="font-semibold">{title}</h2>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-6">
      <div className="h-40 animate-pulse rounded-lg bg-muted" />
      <div className="h-40 animate-pulse rounded-lg bg-muted" />
    </div>
  );
}
