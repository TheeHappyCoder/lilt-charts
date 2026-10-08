import { describe, expect, it } from 'vitest';
import { comparisonForRange } from './comparison';
import { normalizeData } from './normalize';

interface Row {
  date: number;
  value: number | null;
}

const series = [{ id: 'value', label: 'Value', accessor: (row: Row) => row.value }] as const;
const x = { type: 'time', accessor: (row: Row) => row.date } as const;

describe('comparisonForRange', () => {
  it('reports the documented revenue delta without inventing a reducer', () => {
    const startX = Date.UTC(2026, 8, 4);
    const endX = Date.UTC(2026, 8, 22);
    const data = normalizeData(
      [
        { date: startX, value: 1480 },
        { date: endX, value: 2360 },
      ],
      series,
      x,
    );
    const result = comparisonForRange(data, { startX, endX }, 'value');
    expect(result.absoluteChange).toBe(880);
    expect(result.percentageChange).toBeCloseTo(59.459, 3);
    expect(result.elapsed).toBe(18 * 86_400_000);
  });

  it('keeps missing and zero/negative percentage semantics explicit', () => {
    const data = normalizeData(
      [
        { date: 1, value: 0 },
        { date: 2, value: 10 },
        { date: 3, value: null },
      ],
      series,
      x,
    );
    expect(comparisonForRange(data, { startX: 1, endX: 2 }, 'value').percentageChange).toBeNull();
    expect(comparisonForRange(data, { startX: 2, endX: 3 }, 'value').absoluteChange).toBeNull();
  });

  it('preserves the direction of an explicit baseline comparison', () => {
    const data = normalizeData(
      [
        { date: 1, value: 10 },
        { date: 2, value: 15 },
      ],
      series,
      x,
    );
    const result = comparisonForRange(data, { startX: 2, endX: 1 }, 'value');
    expect(result).toMatchObject({
      startX: 2,
      endX: 1,
      startValue: 15,
      endValue: 10,
      absoluteChange: -5,
      elapsed: 1,
    });
  });
});
