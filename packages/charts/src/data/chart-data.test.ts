import { describe, expect, it } from 'vitest';
import { summarizeRange, toChartCsv } from './chart-data';

describe('chart data tools', () => {
  it('summarizes inclusive reversed ranges without treating missing endpoints as zero', () => {
    const data = [
      { x: 1, v: 9 },
      { x: 2, v: null },
      { x: 3, v: 0 },
      { x: 4, v: 6 },
    ];
    expect(
      summarizeRange(data, {
        x: (row) => row.x,
        value: (row) => row.v,
        range: { startX: 4, endX: 2 },
      }),
    ).toEqual({
      count: 2,
      missing: 1,
      total: 6,
      mean: 3,
      min: 0,
      max: 6,
      first: null,
      last: 6,
      change: null,
    });
    expect(summarizeRange([], { x: Number, value: Number }).total).toBeNull();
    expect(
      summarizeRange([{ x: 1, v: 0 }], { x: (row) => row.x, value: (row) => row.v }).total,
    ).toBe(0);
  });
  it('escapes quotes and multiline CSV, keeps negative numbers numeric, protects formula text', () => {
    expect(
      toChartCsv(
        [
          { label: 'a,"b"\nc', value: -4 },
          { label: '=1+1', value: null },
        ],
        [
          { header: 'Label', value: (row) => row.label },
          { header: 'Value', value: (row) => row.value },
        ],
      ),
    ).toBe('Label,Value\r\n"a,""b""\nc",-4\r\n\'=1+1,\r\n');
    expect(() => toChartCsv([NaN], [{ header: 'Value', value: Number }])).toThrow(/finite/);
  });
  it('rejects ambiguous summary positions', () => {
    expect(() => summarizeRange([1, 1], { x: Number, value: Number })).toThrow(/unique/);
  });
});
