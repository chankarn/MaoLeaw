// File: tests/e2e/src/helpers/db.ts
// Direct DB access for setup/cleanup. Imports the shared @maoleaw/db Prisma client.
import { prisma } from '@maoleaw/db';

const TEST_LINE_PREFIX = 'U_e2e_';

/** Generate a unique fake LINE userId for a test. */
export function makeLineUserId(suffix: string): string {
  return `${TEST_LINE_PREFIX}${suffix}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Generate a unique event name to avoid collisions. */
export function makeEventName(base: string): string {
  return `${base} ${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

/** Remove all members whose lineUserId starts with the e2e prefix + cascade. */
export async function cleanupE2EMembers(): Promise<number> {
  const members = await prisma.member.findMany({
    where: { lineUserId: { startsWith: TEST_LINE_PREFIX } },
    select: { id: true },
  });
  if (members.length === 0) return 0;
  const ids = members.map((m) => m.id);
  // Submissions + BillShares cascade via schema (onDelete: Cascade on member relation).
  await prisma.member.deleteMany({ where: { id: { in: ids } } });
  return members.length;
}

/** Remove a single Event (cascades to bill/items/shares/submissions). */
export async function deleteEventById(eventId: string): Promise<void> {
  // Hard-delete to actually free up unique constraints.
  await prisma.bill.deleteMany({ where: { eventId } });
  await prisma.submission.deleteMany({ where: { eventId } });
  await prisma.event.delete({ where: { id: eventId } }).catch(() => undefined);
}

/** Delete events whose name contains a tag (used by tests to scope cleanup). */
export async function deleteEventsByNameLike(tag: string): Promise<number> {
  const evs = await prisma.event.findMany({
    where: { name: { contains: tag } },
    select: { id: true },
  });
  for (const e of evs) await deleteEventById(e.id);
  return evs.length;
}

export { prisma };
