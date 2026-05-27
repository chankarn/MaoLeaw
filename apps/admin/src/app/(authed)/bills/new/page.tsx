// File: apps/admin/src/app/(authed)/bills/new/page.tsx
'use client';
import { useSearchParams } from 'next/navigation';
import { BillForm } from '@/components/bill-form';

export default function CreateBillPage() {
  const params = useSearchParams();
  const presetEventId = params.get('eventId') ?? '';
  return <BillForm presetEventId={presetEventId} />;
}
