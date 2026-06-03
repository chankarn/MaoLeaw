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

  // Default eligible set per item type (not used for CUSTOM).
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

  // Which bucket to credit per type.
  function bucketKey(type: BillItemType): keyof Pick<CalcShare, 'sharedAmount' | 'drinkAmount' | 'mixerAmount'> {
    if (type === 'SHARED' || type === 'CUSTOM') return 'sharedAmount';
    if (type === 'MIXER') return 'mixerAmount';
    return 'drinkAmount'; // LIQUOR | BEER
  }

  for (const item of items) {
    if (!Number.isInteger(item.price) || item.price < 0) {
      throw new Error(`Invalid item price: ${item.price} (must be non-negative integer baht)`);
    }
    if (item.price === 0) continue;

    let eligible: CalcAttendee[];

    if (item.itemType === 'CUSTOM') {
      // Admin-selected set: no default, no extras — customMemberIds IS the full eligible set.
      const customSet = new Set(item.customMemberIds ?? []);
      eligible = attendees.filter((a) => customSet.has(a.memberId));
    } else {
      const extras = new Set(item.extraMemberIds ?? []);
      const base = defaultEligible(item.itemType);
      const baseIds = new Set(base.map((a) => a.memberId));
      // eligible = base ∪ (attendees whose id is in extras), base first.
      eligible = [
        ...base,
        ...attendees.filter((a) => extras.has(a.memberId) && !baseIds.has(a.memberId)),
      ];
    }

    if (eligible.length === 0) {
      warnings.push(`NO_ELIGIBLE_${item.itemType}:${item.id}`);
      continue;
    }

    const per = Math.ceil(item.price / eligible.length);
    const key = bucketKey(item.itemType);
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
 * Sum of raw item prices (the actual bill total, vs collected total which may exceed due to rounding).
 */
export function sumItemPrices(items: CalcItem[]): number {
  return items.reduce((sum, it) => sum + (it.price ?? 0), 0);
}
