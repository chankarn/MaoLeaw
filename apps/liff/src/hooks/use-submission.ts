// File: apps/liff/src/hooks/use-submission.ts
'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { SubmitAttendanceInput } from '@maoleaw/shared';

export function useSubmitAttendance(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SubmitAttendanceInput) =>
      apiFetch(`/events/${eventId}/submission`, { method: 'PUT', body: JSON.stringify(input) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['events', eventId] });
      qc.invalidateQueries({ queryKey: ['events', 'active'] });
      qc.invalidateQueries({ queryKey: ['events', 'mine'] });
    },
  });
}
