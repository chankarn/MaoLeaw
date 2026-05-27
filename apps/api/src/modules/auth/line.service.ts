// File: apps/api/src/modules/auth/line.service.ts
// LINE OAuth idToken verification.
// Docs: https://developers.line.biz/en/reference/line-login/#verify-id-token
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface LineProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
}

interface LineVerifyResponse {
  iss?: string;
  sub?: string;
  aud?: string;
  exp?: number;
  iat?: number;
  name?: string;
  picture?: string;
  email?: string;
  error?: string;
  error_description?: string;
}

@Injectable()
export class LineService {
  private readonly logger = new Logger('LineService');

  constructor(private readonly cfg: ConfigService) {}

  async verifyIdToken(idToken: string): Promise<LineProfile> {
    // E2E test bypass — only when E2E_TEST_MODE=true (never enable in production).
    // Format: idToken = "e2e:<lineUserId>:<displayName>" — displayName optional, use _ for spaces.
    if (this.cfg.get<string>('E2E_TEST_MODE') === 'true' && idToken.startsWith('e2e:')) {
      const [, userId, rawName] = idToken.split(':');
      if (!userId) throw new UnauthorizedException('E2E bypass requires userId');
      this.logger.warn(`E2E bypass used for userId=${userId}`);
      return {
        userId,
        displayName: (rawName ?? `Test ${userId.slice(-4)}`).replace(/_/g, ' '),
        pictureUrl: undefined,
      };
    }

    const channelId = this.cfg.getOrThrow<string>('LINE_CHANNEL_ID');

    const body = new URLSearchParams();
    body.set('id_token', idToken);
    body.set('client_id', channelId);

    let res: Response;
    try {
      res = await fetch('https://api.line.me/oauth2/v2.1/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
    } catch (err) {
      this.logger.error('LINE verify network error', err);
      throw new UnauthorizedException('LINE verification failed');
    }

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as LineVerifyResponse;
      this.logger.warn(`LINE verify rejected: ${data.error ?? res.status} ${data.error_description ?? ''}`);
      throw new UnauthorizedException(data.error_description ?? 'Invalid LINE idToken');
    }

    const data = (await res.json()) as LineVerifyResponse;
    if (!data.sub) throw new UnauthorizedException('Invalid LINE idToken (missing sub)');
    if (data.aud !== channelId) throw new UnauthorizedException('Invalid LINE idToken (aud mismatch)');

    return {
      userId: data.sub,
      displayName: data.name ?? 'LINE User',
      pictureUrl: data.picture,
    };
  }

  async sendPushFlex(to: string, altText: string, contents: unknown): Promise<void> {
    // E2E bypass — swallow LINE Push API calls in test mode.
    if (this.cfg.get<string>('E2E_TEST_MODE') === 'true') {
      this.logger.warn(`E2E bypass: skipping LINE push to ${to} (${altText})`);
      void contents;
      return;
    }
    const token = this.cfg.getOrThrow<string>('LINE_MESSAGING_TOKEN');
    const res = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        to,
        messages: [{ type: 'flex', altText, contents }],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`LINE push failed: ${res.status} ${body}`);
    }
  }
}
