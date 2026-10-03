// Decides whether a verified slip settles a share automatically. Pure — no IO.
// Anything we can't confirm returns ok:false with a Thai reason, so a human reviews it.
import type { BankCode } from '@maoleaw/shared';

/** Slip details as returned by the bank-backed verifier (SlipOK). */
export interface SlipData {
  transRef: string;
  /** Baht; may carry satang decimals. */
  amount: number;
  transferredAt: Date | null;
  /** Receiving bank, Thai interbank numeric code (e.g. '004' = KBANK). */
  receiverBankCode: string | null;
  /** Masked receiver account, e.g. 'xxx-x-x5678-x'. */
  receiverAccount: string | null;
  /** Masked receiver PromptPay proxy, e.g. 'xxx-xxx-5678'. */
  receiverProxy: string | null;
}

export type ExpectedPayment =
  | { type: 'PROMPTPAY'; promptpayId: string }
  | { type: 'BANK'; bankCode: BankCode; accountNumber: string };

export interface SlipExpectation {
  /** Share amount in baht. */
  amount: number;
  /** Transfers earlier than this can't be for this bill. */
  notBefore: Date;
  payment: ExpectedPayment;
}

export type SlipVerdict = { ok: true } | { ok: false; reason: string };

export const BANK_NUMERIC_CODES: Record<BankCode, string> = {
  BBL: '002',
  KBANK: '004',
  KTB: '006',
  TTB: '011',
  SCB: '014',
  CIMB: '022',
  UOB: '024',
  BAY: '025',
  GSB: '030',
  GHB: '033',
  BAAC: '034',
  TISCO: '067',
  KKP: '069',
  LHB: '073',
};

const MIN_VISIBLE_DIGITS = 3;

/**
 * Does a masked identifier (slip shows only some digits) fit the expected one?
 * Same-length masks are compared position by position; otherwise every visible
 * digit run must appear in the target. Needs at least 3 visible digits to count.
 */
export function maskedMatches(masked: string | null, target: string): boolean {
  if (!masked) return false;
  const t = target.replace(/\D/g, '');
  const m = masked.toLowerCase().replace(/[^0-9x]/g, '');
  const visible = m.replace(/x/g, '').length;
  if (visible < MIN_VISIBLE_DIGITS || t.length === 0) return false;
  if (m.length === t.length) {
    return [...m].every((c, i) => c === 'x' || c === t[i]);
  }
  const runs = masked.match(/\d+/g) ?? [];
  return runs.every((r) => t.includes(r));
}

/** PromptPay phone IDs may appear in local (0812…) or international (66812…) form. */
function promptpayVariants(id: string): string[] {
  const digits = id.replace(/\D/g, '');
  if (digits.length === 10 && digits.startsWith('0')) return [digits, `66${digits.slice(1)}`];
  return [digits];
}

function formatBaht(n: number) {
  return `฿${n.toLocaleString('th-TH')}`;
}

export function evaluateSlip(slip: SlipData, exp: SlipExpectation): SlipVerdict {
  // Allow overpaying; a tiny epsilon absorbs float noise on satang amounts.
  if (slip.amount + 1e-9 < exp.amount) {
    return {
      ok: false,
      reason: `ยอดในสลิป ${formatBaht(slip.amount)} น้อยกว่ายอดที่ต้องจ่าย ${formatBaht(exp.amount)}`,
    };
  }

  if (!slip.transferredAt) return { ok: false, reason: 'อ่านเวลาโอนจากสลิปไม่ได้' };
  if (slip.transferredAt < exp.notBefore) {
    return { ok: false, reason: 'สลิปโอนก่อนวันงาน — อาจไม่ใช่สลิปของบิลนี้' };
  }

  if (exp.payment.type === 'BANK') {
    const expectedBank = BANK_NUMERIC_CODES[exp.payment.bankCode];
    if (slip.receiverBankCode && slip.receiverBankCode !== expectedBank) {
      return { ok: false, reason: 'ธนาคารผู้รับในสลิปไม่ตรงกับบัญชีของบิล' };
    }
    if (!maskedMatches(slip.receiverAccount, exp.payment.accountNumber)) {
      return { ok: false, reason: 'เลขบัญชีผู้รับในสลิปไม่ตรง (หรืออ่านไม่ได้)' };
    }
    return { ok: true };
  }

  const ids = promptpayVariants(exp.payment.promptpayId);
  const receiverOk = ids.some(
    (id) => maskedMatches(slip.receiverProxy, id) || maskedMatches(slip.receiverAccount, id),
  );
  if (!receiverOk) return { ok: false, reason: 'PromptPay ผู้รับในสลิปไม่ตรง (หรืออ่านไม่ได้)' };
  return { ok: true };
}
