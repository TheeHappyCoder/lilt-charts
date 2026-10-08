import { describe, expect, it } from 'vitest';
import type { ChartSnapshot } from '../chart-context';
import type { NormalizedRow } from '../engine/normalize';
import type { ChartSeries } from '../types';
import { tooltipContext } from './tooltip-context';

describe('tooltip content values', () => {
  it('uses the accepted normalized reading and semantics without rerunning accessors', () => {
    const datum = { value: 2 };
    let accessorCalls = 0;
    const series: readonly ChartSeries<typeof datum>[] = [
      {
        id: 'value',
        label: 'Value',
        accessor: () => {
          accessorCalls += 1;
          return 99;
        },
        formatValue: (value) => `${value} ms`,
        fields: {
          low: { label: 'Low', accessor: () => 98 },
          high: { label: 'High', accessor: () => 100 },
        },
      },
    ];
    const row: NormalizedRow<typeof datum> = {
      datum,
      sourceIndex: 4,
      x: 7,
      values: { value: 2 },
      statuses: { value: 'forecast' },
      fields: { value: { low: 1, high: null } },
    };
    const snapshot = {
      formatX: (value: number) => `Hour ${value}`,
      formatY: (value: number) => String(value),
      formatValue: (value: number) => String(value),
    } as ChartSnapshot<typeof datum>;

    expect(tooltipContext(snapshot, row, series, true)).toEqual({
      row: datum,
      sourceIndex: 4,
      x: 7,
      formattedX: 'Hour 7',
      pinned: true,
      series: [
        {
          id: 'value',
          label: 'Value',
          value: 2,
          formattedValue: '2 ms',
          status: 'forecast',
          fields: [
            { id: 'low', label: 'Low', value: 1, formattedValue: '1 ms' },
            { id: 'high', label: 'High', value: null, formattedValue: 'No data' },
          ],
        },
      ],
    });
    expect(accessorCalls).toBe(0);
  });
});
