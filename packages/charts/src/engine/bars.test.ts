import { describe, expect, it } from 'vitest';
import { buildSnapshot } from '../chart-context';
import { normalizeData } from './normalize';
import { barMarkPath, barPath } from './bars';

interface Row {
  x: number;
  a: number | null;
  b: number | null;
}
const series = [
  { id: 'a', label: 'A', accessor: (row: Row) => row.a },
  { id: 'b', label: 'B', accessor: (row: Row) => row.b },
];
const x = { type: 'number' as const, accessor: (row: Row) => row.x };
const margins = { top: 12, right: 16, bottom: 32, left: 16 };
function snapshot(rows: Row[], visible = series, width = 360, domain?: readonly [number, number]) {
  return buildSnapshot(
    normalizeData(rows, series, x),
    visible,
    x,
    {},
    margins,
    width,
    240,
    undefined,
    domain,
    series,
    { bars: series.map((item) => item.id), stack: null },
  );
}

describe('vertical bar geometry', () => {
  it('centers combo bars without reserving slots for line series and shares their scale', () => {
    const data = normalizeData(
      [
        { x: 0, a: 4, b: 10 },
        { x: 1, a: 6, b: 12 },
      ],
      series,
      x,
    );
    const chart = buildSnapshot(
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
      { bars: ['a'], stack: null },
      undefined,
    );
    expect(chart.geometry!.bars.b).toBeUndefined();
    expect(chart.geometry!.series.b.segments).toHaveLength(1);
    expect(chart.yDomain![1]).toBeGreaterThanOrEqual(12);
    for (const bar of chart.geometry!.bars.a)
      expect(bar.x + bar.width / 2).toBeCloseTo(chart.xToPixel(bar.valueX));
  });
  it('does not rescale the tallest series just because a shorter comparison is hidden', () => {
    const rows = [
      { x: 0, a: 1120, b: 1050 },
      { x: 1, a: 2860, b: 2390 },
    ];
    expect(snapshot(rows).yDomain).toEqual(snapshot(rows, [series[0]]).yDomain);
  });
  it('keeps complete edge groups in the plot and preserves irregular numeric spacing', () => {
    const chart = snapshot([
      { x: 0, a: 4, b: 3 },
      { x: 1, a: 8, b: 6 },
      { x: 4, a: 9, b: 7 },
    ]);
    const bars = Object.values(chart.geometry!.bars).flat();
    expect(bars).toHaveLength(6);
    for (const bar of bars) {
      expect(bar.x).toBeGreaterThanOrEqual(chart.plot.left);
      expect(bar.x + bar.width).toBeLessThanOrEqual(chart.plot.right);
      expect(bar.width).toBeGreaterThan(0);
      expect(bar.baseline).toBe(chart.yToPixel(0));
    }
    expect(chart.xToPixel(4) - chart.xToPixel(1)).toBeCloseTo(
      3 * (chart.xToPixel(1) - chart.xToPixel(0)),
    );
    expect(chart.geometry!.bars.a[0].x + chart.geometry!.bars.a[0].width).toBeLessThan(
      chart.geometry!.bars.b[0].x,
    );
  });

  it('preserves nulls, measured zero and signed baselines without moving the other group slot', () => {
    const chart = snapshot([
      { x: 0, a: -10, b: 8 },
      { x: 1, a: null, b: 5 },
      { x: 2, a: 0, b: 3 },
    ]);
    const a = chart.geometry!.bars.a;
    expect(a).toHaveLength(2);
    expect(a[0].negative).toBe(true);
    expect(a[0].y).toBe(chart.yToPixel(0));
    expect(a[0].y + a[0].height).toBeCloseTo(chart.yToPixel(-10));
    expect(a[1].height).toBe(0);
    const b = chart.geometry!.bars.b;
    expect(b[1].x - chart.xToPixel(1)).toBeCloseTo(b[0].x - chart.xToPixel(0));
    expect(barPath(a[0])).not.toMatch(/NaN|Infinity/);
    expect(barPath(a[1])).not.toMatch(/NaN|Infinity/);
  });

  it('centers a single series and a singleton observation without fabricating neighbours', () => {
    const chart = snapshot([{ x: 8, a: 10, b: 4 }], [series[0]], 140);
    const bars = chart.geometry!.bars.a;
    expect(bars).toHaveLength(1);
    expect(chart.geometry!.bars.b).toBeUndefined();
    expect(bars[0].x + bars[0].width / 2).toBeCloseTo(chart.xToPixel(8));
    expect(chart.xToPixel(8)).toBeCloseTo((chart.plot.left + chart.plot.right) / 2);
    expect(barPath(bars[0], 0)).toContain(`M${bars[0].x},${bars[0].baseline}`);
  });

  it('limits marks to the focus domain and keeps both focused edge groups complete', () => {
    const chart = snapshot(
      [
        { x: 0, a: 10, b: 4 },
        { x: 1, a: 11, b: 6 },
        { x: 2, a: 14, b: 9 },
        { x: 3, a: 12, b: 7 },
      ],
      series,
      360,
      [1, 2],
    );
    expect(chart.geometry!.bars.a.map((bar) => bar.valueX)).toEqual([1, 2]);
    for (const bar of Object.values(chart.geometry!.bars).flat()) {
      expect(bar.x).toBeGreaterThanOrEqual(chart.plot.left);
      expect(bar.x + bar.width).toBeLessThanOrEqual(chart.plot.right);
    }
  });

  it('keeps stacked segment seams square and aligned throughout their shared reveal', () => {
    const lower = {
      valueX: 1,
      x: 10,
      y: 150,
      width: 20,
      height: 50,
      baseline: 200,
      negative: false,
    };
    const upper = { ...lower, y: 120, height: 30, baseline: 150 };
    const lowerPath = barPath(lower, 0.5, { originY: 200, roundValueEnd: false });
    const upperPath = barPath(upper, 0.5, { originY: 200 });
    expect(lowerPath).toBe('M10,175H30V200H10Z');
    expect(upperPath).toContain('V175Z');
    expect(lowerPath).not.toContain('Q');
    expect(upperPath).toContain('Q');
  });

  it('uses connected square geometry for both resting and inspected stacked segments', () => {
    const lower = {
      valueX: 1,
      x: 10,
      y: 150,
      width: 20,
      height: 50,
      baseline: 200,
      negative: false,
    };
    const upper = { ...lower, y: 120, height: 30, baseline: 150 };
    const geometry = { a: [lower], b: [upper] };
    const options = { stacked: true, geometry, seriesIds: ['a', 'b'] };
    const lowerPath = barMarkPath(lower, { ...options, seriesId: 'a' });
    const upperPath = barMarkPath(upper, { ...options, seriesId: 'b' });
    expect(lowerPath).toBe('M10,150H30V200H10Z');
    expect(upperPath).toBe('M10,120H30V150H10Z');
    expect(barMarkPath(lower, { ...options, seriesId: 'a', radius: 6, segmentGap: 3 })).toContain(
      'Q',
    );
    expect(barMarkPath(upper, { ...options, seriesId: 'b', radius: 6 })).toContain('Q');
  });

  it('honors a requested grouped bar width and inner gap while retaining edge bounds', () => {
    const data = normalizeData(
      [
        { x: 0, a: 4, b: 3 },
        { x: 1, a: 8, b: 6 },
      ],
      series,
      x,
    );
    const chart = buildSnapshot(
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
      undefined,
      { width: 18, gap: 4 },
    );
    const a = chart.geometry!.bars.a[0];
    const b = chart.geometry!.bars.b[0];
    expect(a.width).toBe(18);
    expect(b.width).toBe(18);
    expect(b.x - (a.x + a.width)).toBe(4);
    expect(a.x).toBeGreaterThanOrEqual(chart.plot.left);
    expect(chart.geometry!.bars.b[1].x + b.width).toBeLessThanOrEqual(chart.plot.right);
  });
});
