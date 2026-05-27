// File: apps/admin/src/hooks/use-members.ts
'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

interface AdminMemberRow {
  id: string;
  customName: string;
  displayName: string;
  pictureUrl: string | null;
  preferredDrink: 'LIQUOR' | 'BEER';
  memberType: 'BD' | 'TL' | 'KU' | 'FRIEND' | 'OTHER';
  banned: boolean;
  totalEvents: number;
  createdAt: string;
}

export function useAdminMembers(params: { search?: string; type?: string; banned?: boolean }) {
  const q = new URLSearchParams();
  if (params.search) q.set('search', params.search);
  if (params.type) q.set('type', params.type);
  if (params.banned !== undefined) q.set('banned', String(params.banned));
  const qs = q.toString();
  return useQuery({
    queryKey: ['admin-members', params],
    queryFn: () => apiFetch<{ items: AdminMemberRow[] }>(`/admin/members${qs ? `?${qs}` : ''}`),
  });
}

export function useBanMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, banned }: { id: string; banned: boolean }) =>
      apiFetch(`/admin/members/${id}/ban`, { method: 'POST', body: JSON.stringify({ banned }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-members'] }),
  });
}
