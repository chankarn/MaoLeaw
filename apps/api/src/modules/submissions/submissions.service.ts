// File: apps/api/src/modules/submissions/submissions.service.ts
import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { prisma } from '@maoleaw/db';
import type { AdminAddAttendeeInput, SubmitAttendanceInput } from '@maoleaw/shared';
import { recomputeDraftShares } from '../bills/recompute-shares';

@Injectable()
export class SubmissionsService {
  async upsert(eventId: string, memberId: string, input: SubmitAttendanceInput) {
    const event = await this.editableEvent(eventId);

    const member = await prisma.member.findUnique({ where: { id: memberId } });
    if (!member) throw new NotFoundException('ไม่พบบัญชีของคุณ');
    if (member.customName === '') {
      throw new ForbiddenException('ลงทะเบียนก่อนนะ แล้วค่อยเข้าร่วมงาน');
    }

    const draftBillId = event.bill?.id;
    return prisma.$transaction(async (tx) => {
      const submission = await tx.submission.upsert({
        where: { eventId_memberId: { eventId, memberId } },
        update: {
          nameSnapshot: input.nameSnapshot,
          drinkChoice: input.drinkChoice,
        },
        create: {
          eventId,
          memberId,
          nameSnapshot: input.nameSnapshot,
          drinkChoice: input.drinkChoice,
        },
      });
      // A DRAFT bill's shares must track attendance changes (drink switch / new joiner).
      if (draftBillId) await recomputeDraftShares(tx, draftBillId);
      return submission;
    });
  }

  /**
   * Admin adds someone who came but never tapped join — an existing member, or a walk-in
   * guest without LINE (created as a guest member on the fly).
   */
  async adminAdd(eventId: string, input: AdminAddAttendeeInput) {
    const event = await this.editableEvent(eventId);
    const draftBillId = event.bill?.id;

    return prisma.$transaction(async (tx) => {
      let member;
      if (input.guestName) {
        member = await tx.member.create({
          data: {
            isGuest: true,
            lineUserId: `guest:${randomUUID()}`,
            lineDisplayName: input.guestName,
            customName: input.guestName,
            preferredDrink: input.drinkChoice === 'BEER' ? 'BEER' : 'LIQUOR',
            memberType: 'FRIEND',
          },
        });
      } else {
        member = await tx.member.findUnique({ where: { id: input.memberId! } });
        if (!member) throw new NotFoundException('ไม่พบสมาชิกคนนี้');
        if (member.customName === '') throw new BadRequestException('สมาชิกคนนี้ยังลงทะเบียนไม่เสร็จ');
        if (member.banned) throw new ConflictException('สมาชิกคนนี้ถูกแบนอยู่');
      }

      await tx.submission.upsert({
        where: { eventId_memberId: { eventId, memberId: member.id } },
        update: { drinkChoice: input.drinkChoice },
        create: { eventId, memberId: member.id, nameSnapshot: member.customName, drinkChoice: input.drinkChoice },
      });
      if (draftBillId) await recomputeDraftShares(tx, draftBillId);
      return { memberId: member.id, name: member.customName, drinkChoice: input.drinkChoice, isGuest: member.isGuest };
    });
  }

  /** Admin removes an attendee (e.g. tapped join but never came). Guests are deleted outright. */
  async adminRemove(eventId: string, memberId: string) {
    const event = await this.editableEvent(eventId);
    const draftBillId = event.bill?.id;

    await prisma.$transaction(async (tx) => {
      const { count } = await tx.submission.deleteMany({ where: { eventId, memberId } });
      if (count === 0) throw new NotFoundException('คนนี้ไม่ได้อยู่ในงานนี้');
      if (draftBillId) {
        // Items may still name them as an extra/custom payer — drop that before recomputing.
        const items = await tx.billItem.findMany({
          where: {
            billId: draftBillId,
            OR: [{ extraMemberIds: { has: memberId } }, { customMemberIds: { has: memberId } }],
          },
        });
        for (const it of items) {
          await tx.billItem.update({
            where: { id: it.id },
            data: {
              extraMemberIds: it.extraMemberIds.filter((id) => id !== memberId),
              customMemberIds: it.customMemberIds.filter((id) => id !== memberId),
            },
          });
        }
        await recomputeDraftShares(tx, draftBillId);
      }
      // A guest only exists for the events they were added to.
      await tx.member.deleteMany({ where: { id: memberId, isGuest: true, submissions: { none: {} } } });
    });
    return { removed: true };
  }

  /** Attendance can change until the event's bill is sent. */
  private async editableEvent(eventId: string) {
    const event = await prisma.event.findFirst({
      where: { id: eventId, deletedAt: null },
      include: { bill: { select: { id: true, status: true } } },
    });
    if (!event) throw new NotFoundException('ไม่พบงานนี้ (อาจถูกลบไปแล้ว)');
    if (event.bill?.status === 'CLOSED') {
      throw new ConflictException('ปิดบิลแล้ว แก้การเข้าร่วมไม่ได้');
    }
    if (event.bill?.status === 'SENT') {
      throw new ConflictException('ส่งบิลแล้ว แก้การเข้าร่วมไม่ได้');
    }
    return event;
  }
}
