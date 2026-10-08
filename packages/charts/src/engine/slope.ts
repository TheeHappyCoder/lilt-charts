import { extent } from 'd3-array';
import { normalizeRanking } from './ranking';

/** One category measured at two points, with its change between them. */
export interface SlopeRow {
  id: string;
  label: string;
  from: number | null;
  to: number | null;
  /** `to − from`, or null when either end is missing. */
  change: number | null;
  /**
   * Fractional change against a positive starting value, e.g. 0.12 for +12%. Null when either
   * end is missing or the start is zero or negative, where a percentage has no honest meaning.
   */
  ratio: number | null;
}

/** `change` puts the largest gain first, `to` the largest end value, `input` keeps your order. */
export type SlopeOrder = 'change' | 'to' | 'input';

const numeric = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'number' || !Number.isFinite(value))
    throw new Error('Invalid value: expected a finite number or null.');
  return value;
};

/** The change between two measurements under the positive-baseline percentage policy. */
export function changeBetween(from: number | null, to: number | null) {
  if (from === null || to === null) return { change: null, ratio: null };
  const change = to - from;
  return { change, ratio: from > 0 ? change / from : null };
}

export function slopeRows<Row>(
  data: readonly Row[],
  category: string,
  from: string,
  to: string,
  order: SlopeOrder = 'change',
): SlopeRow[] {
  const read = (row: Row, key: string) => (row as Record<string, unknown>)[key];
  const rows = normalizeRanking(
    data,
    {
      id: (row) => String(read(row, category) ?? ''),
      label: (row) => String(read(row, category) ?? ''),
    },
    () => 0,
  ).map(({ id, label, datum }): SlopeRow => {
    let start: number | null;
    let end: number | null;
    try {
      start = numeric(read(datum, from));
      end = numeric(read(datum, to));
    } catch {
      throw new Error(`Invalid value for category "${id}": expected a finite number or null.`);
    }
    return { id, label, from: start, to: end, ...changeBetween(start, end) };
  });
  if (order === 'input') return rows;
  const key = (row: SlopeRow) => (order === 'change' ? row.change : row.to);
  return rows.sort((a, b) => {
    const left = key(a);
    const right = key(b);
    if (left === null || right === null) return left === right ? 0 : left === null ? 1 : -1;
    return right - left;
  });
}

/**
 * One number for each end: the `sum` (default) or `mean` of the categories. `to` covers every
 * observed later value; the change compares only categories measured at both ends, so a category
 * that is new or has not reported yet never reads as growth or loss.
 */
export function slopeTotals(rows: readonly SlopeRow[], aggregate: 'sum' | 'mean' = 'sum') {
  let to = 0;
  let observed = 0;
  let pairedFrom = 0;
  let pairedTo = 0;
  let paired = 0;
  for (const row of rows) {
    if (row.to !== null) {
      to += row.to;
      observed += 1;
    }
    if (row.from !== null && row.to !== null) {
      pairedFrom += row.from;
      pairedTo += row.to;
      paired += 1;
    }
  }
  const mean = aggregate === 'mean';
  return {
    to: observed ? (mean ? to / observed : to) : null,
    ...(paired
      ? changeBetween(mean ? pairedFrom / paired : pairedFrom, mean ? pairedTo / paired : pairedTo)
      : { change: null, ratio: null }),
  };
}

/** A value domain around both ends with a little headroom, so no dot touches an edge. */
export function slopeDomain(rows: readonly SlopeRow[]): readonly [number, number] {
  const values = rows.flatMap((row) => [row.from, row.to].filter((value) => value !== null));
  if (!values.length) return [0, 1];
  const [min, max] = extent(values) as [number, number];
  if (min === max) {
    const pad = Math.max(Math.abs(min) * 0.1, 1);
    return [min - pad, max + pad];
  }
  const pad = (max - min) * 0.06;
  return [min - pad, max + pad];
}

/**
 * Move label positions apart until neighbours are at least `gap` apart, staying within
 * [min, max] and as close to their targets as possible. Returns positions in input order.
 */
export function spreadLabels(
  targets: readonly number[],
  gap: number,
  min: number,
  max: number,
): number[] {
  const order = targets.map((target, index) => ({ target, index }));
  order.sort((a, b) => a.target - b.target || a.index - b.index);
  const placed = order.map((item) => Math.min(max, Math.max(min, item.target)));
  // Push down past each predecessor, then back up from the bottom edge if the stack overflows.
  for (let index = 1; index < placed.length; index += 1)
    placed[index] = Math.max(placed[index]!, placed[index - 1]! + gap);
  const overflow = placed.length ? placed.at(-1)! - max : 0;
  if (overflow > 0) {
    placed[placed.length - 1] = max;
    for (let index = placed.length - 2; index >= 0; index -= 1)
      placed[index] = Math.min(placed[index]!, placed[index + 1]! - gap);
  }
  // Clusters that were pushed down drift back up to centre on their targets.
  let start = 0;
  while (start < placed.length) {
    let end = start;
    while (end + 1 < placed.length && placed[end + 1]! - placed[end]! <= gap + 1e-6) end += 1;
    const shift =
      order.slice(start, end + 1).reduce((sum, item, offset) => {
        return sum + (item.target - placed[start + offset]!);
      }, 0) /
      (end - start + 1);
    const lowest = start === 0 ? min : placed[start - 1]! + gap;
    const highest = end === placed.length - 1 ? max : placed[end + 1]! - gap;
    const clamped = Math.max(lowest - placed[start]!, Math.min(highest - placed[end]!, shift));
    for (let index = start; index <= end; index += 1) placed[index]! += clamped;
    start = end + 1;
  }
  const result = new Array<number>(targets.length);
  order.forEach((item, position) => {
    result[item.index] = placed[position]!;
  });
  return result;
}
