import { describe, expect, it } from 'vitest';
import type { ChartSeries } from '../types';
import { computeYDomain } from './domains';
import { normalizeData } from './normalize';

type Row = { x: number; a: number; b: number; c: number };
const series: ChartSeries<Row>[] = (['a', 'b', 'c'] as const).map((id) => ({
  id,
  label: id,
  accessor: (row: Row) => row[id],
}));
const x = { type: 'number', accessor: (row: Row) => row.x } as const;

describe('y domain', () => {
  it('spans more values than one call can take as arguments', () => {
    // 3 series × 100,000 rows: spreading these into Math.min overflows the call stack, and the
    // chart drew an empty plot.
    const rows = Array.from({ length: 100_000 }, (_, index) => ({
      x: index,
      a: 10 + (index % 50),
      b: 20 + (index % 70),
      c: index === 54_321 ? 900 : 5,
    }));
    const [low, high] = computeYDomain(normalizeData(rows, series, x), series);
    expect(low).toBe(0);
    expect(high).toBeGreaterThanOrEqual(900);
  });
});
