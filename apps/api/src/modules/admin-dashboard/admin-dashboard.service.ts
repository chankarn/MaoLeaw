// File: apps/api/src/modules/admin-dashboard/admin-dashboard.service.ts
import { Injectable } from '@nestjs/common';
import { prisma } from '@maoleaw/db';

type Range = 'today' | 'week' | 'month' | '3months' | 'all';

@Injectable()
export class AdminDashboardService {
  async getOverview(range: Range = 'month') {
    const now = new Date();
    const rangeStart = this.startOfRange(range, now);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const eightWeeksAgo = new Date(Date.now() - 8 * 7 * 24 * 60 * 60 * 1000);

    const rangedFilter = rangeStart ? { gte: rangeStart } : undefined;

    const [
      totalEvents,
      eventsThisWeek,
      totalMembers,
      membersThisWeek,
      billsThisMonth,
      billsTotalAmountThisMonth,
      pendingShares,
      claimedShares,
      upcomingEvents,
      drinkBreakdown,
      activeBills,
      recentSubmissions,
      recentClaims,
      recentPaid,
      recentMembers,
      topSpenders,
      eventsLast8Weeks,
    ] = await Promise.all([
      prisma.event.count({ where: { deletedAt: null } }),
      prisma.event.count({ where: { deletedAt: null, createdAt: { gte: weekAgo } } }),
      prisma.member.count({ where: { banned: false } }),
      prisma.member.count({ where: { banned: false, createdAt: { gte: weekAgo } } }),
      prisma.bill.count({ where: { deletedAt: null, createdAt: { gte: monthStart } } }),
      prisma.bill.aggregate({
        where: { deletedAt: null, createdAt: { gte: monthStart } },
        _sum: { totalAmount: true },
      }),
      prisma.billShare.aggregate({
        where: { paymentStatus: { in: ['PENDING', 'CLAIMED'] }, bill: { deletedAt: null } },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.billShare.findMany({
        where: { paymentStatus: 'CLAIMED', bill: { deletedAt: null } },
        orderBy: { claimedAt: 'desc' },
        take: 10,
        include: {
          member: { select: { id: true, customName: true, lineDisplayName: true, linePictureUrl: true } },
          bill: { select: { id: true, name: true, event: { select: { id: true, name: true } } } },
        },
      }),
      prisma.event.findMany({
        where: { deletedAt: null, status: 'ACTIVE', eventDate: { gte: now } },
        orderBy: { eventDate: 'asc' },
        take: 5,
        include: { _count: { select: { submissions: true } } },
      }),

      prisma.submission.groupBy({
        by: ['drinkChoice'],
        where: {
          event: { deletedAt: null },
          ...(rangedFilter && { createdAt: rangedFilter }),
        },
        _count: true,
      }),

      prisma.bill.findMany({
        where: { deletedAt: null, status: { in: ['SENT', 'DRAFT'] } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          event: { select: { name: true, eventDate: true } },
          shares: { select: { paymentStatus: true, amount: true } },
        },
      }),

      prisma.submission.findMany({
        where: rangedFilter ? { createdAt: rangedFilter } : undefined,
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          member: { select: { customName: true, lineDisplayName: true, linePictureUrl: true } },
          event: { select: { id: true, name: true } },
        },
      }),
      prisma.billShare.findMany({
        where: { claimedAt: { not: null }, ...(rangedFilter && { claimedAt: rangedFilter }) },
        orderBy: { claimedAt: 'desc' },
        take: 10,
        include: {
          member: { select: { customName: true, lineDisplayName: true, linePictureUrl: true } },
          bill: { select: { name: true } },
        },
      }),
      prisma.billShare.findMany({
        where: {
          paymentStatus: 'PAID',
          paidAt: { not: null },
          ...(rangedFilter && { paidAt: rangedFilter }),
        },
        orderBy: { paidAt: 'desc' },
        take: 10,
        include: {
          member: { select: { customName: true, lineDisplayName: true, linePictureUrl: true } },
          bill: { select: { name: true } },
        },
      }),
      prisma.member.findMany({
        where: rangedFilter ? { createdAt: rangedFilter } : undefined,
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          customName: true,
          lineDisplayName: true,
          linePictureUrl: true,
          memberType: true,
          createdAt: true,
        },
      }),

      prisma.billShare.groupBy({
        by: ['memberId'],
        where: {
          bill: { deletedAt: null },
          ...(rangedFilter && { createdAt: rangedFilter }),
        },
        _sum: { amount: true },
        _count: true,
        orderBy: [{ _sum: { amount: 'desc' } }, { _count: { memberId: 'desc' } }],
        take: 5,
      }),

      prisma.event.findMany({
        where: { deletedAt: null, createdAt: { gte: eightWeeksAgo } },
        select: { createdAt: true },
      }),
    ]);

    const topMemberIds = topSpenders.map((t) => t.memberId);
    const topMembers = topMemberIds.length
      ? await prisma.member.findMany({
          where: { id: { in: topMemberIds } },
          select: {
            id: true,
            customName: true,
            lineDisplayName: true,
            linePictureUrl: true,
            preferredDrink: true,
            memberType: true,
          },
        })
      : [];

    const drinkMap = { LIQUOR: 0, BEER: 0, NONE: 0 };
    for (const d of drinkBreakdown) drinkMap[d.drinkChoice] = d._count;
    const drinkTotal = drinkMap.LIQUOR + drinkMap.BEER + drinkMap.NONE;

    const weeklyBuckets: { weekStart: string; weekEnd: string; count: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const start = new Date(Date.now() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
      const end = new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000);
      const count = eventsLast8Weeks.filter((e) => e.createdAt >= start && e.createdAt < end).length;
      weeklyBuckets.push({
        weekStart: start.toISOString(),
        weekEnd: end.toISOString(),
        count,
      });
    }

    type Activity = {
      type: 'SUBMIT' | 'CLAIM' | 'PAID' | 'REGISTER';
      at: string;
      memberName: string;
      pictureUrl: string | null;
      detail: string;
    };
    const activities: Activity[] = [];
    for (const s of recentSubmissions) {
      activities.push({
        type: 'SUBMIT',
        at: s.createdAt.toISOString(),
        memberName: s.member.customName || s.member.lineDisplayName,
        pictureUrl: s.member.linePictureUrl,
        detail: `เข้าร่วม "${s.event.name}"`,
      });
    }
    for (const s of recentClaims) {
      activities.push({
        type: 'CLAIM',
        at: s.claimedAt!.toISOString(),
        memberName: s.member.customName || s.member.lineDisplayName,
        pictureUrl: s.member.linePictureUrl,
        detail: `แจ้งโอน ฿${s.amount.toLocaleString('th-TH')} (${s.bill.name})`,
      });
    }
    for (const s of recentPaid) {
      activities.push({
        type: 'PAID',
        at: s.paidAt!.toISOString(),
        memberName: s.member.customName || s.member.lineDisplayName,
        pictureUrl: s.member.linePictureUrl,
        detail: `ชำระแล้ว ฿${s.amount.toLocaleString('th-TH')} (${s.bill.name})`,
      });
    }
    for (const m of recentMembers) {
      activities.push({
        type: 'REGISTER',
        at: m.createdAt.toISOString(),
        memberName: m.customName || m.lineDisplayName,
        pictureUrl: m.linePictureUrl,
        detail: `เข้าร่วม MaoLeaw (${m.memberType})`,
      });
    }
    activities.sort((a, b) => (a.at < b.at ? 1 : -1));
    const activityFeed = activities.slice(0, 20);

    return {
      range,
      generatedAt: new Date().toISOString(),
      stats: {
        totalEvents,
        eventsThisWeek,
        totalMembers,
        membersThisWeek,
        billsThisMonth,
        billsAmountThisMonth: billsTotalAmountThisMonth._sum.totalAmount ?? 0,
        pendingAmount: pendingShares._sum.amount ?? 0,
        pendingCount: pendingShares._count ?? 0,
      },
      claims: claimedShares.map((s) => ({
        id: s.id,
        amount: s.amount,
        claimedAt: s.claimedAt?.toISOString() ?? null,
        claimNote: s.claimNote,
        member: {
          id: s.member.id,
          name: s.member.customName || s.member.lineDisplayName,
          pictureUrl: s.member.linePictureUrl,
        },
        bill: {
          id: s.bill.id,
          name: s.bill.name,
          eventId: s.bill.event.id,
          eventName: s.bill.event.name,
        },
      })),
      upcomingEvents: upcomingEvents.map((e) => ({
        id: e.id,
        name: e.name,
        venue: e.venue,
        eventDate: e.eventDate.toISOString(),
        attendeeCount: e._count.submissions,
      })),
      drinkBreakdown: {
        total: drinkTotal,
        liquor: drinkMap.LIQUOR,
        beer: drinkMap.BEER,
        none: drinkMap.NONE,
      },
      activeBills: activeBills.map((b) => {
        const paidCount = b.shares.filter((s) => s.paymentStatus === 'PAID').length;
        return {
          id: b.id,
          name: b.name,
          eventName: b.event.name,
          status: b.status,
          totalAmount: b.totalAmount,
          totalShares: b.shares.length,
          paidShares: paidCount,
          paidAmount: b.shares
            .filter((s) => s.paymentStatus === 'PAID')
            .reduce((sum, s) => sum + s.amount, 0),
        };
      }),
      activityFeed,
      topSpenders: topSpenders
        .map((t) => {
          const m = topMembers.find((x) => x.id === t.memberId);
          if (!m) return null;
          return {
            memberId: t.memberId,
            name: m.customName || m.lineDisplayName,
            pictureUrl: m.linePictureUrl,
            preferredDrink: m.preferredDrink,
            memberType: m.memberType,
            totalAmount: t._sum.amount ?? 0,
            billsCount: t._count,
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null),
      weeklyEvents: weeklyBuckets,
    };
  }

  private startOfRange(range: Range, now: Date): Date | null {
    if (range === 'all') return null;
    if (range === 'today') {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    if (range === 'week') return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    if (range === '3months') return new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
}
