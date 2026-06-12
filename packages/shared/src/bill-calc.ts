// File: packages/shared/src/bill-calc.ts
// Canonical bill-splitting algorithm. Pure function — no IO, deterministic, easily testable.
//
// Rules (from PRD §3.3):
//   - Each item has an itemType (LIQUOR/BEER/MIXER/SHARED/CUSTOM):
//       SHARED → all attendees
//       LIQUOR → attendees with drinkChoice === 'LIQUOR'
//       BEER   → attendees with drinkChoice === 'BEER'
//       MIXER  → all alcohol drinkers (LIQUOR + BEER)
//       CUSTOM → exactly the members in `customMemberIds` (admin picks freely)
//   - For LIQUOR/BEER/MIXER/SHARED, `extraMemberIds` unions with the default set.
//   - For CUSTOM, `customMemberIds` IS the eligible set — no default, no extras.
//   - If the final eligible set is empty, the item is skipped and a warning is emitted.
//   - Per-person amount uses Math.ceil so any rounding surplus favors the collector.
//
// Money is stored as integer baht (no decimals). Inputs that violate this contract throw.

import type { BillItemType, DrinkChoice } from './types';

export interface CalcItem {
  id: string;
  price: number;
  itemType: BillItemType;
  extraMemberIds: string[];
  customMemberIds?: string[];
}

export interface CalcAttendee {
  memberId: string;
  drinkChoice: DrinkChoice;
}

export interface CalcShare {
  memberId: string;
  amount: number;
  sharedAmount: number;
  drinkAmount: number;
  mixerAmount: number;
}

export interface BillCalculation {
  shares: CalcShare[];
  warnings: string[];
  total: number;
}

/** Display bucket an item's cost is grouped under on the member's bill. */
export type ShareBucket = 'shared' | 'drink' | 'mixer';

export interface MemberItemLine {
  itemId: string;
  bucket: ShareBucket;
  /** This member's share of the item = ceil(price / eligibleCount). */
  amount: number;
}

/**
 * Resolve which attendees are eligible to pay for an item.
 * Single source of truth for eligibility — used by both calculateBill and
 * calculateMemberItemLines so per-item lines always reconcile to bucket totals.
 */
export function eligibleMembersForItem(item: CalcItem, attendees: CalcAttendee[]): CalcAttendee[] {
  function defaultEligible(type: Exclude<BillItemType, 'CUSTOM'>): CalcAttendee[] {
    switch (type) {
      case 'SHARED':
        return attendees;
      case 'LIQUOR':
        return attendees.filter((a) => a.drinkChoice === 'LIQUOR');
      case 'BEER':
        return attendees.filter((a) => a.drinkChoice === 'BEER');
      case 'MIXER':
        return attendees.filter((a) => a.drinkChoice !== 'NONE');
    }
  }

  if (item.itemType === 'CUSTOM') {
    // Admin-selected set: no default, no extras — customMemberIds IS the full eligible set.
    const customSet = new Set(item.customMemberIds ?? []);
    return attendees.filter((a) => customSet.has(a.memberId));
  }

  const extras = new Set(item.extraMemberIds ?? []);
  const base = defaultEligible(item.itemType);
  const baseIds = new Set(base.map((a) => a.memberId));
  // eligible = base ∪ (attendees whose id is in extras), base first.
  return [...base, ...attendees.filter((a) => extras.has(a.memberId) && !baseIds.has(a.memberId))];
}

/** Display bucket for an item type (SHARED/CUSTOM → food, LIQUOR/BEER → drink, MIXER → mixer). */
export function itemBucket(type: BillItemType): ShareBucket {
  if (type === 'SHARED' || type === 'CUSTOM') return 'shared';
  if (type === 'MIXER') return 'mixer';
  return 'drink'; // LIQUOR | BEER
}

/**
 * Compute per-attendee bill shares.
 */
export function calculateBill(items: CalcItem[], attendees: CalcAttendee[]): BillCalculation {
  const warnings: string[] = [];

  if (attendees.length === 0) {
    return { shares: [], warnings: ['NO_ATTENDEES'], total: 0 };
  }

  // Initialise share buckets per attendee.
  const shares = new Map<string, CalcShare>();
  for (const a of attendees) {
    if (shares.has(a.memberId)) {
      warnings.push(`DUPLICATE_ATTENDEE:${a.memberId}`);
      continue;
    }
    shares.set(a.memberId, {
      memberId: a.memberId,
      amount: 0,
      sharedAmount: 0,
      drinkAmount: 0,
      mixerAmount: 0,
    });
  }

  // Which share-bucket field to credit per type.
  const bucketField: Record<ShareBucket, keyof Pick<CalcShare, 'sharedAmount' | 'drinkAmount' | 'mixerAmount'>> =
    { shared: 'sharedAmount', drink: 'drinkAmount', mixer: 'mixerAmount' };

  for (const item of items) {
    if (!Number.isInteger(item.price) || item.price < 0) {
      throw new Error(`Invalid item price: ${item.price} (must be non-negative integer baht)`);
    }
    if (item.price === 0) continue;

    const eligible = eligibleMembersForItem(item, attendees);

    if (eligible.length === 0) {
      warnings.push(`NO_ELIGIBLE_${item.itemType}:${item.id}`);
      continue;
    }

    const per = Math.ceil(item.price / eligible.length);
    const key = bucketField[itemBucket(item.itemType)];
    for (const a of eligible) {
      const s = shares.get(a.memberId);
      if (s) s[key] += per;
    }
  }

  let total = 0;
  const result: CalcShare[] = [];
  for (const s of shares.values()) {
    s.amount = s.sharedAmount + s.drinkAmount + s.mixerAmount;
    total += s.amount;
    result.push(s);
  }

  return { shares: result, warnings, total };
}

/**
 * Per-item breakdown of one member's share — the line items behind their bucket totals.
 * Returns only items the member actually pays into; each `amount` is their slice of that
 * item. Lines reconcile exactly to the member's bucket totals from calculateBill because
 * both use the same eligibility + ceil-rounding rules.
 */
export function calculateMemberItemLines(
  items: CalcItem[],
  attendees: CalcAttendee[],
  memberId: string,
): MemberItemLine[] {
  const lines: MemberItemLine[] = [];
  for (const item of items) {
    if (!Number.isInteger(item.price) || item.price < 0) {
      throw new Error(`Invalid item price: ${item.price} (must be non-negative integer baht)`);
    }
    if (item.price === 0) continue;

    const eligible = eligibleMembersForItem(item, attendees);
    if (!eligible.some((a) => a.memberId === memberId)) continue;

    lines.push({
      itemId: item.id,
      bucket: itemBucket(item.itemType),
      amount: Math.ceil(item.price / eligible.length),
    });
  }
  return lines;
}

/**
 * Sum of raw item prices (the actual bill total, vs collected total which may exceed due to rounding).
 */
export function sumItemPrices(items: CalcItem[]): number {
  return items.reduce((sum, it) => sum + (it.price ?? 0), 0);
}
