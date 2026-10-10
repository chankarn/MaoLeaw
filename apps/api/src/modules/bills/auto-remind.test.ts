import { describe, expect, it } from 'vitest';
import { autoRemindCutoff, autoRemindDueAt, bangkokHour, inRemindWindow, quotaAllows } from './auto-remind';

describe('remind window (Asia/Bangkok)', () => {
  it.each([
    ['2026-10-10T01:59:00Z', 8, false],
    ['2026-10-10T02:00:00Z', 9, true],
    ['2026-10-10T12:30:00Z', 19, true],
    ['2026-10-10T13:59:00Z', 20, true],
    ['2026-10-10T14:00:00Z', 21, false],
    ['2026-10-10T18:00:00Z', 1, false],
  ])('%s → %i h', (iso, hour, ok) => {
    const d = new Date(iso);
    expect(bangkokHour(d)).toBe(hour);
    expect(inRemindWindow(d)).toBe(ok);
  });
});

describe('autoRemindDueAt', () => {
  it('is sentAt + days', () => {
    expect(autoRemindDueAt(new Date('2026-10-01T12:00:00Z'), 3)?.toISOString()).toBe('2026-10-04T12:00:00.000Z');
  });
  it('is null when not sent or disabled', () => {
    expect(autoRemindDueAt(null, 3)).toBeNull();
    expect(autoRemindDueAt(new Date(), 0)).toBeNull();
  });
  it('agrees with the cutoff used by the query', () => {
    const sentAt = new Date('2026-10-01T12:00:00Z');
    const due = autoRemindDueAt(sentAt, 3)!;
    expect(sentAt <= autoRemindCutoff(due, 3)).toBe(true);
    expect(sentAt <= autoRemindCutoff(new Date(due.getTime() - 1), 3)).toBe(false);
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
