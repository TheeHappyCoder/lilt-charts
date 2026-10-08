import { quantileSorted } from 'd3-array';

export interface BoxSummary {
  /** Lowest sample within 1.5 × IQR below the first quartile: the lower whisker. */
  min: number;
  q1: number;
  median: number;
  q3: number;
  /** Highest sample within 1.5 × IQR above the third quartile: the upper whisker. */
  max: number;
  /** Samples beyond the whiskers, ascending. */
  outliers: number[];
  count: number;
}

/**
 * Quartiles with Tukey whiskers: each whisker reaches the furthest sample within 1.5 times the
 * interquartile range, and anything beyond is an outlier. Non-finite samples are ignored;
 * returns null when none remain.
 */
export function summarizeBox(samples: readonly number[]): BoxSummary | null {
  const sorted = samples.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const q1 = quantileSorted(sorted, 0.25)!;
  const median = quantileSorted(sorted, 0.5)!;
  const q3 = quantileSorted(sorted, 0.75)!;
  const reach = (q3 - q1) * 1.5;
  const inside = sorted.filter((value) => value >= q1 - reach && value <= q3 + reach);
  return {
    min: Math.min(inside[0] ?? q1, q1),
    q1,
    median,
    q3,
    max: Math.max(inside.at(-1) ?? q3, q3),
    outliers: sorted.filter((value) => value < q1 - reach || value > q3 + reach),
    count: sorted.length,
  };
}
