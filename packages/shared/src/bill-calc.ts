// File: packages/shared/src/bill-calc.ts
// Canonical bill-splitting algorithm. Pure function — no IO, deterministic, easily testable.
//
// Rules (from PRD §3.3):
//   - SHARED items   → split across ALL attendees.
//   - LIQUOR items   → split across attendees with drinkChoice === 'LIQUOR'.
//   - BEER items     → split across attendees with drinkChoice === 'BEER'.
//   - 'NONE' drinkers pay ONLY for SHARED items.
//   - If no eligible drinkers exist for a drink-typed item, it is skipped and a warning is emitted
//     (the host absorbs the cost — admin decides whether to fold this back into shared).
//   - Per-person amount uses Math.ceil so any rounding surplus favors the collector.
//
// Money is stored as integer baht (no decimals). Inputs that violate this contract throw.

import type { BillItemType, DrinkChoice } from './types';

export interface CalcItem {
  id: string;
  price: number;
  itemType: BillItemType;
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
    shares.set(a.memberId, { memberId: a.memberId, amount: 0, sharedAmount: 0, drinkAmount: 0 });
  }

  const liquorEligible = attendees.filter((a) => a.drinkChoice === 'LIQUOR');
  const beerEligible = attendees.filter((a) => a.drinkChoice === 'BEER');

  for (const item of items) {
    if (!Number.isInteger(item.price) || item.price < 0) {
      throw new Error(`Invalid item price: ${item.price} (must be non-negative integer baht)`);
    }
    if (item.price === 0) continue;

    if (item.itemType === 'SHARED') {
      const per = Math.ceil(item.price / attendees.length);
      for (const a of attendees) {
        const s = shares.get(a.memberId);
        if (s) s.sharedAmount += per;
      }
    } else if (item.itemType === 'LIQUOR') {
      if (liquorEligible.length === 0) {
        warnings.push(`NO_LIQUOR_DRINKERS:${item.id}`);
        continue;
      }
      const per = Math.ceil(item.price / liquorEligible.length);
      for (const a of liquorEligible) {
        const s = shares.get(a.memberId);
        if (s) s.drinkAmount += per;
      }
    } else if (item.itemType === 'BEER') {
      if (beerEligible.length === 0) {
        warnings.push(`NO_BEER_DRINKERS:${item.id}`);
        continue;
      }
      const per = Math.ceil(item.price / beerEligible.length);
      for (const a of beerEligible) {
        const s = shares.get(a.memberId);
        if (s) s.drinkAmount += per;
      }
    }
  }

  let total = 0;
  const result: CalcShare[] = [];
  for (const s of shares.values()) {
    s.amount = s.sharedAmount + s.drinkAmount;
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
