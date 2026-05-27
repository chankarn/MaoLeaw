// File: apps/liff/src/hooks/use-events.ts
'use client';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { EventDetailDto, EventListItemDto } from '@maoleaw/shared';

export function useActiveEvents() {
  return useQuery({
    queryKey: ['events', 'active'],
    queryFn: () => apiFetch<{ items: EventListItemDto[] }>('/events?scope=active'),
    staleTime: 30_000,
  });
}

export function useMyEvents() {
  return useQuery({
    queryKey: ['events', 'mine'],
    queryFn: () => apiFetch<{ items: EventListItemDto[] }>('/events?scope=mine'),
    staleTime: 30_000,
  });
}

export function useEventDetail(eventId: string) {
  return useQuery({
    queryKey: ['events', eventId],
    queryFn: () => apiFetch<EventDetailDto>(`/events/${eventId}`),
    refetchInterval: 15_000,
    staleTime: 10_000,
  });
}
