import { describe, expect, it } from 'vitest';
import type { ChartSeries } from '../types';
import { normalizeData } from './normalize';
import {
  ColorBatches,
  assertOrdered,
  boxShape,
  columnsInView,
  dotPath,
  rangeBarPath,
  whiskerPath,
  type RangeScales,
} from './ranges';

const scales: RangeScales = {
  x: (value) => value * 10,
  y: (value) => 100 - value,
  xDomain: [0, 10],
  columnWidth: 8,
};

type Row = { x: number; value: number | null; low: number | null; high: number | null };
const series: ChartSeries<Row> = {
  id: 'value',
  label: 'Value',
  accessor: (row) => row.value,
  fields: {
    low: { label: 'Low', accessor: (row) => row.low },
    high: { label: 'High', accessor: (row) => row.high },
  },
};
const rows = (data: Row[]) =>
  normalizeData(data, [series], { type: 'number', accessor: (row: Row) => row.x }).rows;

describe('range geometry', () => {
  it('floats a rounded bar between low and high, whichever order they come in', () => {
    const path = rangeBarPath(50, 20, 60, scales);
    expect(path.startsWith('M50,40')).toBe(true);
    expect(path).toContain('v32');
    expect(rangeBarPath(50, 60, 20, scales)).toBe(path);
  });

  it('keeps a zero-height range visible as a one-pixel bar', () => {
    expect(rangeBarPath(50, 30, 30, scales)).toContain('69.5');
  });

  it('caps whiskers at both ends, narrower than the column', () => {
    expect(whiskerPath(50, 20, 60, scales)).toBe('M50,40V80M48,40H52M48,80H52');
    // Too narrow for a readable cap: a bare stem.
    expect(whiskerPath(50, 20, 60, { ...scales, columnWidth: 4 })).toBe('M50,40V80');
  });

  it('draws a box from q1 to q3 with a median line and capped whiskers', () => {
    const shape = boxShape(50, { min: 10, q1: 20, median: 30, q3: 40, max: 50 }, scales);
    expect(shape.box.startsWith('M49,60')).toBe(true);
    expect(shape.median).toBe('M46,70H54');
    expect(shape.whiskers).toBe('M50,60V50M48,50H52M50,80V90M48,90H52');
  });

  it('draws dots as closed arcs so many share one path', () => {
    expect(dotPath(10, 20, 2)).toBe('M8,20a2,2 0 1 0 4,0a2,2 0 1 0 -4,0Z');
  });

  it('batches paths by color', () => {
    const batches = new ColorBatches();
    batches.add('red', 'M0,0');
    batches.add('blue', 'M1,1');
    batches.add('red', 'M2,2');
    expect(batches.entries()).toEqual([
      { color: 'red', d: 'M0,0M2,2' },
      { color: 'blue', d: 'M1,1' },
    ]);
  });

  it('only places columns for rows in the visible domain', () => {
    const data = rows([
      { x: 0, value: 1, low: 0, high: 2 },
      { x: 5, value: 1, low: 0, high: 2 },
      { x: 12, value: 1, low: 0, high: 2 },
    ]);
    expect(columnsInView(data, scales).map((column) => column.cx)).toEqual([0, 50]);
  });

  it('checks that fields and values keep their order, skipping gaps', () => {
    const ordered = rows([
      { x: 0, value: 2, low: 1, high: 3 },
      { x: 1, value: null, low: 5, high: 4 },
    ]);
    expect(() =>
      assertOrdered('RangeBar', ordered.slice(0, 1), 'value', ['low', 'high']),
    ).not.toThrow();
    expect(() => assertOrdered('RangeBar', ordered, 'value', ['low', 'high'])).toThrow(
      'Lilt RangeBar on series "value" expects low ≤ high at row 2.',
    );
    // The same gap skips a check that includes the missing value.
    expect(() =>
      assertOrdered('ErrorBar', ordered, 'value', ['low', { value: true }, 'high']),
    ).not.toThrow();
  });
});
