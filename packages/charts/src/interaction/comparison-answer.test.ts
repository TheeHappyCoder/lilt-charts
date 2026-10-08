import { describe, expect, it } from 'vitest';
import { comparisonForRange } from '../engine/comparison';
import { normalizeData } from '../engine/normalize';
import { comparisonAnswer } from './comparison-answer';

const series = [
  {
    id: 'value',
    label: 'Value',
    accessor: (row: { x: number; value: number | null }) => row.value,
  },
];
const x = { type: 'number', accessor: (row: { x: number }) => row.x } as const;
const format = (value: number) => `$${value.toLocaleString('en-US')}`;

describe('comparison answer', () => {
  it('shows both real endpoint values and the signed arithmetic without sentiment', () => {
    const data = normalizeData(
      [
        { x: 1, value: 1480 },
        { x: 2, value: 2360 },
      ],
      series,
      x,
    );
    expect(
      comparisonAnswer(comparisonForRange(data, { startX: 1, endX: 2 }, 'value'), format),
    ).toEqual({
      values: '$1,480 → $2,360',
      change: '+$880',
      percentage: '+59.5%',
      unavailable: null,
    });
  });

  it('keeps gaps and zero baselines explicit', () => {
    const data = normalizeData(
      [
        { x: 1, value: 0 },
        { x: 2, value: -10 },
        { x: 3, value: null },
      ],
      series,
      x,
    );
    const zero = comparisonAnswer(
      comparisonForRange(data, { startX: 1, endX: 2 }, 'value'),
      format,
    );
    expect(zero.change).toBe('−$10');
    expect(zero.percentage).toBeNull();
    const gap = comparisonAnswer(comparisonForRange(data, { startX: 2, endX: 3 }, 'value'), format);
    expect(gap.values).toBe('$-10 → No data');
    expect(gap.change).toBe('Change unavailable');
  });
});
