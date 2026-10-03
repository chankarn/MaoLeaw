import { describe, expect, it } from 'vitest';
import { evaluateSlip, maskedMatches, type SlipData, type SlipExpectation } from './evaluate-slip';

const sent = new Date('2026-10-01T12:00:00+07:00');

function slip(partial: Partial<SlipData> = {}): SlipData {
  return {
    transRef: 'TX1',
    amount: 450,
    transferredAt: new Date('2026-10-02T21:30:00+07:00'),
    receiverBankCode: null,
    receiverAccount: null,
    receiverProxy: 'xxx-xxx-5678',
    ...partial,
  };
}

const promptpay: SlipExpectation = {
  amount: 450,
  notBefore: sent,
  payment: { type: 'PROMPTPAY', promptpayId: '0812345678' },
};

const bank: SlipExpectation = {
  amount: 450,
  notBefore: sent,
  payment: { type: 'BANK', bankCode: 'KBANK', accountNumber: '123-4-56789-0' },
};

describe('maskedMatches', () => {
  it('matches same-length masks position by position', () => {
    expect(maskedMatches('xxx-xxx-5678', '0812345678')).toBe(true);
    expect(maskedMatches('xxx-xxx-5679', '0812345678')).toBe(false);
  });

  it('matches visible digit runs when lengths differ', () => {
    expect(maskedMatches('XXX-X-X5678-X', '1234567890')).toBe(false); // run 5678 not in target
    expect(maskedMatches('xxx-x-x6789-x', '1234567890')).toBe(true);
  });

  it('needs at least 3 visible digits', () => {
    expect(maskedMatches('xxx-xxx-xx78', '0812345678')).toBe(false);
  });

  it('rejects missing input', () => {
    expect(maskedMatches(null, '0812345678')).toBe(false);
  });
});

describe('evaluateSlip — PromptPay', () => {
  it('passes when amount, date and proxy match', () => {
    expect(evaluateSlip(slip(), promptpay)).toEqual({ ok: true });
  });

  it('accepts overpayment and satang amounts', () => {
    expect(evaluateSlip(slip({ amount: 450.5 }), promptpay).ok).toBe(true);
  });

  it('flags underpayment', () => {
    const v = evaluateSlip(slip({ amount: 400 }), promptpay);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toMatch(/น้อยกว่า/);
  });

  it('flags a transfer older than the bill window', () => {
    expect(evaluateSlip(slip({ transferredAt: new Date('2026-09-01T00:00:00Z') }), promptpay).ok).toBe(false);
  });

  it('flags an unreadable transfer time', () => {
    expect(evaluateSlip(slip({ transferredAt: null }), promptpay).ok).toBe(false);
  });

  it('flags a different receiver', () => {
    expect(evaluateSlip(slip({ receiverProxy: 'xxx-xxx-9999' }), promptpay).ok).toBe(false);
  });

  it('accepts the international (66…) phone form', () => {
    expect(evaluateSlip(slip({ receiverProxy: 'xxxxxxx5678' }), promptpay).ok).toBe(true);
  });

  it('falls back to the receiver account field', () => {
    expect(evaluateSlip(slip({ receiverProxy: null, receiverAccount: 'xxx-xxx-5678' }), promptpay).ok).toBe(true);
  });
});

describe('evaluateSlip — bank transfer', () => {
  const bankSlip = slip({ receiverProxy: null, receiverBankCode: '004', receiverAccount: 'xxx-x-x6789-x' });

  it('passes when bank and account match', () => {
    expect(evaluateSlip(bankSlip, bank)).toEqual({ ok: true });
  });

  it('flags a different bank', () => {
    expect(evaluateSlip({ ...bankSlip, receiverBankCode: '014' }, bank).ok).toBe(false);
  });

  it('flags a different account', () => {
    expect(evaluateSlip({ ...bankSlip, receiverAccount: 'xxx-x-x1111-x' }, bank).ok).toBe(false);
  });
});
