// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AreaChartCard } from './area-chart-card';
import { BarChartCard } from './bar-chart-card';
import { LineChartCard } from './line-chart-card';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const DAY = 86_400_000;
const days = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    date: new Date(Date.UTC(2026, 8, 30) - (count - 1 - index) * DAY),
    visits: 100 + ((index * 37) % 23),
  }));

/** Frames run only when the test steps them, at the time it chooses. */
function manualFrames() {
  let now = 0;
  let queue: FrameRequestCallback[] = [];
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    queue.push(callback);
    return queue.length;
  });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
  return async (to: number) => {
    now = to;
    const run = queue;
    queue = [];
    await act(async () => run.forEach((callback) => callback(now)));
  };
}

function measure() {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
    width: 600,
    height: 240,
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: 600,
    bottom: 240,
    toJSON: () => ({}),
  } as DOMRect);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('period morph', () => {
  it('glides a longer period in from the edge instead of cross-fading', async () => {
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
      width: 600,
      height: 240,
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 600,
      bottom: 240,
      toJSON: () => ({}),
    } as DOMRect);
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    const card = (count: number) => (
      <AreaChartCard
        title="Visits"
        data={days(count)}
        x="date"
        series={[{ key: 'visits', label: 'Visits' }]}
      />
    );
    try {
      const step = manualFrames();
      await act(async () => root.render(card(10)));
      await step(1000);
      const settled = host.querySelector('.lilt-chart__area path, path.lilt-chart__area');
      expect(settled).not.toBeNull();

      await act(async () => root.render(card(20)));
      // The light motion blur passes over the plot as the period changes.
      expect(host.querySelector('.lilt-chart__svg [data-lilt-snap]')).not.toBeNull();
      await step(1001);
      await step(1001 + 120);
      expect(host.querySelectorAll('.lilt-chart__area').length).toBe(1);
      const early = host.querySelector('.lilt-chart__area')!.outerHTML;
      await step(1001 + 310);
      // Mid-morph: one area, not an old and a new one fading over each other.
      expect(host.querySelectorAll('.lilt-chart__area').length).toBe(1);
      const middle = host.querySelector('.lilt-chart__area')!.outerHTML;
      expect(middle).not.toBe(early);

      await step(1001 + 700);
      await step(1001 + 720);
      expect(host.querySelectorAll('.lilt-chart__area').length).toBe(1);
      // It keeps moving after the midpoint and lands on a different shape.
      expect(host.querySelector('.lilt-chart__area')!.outerHTML).not.toBe(middle);
    } finally {
      act(() => root.unmount());
      host.remove();
    }
  });

  it('glides the y scale in one layer when a series is hidden', async () => {
    measure();
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    const rows = days(12).map((row, index) => ({ ...row, signups: 900 + index * 40 }));
    try {
      const step = manualFrames();
      await act(async () =>
        root.render(
          <LineChartCard
            title="Growth"
            data={rows}
            x="date"
            series={[
              { key: 'visits', label: 'Visits' },
              { key: 'signups', label: 'Signups' },
            ]}
          />,
        ),
      );
      await step(1000);
      await step(2000);
      // The remaining line redraws as its scale moves.
      const ticks = () => host.querySelector('.lilt-chart__line--visits')?.outerHTML ?? '';
      const before = ticks();
      const hide = host.querySelector<HTMLButtonElement>(
        'button[aria-label^="Signups:"][aria-label$="press to hide"]',
      );
      expect(hide).not.toBeNull();
      await act(async () => hide!.click());
      await step(2001);
      await step(2001 + 200);
      // One layer whose scale is on its way, never two charts fading over each other.
      expect(host.querySelectorAll('.lilt-chart__data-layer').length).toBe(1);
      const during = ticks();
      expect(during).not.toBe(before);
      await step(2001 + 600);
      await step(2001 + 620);
      expect(ticks()).not.toBe(during);
      expect(host.querySelectorAll('.lilt-chart__data-layer').length).toBe(1);
    } finally {
      act(() => root.unmount());
      host.remove();
    }
  });

  it('snaps bars: new days rise in blurred, leaving days drain away, the rest stay', async () => {
    measure();
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    const card = (count: number) => (
      <BarChartCard
        title="Orders"
        data={days(count)}
        x="date"
        series={[{ key: 'visits', label: 'Orders' }]}
      />
    );
    const layers = () => host.querySelectorAll('.lilt-chart__data-layer').length;
    const settled = () => host.querySelectorAll('[data-lilt-bar]').length;
    const leaving = () => host.querySelectorAll('[data-lilt-leaving]').length;
    const blurred = () =>
      [...host.querySelectorAll<SVGGElement>('.lilt-chart__bars > g')].filter((group) =>
        group.style.filter.startsWith('blur('),
      ).length;
    try {
      const step = manualFrames();
      await act(async () => root.render(card(7)));
      await step(1000);
      await step(2000);
      expect(settled()).toBe(7);

      await act(async () => root.render(card(21)));
      // Likewise the new days start drained and invisible, not at full height.
      expect(blurred()).toBeGreaterThan(0);
      // An all-bar chart pulses its bars, never the whole plot as well.
      expect(host.querySelector('.lilt-chart__bars[data-lilt-snap]')).not.toBeNull();
      expect(host.querySelectorAll('.lilt-chart__svg [data-lilt-snap]').length).toBe(1);
      await step(2001);
      await step(2001 + 80);
      // One layer; the fourteen new days arrive soft-focused while they rise.
      expect(layers()).toBe(1);
      expect(settled()).toBe(21);
      expect(blurred()).toBeGreaterThan(0);
      await step(2001 + 1500);
      await step(2001 + 1520);
      expect(blurred()).toBe(0);

      await step(4000);
      await act(async () => root.render(card(7)));
      // Before a single frame runs, the old bars are still where they were: the finished layout
      // must never flash on screen ahead of the snap.
      expect(leaving()).toBe(14);
      await step(4001);
      await step(4001 + 150);
      // The fourteen leaving days are still drawn, draining, beside the seven that stay.
      expect(leaving()).toBe(14);
      expect(settled()).toBe(7);
      await step(4001 + 1500);
      await step(4001 + 1520);
      expect(leaving()).toBe(0);
      expect(settled()).toBe(7);
    } finally {
      act(() => root.unmount());
      host.remove();
    }
  });

  it('brings bars in on first load the way new bars arrive', async () => {
    measure();
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    const groups = () => [...host.querySelectorAll<SVGGElement>('.lilt-chart__bars > g')];
    try {
      const step = manualFrames();
      await act(async () =>
        root.render(
          <BarChartCard
            title="Orders"
            data={days(8)}
            x="date"
            series={[{ key: 'visits', label: 'Orders' }]}
          />,
        ),
      );
      // The first painted frame already has every bar soft-focused at the floor.
      expect(groups().length).toBe(8);
      expect(groups().every((group) => group.style.filter.startsWith('blur('))).toBe(true);
      await step(1);
      await step(260);
      await step(1600);
      await step(1620);
      expect(groups().some((group) => group.style.filter.startsWith('blur('))).toBe(false);
      expect(host.querySelectorAll('[data-lilt-bar]').length).toBe(8);
    } finally {
      act(() => root.unmount());
      host.remove();
    }
  });
});
