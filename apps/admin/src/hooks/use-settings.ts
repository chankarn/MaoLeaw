// File: apps/admin/src/hooks/use-settings.ts
'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

export interface AdminProfile {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppConfig {
  promptpayIdOverride: string | null;
  memberTypeLabels: Record<string, string>;
  updatedAt: string;
}

export function useProfile() {
  return useQuery({
    queryKey: ['admin-profile'],
    queryFn: () => apiFetch<AdminProfile>('/admin/settings/me'),
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name?: string; email?: string }) =>
      apiFetch<AdminProfile>('/admin/settings/me', {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-profile'] }),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (input: { currentPassword: string; newPassword: string }) =>
      apiFetch<{ ok: boolean }>('/admin/settings/change-password', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
  });
}

export function useAppConfig() {
  return useQuery({
    queryKey: ['admin-app-config'],
    queryFn: () => apiFetch<AppConfig>('/admin/settings/config'),
  });
}

export function useUpdateAppConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      promptpayIdOverride?: string | null;
      memberTypeLabels?: Record<string, string> | null;
    }) =>
      apiFetch<AppConfig>('/admin/settings/config', {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-app-config'] }),
  });
}
