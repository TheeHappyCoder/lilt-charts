import { describe, expect, it } from 'vitest';
import { buildSnapshot, LINE_ARRANGEMENT } from '../chart-context';
import type { ChartSeries } from '../types';
import { decimateRows } from './decimate';
import { normalizeData } from './normalize';

type Row = { x: number; a: number | null; b: number };
const x = { type: 'number', accessor: (row: Row) => row.x } as const;
const series: ChartSeries<Row>[] = [
  { id: 'a', label: 'A', accessor: (row) => row.a },
  { id: 'b', label: 'B', accessor: (row) => row.b },
];
const margins = { top: 0, right: 0, bottom: 0, left: 0 };

/** A wave with one tall spike and one deep dip, so the extremes are easy to check. */
function wave(length: number, gapAt: number[] = []): Row[] {
  return Array.from({ length }, (_, index) => ({
    x: index,
    a: gapAt.includes(index)
      ? null
      : index === 4_321
        ? 500
        : index === 7_777
          ? -500
          : Math.sin(index / 40) * 50,
    b: 100 + Math.cos(index / 25) * 10,
  }));
}

const options = (width: number, length: number) => ({
  lines: ['a', 'b'],
  xDomain: [0, length - 1] as const,
  xToPixel: (value: number) => (value / (length - 1)) * width,
});

describe('decimate', () => {
  it('draws every row when there are not many more rows than pixels', () => {
    const data = normalizeData(wave(500), series, x);
    expect(decimateRows(data, options(400, 500))).toBeNull();
  });

  it('keeps at most four rows per pixel column for each line, including every extreme', () => {
    const data = normalizeData(wave(10_000), series, x);
    const thinned = decimateRows(data, options(200, 10_000))!;
    // Two lines × four rows × ~201 columns, at most.
    expect(thinned.rows.length).toBeLessThanOrEqual(2 * 4 * 201);
    const kept = new Set(thinned.rows.map((row) => row.x));
    for (const index of [0, 4_321, 7_777, 9_999]) expect(kept.has(index)).toBe(true);
    // Every kept row is a real observation, in order.
    thinned.rows.forEach((row, index) => {
      expect(row).toBe(data.rows[row.sourceIndex]);
      if (index) expect(row.x).toBeGreaterThan(thinned.rows[index - 1]!.x);
    });
  });

  it('keeps a gap exactly as wide, with the observations either side', () => {
    const data = normalizeData(wave(10_000, [5_000, 5_001]), series, x);
    const kept = new Set(decimateRows(data, options(200, 10_000))!.rows.map((row) => row.x));
    for (const index of [4_999, 5_000, 5_001, 5_002]) expect(kept.has(index)).toBe(true);
  });

  it('keeps both rows where a series changes status', () => {
    const forecast: ChartSeries<Row>[] = [
      { ...series[0]!, status: (row) => (row.x >= 6_000 ? 'forecast' : 'observed') },
    ];
    const data = normalizeData(wave(10_000), forecast, x);
    const kept = new Set(
      decimateRows(data, { ...options(200, 10_000), lines: ['a'] })!.rows.map((row) => row.x),
    );
    expect(kept.has(5_999)).toBe(true);
    expect(kept.has(6_000)).toBe(true);
  });

  it('follows the top of each stacked layer, which is what a stack draws', () => {
    const rows = Array.from({ length: 10_000 }, (_, index) => ({
      x: index,
      a: 10,
      // Alone, b barely moves; on top of a, the layer boundary spikes where a + b peaks.
      b: index === 3_333 ? 40 : 20,
    }));
    const data = normalizeData(rows, series, x);
    const kept = new Set(
      decimateRows(data, {
        ...options(100, 10_000),
        stack: { series: ['a', 'b'], mode: 'sum' },
      })!.rows.map((row) => row.x),
    );
    expect(kept.has(3_333)).toBe(true);
  });

  it('leaves category charts alone', () => {
    const data = normalizeData(
      wave(10_000).map((row) => ({ ...row, id: String(row.x) })),
      series,
      { type: 'category', accessor: (row) => row.id },
    );
    expect(decimateRows(data, options(200, 10_000))).toBeNull();
  });
});

describe('snapshot drawing geometry', () => {
  const draw = (decimate: boolean) =>
    buildSnapshot(
      normalizeData(wave(20_000), series, x),
      series,
      x,
      {},
      margins,
      400,
      200,
      undefined,
      undefined,
      series,
      LINE_ARRANGEMENT,
      undefined,
      {},
      0,
      decimate,
    );

  it('draws long lines from fewer points while inspection keeps every row', () => {
    const snapshot = draw(true);
    const full = snapshot.geometry!.series.a!.segments[0]!.points.length;
    const drawn = snapshot.drawGeometry!.series.a!.segments[0]!.points.length;
    expect(full).toBe(20_000);
    expect(drawn).toBeLessThan(full / 10);
    // The drawn line reaches the same top and bottom as every row would.
    const ys = (points: readonly { y: number }[]) => points.map((point) => point.y);
    const fullYs = ys(snapshot.geometry!.series.a!.segments[0]!.points);
    const drawnYs = ys(snapshot.drawGeometry!.series.a!.segments[0]!.points);
    expect(Math.min(...drawnYs)).toBe(Math.min(...fullYs));
    expect(Math.max(...drawnYs)).toBe(Math.max(...fullYs));
  });

  it('thins each unstacked line on its own', () => {
    const snapshot = draw(true);
    for (const id of ['a', 'b']) {
      const drawn = snapshot.drawGeometry!.series[id]!.segments[0]!.points.length;
      expect(drawn).toBeLessThan(20_000 / 10);
    }
  });

  it('thins stacked layers at the same rows, so each boundary meets the next', () => {
    const rows = wave(20_000).map((row) => ({ ...row, a: Math.abs(row.a ?? 0) }));
    const snapshot = buildSnapshot(
      normalizeData(rows, series, x),
      series,
      x,
      {},
      margins,
      400,
      200,
      undefined,
      undefined,
      series,
      { bars: null, stack: { series: ['a', 'b'], mode: 'sum' } },
    );
    const xs = (id: string) =>
      snapshot.drawGeometry!.series[id]!.segments[0]!.points.map((point) => point.x);
    expect(xs('a').length).toBeLessThan(20_000 / 5);
    expect(xs('b')).toEqual(xs('a'));
  });

  it('draws every row when decimate is off', () => {
    expect(draw(false).drawGeometry).toBeNull();
  });
});
