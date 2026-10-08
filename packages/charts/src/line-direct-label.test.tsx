// @vitest-environment jsdom

import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChartPlot } from './chart-plot';
import { Line } from './primitives/line';
import { Chart } from './runtime/chart-runtime';
import type { ChartSeries } from './types';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type Row = { x: number; p50: number; p95: number; p99: number };
const rows: readonly Row[] = [
  { x: 1, p50: 9, p95: 19, p99: 29 },
  { x: 2, p50: 11, p95: 21, p99: 31 },
];
const x = { type: 'number' as const, accessor: (row: Row) => row.x };
const series: readonly ChartSeries<Row>[] = [
  { id: 'p50', label: 'P50', accessor: (row) => row.p50, line: { directLabel: true } },
  { id: 'p95', label: 'P95', accessor: (row) => row.p95, line: { directLabel: true } },
  { id: 'p99', label: 'P99', accessor: (row) => row.p99, line: { directLabel: true } },
];

afterEach(() => vi.restoreAllMocks());

async function renderLabels(height: number, descriptors = series) {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    width: 700,
    height,
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: 700,
    bottom: height,
    toJSON: () => ({}),
  });
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  await act(async () =>
    root.render(
      <Chart
        aria-label="Latency"
        data={rows}
        motion="none"
        series={descriptors}
        x={x}
        y={{ domain: [0, 100] }}
      >
        <ChartPlot height={height} margins={{ top: 5, right: 100, bottom: 5, left: 60 }}>
          <Line series="p50" />
          <Line series="p95" />
          <Line series="p99" />
        </ChartPlot>
      </Chart>,
    ),
  );
  return {
    container,
    cleanup: async () => {
      await act(async () => root.unmount());
      container.remove();
    },
  };
}

describe('line endpoint labels', () => {
  it('keeps crowded labels separated within the plot', async () => {
    const { container, cleanup } = await renderLabels(80);
    try {
      const labels = Array.from(
        container.querySelectorAll<SVGTextElement>('.lilt-chart__direct-label'),
      );
      expect(labels).toHaveLength(3);
      expect(labels.every((label) => label.getAttribute('visibility') !== 'hidden')).toBe(true);
      const positions = labels
        .map((label) => Number(label.getAttribute('y')))
        .sort((a, b) => a - b);
      expect(positions[0]).toBeGreaterThanOrEqual(14);
      expect(positions[2]).toBeLessThanOrEqual(70);
      expect(positions[1] - positions[0]).toBeGreaterThanOrEqual(17);
      expect(positions[2] - positions[1]).toBeGreaterThanOrEqual(17);
    } finally {
      await cleanup();
    }
  });

  it('omits labels when the plot cannot hold their collision spacing', async () => {
    const { container, cleanup } = await renderLabels(50);
    try {
      expect(container.querySelectorAll('.lilt-chart__direct-label')).toHaveLength(0);
      expect(container.querySelectorAll('[data-lilt-path]')).toHaveLength(3);
    } finally {
      await cleanup();
    }
  });

  it('hides a long endpoint label when it does not fit the measured gutter', async () => {
    const longSeries = series.map((item) =>
      item.id === 'p95' ? { ...item, label: 'Very long percentile label' } : item,
    );
    const { container, cleanup } = await renderLabels(180, longSeries);
    try {
      const labels = Array.from(
        container.querySelectorAll<SVGTextElement>('.lilt-chart__direct-label'),
      );
      expect(labels).toHaveLength(3);
      const long = labels.find((label) => label.textContent?.includes('Very long'));
      expect(long?.getAttribute('visibility')).toBe('hidden');
      expect(labels.filter((label) => label.getAttribute('visibility') !== 'hidden')).toHaveLength(
        2,
      );
    } finally {
      await cleanup();
    }
  });

  it('uses the rendered glyph width when the font is wider than a character estimate', async () => {
    const original = Object.getOwnPropertyDescriptor(SVGElement.prototype, 'getComputedTextLength');
    Object.defineProperty(SVGElement.prototype, 'getComputedTextLength', {
      configurable: true,
      value(this: SVGElement) {
        return this.textContent?.startsWith('P95') ? 110 : 55;
      },
    });
    try {
      const { container, cleanup } = await renderLabels(180);
      try {
        const labels = Array.from(
          container.querySelectorAll<SVGTextElement>('.lilt-chart__direct-label'),
        );
        expect(
          labels.find((label) => label.textContent?.startsWith('P95'))?.getAttribute('visibility'),
        ).toBe('hidden');
        expect(
          labels.filter((label) => label.getAttribute('visibility') !== 'hidden'),
        ).toHaveLength(2);
      } finally {
        await cleanup();
      }
    } finally {
      if (original) Object.defineProperty(SVGElement.prototype, 'getComputedTextLength', original);
      else Reflect.deleteProperty(SVGElement.prototype, 'getComputedTextLength');
    }
  });

  it('uses rendered text bounds when SVG text metrics are unavailable', async () => {
    vi.spyOn(SVGElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: SVGElement,
    ) {
      const width =
        this.tagName.toLowerCase() === 'text'
          ? this.textContent?.startsWith('P95')
            ? 110
            : 55
          : 700;
      return {
        width,
        height: 180,
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        right: width,
        bottom: 180,
        toJSON: () => ({}),
      };
    });
    const { container, cleanup } = await renderLabels(180);
    try {
      const labels = Array.from(
        container.querySelectorAll<SVGTextElement>('.lilt-chart__direct-label'),
      );
      expect(
        labels.find((label) => label.textContent?.startsWith('P95'))?.getAttribute('visibility'),
      ).toBe('hidden');
      expect(labels.filter((label) => label.getAttribute('visibility') !== 'hidden')).toHaveLength(
        2,
      );
    } finally {
      await cleanup();
    }
  });
});
