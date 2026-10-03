'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { ClaimResultDto, MyBillDto } from '@maoleaw/shared';

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

/** Claim payment with a slip image — the API verifies it and may settle it as PAID. */
export function useClaimPaid(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { slip: Blob; note?: string | null }) => {
      const form = new FormData();
      form.append('slip', input.slip, 'slip.jpg');
      if (input.note) form.append('note', input.note);
      return apiFetch<ClaimResultDto>(`/events/${eventId}/my-bill/claim`, { method: 'POST', body: form });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-bill', eventId] }),
  });
}
