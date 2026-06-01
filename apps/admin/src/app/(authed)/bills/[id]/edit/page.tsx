// File: apps/admin/src/app/(authed)/bills/[id]/edit/page.tsx
'use client';
import { useParams } from 'next/navigation';
import { BillForm } from '@/components/bill-form';
import { useAdminBill } from '@/hooks/use-bills';

export default function EditBillPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useAdminBill(id);

  if (isLoading || !data) return <div className="p-8 text-muted-foreground">Loading…</div>;

  if (data.status !== 'DRAFT') {
    return (
      <div className="p-8">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <p className="font-semibold">⚠️ แก้ไขไม่ได้</p>
          <p className="mt-1 text-sm">บิลนี้สถานะ {data.status} — แก้ไขได้เฉพาะ Draft</p>
        </div>
      </div>
    );
  }

  return (
    <BillForm
      initial={{
        id: data.id,
        name: data.name,
        eventId: data.event.id,
        eventName: data.event.name,
        paymentType: data.paymentType,
        promptpayId: data.promptpayId,
        bankCode: data.bankCode as import('@maoleaw/shared').BankCode | null,
        bankAccountNumber: data.bankAccountNumber,
        bankAccountName: data.bankAccountName,
        items: data.items.map((it) => ({
          name: it.name,
          price: it.price,
          itemType: it.itemType,
          extraMemberIds: it.extraMemberIds ?? [],
          sortOrder: it.sortOrder,
        })),
      }}
    />
  );
}
