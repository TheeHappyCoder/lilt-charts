// @vitest-environment jsdom

import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChartPlot } from './chart-plot';
import { Line } from './primitives/line';
import { Chart } from './runtime/chart-runtime';
import type { ChartSeries } from './types';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type Row = { x: number; value: number };
const rows: readonly Row[] = [
  { x: 1, value: 2 },
  { x: 2, value: 4 },
];
const series: readonly ChartSeries<Row>[] = [
  { id: 'value', label: 'Value', accessor: (row) => row.value },
];
const x = { type: 'number' as const, accessor: (row: Row) => row.x };

afterEach(() => vi.restoreAllMocks());

describe('chart refresh error', () => {
  it('keeps accepted data visible while announcing a failed refresh, then clears the message', async () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      width: 320,
      height: 240,
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 320,
      bottom: 240,
      toJSON: () => ({}),
    });
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    const view = (status: 'ready' | 'error') => (
      <Chart
        aria-label="Refresh chart"
        data={rows}
        error={status === 'error' ? 'Refresh failed.' : undefined}
        motion="none"
        series={series}
        status={status}
        x={x}
      >
        <ChartPlot height={240}>
          <Line series="value" />
        </ChartPlot>
      </Chart>
    );

    try {
      await act(async () => root.render(view('ready')));
      expect(container.querySelector('.lilt-chart__svg')).not.toBeNull();
      expect(container.querySelector('[role="status"]')).toBeNull();

      await act(async () => root.render(view('error')));
      expect(container.querySelector('.lilt-chart__svg')).not.toBeNull();
      expect(container.querySelector('[role="status"]')?.textContent).toBe('Refresh failed.');

      await act(async () => root.render(view('ready')));
      expect(container.querySelector('.lilt-chart__svg')).not.toBeNull();
      expect(container.querySelector('[role="status"]')).toBeNull();
    } finally {
      await act(async () => root.unmount());
      container.remove();
    }
  });
});
