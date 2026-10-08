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
const ROWS = 400;
const rows: readonly Row[] = Array.from({ length: ROWS }, (_, x) => ({ x, value: 10 + (x % 17) }));
const x = { type: 'number' as const, accessor: (row: Row) => row.x };

afterEach(() => vi.restoreAllMocks());

describe('chart margins', () => {
  it('does not rebuild the plot when a re-render passes equal inline margins', async () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      width: 480,
      height: 240,
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 480,
      bottom: 240,
      toJSON: () => ({}),
    });
    // Every row's value is formatted when the plot is rebuilt, so the count shows a rebuild.
    const formatValue = vi.fn((value: number) => value.toFixed(1));
    const series: readonly ChartSeries<Row>[] = [
      { id: 'value', label: 'Value', accessor: (row) => row.value, formatValue },
    ];
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    // A card re-renders on every hover and builds its margins inline, as this does.
    const view = () => (
      <Chart aria-label="Margins" data={rows} motion="none" series={series} x={x}>
        <ChartPlot height={240} margins={{ top: 8, right: 0, bottom: 28, left: 0 }}>
          <Line series="value" />
        </ChartPlot>
      </Chart>
    );

    try {
      await act(async () => root.render(view()));
      expect(container.querySelector('.lilt-chart__svg')).not.toBeNull();
      const settled = formatValue.mock.calls.length;
      expect(settled).toBeGreaterThanOrEqual(ROWS);

      for (let render = 0; render < 5; render += 1) await act(async () => root.render(view()));
      expect(formatValue.mock.calls.length - settled).toBeLessThan(ROWS);
    } finally {
      await act(async () => root.unmount());
      container.remove();
    }
  });
});
