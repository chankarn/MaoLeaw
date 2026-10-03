// Maps a chat message to a bot command. Pure — keyword "contains" match, debt first.

export type Intent = 'MY_DEBT' | 'EVENTS' | 'HELP';

const DEBT_KEYWORDS = ['บิล', 'ค้าง', 'จ่าย', 'หนี้', 'โอน', 'bill', 'debt'];
const EVENT_KEYWORDS = ['งาน', 'อีเวนต์', 'อีเว้นท์', 'นัด', 'event'];

export function resolveIntent(text: string | null | undefined): Intent {
  const t = (text ?? '').trim().toLowerCase().replace(/\s+/g, '');
  if (!t) return 'HELP';
  if (DEBT_KEYWORDS.some((k) => t.includes(k))) return 'MY_DEBT';
  if (EVENT_KEYWORDS.some((k) => t.includes(k))) return 'EVENTS';
  return 'HELP';
}
