'use client';
import { useQuery } from '@tanstack/react-query';
import { MEMBER_TYPES, type MemberType } from '@maoleaw/shared';
import { apiFetch, getToken } from '@/lib/api';

/**
 * Member types with admin-edited labels (Settings → Member types) applied.
 * Falls back to the built-in labels while loading or if the config can't be read.
 */
export function useMemberTypes() {
  const { data } = useQuery({
    queryKey: ['app-config'],
    queryFn: () => apiFetch<{ memberTypeLabels: Record<string, string> }>('/config'),
    enabled: !!getToken(),
    staleTime: 5 * 60_000,
    retry: false,
  });
  const labels = data?.memberTypeLabels ?? {};
  const types = MEMBER_TYPES.map((t) => ({ value: t.value, label: labels[t.value] || t.label }));
  const labelOf = (v: MemberType) => types.find((t) => t.value === v)?.label ?? v;
  return { types, labelOf };
}
