import {
  Controller,
  Get,
  Headers,
  HttpCode,
  Logger,
  Post,
  Req,
  ServiceUnavailableException,
  UnauthorizedException,
  UseGuards,
  type RawBodyRequest,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SkipThrottle } from '@nestjs/throttler';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { LineService } from '../auth/line.service';
import { LineWebhookService, type LineWebhookEvent } from './line-webhook.service';
import { verifyLineSignature } from './signature';

/** Messaging API webhook — authenticated by LINE's signature, not a JWT. */
@Controller('/line/webhook')
@SkipThrottle() // LINE retries on its own; don't 429 the platform
export class LineWebhookController {
  private readonly logger = new Logger('LineWebhookController');

  constructor(
    private readonly cfg: ConfigService,
    private readonly bot: LineWebhookService,
  ) {}

  @Post()
  @HttpCode(200)
  receive(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-line-signature') signature: string | undefined,
  ) {
    const secret = this.cfg.get<string>('LINE_MESSAGING_SECRET');
    if (!secret) {
      this.logger.error('LINE_MESSAGING_SECRET is not set — rejecting webhook');
      throw new ServiceUnavailableException('Webhook not configured');
    }
    if (!req.rawBody || !verifyLineSignature(req.rawBody, signature, secret)) {
      throw new UnauthorizedException('Invalid signature');
    }

    // Acknowledge immediately (LINE's console "Verify" sends no events); replies go out
    // asynchronously with each event's own reply token.
    const events = ((req.body as { events?: LineWebhookEvent[] })?.events ?? []);
    void this.bot.handle(events);
  }
}

/** Admin: how much of this month's LINE push quota is left. */
@Controller('/admin/line')
@UseGuards(JwtAuthGuard)
@Roles('ADMIN')
export class AdminLineController {
  constructor(private readonly line: LineService) {}

  @Get('/quota')
  quota() {
    return this.line.getPushQuota();
  }
}
