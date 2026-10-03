// Turns the model's raw JSON into bill rows the admin can review. Pure — no IO.
// The model is never trusted blindly: shapes are validated, prices become integer baht,
// and anything odd becomes a Thai warning instead of a silent change.
import { z } from 'zod';

export type ReceiptItemType = 'LIQUOR' | 'BEER' | 'MIXER' | 'SHARED';

export interface ReceiptRow {
  name: string;
  /** Line total in integer baht. */
  price: number;
  itemType: ReceiptItemType;
  /** False when the model wasn't sure about the type — the UI highlights the row. */
  confident: boolean;
}

export interface ReceiptReadResult {
  items: ReceiptRow[];
  /** Total printed on the receipt, when the model could read it. */
  receiptTotal: number | null;
  warnings: string[];
}

const MAX_ITEMS = 60;
const MAX_NAME = 100;

const rawSchema = z.object({
  readable: z.boolean().optional(),
  receiptTotal: z.number().nullable().optional(),
  items: z
    .array(
      z.object({
        name: z.string(),
        price: z.number(),
        itemType: z.string(),
        confident: z.boolean().optional(),
      }),
    )
    .default([]),
});

const TYPES: readonly ReceiptItemType[] = ['LIQUOR', 'BEER', 'MIXER', 'SHARED'];

function baht(n: number) {
  return `฿${n.toLocaleString('th-TH')}`;
}

export function parseReceipt(raw: unknown): ReceiptReadResult {
  const parsed = rawSchema.safeParse(raw);
  if (!parsed.success) {
    return { items: [], receiptTotal: null, warnings: ['AI ตอบกลับมาในรูปแบบที่อ่านไม่ได้ ลองถ่ายใหม่'] };
  }
  const data = parsed.data;
  const warnings: string[] = [];

  if (data.readable === false) warnings.push('รูปไม่ชัด หรือไม่ใช่ใบเสร็จ — ตรวจรายการให้ดี');

  let discount = 0;
  const items: ReceiptRow[] = [];
  for (const it of data.items) {
    const name = it.name.trim().slice(0, MAX_NAME);
    if (!name || !Number.isFinite(it.price)) continue;
    const price = Math.round(it.price);
    if (price < 0) {
      // Bill items can't be negative — leave bill-level discounts to the admin.
      discount += -price;
      continue;
    }
    if (price === 0) continue;
    const known = (TYPES as readonly string[]).includes(it.itemType);
    items.push({
      name,
      price,
      itemType: known ? (it.itemType as ReceiptItemType) : 'SHARED',
      confident: known && it.confident !== false,
    });
  }

  if (items.length > MAX_ITEMS) {
    warnings.push(`รายการเยอะเกิน ${MAX_ITEMS} รายการ ตัดส่วนที่เหลือออก`);
    items.length = MAX_ITEMS;
  }
  if (discount > 0) {
    warnings.push(`มีส่วนลด ${baht(discount)} ในใบเสร็จ ระบบไม่ได้หักให้ — ปรับราคาเองนะ`);
  }

  const receiptTotal =
    typeof data.receiptTotal === 'number' && Number.isFinite(data.receiptTotal)
      ? Math.round(data.receiptTotal)
      : null;
  const sum = items.reduce((s, i) => s + i.price, 0);
  // Rounding each line can drift a baht or two; only flag real gaps.
  if (receiptTotal !== null && Math.abs(sum - discount - receiptTotal) > Math.max(2, items.length)) {
    warnings.push(`ยอดรวมรายการ ${baht(sum)} ไม่ตรงกับยอดในใบเสร็จ ${baht(receiptTotal)} — เช็คว่าอ่านครบไหม`);
  }
  if (items.length === 0) warnings.push('อ่านรายการจากรูปไม่ได้เลย ลองถ่ายให้ชัดขึ้น หรือกรอกเอง');

  return { items, receiptTotal, warnings };
}
