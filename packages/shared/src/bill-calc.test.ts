// File: packages/shared/src/bill-calc.test.ts
import { describe, expect, it } from 'vitest';
import { calculateBill, sumItemPrices, type CalcAttendee, type CalcItem } from './bill-calc';

const attendees: CalcAttendee[] = [
  { memberId: 'm1', drinkChoice: 'LIQUOR', sharesMixer: false },
  { memberId: 'm2', drinkChoice: 'LIQUOR', sharesMixer: false },
  { memberId: 'm3', drinkChoice: 'BEER', sharesMixer: false },
  { memberId: 'm4', drinkChoice: 'NONE', sharesMixer: false },
];

describe('calculateBill', () => {
  it('splits SHARED items equally across all attendees', () => {
    const items: CalcItem[] = [{ id: 'i1', price: 400, itemType: 'SHARED' }];
    const { shares } = calculateBill(items, attendees);

    for (const s of shares) expect(s.sharedAmount).toBe(100);
  });

  it('NONE drinker pays only for SHARED items', () => {
    const items: CalcItem[] = [
      { id: 'i1', price: 400, itemType: 'SHARED' },
      { id: 'i2', price: 600, itemType: 'LIQUOR' },
      { id: 'i3', price: 200, itemType: 'BEER' },
    ];
    const { shares } = calculateBill(items, attendees);
    const none = shares.find((s) => s.memberId === 'm4');

    expect(none?.sharedAmount).toBe(100);
    expect(none?.drinkAmount).toBe(0);
    expect(none?.amount).toBe(100);
  });

  it('LIQUOR items split only among liquor drinkers', () => {
    const items: CalcItem[] = [{ id: 'i1', price: 600, itemType: 'LIQUOR' }];
    const { shares } = calculateBill(items, attendees);

    expect(shares.find((s) => s.memberId === 'm1')?.drinkAmount).toBe(300);
    expect(shares.find((s) => s.memberId === 'm2')?.drinkAmount).toBe(300);
    expect(shares.find((s) => s.memberId === 'm3')?.drinkAmount).toBe(0);
    expect(shares.find((s) => s.memberId === 'm4')?.drinkAmount).toBe(0);
  });

  it('BEER items split only among beer drinkers', () => {
    const items: CalcItem[] = [{ id: 'i1', price: 250, itemType: 'BEER' }];
    const { shares } = calculateBill(items, attendees);

    expect(shares.find((s) => s.memberId === 'm3')?.drinkAmount).toBe(250);
    expect(shares.find((s) => s.memberId === 'm1')?.drinkAmount).toBe(0);
  });

  it('rounds UP (ceil) — collector favored', () => {
    // 100 / 3 = 33.33 → ceil 34, each pays 34, total 102 (host gets 2 baht surplus)
    const three: CalcAttendee[] = [
      { memberId: 'a', drinkChoice: 'LIQUOR', sharesMixer: false },
      { memberId: 'b', drinkChoice: 'LIQUOR', sharesMixer: false },
      { memberId: 'c', drinkChoice: 'LIQUOR', sharesMixer: false },
    ];
    const items: CalcItem[] = [{ id: 'i1', price: 100, itemType: 'SHARED' }];
    const { shares, total } = calculateBill(items, three);

    for (const s of shares) expect(s.sharedAmount).toBe(34);
    expect(total).toBe(102);
  });

  it('emits NO_LIQUOR_DRINKERS warning and skips item', () => {
    const noLiquor: CalcAttendee[] = [
      { memberId: 'a', drinkChoice: 'BEER', sharesMixer: false },
      { memberId: 'b', drinkChoice: 'NONE', sharesMixer: false },
    ];
    const items: CalcItem[] = [
      { id: 'i1', price: 500, itemType: 'LIQUOR' },
      { id: 'i2', price: 100, itemType: 'SHARED' },
    ];
    const { shares, warnings, total } = calculateBill(items, noLiquor);

    expect(warnings).toContain('NO_LIQUOR_DRINKERS:i1');
    // Only shared item contributed: each pays ceil(100/2) = 50
    expect(total).toBe(100);
    for (const s of shares) expect(s.amount).toBe(50);
  });

  it('emits NO_ATTENDEES warning when attendee list empty', () => {
    const { shares, warnings, total } = calculateBill([{ id: 'i1', price: 100, itemType: 'SHARED' }], []);
    expect(shares).toEqual([]);
    expect(warnings).toContain('NO_ATTENDEES');
    expect(total).toBe(0);
  });

  it('throws on negative price', () => {
    expect(() =>
      calculateBill([{ id: 'i1', price: -5, itemType: 'SHARED' }], attendees),
    ).toThrow(/Invalid item price/);
  });

  it('throws on non-integer price', () => {
    expect(() =>
      calculateBill([{ id: 'i1', price: 100.5, itemType: 'SHARED' }], attendees),
    ).toThrow(/Invalid item price/);
  });

  it('ignores zero-price items without error', () => {
    const { shares, total } = calculateBill([{ id: 'i1', price: 0, itemType: 'SHARED' }], attendees);
    for (const s of shares) expect(s.amount).toBe(0);
    expect(total).toBe(0);
  });

  it('MIXER items split among alcohol drinkers + opted-in NONE drinkers', () => {
    // m1 (LIQUOR), m2 (LIQUOR), m3 (BEER) auto-eligible; m4 (NONE) is NOT eligible by default
    const items: CalcItem[] = [{ id: 'i1', price: 180, itemType: 'MIXER' }];
    const { shares } = calculateBill(items, attendees);

    // 3 eligible → ceil(180/3) = 60 each
    expect(shares.find((s) => s.memberId === 'm1')?.mixerAmount).toBe(60);
    expect(shares.find((s) => s.memberId === 'm2')?.mixerAmount).toBe(60);
    expect(shares.find((s) => s.memberId === 'm3')?.mixerAmount).toBe(60);
    expect(shares.find((s) => s.memberId === 'm4')?.mixerAmount).toBe(0);
  });

  it('MIXER includes NONE drinker when sharesMixer=true', () => {
    const withOptIn: CalcAttendee[] = [
      { memberId: 'm1', drinkChoice: 'LIQUOR', sharesMixer: false },
      { memberId: 'm2', drinkChoice: 'NONE', sharesMixer: true },
      { memberId: 'm3', drinkChoice: 'NONE', sharesMixer: false },
    ];
    const items: CalcItem[] = [{ id: 'i1', price: 120, itemType: 'MIXER' }];
    const { shares } = calculateBill(items, withOptIn);

    // 2 eligible (m1, m2) → ceil(120/2) = 60
    expect(shares.find((s) => s.memberId === 'm1')?.mixerAmount).toBe(60);
    expect(shares.find((s) => s.memberId === 'm2')?.mixerAmount).toBe(60);
    expect(shares.find((s) => s.memberId === 'm3')?.mixerAmount).toBe(0);
  });

  it('emits NO_MIXER_DRINKERS warning when all NONE and none opted in', () => {
    const noneOnly: CalcAttendee[] = [
      { memberId: 'a', drinkChoice: 'NONE', sharesMixer: false },
      { memberId: 'b', drinkChoice: 'NONE', sharesMixer: false },
    ];
    const items: CalcItem[] = [{ id: 'i1', price: 100, itemType: 'MIXER' }];
    const { warnings, total } = calculateBill(items, noneOnly);

    expect(warnings).toContain('NO_MIXER_DRINKERS:i1');
    expect(total).toBe(0);
  });

  it('full integration: shared + liquor + beer with realistic prices', () => {
    // 4 attendees: 2 liquor, 1 beer, 1 none
    // Items: food 1200 shared, whisky 700 liquor, beer 360 beer
    const items: CalcItem[] = [
      { id: 'food', price: 1200, itemType: 'SHARED' },
      { id: 'whisky', price: 700, itemType: 'LIQUOR' },
      { id: 'beer', price: 360, itemType: 'BEER' },
    ];
    const { shares, total } = calculateBill(items, attendees);

    // shared: ceil(1200/4) = 300 each
    // liquor: ceil(700/2) = 350 for m1, m2
    // beer:   ceil(360/1) = 360 for m3
    const m1 = shares.find((s) => s.memberId === 'm1')!;
    const m2 = shares.find((s) => s.memberId === 'm2')!;
    const m3 = shares.find((s) => s.memberId === 'm3')!;
    const m4 = shares.find((s) => s.memberId === 'm4')!;

    expect(m1.amount).toBe(650);
    expect(m2.amount).toBe(650);
    expect(m3.amount).toBe(660);
    expect(m4.amount).toBe(300);
    expect(total).toBe(2260);
  });
});

describe('sumItemPrices', () => {
  it('sums prices', () => {
    expect(
      sumItemPrices([
        { id: 'a', price: 100, itemType: 'SHARED' },
        { id: 'b', price: 50, itemType: 'BEER' },
      ]),
    ).toBe(150);
  });
});
