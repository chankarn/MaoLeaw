// File: apps/admin/src/app/(authed)/settings/page.tsx
'use client';
import { useEffect, useState } from 'react';
import {
  Calendar,
  Download,
  FileText,
  KeyRound,
  Lock,
  QrCode,
  Receipt,
  Settings as SettingsIcon,
  Tag,
  User,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MEMBER_TYPES } from '@maoleaw/shared';
import {
  useAppConfig,
  useChangePassword,
  useProfile,
  useUpdateAppConfig,
  useUpdateProfile,
} from '@/hooks/use-settings';
import { downloadCsv } from '@/lib/download';
import { cn } from '@/lib/utils';

type Tab = 'profile' | 'app' | 'types' | 'export';

const TABS: { value: Tab; label: string; icon: React.ReactNode }[] = [
  { value: 'profile', label: 'Profile', icon: <User className="h-4 w-4" /> },
  { value: 'app', label: 'App Config', icon: <SettingsIcon className="h-4 w-4" /> },
  { value: 'types', label: 'Member Types', icon: <Tag className="h-4 w-4" /> },
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
          {tab === 'app' && <AppConfigTab />}
          {tab === 'types' && <MemberTypesTab />}
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

/* ═══════════════════════ App Config Tab ═══════════════════════ */

function AppConfigTab() {
  const { data: cfg, isLoading } = useAppConfig();
  const update = useUpdateAppConfig();
  const [ppId, setPpId] = useState('');

  useEffect(() => {
    if (cfg) setPpId(cfg.promptpayIdOverride ?? '');
  }, [cfg]);

  async function save() {
    try {
      await update.mutateAsync({
        promptpayIdOverride: ppId.trim() ? ppId.trim() : null,
      });
      toast.success('บันทึก config แล้ว');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'บันทึกไม่สำเร็จ');
    }
  }

  if (isLoading || !cfg) return <Skeleton />;

  return (
    <div className="space-y-6">
      <Card className="space-y-4 p-6">
        <SectionTitle icon={<QrCode className="h-4 w-4" />} title="PromptPay Default" />
        <p className="text-sm text-muted-foreground">
          PromptPay สำหรับ events ที่ไม่ได้ตั้งค่าเฉพาะ — override env default
        </p>
        <div className="space-y-2">
          <Label htmlFor="ppid">PromptPay ID</Label>
          <Input
            id="ppid"
            type="tel"
            inputMode="numeric"
            value={ppId}
            onChange={(e) => setPpId(e.target.value.replace(/[^0-9]/g, '').slice(0, 15))}
            placeholder="เช่น 0812345678"
            maxLength={15}
            className="font-mono"
          />
          <p className="text-xs text-muted-foreground">
            ปล่อยว่าง = ใช้ค่าจาก .env ({process.env.NEXT_PUBLIC_PROMPTPAY_ID})
          </p>
        </div>
        <div className="flex justify-end pt-2">
          <Button onClick={save} disabled={update.isPending}>
            {update.isPending ? 'กำลังบันทึก…' : 'บันทึก'}
          </Button>
        </div>
      </Card>
    </div>
  );
}

/* ═══════════════════════ Member Types Tab ═══════════════════════ */

function MemberTypesTab() {
  const { data: cfg, isLoading } = useAppConfig();
  const update = useUpdateAppConfig();
  const [labels, setLabels] = useState<Record<string, string>>({});

  useEffect(() => {
    if (cfg) {
      const init: Record<string, string> = {};
      for (const t of MEMBER_TYPES) {
        init[t.value] = cfg.memberTypeLabels[t.value] ?? t.label;
      }
      setLabels(init);
    }
  }, [cfg]);

  async function save() {
    try {
      // Only send labels that differ from default
      const overrides: Record<string, string> = {};
      for (const t of MEMBER_TYPES) {
        if (labels[t.value] && labels[t.value] !== t.label) {
          overrides[t.value] = labels[t.value]!;
        }
      }
      await update.mutateAsync({ memberTypeLabels: overrides });
      toast.success('บันทึก labels แล้ว');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'บันทึกไม่สำเร็จ');
    }
  }

  function reset() {
    const init: Record<string, string> = {};
    for (const t of MEMBER_TYPES) init[t.value] = t.label;
    setLabels(init);
  }

  if (isLoading || !cfg) return <Skeleton />;

  return (
    <Card className="space-y-4 p-6">
      <SectionTitle icon={<Tag className="h-4 w-4" />} title="Member Type Labels" />
      <p className="text-sm text-muted-foreground">
        เปลี่ยนชื่อแสดงผลของประเภทสมาชิก (ค่า enum ใน DB คงเดิม — เปลี่ยนแค่ display name)
      </p>

      <div className="space-y-2">
        {MEMBER_TYPES.map((t) => (
          <div key={t.value} className="grid grid-cols-[80px_1fr] items-center gap-3">
            <span className="rounded bg-stone-100 px-2 py-1 font-mono text-xs text-stone-600">
              {t.value}
            </span>
            <Input
              value={labels[t.value] ?? ''}
              onChange={(e) =>
                setLabels((prev) => ({ ...prev, [t.value]: e.target.value.slice(0, 50) }))
              }
              placeholder={t.label}
            />
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={reset}>
          Reset to default
        </Button>
        <Button onClick={save} disabled={update.isPending}>
          {update.isPending ? 'กำลังบันทึก…' : 'บันทึก Labels'}
        </Button>
      </div>
    </Card>
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
