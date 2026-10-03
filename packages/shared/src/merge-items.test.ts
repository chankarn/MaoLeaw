import { describe, expect, it } from 'vitest';
import { mergeDuplicateItems, splitQuantity, type MergeableItem } from './merge-items';

function row(partial: Partial<MergeableItem> & Pick<MergeableItem, 'name' | 'price'>): MergeableItem {
  return { itemType: 'SHARED', extraMemberIds: [], customMemberIds: [], ...partial };
}

describe('splitQuantity', () => {
  it.each([
    ['ลีโอ ขวดใหญ่ x6', 'ลีโอ ขวดใหญ่', 6],
    ['ลีโอ  ขวดใหญ่ ×4 ', 'ลีโอ ขวดใหญ่', 4],
    ['Heineken*12', 'Heineken', 12],
    ['หมูกระทะ', 'หมูกระทะ', null],
    ['รีเจนซี่ 700 มล.', 'รีเจนซี่ 700 มล.', null],
  ])('%s', (name, base, qty) => {
    expect(splitQuantity(name)).toEqual({ base, qty });
  });
});

describe('mergeDuplicateItems', () => {
  it('merges same name + type across receipts, summing price and quantity', () => {
    const { items, merged } = mergeDuplicateItems([
      row({ name: 'ลีโอ ขวดใหญ่ x6', price: 540, itemType: 'BEER' }),
      row({ name: 'หมูกระทะ', price: 598 }),
      row({ name: 'ลีโอ ขวดใหญ่ x4', price: 360, itemType: 'BEER' }),
    ]);
    expect(merged).toBe(1);
    expect(items.map((i) => [i.name, i.price])).toEqual([
      ['ลีโอ ขวดใหญ่ x10', 900],
      ['หมูกระทะ', 598],
    ]);
  });

  it('counts a missing quantity as 1 when another row has one', () => {
    const { items } = mergeDuplicateItems([
      row({ name: 'โซดา x6', price: 120, itemType: 'MIXER' }),
      row({ name: 'โซดา', price: 20, itemType: 'MIXER' }),
    ]);
    expect(items[0]).toMatchObject({ name: 'โซดา x7', price: 140 });
  });

  it('keeps the plain name when no row has a quantity', () => {
    const { items } = mergeDuplicateItems([row({ name: 'ยำ', price: 120 }), row({ name: 'ยำ', price: 100 })]);
    expect(items).toEqual([row({ name: 'ยำ', price: 220 })]);
  });

  it('does not merge different types', () => {
    const { merged } = mergeDuplicateItems([
      row({ name: 'น้ำแข็ง', price: 30, itemType: 'SHARED' }),
      row({ name: 'น้ำแข็ง', price: 30, itemType: 'MIXER' }),
    ]);
    expect(merged).toBe(0);
  });

  it('does not merge when different people share the rows', () => {
    const { merged } = mergeDuplicateItems([
      row({ name: 'ลีโอ x6', price: 540, itemType: 'BEER', extraMemberIds: ['m1'] }),
      row({ name: 'ลีโอ x4', price: 360, itemType: 'BEER' }),
      row({ name: 'ไก่ทอด', price: 100, itemType: 'CUSTOM', customMemberIds: ['a', 'b'] }),
      row({ name: 'ไก่ทอด', price: 100, itemType: 'CUSTOM', customMemberIds: ['a'] }),
    ]);
    expect(merged).toBe(0);
  });

  it('treats member sets as unordered', () => {
    const { merged } = mergeDuplicateItems([
      row({ name: 'ไก่ทอด', price: 100, itemType: 'CUSTOM', customMemberIds: ['a', 'b'] }),
      row({ name: 'ไก่ทอด', price: 80, itemType: 'CUSTOM', customMemberIds: ['b', 'a'] }),
    ]);
    expect(merged).toBe(1);
  });

  it('leaves blank or unpriced rows alone', () => {
    const input = [row({ name: '', price: 50 }), row({ name: 'ยำ', price: '' }), row({ name: 'ยำ', price: '' })];
    expect(mergeDuplicateItems(input)).toEqual({ items: input, merged: 0 });
  });

  it('keeps extra fields from the first row (e.g. UI state)', () => {
    type UiRow = MergeableItem & { tempId: string };
    const { items } = mergeDuplicateItems<UiRow>([
      { ...row({ name: 'ยำ', price: 120 }), tempId: 'first' },
      { ...row({ name: 'ยำ', price: 100 }), tempId: 'second' },
    ]);
    expect(items[0]!.tempId).toBe('first');
  });
});
