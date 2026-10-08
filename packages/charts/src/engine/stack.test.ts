import { describe, expect, it } from 'vitest';
import { buildSnapshot } from '../chart-context';
import { normalizeData } from './normalize';
import { pointAtX } from './geometry';
import { stackTotal, validateStack } from './stack';

type Row = { x: number; a: number | null; b: number | null; c: number | null };
const series = ['a', 'b', 'c'].map((id) => ({
  id,
  label: id,
  accessor: (row: Row) => row[id as 'a' | 'b' | 'c'],
}));
const x = { type: 'number' as const, accessor: (row: Row) => row.x };
const margins = { left: 16, top: 12, right: 16, bottom: 30 };
const rows: Row[] = [
  { x: 0, a: 10, b: 3, c: 1 },
  { x: 1, a: 30, b: 0.01, c: 4 },
  { x: 3, a: 2, b: 0, c: 8 },
  { x: 4, a: 60, b: 2, c: 1 },
];
function snapshot(data = rows, weights = { a: 1, b: 1, c: 1 }) {
  return buildSnapshot(
    normalizeData(data, series, x),
    series.filter((item) => weights[item.id as keyof typeof weights] > 0),
    x,
    {},
    margins,
    460,
    280,
    undefined,
    undefined,
    series,
    { bars: null, stack: { series: series.map((item) => item.id), mode: 'sum' } },
    weights,
  );
}

describe('stacked area geometry', () => {
  it('normalizes visible percent thickness without changing source observations', () => {
    const weights = { a: 1, b: 1, c: 0 };
    const chart = buildSnapshot(
      normalizeData(rows, series, x),
      series.slice(0, 2),
      x,
      {},
      margins,
      460,
      280,
      undefined,
      undefined,
      series,
      { bars: null, stack: { series: series.map((item) => item.id), mode: 'percent' } },
      weights,
    );
    expect(chart.yDomain).toEqual([0, 100]);
    expect(chart.data.rows[0].values).toEqual({ a: 10, b: 3, c: 1 });
    expect(pointAtX(chart.geometry!.series.b, chart.xToPixel(0))!.y).toBeCloseTo(
      chart.yToPixel(100),
      1,
    );
    expect(pointAtX(chart.geometry!.series.a, chart.xToPixel(0))!.y).toBeCloseTo(
      chart.yToPixel((10 / 13) * 100),
      1,
    );
  });

  it('stacks negatives below zero in sum areas and bars', () => {
    const signed = [
      { x: 0, a: 10, b: -4, c: 2 },
      { x: 1, a: 5, b: -8, c: 1 },
      { x: 2, a: -2, b: 3, c: -1 },
    ];
    const data = normalizeData(signed, series, x);
    expect(() => validateStack(data, series, 'sum')).not.toThrow();
    expect(() => validateStack(data, series, 'percent')).toThrow('non-negative');
    const area = buildSnapshot(
      data,
      series,
      x,
      {},
      margins,
      460,
      280,
      undefined,
      undefined,
      series,
      { bars: null, stack: { series: series.map((item) => item.id), mode: 'sum' } },
      { a: 1, b: 1, c: 1 },
    );
    expect(area.yDomain![0]).toBeLessThan(-8);
    expect(area.yDomain![1]).toBeGreaterThan(10);
    expect(area.geometry!.series.b.segments[0].areaPath).not.toMatch(/NaN|Infinity/);
    const bars = buildSnapshot(
      data,
      series,
      x,
      {},
      margins,
      460,
      280,
      undefined,
      undefined,
      series,
      {
        bars: series.map((item) => item.id),
        stack: { series: series.map((item) => item.id), mode: 'sum' },
      },
      { a: 1, b: 1, c: 1 },
    );
    expect(bars.geometry!.bars.a[0].baseline).toBeCloseTo(bars.yToPixel(0));
    expect(bars.geometry!.bars.c[0].baseline).toBeCloseTo(bars.yToPixel(10));
    expect(bars.geometry!.bars.b[0].baseline).toBeCloseTo(bars.yToPixel(0));
    expect(bars.geometry!.bars.b[0].negative).toBe(true);
  });

  it('keeps stacked-bar slots aligned and percent sums exact with gaps', () => {
    const partial = rows.map((row, index) => ({ ...row, b: index === 1 ? null : row.b }));
    const chart = buildSnapshot(
      normalizeData(partial, series, x),
      series,
      x,
      {},
      margins,
      460,
      280,
      undefined,
      undefined,
      series,
      {
        bars: series.map((item) => item.id),
        stack: { series: series.map((item) => item.id), mode: 'percent' },
      },
      { a: 1, b: 1, c: 1 },
    );
    expect(chart.yDomain).toEqual([0, 100]);
    expect(chart.geometry!.bars.a.map((bar) => bar.valueX)).not.toContain(1);
    const atZero = series.map(
      (item) => chart.geometry!.bars[item.id].find((bar) => bar.valueX === 0)!,
    );
    expect(atZero.every((bar) => bar.x === atZero[0].x && bar.width === atZero[0].width)).toBe(
      true,
    );
    expect(atZero[2].y).toBeCloseTo(chart.yToPixel(100), 1);
  });

  it('uses totals for the shared scale and cumulative boundaries while preserving raw values', () => {
    const chart = snapshot();
    expect(chart.yDomain![1]).toBeGreaterThanOrEqual(63);
    const row = chart.data.rows[0];
    expect(row.values).toEqual({ a: 10, b: 3, c: 1 });
    expect(stackTotal(row, ['a', 'b', 'c'])).toBe(14);
    expect(pointAtX(chart.geometry!.series.c, chart.xToPixel(0))!.y).toBeCloseTo(
      chart.yToPixel(14),
      1,
    );
    expect(pointAtX(chart.geometry!.series.b, chart.xToPixel(0))!.y).toBeCloseTo(
      chart.yToPixel(13),
      1,
    );
  });
  it('keeps shared curved boundaries ordered even for very thin layers', () => {
    const chart = snapshot();
    for (let pixel = chart.plot.left; pixel <= chart.plot.right; pixel += 0.5) {
      const a = pointAtX(chart.geometry!.series.a, pixel)!;
      const b = pointAtX(chart.geometry!.series.b, pixel)!;
      const c = pointAtX(chart.geometry!.series.c, pixel)!;
      expect(a.y + 1e-8).toBeGreaterThanOrEqual(b.y);
      expect(b.y + 1e-8).toBeGreaterThanOrEqual(c.y);
    }
  });
  it('collapses a hidden middle layer continuously while preserving the scale and order', () => {
    const start = snapshot();
    const middle = snapshot(rows, { a: 1, b: 0.5, c: 1 });
    const end = snapshot(rows, { a: 1, b: 0, c: 1 });
    expect(start.yDomain).toEqual(end.yDomain);
    const pixel = start.xToPixel(0);
    expect(pointAtX(middle.geometry!.series.c, pixel)!.y).toBeCloseTo(middle.yToPixel(12.5), 1);
    expect(pointAtX(end.geometry!.series.c, pixel)!.y).toBeCloseTo(end.yToPixel(11), 1);
    expect(end.geometry!.series.a.segments[0].path).toBe(end.geometry!.series.b.segments[0].path);
  });
  it('leaves a shared gap for unknown contributions and restores it when that series is hidden', () => {
    const missing = rows.map((row, index) => ({ ...row, b: index === 1 ? null : row.b }));
    const chart = snapshot(missing);
    for (const id of ['a', 'b', 'c'])
      expect(pointAtX(chart.geometry!.series[id], chart.xToPixel(1))).toBeNull();
    expect(stackTotal(chart.data.rows[1], ['a', 'b', 'c'])).toBeNull();
    expect(stackTotal(chart.data.rows[1], ['a', 'c'])).toBe(34);
    const hidden = snapshot(missing, { a: 1, b: 0, c: 1 });
    expect(pointAtX(hidden.geometry!.series.c, hidden.xToPixel(1))).not.toBeNull();
  });
  it('handles singleton and all-zero observations and rejects ambiguous signed/mixed curves', () => {
    const single = snapshot([{ x: 1, a: 0, b: 0, c: 0 }]);
    expect(single.yDomain).toEqual([0, 1]);
    expect(single.geometry!.series.c.isolated).toHaveLength(1);
    expect(() =>
      validateStack(normalizeData([{ x: 1, a: -1, b: 2, c: 3 }], series, x), series, 'percent'),
    ).toThrow('non-negative');
    expect(() =>
      validateStack(normalizeData(rows, series, x), [
        { ...series[0], curve: 'linear' },
        ...series.slice(1),
      ]),
    ).toThrow('same curve');
  });
  it('keeps known large contributions in range when a missing series is hidden', () => {
    const partial = [
      { x: 0, a: 1000, b: null, c: 30 },
      { x: 1, a: 10, b: 4, c: 2 },
    ];
    const chart = snapshot(partial, { a: 1, b: 0, c: 1 });
    expect(chart.yDomain![1]).toBeGreaterThanOrEqual(1030);
    expect(pointAtX(chart.geometry!.series.c, chart.xToPixel(0))!.y).toBeGreaterThanOrEqual(
      chart.plot.top,
    );
  });
});
