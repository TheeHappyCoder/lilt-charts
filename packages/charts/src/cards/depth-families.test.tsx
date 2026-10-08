// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { LineChartCard } from './line-chart-card';
import { HeatmapChartCard } from './heatmap-chart-card';
import { OrderBook } from '../finance/order-book';
import { ScatterChartCard } from './scatter-chart-card';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

async function render(element: React.ReactElement) {
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
  await act(async () => root.render(element));
  await act(async () => new Promise((resolve) => setTimeout(resolve, 100)));
  return {
    host,
    unmount: () => {
      act(() => root.unmount());
      host.remove();
      vi.restoreAllMocks();
    },
  };
}

const days = [
  { day: 'Mon', users: 10, target: 12 },
  { day: 'Tue', users: 14, target: 12 },
  { day: 'Wed', users: 12, target: 12 },
];

describe('depth beyond blocks and rings', { timeout: 15_000 }, () => {
  it('draws data lines as lit tubes on their own path, and leaves dashed guides flat', async () => {
    const card = (depth: boolean) => (
      <LineChartCard
        motion="none"
        title="Users"
        data={days}
        x="day"
        series={[{ key: 'users' }, { key: 'target', dashed: true }]}
        depth={depth}
      />
    );
    const flat = await render(card(false));
    const deep = await render(card(true));
    try {
      const flatPath = flat.host.querySelector('[data-lilt-path="users"]')!.getAttribute('d');
      const tube = deep.host.querySelector('[data-lilt-path="users"] [data-lilt-tube]')!;
      const layers = [...tube.querySelectorAll('path')];
      expect(layers.length).toBeGreaterThan(8);
      expect(layers.every((layer) => layer.getAttribute('d') === flatPath)).toBe(true);
      expect(deep.host.querySelector('[data-lilt-path="target"] [data-lilt-tube]')).toBeNull();
      expect(flat.host.querySelector('[data-lilt-tube]')).toBeNull();
    } finally {
      flat.unmount();
      deep.unmount();
    }
  });

  it('raises heatmap tiles without changing what each cell says', async () => {
    const { host, unmount } = await render(
      <HeatmapChartCard
        motion="none"
        title="Activity"
        data={[
          { hour: '9', day: 'Mon', sessions: 3 },
          { hour: '10', day: 'Mon', sessions: 7 },
        ]}
        x="hour"
        y="day"
        value="sessions"
        depth
      />,
    );
    try {
      expect(host.querySelector('.lilt-heatmap-card__grid')?.hasAttribute('data-depth')).toBe(true);
      expect(
        [...host.querySelectorAll('.lilt-heatmap-card__cell')].map((cell) =>
          cell.getAttribute('aria-label'),
        ),
      ).toEqual(['Mon, 9: 3', 'Mon, 10: 7']);
    } finally {
      unmount();
    }
  });

  it('counts order book rows with `levels` and gives each a block with `depth`', async () => {
    const bids = [
      { price: 99, size: 2 },
      { price: 98, size: 4 },
      { price: 97, size: 1 },
    ];
    const asks = [{ price: 101, size: 3 }];
    const { host, unmount } = await render(
      <OrderBook title="Book" bids={bids} asks={asks} levels={2} depth />,
    );
    try {
      expect(host.querySelectorAll('.lilt-order-book__level[data-side="bid"]')).toHaveLength(2);
      expect(host.querySelectorAll('.lilt-order-book__bar')).toHaveLength(3);
      expect(host.querySelector('.lilt-order-book')?.hasAttribute('data-depth')).toBe(true);
    } finally {
      unmount();
    }
  });

  it('shades scatter points as spheres at their exact centers and sizes', async () => {
    const points = [
      { name: 'A', spend: 1, signups: 2 },
      { name: 'B', spend: 3, signups: 5 },
    ];
    const card = (depth: boolean) => (
      <ScatterChartCard
        motion="none"
        title="Campaigns"
        data={points}
        x="spend"
        y="signups"
        label="name"
        depth={depth}
      />
    );
    const flat = await render(card(false));
    const deep = await render(card(true));
    try {
      const geometry = (host: HTMLElement) =>
        [...host.querySelectorAll('.lilt-scatter-card__point')].map((point) => [
          (point as SVGGElement).style.transform,
          point.querySelector('circle')!.getAttribute('r'),
        ]);
      expect(geometry(deep.host)).toEqual(geometry(flat.host));
      const fills = [...deep.host.querySelectorAll('.lilt-scatter-card__point circle')].map(
        (circle) => (circle as SVGCircleElement).style.fill,
      );
      expect(fills.every((fill) => fill.startsWith('url(#'))).toBe(true);
      expect(deep.host.querySelectorAll('radialGradient').length).toBeGreaterThan(0);
    } finally {
      flat.unmount();
      deep.unmount();
    }
  });
});
