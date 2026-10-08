// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LineChartCard } from '../cards/line-chart-card';
import { hasYGutter, resolveAxis, resolvePillPosition } from '../interaction/axis-cursor';
import type { ChartAxis } from '../types';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const rect = {
  width: 700,
  height: 240,
  x: 0,
  y: 0,
  top: 0,
  left: 0,
  right: 700,
  bottom: 240,
  toJSON: () => ({}),
} as DOMRect;

const day = (index: number) => new Date(Date.UTC(2026, 8, 1 + index));
const latency = Array.from({ length: 12 }, (_, index) => ({
  date: day(index),
  p95: 180 + ((index * 37) % 140),
}));

async function renderCard(axis: ChartAxis) {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  await act(async () =>
    root.render(
      <LineChartCard
        motion="none"
        title="Latency"
        data={latency}
        x="date"
        series={[{ key: 'p95', label: 'p95', color: '#3366ff' }]}
        axis={axis}
      />,
    ),
  );
  await act(async () => new Promise((resolve) => setTimeout(resolve, 300)));
  return {
    host,
    unmount: () => {
      act(() => root.unmount());
      host.remove();
    },
  };
}

const segments = (host: HTMLElement, axis: 'x' | 'y') =>
  host.querySelectorAll(`.lilt-chart__${axis}-axis .lilt-chart__axis-segment`);

beforeEach(() => {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(rect);
});
afterEach(() => vi.restoreAllMocks());

describe('resolveAxis', () => {
  it('applies one preset to both axes, or one per axis with minimal for the other', () => {
    expect(resolveAxis(undefined)).toEqual({ x: 'minimal', y: 'minimal' });
    expect(resolveAxis('segmented')).toEqual({ x: 'segmented', y: 'segmented' });
    expect(resolveAxis({ y: 'segmented' })).toEqual({ x: 'minimal', y: 'segmented' });
    expect(resolveAxis({ x: 'dots', y: { style: 'segmented', gradient: true } })).toEqual({
      x: 'dots',
      y: 'segmented',
      yGradient: true,
    });
  });
});

describe('segmented axis', { timeout: 15_000 }, () => {
  it('draws rounded segments between ticks on both axes, with y labels in the gutter', async () => {
    const { host, unmount } = await renderCard('segmented');
    try {
      const y = segments(host, 'y');
      const x = segments(host, 'x');
      expect(y.length).toBeGreaterThan(1);
      expect(x.length).toBeGreaterThan(1);
      // No continuous baseline or grid; segments stand in for both.
      expect(host.querySelector('.lilt-chart__axis-baseline')).toBeNull();
      expect(host.querySelector('.lilt-chart__grid line')).toBeNull();
      const yAxis = host.querySelector('.lilt-chart__y-axis')!;
      expect(yAxis.getAttribute('data-inline')).toBeNull();
      expect(yAxis.querySelectorAll('.lilt-chart__axis-label').length).toBeGreaterThan(1);
      const [first] = y;
      expect(first!.getAttribute('rx')).toBe('2.5');
      expect(host.querySelector('[data-lilt-axis]')?.getAttribute('data-lilt-axis')).toBe(
        'segmented',
      );
    } finally {
      unmount();
    }
  });

  it('can segment one axis only', async () => {
    const { host, unmount } = await renderCard({ x: 'minimal', y: 'segmented' });
    try {
      expect(segments(host, 'y').length).toBeGreaterThan(1);
      expect(segments(host, 'x')).toHaveLength(0);
      expect(host.querySelector('.lilt-chart__axis-baseline')).not.toBeNull();
      const root = host.querySelector('[data-lilt-axis-y]')!;
      expect(root.getAttribute('data-lilt-axis-x')).toBe('minimal');
      expect(root.getAttribute('data-lilt-axis-y')).toBe('segmented');
      expect(root.getAttribute('data-lilt-axis')).toBeNull();
    } finally {
      unmount();
    }
  });

  it('fades the first series color up the scale with gradient: true', async () => {
    const { host, unmount } = await renderCard({ y: { style: 'segmented', gradient: true } });
    try {
      const stops = [
        ...host.querySelector('.lilt-chart__y-axis linearGradient')!.querySelectorAll('stop'),
      ];
      expect(stops.map((stop) => stop.getAttribute('stop-color'))).toEqual(['#3366ff', '#3366ff']);
      expect(stops.map((stop) => stop.getAttribute('stop-opacity'))).toEqual(['0.22', '1']);
      const id = host.querySelector('.lilt-chart__y-axis linearGradient')!.id;
      for (const segment of segments(host, 'y'))
        expect(segment.getAttribute('fill')).toBe(`url(#${id})`);
    } finally {
      unmount();
    }
  });

  it('spreads your colors along the scale, low values first', async () => {
    const { host, unmount } = await renderCard({
      y: { style: 'segmented', gradient: ['green', 'orange', 'red'] },
    });
    try {
      const gradient = host.querySelector('.lilt-chart__y-axis linearGradient')!;
      const stops = [...gradient.querySelectorAll('stop')];
      expect(
        stops.map((stop) => [stop.getAttribute('offset'), stop.getAttribute('stop-color')]),
      ).toEqual([
        ['0', 'green'],
        ['0.5', 'orange'],
        ['1', 'red'],
      ]);
      // Low values are at the bottom of the plot, so the scale runs upward.
      expect(Number(gradient.getAttribute('y1'))).toBeGreaterThan(
        Number(gradient.getAttribute('y2')),
      );
    } finally {
      unmount();
    }
  });
});

describe('dotted y axis', () => {
  it('keeps its labels in a gutter and puts the value pill on the axis', () => {
    expect(hasYGutter('dots')).toBe(true);
    expect(hasYGutter('classic')).toBe(true);
    expect(hasYGutter('segmented')).toBe(true);
    expect(hasYGutter('inline')).toBe(false);
    expect(hasYGutter('minimal')).toBe(false);
    expect(resolvePillPosition('auto', 'dots')).toBe('axis');
    expect(resolvePillPosition('auto', 'minimal')).toBe('mark');
  });
});
