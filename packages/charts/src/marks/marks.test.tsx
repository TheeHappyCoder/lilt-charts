// @vitest-environment jsdom

import { act, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChartPlot } from '../chart-plot';
import { Candles } from '../finance/candles';
import { Bar } from '../primitives/bar';
import { BoxPlot } from '../primitives/box-plot';
import { ErrorBar } from '../primitives/error-bar';
import { RangeBar } from '../primitives/range-bar';
import { Chart } from '../runtime/chart-runtime';
import type { ChartSeries } from '../types';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type Row = { x: number; open: number; high: number; low: number; close: number };
const rows: Row[] = [
  { x: 0, open: 10, high: 14, low: 9, close: 13 },
  { x: 1, open: 13, high: 13.5, low: 10, close: 11 },
  { x: 2, open: 11, high: 16, low: 10.5, close: 15 },
];
const price: ChartSeries<Row> = {
  id: 'price',
  label: 'Price',
  accessor: (row) => row.close,
  fields: {
    open: { label: 'Open', accessor: (row) => row.open },
    high: { label: 'High', accessor: (row) => row.high },
    low: { label: 'Low', accessor: (row) => row.low },
  },
};

let host: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    width: 640,
    height: 240,
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: 640,
    bottom: 240,
    toJSON: () => ({}),
  });
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.restoreAllMocks();
});

async function render(series: readonly ChartSeries<Row>[], children: ReactNode, bars = false) {
  await act(async () =>
    root.render(
      <Chart
        data={rows}
        series={series}
        x={{ type: 'number', accessor: (row: Row) => row.x }}
        y={{ includeZero: false }}
        aria-label="Marks"
        motion="none"
      >
        <ChartPlot height={240} bars={bars || undefined}>
          {children}
        </ChartPlot>
      </Chart>,
    ),
  );
}

/** Keyboard focus inspects the latest observation, as a reader would. */
async function inspectLatest() {
  const input = host.querySelector<HTMLInputElement>('.lilt-chart__keyboard-input input')!;
  await act(async () => input.focus());
}

describe('column marks', () => {
  it('colors candles by direction and batches them into a few paths', async () => {
    await render([price], <Candles series="price" open="open" high="high" low="low" />);
    const paths = [...host.querySelectorAll('.lilt-chart__candles path')];
    const fills = paths.map((path) => (path as SVGPathElement).style.fill).filter(Boolean);
    const strokes = paths.map((path) => (path as SVGPathElement).style.stroke).filter(Boolean);
    expect(new Set(fills)).toEqual(new Set(['var(--lilt-candle-up)', 'var(--lilt-candle-down)']));
    expect(new Set(strokes)).toEqual(new Set(['var(--lilt-candle-up)', 'var(--lilt-candle-down)']));
    expect(paths).toHaveLength(4);
  });

  it('lets colorAt override a candle color', async () => {
    await render(
      [{ ...price, colorAt: (row) => (row.x === 1 ? 'gold' : undefined) }],
      <Candles series="price" open="open" high="high" low="low" />,
    );
    const fills = [...host.querySelectorAll<SVGPathElement>('.lilt-chart__candles path')].map(
      (path) => path.style.fill,
    );
    expect(fills).toContain('gold');
  });

  it('inspects a column mark with its own highlight instead of a line point', async () => {
    await render([price], <Candles series="price" open="open" high="high" low="low" />);
    await inspectLatest();
    const highlight = host.querySelector('.lilt-chart__candle-highlight');
    expect(highlight).not.toBeNull();
    // The latest candle rose, so its highlight takes the rising color.
    expect(highlight!.querySelector<SVGPathElement>('path[d]')!.style.stroke).toBe(
      'var(--lilt-candle-up)',
    );
    expect(host.querySelector('.lilt-chart__inspection-dot[data-series="price"]')).toBeNull();
  });

  it('slots every observation like a bar, so edge candles stay inside the plot', async () => {
    await render([price], <Candles series="price" open="open" high="high" low="low" />);
    const bodies = host.querySelector('.lilt-chart__candles path[style*="fill"]')!;
    const firstX = Number(/^M([\d.]+)/.exec(bodies.getAttribute('d')!)![1]);
    expect(firstX).toBeGreaterThan(0);
  });

  it('draws range bars, error bars and box plots from named fields', async () => {
    type RangeRow = Row & { q1: number; q3: number };
    const ranged: ChartSeries<Row>[] = [
      {
        ...price,
        accessor: (row) => (row.low + row.high) / 2,
        fields: {
          low: { label: 'Low', accessor: (row) => row.low },
          high: { label: 'High', accessor: (row) => row.high },
          q1: { label: 'Q1', accessor: (row) => (row as RangeRow).low + 0.5 },
          q3: { label: 'Q3', accessor: (row) => (row as RangeRow).high - 0.5 },
        },
      },
    ];
    await render(ranged, <RangeBar series="price" low="low" high="high" />);
    expect(host.querySelectorAll('.lilt-chart__range-bars path')).toHaveLength(1);
    await render(ranged, <ErrorBar series="price" low="low" high="high" />);
    expect(host.querySelectorAll('.lilt-chart__error-bars path')).toHaveLength(2);
    await render(ranged, <BoxPlot series="price" min="low" q1="q1" q3="q3" max="high" />);
    expect(host.querySelectorAll('.lilt-chart__box-plots path')).toHaveLength(2);
    await inspectLatest();
    expect(host.querySelector('.lilt-chart__mark-highlights path')).not.toBeNull();
  });

  it('names the missing field when a mark reads one the series lacks', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(render([price], <RangeBar series="price" low="low" high="top" />)).rejects.toThrow(
      'Lilt RangeBar reads field "top", which series "price" does not define',
    );
    error.mockRestore();
  });
});

describe('colorAt on bars', () => {
  it('colors each bar and its inspection highlight by observation', async () => {
    const volume: ChartSeries<Row> = {
      id: 'volume',
      label: 'Volume',
      accessor: (row) => row.close,
      colorAt: (row) => (row.close >= row.open ? 'green' : 'red'),
    };
    await render([volume], <Bar series="volume" />, true);
    const fills = [...host.querySelectorAll<SVGElement>('[data-lilt-bar]')].map(
      (bar) => bar.getAttribute('fill') ?? bar.style.fill,
    );
    expect(fills.join(' ')).toContain('green');
    expect(fills.join(' ')).toContain('red');
  });
});
