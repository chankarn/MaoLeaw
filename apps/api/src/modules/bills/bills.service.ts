// File: apps/api/src/modules/bills/bills.service.ts
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, prisma } from '@maoleaw/db';
import {
  calculateBill,
  calculateMemberItemLines,
  sumItemPrices,
  type BankCode,
  type CalcAttendee,
  type ClaimResultDto,
  type CreateBillInput,
  type MyBillDto,
  type UpdateBillInput,
} from '@maoleaw/shared';
import { BillPushService } from './bill-push.service';
import { recomputeDraftShares } from './recompute-shares';
import { autoRemindDueAt } from './auto-remind';
import { evaluateSlip, type ExpectedPayment, type SlipVerdict } from '../slips/evaluate-slip';
import { SlipStorageService } from '../slips/slip-storage.service';
import { SlipVerifierService, type UploadedSlip } from '../slips/slip-verifier.service';

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class BillsService {
  constructor(
    private readonly cfg: ConfigService,
    private readonly push: BillPushService,
    private readonly slipVerifier: SlipVerifierService,
    private readonly slipStorage: SlipStorageService,
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
              select: {
                id: true,
                customName: true,
                lineDisplayName: true,
                linePictureUrl: true,
                lineUserId: true,
                isGuest: true,
              },
            },
          },
        },
      },
    });
    if (!bill) throw new NotFoundException('ไม่พบบิลนี้');
    return { ...bill, autoRemindDueAt: autoRemindDueAt(bill.sentAt, Number(this.cfg.get('AUTO_REMIND_DAYS') ?? 3)) };
  }

  async create(adminId: string, input: CreateBillInput) {
    const event = await prisma.event.findFirst({
      where: { id: input.eventId, deletedAt: null },
      include: { bill: true, submissions: true },
    });
    if (!event) throw new NotFoundException('ไม่พบงานนี้');
    if (event.bill) throw new ConflictException('งานนี้มีบิลอยู่แล้ว');
    if (event.submissions.length === 0) {
      throw new BadRequestException('งานนี้ยังไม่มีคนเข้าร่วม สร้างบิลไม่ได้');
    }

    const attendeeIds = new Set(event.submissions.map((s) => s.memberId));
    validateItemMembers(input.items, attendeeIds);

    const attendees: CalcAttendee[] = event.submissions.map((s) => ({
      memberId: s.memberId,
      drinkChoice: s.drinkChoice,
    }));

    // Initial snapshot — re-computed while DRAFT on attendance changes and again on send.
    const itemsForCalc = input.items.map((it, idx) => ({
      id: `tmp-${idx}`,
      price: it.price,
      itemType: it.itemType,
      extraMemberIds: it.extraMemberIds ?? [],
      customMemberIds: it.customMemberIds ?? [],
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
          paymentType: input.paymentType,
          promptpayId: input.paymentType === 'PROMPTPAY' ? input.promptpayId : null,
          bankCode: input.paymentType === 'BANK' ? (input.bankCode as BankCode) : null,
          bankAccountNumber: input.paymentType === 'BANK' ? input.bankAccountNumber : null,
          bankAccountName: input.paymentType === 'BANK' ? input.bankAccountName : null,
          createdById: adminId,
          items: {
            create: input.items.map((it, idx) => ({
              name: it.name,
              price: it.price,
              itemType: it.itemType,
              extraMemberIds: it.extraMemberIds ?? [],
              customMemberIds: it.customMemberIds ?? [],
              sortOrder: it.sortOrder ?? idx,
            })),
          },
          shares: {
            create: shares.map((s) => ({
              memberId: s.memberId,
              amount: s.amount,
              sharedAmount: s.sharedAmount,
              drinkAmount: s.drinkAmount,
              mixerAmount: s.mixerAmount,
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
    if (!bill) throw new NotFoundException('ไม่พบบิลนี้');
    if (bill.status !== 'DRAFT') throw new ConflictException('แก้ได้เฉพาะบิลที่ยังเป็น Draft');
    validatePaymentPatch(input);

    return prisma.$transaction(async (tx) => {
      // Update scalar fields (name + payment) if provided
      const scalarPatch: Record<string, unknown> = {};
      if (input.name !== undefined) scalarPatch.name = input.name;
      if (input.paymentType !== undefined) {
        scalarPatch.paymentType = input.paymentType;
        if (input.paymentType === 'PROMPTPAY') {
          scalarPatch.promptpayId = input.promptpayId ?? null;
          scalarPatch.bankCode = null;
          scalarPatch.bankAccountNumber = null;
          scalarPatch.bankAccountName = null;
        } else {
          scalarPatch.promptpayId = null;
          scalarPatch.bankCode = input.bankCode ?? null;
          scalarPatch.bankAccountNumber = input.bankAccountNumber ?? null;
          scalarPatch.bankAccountName = input.bankAccountName ?? null;
        }
      }
      if (Object.keys(scalarPatch).length > 0) {
        await tx.bill.update({ where: { id: billId }, data: scalarPatch });
      }
      if (input.items) {
        const attendeeIds = new Set(bill.event.submissions.map((s) => s.memberId));
        validateItemMembers(input.items, attendeeIds);

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
          extraMemberIds: it.extraMemberIds ?? [],
          customMemberIds: it.customMemberIds ?? [],
        }));
        const { shares } = calculateBill(itemsForCalc, attendees);
        const total = sumItemPrices(itemsForCalc);

        await tx.billItem.createMany({
          data: input.items.map((it, idx) => ({
            billId,
            name: it.name,
            price: it.price,
            itemType: it.itemType,
            extraMemberIds: it.extraMemberIds ?? [],
            customMemberIds: it.customMemberIds ?? [],
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
            mixerAmount: s.mixerAmount,
          })),
        });
        await tx.bill.update({ where: { id: billId }, data: { totalAmount: total } });
      }

      return tx.bill.findUniqueOrThrow({ where: { id: billId }, include: { items: true, shares: true } });
    });
  }

  async delete(billId: string) {
    const bill = await prisma.bill.findUnique({ where: { id: billId } });
    if (!bill) throw new NotFoundException('ไม่พบบิลนี้');
    if (bill.status === 'CLOSED') {
      throw new ConflictException('บิลที่ปิดแล้วลบไม่ได้');
    }
    await this.purgeSlipImages({ billId });
    // Hard delete — BillItem/BillShare cascade. Frees the eventId so a new bill can be created.
    return prisma.bill.delete({ where: { id: billId } });
  }

  async calculatePreview(
    eventId: string,
    items: { price: number; itemType: 'LIQUOR' | 'BEER' | 'MIXER' | 'SHARED' | 'CUSTOM'; extraMemberIds?: string[]; customMemberIds?: string[] }[],
  ) {
    const event = await prisma.event.findFirst({
      where: { id: eventId, deletedAt: null },
      include: { submissions: true },
    });
    if (!event) throw new NotFoundException('ไม่พบงานนี้');

    const attendees: CalcAttendee[] = event.submissions.map((s) => ({
      memberId: s.memberId,
      drinkChoice: s.drinkChoice,
    }));

    return calculateBill(
      items.map((it, idx) => ({
        id: `tmp-${idx}`,
        price: it.price,
        itemType: it.itemType,
        extraMemberIds: it.extraMemberIds ?? [],
        customMemberIds: it.customMemberIds ?? [],
      })),
      attendees,
    );
  }

  async send(billId: string) {
    const draft = await prisma.bill.findFirst({ where: { id: billId, deletedAt: null } });
    if (!draft) throw new NotFoundException('ไม่พบบิลนี้');
    if (draft.status !== 'DRAFT') {
      throw new ConflictException('บิลนี้ส่งไปแล้ว ถ้ามีคนที่ส่งไม่ถึง ให้กดส่งซ้ำรายคน');
    }
    // Snapshot shares against the final attendee list before members are notified.
    await prisma.$transaction((tx) => recomputeDraftShares(tx, billId));
    const bill = await this.getAdminDetail(billId);

    const results = await this.push.sendBillNotifications(bill);

    await prisma.bill.update({
      where: { id: billId },
      data: { status: 'SENT', sentAt: new Date() },
    });

    return { sent: results.sent, failed: results.failed };
  }

  async close(billId: string) {
    const bill = await prisma.bill.findUnique({ where: { id: billId } });
    if (!bill) throw new NotFoundException('ไม่พบบิลนี้');
    if (bill.status !== 'SENT') throw new ConflictException('ต้องส่งบิลก่อนถึงจะปิดได้');
    const closed = await prisma.bill.update({
      where: { id: billId },
      data: { status: 'CLOSED', closedAt: new Date() },
    });
    await this.purgeSlipImages({ billId });
    return closed;
  }

  async resetToDraft(billId: string) {
    const bill = await prisma.bill.findUnique({ where: { id: billId } });
    if (!bill) throw new NotFoundException('ไม่พบบิลนี้');
    if (bill.status === 'CLOSED') {
      throw new ConflictException('บิลที่ปิดแล้วรีเซ็ตไม่ได้ ต้องลบแล้วสร้างใหม่');
    }
    if (bill.status === 'DRAFT') return bill;

    await this.purgeSlipImages({ billId });
    return prisma.$transaction(async (tx) => {
      // Reset all shares
      await tx.billShare.updateMany({
        where: { billId },
        data: {
          ...shareStatusPatch('PENDING'),
          pushStatus: 'PENDING',
          pushError: null,
          pushSentAt: null,
        },
      });
      return tx.bill.update({
        where: { id: billId },
        data: { status: 'DRAFT', sentAt: null, autoRemindedAt: null },
      });
    });
  }

  async bulkMarkShares(
    billId: string,
    shareIds: string[],
    status: 'PENDING' | 'CLAIMED' | 'PAID',
  ) {
    if (shareIds.length === 0) return { count: 0 };
    // An admin decision (paid / back to pending) ends the review — drop the images.
    if (status !== 'CLAIMED') await this.purgeSlipImages({ id: { in: shareIds }, billId });
    const result = await prisma.billShare.updateMany({
      where: { id: { in: shareIds }, billId },
      data: shareStatusPatch(status),
    });
    const billClosed = status === 'PAID' && (await this.closeIfFullyPaid(billId));
    return { count: result.count, billClosed };
  }

  async markShare(
    billId: string,
    shareId: string,
    status: 'PENDING' | 'CLAIMED' | 'PAID',
    paidVia?: 'TRANSFER' | 'CASH',
  ) {
    const share = await prisma.billShare.findUnique({ where: { id: shareId }, select: { billId: true } });
    if (!share || share.billId !== billId) throw new NotFoundException('ไม่พบรายการนี้');
    if (status !== 'CLAIMED') await this.purgeSlipImages({ id: shareId });
    const updated = await prisma.billShare.update({ where: { id: shareId }, data: shareStatusPatch(status, paidVia) });
    const billClosed = status === 'PAID' && (await this.closeIfFullyPaid(billId));
    return { ...updated, billClosed };
  }

  /**
   * Close a SENT bill once nobody owes anything. Zero-amount shares (e.g. a non-drinker on a
   * drinks-only bill) count as settled, otherwise such bills could never close on their own.
   */
  private async closeIfFullyPaid(billId: string): Promise<boolean> {
    const unpaid = await prisma.billShare.count({
      where: { billId, paymentStatus: { not: 'PAID' }, amount: { gt: 0 } },
    });
    if (unpaid > 0) return false;
    // Guarded update: only one of several concurrent "last payments" performs the close.
    const { count } = await prisma.bill.updateMany({
      where: { id: billId, status: 'SENT' },
      data: { status: 'CLOSED', closedAt: new Date() },
    });
    if (count === 0) return false;
    await this.purgeSlipImages({ billId });
    return true;
  }

  /** Unsettled shares on sent bills — what the member still owes (chat bot "บิล"). */
  async getMyOutstanding(memberId: string) {
    const shares = await prisma.billShare.findMany({
      where: {
        memberId,
        paymentStatus: { in: ['PENDING', 'CLAIMED'] },
        amount: { gt: 0 },
        bill: { status: 'SENT', deletedAt: null },
      },
      orderBy: { createdAt: 'desc' },
      include: { bill: { select: { name: true, event: { select: { id: true, name: true } } } } },
    });
    return shares.map((s) => ({
      eventId: s.bill.event?.id ?? null,
      title: s.bill.event?.name ?? s.bill.name,
      amount: s.amount,
      paymentStatus: s.paymentStatus as 'PENDING' | 'CLAIMED',
    }));
  }

  /**
   * Push a payment reminder to everyone still PENDING on a sent bill (CLAIMED members are
   * waiting on the admin, so they're skipped). Each message uses one push from the quota.
   */
  async remindUnpaid(billId: string) {
    const bill = await prisma.bill.findFirst({
      where: { id: billId, deletedAt: null },
      include: {
        event: true,
        shares: { where: { paymentStatus: 'PENDING', member: { isGuest: false } }, include: { member: true } },
      },
    });
    if (!bill) throw new NotFoundException('ไม่พบบิลนี้');
    if (bill.status !== 'SENT') throw new ConflictException('ทวงเงินได้เฉพาะบิลที่ส่งแล้ว');

    let sent = 0;
    let failed = 0;
    for (const share of bill.shares) {
      const ok = await this.push.sendPaymentReminder(bill.event, share.amount, share.member);
      if (ok) sent++;
      else failed++;
    }
    return { sent, failed };
  }

  /**
   * Admin rejects a payment claim: the share goes back to PENDING (slip forgotten, image
   * deleted) and the member gets a LINE message with the reason so they can resend.
   */
  async rejectClaim(billId: string, shareId: string, reason: string | null | undefined) {
    const share = await prisma.billShare.findUnique({
      where: { id: shareId },
      include: { bill: { include: { event: true } }, member: true },
    });
    if (!share || share.billId !== billId) throw new NotFoundException('ไม่พบรายการนี้');
    if (share.paymentStatus !== 'CLAIMED') throw new ConflictException('ตีกลับได้เฉพาะรายการที่แจ้งโอนมาแล้ว');
    if (share.bill.status !== 'SENT') throw new ConflictException('ตีกลับได้เฉพาะบิลที่ส่งแล้ว');

    await this.purgeSlipImages({ id: shareId });
    await prisma.billShare.update({ where: { id: shareId }, data: shareStatusPatch('PENDING') });

    const pushed = await this.push.sendSlipRejected(
      share.bill.event,
      share.amount,
      share.member,
      reason?.trim() || null,
    );
    return { pushed };
  }

  /**
   * Member claims payment with a slip image. The slip is verified (SlipOK) and checked
   * against the share: a clean match settles it as PAID immediately; anything doubtful
   * becomes CLAIMED + NEEDS_REVIEW with the image kept for the admin.
   */
  async claimPaid(
    eventId: string,
    memberId: string,
    note: string | null | undefined,
    file: UploadedSlip,
  ): Promise<ClaimResultDto> {
    const bill = await prisma.bill.findFirst({
      where: { eventId, deletedAt: null },
      include: { event: { select: { eventDate: true } } },
    });
    if (!bill || bill.status === 'DRAFT') throw new NotFoundException('ยังไม่มีบิลของงานนี้');
    if (bill.status === 'CLOSED') throw new ConflictException('บิลนี้ปิดแล้ว');
    const share = await prisma.billShare.findUnique({
      where: { billId_memberId: { billId: bill.id, memberId } },
    });
    if (!share) throw new NotFoundException('คุณไม่ได้อยู่ในบิลนี้');
    // Never downgrade an admin-confirmed payment back to CLAIMED.
    if (share.paymentStatus === 'PAID') throw new ConflictException('รายการนี้ชำระเรียบร้อยแล้ว');

    const outcome = await this.slipVerifier.verify(file);
    const slip = outcome.kind === 'verified' ? outcome.slip : null;
    let verdict: SlipVerdict;
    if (outcome.kind === 'verified') {
      await this.assertSlipUnused(outcome.slip.transRef, share.id);
      verdict = evaluateSlip(outcome.slip, {
        amount: share.amount,
        // Paying at the venue before the bill exists is normal; older slips are suspicious.
        notBefore: new Date(bill.event.eventDate.getTime() - DAY_MS),
        payment: expectedPayment(bill, this.cfg.getOrThrow<string>('PROMPTPAY_ID')),
      });
    } else {
      verdict = { ok: false, reason: outcome.reason };
    }

    // Keep the image only when a human has to look at it.
    let slipImagePath: string | null = null;
    if (!verdict.ok) {
      const path = `${bill.id}/${share.id}`;
      if (await this.slipStorage.upload(path, file.buffer, file.mimetype)) slipImagePath = path;
    } else if (share.slipImagePath) {
      await this.slipStorage.remove([share.slipImagePath]);
    }

    const now = new Date();
    try {
      const updated = await prisma.billShare.update({
        where: { id: share.id },
        data: {
          paymentStatus: verdict.ok ? 'PAID' : 'CLAIMED',
          paidAt: verdict.ok ? now : null,
          paidVia: verdict.ok ? 'TRANSFER' : null,
          claimedAt: now,
          claimNote: note?.trim() ? note.trim() : null,
          slipCheck: verdict.ok ? 'AUTO_OK' : 'NEEDS_REVIEW',
          slipReviewReason: verdict.ok ? null : verdict.reason,
          slipTransRef: slip?.transRef ?? null,
          slipAmount: slip ? Math.floor(slip.amount) : null,
          slipTransferredAt: slip?.transferredAt ?? null,
          slipImagePath,
        },
      });
      // The auto-verified slip may have been the last outstanding payment.
      if (verdict.ok) await this.closeIfFullyPaid(bill.id);
      return {
        paymentStatus: updated.paymentStatus,
        slipCheck: verdict.ok ? 'AUTO_OK' : 'NEEDS_REVIEW',
        slipReviewReason: verdict.ok ? null : verdict.reason,
      };
    } catch (err) {
      // Same slip submitted concurrently for another share.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('สลิปนี้ถูกใช้แจ้งโอนไปแล้ว');
      }
      throw err;
    }
  }

  /** Signed URL for an admin to view a slip that needs review. */
  async getSlipImageUrl(billId: string, shareId: string) {
    const share = await prisma.billShare.findUnique({
      where: { id: shareId },
      select: { billId: true, slipImagePath: true },
    });
    if (!share || share.billId !== billId) throw new NotFoundException('ไม่พบรายการนี้');
    if (!share.slipImagePath) throw new NotFoundException('รายการนี้ไม่มีรูปสลิป');
    const url = await this.slipStorage.signedUrl(share.slipImagePath);
    if (!url) throw new NotFoundException('เปิดรูปสลิปไม่ได้');
    return { url };
  }

  private async assertSlipUnused(transRef: string, shareId: string) {
    const used = await prisma.billShare.findFirst({
      where: { slipTransRef: transRef, NOT: { id: shareId } },
      select: { id: true },
    });
    if (used) throw new ConflictException('สลิปนี้ถูกใช้แจ้งโอนไปแล้ว');
  }

  /** Review images only matter until a decision is made — delete and unlink them. */
  private async purgeSlipImages(where: Prisma.BillShareWhereInput) {
    const shares = await prisma.billShare.findMany({
      where: { ...where, slipImagePath: { not: null } },
      select: { id: true, slipImagePath: true },
    });
    if (shares.length === 0) return;
    await this.slipStorage.remove(shares.map((s) => s.slipImagePath!));
    await prisma.billShare.updateMany({
      where: { id: { in: shares.map((s) => s.id) } },
      data: { slipImagePath: null },
    });
  }

  async retryPush(billId: string, shareId: string) {
    const share = await prisma.billShare.findUnique({
      where: { id: shareId },
      include: { bill: { include: { event: true } }, member: true },
    });
    if (!share || share.billId !== billId) throw new NotFoundException('ไม่พบรายการนี้');
    if (share.bill.status !== 'SENT') throw new ConflictException('ส่งข้อความได้เฉพาะบิลที่ส่งแล้ว');

    const ok = await this.push.sendShareNotification(share.bill, share.bill.event, share, share.member);
    return ok;
  }

  async getMyBillForEvent(eventId: string, memberId: string): Promise<MyBillDto> {
    const bill = await prisma.bill.findFirst({
      where: { eventId, deletedAt: null },
      include: {
        items: { orderBy: { sortOrder: 'asc' } },
        event: { include: { submissions: true } },
      },
    });
    // DRAFT amounts can still change — members only see a bill once it is sent.
    if (!bill || bill.status === 'DRAFT') throw new NotFoundException('ยังไม่มีบิลของงานนี้');

    const share = await prisma.billShare.findUnique({
      where: { billId_memberId: { billId: bill.id, memberId } },
    });
    if (!share) throw new NotFoundException('คุณไม่ได้อยู่ในบิลนี้');

    // Per-item breakdown of this member's share. Reuses the canonical calc rules,
    // so the lines reconcile exactly to share.{sharedAmount,drinkAmount,mixerAmount}.
    const attendees: CalcAttendee[] = bill.event.submissions.map((s) => ({
      memberId: s.memberId,
      drinkChoice: s.drinkChoice,
    }));
    const itemNameById = new Map(bill.items.map((it) => [it.id, it.name]));
    const lineItems = calculateMemberItemLines(
      bill.items.map((it) => ({
        id: it.id,
        price: it.price,
        itemType: it.itemType,
        extraMemberIds: it.extraMemberIds,
        customMemberIds: it.customMemberIds,
      })),
      attendees,
      memberId,
    ).map((line) => ({
      name: itemNameById.get(line.itemId) ?? '',
      bucket: line.bucket,
      amount: line.amount,
    }));

    const payment: MyBillDto['payment'] =
      bill.paymentType === 'BANK'
        ? {
            type: 'BANK',
            amount: share.amount,
            promptpay: null,
            bank: {
              code: bill.bankCode as BankCode,
              accountNumber: bill.bankAccountNumber!,
              accountName: bill.bankAccountName!,
            },
          }
        : {
            type: 'PROMPTPAY',
            amount: share.amount,
            promptpay: {
              id: bill.promptpayId ?? this.cfg.getOrThrow<string>('PROMPTPAY_ID'),
            },
            bank: null,
          };

    return {
      bill: { id: bill.id, name: bill.name, status: bill.status, totalAmount: bill.totalAmount },
      myShare: {
        amount: share.amount,
        sharedAmount: share.sharedAmount,
        drinkAmount: share.drinkAmount,
        mixerAmount: share.mixerAmount,
        paymentStatus: share.paymentStatus,
        paidAt: share.paidAt?.toISOString() ?? null,
        claimedAt: share.claimedAt?.toISOString() ?? null,
        claimNote: share.claimNote,
        slipCheck: share.slipCheck,
        slipReviewReason: share.slipReviewReason,
      },
      lineItems,
      payment,
    };
  }

}

function shareStatusPatch(status: 'PENDING' | 'CLAIMED' | 'PAID', paidVia?: 'TRANSFER' | 'CASH') {
  if (status === 'PAID') return { paymentStatus: status, paidAt: new Date(), paidVia: paidVia ?? null };
  if (status === 'CLAIMED') return { paymentStatus: status, paidAt: null, paidVia: null, claimedAt: new Date() };
  // Back to PENDING forgets the claim entirely, including the slip (frees its transRef).
  return {
    paymentStatus: status,
    paidAt: null,
    paidVia: null,
    claimedAt: null,
    claimNote: null,
    slipCheck: null,
    slipReviewReason: null,
    slipTransRef: null,
    slipAmount: null,
    slipTransferredAt: null,
  };
}

/** Where the bill expects money to land (same fallback as the member's bill view). */
function expectedPayment(
  bill: {
    paymentType: 'PROMPTPAY' | 'BANK';
    promptpayId: string | null;
    bankCode: BankCode | null;
    bankAccountNumber: string | null;
  },
  defaultPromptpayId: string,
): ExpectedPayment {
  if (bill.paymentType === 'BANK') {
    return { type: 'BANK', bankCode: bill.bankCode!, accountNumber: bill.bankAccountNumber! };
  }
  return { type: 'PROMPTPAY', promptpayId: bill.promptpayId ?? defaultPromptpayId };
}

/** A payment-type switch must carry that channel's fields (create enforces this via schema). */
function validatePaymentPatch(input: UpdateBillInput) {
  if (input.paymentType === 'PROMPTPAY' && !input.promptpayId) {
    throw new BadRequestException('ใส่หมายเลข PromptPay ด้วย');
  }
  if (
    input.paymentType === 'BANK' &&
    (!input.bankCode || !input.bankAccountNumber || !input.bankAccountName)
  ) {
    throw new BadRequestException('ใส่ธนาคาร เลขบัญชี และชื่อบัญชีให้ครบ');
  }
}

/** Validates extraMemberIds and customMemberIds against the event's attendee list. */
function validateItemMembers(
  items: { itemType: string; extraMemberIds?: string[]; customMemberIds?: string[] }[],
  attendeeIds: Set<string>,
) {
  items.forEach((it, i) => {
    for (const id of it.extraMemberIds ?? []) {
      if (!attendeeIds.has(id)) {
        throw new BadRequestException(`Item #${i + 1}: ${id} is not an attendee of this event`);
      }
    }
    if (it.itemType === 'CUSTOM') {
      const custom = it.customMemberIds ?? [];
      if (custom.length === 0) {
        throw new BadRequestException(`Item #${i + 1}: CUSTOM items must have at least one member selected`);
      }
      for (const id of custom) {
        if (!attendeeIds.has(id)) {
          throw new BadRequestException(`Item #${i + 1}: ${id} is not an attendee of this event`);
        }
      }
    }
  });
}
