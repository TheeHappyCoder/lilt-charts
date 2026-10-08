// @vitest-environment jsdom
import { scaleLinear } from 'd3-scale';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import { clipTrend, ScatterChartCard, scatterDomain, scatterTrend } from './scatter-chart-card';
import { choosePeriod } from '../test-utils/choose-period';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

interface Campaign {
  campaign: string;
  channel: string;
  spend: number | null;
  signups: number | null;
  reach: number;
}

// Sorted by spend: Brand, Retarget, Video, Launch. Podcast has no spend and is not plotted.
const campaigns: Campaign[] = [
  { campaign: 'Launch', channel: 'Social', spend: 40, signups: 300, reach: 9000 },
  { campaign: 'Brand', channel: 'Search', spend: 10, signups: 120, reach: 2000 },
  { campaign: 'Video', channel: 'Social', spend: 30, signups: 180, reach: 16000 },
  { campaign: 'Retarget', channel: 'Search', spend: 20, signups: 200, reach: 4000 },
  { campaign: 'Podcast', channel: 'Audio', spend: null, signups: 50, reach: 1000 },
];

async function render(element: React.ReactElement) {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  await act(async () => root.render(element));
  return {
    host,
    rerender: (next: React.ReactElement) => act(async () => root.render(next)),
    unmount: () => {
      act(() => root.unmount());
      host.remove();
    },
  };
}

const headline = (host: HTMLElement) => host.querySelector('.lilt-card__value')?.textContent;
const caption = (host: HTMLElement) => host.querySelector('.lilt-card__caption')?.textContent;
const plot = (host: HTMLElement) => host.querySelector<HTMLDivElement>('.lilt-scatter-card__plot')!;
/** Pixel position of a point, read from its transform. */
function positionOf(host: HTMLElement, name: string) {
  const point = host.querySelector<SVGGElement>(`[data-point="${name}"]`)!;
  const [, px, py] = point.style.transform.match(/translate\(([\d.]+)px, ([\d.]+)px\)/)!;
  return { x: Number(px), y: Number(py) };
}

describe('scatter geometry', () => {
  it('rounds domains, anchors near-zero data at zero, and never collapses', () => {
    expect(scatterDomain([10, 40])).toEqual([0, 40]);
    expect(scatterDomain([62, 91])).toEqual([60, 95]);
    expect(scatterDomain([-12, 18])).toEqual([-15, 20]);
    expect(scatterDomain([5, 5])[0]).toBeLessThan(5);
    expect(scatterDomain([])).toEqual([0, 1]);
  });

  it('ends each axis on a tick it draws, so no band of empty scale sits past the last line', () => {
    for (const [values, ticks] of [
      [[0.012, 0.061], 4],
      [[1800, 33800], 5],
      [[0.9, 4.3], 3],
    ] as const) {
      const domain = scatterDomain(values, ticks);
      const drawn = scaleLinear().domain(domain).ticks(ticks);
      expect(drawn[0]).toBeCloseTo(domain[0]);
      expect(drawn.at(-1)).toBeCloseTo(domain[1]);
    }
  });

  it('fits a least-squares trend and reports how well it fits', () => {
    const line = scatterTrend([
      { x: 0, y: 1 },
      { x: 1, y: 3 },
      { x: 2, y: 5 },
    ])!;
    expect(line.slope).toBeCloseTo(2);
    expect(line.intercept).toBeCloseTo(1);
    expect(line.r2).toBeCloseTo(1);
    expect(scatterTrend([{ x: 1, y: 1 }])).toBeNull();
    expect(
      scatterTrend([
        { x: 1, y: 1 },
        { x: 1, y: 2 },
        { x: 1, y: 3 },
      ]),
    ).toBeNull();
  });

  it('clips the trend to the plotted y range', () => {
    expect(clipTrend({ slope: 2, intercept: 0 }, [0, 10], [0, 10])).toEqual([0, 0, 5, 10]);
    expect(clipTrend({ slope: 0, intercept: 20 }, [0, 10], [0, 10])).toBeNull();
  });
});

describe('ScatterChartCard', { timeout: 15_000 }, () => {
  const card = (
    props: Partial<React.ComponentProps<typeof ScatterChartCard<Campaign, 'signups'>>> = {},
  ) => (
    <ScatterChartCard
      motion="none"
      title="Campaigns"
      data={campaigns}
      x="spend"
      y="signups"
      label="campaign"
      xLabel="Spend"
      yLabel="Sign-ups"
      xFormat={{ style: 'currency', currency: 'USD', maximumFractionDigits: 0 }}
      {...props}
    />
  );

  it('plots points with both values and says how many it left out', async () => {
    const { host, unmount } = await render(card());
    try {
      expect(host.querySelectorAll('.lilt-scatter-card__point')).toHaveLength(4);
      expect(host.querySelector('[data-point="Podcast"]')).toBeNull();
      expect(host.querySelector('.lilt-scatter-card__footer')?.textContent).toBe(
        '1 point is missing a value and not plotted',
      );
      // The headline sums plotted sign-ups only.
      expect(headline(host)).toContain('800');
      // The accessible table lists every row, including the one that could not be placed.
      const rows = [...host.querySelectorAll('table.lilt-chart__sr-only tbody tr')].map((row) =>
        [...row.children].map((cell) => cell.textContent),
      );
      expect(rows).toContainEqual(['Podcast', 'No data', '50']);
      expect(rows).toContainEqual(['Brand', '$10', '120']);
      // Axis titles. Sign-ups start well above zero, so the y axis starts at a round 100, while
      // spend starts near zero and is anchored there.
      expect(host.querySelector('.lilt-scatter-card__axis-title')?.textContent).toBe('Sign-ups');
      const labels = [...host.querySelectorAll('.lilt-chart__axis-label')].map(
        (node) => node.textContent,
      );
      expect(labels[0]).toBe('100');
      expect(labels).toContain('$0');
    } finally {
      unmount();
    }
  });

  it('reads the point under the pointer and marks it on both axes', async () => {
    const { host, unmount } = await render(card());
    try {
      const video = positionOf(host, 'Video');
      await act(async () => {
        plot(host).dispatchEvent(
          new PointerEvent('pointermove', { bubbles: true, clientX: video.x, clientY: video.y }),
        );
      });
      expect(headline(host)).toContain('180');
      expect(caption(host)).toBe('Video · Spend $30');
      expect(host.querySelector('[data-point="Video"]')?.hasAttribute('data-active')).toBe(true);
      expect(host.querySelectorAll('.lilt-scatter-card__point[data-muted]')).toHaveLength(3);
      expect(host.querySelector('.lilt-chart__x-badge')?.textContent).toBe('$30');
      expect(host.querySelector('.lilt-chart__y-badge')?.textContent).toBe('180');
      expect(host.querySelector('.lilt-chart__sr-only[aria-live]')?.textContent).toBe(
        'Video: Spend $30, Sign-ups 180',
      );
      // Far from every point, nothing is read.
      await act(async () => {
        plot(host).dispatchEvent(
          new PointerEvent('pointermove', { bubbles: true, clientX: 1, clientY: 1 }),
        );
      });
      expect(headline(host)).toContain('800');
      expect(host.querySelector('.lilt-chart__x-badge')).toBeNull();
    } finally {
      unmount();
    }
  });

  it('steps through points in x order with the keyboard and pins with Enter', async () => {
    const { host, unmount } = await render(card());
    try {
      const target = plot(host);
      const key = (name: string) =>
        act(async () => {
          target.dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true }));
        });
      expect(target.tabIndex).toBe(0);
      await key('ArrowRight');
      expect(caption(host)).toBe('Brand · Spend $10');
      await key('ArrowRight');
      expect(caption(host)).toBe('Retarget · Spend $20');
      await key('End');
      expect(caption(host)).toBe('Launch · Spend $40');
      await key('Enter');
      await act(async () => {
        target.dispatchEvent(new FocusEvent('blur'));
        target.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
      });
      // Pinned: the reading stays after focus leaves.
      expect(caption(host)).toBe('Launch · Spend $40');
      await key('Escape');
      expect(host.querySelector('.lilt-card__caption')).toBeNull();
    } finally {
      unmount();
    }
  });

  it('sizes bubbles by area and colors groups with a legend', async () => {
    const { host, unmount } = await render(
      card({ size: 'reach', sizeLabel: 'Reach', group: 'channel' }),
    );
    try {
      const radius = (name: string) =>
        Number(host.querySelector(`[data-point="${name}"] circle`)!.getAttribute('r'));
      expect(radius('Video')).toBeGreaterThan(radius('Launch'));
      expect(radius('Launch')).toBeGreaterThan(radius('Brand'));
      const legend = [...host.querySelectorAll('.lilt-chart__legend-item')];
      expect(
        legend.map((item) => item.querySelector('.lilt-chart__legend-label')?.textContent),
      ).toEqual(['Social', 'Search', 'Audio']);
      expect(
        legend.map((item) => item.querySelector('.lilt-chart__legend-value')?.textContent),
      ).toEqual(['480', '320', 'No data']);
      await act(async () => {
        legend[1]!.dispatchEvent(new PointerEvent('pointerover', { bubbles: true }));
      });
      expect(headline(host)).toContain('320');
      expect(caption(host)).toBe('Search');
      expect(host.querySelectorAll('.lilt-scatter-card__point[data-muted]')).toHaveLength(2);
      expect(host.querySelector('.lilt-chart__sr-only[aria-live]')?.textContent).toBe('');
    } finally {
      unmount();
    }
  });

  it('draws a trend line with its fit, and follows the chosen aggregate', async () => {
    const { host, rerender, unmount } = await render(card({ trend: true, aggregate: 'mean' }));
    try {
      expect(host.querySelector('.lilt-scatter-card__trend')).not.toBeNull();
      expect(host.querySelector('.lilt-scatter-card__fit')?.textContent).toMatch(
        /^Trend · r² 0\.\d\d$/,
      );
      expect(headline(host)).toContain('200');
      await rerender(card({ aggregate: 'max', headline: undefined }));
      expect(headline(host)).toContain('300');
    } finally {
      unmount();
    }
  });

  it('swaps periods and keeps each point by its label', async () => {
    const later = campaigns.map((row) => ({ ...row, signups: (row.signups ?? 0) + 100 }));
    const { host, unmount } = await render(
      card({
        data: undefined,
        ranges: [
          { id: 'q3', label: 'Q3', data: campaigns, delta: 0.1 },
          { id: 'q4', label: 'Q4', data: later, delta: 0.3 },
        ],
      }),
    );
    try {
      const before = host.querySelector('[data-point="Video"]');
      await choosePeriod(host, 'q4');
      expect(headline(host)).toContain('1,200');
      expect(host.querySelector('.lilt-card__delta')?.textContent).toBe('+30.0%');
      // Same element, new position: the point glides rather than being replaced.
      expect(host.querySelector('[data-point="Video"]')).toBe(before);
    } finally {
      unmount();
    }
  });

  it('shows placeholder points while loading and plain messages when nothing can be placed', async () => {
    const { host, rerender, unmount } = await render(card({ loading: true }));
    try {
      expect(host.querySelectorAll('.lilt-scatter-card__skeleton')).toHaveLength(12);
      expect(host.querySelectorAll('.lilt-scatter-card__point')).toHaveLength(0);
      expect(host.querySelector('table')).toBeNull();
      await rerender(card({ data: [] }));
      expect(host.querySelector('.lilt-chart-empty__text')?.textContent).toBe(
        'No data for this period',
      );
      await rerender(card({ data: [campaigns[4]!] }));
      expect(host.querySelector('.lilt-chart-empty__text')?.textContent).toBe(
        'No point has both values, so none can be placed',
      );
    } finally {
      unmount();
    }
  });
});
