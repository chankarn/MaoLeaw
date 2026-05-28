// File: apps/admin/src/app/(authed)/members/page.tsx
'use client';
import { useState } from 'react';
import { Search, ShieldOff } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MEMBER_TYPES } from '@maoleaw/shared';
import { useAdminMembers, useBanMember } from '@/hooks/use-members';
import { cn } from '@/lib/utils';

const DRINK_LABEL = {
  LIQUOR: '🥃 เหล้า',
  BEER: '🍺 เบียร์',
} as const;

type TypeFilter = 'all' | (typeof MEMBER_TYPES)[number]['value'];

export default function MembersPage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const { data, isLoading } = useAdminMembers({ search });
  const ban = useBanMember();

  const allItems = data?.items ?? [];
  const items = typeFilter === 'all' ? allItems : allItems.filter((m) => m.memberType === typeFilter);

  const typeCounts = Object.fromEntries(
    MEMBER_TYPES.map((t) => [t.value, allItems.filter((m) => m.memberType === t.value).length]),
  );

  async function handleBan(id: string, current: boolean, name: string) {
    const action = current ? 'unban' : 'ban';
    if (!confirm(`ยืนยัน ${action} ${name}?`)) return;
    try {
      await ban.mutateAsync({ id, banned: !current });
      toast.success(current ? 'Unbanned' : 'Banned');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'ไม่สำเร็จ');
    }
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Amber header */}
      <header className="border-b border-amber-700 bg-gradient-to-r from-primary to-amber-500 px-4 py-4 text-white md:px-8 md:py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold">Members</h1>
            <p className="text-sm text-white/80">
              สมาชิกที่ลงทะเบียนผ่าน LIFF · {allItems.length} คน
            </p>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <Input
              placeholder="ค้นหาตามชื่อ..."
              className="h-11 w-full bg-white pl-9 text-stone-900 shadow-lg shadow-amber-900/20 ring-1 ring-amber-900/5 transition-all focus-visible:shadow-xl focus-visible:shadow-amber-900/30 sm:w-64"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Type filter chips */}
        <div className="-mb-5 mt-4 flex gap-1 overflow-x-auto border-b" style={{ scrollbarWidth: 'none' }}>
          <FilterChip
            active={typeFilter === 'all'}
            onClick={() => setTypeFilter('all')}
            count={allItems.length}
          >
            All
          </FilterChip>
          {MEMBER_TYPES.map((t) => (
            <FilterChip
              key={t.value}
              active={typeFilter === t.value}
              onClick={() => setTypeFilter(t.value)}
              count={typeCounts[t.value] ?? 0}
            >
              {t.label}
            </FilterChip>
          ))}
        </div>
      </header>

      <div className="p-4 md:p-8">
        <Card className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead className="hidden sm:table-cell">Type</TableHead>
                <TableHead className="hidden md:table-cell">Drink</TableHead>
                <TableHead className="hidden sm:table-cell text-right">Events</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}>
                        <div className="h-4 w-full animate-pulse rounded bg-muted" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : !items.length ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-16 text-center">
                    <p className="text-3xl">👥</p>
                    <p className="mt-2 font-medium">
                      {typeFilter !== 'all' || search ? 'ไม่พบสมาชิก' : 'ยังไม่มีสมาชิก'}
                    </p>
                    {(typeFilter !== 'all' || search) && (
                      <p className="text-sm text-muted-foreground">ลองเปลี่ยน filter หรือ search</p>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                items.map((m) => {
                  const typeLabel = MEMBER_TYPES.find((t) => t.value === m.memberType)?.label ?? m.memberType;
                  return (
                    <TableRow key={m.id} className={cn(m.banned && 'opacity-60')}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            {m.pictureUrl && <AvatarImage src={m.pictureUrl} alt={m.customName} />}
                            <AvatarFallback>{(m.customName || m.displayName)[0]}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate font-medium">
                              {m.customName || (
                                <span className="text-muted-foreground">(ยังไม่ลงทะเบียน)</span>
                              )}
                            </p>
                            <p className="truncate text-[11px] text-muted-foreground">LINE: {m.displayName}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="outline">{typeLabel}</Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm">{DRINK_LABEL[m.preferredDrink]}</TableCell>
                      <TableCell className="hidden sm:table-cell text-right font-mono tabular-nums">{m.totalEvents}</TableCell>
                      <TableCell>
                        {m.banned ? (
                          <Badge variant="destructive">
                            <ShieldOff className="mr-1 h-3 w-3" />
                            Banned
                          </Badge>
                        ) : (
                          <Badge variant="success">● Active</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant={m.banned ? 'outline' : 'destructive'}
                          onClick={() => handleBan(m.id, m.banned, m.customName || m.displayName)}
                        >
                          {m.banned ? 'Unban' : 'Ban'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}

function FilterChip({
  active,
  count,
  onClick,
  children,
}: {
  active: boolean;
  count: number;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm transition-colors',
        active
          ? 'border-white font-semibold text-white'
          : 'border-transparent text-white/70 hover:text-white',
      )}
    >
      {children}
      <span
        className={cn(
          'rounded px-1.5 py-0.5 text-[10px] font-medium',
          active ? 'bg-white text-primary' : 'bg-white/20 text-white/80',
        )}
      >
        {count}
      </span>
    </button>
  );
}
