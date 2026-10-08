import { describe, expect, it } from 'vitest';
import { buildSnapshot, logTicks } from '../chart-context';
import { numberFormatters } from '../cards/format';
import type { ChartSeries } from '../types';
import { computeYDomain } from './domains';
import { normalizeData } from './normalize';

type Row = { x: number; price: number };
const series: ChartSeries<Row>[] = [{ id: 'price', label: 'Price', accessor: (row) => row.price }];
const x = { type: 'number', accessor: (row: Row) => row.x } as const;
const margins = { top: 0, right: 0, bottom: 0, left: 0 };
const history = [10, 100, 1_000, 10_000].map((price, index) => ({ x: index, price }));

describe('log y scale', () => {
  it('pads the domain by ratio instead of reaching for zero', () => {
    const data = normalizeData(history, series, x);
    const [low, high] = computeYDomain(data, series, { scale: 'log', includeZero: true });
    expect(low).toBeGreaterThan(5);
    expect(low).toBeLessThan(10);
    expect(high).toBeGreaterThan(10_000);
    expect(high / 10_000).toBeCloseTo(10 / low, 6);
  });

  it('spaces each tenfold rise evenly', () => {
    const data = normalizeData(history, series, x);
    const snapshot = buildSnapshot(data, series, x, { scale: 'log' }, margins, 400, 300);
    const steps = [10, 100, 1_000, 10_000].map(snapshot.yToPixel);
    expect(steps[0]! - steps[1]!).toBeCloseTo(steps[2]! - steps[3]!, 6);
    const points = snapshot.geometry!.series.price!.segments[0]!.points;
    points.forEach((point, index) => expect(point.y).toBeCloseTo(steps[index]!, 6));
  });

  it('ticks on 1, 2 and 5 across decades and on round values within one', () => {
    expect(logTicks([8, 1_200], 5)).toEqual([10, 20, 50, 100, 200, 500, 1_000]);
    expect(logTicks([8, 120_000], 3)).toEqual([10, 100, 1_000, 10_000, 100_000]);
    expect(logTicks([205, 262], 4)).toEqual([220, 240, 260]);
  });

  it('refuses values that cannot sit on a log axis, and bars that start at zero', () => {
    const withZero = normalizeData(
      [
        { x: 0, price: 0 },
        { x: 1, price: 4 },
      ],
      series,
      x,
    );
    expect(() => computeYDomain(withZero, series, { scale: 'log' })).toThrow('must be positive');
    const data = normalizeData(history, series, x);
    expect(() =>
      buildSnapshot(data, series, x, { scale: 'log' }, margins, 400, 300, undefined, null, series, {
        bars: ['price'],
        stack: null,
      }),
    ).toThrow('bars and stacks start at zero');
  });
});

describe('card number formats', () => {
  it('accepts a minimum of more than one fraction digit, as prices need', () => {
    const { full } = numberFormatters('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    });
    expect(full(245.8)).toBe('$245.80');
  });
});
