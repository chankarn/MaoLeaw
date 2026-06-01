// File: apps/api/src/modules/events/events.service.ts
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@maoleaw/db';
import type {
  AttendeeDto,
  CreateEventInput,
  DrinkChoice,
  EventDetailDto,
  EventListItemDto,
  EventStatsDto,
  UpdateEventInput,
} from '@maoleaw/shared';

@Injectable()
export class EventsService {
  async listActive(memberId: string): Promise<EventListItemDto[]> {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const events = await prisma.event.findMany({
      where: {
        status: 'ACTIVE',
        deletedAt: null,
        eventDate: { gte: yesterday },
      },
      orderBy: { eventDate: 'asc' },
      include: {
        _count: { select: { submissions: true } },
        submissions: { where: { memberId }, select: { id: true } },
        bill: { select: { id: true } },
      },
    });

    return events.map((e) => ({
      id: e.id,
      name: e.name,
      venue: e.venue,
      eventDate: e.eventDate.toISOString(),
      status: e.status,
      attendeeCount: e._count.submissions,
      hasSubmitted: e.submissions.length > 0,
      hasBill: e.bill !== null,
    }));
  }

  async listMine(memberId: string): Promise<EventListItemDto[]> {
    const events = await prisma.event.findMany({
      where: {
        deletedAt: null,
        submissions: { some: { memberId } },
      },
      orderBy: { eventDate: 'desc' },
      include: {
        _count: { select: { submissions: true } },
        submissions: { where: { memberId }, select: { id: true } },
        bill: { select: { id: true } },
      },
    });

    return events.map((e) => ({
      id: e.id,
      name: e.name,
      venue: e.venue,
      eventDate: e.eventDate.toISOString(),
      status: e.status,
      attendeeCount: e._count.submissions,
      hasSubmitted: e.submissions.length > 0,
      hasBill: e.bill !== null,
    }));
  }

  async getDetail(eventId: string, memberId: string): Promise<EventDetailDto> {
    const event = await prisma.event.findFirst({
      where: { id: eventId, deletedAt: null },
      include: {
        submissions: {
          orderBy: { createdAt: 'asc' },
          include: {
            member: {
              select: {
                id: true,
                customName: true,
                lineDisplayName: true,
                linePictureUrl: true,
                memberType: true,
              },
            },
          },
        },
        bill: { select: { id: true, status: true } },
      },
    });

    if (!event) throw new NotFoundException('Event not found');

    const attendees: AttendeeDto[] = event.submissions.map((s) => ({
      memberId: s.memberId,
      name: s.nameSnapshot || s.member.customName || s.member.lineDisplayName,
      pictureUrl: s.member.linePictureUrl,
      drinkChoice: s.drinkChoice,
      memberType: s.member.memberType,
      isMe: s.memberId === memberId,
    }));

    const stats = this.computeStats(event.submissions.map((s) => s.drinkChoice));

    const mySub = event.submissions.find((s) => s.memberId === memberId);

    return {
      event: {
        id: event.id,
        name: event.name,
        venue: event.venue,
        eventDate: event.eventDate.toISOString(),
        status: event.status,
        isPast: event.eventDate.getTime() < Date.now(),
        hasBill: event.bill !== null,
        billClosed: event.bill?.status === 'CLOSED',
      },
      stats,
      attendees,
      mySubmission: mySub
        ? {
            id: mySub.id,
            nameSnapshot: mySub.nameSnapshot,
            drinkChoice: mySub.drinkChoice,
            updatedAt: mySub.updatedAt.toISOString(),
          }
        : null,
    };
  }

  async createAdmin(adminId: string, input: CreateEventInput) {
    return prisma.event.create({
      data: {
        name: input.name,
        venue: input.venue,
        eventDate: new Date(input.eventDate),
        status: input.status ?? 'ACTIVE',
        createdById: adminId,
      },
    });
  }

  async updateAdmin(eventId: string, input: UpdateEventInput) {
    return prisma.event.update({
      where: { id: eventId },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.venue !== undefined && { venue: input.venue }),
        ...(input.eventDate !== undefined && { eventDate: new Date(input.eventDate) }),
        ...(input.status !== undefined && { status: input.status }),
      },
    });
  }

  async getRawAdmin(eventId: string) {
    const ev = await prisma.event.findFirst({
      where: { id: eventId, deletedAt: null },
      include: { _count: { select: { submissions: true } } },
    });
    if (!ev) throw new NotFoundException('Event not found');
    return {
      id: ev.id,
      name: ev.name,
      venue: ev.venue,
      eventDate: ev.eventDate.toISOString(),
      status: ev.status,
      attendeeCount: ev._count.submissions,
      createdAt: ev.createdAt.toISOString(),
    };
  }

  async deleteAdmin(eventId: string) {
    const ev = await prisma.event.findFirst({
      where: { id: eventId, deletedAt: null },
      include: { bill: true },
    });
    if (!ev) throw new NotFoundException('Event not found');
    if (ev.bill && !ev.bill.deletedAt) {
      throw new ConflictException('Cannot delete event with an existing bill — delete bill first');
    }
    return prisma.event.update({ where: { id: eventId }, data: { deletedAt: new Date() } });
  }

  async listAdmin(opts: { page: number; limit: number; status?: string; search?: string }) {
    const where = {
      deletedAt: null,
      ...(opts.status && { status: opts.status as never }),
      ...(opts.search && {
        OR: [
          { name: { contains: opts.search, mode: 'insensitive' as const } },
          { venue: { contains: opts.search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      prisma.event.findMany({
        where,
        orderBy: { eventDate: 'desc' },
        skip: (opts.page - 1) * opts.limit,
        take: opts.limit,
        include: { _count: { select: { submissions: true } }, bill: { select: { id: true } } },
      }),
      prisma.event.count({ where }),
    ]);

    return {
      items: items.map((e) => ({
        id: e.id,
        name: e.name,
        venue: e.venue,
        eventDate: e.eventDate.toISOString(),
        status: e.status,
        attendeeCount: e._count.submissions,
        hasBill: e.bill !== null,
      })),
      page: opts.page,
      limit: opts.limit,
      total,
    };
  }

  async listOptionsForBill() {
    return prisma.event.findMany({
      where: { deletedAt: null, bill: null },
      orderBy: { eventDate: 'desc' },
      select: { id: true, name: true, eventDate: true },
    });
  }

  async listAttendees(eventId: string) {
    const event = await prisma.event.findFirst({
      where: { id: eventId, deletedAt: null },
      include: {
        submissions: {
          include: { member: { select: { id: true, customName: true, lineDisplayName: true } } },
        },
      },
    });
    if (!event) throw new NotFoundException('Event not found');
    return event.submissions.map((s) => ({
      memberId: s.memberId,
      name: s.nameSnapshot || s.member.customName || s.member.lineDisplayName,
      drinkChoice: s.drinkChoice,
    }));
  }

  private computeStats(choices: DrinkChoice[]): EventStatsDto {
    const total = choices.length;
    const liquor = choices.filter((c) => c === 'LIQUOR').length;
    const beer = choices.filter((c) => c === 'BEER').length;
    const none = choices.filter((c) => c === 'NONE').length;
    const pct = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100));
    return {
      total,
      liquor: { count: liquor, percent: pct(liquor) },
      beer: { count: beer, percent: pct(beer) },
      none: { count: none, percent: pct(none) },
    };
  }
}
