// File: apps/admin/src/hooks/use-bills.ts
'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { BillCalculation, CreateBillInput, UpdateBillInput } from '@maoleaw/shared';

interface AdminBillRow {
  id: string;
  name: string;
  status: 'DRAFT' | 'SENT' | 'CLOSED';
  totalAmount: number;
  paidAmount: number;
  totalShares: number;
  paidShares: number;
  claimedShares: number;
  eventName: string;
  eventDate: string;
  createdAt: string;
}

interface AdminBillDetail {
  id: string;
  name: string;
  status: 'DRAFT' | 'SENT' | 'CLOSED';
  totalAmount: number;
  paymentType: 'PROMPTPAY' | 'BANK';
  promptpayId: string | null;
  bankCode: string | null;
  bankAccountNumber: string | null;
  bankAccountName: string | null;
  event: { id: string; name: string; eventDate: string };
  items: Array<{
    id: string;
    name: string;
    price: number;
    itemType: 'LIQUOR' | 'BEER' | 'MIXER' | 'SHARED' | 'CUSTOM';
    extraMemberIds: string[];
    customMemberIds: string[];
    sortOrder: number;
  }>;
  shares: Array<{
    id: string;
    memberId: string;
    amount: number;
    sharedAmount: number;
    drinkAmount: number;
    mixerAmount: number;
    paymentStatus: 'PENDING' | 'CLAIMED' | 'PAID';
    claimedAt: string | null;
    claimNote: string | null;
    slipCheck: 'AUTO_OK' | 'NEEDS_REVIEW' | null;
    slipReviewReason: string | null;
    slipAmount: number | null;
    slipImagePath: string | null;
    pushStatus: 'PENDING' | 'SENT' | 'FAILED';
    pushError: string | null;
    member: { id: string; customName: string; lineDisplayName: string; linePictureUrl: string | null };
  }>;
}

export function useAdminBills(status?: string) {
  const qs = status ? `?status=${status}` : '';
  return useQuery({
    queryKey: ['admin-bills', status],
    queryFn: () => apiFetch<{ items: AdminBillRow[] }>(`/admin/bills${qs}`),
  });
}

export function useAdminBill(id: string) {
  return useQuery({
    queryKey: ['admin-bill', id],
    queryFn: () => apiFetch<AdminBillDetail>(`/admin/bills/${id}`),
    enabled: !!id,
  });
}

export function useCalculatePreview() {
  return useMutation({
    mutationFn: (input: { eventId: string; items: Array<{ price: number; itemType: 'LIQUOR' | 'BEER' | 'SHARED' }> }) =>
      apiFetch<BillCalculation>('/admin/bills/calculate-preview', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
  });
}

export function useCreateBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBillInput) =>
      apiFetch('/admin/bills', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-bills'] }),
  });
}

export function useUpdateBill(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateBillInput) =>
      apiFetch(`/admin/bills/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-bills'] });
      qc.invalidateQueries({ queryKey: ['admin-bill', id] });
    },
  });
}

export function useDeleteBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/admin/bills/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-bills'] }),
  });
}

export function useSendBill(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<{ sent: number; failed: number }>(`/admin/bills/${id}/send`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-bill', id] }),
  });
}

export function useCloseBill(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch(`/admin/bills/${id}/close`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-bill', id] }),
  });
}

export function useResetToDraft(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch(`/admin/bills/${id}/reset-to-draft`, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-bill', id] });
      qc.invalidateQueries({ queryKey: ['admin-bills'] });
    },
  });
}

export function useMarkShare(billId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      shareId,
      status,
    }: {
      shareId: string;
      status: 'PENDING' | 'CLAIMED' | 'PAID';
    }) =>
      apiFetch<{ billClosed: boolean }>(`/admin/bills/${billId}/shares/${shareId}`, {
        method: 'PATCH',
        body: JSON.stringify({ paymentStatus: status }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-bill', billId] }),
  });
}

export function useRetryPush(billId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (shareId: string) =>
      apiFetch(`/admin/bills/${billId}/shares/${shareId}/retry-push`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-bill', billId] }),
  });
}

export function useBulkMarkShares(billId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      shareIds,
      status,
    }: {
      shareIds: string[];
      status: 'PENDING' | 'CLAIMED' | 'PAID';
    }) =>
      apiFetch<{ count: number; billClosed: boolean }>(`/admin/bills/${billId}/shares/bulk-mark`, {
        method: 'POST',
        body: JSON.stringify({ shareIds, paymentStatus: status }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-bill', billId] }),
  });
}

/** Fetch a short-lived signed URL for a slip awaiting review. */
export function useSlipImageUrl(billId: string) {
  return useMutation({
    mutationFn: (shareId: string) =>
      apiFetch<{ url: string }>(`/admin/bills/${billId}/shares/${shareId}/slip`),
  });
}

/** Reject a CLAIMED payment — back to PENDING and the member is notified on LINE. */
export function useRejectClaim(billId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ shareId, reason }: { shareId: string; reason: string | null }) =>
      apiFetch<{ pushed: boolean }>(`/admin/bills/${billId}/shares/${shareId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-bill', billId] }),
  });
}

/** Push a payment reminder to every member still PENDING on this bill. */
export function useRemindUnpaid(billId: string) {
  return useMutation({
    mutationFn: () =>
      apiFetch<{ sent: number; failed: number }>(`/admin/bills/${billId}/remind`, { method: 'POST' }),
  });
}

/** This month's LINE push quota (limit null = unlimited plan). */
export function fetchLineQuota() {
  return apiFetch<{ limit: number | null; used: number }>('/admin/line/quota');
}

export interface ReceiptReadResult {
  items: { name: string; price: number; itemType: 'LIQUOR' | 'BEER' | 'MIXER' | 'SHARED'; confident: boolean }[];
  receiptTotal: number | null;
  warnings: string[];
}

/** Send a receipt photo to the AI reader — returns suggested rows (nothing is saved). */
export function useReadReceipt() {
  return useMutation({
    mutationFn: (image: Blob) => {
      const form = new FormData();
      form.append('image', image, 'receipt.jpg');
      return apiFetch<ReceiptReadResult>('/admin/receipts/read', { method: 'POST', body: form });
    },
  });
}
