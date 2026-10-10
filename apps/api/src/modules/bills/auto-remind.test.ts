import { describe, expect, it } from 'vitest';
import {
  autoRemindCutoff,
  autoRemindDueAt,
  bangkokHour,
  inRemindWindow,
  quotaAllows,
  startOfBangkokDay,
} from './auto-remind';

const iso = (d: Date | null) => d?.toISOString();

describe('remind window (13:00–15:00 Asia/Bangkok)', () => {
  it.each([
    ['2026-10-10T05:59:00Z', 12, false],
    ['2026-10-10T06:00:00Z', 13, true],
    ['2026-10-10T07:59:00Z', 14, true],
    ['2026-10-10T08:00:00Z', 15, false],
    ['2026-10-10T18:00:00Z', 1, false],
  ])('%s → %i h', (at, hour, ok) => {
    const d = new Date(at);
    expect(bangkokHour(d)).toBe(hour);
    expect(inRemindWindow(d)).toBe(ok);
  });
});

describe('startOfBangkokDay', () => {
  it('uses the Bangkok date, not UTC', () => {
    // 2026-10-10 23:30 Bangkok = 16:30Z
    expect(iso(startOfBangkokDay(new Date('2026-10-10T16:30:00Z')))).toBe('2026-10-09T17:00:00.000Z');
    // 2026-10-11 00:30 Bangkok = 2026-10-10 17:30Z
    expect(iso(startOfBangkokDay(new Date('2026-10-10T17:30:00Z')))).toBe('2026-10-10T17:00:00.000Z');
  });
});

describe('due date = 13:00 Bangkok on sent-day + 3', () => {
  // Monday 2026-10-05, 20:00 Bangkok
  const sentAt = new Date('2026-10-05T13:00:00Z');

  it('autoRemindDueAt is Thursday 13:00 Bangkok', () => {
    expect(iso(autoRemindDueAt(sentAt, 3))).toBe('2026-10-08T06:00:00.000Z');
  });

  it('is not due on Wednesday, is due on Thursday', () => {
    const wed = new Date('2026-10-07T06:00:00Z');
    const thu = new Date('2026-10-08T06:00:00Z');
    expect(sentAt < autoRemindCutoff(wed, 3)).toBe(false);
    expect(sentAt < autoRemindCutoff(thu, 3)).toBe(true);
  });

  it('a bill sent just before Monday midnight is still a Monday bill', () => {
    const lateMon = new Date('2026-10-05T16:59:00Z'); // 23:59 Bangkok
    expect(iso(autoRemindDueAt(lateMon, 3))).toBe('2026-10-08T06:00:00.000Z');
    expect(lateMon < autoRemindCutoff(new Date('2026-10-08T06:00:00Z'), 3)).toBe(true);
  });

  it('is null when not sent or disabled', () => {
    expect(autoRemindDueAt(null, 3)).toBeNull();
    expect(autoRemindDueAt(sentAt, 0)).toBeNull();
  });
});

describe('quotaAllows', () => {
  it('needs enough messages left', () => {
    expect(quotaAllows({ limit: 300, used: 295 }, 5)).toBe(true);
    expect(quotaAllows({ limit: 300, used: 296 }, 5)).toBe(false);
  });
  it('unlimited plan always allows', () => {
    expect(quotaAllows({ limit: null, used: 10_000 }, 50)).toBe(true);
  });
});
