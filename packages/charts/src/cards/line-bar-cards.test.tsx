// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { AreaChartCard } from './area-chart-card';
import { BarChartCard } from './bar-chart-card';
import { LineChartCard } from './line-chart-card';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const months = Array.from({ length: 6 }, (_, index) => ({
  month: `M${index + 1}`,
  web: 100 + index * 10,
  app: 60 + index * 5,
  target: 150,
}));

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

async function loadingSkeleton(host: HTMLElement) {
  // Cold loading waits 120ms before showing a skeleton, to avoid flashing during quick loads.
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const skeleton = host.querySelector('.lilt-chart__loading');
    if (skeleton) return skeleton;
    await act(async () => new Promise((resolve) => setTimeout(resolve, 25)));
  }
  throw new Error('Loading skeleton did not appear');
}

describe('LineChartCard', { timeout: 15_000 }, () => {
  it('draws lines without area fills, and marks every observation when asked', async () => {
    const { host, unmount } = await render(
      <LineChartCard
        motion="none"
        title="Sessions"
        data={months}
        x="month"
        series={[{ key: 'web' }, { key: 'app' }]}
        points
      />,
    );
    try {
      expect(host.querySelectorAll('.lilt-chart__area')).toHaveLength(0);
      expect(host.querySelectorAll('.lilt-chart__line')).toHaveLength(2);
      expect(host.querySelectorAll('.lilt-chart__line-point')).toHaveLength(12);
      // The headline totals both series: 750 + 435.
      expect(host.querySelector('.lilt-card__value')?.textContent).toContain('1,185');
    } finally {
      unmount();
    }
  });
});

describe('Minimal x labels', { timeout: 15_000 }, () => {
  it('labels every bar slot that fits, but only the ends of an area', async () => {
    const labelCount = async (element: React.ReactElement) => {
      const { host, unmount } = await render(element);
      try {
        return host.querySelectorAll('.lilt-chart__x-axis text').length;
      } finally {
        unmount();
      }
    };
    const props = { motion: 'none', title: 'T', data: months, x: 'month' } as const;
    expect(await labelCount(<BarChartCard {...props} series={[{ key: 'web' }]} />)).toBe(6);
    expect(await labelCount(<AreaChartCard {...props} series={[{ key: 'web' }]} />)).toBe(2);
  });
});

describe('Card summaries', { timeout: 15_000 }, () => {
  it.each(['draw', 'breathe'] as const)(
    'passes %s through the Area card to its loading contours',
    async (loadingStyle) => {
      const { host, unmount } = await render(
        <AreaChartCard
          motion="none"
          title="Orders"
          data={months}
          x="month"
          series={[{ key: 'web' }, { key: 'app' }]}
          depth
          loading
          loadingStyle={loadingStyle}
        />,
      );
      try {
        const skeleton = await loadingSkeleton(host);
        expect(skeleton.getAttribute('data-style')).toBe(loadingStyle);
        expect(skeleton.getAttribute('data-reduced-motion')).toBe('true');
        expect(skeleton.querySelector('[data-lilt-tube]')).not.toBeNull();
        expect(skeleton.querySelector('.lilt-chart__skeleton-sheen')).toBeNull();
      } finally {
        unmount();
      }
    },
  );

  it('makes Area loading follow its depth style without exposing values', async () => {
    const { host, unmount } = await render(
      <AreaChartCard
        motion="none"
        title="Orders"
        data={months}
        x="month"
        series={[{ key: 'web' }, { key: 'app' }]}
        depth
        loading
        stack
      />,
    );
    try {
      const skeleton = await loadingSkeleton(host);
      expect(skeleton.querySelectorAll('[data-lilt-tube]')).toHaveLength(2);
      expect(skeleton.querySelector('feDropShadow')).not.toBeNull();
      expect(skeleton.querySelector('.lilt-chart__skeleton-sheen')).toBeNull();
      expect(host.querySelector('.lilt-card__value')?.textContent).not.toContain('1,185');
    } finally {
      unmount();
    }
  });

  it('summarizes rates by mean and follows one headline series', async () => {
    const samples = [
      { hour: 'a', p50: 80, p95: 200 },
      { hour: 'b', p50: 100, p95: 300 },
      { hour: 'c', p50: 120, p95: 400 },
    ];
    const { host, unmount } = await render(
      <LineChartCard
        motion="none"
        title="Latency"
        data={samples}
        x="hour"
        series={[{ key: 'p50' }, { key: 'p95' }]}
        aggregate="mean"
        headlineSeries="p95"
      />,
    );
    try {
      expect(host.querySelector('.lilt-card__value')?.textContent).toContain('300');
      const tiles = [...host.querySelectorAll('.lilt-chart__legend-value')].map(
        (tile) => tile.textContent,
      );
      expect(tiles).toEqual(['100', '300']);
    } finally {
      unmount();
    }
  });
});

describe('BarChartCard', { timeout: 15_000 }, () => {
  it('freezes the skeleton, sinks it away and hands over to the bars without a gap', async () => {
    const card = (loading: boolean) => (
      <BarChartCard
        title="Orders"
        data={months}
        x="month"
        series={[{ key: 'web' }, { key: 'app' }]}
        depth
        loading={loading}
        loadingStyle="breathe"
      />
    );
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
    try {
      await act(async () => root.render(card(true)));
      await loadingSkeleton(host);
      const skeleton = host.querySelector('.lilt-chart__loading')!.outerHTML;
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      await act(async () => root.render(card(false)));
      // It leaves at once, holding the exact shape and frame it had, and no bar is drawn yet.
      const leaving = host.querySelector('.lilt-chart__skeleton-host')!;
      expect(leaving.getAttribute('data-skeleton-leaving')).toBe('bottom');
      expect(host.querySelector('.lilt-chart__loading')!.outerHTML).toBe(skeleton);
      expect(host.querySelector('.lilt-chart__data-layer')).toBeNull();
      await act(async () => vi.advanceTimersByTime(50));
      expect(host.querySelector('.lilt-chart__data-layer')).toBeNull();
      // Sinking, it hands over: the bars rise from the floor it sinks into, then it is removed.
      await act(async () => vi.advanceTimersByTime(40));
      expect(host.querySelector('.lilt-chart__data-layer')).not.toBeNull();
      await act(async () => vi.advanceTimersByTime(160));
      expect(host.querySelector('.lilt-chart__skeleton-host')).toBeNull();
    } finally {
      vi.useRealTimers();
      act(() => root.unmount());
      host.remove();
      vi.restoreAllMocks();
    }
  });

  const point = async (host: HTMLElement, clientX: number) => {
    await act(async () => {
      host.querySelector('.lilt-chart__svg')!.dispatchEvent(
        new PointerEvent('pointermove', {
          bubbles: true,
          clientX,
          clientY: 140,
          pointerType: 'mouse',
        }),
      );
      await new Promise((resolve) => setTimeout(resolve, 40));
    });
  };
  const center = (element: Element | null) => {
    const x = Number(element?.getAttribute('x'));
    return x + Number(element?.getAttribute('width')) / 2;
  };

  it('snaps the column band to the inspected bars, and spotlight turns it off', async () => {
    const card = (spotlight?: boolean) => (
      <BarChartCard
        title="Orders"
        data={months}
        x="month"
        series={[{ key: 'web' }]}
        spotlight={spotlight}
      />
    );
    const { host, unmount } = await render(card());
    try {
      await point(host, 60);
      await point(host, 540);
      // The bars light up at once; the band arrives with them rather than gliding behind.
      const band = host.querySelector('.lilt-chart__hover-band rect');
      expect(band).not.toBeNull();
      const early = center(band);
      await act(async () => new Promise((resolve) => setTimeout(resolve, 900)));
      expect(Math.abs(center(band) - early)).toBeLessThan(0.5);
      expect(early).toBeGreaterThan(400);
    } finally {
      unmount();
    }
    const flat = await render(card(false));
    try {
      expect(flat.host.querySelector('.lilt-chart__hover-band')).toBeNull();
    } finally {
      flat.unmount();
    }
  });

  it.each(['depth', 'isometric'] as const)(
    'automatically matches loading geometry to the %s bar variant',
    async (variant) => {
      const { host, unmount } = await render(
        <BarChartCard
          motion="none"
          title="Orders"
          data={months}
          x="month"
          series={[{ key: 'web' }, { key: 'target', dashed: true }]}
          loading
          loadingStyle="breathe"
          {...(variant === 'depth' ? { depth: true } : { barStyle: 'isometric' as const })}
        />,
      );
      try {
        const skeleton = await loadingSkeleton(host);
        expect(skeleton.getAttribute('data-style')).toBe('breathe');
        expect(skeleton.getAttribute('data-reduced-motion')).toBe('true');
        // Cold loading keeps the existing 12 synthetic slots; the reference adds no bars.
        expect(skeleton.querySelectorAll('[data-lilt-bar-face="front"]')).toHaveLength(12);
        expect(skeleton.querySelectorAll('[data-lilt-bar-face="top"]')).toHaveLength(12);
        expect(skeleton.querySelector('.lilt-chart__skeleton-sheen')).toBeNull();
        expect(host.querySelector('.lilt-card__value')?.textContent).not.toContain('750');
      } finally {
        unmount();
      }
    },
  );

  it('keeps all isometric faces when inspecting and pinning, with empty values left empty', async () => {
    const data = [
      { day: 'Mon', revenue: 20 },
      { day: 'Tue', revenue: 0 },
      { day: 'Wed', revenue: null },
      { day: 'Thu', revenue: -10 },
    ];
    const { host, unmount } = await render(
      <BarChartCard
        motion="none"
        title="Revenue"
        data={data}
        x="day"
        series={[{ key: 'revenue' }]}
        barStyle="isometric"
      />,
    );
    try {
      const resting = host.querySelector('.lilt-chart__bars')!;
      expect(resting.querySelectorAll('[data-lilt-bar-face="front"]')).toHaveLength(2);
      const first = resting.querySelector('[data-lilt-bar]')!;
      const faces = [...first.querySelectorAll('[data-lilt-bar-face]')].map((face) =>
        face.getAttribute('d'),
      );
      expect(faces).toHaveLength(3);
      const front = first.querySelector('[data-lilt-bar-face="front"]')!;
      const clientX = Number(/-?[\d.]+/.exec(front.getAttribute('d')!)![0]) + 4;
      const plot = host.querySelector('.lilt-chart__svg')!;
      const selected = () => host.querySelector('.lilt-chart__bar-mark[data-series="revenue"]');
      for (let attempt = 0; attempt < 20 && !selected(); attempt += 1) {
        await act(async () => {
          plot.dispatchEvent(
            new PointerEvent('pointermove', {
              bubbles: true,
              clientX: clientX + attempt,
              clientY: 120,
              pointerType: 'mouse',
            }),
          );
          await new Promise((resolve) => setTimeout(resolve, 40));
        });
      }
      expect(
        [...selected()!.querySelectorAll('[data-lilt-bar-face]')].map((face) =>
          face.getAttribute('d'),
        ),
      ).toEqual(faces);
      await act(async () => {
        plot.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX, clientY: 120 }));
        await new Promise((resolve) => setTimeout(resolve, 40));
      });
      expect(host.querySelector('.lilt-chart__pin')?.getAttribute('aria-label')).toBe(
        'Release pinned point',
      );
      expect(
        [...selected()!.querySelectorAll('[data-lilt-bar-face]')].map((face) =>
          face.getAttribute('d'),
        ),
      ).toEqual(faces);
    } finally {
      unmount();
    }
  });

  it('groups bars, draws dashed series as a reference line, and stays contained', async () => {
    const { host, unmount } = await render(
      <BarChartCard
        motion="none"
        title="Orders"
        data={months}
        x="month"
        series={[{ key: 'web' }, { key: 'app' }, { key: 'target', dashed: true }]}
        tracks
      />,
    );
    try {
      expect(host.querySelectorAll('.lilt-chart__bars')).toHaveLength(2);
      expect(host.querySelectorAll('[data-lilt-bar-track]').length).toBeGreaterThan(0);
      expect(host.querySelector('.lilt-chart__line[data-series="target"]')).not.toBeNull();
      expect(host.querySelector('.lilt-card__chart--bleed')).toBeNull();
      // The target line is a reference, so it stays out of the headline.
      expect(host.querySelector('.lilt-card__value')?.textContent).toContain('1,185');
    } finally {
      unmount();
    }
  });

  it('points the y pill at the bar under the pointer', async () => {
    const { host, unmount } = await render(
      <BarChartCard
        motion="none"
        title="Orders"
        data={months}
        x="month"
        series={[{ key: 'web' }, { key: 'app' }]}
      />,
    );
    try {
      const plot = host.querySelector('.lilt-chart__svg')!;
      // The first number in each bar path is its left edge; bars are drawn in slot order.
      const leftEdges = (series: string) =>
        [...host.querySelectorAll(`.lilt-chart__bars[data-series="${series}"] path`)].map((path) =>
          Number(/-?[\d.]+/.exec(path.getAttribute('d') ?? '')?.[0]),
        );
      const appBar = leftEdges('app')[2]!;
      const pill = async (clientX: number) => {
        for (const nudge of [0, 1]) {
          await act(async () => {
            plot.dispatchEvent(
              new PointerEvent('pointermove', {
                bubbles: true,
                clientX: clientX + nudge,
                clientY: 120,
                pointerType: 'mouse',
              }),
            );
            await new Promise((resolve) => setTimeout(resolve, 40));
          });
        }
        return host.querySelector('.lilt-chart__y-badge .lilt-bounded-text__visible')?.textContent;
      };
      expect(await pill(appBar + 2)).toBe('70');
      expect(await pill(leftEdges('web')[2]! + 2)).toBe('120');
    } finally {
      unmount();
    }
  });

  it('floats the value pill over the hovered bar without y labels, and on the axis with them', async () => {
    for (const [axis, expected] of [
      ['minimal', 'mark'],
      ['inline', 'axis'],
    ] as const) {
      const { host, unmount } = await render(
        <BarChartCard
          motion="none"
          title="Orders"
          data={months}
          x="month"
          series={[{ key: 'web' }, { key: 'app' }]}
          axis={axis}
        />,
      );
      try {
        const plot = host.querySelector('.lilt-chart__svg')!;
        // Pointer moves are handled on the next frame, so poll rather than guess a delay.
        let position: string | null | undefined;
        for (let attempt = 0; attempt < 20 && !position; attempt += 1) {
          await act(async () => {
            plot.dispatchEvent(
              new PointerEvent('pointermove', {
                bubbles: true,
                clientX: 300 + attempt,
                clientY: 120,
                pointerType: 'mouse',
              }),
            );
            await new Promise((resolve) => setTimeout(resolve, 50));
          });
          position = host.querySelector('.lilt-chart__y-badge')?.getAttribute('data-position');
        }
        expect(position).toBe(expected);
        // The axis guide line only belongs to the axis position.
        expect(host.querySelector('.lilt-chart__y-guide')).toBeNull();
      } finally {
        unmount();
      }
    }
  });

  it('stacks the bars and draws a dashed target over the stack on the same scale', async () => {
    const { host, unmount } = await render(
      <BarChartCard
        motion="none"
        title="Orders"
        data={months}
        x="month"
        series={[{ key: 'web' }, { key: 'app' }, { key: 'target', dashed: true }]}
        stack
      />,
    );
    try {
      expect(host.querySelector('[data-lilt-stack="sum"][data-lilt-bars="true"]')).not.toBeNull();
      expect(host.querySelectorAll('.lilt-chart__bars')).toHaveLength(2);
      expect(host.querySelector('.lilt-chart__line--target')).not.toBeNull();
      // The target is never stacked, so it is not a bar and not part of the headline.
      expect(host.querySelector('.lilt-chart__bars[data-series="target"]')).toBeNull();
      expect(host.querySelector('.lilt-card__value')?.textContent).toContain('1,185');
    } finally {
      unmount();
    }
  });

  it('rounds every corner and draws one track per stacked column', async () => {
    const { host, unmount } = await render(
      <BarChartCard
        motion="none"
        title="Orders"
        data={months}
        x="month"
        series={[{ key: 'web' }, { key: 'app' }]}
        stack
        corners="all"
        tracks
      />,
    );
    try {
      const tracks = host.querySelectorAll('[data-lilt-bar-track]');
      expect(tracks).toHaveLength(months.length);
      // Both ends curve: four quadratic corners on the track and on every segment.
      expect(tracks[0].getAttribute('d')!.match(/Q/g)).toHaveLength(4);
      const segment = host.querySelector(
        '.lilt-chart__bars[data-series="web"] [data-lilt-bar] path, .lilt-chart__bars[data-series="web"] path[data-lilt-bar]',
      );
      expect(segment?.getAttribute('d')?.match(/Q/g)).toHaveLength(4);
    } finally {
      unmount();
    }
  });
});

describe('Card legends', { timeout: 15_000 }, () => {
  it('keeps value tiles by default and lays out the legend a card names', async () => {
    const card = (legend?: 'pills' | 'list') => (
      <LineChartCard
        motion="none"
        title="Traffic"
        data={months}
        x="month"
        series={[{ key: 'web' }, { key: 'app' }]}
        legend={legend}
        legendSwatch={legend ? 'line' : undefined}
      />
    );
    for (const legend of [undefined, 'pills', 'list'] as const) {
      const { host, unmount } = await render(card(legend));
      try {
        const element = host.querySelector('.lilt-card__tiles')!;
        expect(element.getAttribute('data-variant')).toBe(legend ?? 'cards');
        expect(element.getAttribute('data-swatch')).toBe(legend ? 'line' : null);
        expect(host.querySelectorAll('.lilt-chart__legend-value')).toHaveLength(2);
      } finally {
        unmount();
      }
    }
  });
});
