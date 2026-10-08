import { describe, expect, it } from 'vitest';
import type { NormalizedData } from '../engine/normalize';
import { areaFloor, flowFrame, flowProgress, riseAt, riseStyle } from './area-flow';

const frame = (values: number[]) =>
  ({
    xType: 'category',
    series: [{ id: 'visits' }],
    rows: values.map((value, index) => ({ x: index, values: { visits: value } })),
  }) as unknown as NormalizedData<unknown>;

describe('area flow', () => {
  it('rolls a period change across the plot in reading order', () => {
    expect(flowProgress(0, 0, 12)).toBe(0);
    expect(flowProgress(0.1, 0, 12)).toBeGreaterThan(flowProgress(0.1, 11, 12));
    expect(flowProgress(0.1, 11, 12)).toBe(0);
    for (let index = 0; index < 12; index += 1) expect(flowProgress(1, index, 12)).toBe(1);
  });

  it('lands exactly on the new rows, keeping gaps as gaps', () => {
    const from = frame([10, 10, 10]);
    const to = frame([20, 30, 40]);
    expect(flowFrame(from, to, 1)).toBe(to);
    const middle = flowFrame(from, to, 0.4).rows.map((row) => row.values.visits as number);
    expect((middle[0] - 10) / 10).toBeGreaterThan((middle[2] - 10) / 30);
    expect(middle[2]).toBeLessThan(40);
    const gap = frame([10, 10, 10]);
    (gap.rows[1].values as Record<string, number | null>).visits = null;
    expect(flowFrame(from, gap, 0.5).rows[1].values.visits).toBeNull();
  });

  it('rises from the floor blurred and lands sharp', () => {
    expect(riseAt(0)).toEqual({ rise: 0.6, blur: 4 });
    expect(riseAt(Infinity)).toEqual({ rise: 1, blur: 0 });
    expect(riseAt(240).blur).toBeLessThan(riseAt(80).blur);
    expect(riseStyle(Infinity, 200)).toEqual({});
    expect(riseStyle(0, 200).transform).toBe('translate(0 80) scale(1 0.6)');
  });

  it('stands an area on its zero line inside the plot', () => {
    const plot = { top: 10, bottom: 200 };
    expect(areaFloor({ yToPixel: () => 120, plot })).toBe(120);
    expect(areaFloor({ yToPixel: () => 400, plot })).toBe(200);
    expect(areaFloor({ yToPixel: () => Number.NaN, plot })).toBe(200);
  });
});
