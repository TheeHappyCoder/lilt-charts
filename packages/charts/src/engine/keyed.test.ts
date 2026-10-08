import { describe, expect, it } from 'vitest';
import type { ChartSeries } from '../types';
import { canMorphByKey, keyedFrame, mixDomain, morphEase } from './keyed';
import { normalizeData } from './normalize';

type Row = { day: number; value: number | null };
const series: ChartSeries<Row>[] = [{ id: 'value', label: 'Value', accessor: (row) => row.value }];
const days = (
  from: number,
  to: number,
  value: (day: number) => number | null = (day) => day * 10,
) =>
  normalizeData(
    Array.from(
      { length: to - from + 1 },
      (_, index): Row => ({ day: from + index, value: value(from + index) }),
    ),
    series,
    { type: 'number', accessor: (row: Row) => row.day },
  );

describe('keyed morph', () => {
  it('morphs a period switch that shares days, in either direction', () => {
    expect(canMorphByKey(days(20, 29), days(0, 29), series)).toBe(true);
    expect(canMorphByKey(days(0, 29), days(20, 29), series)).toBe(true);
  });

  it('cross-fades when nothing anchors the glide', () => {
    expect(canMorphByKey(days(0, 9), days(20, 29), series)).toBe(false);
    expect(canMorphByKey(days(0, 9), days(9, 19), series)).toBe(false);
    const categories = normalizeData<Row>([{ day: 1, value: 1 }], series, {
      type: 'category',
      accessor: (row: Row) => String(row.day),
    });
    expect(canMorphByKey(categories, categories, series)).toBe(false);
  });

  it('cross-fades when the series change', () => {
    const other: ChartSeries<Row>[] = [
      { id: 'other', label: 'Other', accessor: (row) => row.value },
    ];
    const next = normalizeData<Row>(
      [
        { day: 20, value: 1 },
        { day: 21, value: 2 },
      ],
      other,
      {
        type: 'number',
        accessor: (row: Row) => row.day,
      },
    );
    expect(canMorphByKey(days(20, 29), next, series)).toBe(false);
  });

  it('keeps every row from both frames in x order, and lands exactly on the new data', () => {
    const from = days(20, 29);
    const to = days(0, 24, (day) => day * 20);
    const frame = keyedFrame(from, to, 0.5);
    expect(frame.rows.map((row) => row.x)).toEqual(Array.from({ length: 30 }, (_, i) => i));
    // Shared days ease between their old and new values; one-sided days keep their own.
    expect(frame.rows[22].values.value).toBe(330);
    expect(frame.rows[5].values.value).toBe(100);
    expect(frame.rows[27].values.value).toBe(270);
    expect(keyedFrame(from, to, 1)).toBe(to);
  });

  it('never invents a value for a gap', () => {
    const from = days(0, 9);
    const to = days(0, 9, (day) => (day === 4 ? null : day));
    expect(keyedFrame(from, to, 0.5).rows[4].values.value).toBeNull();
  });

  it('eases in and out and mixes domains on the same clock', () => {
    expect(morphEase(0)).toBe(0);
    expect(morphEase(0.5)).toBe(0.5);
    expect(morphEase(1)).toBe(1);
    expect(morphEase(0.1)).toBeLessThan(0.1);
    expect(mixDomain([20, 29], [0, 29], 0.5)).toEqual([10, 29]);
  });

  it('grows arriving data out of the old last point, so the line draws itself forward', () => {
    const from = days(0, 9);
    const to = days(1, 10);
    // Day 10 is new: it starts at day 9's value (90) and reaches its own (100).
    expect(keyedFrame(from, to, 0).rows.at(-1)!.values.value).toBe(90);
    expect(keyedFrame(from, to, 0.5).rows.at(-1)!.values.value).toBe(95);
    expect(keyedFrame(from, to, 1).rows.at(-1)!.values.value).toBe(100);
  });
});
