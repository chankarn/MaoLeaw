// File: packages/shared/src/bill-calc.test.ts
import { describe, expect, it } from 'vitest';
import { calculateBill, sumItemPrices, type CalcAttendee, type CalcItem } from './bill-calc';

const attendees: CalcAttendee[] = [
  { memberId: 'm1', drinkChoice: 'LIQUOR' },
  { memberId: 'm2', drinkChoice: 'LIQUOR' },
  { memberId: 'm3', drinkChoice: 'BEER' },
  { memberId: 'm4', drinkChoice: 'NONE' },
];

// helper: spread defaults so tests stay readable
function item(partial: Partial<CalcItem> & Pick<CalcItem, 'id' | 'price' | 'itemType'>): CalcItem {
  return { extraMemberIds: [], ...partial };
}

describe('calculateBill', () => {
  it('splits SHARED items equally across all attendees', () => {
    const { shares } = calculateBill([item({ id: 'i1', price: 400, itemType: 'SHARED' })], attendees);
    for (const s of shares) expect(s.sharedAmount).toBe(100);
  });

  it('NONE drinker pays only for SHARED items by default', () => {
    const items: CalcItem[] = [
      item({ id: 'i1', price: 400, itemType: 'SHARED' }),
      item({ id: 'i2', price: 600, itemType: 'LIQUOR' }),
      item({ id: 'i3', price: 200, itemType: 'BEER' }),
    ];
    const { shares } = calculateBill(items, attendees);
    const none = shares.find((s) => s.memberId === 'm4');
    expect(none?.sharedAmount).toBe(100);
    expect(none?.drinkAmount).toBe(0);
    expect(none?.mixerAmount).toBe(0);
    expect(none?.amount).toBe(100);
  });

  it('LIQUOR items split only among liquor drinkers (default)', () => {
    const { shares } = calculateBill([item({ id: 'i1', price: 600, itemType: 'LIQUOR' })], attendees);
    expect(shares.find((s) => s.memberId === 'm1')?.drinkAmount).toBe(300);
    expect(shares.find((s) => s.memberId === 'm2')?.drinkAmount).toBe(300);
    expect(shares.find((s) => s.memberId === 'm3')?.drinkAmount).toBe(0);
    expect(shares.find((s) => s.memberId === 'm4')?.drinkAmount).toBe(0);
  });

  it('MIXER default = all alcohol drinkers (LIQUOR + BEER)', () => {
    // m1, m2 (LIQUOR) + m3 (BEER) = 3 eligible; m4 (NONE) excluded
    const { shares } = calculateBill([item({ id: 'i1', price: 180, itemType: 'MIXER' })], attendees);
    expect(shares.find((s) => s.memberId === 'm1')?.mixerAmount).toBe(60);
    expect(shares.find((s) => s.memberId === 'm2')?.mixerAmount).toBe(60);
    expect(shares.find((s) => s.memberId === 'm3')?.mixerAmount).toBe(60);
    expect(shares.find((s) => s.memberId === 'm4')?.mixerAmount).toBe(0);
  });

  it('extraMemberIds adds a NONE drinker to a MIXER item', () => {
    // Pull m4 (NONE) into the mixer split → 4 eligible
    const { shares } = calculateBill(
      [item({ id: 'i1', price: 200, itemType: 'MIXER', extraMemberIds: ['m4'] })],
      attendees,
    );
    expect(shares.find((s) => s.memberId === 'm4')?.mixerAmount).toBe(50);
    expect(shares.find((s) => s.memberId === 'm1')?.mixerAmount).toBe(50);
  });

  it('extraMemberIds can cross types — beer drinker added to a LIQUOR item', () => {
    // Default LIQUOR: m1, m2. Add m3 (BEER) → 3 eligible.
    const { shares } = calculateBill(
      [item({ id: 'i1', price: 300, itemType: 'LIQUOR', extraMemberIds: ['m3'] })],
      attendees,
    );
    expect(shares.find((s) => s.memberId === 'm3')?.drinkAmount).toBe(100);
    expect(shares.find((s) => s.memberId === 'm1')?.drinkAmount).toBe(100);
  });

  it('extraMemberIds is a UNION — duplicates ignored, base members not double-counted', () => {
    // m1 is already in LIQUOR default; adding to extras should not double their charge.
    const { shares } = calculateBill(
      [item({ id: 'i1', price: 200, itemType: 'LIQUOR', extraMemberIds: ['m1', 'm2'] })],
      attendees,
    );
    expect(shares.find((s) => s.memberId === 'm1')?.drinkAmount).toBe(100);
    expect(shares.find((s) => s.memberId === 'm2')?.drinkAmount).toBe(100);
  });

  it('SHARED items: extras have no extra effect (everyone already in)', () => {
    const { shares } = calculateBill(
      [item({ id: 'i1', price: 400, itemType: 'SHARED', extraMemberIds: ['m1'] })],
      attendees,
    );
    for (const s of shares) expect(s.sharedAmount).toBe(100);
  });

  it('rounds UP (ceil) — collector favored', () => {
    const three: CalcAttendee[] = [
      { memberId: 'a', drinkChoice: 'LIQUOR' },
      { memberId: 'b', drinkChoice: 'LIQUOR' },
      { memberId: 'c', drinkChoice: 'LIQUOR' },
    ];
    const { shares, total } = calculateBill([item({ id: 'i1', price: 100, itemType: 'SHARED' })], three);
    for (const s of shares) expect(s.sharedAmount).toBe(34);
    expect(total).toBe(102);
  });

  it('emits NO_ELIGIBLE_LIQUOR warning when no one qualifies and no extras', () => {
    const noLiquor: CalcAttendee[] = [
      { memberId: 'a', drinkChoice: 'BEER' },
      { memberId: 'b', drinkChoice: 'NONE' },
    ];
    const { warnings, total } = calculateBill(
      [item({ id: 'i1', price: 500, itemType: 'LIQUOR' }), item({ id: 'i2', price: 100, itemType: 'SHARED' })],
      noLiquor,
    );
    expect(warnings).toContain('NO_ELIGIBLE_LIQUOR:i1');
    expect(total).toBe(100);
  });

  it('extras can rescue an item that would otherwise have no eligible (e.g. no liquor drinkers)', () => {
    const noLiquor: CalcAttendee[] = [
      { memberId: 'a', drinkChoice: 'BEER' },
      { memberId: 'b', drinkChoice: 'NONE' },
    ];
    const { shares, warnings } = calculateBill(
      [item({ id: 'i1', price: 100, itemType: 'LIQUOR', extraMemberIds: ['a'] })],
      noLiquor,
    );
    expect(warnings).not.toContain('NO_ELIGIBLE_LIQUOR:i1');
    expect(shares.find((s) => s.memberId === 'a')?.drinkAmount).toBe(100);
  });

  it('emits NO_ATTENDEES when attendee list empty', () => {
    const { shares, warnings, total } = calculateBill(
      [item({ id: 'i1', price: 100, itemType: 'SHARED' })],
      [],
    );
    expect(shares).toEqual([]);
    expect(warnings).toContain('NO_ATTENDEES');
    expect(total).toBe(0);
  });

  it('throws on negative price', () => {
    expect(() => calculateBill([item({ id: 'i1', price: -5, itemType: 'SHARED' })], attendees)).toThrow(
      /Invalid item price/,
    );
  });

  it('throws on non-integer price', () => {
    expect(() => calculateBill([item({ id: 'i1', price: 100.5, itemType: 'SHARED' })], attendees)).toThrow(
      /Invalid item price/,
    );
  });

  it('ignores zero-price items', () => {
    const { shares, total } = calculateBill([item({ id: 'i1', price: 0, itemType: 'SHARED' })], attendees);
    for (const s of shares) expect(s.amount).toBe(0);
    expect(total).toBe(0);
  });

  it('full integration: shared + liquor + beer + mixer with realistic extras', () => {
    // 4 attendees: m1, m2 LIQUOR; m3 BEER; m4 NONE
    // Items:
    //   food 1200 SHARED                        → ceil(1200/4)=300 each
    //   whisky 700 LIQUOR                       → ceil(700/2)=350 for m1, m2
    //   beer 360 BEER                           → 360 for m3
    //   soda 180 MIXER + extras=[m4]            → m1,m2,m3,m4 each ceil(180/4)=45
    const items: CalcItem[] = [
      item({ id: 'food', price: 1200, itemType: 'SHARED' }),
      item({ id: 'whisky', price: 700, itemType: 'LIQUOR' }),
      item({ id: 'beer', price: 360, itemType: 'BEER' }),
      item({ id: 'soda', price: 180, itemType: 'MIXER', extraMemberIds: ['m4'] }),
    ];
    const { shares } = calculateBill(items, attendees);
    const m1 = shares.find((s) => s.memberId === 'm1')!;
    const m2 = shares.find((s) => s.memberId === 'm2')!;
    const m3 = shares.find((s) => s.memberId === 'm3')!;
    const m4 = shares.find((s) => s.memberId === 'm4')!;

    expect(m1.amount).toBe(300 + 350 + 45);
    expect(m2.amount).toBe(300 + 350 + 45);
    expect(m3.amount).toBe(300 + 360 + 45);
    expect(m4.amount).toBe(300 + 45);
  });
});

describe('sumItemPrices', () => {
  it('sums prices', () => {
    expect(
      sumItemPrices([
        { id: 'a', price: 100, itemType: 'SHARED', extraMemberIds: [] },
        { id: 'b', price: 50, itemType: 'BEER', extraMemberIds: [] },
      ]),
    ).toBe(150);
  });
});
