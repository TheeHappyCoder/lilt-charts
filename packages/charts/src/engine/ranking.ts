import type { RankingOrder } from '../types';

export interface RankingCategory<T> {
  id: (row: T) => string;
  label: (row: T) => string;
}

export interface RankingRow<T> {
  id: string;
  label: string;
  datum: T;
  value: number | null;
}

export function normalizeRanking<T>(
  data: readonly T[],
  category: RankingCategory<T>,
  accessor: (row: T) => number | null,
): RankingRow<T>[] {
  const ids = new Set<string>();
  return data.map((datum, index) => {
    const id = category.id(datum);
    const label = category.label(datum);
    const value = accessor(datum);
    if (typeof id !== 'string' || !id.trim())
      throw new Error(`Invalid category at row ${index + 1}: a non-empty string ID is required.`);
    if (ids.has(id)) throw new Error(`Duplicate category ID "${id}".`);
    if (typeof label !== 'string' || !label.trim())
      throw new Error(`Invalid label for category "${id}".`);
    if (value !== null && (typeof value !== 'number' || !Number.isFinite(value)))
      throw new Error(`Invalid value for category "${id}": expected a finite number or null.`);
    ids.add(id);
    return { id, label, datum, value };
  });
}

export function orderRanking<T>(
  rows: readonly RankingRow<T>[],
  order: RankingOrder,
): RankingRow<T>[] {
  if (order === 'input') return [...rows];
  return [...rows].sort((a, b) => {
    if (a.value === null && b.value !== null) return 1;
    if (b.value === null && a.value !== null) return -1;
    const difference = (a.value ?? 0) - (b.value ?? 0);
    // Stable identity breaks ties independently of incoming row order.
    return difference
      ? difference * (order === 'descending' ? -1 : 1)
      : a.id < b.id
        ? -1
        : a.id > b.id
          ? 1
          : 0;
  });
}

export function rankingDomain<T>(rows: readonly RankingRow<T>[]): readonly [number, number] {
  let min = 0;
  let max = 0;
  for (const row of rows) {
    if (row.value === null) continue;
    min = Math.min(min, row.value);
    max = Math.max(max, row.value);
  }
  return min === max ? [0, 1] : [min, max];
}

/** Relative geometry leaves layout and resizing to the host's available width. */
export function rankingBar(value: number | null, domain: readonly [number, number]) {
  const scale = (number: number) => ((number - domain[0]) / (domain[1] - domain[0])) * 100;
  const zero = scale(0);
  const end = value === null ? zero : scale(value);
  return { zero, left: Math.min(zero, end), width: Math.abs(end - zero) };
}
