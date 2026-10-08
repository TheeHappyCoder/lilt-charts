/**
 * Shares in percentage points, preserving measured zero. A missing, invalid, negative,
 * or zero-total period has no meaningful composition and returns gaps for every series.
 * Scaling before summing also supports large finite inputs without overflowing.
 */
export function compositionShares(values: readonly unknown[]): (number | null)[] {
  if (!values.length) return [];
  if (values.some((value) => typeof value !== 'number' || !Number.isFinite(value) || value < 0))
    return values.map(() => null);
  const measured = values as readonly number[];
  const maximum = measured.reduce((max, value) => Math.max(max, value), 0);
  if (maximum === 0) return values.map(() => null);
  const total = measured.reduce((sum, value) => sum + value / maximum, 0);
  return measured.map((value) => (value / maximum / total) * 100);
}
