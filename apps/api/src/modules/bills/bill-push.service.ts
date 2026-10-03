// File: apps/api/src/modules/bills/bill-push.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { prisma } from '@maoleaw/db';
import { LineService } from '../auth/line.service';

interface BillWithRelations {
  id: string;
  name: string;
  event: { id: string; name: string; eventDate: Date };
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
    event: { id: string; name: string; eventDate: Date },
    share: { id: string; amount: number },
    member: { lineUserId: string },
  ): Promise<boolean> {
    const liffId = this.cfg.getOrThrow<string>('LIFF_ID');
    const deepLink = `https://liff.line.me/${liffId}/events/${event.id}/bill`;

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

  /**
   * Tell a member their payment claim was rejected so they can resend a slip.
   * Best-effort: returns false on failure and leaves the bill push status untouched.
   */
  async sendSlipRejected(
    event: { id: string; name: string },
    amount: number,
    member: { lineUserId: string },
    reason: string | null,
  ): Promise<boolean> {
    const liffId = this.cfg.getOrThrow<string>('LIFF_ID');
    const deepLink = `https://liff.line.me/${liffId}/events/${event.id}/bill`;
    const contents = {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [{ type: 'text', text: 'สลิปยังไม่ผ่านการตรวจ ⚠️', weight: 'bold', size: 'lg', color: '#FFFFFF' }],
        backgroundColor: '#B45309',
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: [
          { type: 'text', text: event.name, weight: 'bold', size: 'md', wrap: true },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: 'ยอดที่ต้องจ่าย', size: 'sm', color: '#78716C' },
              {
                type: 'text',
                text: `฿${amount.toLocaleString('th-TH')}`,
                size: 'lg',
                weight: 'bold',
                align: 'end',
                color: '#D97706',
              },
            ],
          },
          { type: 'separator' },
          {
            type: 'text',
            text: reason ? `เหตุผล: ${reason}` : 'admin ตรวจสอบแล้วยังไม่พบยอดโอนนี้',
            size: 'sm',
            wrap: true,
          },
          {
            type: 'text',
            text: 'กรุณาตรวจสอบแล้วส่งสลิปใหม่อีกครั้งในหน้าบิล',
            size: 'sm',
            color: '#78716C',
            wrap: true,
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
            action: { type: 'uri', label: 'เปิดบิล / ส่งสลิปใหม่', uri: deepLink },
          },
        ],
      },
    };

    try {
      await this.line.sendPushFlex(member.lineUserId, 'สลิปยังไม่ผ่านการตรวจ — กรุณาส่งใหม่', contents);
      return true;
    } catch (err) {
      this.logger.error(`Reject notification failed for ${member.lineUserId}`, err);
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
          { type: 'separator' },
          {
            type: 'text',
            text: '📸 โอนแล้วกด "ฉันโอนแล้ว" แล้วแนบสลิปในหน้าบิล ระบบจะตรวจให้อัตโนมัติ',
            size: 'sm',
            color: '#0369A1',
            wrap: true,
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

