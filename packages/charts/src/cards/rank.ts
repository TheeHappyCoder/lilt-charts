import { normalizeRanking, orderRanking } from '../engine/ranking';
import type { RankingOrder } from '../types';

/** One ranked category, or the "Other" row that adds up everything past the limit. */
export interface RankedRow {
  id: string;
  label: string;
  value: number | null;
  other?: boolean;
}

export const OTHER_ID = '\u0000other';

export const sharePercent = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 0,
});

/** Rank rows, then fold everything past `limit` into one "Other" row. */
export function rankRows<Row>(
  data: readonly Row[],
  category: string,
  value: string,
  sort: RankingOrder,
  limit: number | undefined,
  otherLabel: string,
): RankedRow[] {
  const read = (row: Row) => (row as Record<string, unknown>)[value];
  const ranked = orderRanking(
    normalizeRanking(
      data,
      {
        id: (row) => String((row as Record<string, unknown>)[category] ?? ''),
        label: (row) => String((row as Record<string, unknown>)[category] ?? ''),
      },
      (row) => {
        const cell = read(row);
        return typeof cell === 'number' ? cell : null;
      },
    ),
    sort,
  ).map(({ id, label, value: amount }) => ({ id, label, value: amount }));
  // A limit that would hide a single row shows it instead of an "Other" of one.
  if (limit === undefined || limit < 1 || ranked.length <= limit + 1) return ranked;
  const rest = ranked.slice(limit).flatMap((row) => (row.value === null ? [] : [row.value]));
  return [
    ...ranked.slice(0, limit),
    {
      id: OTHER_ID,
      label: otherLabel,
      value: rest.length ? rest.reduce((sum, amount) => sum + amount, 0) : null,
      other: true,
    },
  ];
}

/**
 * The total of observed values and whether shares of it mean anything: they don't when values
 * mix gains and losses, or when nothing positive was observed.
 */
export function shareTotals(rows: readonly RankedRow[]) {
  const observed = rows.flatMap((row) => (row.value === null ? [] : [row.value]));
  const total = observed.reduce((sum, amount) => sum + amount, 0);
  return {
    observed: observed.length,
    total,
    shareable: total > 0 && observed.every((amount) => amount >= 0),
  };
}
