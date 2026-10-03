import type { Prisma } from '@maoleaw/db';
import { calculateBill, type CalcAttendee } from '@maoleaw/shared';

/**
 * Rebuild a DRAFT bill's shares from its stored items + the event's current submissions.
 * Shares are only snapshotted while DRAFT — once SENT, submissions are locked so the
 * amounts members were notified of never drift.
 */
export async function recomputeDraftShares(tx: Prisma.TransactionClient, billId: string) {
  const bill = await tx.bill.findUniqueOrThrow({
    where: { id: billId },
    include: { items: true, event: { include: { submissions: true } } },
  });
  if (bill.status !== 'DRAFT') return;

  const attendees: CalcAttendee[] = bill.event.submissions.map((s) => ({
    memberId: s.memberId,
    drinkChoice: s.drinkChoice,
  }));
  const { shares } = calculateBill(
    bill.items.map((it) => ({
      id: it.id,
      price: it.price,
      itemType: it.itemType,
      extraMemberIds: it.extraMemberIds,
      customMemberIds: it.customMemberIds,
    })),
    attendees,
  );

  await tx.billShare.deleteMany({ where: { billId } });
  await tx.billShare.createMany({
    data: shares.map((s) => ({
      billId,
      memberId: s.memberId,
      amount: s.amount,
      sharedAmount: s.sharedAmount,
      drinkAmount: s.drinkAmount,
      mixerAmount: s.mixerAmount,
    })),
  });
}
