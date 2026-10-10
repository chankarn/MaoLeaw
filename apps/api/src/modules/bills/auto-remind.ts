// Timing rules for the automatic payment reminder (one per sent bill). Pure — see
// AutoRemindService for the loop that applies them.

const DAY_MS = 24 * 60 * 60 * 1000;

/** Bangkok hours [from, to) in which reminders may go out — nobody wants a 1 a.m. nudge. */
export const REMIND_WINDOW = { from: 9, to: 21 };

export function bangkokHour(now: Date): number {
  return (now.getUTCHours() + 7) % 24;
}

export function inRemindWindow(now: Date): boolean {
  const h = bangkokHour(now);
  return h >= REMIND_WINDOW.from && h < REMIND_WINDOW.to;
}

/** When a bill sent at `sentAt` becomes due; null when the feature is off (days = 0). */
export function autoRemindDueAt(sentAt: Date | null, days: number): Date | null {
  if (!sentAt || days <= 0) return null;
  return new Date(sentAt.getTime() + days * DAY_MS);
}

/** Bills sent at or before this instant are due now. */
export function autoRemindCutoff(now: Date, days: number): Date {
  return new Date(now.getTime() - days * DAY_MS);
}

/**
 * Whether the remaining LINE push quota covers `recipients` messages.
 * `limit` null = unlimited plan.
 */
export function quotaAllows(quota: { limit: number | null; used: number }, recipients: number): boolean {
  return quota.limit === null || quota.limit - quota.used >= recipients;
}
