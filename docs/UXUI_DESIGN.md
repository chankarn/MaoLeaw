# UX/UI Design — MaoLeaw

> **Source:** `docs/PRD.md`, `docs/SA_BLUEPRINT.md`
> **Brand direction:** Modern Minimal + Whiskey Amber palette
> **Stack:** Next.js 16 + Tailwind CSS + shadcn/ui
> **Last updated:** 2026-05-23

---

## 1. Design System Summary

### 1.1 Fonts

| Role | Family | Source | Weights |
|---|---|---|---|
| Thai body / heading | **IBM Plex Sans Thai** | Google Fonts | 400, 500, 600, 700 |
| Latin body / heading | **Inter** | Google Fonts | 400, 500, 600, 700 |
| Monospace (amounts, IDs) | **IBM Plex Mono** | Google Fonts | 500, 600 |

Font stack:
```css
font-family: 'Inter', 'IBM Plex Sans Thai', system-ui, -apple-system, sans-serif;
```

### 1.2 Color Tokens — Whiskey Amber

| Token | Light | Dark | Usage |
|---|---|---|---|
| **Primary 600** | `#D97706` (amber-600) | same | CTA, links, focus ring |
| **Primary 700** | `#B45309` (amber-700) | `#F59E0B` | Hover state |
| **Primary 50** | `#FFFBEB` | `#451A03` | Background tint, badges |
| **Secondary** | `#292524` (stone-800) | `#E7E5E4` | Headings on light bg / dark text |
| **Accent — Success** | `#10B981` (emerald-500) | same | Paid status, success toast |
| **Accent — Warning** | `#F59E0B` (amber-500) | same | Pending, draft |
| **Accent — Danger** | `#DC2626` (red-600) | same | Errors, delete |
| **Accent — Info** | `#0EA5E9` (sky-500) | same | Info toast |
| **Neutral BG** | `#FAFAF9` (stone-50) | `#0C0A09` (stone-950) | Page bg |
| **Neutral Card** | `#FFFFFF` | `#1C1917` (stone-900) | Card bg |
| **Neutral Border** | `#E7E5E4` (stone-200) | `#292524` (stone-800) | Dividers |
| **Neutral Text** | `#1C1917` (stone-900) | `#FAFAF9` | Body text |
| **Neutral Muted** | `#78716C` (stone-500) | `#A8A29E` (stone-400) | Captions |

### 1.3 Spacing & Radius

| Token | Value | Usage |
|---|---|---|
| `space-1` → `space-12` | 4px → 48px (Tailwind default) | All spacing |
| `radius-sm` | 6px | Buttons (small) |
| `radius-md` | 8px | Inputs, cards |
| `radius-lg` | 12px | Modals, large cards |
| `radius-xl` | 16px | LIFF cards (rounded for mobile feel) |
| `shadow-sm` | tailwind default | Subtle elevation |
| `shadow-md` | tailwind default | Cards |
| `shadow-lg` | tailwind default | Modals, sticky CTAs |

### 1.4 Drink Type Color Mapping (semantic for charts/badges)

| Drink / Item type | Color | Hex | Icon | Used for |
|---|---|---|---|---|
| Liquor (เหล้า) | Amber 600 | `#D97706` | 🥃 | drink choice + bill item |
| Beer (เบียร์) | Yellow 500 | `#EAB308` | 🍺 | drink choice + bill item |
| None (ไม่กินแอล) | Sky 500 | `#0EA5E9` | 💧 | drink choice |
| Mixer (มิกเซอร์) | Teal 500 | `#14B8A6` | 🧊 | bill item only — โซดา/น้ำแข็ง/น้ำผลไม้ |

### 1.5 Member Type Badges

| Type | Variant | Color |
|---|---|---|
| BD (เด็ก BD) | solid | Pink 100 / Pink 700 |
| TL (เด็ก TL) | solid | Indigo 100 / Indigo 700 |
| KU (เด็ก KU) | solid | Emerald 100 / Emerald 700 |
| FRIEND (เพื่อนอีสเหล้า) | solid | Amber 100 / Amber 700 |
| OTHER (อื่นๆ) | outline | Stone 100 / Stone 700 |

---

## 2. Configuration Files

### 2.1 `tailwind.config.ts` (shared across apps)

```ts
import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'IBM Plex Sans Thai', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
      colors: {
        // shadcn/ui base tokens (HSL via CSS vars)
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // Brand-specific
        drink: {
          liquor: '#D97706',
          beer: '#EAB308',
          none: '#0EA5E9',
          mixer: '#14B8A6',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;
```

### 2.2 `globals.css` (CSS variables)

```css
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 60 9% 98%;          /* stone-50 */
    --foreground: 24 10% 10%;         /* stone-900 */
    --card: 0 0% 100%;
    --card-foreground: 24 10% 10%;
    --primary: 33 95% 44%;            /* amber-600 #D97706 */
    --primary-foreground: 0 0% 100%;
    --secondary: 30 10% 15%;          /* stone-800 */
    --secondary-foreground: 60 9% 98%;
    --muted: 60 5% 96%;
    --muted-foreground: 25 5% 45%;
    --accent: 60 5% 96%;
    --accent-foreground: 24 10% 10%;
    --destructive: 0 72% 51%;
    --destructive-foreground: 0 0% 100%;
    --border: 20 6% 90%;
    --input: 20 6% 90%;
    --ring: 33 95% 44%;
    --radius: 0.75rem;                /* 12px */
  }

  .dark {
    --background: 20 14% 4%;          /* stone-950 */
    --foreground: 60 9% 98%;
    --card: 24 10% 10%;
    --card-foreground: 60 9% 98%;
    --primary: 33 95% 50%;
    --primary-foreground: 24 10% 10%;
    --secondary: 30 6% 25%;
    --secondary-foreground: 60 9% 98%;
    --muted: 30 6% 15%;
    --muted-foreground: 24 5% 64%;
    --accent: 30 6% 15%;
    --accent-foreground: 60 9% 98%;
    --destructive: 0 62% 50%;
    --destructive-foreground: 60 9% 98%;
    --border: 30 6% 20%;
    --input: 30 6% 20%;
    --ring: 33 95% 50%;
  }

  body {
    @apply bg-background text-foreground;
    font-feature-settings: 'cv02', 'cv03', 'cv04', 'cv11';
  }
}
```

### 2.3 shadcn/ui components to install

```bash
pnpm dlx shadcn@latest add button input label select textarea \
  card avatar badge dialog sheet drawer dropdown-menu \
  table tabs toast sonner skeleton separator \
  form checkbox radio-group switch \
  calendar popover command \
  alert alert-dialog progress
```

---

## 3. Layout Patterns

### 3.1 LIFF Layout (Mobile-first, max-width 480px)

```
┌─────────────────────────────────┐
│  Header: 56px                   │
│  [Avatar] เมา ▾    [Logo]      │
├─────────────────────────────────┤
│                                 │
│  Content (scrollable)           │
│  max-width: 480px               │
│  px-4, py-3                     │
│                                 │
├─────────────────────────────────┤
│  Bottom Tab Bar: 64px           │
│  [🏠 หลัก] [📅 ของฉัน] [👤]    │
└─────────────────────────────────┘
```

### 3.2 Admin Layout (Desktop-first, sidebar)

```
┌──────────┬────────────────────────────────────────┐
│ Sidebar  │  Topbar (admin email · logout)        │
│ 256px    ├────────────────────────────────────────┤
│          │                                        │
│ 🍻 MaoLeaw│  Page Content                         │
│          │  max-width: 1280px                     │
│ ─ Events │  px-8, py-6                            │
│ ─ Bills  │                                        │
│ ─ Members│                                        │
│          │                                        │
│ Settings │                                        │
└──────────┴────────────────────────────────────────┘
```

---

## 4. Key Screens — LIFF

### 4.1 Register Page

```tsx
// apps/liff/src/app/(auth)/register/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useLiffProfile } from '@/hooks/use-liff-profile';
import { useRegisterMember } from '@/hooks/use-member';

const MEMBER_TYPES = [
  { value: 'BD',     label: 'เด็ก BD' },
  { value: 'TL',     label: 'เด็ก TL' },
  { value: 'KU',     label: 'เด็ก KU' },
  { value: 'FRIEND', label: 'เพื่อนอีสเหล้า' },
  { value: 'OTHER',  label: 'อื่นๆ' },
] as const;

const DRINKS = [
  { value: 'LIQUOR', label: '🥃  เหล้า' },
  { value: 'BEER',   label: '🍺  เบียร์' },
] as const;

export default function RegisterPage() {
  const router = useRouter();
  const { data: lineProfile, isLoading: profileLoading } = useLiffProfile();
  const { mutateAsync: register, isPending } = useRegisterMember();

  const [customName, setCustomName] = useState('');
  const [preferredDrink, setPreferredDrink] = useState<'LIQUOR'|'BEER'|''>('');
  const [memberType, setMemberType] = useState<string>('');

  // Prefill custom name from LINE display name
  if (lineProfile && !customName) setCustomName(lineProfile.displayName);

  const canSubmit = customName.trim().length >= 1 && preferredDrink && memberType && !isPending;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await register({ customName: customName.trim(), preferredDrink: preferredDrink as any, memberType: memberType as any });
      toast.success('ลงทะเบียนสำเร็จ! ยินดีต้อนรับ 🍻');
      router.replace('/');
    } catch (err: any) {
      toast.error(err?.message ?? 'เกิดข้อผิดพลาด ลองอีกครั้ง');
    }
  }

  if (profileLoading) return <RegisterSkeleton />;

  return (
    <main className="mx-auto flex min-h-screen max-w-[480px] flex-col px-4 py-6">
      <header className="mb-8 text-center">
        <Avatar className="mx-auto mb-3 h-20 w-20 ring-2 ring-primary/20">
          <AvatarImage src={lineProfile?.pictureUrl} alt={lineProfile?.displayName} />
          <AvatarFallback>{lineProfile?.displayName?.[0] ?? '?'}</AvatarFallback>
        </Avatar>
        <h1 className="text-2xl font-semibold tracking-tight">ยินดีต้อนรับ! 🍻</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          เริ่มต้นใช้ MaoLeaw ด้วยข้อมูลพื้นฐาน
        </p>
      </header>

      <form onSubmit={onSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="name">ชื่อที่ใช้แสดง</Label>
          <Input
            id="name"
            placeholder="เช่น เมา"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            maxLength={50}
            autoComplete="off"
            required
          />
          <p className="text-xs text-muted-foreground">{customName.length}/50</p>
        </div>

        <div className="space-y-2">
          <Label>เครื่องดื่มที่ชอบ</Label>
          <Select value={preferredDrink} onValueChange={(v) => setPreferredDrink(v as any)}>
            <SelectTrigger><SelectValue placeholder="เลือกเครื่องดื่ม" /></SelectTrigger>
            <SelectContent>
              {DRINKS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>ประเภท</Label>
          <Select value={memberType} onValueChange={setMemberType}>
            <SelectTrigger><SelectValue placeholder="เลือกประเภท" /></SelectTrigger>
            <SelectContent>
              {MEMBER_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <Button type="submit" disabled={!canSubmit} className="w-full" size="lg">
          {isPending ? 'กำลังบันทึก…' : 'เริ่มใช้งาน'}
        </Button>

        <p className="px-2 text-center text-xs text-muted-foreground">
          การลงทะเบียนถือว่าคุณยอมรับให้เราเก็บข้อมูล LINE profile และข้อมูลการเข้าร่วมงานเพื่อใช้งานในแอปนี้
        </p>
      </form>
    </main>
  );
}

function RegisterSkeleton() {
  return (
    <main className="mx-auto max-w-[480px] px-4 py-6">
      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="h-20 w-20 animate-pulse rounded-full bg-muted" />
        <div className="h-6 w-40 animate-pulse rounded bg-muted" />
        <div className="h-4 w-56 animate-pulse rounded bg-muted" />
      </div>
      <div className="space-y-5">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
          </div>
        ))}
      </div>
    </main>
  );
}
```

### 4.2 Main — Event List

```tsx
// apps/liff/src/app/(main)/page.tsx
'use client';

import Link from 'next/link';
import { Calendar, MapPin, Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useActiveEvents } from '@/hooks/use-events';
import { formatThaiDateTime, eventTimeStatus } from '@/lib/date';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';

export default function MainPage() {
  const { data: events, isLoading, isError, refetch } = useActiveEvents();

  if (isLoading) return <EventListSkeleton />;
  if (isError)   return <ErrorState onRetry={refetch} />;
  if (!events?.length) {
    return (
      <EmptyState
        emoji="🍻"
        title="ยังไม่มีงานเลี้ยง"
        description="รอ admin สร้างงานใหม่ แล้วกลับมาดูอีกครั้งนะ"
      />
    );
  }

  return (
    <main className="mx-auto max-w-[480px] px-4 py-4">
      <h1 className="mb-4 text-xl font-semibold">งานที่กำลังจะมาถึง</h1>
      <ul className="space-y-3">
        {events.map(ev => {
          const timeStatus = eventTimeStatus(ev.eventDate);
          return (
            <li key={ev.id}>
              <Link href={`/events/${ev.id}`}>
                <Card className="p-4 transition active:scale-[0.98]">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <h2 className="line-clamp-2 font-semibold leading-snug">{ev.name}</h2>
                    <Badge variant={timeStatus.variant}>{timeStatus.label}</Badge>
                  </div>
                  <div className="space-y-1.5 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 shrink-0" />
                      <span>{formatThaiDateTime(ev.eventDate)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 shrink-0" />
                      <span className="truncate">{ev.venue}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 shrink-0" />
                      <span>{ev.attendeeCount} คนเข้าร่วม{ev.hasSubmitted && ' · มีคุณ'}</span>
                    </div>
                  </div>
                </Card>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}

function EventListSkeleton() {
  return (
    <main className="mx-auto max-w-[480px] px-4 py-4">
      <div className="mb-4 h-6 w-48 animate-pulse rounded bg-muted" />
      <ul className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <li key={i} className="rounded-lg border bg-card p-4">
            <div className="mb-2 h-5 w-3/4 animate-pulse rounded bg-muted" />
            <div className="space-y-2">
              <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
              <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
              <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
```

### 4.3 Event Detail (Pre-event) — Dashboard + Join Dialog

```tsx
// apps/liff/src/app/(main)/events/[id]/page.tsx
'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import { useEvent } from '@/hooks/use-events';
import { useSubmitAttendance } from '@/hooks/use-submission';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar, MapPin } from 'lucide-react';
import { formatThaiDateTime } from '@/lib/date';
import { DrinkBreakdownBar } from '@/components/drink-breakdown';

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, refetch } = useEvent(id);
  const [open, setOpen] = useState(false);

  if (isLoading || !data) return <EventDetailSkeleton />;

  const { event, stats, attendees, mySubmission } = data;

  return (
    <main className="mx-auto max-w-[480px] px-4 pb-24 pt-4">
      <Card className="mb-4 p-4">
        <h1 className="mb-2 text-lg font-semibold leading-tight">{event.name}</h1>
        <div className="space-y-1.5 text-sm text-muted-foreground">
          <div className="flex items-center gap-2"><Calendar className="h-4 w-4"/><span>{formatThaiDateTime(event.eventDate)}</span></div>
          <div className="flex items-center gap-2"><MapPin className="h-4 w-4"/><span>{event.venue}</span></div>
        </div>
      </Card>

      <Card className="mb-4 p-4">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-semibold">ผู้เข้าร่วม</h2>
          <span className="text-2xl font-bold tabular-nums">{stats.total}</span>
        </div>
        <DrinkBreakdownBar liquor={stats.liquor.count} beer={stats.beer.count} none={stats.none.count}/>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
          <Stat color="bg-drink-liquor" label="🥃 เหล้า" count={stats.liquor.count} percent={stats.liquor.percent}/>
          <Stat color="bg-drink-beer"   label="🍺 เบียร์" count={stats.beer.count}   percent={stats.beer.percent}/>
          <Stat color="bg-drink-none"   label="💧 ไม่กิน"  count={stats.none.count}   percent={stats.none.percent}/>
        </div>
      </Card>

      <Card className="mb-4 p-4">
        <h2 className="mb-3 font-semibold">รายชื่อ ({attendees.length})</h2>
        {attendees.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">ยังไม่มีใครเข้าร่วม เป็นคนแรก!</p>
        ) : (
          <ul className="space-y-3">
            {attendees.map(a => (
              <li key={a.memberId} className="flex items-center gap-3">
                <Avatar className="h-9 w-9"><AvatarImage src={a.pictureUrl}/><AvatarFallback>{a.name[0]}</AvatarFallback></Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{a.name}</span>
                    {a.isMe && <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">คุณ</Badge>}
                  </div>
                </div>
                <DrinkBadge choice={a.drinkChoice}/>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="fixed inset-x-0 bottom-0 mx-auto max-w-[480px] border-t bg-background/95 px-4 py-3 backdrop-blur">
        <Button size="lg" className="w-full" onClick={() => setOpen(true)}>
          {mySubmission ? 'แก้ไขการเข้าร่วม' : 'เข้าร่วมงาน'}
        </Button>
      </div>

      <JoinDialog open={open} onOpenChange={setOpen} eventId={event.id} existing={mySubmission} onSuccess={refetch}/>
    </main>
  );
}

function Stat({ color, label, count, percent }: { color: string; label: string; count: number; percent: number; }) {
  return (
    <div>
      <div className={`mx-auto mb-1 h-1.5 w-8 rounded-full ${color}`}/>
      <div className="font-medium">{label}</div>
      <div className="text-muted-foreground tabular-nums">{count} · {percent}%</div>
    </div>
  );
}

function DrinkBadge({ choice }: { choice: 'LIQUOR'|'BEER'|'NONE' }) {
  const map = {
    LIQUOR: { label: '🥃 เหล้า', cls: 'bg-drink-liquor/10 text-drink-liquor border-drink-liquor/30' },
    BEER:   { label: '🍺 เบียร์', cls: 'bg-drink-beer/10 text-drink-beer border-drink-beer/30' },
    NONE:   { label: '💧 ไม่กิน',  cls: 'bg-drink-none/10 text-drink-none border-drink-none/30' },
  }[choice];
  return <Badge variant="outline" className={`h-6 ${map.cls}`}>{map.label}</Badge>;
}

function JoinDialog({ open, onOpenChange, eventId, existing, onSuccess }: {
  open: boolean; onOpenChange: (v: boolean) => void; eventId: string;
  existing: { nameSnapshot: string; drinkChoice: 'LIQUOR'|'BEER'|'NONE' } | null;
  onSuccess: () => void;
}) {
  const { mutateAsync: submit, isPending } = useSubmitAttendance(eventId);
  const [name, setName] = useState(existing?.nameSnapshot ?? '');
  const [drink, setDrink] = useState<'LIQUOR'|'BEER'|'NONE'|''>(existing?.drinkChoice ?? '');

  const canSubmit = name.trim() && drink && !isPending;

  async function handleSubmit() {
    await submit({ nameSnapshot: name.trim(), drinkChoice: drink as any });
    onSuccess();
    onOpenChange(false);
  }

  // Note: ไม่มี mixer opt-in ที่นี่อีกแล้ว — admin pick รายคนเข้ารายการเองตอนสร้างบิล
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[400px]">
        <DialogHeader><DialogTitle>{existing ? 'แก้ไขการเข้าร่วม' : 'เข้าร่วมงาน'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>ชื่อ</Label>
            <Input value={name} onChange={e => setName(e.target.value)} maxLength={50}/>
          </div>
          <div className="space-y-2">
            <Label>เครื่องดื่มที่จะกิน</Label>
            <RadioGroup value={drink} onValueChange={(v) => setDrink(v as any)} className="grid grid-cols-3 gap-2">
              {([['LIQUOR','🥃 เหล้า'],['BEER','🍺 เบียร์'],['NONE','💧 ไม่กิน']] as const).map(([v,l]) => (
                <Label key={v} className="flex cursor-pointer items-center justify-center gap-2 rounded-md border bg-card p-3 text-sm font-medium has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                  <RadioGroupItem value={v} className="sr-only"/>
                  {l}
                </Label>
              ))}
            </RadioGroup>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>ยกเลิก</Button>
          <Button disabled={!canSubmit} onClick={handleSubmit}>
            {isPending ? 'กำลังบันทึก…' : 'บันทึก'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EventDetailSkeleton() {
  return (
    <main className="mx-auto max-w-[480px] space-y-4 px-4 py-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="space-y-3 rounded-lg border bg-card p-4">
          <div className="h-5 w-2/3 animate-pulse rounded bg-muted"/>
          <div className="h-4 w-1/2 animate-pulse rounded bg-muted"/>
          <div className="h-4 w-3/4 animate-pulse rounded bg-muted"/>
        </div>
      ))}
    </main>
  );
}
```

### 4.4 Event Detail (Post-event) — Bill View with QR

```tsx
// apps/liff/src/app/(main)/events/[id]/bill/page.tsx
'use client';

import { useParams } from 'next/navigation';
import { useMyBill } from '@/hooks/use-bill';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import generatePayload from 'promptpay-qr';
import QRCode from 'qrcode.react';

export default function MyBillPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useMyBill(id);

  if (isLoading || !data) return <BillSkeleton/>;

  const { bill, myShare, qrPayload } = data;

  const isPromptPay = qrPayload.type === 'PROMPTPAY';
  const payload = isPromptPay
    ? generatePayload(qrPayload.value, { amount: qrPayload.amount / 1 })
    : null;

  return (
    <main className="mx-auto max-w-[480px] px-4 py-4">
      <Card className="mb-4 overflow-hidden">
        <div className="bg-secondary p-4 text-secondary-foreground">
          <p className="text-xs opacity-80">{bill.name}</p>
          <p className="mt-3 text-sm opacity-80">ยอดที่ต้องจ่าย</p>
          <p className="font-mono text-4xl font-semibold tabular-nums">฿{myShare.amount.toLocaleString('th-TH')}</p>
          <div className="mt-2">
            {myShare.paymentStatus === 'PAID'
              ? <Badge className="bg-emerald-500 text-white">✓ ชำระแล้ว</Badge>
              : <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">⏳ รอชำระ</Badge>
            }
          </div>
        </div>
        <div className="space-y-1 p-4 text-sm">
          <Row label="ค่าอาหาร / หารทุกคน" value={myShare.sharedAmount}/>
          <Row label="ค่าเครื่องดื่ม"          value={myShare.drinkAmount}/>
          {myShare.mixerAmount > 0 && (
            <Row label="ค่ามิกเซอร์"            value={myShare.mixerAmount}/>
          )}
        </div>
      </Card>

      <Card className="mb-4 p-6">
        <h2 className="mb-4 text-center font-semibold">สแกนเพื่อจ่าย</h2>
        <div className="mx-auto flex h-64 w-64 items-center justify-center rounded-lg bg-white p-4 shadow-sm">
          {isPromptPay && payload ? (
            <QRCode value={payload} size={224}/>
          ) : qrPayload.customUrl ? (
            <img src={qrPayload.customUrl} alt="QR" className="h-full w-full object-contain"/>
          ) : null}
        </div>
        <p className="mt-3 text-center text-sm text-muted-foreground">
          PromptPay: <span className="font-mono">{qrPayload.value}</span>
        </p>
        <Button variant="outline" className="mt-4 w-full" onClick={() => downloadQr()}>
          <Download className="mr-2 h-4 w-4"/>บันทึกรูป QR
        </Button>
      </Card>

      {myShare.paymentStatus !== 'PAID' && (
        <Button size="lg" className="w-full" variant="default">
          ✅ ฉันโอนแล้ว
        </Button>
      )}
    </main>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono tabular-nums">฿{value.toLocaleString('th-TH')}</span>
    </div>
  );
}

function BillSkeleton() { /* similar pattern */ return null; }
async function downloadQr() { /* canvas → png download */ }
```

### 4.5 Bottom Tab Bar (Shared layout)

```tsx
// apps/liff/src/components/bottom-tab.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, CalendarCheck, User } from 'lucide-react';
import { clsx } from 'clsx';

const TABS = [
  { href: '/',          icon: Home,          label: 'หลัก' },
  { href: '/my-events', icon: CalendarCheck, label: 'ของฉัน' },
  { href: '/profile',   icon: User,          label: 'โปรไฟล์' },
];

export function BottomTab() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 backdrop-blur">
      <ul className="mx-auto flex max-w-[480px]">
        {TABS.map(t => {
          const active = pathname === t.href;
          return (
            <li key={t.href} className="flex-1">
              <Link
                href={t.href}
                className={clsx(
                  'flex flex-col items-center gap-1 py-2 text-xs transition',
                  active ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <t.icon className="h-5 w-5"/>
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
```

---

## 5. Key Screens — Admin

### 5.1 Sidebar Layout

```tsx
// apps/admin/src/components/sidebar.tsx
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Calendar, Receipt, Users, Settings, LogOut } from 'lucide-react';
import { clsx } from 'clsx';

const NAV = [
  { href: '/events',  icon: Calendar, label: 'Events' },
  { href: '/bills',   icon: Receipt,  label: 'Bills' },
  { href: '/members', icon: Users,    label: 'Members' },
];

export function Sidebar() {
  const path = usePathname();
  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-card">
      <div className="flex items-center gap-2 px-6 py-5">
        <span className="text-2xl">🍻</span>
        <span className="text-lg font-semibold">MaoLeaw</span>
        <span className="ml-auto rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">Admin</span>
      </div>

      <nav className="flex-1 px-3">
        <ul className="space-y-1">
          {NAV.map(n => {
            const active = path.startsWith(n.href);
            return (
              <li key={n.href}>
                <Link
                  href={n.href}
                  className={clsx(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition',
                    active ? 'bg-primary/10 font-medium text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <n.icon className="h-4 w-4"/>
                  {n.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t p-3">
        <Link href="/settings" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted">
          <Settings className="h-4 w-4"/>Settings
        </Link>
        <button className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted">
          <LogOut className="h-4 w-4"/>Logout
        </button>
      </div>
    </aside>
  );
}
```

### 5.2 Events Table

```tsx
// apps/admin/src/app/(authed)/events/page.tsx
'use client';

import Link from 'next/link';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit2, Trash2, Receipt } from 'lucide-react';
import { useAdminEvents } from '@/hooks/use-admin-events';
import { formatThaiDateTime } from '@/lib/date';

export default function AdminEventsPage() {
  const { data, isLoading } = useAdminEvents();

  return (
    <div className="p-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Events</h1>
          <p className="text-sm text-muted-foreground">จัดการงานเลี้ยงและกิจกรรม</p>
        </div>
        <Button asChild>
          <Link href="/events/new"><Plus className="mr-2 h-4 w-4"/>Create Event</Link>
        </Button>
      </header>

      <Card>
        <div className="border-b p-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
            <Input placeholder="ค้นหาตามชื่อหรือร้าน" className="pl-9"/>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Venue</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Attendees</TableHead>
              <TableHead className="w-12"/>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? [...Array(5)].map((_, i) => <SkeletonRow key={i}/>)
              : data?.items.map(ev => (
                <TableRow key={ev.id}>
                  <TableCell className="font-medium">{ev.name}</TableCell>
                  <TableCell className="text-muted-foreground">{formatThaiDateTime(ev.eventDate)}</TableCell>
                  <TableCell className="text-muted-foreground">{ev.venue}</TableCell>
                  <TableCell>
                    <Badge variant={ev.status === 'ACTIVE' ? 'default' : 'secondary'}>
                      {ev.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{ev.attendeeCount}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4"/></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild><Link href={`/events/${ev.id}/edit`}><Edit2 className="mr-2 h-4 w-4"/>Edit</Link></DropdownMenuItem>
                        <DropdownMenuItem asChild><Link href={`/bills/new?eventId=${ev.id}`}><Receipt className="mr-2 h-4 w-4"/>Create Bill</Link></DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive"><Trash2 className="mr-2 h-4 w-4"/>Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            }
          </TableBody>
        </Table>

        {!isLoading && !data?.items.length && (
          <div className="py-16 text-center">
            <p className="text-2xl">📅</p>
            <p className="mt-2 font-medium">ยังไม่มี event</p>
            <p className="text-sm text-muted-foreground">กด Create Event เพื่อเริ่มต้น</p>
          </div>
        )}
      </Card>
    </div>
  );
}

function SkeletonRow() {
  return (
    <TableRow>
      {[...Array(6)].map((_, i) => (
        <TableCell key={i}><div className="h-4 w-full animate-pulse rounded bg-muted"/></TableCell>
      ))}
    </TableRow>
  );
}
```

### 5.3 Bill Create — Repeater + Live Preview

```tsx
// apps/admin/src/app/(authed)/bills/new/page.tsx
'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { calculateBill } from '@maoleaw/shared/bill-calc';
import { useEventOptions } from '@/hooks/use-events';
import { useEventAttendees } from '@/hooks/use-attendees';

type ItemType = 'LIQUOR'|'BEER'|'MIXER'|'SHARED';
type Row = {
  tempId: string;
  name: string;
  price: number;
  itemType: ItemType;
  extraMemberIds: string[]; // admin-added extras (รายคน รายรายการ)
};

// คนที่ default ร่วมหารตามประเภท (ไว้คำนวณว่า extras picker ควรโชว์ใคร)
function defaultMembersForType(type: ItemType, attendees: { memberId: string; drinkChoice: 'LIQUOR'|'BEER'|'NONE' }[]) {
  if (type === 'SHARED') return attendees.map(a => a.memberId);
  if (type === 'LIQUOR') return attendees.filter(a => a.drinkChoice === 'LIQUOR').map(a => a.memberId);
  if (type === 'BEER')   return attendees.filter(a => a.drinkChoice === 'BEER').map(a => a.memberId);
  /* MIXER */            return attendees.filter(a => a.drinkChoice !== 'NONE').map(a => a.memberId);
}

export default function BillCreatePage() {
  const [eventId, setEventId] = useState('');
  const [billName, setBillName] = useState('');
  const [rows, setRows] = useState<Row[]>([newRow()]);
  const { data: eventOptions } = useEventOptions();
  const { data: attendees } = useEventAttendees(eventId);

  const total = rows.reduce((s, r) => s + (Number(r.price) || 0), 0);

  // Live preview
  const preview = attendees ? calculateBill(
    rows
      .filter(r => r.name && r.price > 0)
      .map(r => ({ id: r.tempId, price: Number(r.price), itemType: r.itemType, extraMemberIds: r.extraMemberIds })),
    attendees.map(a => ({ memberId: a.memberId, drinkChoice: a.drinkChoice })),
  ) : null;

  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-semibold">Create Bill</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <Card className="space-y-6 p-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>ชื่อบิล</Label>
              <Input value={billName} onChange={e => setBillName(e.target.value)} placeholder="เช่น งานรุ่น 35 - ร้านเฮง"/>
            </div>
            <div className="space-y-2">
              <Label>Event</Label>
              <Select value={eventId} onValueChange={setEventId}>
                <SelectTrigger><SelectValue placeholder="เลือก event"/></SelectTrigger>
                <SelectContent>
                  {eventOptions?.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator/>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">รายการ</h2>
              <Button size="sm" variant="outline" onClick={() => setRows([...rows, newRow()])}>
                <Plus className="mr-1.5 h-4 w-4"/>เพิ่มรายการ
              </Button>
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-[1fr,110px,140px,140px,40px] gap-2 px-1 text-xs text-muted-foreground">
                <span>ชื่อ</span><span>ราคา (฿)</span><span>ประเภท</span><span>ร่วมหาร</span><span/>
              </div>

              {rows.map((r, idx) => {
                const baseIds = attendees ? defaultMembersForType(r.itemType, attendees) : [];
                const totalSharers = new Set([...baseIds, ...r.extraMemberIds]).size;
                return (
                  <div key={r.tempId} className="grid grid-cols-[1fr,110px,140px,140px,40px] gap-2">
                    <Input value={r.name} onChange={e => updateRow(idx, { name: e.target.value })} placeholder="ชื่อรายการ"/>
                    <Input type="number" min={0} value={r.price || ''} onChange={e => updateRow(idx, { price: Number(e.target.value) })}/>
                    <Select
                      value={r.itemType}
                      onValueChange={(v) => updateRow(idx, { itemType: v as ItemType, extraMemberIds: [] /* reset extras on type change */ })}
                    >
                      <SelectTrigger><SelectValue/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LIQUOR">🥃 เหล้า</SelectItem>
                        <SelectItem value="BEER">🍺 เบียร์</SelectItem>
                        <SelectItem value="MIXER">🧊 มิกเซอร์</SelectItem>
                        <SelectItem value="SHARED">👥 หารทุกคน</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Per-row extras picker */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="justify-start gap-1.5">
                          👥 <span className="font-mono tabular-nums">{totalSharers}</span> คน
                          {r.extraMemberIds.length > 0 && <Badge variant="secondary" className="ml-auto h-5 px-1.5 text-[10px]">+{r.extraMemberIds.length}</Badge>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="end" className="w-[280px] p-0">
                        <div className="border-b p-3">
                          <p className="text-xs font-medium text-muted-foreground">เพิ่มคนเข้ารายการนี้เป็นพิเศษ</p>
                          <p className="mt-0.5 text-[10px] text-muted-foreground">
                            (คนที่ default ตามประเภทอยู่แล้วไม่ขึ้นในลิสต์นี้)
                          </p>
                        </div>
                        <div className="max-h-60 overflow-y-auto py-1">
                          {attendees?.filter(a => !baseIds.includes(a.memberId)).map(a => {
                            const checked = r.extraMemberIds.includes(a.memberId);
                            return (
                              <label key={a.memberId} className="flex cursor-pointer items-center gap-2 px-3 py-2 hover:bg-muted/50">
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={(v) => updateRow(idx, {
                                    extraMemberIds: v
                                      ? [...r.extraMemberIds, a.memberId]
                                      : r.extraMemberIds.filter(id => id !== a.memberId),
                                  })}
                                />
                                <span className="text-sm">{a.name}</span>
                                <DrinkBadge choice={a.drinkChoice}/>
                              </label>
                            );
                          })}
                          {attendees?.filter(a => !baseIds.includes(a.memberId)).length === 0 && (
                            <p className="px-3 py-4 text-center text-xs text-muted-foreground">
                              ทุกคนหารรายการนี้ default อยู่แล้ว
                            </p>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>

                    <Button variant="ghost" size="icon" onClick={() => removeRow(idx)} disabled={rows.length === 1}>
                      <Trash2 className="h-4 w-4"/>
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>

          <Separator/>

          <div className="flex items-center justify-between text-lg">
            <span className="font-semibold">รวม</span>
            <span className="font-mono font-semibold tabular-nums">฿{total.toLocaleString('th-TH')}</span>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline">บันทึก Draft</Button>
            <Button disabled={!eventId || !billName || total === 0}>บันทึก + ส่งให้สมาชิก</Button>
          </div>
        </Card>

        <aside className="space-y-4">
          <Card className="p-4">
            <h3 className="mb-3 font-semibold">Preview การคิดเงิน</h3>
            {!preview ? (
              <p className="text-sm text-muted-foreground">เลือก event เพื่อดู preview</p>
            ) : preview.shares.length === 0 ? (
              <p className="text-sm text-amber-600">⚠️ ยังไม่มีผู้เข้าร่วม event นี้</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {preview.shares.map(s => {
                  const attendee = attendees?.find(a => a.memberId === s.memberId);
                  return (
                    <li key={s.memberId} className="flex items-center justify-between border-b pb-2 last:border-0">
                      <span className="truncate">{attendee?.name}</span>
                      <span className="font-mono font-medium tabular-nums">฿{s.amount.toLocaleString('th-TH')}</span>
                    </li>
                  );
                })}
              </ul>
            )}
            {preview && preview.warnings.length > 0 && (
              <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
                ⚠️ {preview.warnings.join(', ')}
              </div>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );

  function updateRow(idx: number, patch: Partial<Row>) {
    setRows(rs => rs.map((r, i) => i === idx ? { ...r, ...patch } : r));
  }
  function removeRow(idx: number) {
    setRows(rs => rs.filter((_, i) => i !== idx));
  }
}

function newRow(): Row {
  return { tempId: crypto.randomUUID(), name: '', price: 0, itemType: 'SHARED' };
}
```

---

## 6. System States — Reusable Components

### 6.1 Empty State

```tsx
// packages/ui/src/empty-state.tsx
export function EmptyState({ emoji, title, description, action }: {
  emoji: string; title: string; description?: string; action?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-3 text-5xl">{emoji}</div>
      <h2 className="mb-1 text-lg font-semibold">{title}</h2>
      {description && <p className="max-w-xs text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
```

### 6.2 Error State

```tsx
// packages/ui/src/error-state.tsx
import { Button } from './button';
import { AlertCircle } from 'lucide-react';

export function ErrorState({ onRetry, message }: { onRetry?: () => void; message?: string }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 text-center">
      <AlertCircle className="mb-3 h-12 w-12 text-destructive"/>
      <h2 className="mb-1 text-lg font-semibold">ไม่สามารถโหลดข้อมูลได้</h2>
      <p className="mb-4 max-w-xs text-sm text-muted-foreground">{message ?? 'เกิดข้อผิดพลาด ลองอีกครั้ง'}</p>
      {onRetry && <Button variant="outline" onClick={onRetry}>ลองอีกครั้ง</Button>}
    </div>
  );
}
```

### 6.3 Loading Skeleton Pattern

```tsx
// Use within each page, inline. Match real layout dimensions.
<div className="h-5 w-2/3 animate-pulse rounded bg-muted"/>
<div className="h-4 w-1/2 animate-pulse rounded bg-muted"/>
```

### 6.4 Toast (via Sonner)

```tsx
// app/layout.tsx
import { Toaster } from 'sonner';
<Toaster position="top-center" richColors closeButton/>

// usage
toast.success('บันทึกแล้ว');
toast.error('เกิดข้อผิดพลาด');
toast.loading('กำลังส่ง...', { id: 'send' });
```

### 6.5 Confirm Dialog Pattern

```tsx
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';

<AlertDialog>
  <AlertDialogTrigger asChild><Button variant="destructive">ลบ</Button></AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>ยืนยันการลบ?</AlertDialogTitle>
      <AlertDialogDescription>การลบไม่สามารถยกเลิกได้</AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
      <AlertDialogAction onClick={handleDelete} className="bg-destructive">ลบ</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

## 7. Responsive Breakpoints

| Breakpoint | Width | Used by |
|---|---|---|
| `sm` | 640px | LIFF max layout |
| `md` | 768px | Admin tablet adjustments |
| `lg` | 1024px | Admin desktop layout kicks in (sidebar + content split) |
| `xl` | 1280px | Admin content max-width |

- **LIFF:** mobile-first, fix max-width 480px in main container, centered
- **Admin:** desktop-first, hide sidebar < `lg`, replace with hamburger sheet

---

## 8. Accessibility Checklist

- ✅ All interactive elements ≥ 44×44 tap target (Fitts's Law) — sticky CTAs are `size="lg"` (48px)
- ✅ Color contrast: primary on white > 4.5:1 (`#D97706` on `#FFFFFF` = 4.7:1)
- ✅ Focus rings: ring color via `--ring` token
- ✅ Form labels: every Input has `<Label htmlFor>`
- ✅ Radix Dialog: focus trap + escape close built-in
- ✅ Skip toolbar: prefer semantic `<nav>`, `<main>`, `<aside>`
- ✅ ARIA live regions: Toaster uses `role="status"`
- ✅ Thai language: `<html lang="th">` for screen readers

---

## 9. Mock Data (for development)

```ts
// packages/shared/src/mock.ts
export const MOCK_EVENTS = [
  {
    id: '1', name: 'งานรุ่น 35 ปีนี้เจอกัน', venue: 'ร้านเฮง สาขาลาดพร้าว',
    eventDate: '2026-06-15T19:00:00Z', status: 'ACTIVE',
    attendeeCount: 12, hasSubmitted: true, hasBill: false,
  },
  {
    id: '2', name: 'BBQ ที่บ้านพี่ตั้ม', venue: 'บ้านพี่ตั้ม รามอินทรา',
    eventDate: '2026-05-25T18:30:00Z', status: 'ACTIVE',
    attendeeCount: 8, hasSubmitted: false, hasBill: false,
  },
];

export const MOCK_ATTENDEES = [
  { memberId: 'm1', name: 'เมา',   pictureUrl: '...', drinkChoice: 'LIQUOR', isMe: true  },
  { memberId: 'm2', name: 'แตงโม', pictureUrl: '...', drinkChoice: 'BEER',   isMe: false },
  { memberId: 'm3', name: 'ไอซ์',  pictureUrl: '...', drinkChoice: 'NONE',   isMe: false },
  { memberId: 'm4', name: 'มะนาว', pictureUrl: '...', drinkChoice: 'NONE',   isMe: false },
];

// Admin pick "ไอซ์" (m3) ให้ร่วมหารรายการมิกเซอร์เป็นพิเศษ ผ่าน extraMemberIds
export const MOCK_BILL_ITEMS = [
  { name: 'อาหาร',       price: 720, itemType: 'SHARED', extraMemberIds: [] },
  { name: 'เหล้าขาว',    price: 400, itemType: 'LIQUOR', extraMemberIds: [] },
  { name: 'เบียร์',      price: 300, itemType: 'BEER',   extraMemberIds: [] },
  { name: 'โซดา+น้ำแข็ง', price: 180, itemType: 'MIXER',  extraMemberIds: ['m3'] },
];

export const MOCK_BILL_PREVIEW = {
  // SHARED ฿720 (÷4=180) + LIQUOR ฿400 (÷1: m1) + BEER ฿300 (÷1: m2) + MIXER ฿180 (÷3: m1,m2,m3)
  shares: [
    { memberId: 'm1', amount: 640, sharedAmount: 180, drinkAmount: 400, mixerAmount: 60 },
    { memberId: 'm2', amount: 540, sharedAmount: 180, drinkAmount: 300, mixerAmount: 60 },
    { memberId: 'm3', amount: 240, sharedAmount: 180, drinkAmount: 0,   mixerAmount: 60 },
    { memberId: 'm4', amount: 180, sharedAmount: 180, drinkAmount: 0,   mixerAmount: 0  },
  ],
  warnings: [],
  total: 1600,
};
```

---

## 10. Component Inventory (shadcn/ui to install)

| Component | Used by |
|---|---|
| `button` | All screens |
| `input`, `label`, `textarea` | Forms |
| `select`, `radio-group`, `checkbox` | Forms |
| `card` | LIFF lists, admin tables, sections |
| `avatar` | Member identity |
| `badge` | Status, drink type |
| `dialog`, `alert-dialog`, `sheet` | Modals, mobile drawers |
| `dropdown-menu` | Table row actions |
| `table` | Admin lists |
| `tabs` | Admin filters, profile sections |
| `sonner` | Toasts |
| `skeleton` | Loading states |
| `separator` | Visual dividers |
| `calendar`, `popover` | DatePicker for event + per-row member picker in Admin BillForm |
| `form` | RHF + Zod integration |
| `progress` | Drink breakdown bar |
| `alert` | Inline warnings |

---

## 11. Next Steps

1. ✅ Design System + key screens (this doc)
2. 🔜 `/dev` — Scaffold monorepo with these tokens, install shadcn components, implement remaining screens following these patterns
3. 🔜 `/qa` — Write test cases including A11Y checks
4. 🔜 `/devops` — Deploy + cron-job ping

---

**End of UX/UI Design v1.0**
