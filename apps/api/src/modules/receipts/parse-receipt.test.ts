import { describe, expect, it } from 'vitest';
import { parseReceipt } from './parse-receipt';

describe('parseReceipt', () => {
  it('keeps valid rows and rounds prices to integer baht', () => {
    const r = parseReceipt({
      readable: true,
      receiptTotal: 945.5,
      items: [
        { name: ' ลีโอ 6 ขวด ', price: 540, itemType: 'BEER', confident: true },
        { name: 'หมูกระทะ', price: 405.5, itemType: 'SHARED', confident: true },
      ],
    });
    expect(r.items).toEqual([
      { name: 'ลีโอ 6 ขวด', price: 540, itemType: 'BEER', confident: true },
      { name: 'หมูกระทะ', price: 406, itemType: 'SHARED', confident: true },
    ]);
    expect(r.receiptTotal).toBe(946);
    expect(r.warnings).toEqual([]);
  });

  it('maps unknown types to SHARED and marks them unsure', () => {
    const r = parseReceipt({ items: [{ name: 'เซ็ต A', price: 299, itemType: 'COMBO', confident: true }] });
    expect(r.items[0]).toMatchObject({ itemType: 'SHARED', confident: false });
  });

  it('respects the model saying it is unsure', () => {
    const r = parseReceipt({ items: [{ name: 'โปรเบียร์+ไก่', price: 350, itemType: 'BEER', confident: false }] });
    expect(r.items[0]?.confident).toBe(false);
  });

  it('drops zero and blank lines, and turns negatives into a discount warning', () => {
    const r = parseReceipt({
      receiptTotal: 400,
      items: [
        { name: 'ข้าวผัด', price: 500, itemType: 'SHARED' },
        { name: '', price: 50, itemType: 'SHARED' },
        { name: 'น้ำเปล่าฟรี', price: 0, itemType: 'SHARED' },
        { name: 'ส่วนลดสมาชิก', price: -100, itemType: 'SHARED' },
      ],
    });
    expect(r.items).toHaveLength(1);
    expect(r.warnings.join()).toMatch(/ส่วนลด ฿100/);
    expect(r.warnings.join()).not.toMatch(/ไม่ตรง/); // 500 - 100 = 400 matches the total
  });

  it('warns when the items do not add up to the printed total', () => {
    const r = parseReceipt({
      receiptTotal: 1000,
      items: [{ name: 'เหล้า', price: 600, itemType: 'LIQUOR' }],
    });
    expect(r.warnings.join()).toMatch(/ไม่ตรงกับยอดในใบเสร็จ/);
  });

  it('flags unreadable photos and empty results', () => {
    const r = parseReceipt({ readable: false, items: [] });
    expect(r.warnings).toHaveLength(2);
  });

  it('survives malformed model output', () => {
    expect(parseReceipt('not json').items).toEqual([]);
    expect(parseReceipt({ items: [{ name: 1 }] }).warnings[0]).toMatch(/อ่านไม่ได้/);
  });
});
