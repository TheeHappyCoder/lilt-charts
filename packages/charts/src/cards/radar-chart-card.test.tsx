// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import {
  labelLines,
  profilePath,
  RadarChartCard,
  radarDimensions,
  spokePoint,
} from './radar-chart-card';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

interface Score {
  area: string;
  current: number | null;
  target: number;
}

const scores: Score[] = [
  { area: 'Quality', current: 78, target: 92 },
  { area: 'Coverage', current: 72, target: 90 },
  { area: 'Accessibility', current: 81, target: 90 },
  { area: 'Reliability', current: 84, target: 95 },
  { area: 'Delivery', current: 65, target: 85 },
];
const series = [
  { key: 'current', label: 'Current' },
  { key: 'target', label: 'Target', dashed: true },
] as const;

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
const legendValues = (host: HTMLElement) =>
  [...host.querySelectorAll('.lilt-chart__legend-value')].map((node) => node.textContent);

describe('radar geometry', () => {
  it('reads dimensions and rounds the domain up from zero', () => {
    const result = radarDimensions({
      data: scores,
      category: 'area',
      series: ['current', 'target'],
    });
    expect(result.error).toBeNull();
    expect(result.dimensions.map((dimension) => dimension.name)).toEqual([
      'Quality',
      'Coverage',
      'Accessibility',
      'Reliability',
      'Delivery',
    ]);
    expect(result.domain).toEqual([0, 100]);
  });

  it('explains data it cannot draw', () => {
    const dimensions = (data: Score[], domain?: readonly [number, number]) =>
      radarDimensions({ data, category: 'area', series: ['current', 'target'], domain }).error;
    expect(dimensions(scores.slice(0, 2))).toBe(
      'A radar needs at least three dimensions to draw a shape.',
    );
    expect(dimensions([...scores, scores[0]!])).toBe(
      '“Quality” appears twice; each dimension needs one row.',
    );
    expect(dimensions(scores, [0, 90])).toMatch(/falls outside `domain`/);
  });

  it('places spoke 0 straight up and goes clockwise', () => {
    const top = spokePoint(0, 4, 1, 10);
    const right = spokePoint(1, 4, 1, 10);
    expect(top.x).toBeCloseTo(0);
    expect(top.y).toBeCloseTo(-10);
    expect(right.x).toBeCloseTo(10);
    expect(right.y).toBeCloseTo(0);
  });

  it('wraps a label that does not fit at the space nearest its middle', () => {
    expect(labelLines('Quality', 100)).toEqual(['Quality']);
    expect(labelLines('Test coverage and more', 60)).toEqual(['Test coverage', 'and more']);
    // A single long word cannot wrap.
    expect(labelLines('Documentation', 40)).toEqual(['Documentation']);
  });

  it('breaks the outline at a missing value and drops the fill', () => {
    const whole = profilePath([1, 1, 1, 1], 10);
    expect(whole.complete).toBe(true);
    expect(whole.path.endsWith('Z')).toBe(true);
    const broken = profilePath([1, 1, null, 1], 10);
    expect(broken.complete).toBe(false);
    // Two runs: from the top through the right spoke, then restarting after the gap.
    expect(broken.path.match(/M/g)).toHaveLength(2);
    expect(broken.path).not.toContain('Z');
  });
});

describe('RadarChartCard', { timeout: 15_000 }, () => {
  const card = (
    props: Partial<React.ComponentProps<typeof RadarChartCard<Score, 'current' | 'target'>>> = {},
  ) => (
    <RadarChartCard
      motion="none"
      title="Release readiness"
      data={scores}
      category="area"
      series={series}
      {...props}
    />
  );

  it('draws a filled profile, an outlined target, and a legend of averages', async () => {
    const { host, unmount } = await render(card());
    try {
      expect(host.querySelectorAll('.lilt-radar-card__profile')).toHaveLength(2);
      expect(host.querySelectorAll('.lilt-radar-card__fill')).toHaveLength(1);
      expect(host.querySelector('[data-series="target"]')?.hasAttribute('data-dashed')).toBe(true);
      expect(host.querySelectorAll('.lilt-radar-card__label')).toHaveLength(5);
      // The headline follows the first solid series: the mean of Current.
      expect(headline(host)).toContain('76');
      expect(legendValues(host)).toEqual(['76', '90.4']);
      expect(host.querySelectorAll('.lilt-radar-card__ring-label')).toHaveLength(4);
    } finally {
      unmount();
    }
  });

  it('steps around the dimensions with the keyboard and reads every series', async () => {
    const { host, unmount } = await render(card());
    try {
      const plot = host.querySelector<HTMLDivElement>('.lilt-radar-card__plot')!;
      const key = (name: string) =>
        act(async () => {
          plot.dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true }));
        });
      await key('ArrowRight');
      expect(headline(host)).toContain('78');
      expect(caption(host)).toBe('Quality · Target 92');
      expect(legendValues(host)).toEqual(['78', '92']);
      // Around the circle: left from the first spoke wraps to the last.
      await key('ArrowLeft');
      expect(caption(host)).toBe('Delivery · Target 85');
      expect(host.querySelector('.lilt-radar-card__label[data-active]')?.textContent).toBe(
        'Delivery',
      );
      expect(host.querySelector('.lilt-chart__sr-only[aria-live]')?.textContent).toBe(
        'Delivery: Current 65, Target 85',
      );
      await key('Escape');
      expect(host.querySelector('.lilt-card__caption')).toBeNull();
    } finally {
      unmount();
    }
  });

  it('finds the dimension under the pointer by its angle', async () => {
    const { host, unmount } = await render(card({ height: 300 }));
    try {
      const plot = host.querySelector<HTMLDivElement>('.lilt-radar-card__plot')!;
      // jsdom measures nothing, so the card lays out at its 480px fallback: center (240, 150).
      await act(async () => {
        plot.dispatchEvent(
          new PointerEvent('pointermove', { bubbles: true, clientX: 330, clientY: 120 }),
        );
      });
      expect(caption(host)).toBe('Coverage · Target 90');
      await act(async () => {
        plot.dispatchEvent(new PointerEvent('pointerout', { bubbles: true }));
        plot.dispatchEvent(new PointerEvent('pointerleave', { bubbles: false }));
      });
    } finally {
      unmount();
    }
  });

  it('breaks the outline at a missing value and marks the dimension', async () => {
    const gap = scores.map((row) => (row.area === 'Coverage' ? { ...row, current: null } : row));
    const { host, unmount } = await render(card({ data: gap }));
    try {
      // The current profile loses its fill; the complete target stays an outline.
      expect(host.querySelectorAll('.lilt-radar-card__fill')).toHaveLength(0);
      const label = host.querySelector('.lilt-radar-card__label[data-missing]')!;
      expect([...label.querySelectorAll('tspan')].map((line) => line.textContent)).toEqual([
        'Coverage',
        '· no data',
      ]);
      expect(host.querySelector('.lilt-radar-card__footer')).not.toBeNull();
      // The average skips the gap rather than counting it as zero.
      expect(headline(host)).toContain('77');
    } finally {
      unmount();
    }
  });

  it('shows a placeholder while loading and plain errors for unusable data', async () => {
    const { host, rerender, unmount } = await render(card({ loading: true }));
    try {
      expect(host.querySelector('.lilt-radar-card__skeleton')).not.toBeNull();
      expect(host.querySelector('.lilt-radar-card__profile')).toBeNull();
      await rerender(card({ data: scores.slice(0, 2) }));
      expect(host.querySelector('.lilt-chart__status--error')?.textContent).toBe(
        'A radar needs at least three dimensions to draw a shape.',
      );
      await rerender(card({ data: [] }));
      expect(host.querySelector('.lilt-chart-empty__text')?.textContent).toBe(
        'No data for this period',
      );
    } finally {
      unmount();
    }
  });
});
