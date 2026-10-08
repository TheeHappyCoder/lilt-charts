import { describe, expect, it } from 'vitest';
import { buildSnapshot } from '../chart-context';
import { hasMatchingTopology, normalizeData } from './normalize';

type Row = { id: string; label: string; value: number | null };
const series = [{ id: 'value', label: 'Value', accessor: (row: Row) => row.value }];
const x = {
  type: 'category' as const,
  accessor: (row: Row) => row.id,
  format: (id: string) => id.toUpperCase(),
};
const margins = { top: 12, right: 16, bottom: 32, left: 16 };

describe('categorical plot axis', () => {
  it('uses stable IDs and input order while keeping bars inside the measured plot', () => {
    const data = normalizeData(
      [
        { id: 'direct', label: 'Direct', value: 10 },
        { id: 'search', label: 'Search', value: null },
        { id: 'referral', label: 'Referral', value: 5 },
      ],
      series,
      x,
    );
    const snapshot = buildSnapshot(
      data,
      series,
      x,
      {},
      margins,
      360,
      240,
      undefined,
      undefined,
      series,
      { bars: series.map((item) => item.id), stack: null },
    );
    expect(snapshot.xTicks.map(snapshot.formatX)).toEqual(['DIRECT', 'SEARCH', 'REFERRAL']);
    expect(snapshot.geometry!.bars.value).toHaveLength(2);
    for (const bar of snapshot.geometry!.bars.value) {
      expect(bar.x).toBeGreaterThanOrEqual(snapshot.plot.left);
      expect(bar.x + bar.width).toBeLessThanOrEqual(snapshot.plot.right);
    }
  });

  it('rejects duplicate IDs and treats a reorder as changed topology', () => {
    const first = normalizeData(
      [
        { id: 'a', label: 'A', value: 2 },
        { id: 'b', label: 'B', value: 4 },
      ],
      series,
      x,
    );
    const reordered = normalizeData(
      [
        { id: 'b', label: 'B', value: 4 },
        { id: 'a', label: 'A', value: 2 },
      ],
      series,
      x,
    );
    expect(hasMatchingTopology(first, reordered, series)).toBe(false);
    expect(() =>
      normalizeData(
        [
          { id: 'a', label: 'A', value: 2 },
          { id: 'a', label: 'Again', value: 3 },
        ],
        series,
        x,
      ),
    ).toThrow('duplicate ID');
  });
});
