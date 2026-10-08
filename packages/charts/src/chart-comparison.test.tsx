// @vitest-environment jsdom
import { act, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import { Chart, useChartComparison } from './runtime/chart-runtime';
import { ChartPlot } from './chart-plot';
import { Tooltip } from './interaction/tooltip';
import { Legend } from './interaction/legend';
import { createChartController } from './interaction/chart-controller';
import { ComparisonDetails } from './toolkit/comparison-details';
import { Line } from './primitives/line';
import { Bar } from './primitives/bar';
import { Area } from './primitives/area';
import type {
  ChartComparisonContext,
  ChartComparisonResult,
  ChartPlotProps,
  ChartSeries,
} from './types';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
afterEach(() => vi.restoreAllMocks());

type Row = { x: number; revenue: number | null; previous: number | null };
const rows: Row[] = [
  { x: 1, revenue: 100, previous: 200 },
  { x: 2, revenue: 150, previous: 180 },
  { x: 3, revenue: 200, previous: 100 },
];
const series: readonly ChartSeries<Row>[] = [
  {
    id: 'revenue',
    label: 'Revenue',
    accessor: (row) => row.revenue,
    formatValue: (value) => `$${value}`,
  },
  {
    id: 'previous',
    label: 'Previous',
    accessor: (row) => row.previous,
    formatValue: (value) => `${value} units`,
  },
];
const x = { type: 'number' as const, accessor: (row: Row) => row.x };

function setup(width = 700) {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    width,
    height: 340,
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: width,
    bottom: 340,
    toJSON: () => ({}),
  });
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  return {
    host,
    root,
    dispose: async () => {
      await act(async () => root.unmount());
      host.remove();
    },
  };
}

it('exposes all visible series to a header and callback without inserting comparison content', async () => {
  const { host, root, dispose } = setup();
  const controller = createChartController();
  const change = vi.fn();
  let current: ChartComparisonContext | null = null;
  function Header() {
    current = useChartComparison();
    return (
      <header>
        {current?.series.map((row) => (
          <span key={row.id}>
            {row.label}: {row.formattedChange}
          </span>
        ))}
      </header>
    );
  }
  try {
    await act(async () =>
      root.render(
        <Chart
          aria-label="Headless comparison"
          data={rows}
          series={series}
          x={x}
          motion="none"
          controller={controller}
          compare={{ series: 'previous', onChange: change }}
          focus
        >
          <Header />
          <ChartPlot tooltip={<Tooltip />}>
            <Line series="revenue" />
            <Line series="previous" />
          </ChartPlot>
          <Legend renderDifference={(difference) => difference.formattedChange} />
        </Chart>,
      ),
    );
    await act(async () => controller.setComparison({ startX: 1, endX: 3, series: 'previous' }));
    expect(host.querySelector('header')?.textContent).toBe('Revenue: +$100Previous: −100 units');
    expect(host.querySelector('.lilt-chart__comparison-tooltip')).toBeNull();
    expect(host.querySelector('.lilt-comparison-details')).toBeNull();
    expect(
      [...host.querySelectorAll('.lilt-chart__legend-value')].map((item) => item.textContent),
    ).toEqual(['$200', '100 units']);
    expect(
      [...host.querySelectorAll('.lilt-chart__legend-difference')].map((item) => item.textContent),
    ).toEqual(['+$100', '−100 units']);
    const result = change.mock.lastCall?.[0] as ChartComparisonResult;
    expect(
      result.series.map((entry) => [
        entry.id,
        entry.startValue,
        entry.endValue,
        entry.absoluteChange,
        entry.percentageChange,
      ]),
    ).toEqual([
      ['revenue', 100, 200, 100, 100],
      ['previous', 200, 100, -100, -50],
    ]);
    await act(async () => current!.focus!());
    expect(controller.getSnapshot().focus).toEqual({ startX: 1, endX: 3 });
    await act(async () => current!.fullRange!());
    expect(controller.getSnapshot().comparison).not.toBeNull();
    await act(async () => current!.clear());
    expect(host.querySelector('header')?.textContent).toBe('');
    expect(change).toHaveBeenLastCalledWith(null);
  } finally {
    await dispose();
  }
});

for (const layout of ['continuous', 'bars', 'stacked', 'stacked-bars'] as const) {
  it(`${layout}: renders every series only when tooltip comparison is explicitly composed`, async () => {
    const { host, root, dispose } = setup();
    const controller = createChartController();
    controller.setComparison({ startX: 1, endX: 3, series: 'previous' });
    const marks: ReactNode = layout.includes('bars') ? (
      <>
        <Bar series="revenue" />
        <Bar series="previous" />
      </>
    ) : layout === 'stacked' ? (
      <>
        <Area series="revenue" />
        <Area series="previous" />
      </>
    ) : (
      <>
        <Line series="revenue" />
        <Line series="previous" />
      </>
    );
    try {
      await act(async () =>
        root.render(
          <Chart
            aria-label="Composed comparison"
            data={rows}
            series={series}
            x={x}
            motion="none"
            controller={controller}
            compare
            focus
          >
            <ChartPlot
              {...((
                {
                  continuous: {},
                  bars: { bars: true },
                  stacked: { stack: true },
                  'stacked-bars': { bars: true, stack: true },
                } as const
              )[layout] satisfies ChartPlotProps)}
              tooltip={
                <Tooltip
                  renderComparison={(comparison) => <ComparisonDetails comparison={comparison} />}
                />
              }
            >
              {marks}
            </ChartPlot>
          </Chart>,
        ),
      );
      const tooltip = host.querySelector('.lilt-chart__comparison-tooltip')!;
      expect(tooltip).not.toBeNull();
      expect(tooltip.querySelectorAll('[data-comparison-series]')).toHaveLength(2);
      expect(tooltip.textContent).toContain('+$100');
      expect(tooltip.textContent).toContain('−100 units');
      expect(tooltip.querySelector('[data-direction="1"]')).not.toBeNull();
      expect(tooltip.querySelector('[data-direction="-1"]')).not.toBeNull();
      expect(host.querySelectorAll('.lilt-chart__comparison-dot')).toHaveLength(4);
      expect(host.querySelector('table')).toBeNull();
      const end = host.querySelector('[aria-label="Comparison end"]')!;
      await act(async () =>
        end.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true })),
      );
      expect(tooltip.textContent).toContain('+$50');
      expect(tooltip.textContent).toContain('−20 units');
      await act(async () =>
        end.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })),
      );
      expect(tooltip.textContent).toContain('+$100');
      expect(controller.getSnapshot().comparison?.endX).toBe(3);
      await act(async () =>
        (tooltip.querySelector('[aria-label="Clear comparison"]') as HTMLButtonElement).click(),
      );
      expect(host.querySelector('.lilt-chart__comparison-tooltip')).toBeNull();
      expect(document.activeElement).toBe(host.querySelector('.lilt-chart__plot-host'));
    } finally {
      await dispose();
    }
  });
}

it('keeps accepted values during loading, refreshes both series, and preserves null and zero endpoints', async () => {
  const { host, root, dispose } = setup(320);
  const controller = createChartController();
  controller.setComparison({ startX: 1, endX: 3 });
  const change = vi.fn();
  const next = [
    { x: 1, revenue: 0, previous: 200 },
    { x: 2, revenue: 1, previous: 100 },
    { x: 3, revenue: 50, previous: null },
  ];
  const view = (data: Row[], status: 'ready' | 'loading', visibleSeries?: string[]) => (
    <Chart
      aria-label="Refresh comparison"
      data={data}
      status={status}
      visibleSeries={visibleSeries}
      series={series}
      x={x}
      motion="none"
      controller={controller}
      compare={{ onChange: change }}
    >
      <ChartPlot
        tooltip={
          <Tooltip
            renderComparison={(comparison) => <ComparisonDetails comparison={comparison} />}
          />
        }
      >
        <Line series="revenue" />
        <Line series="previous" />
      </ChartPlot>
    </Chart>
  );
  try {
    await act(async () => root.render(view(rows, 'ready')));
    await act(async () => root.render(view(next, 'loading')));
    expect(host.querySelector('.lilt-chart__comparison-tooltip')?.textContent).toContain('+$100');
    await act(async () => root.render(view(next, 'ready')));
    const result = change.mock.lastCall?.[0] as ChartComparisonResult;
    expect(result.series[0]).toMatchObject({
      startValue: 0,
      endValue: 50,
      absoluteChange: 50,
      percentageChange: null,
    });
    expect(result.series[1]).toMatchObject({
      startValue: 200,
      endValue: null,
      absoluteChange: null,
    });
    expect(host.querySelector('.lilt-chart__adaptive-readout')).toBeNull();
    expect(host.querySelector('.lilt-chart__comparison-tooltip')?.textContent).toContain('No data');
    await act(async () => root.render(view(next, 'ready', ['previous'])));
    expect(
      (change.mock.lastCall?.[0] as ChartComparisonResult).series.map((entry) => entry.id),
    ).toEqual(['previous']);
    await act(async () => root.render(view(next, 'ready', [])));
    expect(change).toHaveBeenLastCalledWith(null);
    expect(host.querySelector('.lilt-chart__comparison-tooltip')).toBeNull();
  } finally {
    await dispose();
  }
});
