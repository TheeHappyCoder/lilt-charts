import type { ChartSeries, ChartStackMode } from '../types';
import type { NormalizedData, NormalizedRow } from './normalize';

export type StackMode = ChartStackMode;

/** Value of the last displayed stack boundary, in the axis's units. */
export function stackInspectionValue(
  values: readonly (number | null)[],
  mode: StackMode,
): number | null {
  if (!values.length || values.some((value) => value === null)) return null;
  const measured = values as readonly number[];
  const total = measured.reduce((sum, value) => sum + value, 0);
  if (mode === 'percent') return total > 0 ? 100 : 0;
  // Positives stack above zero and negatives below, so the edge is the total on its side.
  const negative = measured[measured.length - 1]! < 0;
  return measured.reduce(
    (sum, value) => sum + (negative ? Math.min(0, value) : Math.max(0, value)),
    0,
  );
}

/** Whether a sum stack has values below zero, which then stack downward from the baseline. */
export function hasNegativeContribution<T>(
  data: NormalizedData<T>,
  ids: readonly string[],
): boolean {
  return data.rows.some((row) => ids.some((id) => (row.values[id] ?? 0) < 0));
}

export function validateStack<T>(
  data: NormalizedData<T>,
  series: readonly ChartSeries<T>[],
  mode: StackMode = 'sum',
): void {
  const curve = series[0]?.curve ?? 'monotone';
  for (const descriptor of series) {
    if ((descriptor.curve ?? 'monotone') !== curve)
      throw new Error('Stacked areas must use the same curve for every series.');
    for (const row of data.rows) {
      const value = row.values[descriptor.id];
      if (mode === 'percent' && value !== null && value < 0)
        throw new Error(
          `Percent stacks require non-negative values. Series "${descriptor.id}" is negative at row ${row.sourceIndex + 1}.`,
        );
    }
  }
  for (const row of data.rows) {
    const knownPositive = series.reduce(
      (sum, item) => sum + Math.max(0, row.values[item.id] ?? 0),
      0,
    );
    const knownNegative = series.reduce(
      (sum, item) => sum + Math.min(0, row.values[item.id] ?? 0),
      0,
    );
    if (!Number.isFinite(knownPositive) || !Number.isFinite(knownNegative))
      throw new Error(
        `Stack total exceeds the supported numeric range at row ${row.sourceIndex + 1}.`,
      );
  }
}

/** A missing contribution makes the total unknown, not zero. Hidden series do not contribute. */
export function stackTotal<T>(row: NormalizedRow<T>, ids: readonly string[]): number | null {
  let total = 0;
  for (const id of ids) {
    const value = row.values[id];
    if (value === null || value === undefined) return null;
    total += value;
  }
  return total;
}

export function stackDomainData<T>(
  data: NormalizedData<T>,
  series: readonly ChartSeries<T>[],
  mode: StackMode = 'sum',
): NormalizedData<T> {
  const ids = series.map((item) => item.id);
  if (mode === 'sum') {
    // Known contributions bound the scale even at incomplete observations. They are never
    // plotted or presented as a complete total; hiding a missing series can reveal them.
    return {
      ...data,
      rows: data.rows.map((row) => ({
        ...row,
        values: {
          positive: ids.reduce((sum, id) => sum + Math.max(0, row.values[id] ?? 0), 0),
          negative: ids.reduce((sum, id) => sum + Math.min(0, row.values[id] ?? 0), 0),
        },
      })),
      series: [
        { id: 'negative', label: 'Negative total', accessor: () => null },
        { id: 'positive', label: 'Positive total', accessor: () => null },
      ],
    };
  }
  return {
    ...data,
    rows: data.rows.map((row) => ({ ...row, values: { total: 100 } })),
    series: [{ id: 'total', label: 'Percent total', accessor: () => null }],
  };
}
