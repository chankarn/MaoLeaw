// File: apps/api/src/modules/bills/bills.service.ts
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { prisma } from '@maoleaw/db';
import {
  calculateBill,
  sumItemPrices,
  type CalcAttendee,
  type CreateBillInput,
  type MyBillDto,
  type UpdateBillInput,
} from '@maoleaw/shared';
import { BillPushService } from './bill-push.service';

@Injectable()
export class BillsService {
  constructor(
    private readonly cfg: ConfigService,
    private readonly push: BillPushService,
  ) {}

  async listAdmin(opts: { page: number; limit: number; status?: string }) {
    const where = {
      deletedAt: null,
      ...(opts.status && { status: opts.status as never }),
    };
    const [items, total] = await Promise.all([
      prisma.bill.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (opts.page - 1) * opts.limit,
        take: opts.limit,
        include: {
          event: { select: { name: true, eventDate: true } },
          shares: { select: { paymentStatus: true, amount: true } },
        },
      }),
      prisma.bill.count({ where }),
    ]);

    return {
      items: items.map((b) => {
        const paidShares = b.shares.filter((s) => s.paymentStatus === 'PAID');
        const claimedCount = b.shares.filter((s) => s.paymentStatus === 'CLAIMED').length;
        return {
          id: b.id,
          name: b.name,
          status: b.status,
          totalAmount: b.totalAmount,
          paidAmount: paidShares.reduce((sum, s) => sum + s.amount, 0),
          totalShares: b.shares.length,
          paidShares: paidShares.length,
          claimedShares: claimedCount,
          eventName: b.event.name,
          eventDate: b.event.eventDate.toISOString(),
          createdAt: b.createdAt.toISOString(),
        };
      }),
      page: opts.page,
      limit: opts.limit,
      total,
    };
  }

  async getAdminDetail(billId: string) {
    const bill = await prisma.bill.findFirst({
      where: { id: billId, deletedAt: null },
      include: {
        event: { select: { id: true, name: true, eventDate: true } },
        items: { orderBy: { sortOrder: 'asc' } },
        shares: {
          include: {
            member: {
              select: { id: true, customName: true, lineDisplayName: true, linePictureUrl: true, lineUserId: true },
            },
          },
        },
      },
    });
    if (!bill) throw new NotFoundException('Bill not found');
    return bill;
  }

  async create(adminId: string, input: CreateBillInput) {
    const event = await prisma.event.findFirst({
      where: { id: input.eventId, deletedAt: null },
      include: { bill: true, submissions: true },
    });
    if (!event) throw new NotFoundException('Event not found');
    if (event.bill) throw new ConflictException('Event already has a bill');
    if (event.submissions.length === 0) {
      throw new BadRequestException('Event has no attendees');
    }

    const attendees: CalcAttendee[] = event.submissions.map((s) => ({
      memberId: s.memberId,
      drinkChoice: s.drinkChoice,
    }));

    // Compute share preview (we'll re-compute on send/close — Draft items are mutable).
    const itemsForCalc = input.items.map((it, idx) => ({
      id: `tmp-${idx}`,
      price: it.price,
      itemType: it.itemType,
    }));
    const { shares } = calculateBill(itemsForCalc, attendees);
    const total = sumItemPrices(itemsForCalc);

    return prisma.$transaction(async (tx) => {
      const bill = await tx.bill.create({
        data: {
          eventId: input.eventId,
          name: input.name,
          status: 'DRAFT',
          totalAmount: total,
          createdById: adminId,
          items: {
            create: input.items.map((it, idx) => ({
              name: it.name,
              price: it.price,
              itemType: it.itemType,
              sortOrder: it.sortOrder ?? idx,
            })),
          },
          shares: {
            create: shares.map((s) => ({
              memberId: s.memberId,
              amount: s.amount,
              sharedAmount: s.sharedAmount,
              drinkAmount: s.drinkAmount,
            })),
          },
        },
        include: { items: true, shares: true },
      });
      return bill;
    });
  }

  async update(billId: string, input: UpdateBillInput) {
    const bill = await prisma.bill.findFirst({
      where: { id: billId, deletedAt: null },
      include: { event: { include: { submissions: true } }, items: true },
    });
    if (!bill) throw new NotFoundException('Bill not found');
    if (bill.status !== 'DRAFT') throw new ConflictException('Only DRAFT bills can be edited');

    return prisma.$transaction(async (tx) => {
      if (input.name !== undefined) {
        await tx.bill.update({ where: { id: billId }, data: { name: input.name } });
      }
      if (input.items) {
        // Replace items + recompute shares.
        await tx.billItem.deleteMany({ where: { billId } });
        await tx.billShare.deleteMany({ where: { billId } });

        const attendees: CalcAttendee[] = bill.event.submissions.map((s) => ({
          memberId: s.memberId,
          drinkChoice: s.drinkChoice,
        }));
        const itemsForCalc = input.items.map((it, idx) => ({
          id: `tmp-${idx}`,
          price: it.price,
          itemType: it.itemType,
        }));
        const { shares } = calculateBill(itemsForCalc, attendees);
        const total = sumItemPrices(itemsForCalc);

        await tx.billItem.createMany({
          data: input.items.map((it, idx) => ({
            billId,
            name: it.name,
            price: it.price,
            itemType: it.itemType,
            sortOrder: it.sortOrder ?? idx,
          })),
        });
        await tx.billShare.createMany({
          data: shares.map((s) => ({
            billId,
            memberId: s.memberId,
            amount: s.amount,
            sharedAmount: s.sharedAmount,
            drinkAmount: s.drinkAmount,
          })),
        });
        await tx.bill.update({ where: { id: billId }, data: { totalAmount: total } });
      }

      return tx.bill.findUniqueOrThrow({ where: { id: billId }, include: { items: true, shares: true } });
    });
  }

  async delete(billId: string) {
    return prisma.bill.update({ where: { id: billId }, data: { deletedAt: new Date() } });
  }

  async calculatePreview(eventId: string, items: { price: number; itemType: 'LIQUOR' | 'BEER' | 'SHARED' }[]) {
    const event = await prisma.event.findFirst({
      where: { id: eventId, deletedAt: null },
      include: { submissions: true },
    });
    if (!event) throw new NotFoundException('Event not found');

    const attendees: CalcAttendee[] = event.submissions.map((s) => ({
      memberId: s.memberId,
      drinkChoice: s.drinkChoice,
    }));

    return calculateBill(
      items.map((it, idx) => ({ id: `tmp-${idx}`, price: it.price, itemType: it.itemType })),
      attendees,
    );
  }

  async send(billId: string) {
    const bill = await this.getAdminDetail(billId);
    if (bill.status === 'CLOSED') throw new ConflictException('Bill already closed');

    const results = await this.push.sendBillNotifications(bill);

    await prisma.bill.update({
      where: { id: billId },
      data: { status: 'SENT', sentAt: new Date() },
    });

    return { sent: results.sent, failed: results.failed };
  }

  async close(billId: string) {
    const bill = await prisma.bill.findUnique({ where: { id: billId } });
    if (!bill) throw new NotFoundException('Bill not found');
    return prisma.bill.update({
      where: { id: billId },
      data: { status: 'CLOSED', closedAt: new Date() },
    });
  }

  async resetToDraft(billId: string) {
    const bill = await prisma.bill.findUnique({ where: { id: billId } });
    if (!bill) throw new NotFoundException('Bill not found');
    if (bill.status === 'CLOSED') {
      throw new ConflictException('Closed bills cannot be reset — delete and recreate instead');
    }
    if (bill.status === 'DRAFT') return bill;

    return prisma.$transaction(async (tx) => {
      // Reset all shares
      await tx.billShare.updateMany({
        where: { billId },
        data: {
          paymentStatus: 'PENDING',
          paidAt: null,
          claimedAt: null,
          claimNote: null,
          pushStatus: 'PENDING',
          pushError: null,
          pushSentAt: null,
        },
      });
      return tx.bill.update({
        where: { id: billId },
        data: { status: 'DRAFT', sentAt: null },
      });
    });
  }

  async bulkMarkShares(
    billId: string,
    shareIds: string[],
    status: 'PENDING' | 'CLAIMED' | 'PAID',
  ) {
    if (shareIds.length === 0) return { count: 0 };
    const data: Record<string, unknown> = { paymentStatus: status };
    if (status === 'PAID') data.paidAt = new Date();
    if (status === 'PENDING') {
      data.paidAt = null;
      data.claimedAt = null;
      data.claimNote = null;
    }
    const result = await prisma.billShare.updateMany({
      where: { id: { in: shareIds }, billId },
      data,
    });
    return { count: result.count };
  }

  async markShare(shareId: string, status: 'PENDING' | 'CLAIMED' | 'PAID') {
    const data: Record<string, unknown> = { paymentStatus: status };
    if (status === 'PAID') data.paidAt = new Date();
    if (status === 'PENDING') {
      data.paidAt = null;
      data.claimedAt = null;
      data.claimNote = null;
    }
    return prisma.billShare.update({ where: { id: shareId }, data });
  }

  async claimPaid(eventId: string, memberId: string, note: string | null | undefined) {
    const bill = await prisma.bill.findFirst({ where: { eventId, deletedAt: null } });
    if (!bill) throw new NotFoundException('No bill');
    return prisma.billShare.update({
      where: { billId_memberId: { billId: bill.id, memberId } },
      data: {
        paymentStatus: 'CLAIMED',
        claimedAt: new Date(),
        claimNote: note?.trim() ? note.trim() : null,
      },
    });
  }

  async retryPush(billId: string, shareId: string) {
    const share = await prisma.billShare.findUnique({
      where: { id: shareId },
      include: { bill: { include: { event: true } }, member: true },
    });
    if (!share || share.billId !== billId) throw new NotFoundException('Share not found');

    const ok = await this.push.sendShareNotification(share.bill, share.bill.event, share, share.member);
    return ok;
  }

  async getMyBillForEvent(eventId: string, memberId: string): Promise<MyBillDto> {
    const bill = await prisma.bill.findFirst({
      where: { eventId, deletedAt: null },
      include: { event: { select: { customPromptpayId: true } } },
    });
    if (!bill) throw new NotFoundException('No bill for this event');

    const share = await prisma.billShare.findUnique({
      where: { billId_memberId: { billId: bill.id, memberId } },
    });
    if (!share) throw new NotFoundException('You are not part of this bill');

    const appConfig = await prisma.appConfig.findUnique({ where: { id: 'singleton' } });
    const promptPayId =
      bill.event.customPromptpayId ??
      appConfig?.promptpayIdOverride ??
      this.cfg.getOrThrow<string>('PROMPTPAY_ID');

    return {
      bill: { id: bill.id, name: bill.name, status: bill.status, totalAmount: bill.totalAmount },
      myShare: {
        amount: share.amount,
        sharedAmount: share.sharedAmount,
        drinkAmount: share.drinkAmount,
        paymentStatus: share.paymentStatus,
        paidAt: share.paidAt?.toISOString() ?? null,
        claimedAt: share.claimedAt?.toISOString() ?? null,
        claimNote: share.claimNote,
      },
      qrPayload: { type: 'PROMPTPAY', value: promptPayId, amount: share.amount, customUrl: null },
    };
  }

}
