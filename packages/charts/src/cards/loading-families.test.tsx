// @vitest-environment jsdom
import { act, cloneElement, type ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ActivityRingCard } from './activity-ring-card';
import { BoxPlotCard } from './box-plot-card';
import { ComboChartCard } from './combo-chart-card';
import { FunnelChartCard } from './funnel-chart-card';
import { HeatmapChartCard } from './heatmap-chart-card';
import { HorizontalBarChartCard } from './horizontal-bar-chart-card';
import { LineChartCard } from './line-chart-card';
import { ProgressCard } from './progress-card';
import { RadarChartCard } from './radar-chart-card';
import { RangeChartCard } from './range-chart-card';
import { SankeyChartCard } from './sankey-chart-card';
import { ScatterChartCard } from './scatter-chart-card';
import { SlopeChartCard } from './slope-chart-card';
import { StatCard } from './stat-card';
import { CandlestickChartCard } from '../finance/cards/candlestick-chart-card';
import { DepthChartCard } from '../finance/cards/depth-chart-card';
import { IndicatorChartCard } from '../finance/cards/indicator-chart-card';
import { PortfolioChartCard } from '../finance/cards/portfolio-chart-card';
import { PriceChartCard } from '../finance/cards/price-chart-card';
import { OrderBook } from '../finance/order-book';
import type { ChartLoadingStyle } from '../types';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const rows = Array.from({ length: 5 }, (_, index) => ({
  label: `Category ${index}`,
  x: index + 1,
  value: 50 + index * 8,
  other: 40 + index * 4,
  low: 40 + index * 8,
  high: 60 + index * 8,
  samples: [40, 46, 50, 53, 60].map((value) => value + index * 8),
}));
const candles = Array.from({ length: 36 }, (_, index) => ({
  date: new Date(2026, 8, index + 1),
  open: 50 + index,
  close: 51 + index,
  low: 48 + index,
  high: 54 + index,
  volume: 200 + index * 10,
  basis: 45 + index,
}));
const book = {
  bids: [
    { price: 49, size: 120 },
    { price: 48, size: 200 },
  ],
  asks: [
    { price: 50, size: 160 },
    { price: 51, size: 240 },
  ],
};
type LoadingProps = {
  loading: boolean;
  loadingStyle: ChartLoadingStyle;
  motion: 'none' | 'auto';
  depth: boolean;
};
type FamilyCase = {
  name: string;
  render: (props: LoadingProps) => ReactElement;
  kind?: string;
  panes?: number;
  depth?: boolean;
};
const families: FamilyCase[] = [
  {
    name: 'line',
    render: (props) => (
      <LineChartCard {...props} title="Metric" data={rows} x="label" series={[{ key: 'value' }]} />
    ),
  },
  {
    name: 'combo',
    render: (props) => (
      <ComboChartCard
        {...props}
        title="Metric"
        data={rows}
        x="label"
        bars={[{ key: 'value' }]}
        lines={[{ key: 'other' }]}
      />
    ),
  },
  {
    name: 'ranking',
    render: (props) => (
      <HorizontalBarChartCard
        {...props}
        title="Metric"
        data={rows}
        category="label"
        value="value"
      />
    ),
  },
  {
    name: 'progress',
    render: (props) => <ProgressCard {...props} title="Metric" value={120} target={200} />,
  },
  {
    name: 'gauge',
    render: (props) => (
      <ProgressCard {...props} title="Metric" value={120} target={200} variant="gauge" />
    ),
  },
  {
    name: 'activity',
    render: (props) => (
      <ActivityRingCard
        {...props}
        title="Metric"
        data={[
          { hour: 0, count: 20 },
          { hour: 6, count: 50 },
        ]}
        hour="hour"
        value="count"
        bucketMinutes={360}
        maximum={100}
      />
    ),
  },
  {
    name: 'funnel',
    render: (props) => (
      <FunnelChartCard
        {...props}
        title="Metric"
        data={[
          { stage: 'Visit', value: 100 },
          { stage: 'Sign up', value: 60 },
        ]}
        category="stage"
        value="value"
      />
    ),
  },
  {
    name: 'heatmap',
    render: (props) => (
      <HeatmapChartCard
        {...props}
        title="Metric"
        data={[{ day: 'Mon', hour: '00', value: 10 }]}
        x="hour"
        y="day"
        value="value"
      />
    ),
  },
  {
    name: 'scatter',
    render: (props) => <ScatterChartCard {...props} title="Metric" data={rows} x="x" y="value" />,
  },
  {
    name: 'sankey',
    render: (props) => (
      <SankeyChartCard
        {...props}
        title="Metric"
        data={[
          { from: 'A', to: 'B', value: 100 },
          { from: 'B', to: 'C', value: 80 },
        ]}
        source="from"
        target="to"
        value="value"
      />
    ),
  },
  {
    name: 'radar',
    depth: false,
    render: ({ loading, loadingStyle, motion }) => (
      <RadarChartCard
        title="Metric"
        data={rows}
        category="label"
        series={[{ key: 'value' }]}
        domain={[0, 100]}
        loading={loading}
        loadingStyle={loadingStyle}
        motion={motion}
      />
    ),
  },
  {
    name: 'slope',
    render: (props) => (
      <SlopeChartCard
        {...props}
        title="Metric"
        data={rows}
        category="label"
        from="other"
        to="value"
      />
    ),
  },
  {
    name: 'dumbbell',
    render: (props) => (
      <SlopeChartCard
        {...props}
        title="Metric"
        data={rows}
        category="label"
        from="other"
        to="value"
        variant="dumbbell"
      />
    ),
  },
  {
    name: 'stat-line',
    render: (props) => <StatCard {...props} title="Metric" data={rows} x="label" value="value" />,
  },
  {
    name: 'stat-bars',
    render: (props) => (
      <StatCard {...props} title="Metric" data={rows} x="label" value="value" chart="bars" />
    ),
  },
  {
    name: 'stat-meter',
    render: (props) => (
      <StatCard {...props} title="Metric" data={rows} value="value" chart="meter" target={500} />
    ),
  },
  {
    name: 'stat-ring',
    render: (props) => (
      <StatCard {...props} title="Metric" data={rows} value="value" chart="ring" target={500} />
    ),
  },
  {
    name: 'range',
    kind: 'range',
    render: (props) => (
      <RangeChartCard
        {...props}
        title="Metric"
        data={rows}
        x="label"
        low="low"
        high="high"
        value="value"
      />
    ),
  },
  {
    name: 'error',
    kind: 'error',
    depth: false,
    render: (props) => (
      <RangeChartCard
        {...props}
        title="Metric"
        data={rows}
        x="label"
        low="low"
        high="high"
        value="value"
        display="error"
      />
    ),
  },
  {
    name: 'boxplot',
    kind: 'boxplot',
    render: (props) => (
      <BoxPlotCard {...props} title="Metric" data={rows} x="label" samples="samples" />
    ),
  },
  {
    name: 'candlestick',
    kind: 'candle',
    panes: 2,
    render: (props) => (
      <CandlestickChartCard
        {...props}
        title="Metric"
        data={candles}
        x="date"
        open="open"
        high="high"
        low="low"
        close="close"
        volume="volume"
      />
    ),
  },
  {
    name: 'indicator',
    kind: 'candle',
    panes: 3,
    render: (props) => (
      <IndicatorChartCard
        {...props}
        title="Metric"
        data={candles}
        x="date"
        open="open"
        high="high"
        low="low"
        close="close"
      />
    ),
  },
  {
    name: 'price',
    render: (props) => (
      <PriceChartCard
        {...props}
        title="Metric"
        data={candles}
        x="date"
        price="close"
        symbol="SOL"
      />
    ),
  },
  { name: 'depth', render: (props) => <DepthChartCard {...props} title="Metric" {...book} /> },
  {
    name: 'orderbook',
    render: (props) => <OrderBook {...props} title="Metric" {...book} levels={2} />,
  },
  {
    name: 'portfolio',
    panes: 2,
    render: (props) => (
      <PortfolioChartCard
        {...props}
        title="Metric"
        data={candles}
        x="date"
        value="close"
        basis="basis"
      />
    ),
  },
];

beforeEach(() => {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
    width: 600,
    height: 260,
    top: 0,
    left: 0,
    bottom: 260,
    right: 600,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect);
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
      unobserve() {}
    },
  );
});
afterEach(() => vi.restoreAllMocks());

async function renderFamily(
  family: FamilyCase,
  loadingStyle: ChartLoadingStyle,
  depth = true,
  motion: 'none' | 'auto' = 'none',
) {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  const props = { loading: true, loadingStyle, motion, depth };
  await act(async () => root.render(family.render(props)));
  for (
    let attempt = 0;
    attempt < 30 && !host.querySelector('.lilt-skeleton, .lilt-chart__loading');
    attempt++
  ) {
    await act(async () => new Promise((resolve) => setTimeout(resolve, 25)));
  }
  return {
    host,
    ready: () =>
      act(async () => {
        root.render(family.render({ ...props, loading: false }));
        await new Promise((resolve) => setTimeout(resolve, 40));
      }),
    unmount: () => {
      act(() => root.unmount());
      host.remove();
    },
  };
}

describe('family loading styles', { timeout: 15_000 }, () => {
  for (const loadingStyle of ['shimmer', 'draw', 'breathe'] as const) {
    it.each(families)(
      '$name keeps its topology, all panes, and static reduced-motion paint in ' + loadingStyle,
      async (family) => {
        const view = await renderFamily(family, loadingStyle);
        try {
          const loaders = [...view.host.querySelectorAll('.lilt-skeleton, .lilt-chart__loading')];
          expect(loaders.length).toBeGreaterThanOrEqual(family.panes ?? 1);
          for (const loader of loaders) {
            expect(loader.getAttribute('data-style')).toBe(loadingStyle);
            expect(loader.getAttribute('data-reduced-motion')).toBe('true');
            expect(loader.getAttribute('style')).toContain('--lilt-skeleton-clock');
          }
          if (family.kind) expect(loaders[0]?.getAttribute('data-loading-mark')).toBe(family.kind);
          if (family.depth === false) expect(loaders[0]?.hasAttribute('data-depth')).toBe(false);
          else
            expect(
              loaders[0]?.hasAttribute('data-depth') ||
                loaders[0]?.querySelector('[data-depth], [data-lilt-tube]') !== null,
            ).toBe(true);
          expect(
            view.host.querySelector('.lilt-chart__skeleton-sheen, .lilt-skeleton__sweep'),
          ).toBeNull();
          expect(view.host.querySelector('.lilt-chart__status--error')).toBeNull();
          expect(view.host.querySelector('.lilt-card__value')?.textContent ?? '').not.toMatch(/\d/);
          const ids = [...view.host.querySelectorAll('[id]')].map((node) => node.id);
          expect(new Set(ids).size).toBe(ids.length);
          const paths = [...view.host.querySelectorAll('path')]
            .map((node) => node.getAttribute('d') ?? '')
            .join('');
          expect(paths).not.toMatch(/NaN|Infinity/);
          await view.ready();
          expect(view.host.querySelector('.lilt-skeleton, .lilt-chart__loading')).toBeNull();
          expect(view.host.textContent).not.toContain('Loading order book');
        } finally {
          view.unmount();
        }
      },
    );
  }

  // Draw and breathe move each mark on its own, offset by its step, never the whole placeholder
  // as one wipe or one pulse. These cases have a single mark to move: one line, ring, block,
  // cell, or profile.
  const singleMark = [
    'line',
    'progress',
    'gauge',
    'heatmap',
    'radar',
    'stat-line',
    'stat-meter',
    'stat-ring',
    'price',
    'depth',
    'portfolio',
  ];
  it.each(families.filter((family) => !singleMark.includes(family.name)))(
    '$name moves its placeholder mark by mark',
    async (family) => {
      const view = await renderFamily(family, 'draw');
      try {
        const steps = [...view.host.querySelectorAll<HTMLElement | SVGElement>('[style]')]
          .map((node) => node.style.getPropertyValue('--lilt-skeleton-step'))
          .filter((step) => step !== '');
        expect(new Set(steps).size).toBeGreaterThanOrEqual(2);
      } finally {
        view.unmount();
      }
    },
  );

  it.each(families.filter((family) => family.depth !== false))(
    '$name follows flat paint when depth is off',
    async (family) => {
      const view = await renderFamily(family, 'breathe', false);
      try {
        expect(
          view.host.querySelector('.lilt-skeleton[data-depth], .lilt-chart__loading[data-depth]'),
        ).toBeNull();
        expect(
          view.host.querySelector(
            '.lilt-skeleton [data-lilt-tube], .lilt-chart__loading [data-lilt-tube], .lilt-skeleton radialGradient',
          ),
        ).toBeNull();
      } finally {
        view.unmount();
      }
    },
  );

  // Every family leaves its skeleton the same way (lifecycle/skeleton-exit.tsx): when data lands
  // the skeleton is marked to freeze and sink, and soon after it is gone and the data is drawn.
  it.each(families)('$name leaves its skeleton through the shared exit', async (family) => {
    const view = await renderFamily(family, 'breathe', true, 'auto');
    try {
      await act(async () => {
        await view.ready();
      });
      expect(view.host.querySelector('[data-skeleton-leaving]')).not.toBeNull();
      await act(async () => new Promise((resolve) => setTimeout(resolve, 900)));
      expect(view.host.querySelector('[data-skeleton-leaving]')).toBeNull();
      expect(view.host.querySelector('.lilt-skeleton, .lilt-chart__loading')).toBeNull();
    } finally {
      view.unmount();
    }
  });
});

describe('card header composition across families', () => {
  it.each(families)('$name keeps its graphic while removing header content', async (family) => {
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    const base = family.render({
      loading: false,
      loadingStyle: 'shimmer',
      motion: 'none',
      depth: false,
    });
    const card = (header: boolean, title: string | undefined) =>
      cloneElement(
        base as ReactElement<{ header?: boolean; title?: string; 'aria-label'?: string }>,
        { header, title, 'aria-label': 'External heading' },
      );
    try {
      await act(async () => root.render(card(true, 'Metric')));
      expect(host.querySelector('.lilt-card__title, .lilt-order-book > caption')).not.toBeNull();
      const plots = host.querySelectorAll('svg, .lilt-stat__meter, .lilt-order-book').length;
      await act(async () => root.render(card(true, undefined)));
      if (family.name !== 'price')
        expect(host.querySelector('.lilt-card__title, .lilt-order-book > caption')).toBeNull();
      await act(async () => root.render(card(false, 'Metric')));
      expect(
        host.querySelector(
          '.lilt-card__header, .lilt-card__title, .lilt-order-book > caption, .lilt-card__stats',
        ),
      ).toBeNull();
      expect(host.querySelector('section')?.getAttribute('aria-label')).toBe('External heading');
      expect(host.querySelectorAll('svg, .lilt-stat__meter, .lilt-order-book').length).toBe(plots);
      expect(host.innerHTML).not.toContain('undefined by');
    } finally {
      await act(async () => root.unmount());
      host.remove();
    }
  });
});

it('hides each shared legend without removing its plot or changing its readings', async () => {
  const cards = [
    <LineChartCard data={rows} x="label" series={[{ key: 'value' }]} motion="none" />,
    <FunnelChartCard data={[...rows].reverse()} category="label" value="value" motion="none" />,
    <RadarChartCard data={rows} category="label" series={[{ key: 'value' }]} motion="none" />,
    <ScatterChartCard data={rows} x="x" y="value" group="label" motion="none" />,
  ];
  for (const card of cards) {
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    try {
      await act(async () => root.render(card));
      expect(host.querySelector('.lilt-chart__legend')).not.toBeNull();
      const headline = host.querySelector('.lilt-card__value')?.textContent;
      const paths = [...host.querySelectorAll('svg path')].map((path) => path.getAttribute('d'));
      await act(async () => root.render(cloneElement(card, { legend: false })));
      expect(host.querySelector('.lilt-chart__legend')).toBeNull();
      expect(host.querySelector('.lilt-card__value')?.textContent).toBe(headline);
      expect([...host.querySelectorAll('svg path')].map((path) => path.getAttribute('d'))).toEqual(
        paths,
      );
    } finally {
      await act(async () => root.unmount());
      host.remove();
    }
  }
});
