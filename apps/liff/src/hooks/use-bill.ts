// File: apps/liff/src/hooks/use-bill.ts
'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { MyBillDto } from '@maoleaw/shared';

export function useMyBill(eventId: string, enabled = true) {
  return useQuery({
    queryKey: ['my-bill', eventId],
    queryFn: () => apiFetch<MyBillDto>(`/events/${eventId}/my-bill`),
    enabled,
    retry: (failureCount, err) => {
      // Don't retry 404 (no bill yet)
      const msg = (err as Error)?.message ?? '';
      if (msg.toLowerCase().includes('not found')) return false;
      return failureCount < 2;
    },
  });
}

export function useClaimPaid(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { note?: string | null }) =>
      apiFetch(`/events/${eventId}/my-bill/claim`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-bill', eventId] }),
  });
}
