// Merge duplicate bill rows (e.g. the same beer read off two receipts) into one.
// Pure — used by the admin bill form's "รวมรายการซ้ำ" button.
//
// Rows merge only when nothing about who pays would change: same name (ignoring a
// trailing quantity like "x6"), same itemType, and the same extra/custom member sets.

import type { BillItemType } from './types';

export interface MergeableItem {
  name: string;
  price: number | '';
  itemType: BillItemType;
  extraMemberIds: string[];
  customMemberIds: string[];
}

const QTY_SUFFIX = /\s*[x×*]\s*(\d+)\s*$/i;

/** "ลีโอ ขวดใหญ่ x6" → { base: "ลีโอ ขวดใหญ่", qty: 6 }; no suffix → qty null. */
export function splitQuantity(name: string): { base: string; qty: number | null } {
  const trimmed = name.trim().replace(/\s+/g, ' ');
  const m = trimmed.match(QTY_SUFFIX);
  if (!m) return { base: trimmed, qty: null };
  return { base: trimmed.slice(0, m.index).trim(), qty: Number(m[1]) };
}

function mergeKey(item: MergeableItem): string | null {
  if (!item.name.trim() || typeof item.price !== 'number') return null;
  const ids = (xs: string[]) => [...xs].sort().join(',');
  return [
    splitQuantity(item.name).base.toLowerCase(),
    item.itemType,
    ids(item.extraMemberIds),
    ids(item.customMemberIds),
  ].join('|');
}

/**
 * Returns the merged list (first occurrence keeps its position) and how many rows were
 * folded into others. Prices add up; quantities add up when any row states one (rows
 * without a quantity count as 1). Extra fields of the first row are kept.
 */
export function mergeDuplicateItems<T extends MergeableItem>(items: T[]): { items: T[]; merged: number } {
  const groups = new Map<string, T[]>();
  for (const it of items) {
    const key = mergeKey(it);
    if (key) groups.set(key, [...(groups.get(key) ?? []), it]);
  }

  let merged = 0;
  const out: T[] = [];
  const done = new Set<string>();
  for (const it of items) {
    const key = mergeKey(it);
    if (!key) {
      out.push(it);
      continue;
    }
    if (done.has(key)) continue;
    done.add(key);
    const group = groups.get(key)!;
    if (group.length === 1) {
      out.push(it);
      continue;
    }
    merged += group.length - 1;
    const parts = group.map((g) => splitQuantity(g.name));
    const anyQty = parts.some((p) => p.qty !== null);
    const totalQty = parts.reduce((s, p) => s + (p.qty ?? 1), 0);
    out.push({
      ...it,
      name: anyQty ? `${parts[0]!.base} x${totalQty}` : parts[0]!.base,
      price: group.reduce((s, g) => s + (g.price as number), 0),
    });
  }
  return { items: out, merged };
}
