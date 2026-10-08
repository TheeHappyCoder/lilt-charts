// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { AreaChartCard } from './area-chart-card';
import { BarChartCard } from './bar-chart-card';
import { LineChartCard } from './line-chart-card';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

async function render(element: React.ReactElement) {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  await act(async () => root.render(element));
  return {
    host,
    unmount: () => {
      act(() => root.unmount());
      host.remove();
    },
  };
}

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

const settle = () => act(async () => new Promise((resolve) => setTimeout(resolve, 300)));

async function hover(plot: Element, clientX: number) {
  for (const x of [clientX, clientX + 4]) {
    await act(async () => {
      plot.dispatchEvent(
        new PointerEvent('pointermove', {
          bubbles: true,
          clientX: x,
          clientY: 120,
          pointerType: 'mouse',
        }),
      );
      await new Promise((resolve) => setTimeout(resolve, 40));
    });
  }
}

const day = (index: number) => new Date(Date.UTC(2026, 8, 1 + index));
const daily = Array.from({ length: 6 }, (_, index) => ({
  date: day(index),
  revenue: 100 + index * 10,
  users: 20 + index,
}));

describe('target', { timeout: 15_000 }, () => {
  it('draws a labeled goal line and counts points on target', async () => {
    const { host, unmount } = await render(
      <BarChartCard
        motion="none"
        title="Orders"
        data={[
          { month: 'Jan', orders: 80 },
          { month: 'Feb', orders: 120 },
          { month: 'Mar', orders: 100 },
        ]}
        x="month"
        series={[{ key: 'orders' }]}
        target={{ value: 100, label: 'Goal' }}
      />,
    );
    try {
      await settle();
      expect(host.querySelector('.lilt-card__target text')?.textContent).toBe('Goal 100');
      expect(host.querySelector('.lilt-card__caption')?.textContent).toBe('2 of 3 on target');
    } finally {
      unmount();
    }
  });

  it('counts at or below the target as on target when a decrease is good', async () => {
    const { host, unmount } = await render(
      <LineChartCard
        motion="none"
        title="Latency"
        data={[
          { hour: '00', p95: 180 },
          { hour: '01', p95: 240 },
          { hour: '02', p95: 200 },
        ]}
        x="hour"
        series={[{ key: 'p95' }]}
        aggregate="mean"
        deltaTone="inverse"
        target={200}
      />,
    );
    try {
      expect(host.querySelector('.lilt-card__caption')?.textContent).toBe('2 of 3 on target');
    } finally {
      unmount();
    }
  });

  it('reads the hovered point against the target', async () => {
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(rect);
    const { host, unmount } = await render(
      <AreaChartCard
        motion="none"
        title="Revenue"
        data={daily}
        x="date"
        series={[{ key: 'revenue' }]}
        target={100}
      />,
    );
    try {
      await settle();
      await hover(host.querySelector('.lilt-chart__svg')!, 690);
      // The last day, 150, is half again over the target of 100.
      expect(host.querySelector('.lilt-card__delta')?.textContent).toBe('+50.0% vs target');
    } finally {
      unmount();
      vi.restoreAllMocks();
    }
  });
});

describe('forecast', { timeout: 15_000 }, () => {
  const projected = daily.map((row, index) =>
    index >= 4
      ? { ...row, low: row.revenue - 15, high: row.revenue + 15 }
      : { ...row, low: null, high: null },
  );

  it('leaves projected rows out of the headline and tiles, and draws them dotted', async () => {
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(rect);
    const { host, unmount } = await render(
      <LineChartCard
        motion="none"
        title="Revenue"
        data={projected}
        x="date"
        series={[{ key: 'revenue', label: 'Revenue' }]}
        forecast={{ from: day(4), lower: 'low', upper: 'high' }}
      />,
    );
    try {
      await settle();
      // 100 + 110 + 120 + 130 measured; 140 and 150 are projections.
      expect(host.querySelector('.lilt-card__value')?.textContent).toContain('460');
      expect(host.querySelector('[data-lilt-status="forecast"]')).not.toBeNull();
      expect(host.querySelector('.lilt-card__forecast')?.textContent).toBe('Forecast');
      expect(host.querySelector('.lilt-chart__interval-band path')).not.toBeNull();
    } finally {
      unmount();
      vi.restoreAllMocks();
    }
  });

  it('captions a hovered projection', async () => {
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(rect);
    const { host, unmount } = await render(
      <AreaChartCard
        motion="none"
        title="Revenue"
        data={daily}
        x="date"
        series={[{ key: 'revenue' }]}
        forecast={{ from: day(4), label: 'Projected' }}
      />,
    );
    try {
      await settle();
      await hover(host.querySelector('.lilt-chart__svg')!, 690);
      expect(host.querySelector('.lilt-card__caption')?.textContent).toBe('Sep 6 · Projected');
    } finally {
      unmount();
      vi.restoreAllMocks();
    }
  });
});

describe('sync', { timeout: 15_000 }, () => {
  it('follows another card in the same group, and lets go when the pointer leaves', async () => {
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(rect);
    const { host, unmount } = await render(
      <div>
        <AreaChartCard
          motion="none"
          title="Revenue"
          data={daily}
          x="date"
          series={[{ key: 'revenue' }]}
          sync="dashboard"
        />
        <BarChartCard
          motion="none"
          title="Users"
          data={daily}
          x="date"
          series={[{ key: 'users' }]}
          sync="dashboard"
        />
        <LineChartCard
          motion="none"
          title="Users elsewhere"
          data={daily}
          x="date"
          series={[{ key: 'users' }]}
          sync="another"
        />
      </div>,
    );
    try {
      await settle();
      const [revenue, users, elsewhere] = [...host.querySelectorAll('.lilt-card')];
      await hover(revenue!.querySelector('.lilt-chart__svg')!, 690);
      await settle();
      expect(users!.querySelector('.lilt-card__caption')?.textContent).toBe('Sep 6');
      expect(users!.querySelector('.lilt-card__value')?.textContent).toContain('25');
      // The follower reads out like the card under the pointer: its own date pill included.
      expect(users!.querySelector('.lilt-chart__x-badge')?.textContent).toBe('Sep 6');
      expect(elsewhere!.querySelector('.lilt-card__caption')).toBeNull();

      await act(async () => {
        revenue!
          .querySelector('.lilt-chart__svg')!
          .dispatchEvent(new PointerEvent('pointerout', { bubbles: true, pointerType: 'mouse' }));
        await new Promise((resolve) => setTimeout(resolve, 60));
      });
      await settle();
      expect(users!.querySelector('.lilt-card__caption')).toBeNull();
    } finally {
      unmount();
      vi.restoreAllMocks();
    }
  });
});
