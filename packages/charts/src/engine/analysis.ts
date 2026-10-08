import { normalizeRanking, type RankingCategory, type RankingRow } from './ranking';

function nonNegative(value: number | null, label: string): void {
  if (value !== null && (!Number.isFinite(value) || value < 0))
    throw new Error(`${label} must be a non-negative finite number or null.`);
}

export interface FunnelRow<T> extends RankingRow<T> {
  share: number | null;
  conversion: number | null;
  drop: number | null;
}

export function funnelRows<T>(props: {
  data: readonly T[];
  category: RankingCategory<T>;
  value: (row: T) => number | null;
}): FunnelRow<T>[] {
  const rows = normalizeRanking(props.data, props.category, props.value);
  let previousKnown = Infinity;
  for (const row of rows) {
    nonNegative(row.value, `Stage ${row.id}`);
    if (row.value === null) continue;
    if (row.value > previousKnown)
      throw new Error(
        `Stage ${row.id} exceeds a preceding stage; cumulative funnel counts must not increase.`,
      );
    previousKnown = row.value;
  }
  const baseline = rows[0]?.value;
  return rows.map((row, index) => {
    const previous = rows[index - 1]?.value;
    return {
      ...row,
      share: row.value !== null && baseline != null && baseline > 0 ? row.value / baseline : null,
      conversion:
        row.value !== null && previous != null && previous > 0 ? row.value / previous : null,
      drop: row.value !== null && previous != null ? previous - row.value : null,
    };
  });
}
