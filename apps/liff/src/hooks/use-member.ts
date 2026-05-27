// File: apps/liff/src/hooks/use-member.ts
'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { MemberDto, RegisterMemberInput, UpdateMemberInput } from '@maoleaw/shared';

export function useRegisterMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RegisterMemberInput) =>
      apiFetch<MemberDto>('/members/register', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: (data) => {
      qc.setQueryData(['me'], data);
      localStorage.setItem('maoleaw_me', JSON.stringify(data));
    },
  });
}

export function useUpdateMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateMemberInput) =>
      apiFetch<MemberDto>('/members/me', { method: 'PATCH', body: JSON.stringify(input) }),
    onSuccess: (data) => {
      qc.setQueryData(['me'], data);
      localStorage.setItem('maoleaw_me', JSON.stringify(data));
    },
  });
}
