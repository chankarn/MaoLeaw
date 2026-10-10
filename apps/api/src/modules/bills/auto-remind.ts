// Timing rules for the automatic payment reminder (one per sent bill). Pure — see
// AutoRemindService for the loop that applies them.
//
// Reminders go out once a day at 13:00 Asia/Bangkok: a bill sent on day D (any time) is
// reminded at 13:00 on day D + AUTO_REMIND_DAYS. GitHub Actions wakes the API at 13:00;
// the window runs to 15:00 because scheduled workflows can start late.

const DAY_MS = 24 * 60 * 60 * 1000;
const BKK_OFFSET_MS = 7 * 60 * 60 * 1000;

/** Bangkok hours [from, to) in which reminders may go out. */
export const REMIND_WINDOW = { from: 13, to: 15 };

export function bangkokHour(now: Date): number {
  return (now.getUTCHours() + 7) % 24;
}

export function inRemindWindow(now: Date): boolean {
  const h = bangkokHour(now);
  return h >= REMIND_WINDOW.from && h < REMIND_WINDOW.to;
}

/** 00:00 Asia/Bangkok of the day containing `d`. */
export function startOfBangkokDay(d: Date): Date {
  const shifted = d.getTime() + BKK_OFFSET_MS;
  return new Date(shifted - (shifted % DAY_MS) - BKK_OFFSET_MS);
}

/** 13:00 Bangkok on sent-day + days; null when not sent or the feature is off (days = 0). */
export function autoRemindDueAt(sentAt: Date | null, days: number): Date | null {
  if (!sentAt || days <= 0) return null;
  return new Date(startOfBangkokDay(sentAt).getTime() + days * DAY_MS + REMIND_WINDOW.from * 60 * 60 * 1000);
}

/** Bills sent before this instant are due today (sent-day + days <= today, Bangkok dates). */
export function autoRemindCutoff(now: Date, days: number): Date {
  return new Date(startOfBangkokDay(now).getTime() - (days - 1) * DAY_MS);
}

/**
 * Whether the remaining LINE push quota covers `recipients` messages.
 * `limit` null = unlimited plan.
 */
export function quotaAllows(quota: { limit: number | null; used: number }, recipients: number): boolean {
  return quota.limit === null || quota.limit - quota.used >= recipients;
}
