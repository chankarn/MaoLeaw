import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { prisma } from '@maoleaw/db';
import { BillPushService } from './bill-push.service';
import { LineService } from '../auth/line.service';
import { autoRemindCutoff, inRemindWindow, quotaAllows } from './auto-remind';

const CHECK_EVERY_MS = 30 * 60 * 1000;
const FIRST_CHECK_MS = 60 * 1000;

/**
 * Sends one automatic LINE reminder to members who still haven't paid, at 13:00 Bangkok
 * on the AUTO_REMIND_DAYS-th day after a bill was sent. The keep-warm workflow pings the
 * API at 13:00 to wake it; this service checks shortly after boot and every 30 min, but
 * only acts inside the 13:00–15:00 window — so in effect once a day, no cron secret needed.
 *
 * A bill is claimed (autoRemindedAt set) before sending, so a restart mid-run can't send
 * twice. If the month's push quota can't cover a bill, it's left unclaimed and retried.
 */
@Injectable()
export class AutoRemindService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(AutoRemindService.name);
  private timers: NodeJS.Timeout[] = [];
  private running = false;

  constructor(
    private readonly cfg: ConfigService,
    private readonly push: BillPushService,
    private readonly line: LineService,
  ) {}

  private get days() {
    return Number(this.cfg.get('AUTO_REMIND_DAYS') ?? 3);
  }

  onModuleInit() {
    if (this.days <= 0 || this.cfg.get('NODE_ENV') === 'test' || this.cfg.get('E2E_TEST_MODE') === 'true') return;
    this.timers.push(setTimeout(() => void this.run(), FIRST_CHECK_MS));
    this.timers.push(setInterval(() => void this.run(), CHECK_EVERY_MS));
  }

  onModuleDestroy() {
    this.timers.forEach(clearTimeout);
  }

  async run(now = new Date()): Promise<{ bills: number; sent: number }> {
    if (this.running || this.days <= 0 || !inRemindWindow(now)) return { bills: 0, sent: 0 };
    this.running = true;
    try {
      const due = await prisma.bill.findMany({
        where: {
          status: 'SENT',
          deletedAt: null,
          autoRemindedAt: null,
          sentAt: { lt: autoRemindCutoff(now, this.days) },
        },
        include: {
          event: { select: { id: true, name: true } },
          shares: { where: { paymentStatus: 'PENDING', amount: { gt: 0 } }, include: { member: true } },
        },
        orderBy: { sentAt: 'asc' },
      });
      if (due.length === 0) return { bills: 0, sent: 0 };

      let quota: { limit: number | null; used: number };
      try {
        quota = await this.line.getPushQuota();
      } catch (err) {
        this.log.warn(`skipping: ${(err as Error).message}`);
        return { bills: 0, sent: 0 };
      }

      let bills = 0;
      let sent = 0;
      for (const bill of due) {
        if (!quotaAllows(quota, bill.shares.length)) {
          this.log.warn(`bill ${bill.id}: ${bill.shares.length} reminders exceed push quota, retrying later`);
          continue;
        }
        const { count } = await prisma.bill.updateMany({
          where: { id: bill.id, autoRemindedAt: null },
          data: { autoRemindedAt: now },
        });
        if (count === 0) continue;
        bills++;
        for (const share of bill.shares) {
          if (await this.push.sendPaymentReminder(bill.event, share.amount, share.member)) sent++;
        }
        quota = { ...quota, used: quota.used + bill.shares.length };
      }
      if (bills) this.log.log(`auto-reminded ${bills} bill(s), ${sent} message(s)`);
      return { bills, sent };
    } catch (err) {
      this.log.error(`auto-remind failed: ${(err as Error).message}`);
      return { bills: 0, sent: 0 };
    } finally {
      this.running = false;
    }
  }
}
