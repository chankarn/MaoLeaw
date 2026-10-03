// File: apps/api/src/modules/submissions/submissions.service.ts
import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@maoleaw/db';
import type { SubmitAttendanceInput } from '@maoleaw/shared';
import { recomputeDraftShares } from '../bills/recompute-shares';

@Injectable()
export class SubmissionsService {
  async upsert(eventId: string, memberId: string, input: SubmitAttendanceInput) {
    const event = await prisma.event.findFirst({
      where: { id: eventId, deletedAt: null },
      include: { bill: { select: { id: true, status: true } } },
    });
    if (!event) throw new NotFoundException('Event not found');
    if (event.bill?.status === 'CLOSED') {
      throw new ConflictException('Bill closed — cannot edit submission');
    }
    if (event.bill?.status === 'SENT') {
      throw new ConflictException('Bill already sent — cannot edit submission');
    }

    const member = await prisma.member.findUnique({ where: { id: memberId } });
    if (!member) throw new NotFoundException('Member not found');
    if (member.customName === '') {
      throw new ForbiddenException('Member not registered');
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
}
