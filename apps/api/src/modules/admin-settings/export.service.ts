// File: apps/api/src/modules/admin-settings/export.service.ts
import { Injectable } from '@nestjs/common';
import { prisma } from '@maoleaw/db';

@Injectable()
export class ExportService {
  async eventsCsv(): Promise<string> {
    const events = await prisma.event.findMany({
      where: { deletedAt: null },
      orderBy: { eventDate: 'desc' },
      include: { _count: { select: { submissions: true } }, bill: { select: { totalAmount: true, status: true } } },
    });

    const rows = [['ID', 'Name', 'Venue', 'Date', 'Status', 'Attendees', 'BillStatus', 'BillTotal']];
    for (const e of events) {
      rows.push([
        e.id,
        e.name,
        e.venue,
        e.eventDate.toISOString(),
        e.status,
        String(e._count.submissions),
        e.bill?.status ?? '',
        e.bill ? String(e.bill.totalAmount) : '',
      ]);
    }
    return toCsv(rows);
  }

  async billsCsv(): Promise<string> {
    const bills = await prisma.bill.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        event: { select: { name: true, eventDate: true } },
        shares: { select: { paymentStatus: true, amount: true } },
      },
    });
    const rows = [
      [
        'ID',
        'Name',
        'EventName',
        'EventDate',
        'Status',
        'Total',
        'Members',
        'Paid',
        'Pending',
        'Claimed',
        'CreatedAt',
      ],
    ];
    for (const b of bills) {
      const paid = b.shares.filter((s) => s.paymentStatus === 'PAID').length;
      const pending = b.shares.filter((s) => s.paymentStatus === 'PENDING').length;
      const claimed = b.shares.filter((s) => s.paymentStatus === 'CLAIMED').length;
      rows.push([
        b.id,
        b.name,
        b.event.name,
        b.event.eventDate.toISOString(),
        b.status,
        String(b.totalAmount),
        String(b.shares.length),
        String(paid),
        String(pending),
        String(claimed),
        b.createdAt.toISOString(),
      ]);
    }
    return toCsv(rows);
  }

  async membersCsv(): Promise<string> {
    const members = await prisma.member.findMany({
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { submissions: true } } },
    });
    const rows = [
      ['ID', 'LineUserId', 'CustomName', 'LineDisplayName', 'Type', 'PreferredDrink', 'Events', 'Banned', 'CreatedAt'],
    ];
    for (const m of members) {
      rows.push([
        m.id,
        m.lineUserId,
        m.customName,
        m.lineDisplayName,
        m.memberType,
        m.preferredDrink,
        String(m._count.submissions),
        m.banned ? 'true' : 'false',
        m.createdAt.toISOString(),
      ]);
    }
    return toCsv(rows);
  }

  async sharesCsv(): Promise<string> {
    const shares = await prisma.billShare.findMany({
      where: { bill: { deletedAt: null } },
      orderBy: { createdAt: 'desc' },
      include: {
        bill: { select: { name: true, event: { select: { name: true } } } },
        member: { select: { customName: true, lineDisplayName: true } },
      },
    });
    const rows = [
      [
        'ShareID',
        'BillName',
        'EventName',
        'MemberName',
        'Amount',
        'SharedAmount',
        'DrinkAmount',
        'MixerAmount',
        'PaymentStatus',
        'PaidAt',
        'ClaimedAt',
        'ClaimNote',
      ],
    ];
    for (const s of shares) {
      rows.push([
        s.id,
        s.bill.name,
        s.bill.event.name,
        s.member.customName || s.member.lineDisplayName,
        String(s.amount),
        String(s.sharedAmount),
        String(s.drinkAmount),
        String(s.mixerAmount),
        s.paymentStatus,
        s.paidAt?.toISOString() ?? '',
        s.claimedAt?.toISOString() ?? '',
        s.claimNote ?? '',
      ]);
    }
    return toCsv(rows);
  }
}

function toCsv(rows: string[][]): string {
  const escape = (v: string) => {
    if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
    return v;
  };
  // BOM for Excel Thai support
  return '﻿' + rows.map((r) => r.map(escape).join(',')).join('\n');
}
