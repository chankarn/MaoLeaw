// Reads a transfer slip through SlipOK (bank-backed QR lookup).
// Never throws for verification problems — returns `unverified` so the claim falls
// back to admin review. Docs: https://slipok.com/api-documentation/
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { prisma } from '@maoleaw/db';
import type { SlipData } from './evaluate-slip';

export interface UploadedSlip {
  buffer: Buffer;
  mimetype: string;
  size: number;
}

export type VerifyOutcome =
  | { kind: 'verified'; slip: SlipData }
  | { kind: 'unverified'; reason: string };

interface SlipOkData {
  transRef?: string;
  transDate?: string; // YYYYMMDD
  transTime?: string; // HH:mm:ss
  transTimestamp?: string;
  amount?: number;
  receivingBank?: string;
  receiver?: {
    account?: { value?: string };
    proxy?: { type?: string; value?: string };
  };
}

interface SlipOkResponse {
  success?: boolean;
  code?: number;
  message?: string;
  data?: SlipOkData;
}

const SLIPOK_TIMEOUT_MS = 15_000;
const E2E_PREFIX = 'E2E-SLIP:';

@Injectable()
export class SlipVerifierService {
  private readonly logger = new Logger('SlipVerifierService');

  constructor(private readonly cfg: ConfigService) {}

  async verify(file: UploadedSlip): Promise<VerifyOutcome> {
    if (this.cfg.get<string>('E2E_TEST_MODE') === 'true') return this.verifyE2E(file);

    const apiKey = this.cfg.get<string>('SLIPOK_API_KEY');
    const branchId = this.cfg.get<string>('SLIPOK_BRANCH_ID');
    if (!apiKey || !branchId) {
      return { kind: 'unverified', reason: 'ยังไม่ได้เปิดระบบตรวจสลิปอัตโนมัติ' };
    }

    if (!(await this.reserveQuota())) {
      return { kind: 'unverified', reason: 'โควต้าตรวจสลิปอัตโนมัติของเดือนนี้หมดแล้ว' };
    }

    const form = new FormData();
    form.append('files', new Blob([new Uint8Array(file.buffer)], { type: file.mimetype }), 'slip');

    let body: SlipOkResponse | null;
    try {
      const res = await fetch(`https://api.slipok.com/api/line/apikey/${branchId}`, {
        method: 'POST',
        headers: { 'x-authorization': apiKey },
        body: form,
        signal: AbortSignal.timeout(SLIPOK_TIMEOUT_MS),
      });
      body = (await res.json().catch(() => null)) as SlipOkResponse | null;
      if (!res.ok || !body?.success || !body.data) {
        this.logger.warn(`SlipOK rejected slip: ${res.status} code=${body?.code} ${body?.message ?? ''}`);
        return {
          kind: 'unverified',
          reason: `อ่านสลิปอัตโนมัติไม่ได้${body?.message ? ` (${body.message})` : ''}`,
        };
      }
    } catch (err) {
      this.logger.error('SlipOK request failed', err);
      return { kind: 'unverified', reason: 'ระบบตรวจสลิปไม่ตอบสนอง' };
    }

    const d = body.data;
    if (!d.transRef || typeof d.amount !== 'number') {
      return { kind: 'unverified', reason: 'ข้อมูลจากสลิปไม่ครบ' };
    }
    return {
      kind: 'verified',
      slip: {
        transRef: d.transRef,
        amount: d.amount,
        transferredAt: parseTransferTime(d),
        receiverBankCode: d.receivingBank ?? null,
        receiverAccount: d.receiver?.account?.value ?? null,
        receiverProxy: d.receiver?.proxy?.value ?? null,
      },
    };
  }

  /**
   * Count one verification against SLIPOK_MONTHLY_LIMIT (Bangkok calendar month).
   * Atomic, so concurrent claims can't overshoot the free tier and incur fees.
   */
  private async reserveQuota(): Promise<boolean> {
    const limit = Number(this.cfg.get<string>('SLIPOK_MONTHLY_LIMIT') ?? 100);
    const month = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: '2-digit',
    }).format(new Date());

    await prisma.appConfig.upsert({
      where: { id: 'singleton' },
      update: {},
      create: { id: 'singleton' },
    });
    const rows = await prisma.$queryRaw<{ slipokUsageCount: number }[]>`
      UPDATE "AppConfig"
      SET "slipokUsageCount" = CASE WHEN "slipokUsageMonth" = ${month} THEN "slipokUsageCount" + 1 ELSE 1 END,
          "slipokUsageMonth" = ${month},
          "updatedAt" = now()
      WHERE "id" = 'singleton'
        AND ("slipokUsageMonth" IS DISTINCT FROM ${month} OR "slipokUsageCount" < ${limit})
      RETURNING "slipokUsageCount"`;
    return rows.length > 0;
  }

  /** E2E: the "image" is `E2E-SLIP:{json SlipData}`; anything else reads as unreadable. */
  private verifyE2E(file: UploadedSlip): VerifyOutcome {
    const text = file.buffer.toString('utf8');
    if (!text.startsWith(E2E_PREFIX)) return { kind: 'unverified', reason: 'อ่านสลิปอัตโนมัติไม่ได้' };
    const raw = JSON.parse(text.slice(E2E_PREFIX.length)) as Omit<SlipData, 'transferredAt'> & {
      transferredAt: string | null;
    };
    return {
      kind: 'verified',
      slip: { ...raw, transferredAt: raw.transferredAt ? new Date(raw.transferredAt) : null },
    };
  }
}

function parseTransferTime(d: SlipOkData): Date | null {
  if (d.transTimestamp) {
    const t = new Date(d.transTimestamp);
    if (!Number.isNaN(t.getTime())) return t;
  }
  const date = d.transDate?.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (!date || !d.transTime) return null;
  // Slip times are Bangkok local time.
  const t = new Date(`${date[1]}-${date[2]}-${date[3]}T${d.transTime}+07:00`);
  return Number.isNaN(t.getTime()) ? null : t;
}
