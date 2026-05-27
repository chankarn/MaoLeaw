// File: apps/admin/src/hooks/use-dashboard.ts
'use client';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

export type DashboardRange = 'today' | 'week' | 'month' | '3months' | 'all';

export interface DashboardData {
  range: DashboardRange;
  generatedAt: string;
  stats: {
    totalEvents: number;
    eventsThisWeek: number;
    totalMembers: number;
    membersThisWeek: number;
    billsThisMonth: number;
    billsAmountThisMonth: number;
    pendingAmount: number;
    pendingCount: number;
  };
  claims: Array<{
    id: string;
    amount: number;
    claimedAt: string | null;
    claimNote: string | null;
    member: { id: string; name: string; pictureUrl: string | null };
    bill: { id: string; name: string; eventId: string; eventName: string };
  }>;
  upcomingEvents: Array<{
    id: string;
    name: string;
    venue: string;
    eventDate: string;
    attendeeCount: number;
  }>;
  drinkBreakdown: { total: number; liquor: number; beer: number; none: number };
  activeBills: Array<{
    id: string;
    name: string;
    eventName: string;
    status: 'DRAFT' | 'SENT' | 'CLOSED';
    totalAmount: number;
    totalShares: number;
    paidShares: number;
    paidAmount: number;
  }>;
  activityFeed: Array<{
    type: 'SUBMIT' | 'CLAIM' | 'PAID' | 'REGISTER';
    at: string;
    memberName: string;
    pictureUrl: string | null;
    detail: string;
  }>;
  topSpenders: Array<{
    memberId: string;
    name: string;
    pictureUrl: string | null;
    preferredDrink: 'LIQUOR' | 'BEER';
    memberType: string;
    totalAmount: number;
    billsCount: number;
  }>;
  weeklyEvents: Array<{ weekStart: string; weekEnd: string; count: number }>;
}

export function useDashboard(range: DashboardRange = 'month') {
  return useQuery({
    queryKey: ['admin-dashboard', range],
    queryFn: () => apiFetch<DashboardData>(`/admin/dashboard?range=${range}`),
    refetchInterval: 30_000,
  });
}
