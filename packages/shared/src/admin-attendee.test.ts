import { describe, expect, it } from 'vitest';
import { adminAddAttendeeSchema, markShareSchema } from './schemas';

describe('adminAddAttendeeSchema', () => {
  const memberId = '7b0c6f7e-3f7a-4c55-9d0e-1a2b3c4d5e6f';

  it('accepts an existing member', () => {
    expect(adminAddAttendeeSchema.safeParse({ memberId, drinkChoice: 'BEER' }).success).toBe(true);
  });

  it('accepts a guest name (trimmed)', () => {
    const r = adminAddAttendeeSchema.safeParse({ guestName: '  เพื่อนต้น ', drinkChoice: 'NONE' });
    expect(r.success && r.data.guestName).toBe('เพื่อนต้น');
  });

  it('needs exactly one of memberId / guestName', () => {
    expect(adminAddAttendeeSchema.safeParse({ drinkChoice: 'BEER' }).success).toBe(false);
    expect(adminAddAttendeeSchema.safeParse({ memberId, guestName: 'x', drinkChoice: 'BEER' }).success).toBe(false);
    expect(adminAddAttendeeSchema.safeParse({ guestName: '   ', drinkChoice: 'BEER' }).success).toBe(false);
  });
});

describe('markShareSchema', () => {
  it('takes an optional payment method', () => {
    expect(markShareSchema.safeParse({ paymentStatus: 'PAID', paidVia: 'CASH' }).success).toBe(true);
    expect(markShareSchema.safeParse({ paymentStatus: 'PAID' }).success).toBe(true);
    expect(markShareSchema.safeParse({ paymentStatus: 'PAID', paidVia: 'CHEQUE' }).success).toBe(false);
  });
});
