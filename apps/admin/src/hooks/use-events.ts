// File: apps/admin/src/hooks/use-events.ts
'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { CreateEventInput, UpdateEventInput } from '@maoleaw/shared';

interface AdminEventRow {
  id: string;
  name: string;
  venue: string;
  eventDate: string;
  status: 'ACTIVE' | 'INACTIVE';
  attendeeCount: number;
  hasBill: boolean;
}

interface ListResponse<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
}

export function useAdminEvents(params: { status?: string; search?: string }) {
  const q = new URLSearchParams();
  if (params.status) q.set('status', params.status);
  if (params.search) q.set('search', params.search);
  const qs = q.toString();
  return useQuery({
    queryKey: ['admin-events', params],
    queryFn: () => apiFetch<ListResponse<AdminEventRow>>(`/admin/events${qs ? `?${qs}` : ''}`),
  });
}

export function useAdminEvent(id: string) {
  return useQuery({
    queryKey: ['admin-event', id],
    queryFn: () => apiFetch<AdminEventRow>(`/admin/events/${id}`),
    enabled: !!id,
  });
}

export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEventInput) =>
      apiFetch('/admin/events', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-events'] }),
  });
}

export function useUpdateEvent(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateEventInput) =>
      apiFetch(`/admin/events/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-events'] });
      qc.invalidateQueries({ queryKey: ['admin-event', id] });
    },
  });
}

export function useDeleteEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/admin/events/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-events'] }),
  });
}

export function useEventsForBill() {
  return useQuery({
    queryKey: ['events-for-bill'],
    queryFn: () => apiFetch<Array<{ id: string; name: string; eventDate: string }>>('/admin/events/options/for-bill'),
  });
}

export interface EventAttendee {
  memberId: string;
  name: string;
  drinkChoice: 'LIQUOR' | 'BEER' | 'NONE';
  /** Walk-in added by an admin, no LINE account. */
  isGuest: boolean;
}

export function useEventAttendees(eventId: string | undefined) {
  return useQuery({
    queryKey: ['event-attendees', eventId],
    queryFn: () => apiFetch<EventAttendee[]>(`/admin/events/${eventId}/attendees`),
    enabled: !!eventId,
  });
}

/** Add someone who came but never tapped join: an existing member or a guest name. */
export function useAddAttendee(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { memberId?: string; guestName?: string; drinkChoice: 'LIQUOR' | 'BEER' | 'NONE' }) =>
      apiFetch<EventAttendee>(`/admin/events/${eventId}/attendees`, { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['event-attendees', eventId] });
      qc.invalidateQueries({ queryKey: ['admin-events'] });
      qc.invalidateQueries({ queryKey: ['admin-bill'] });
    },
  });
}

export function useRemoveAttendee(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) =>
      apiFetch(`/admin/events/${eventId}/attendees/${memberId}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['event-attendees', eventId] });
      qc.invalidateQueries({ queryKey: ['admin-events'] });
      qc.invalidateQueries({ queryKey: ['admin-bill'] });
    },
  });
}
