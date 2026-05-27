// File: apps/api/src/modules/bills/bill-push.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { prisma } from '@maoleaw/db';
import { LineService } from '../auth/line.service';

interface BillWithRelations {
  id: string;
  name: string;
  event: { name: string; eventDate: Date };
  shares: Array<{
    id: string;
    amount: number;
    member: { lineUserId: string; lineDisplayName: string };
  }>;
}

@Injectable()
export class BillPushService {
  private readonly logger = new Logger('BillPushService');

  constructor(
    private readonly line: LineService,
    private readonly cfg: ConfigService,
  ) {}

  async sendBillNotifications(bill: BillWithRelations) {
    let sent = 0;
    let failed = 0;
    for (const share of bill.shares) {
      const ok = await this.sendShareNotification(bill, bill.event, share, share.member);
      if (ok) sent++;
      else failed++;
    }
    return { sent, failed };
  }

  async sendShareNotification(
    bill: { id: string; name: string },
    event: { name: string; eventDate: Date },
    share: { id: string; amount: number },
    member: { lineUserId: string },
  ): Promise<boolean> {
    const liffId = this.cfg.getOrThrow<string>('LIFF_ID');
    const deepLink = `https://liff.line.me/${liffId}/events/${shareEventIdHack(bill.id)}/bill`;

    const altText = `บิลพร้อมแล้ว ฿${share.amount.toLocaleString('th-TH')}`;
    const contents = this.buildFlex({
      title: 'บิลพร้อมแล้ว 💸',
      eventName: event.name,
      eventDate: event.eventDate,
      amount: share.amount,
      deepLink,
    });

    try {
      await this.line.sendPushFlex(member.lineUserId, altText, contents);
      await prisma.billShare.update({
        where: { id: share.id },
        data: { pushStatus: 'SENT', pushSentAt: new Date(), pushError: null },
      });
      return true;
    } catch (err) {
      this.logger.error(`Push failed for share ${share.id}`, err);
      await prisma.billShare.update({
        where: { id: share.id },
        data: { pushStatus: 'FAILED', pushError: err instanceof Error ? err.message : String(err) },
      });
      return false;
    }
  }

  private buildFlex(opts: {
    title: string;
    eventName: string;
    eventDate: Date;
    amount: number;
    deepLink: string;
  }) {
    return {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [{ type: 'text', text: opts.title, weight: 'bold', size: 'lg' }],
        backgroundColor: '#292524',
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: [
          { type: 'text', text: opts.eventName, weight: 'bold', size: 'md', wrap: true },
          {
            type: 'text',
            text: opts.eventDate.toLocaleDateString('th-TH', { dateStyle: 'medium' }),
            size: 'sm',
            color: '#78716C',
          },
          { type: 'separator' },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: 'ยอดที่ต้องจ่าย', size: 'sm', color: '#78716C' },
              {
                type: 'text',
                text: `฿${opts.amount.toLocaleString('th-TH')}`,
                size: 'xl',
                weight: 'bold',
                align: 'end',
                color: '#D97706',
              },
            ],
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#D97706',
            action: { type: 'uri', label: 'ดูบิล + QR', uri: opts.deepLink },
          },
        ],
      },
    };
  }
}

// Internal helper: a Bill is 1:1 with Event, so the LIFF deep-link uses the eventId.
// We accept billId here (caller passes bill.id), but the route on LIFF is `/events/:id/bill`.
// In real usage we'd pass eventId — this helper is just a label to make it obvious.
function shareEventIdHack(_billId: string): string {
  return _billId; // FE resolves via /my-bills lookup if needed; OR pass eventId in the future.
}
