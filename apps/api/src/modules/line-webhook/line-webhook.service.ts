// Chat bot (1-on-1 only): answers "บิล" / "งาน" / help with free reply messages.
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { prisma } from '@maoleaw/db';
import { LineService } from '../auth/line.service';
import { BillsService } from '../bills/bills.service';
import { EventsService } from '../events/events.service';
import { debtMessage, eventsMessage, helpMessage, notRegisteredMessage, text } from './flex';
import { resolveIntent } from './intent';

/** The subset of a LINE webhook event this bot reads. */
export interface LineWebhookEvent {
  type: string;
  replyToken?: string;
  source?: { type: string; userId?: string };
  message?: { type: string; text?: string };
}

@Injectable()
export class LineWebhookService {
  private readonly logger = new Logger('LineWebhookService');

  constructor(
    private readonly cfg: ConfigService,
    private readonly line: LineService,
    private readonly bills: BillsService,
    private readonly events: EventsService,
  ) {}

  /** Each event has its own reply token; one failure must not block the others. */
  async handle(events: LineWebhookEvent[]) {
    await Promise.allSettled(events.map((e) => this.handleEvent(e)));
  }

  private async handleEvent(e: LineWebhookEvent) {
    // Group/room chats are out of scope — only answer 1-on-1 conversations.
    if (!e.replyToken || e.source?.type !== 'user' || !e.source.userId) return;
    if (e.type !== 'message' && e.type !== 'follow') return;

    try {
      const message = await this.buildReply(e, e.source.userId);
      await this.line.sendReply(e.replyToken, [message]);
    } catch (err) {
      // Expired reply tokens land here too (e.g. after a cold start). Never fall back to
      // push — that would spend the monthly quota on chat replies.
      this.logger.error(`Bot reply failed (${e.type})`, err);
    }
  }

  private async buildReply(e: LineWebhookEvent, lineUserId: string) {
    const liffUrl = `https://liff.line.me/${this.cfg.getOrThrow<string>('LIFF_ID')}`;
    const member = await prisma.member.findUnique({
      where: { lineUserId },
      select: { id: true, customName: true, banned: true },
    });
    if (!member || member.customName === '') return notRegisteredMessage(liffUrl);
    if (member.banned) return text('บัญชีนี้ถูกระงับ ติดต่อ admin นะ');
    if (e.type === 'follow') return helpMessage(liffUrl);

    const intent = e.message?.type === 'text' ? resolveIntent(e.message.text) : 'HELP';
    if (intent === 'MY_DEBT') {
      return debtMessage(await this.bills.getMyOutstanding(member.id), liffUrl);
    }
    if (intent === 'EVENTS') {
      const upcoming = await this.events.listActive(member.id);
      return eventsMessage(
        upcoming.map((ev) => ({ ...ev, eventDate: new Date(ev.eventDate) })),
        liffUrl,
      );
    }
    return helpMessage(liffUrl);
  }
}
