// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { AreaChartCard } from './area-chart-card';
import { ChartCardDelta } from './chart-card';
import { resolveX } from './keys';
import { choosePeriod, chosenPeriod } from '../test-utils/choose-period';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const rows = [
  { month: 'Jan', organic: 100, paid: 40 as number | null },
  { month: 'Feb', organic: 200, paid: null },
  { month: 'Mar', organic: 300, paid: 60 },
];

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

// Full-suite runs share CPU across workers; rendering whole cards can exceed the 5s default.
describe('AreaChartCard', { timeout: 15_000 }, () => {
  it('derives the headline and tiles from key-typed series, skipping missing values', async () => {
    const { host, unmount } = await render(
      <AreaChartCard
        motion="none"
        title="Visitors"
        data={rows}
        x="month"
        series={[{ key: 'organic', label: 'Organic' }, { key: 'paid' }]}
        delta={0.082}
        range="This year"
      />,
    );
    try {
      expect(host.querySelector('.lilt-card__title')?.textContent).toBe('Visitors');
      expect(host.querySelector('.lilt-card__value')?.textContent).toContain('700');
      const tiles = [...host.querySelectorAll('.lilt-chart__legend-toggle')].map(
        (item) => item.textContent,
      );
      expect(tiles).toEqual(['Organic600', 'paid100']);
      expect(host.querySelector('.lilt-card__delta')?.textContent).toBe('+8.2%');
      expect(host.querySelector('.lilt-card__range')?.textContent).toBe('This year');
    } finally {
      unmount();
    }
  });

  it('swaps data, delta and headline when a range is chosen', async () => {
    const { host, unmount } = await render(
      <AreaChartCard
        motion="none"
        title="Visitors"
        x="month"
        series={[{ key: 'organic' }]}
        ranges={[
          { id: 'now', label: 'This year', data: rows, delta: 0.1 },
          { id: 'before', label: 'Last year', data: rows.slice(0, 1), delta: -0.05, headline: 42 },
        ]}
      />,
    );
    try {
      expect(chosenPeriod(host)).toBe('now');
      await choosePeriod(host, 'before');
      expect(host.querySelector('.lilt-card__delta')?.textContent).toBe('-5.0%');
      expect(host.querySelector('.lilt-card__delta')?.getAttribute('data-tone')).toBe('negative');
      expect(host.querySelector('.lilt-chart__legend-value')?.textContent).toBe('100');
    } finally {
      unmount();
    }
  });

  it('leaves dashed reference series out of the headline', async () => {
    const { host, unmount } = await render(
      <AreaChartCard
        motion="none"
        title="Revenue"
        data={rows}
        x="month"
        series={[{ key: 'organic' }, { key: 'paid', dashed: true }]}
      />,
    );
    try {
      expect(host.querySelector('.lilt-card__value')?.textContent).toContain('600');
      expect(host.querySelector('.lilt-card__value')?.textContent).not.toContain('700');
    } finally {
      unmount();
    }
  });

  it('defaults to an elevated card with a dotted plot background, and both can be changed', async () => {
    const first = await render(
      <AreaChartCard
        motion="none"
        title="Visitors"
        data={rows}
        x="month"
        series={[{ key: 'organic' }]}
      />,
    );
    try {
      expect(first.host.querySelector('.lilt-card')?.getAttribute('data-surface')).toBe('elevated');
      expect(first.host.querySelector('.lilt-chart__background')?.getAttribute('data-kind')).toBe(
        'dots',
      );
    } finally {
      first.unmount();
    }
    const second = await render(
      <AreaChartCard
        motion="none"
        title="Visitors"
        data={rows}
        x="month"
        series={[{ key: 'organic' }]}
        surface="ghost"
        background="none"
      />,
    );
    try {
      expect(second.host.querySelector('.lilt-card')?.getAttribute('data-surface')).toBe('ghost');
      expect(second.host.querySelector('.lilt-chart__background')).toBeNull();
    } finally {
      second.unmount();
    }
  });

  it('shows skeleton tiles instead of values while loading', async () => {
    const { host, unmount } = await render(
      <AreaChartCard
        motion="none"
        title="Visitors"
        data={rows}
        x="month"
        series={[{ key: 'organic' }]}
        loading
      />,
    );
    try {
      expect(host.querySelector('.lilt-card__skeleton--tile')).not.toBeNull();
      expect(host.querySelector('.lilt-chart__legend-value')?.textContent).toBe('');
    } finally {
      unmount();
    }
  });
});

describe('AreaChartCard hover', () => {
  it('keeps both axis pills visible while the pointer glides within one x position', async () => {
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
      width: 700,
      height: 240,
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 700,
      bottom: 240,
      toJSON: () => ({}),
    } as DOMRect);
    const months = Array.from({ length: 12 }, (_, index) => ({
      month: `M${index}`,
      organic: 10 + index,
      paid: 5 + index,
    }));
    const { host, unmount } = await render(
      <AreaChartCard
        motion="none"
        title="Visitors"
        data={months}
        x="month"
        series={[{ key: 'organic' }, { key: 'paid' }]}
      />,
    );
    try {
      await act(async () => new Promise((resolve) => setTimeout(resolve, 1200)));
      const plot = host.querySelector('.lilt-chart__svg')!;
      const pills: string[] = [];
      for (let step = 0; step < 20; step += 1) {
        await act(async () => {
          plot.dispatchEvent(
            new PointerEvent('pointermove', {
              bubbles: true,
              clientX: 80 + step * 9,
              clientY: 100,
              pointerType: 'mouse',
            }),
          );
          await new Promise((resolve) => setTimeout(resolve, 40));
        });
        const both =
          host.querySelector('.lilt-chart__x-badge') && host.querySelector('.lilt-chart__y-badge');
        pills.push(both ? 'shown' : 'hidden');
      }
      expect(pills.slice(1)).not.toContain('hidden');
    } finally {
      unmount();
      vi.restoreAllMocks();
    }
  }, 15_000);
});

describe('AreaChartCard active series', () => {
  it('moves the y pill and tile highlight to the line nearest the pointer', async () => {
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
      width: 700,
      height: 240,
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 700,
      bottom: 240,
      toJSON: () => ({}),
    } as DOMRect);
    const months = Array.from({ length: 6 }, (_, index) => ({
      month: `M${index}`,
      high: 100,
      low: 10,
    }));
    const { host, unmount } = await render(
      <AreaChartCard
        motion="none"
        title="Visitors"
        data={months}
        x="month"
        series={[
          { key: 'high', label: 'High' },
          { key: 'low', label: 'Low' },
        ]}
      />,
    );
    const pointAt = async (clientY: number) => {
      const plot = host.querySelector('.lilt-chart__svg')!;
      for (const clientX of [300, 304]) {
        await act(async () => {
          plot.dispatchEvent(
            new PointerEvent('pointermove', {
              bubbles: true,
              clientX,
              clientY,
              pointerType: 'mouse',
            }),
          );
          await new Promise((resolve) => setTimeout(resolve, 40));
        });
      }
      return {
        pill: host.querySelector('.lilt-chart__y-badge .lilt-bounded-text__visible')?.textContent,
        tile: host.querySelector('.lilt-chart__legend-item[data-active] .lilt-chart__legend-toggle')
          ?.textContent,
      };
    };
    try {
      await act(async () => new Promise((resolve) => setTimeout(resolve, 300)));
      expect(await pointAt(20)).toEqual({ pill: '100', tile: 'High100' });
      expect(await pointAt(215)).toEqual({ pill: '10', tile: 'Low10' });

      // Pinned: x stays put while moving up and down still switches the series.
      const plot = host.querySelector('.lilt-chart__svg')!;
      await act(async () => {
        plot.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 300, clientY: 20 }));
        await new Promise((resolve) => setTimeout(resolve, 40));
      });
      const pinnedX = host.querySelector('.lilt-chart__x-badge')?.textContent;
      const moveWhilePinned = async (clientY: number) => {
        await act(async () => {
          plot.dispatchEvent(
            new PointerEvent('pointermove', {
              bubbles: true,
              clientX: 620,
              clientY,
              pointerType: 'mouse',
            }),
          );
          await new Promise((resolve) => setTimeout(resolve, 40));
        });
        return [
          host.querySelector('.lilt-chart__x-badge')?.textContent,
          host.querySelector('.lilt-chart__y-badge .lilt-bounded-text__visible')?.textContent,
        ];
      };
      expect(await moveWhilePinned(20)).toEqual([pinnedX, '100']);
      expect(await moveWhilePinned(215)).toEqual([pinnedX, '10']);
    } finally {
      unmount();
      vi.restoreAllMocks();
    }
  }, 15_000);
});

describe('AreaChartCard axis alignment', () => {
  it.each([true, false])(
    'keeps ruler marks on observations and labels centered (bleed %s)',
    async (bleed) => {
      vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
        width: 700,
        height: 240,
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        right: 700,
        bottom: 240,
        toJSON: () => ({}),
      } as DOMRect);
      const months = Array.from({ length: 12 }, (_, index) => ({
        month: `M${index + 1}`,
        value: 10 + index,
      }));
      const { host, unmount } = await render(
        <AreaChartCard
          motion="none"
          title="Visitors"
          data={months}
          x="month"
          series={[{ key: 'value' }]}
          axis="ruler"
          bleed={bleed}
        />,
      );
      try {
        await act(async () => new Promise((resolve) => setTimeout(resolve, 200)));
        const marks = [...host.querySelectorAll('.lilt-chart__ruler-tick')].map((mark) =>
          Number(mark.getAttribute('x1')),
        );
        expect(marks).toHaveLength(12);
        // Bleed insets observations and adds a runoff; contained charts start dead at the edge.
        expect(marks[0]).toBeCloseTo(bleed ? 20 : 4, 0);
        const line = host.querySelector('.lilt-chart__line path')?.getAttribute('d') ?? '';
        expect(line.startsWith('M0,')).toBe(bleed);
        const labels = [...host.querySelectorAll('.lilt-chart__x-axis text')];
        expect(labels.length).toBeGreaterThan(2);
        for (const label of labels) {
          expect(label.getAttribute('text-anchor')).toBe('middle');
          // Motion positions labels with a transform rather than the x attribute.
          const x = Number(
            /translateX\(([-\d.]+)px\)/.exec(label.getAttribute('style') ?? '')?.[1],
          );
          expect(marks.some((mark) => Math.abs(mark - x) < 0.5)).toBe(true);
        }
      } finally {
        unmount();
        vi.restoreAllMocks();
      }
    },
    15_000,
  );
});

describe('ChartCardDelta', () => {
  it('separates direction from desirability', async () => {
    const { host, unmount } = await render(
      <>
        <ChartCardDelta value={-0.1} tone="inverse" />
        <ChartCardDelta value={0.1} tone="neutral" />
        <ChartCardDelta value={0} />
      </>,
    );
    try {
      expect(
        [...host.querySelectorAll('.lilt-card__delta')].map((item) =>
          item.getAttribute('data-tone'),
        ),
      ).toEqual(['positive', 'neutral', 'neutral']);
    } finally {
      unmount();
    }
  });
});

describe('resolveX', () => {
  it('places text labels by input order and formats only whole positions', () => {
    const x = resolveX(rows, 'month');
    expect(x.kind).toBe('category');
    expect(rows.map(x.position)).toEqual([0, 1, 2]);
    expect(x.format(1)).toBe('Feb');
    expect(x.format(1.5)).toBe('');
  });

  it('detects dates and keeps numbers numeric unless told otherwise', () => {
    const dated = [{ day: new Date(Date.UTC(2026, 8, 3)) }];
    expect(resolveX(dated, 'day').kind).toBe('time');
    expect(resolveX(dated, 'day').format(dated[0]!.day.getTime())).toBe('Sep 3');
    const numbered = [{ t: 1_700_000_000_000 }];
    expect(resolveX(numbered, 't').kind).toBe('number');
    expect(resolveX(numbered, 't', 'time').kind).toBe('time');
  });
});

describe('AreaChartCard hover readout', () => {
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
  const months = Array.from({ length: 6 }, (_, index) => ({
    month: `M${index}`,
    high: 100,
    low: 10,
  }));
  const series = [
    { key: 'high', label: 'High' },
    { key: 'low', label: 'Low' },
  ] as const;
  const hover = async (host: HTMLElement, clientY: number) => {
    const plot = host.querySelector('.lilt-chart__svg')!;
    for (const clientX of [300, 304]) {
      await act(async () => {
        plot.dispatchEvent(
          new PointerEvent('pointermove', {
            bubbles: true,
            clientX,
            clientY,
            pointerType: 'mouse',
          }),
        );
        await new Promise((resolve) => setTimeout(resolve, 40));
      });
    }
  };
  const readout = (host: HTMLElement) => ({
    pills: Boolean(host.querySelector('.lilt-chart__x-badge, .lilt-chart__y-badge')),
    tooltip: Boolean(host.querySelector('.lilt-chart__tooltip')),
    headline: host.querySelector('.lilt-card__value')?.textContent,
    caption: host.querySelector('.lilt-card__caption')?.textContent ?? null,
  });

  it('shows pills by default, and the headline follows the pointer', async () => {
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(rect);
    const { host, unmount } = await render(
      <AreaChartCard motion="none" title="Visitors" data={months} x="month" series={series} />,
    );
    try {
      await act(async () => new Promise((resolve) => setTimeout(resolve, 300)));
      await hover(host, 20);
      expect(readout(host)).toMatchObject({ pills: true, tooltip: false, caption: 'M2' });
    } finally {
      unmount();
      vi.restoreAllMocks();
    }
  }, 15_000);

  it('gives a tooltip the plot to itself: no pills, and the headline stays at rest', async () => {
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(rect);
    const { host, unmount } = await render(
      <AreaChartCard
        motion="none"
        title="Visitors"
        data={months}
        x="month"
        series={series}
        hover="tooltip"
        hoverStyle="accent"
        tooltipIndicator="line"
      />,
    );
    try {
      await act(async () => new Promise((resolve) => setTimeout(resolve, 300)));
      await hover(host, 215);
      expect(readout(host)).toMatchObject({ pills: false, tooltip: true, caption: null });
      expect(host.querySelector('.lilt-card__value')?.textContent).toContain('660');
      const panel = host.querySelector<HTMLElement>('.lilt-chart__tooltip')!;
      expect(panel.dataset.variant).toBe('accent');
      expect(panel.dataset.indicator).toBe('line');
      const rows = [...panel.querySelectorAll<HTMLElement>('.lilt-chart__tooltip-row')];
      expect(rows.map((row) => row.textContent)).toEqual(['High100', 'Low10']);
      expect(rows.map((row) => [row.dataset.active, row.dataset.muted])).toEqual([
        [undefined, 'true'],
        ['true', undefined],
      ]);
      // The panel reads the values out, so the point is a ring on a dotted crosshair.
      expect(host.querySelector('.lilt-chart__crosshair')?.getAttribute('stroke-dasharray')).toBe(
        '1 4',
      );
      expect(host.querySelectorAll('.lilt-chart__inspection-dot[data-ring]').length).toBe(2);
      expect(host.querySelector('.lilt-chart__inspection-halo')).toBeNull();
    } finally {
      unmount();
      vi.restoreAllMocks();
    }
  }, 15_000);

  it('docks a strip above the plot, one line, with the headline at rest', async () => {
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(rect);
    const { host, unmount } = await render(
      <AreaChartCard
        motion="none"
        title="Visitors"
        data={months}
        x="month"
        series={series}
        hover="strip"
      />,
    );
    try {
      await act(async () => new Promise((resolve) => setTimeout(resolve, 300)));
      await hover(host, 215);
      expect(readout(host)).toMatchObject({ pills: false, tooltip: true, caption: null });
      const strip = host.querySelector<HTMLElement>('.lilt-chart__tooltip')!;
      expect(strip.dataset.layout).toBe('strip');
      expect(strip.querySelector('.lilt-chart__strip-title')?.textContent).toMatch(/^M\d+$/);
      expect(
        [...strip.querySelectorAll('.lilt-chart__strip-item')].map((item) => item.textContent),
      ).toEqual(['100High', '10Low']);
      expect(host.querySelector('.lilt-chart__tooltip-row')).toBeNull();
    } finally {
      unmount();
      vi.restoreAllMocks();
    }
  }, 15_000);

  it('reads out through the headline alone', async () => {
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(rect);
    const { host, unmount } = await render(
      <AreaChartCard
        motion="none"
        title="Visitors"
        data={months}
        x="month"
        series={series}
        hover="headline"
      />,
    );
    try {
      await act(async () => new Promise((resolve) => setTimeout(resolve, 300)));
      await hover(host, 20);
      expect(readout(host)).toMatchObject({ pills: false, tooltip: false, caption: 'M2' });
    } finally {
      unmount();
      vi.restoreAllMocks();
    }
  }, 15_000);
});

describe('AreaChartCard pin', () => {
  it('shows a pin marker while a point is pinned, and releases it when clicked', async () => {
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
      width: 700,
      height: 240,
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 700,
      bottom: 240,
      toJSON: () => ({}),
    } as DOMRect);
    const months = Array.from({ length: 6 }, (_, index) => ({ month: `M${index}`, value: index }));
    const { host, unmount } = await render(
      <AreaChartCard
        motion="none"
        title="Visitors"
        data={months}
        x="month"
        series={[{ key: 'value' }]}
      />,
    );
    try {
      await act(async () => new Promise((resolve) => setTimeout(resolve, 300)));
      expect(host.querySelector('.lilt-chart__pin')).toBeNull();
      const plot = host.querySelector('.lilt-chart__svg')!;
      await act(async () => {
        plot.dispatchEvent(
          new PointerEvent('pointermove', { bubbles: true, clientX: 300, clientY: 100 }),
        );
        await new Promise((resolve) => setTimeout(resolve, 40));
        plot.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 300, clientY: 100 }));
        await new Promise((resolve) => setTimeout(resolve, 40));
      });
      const pin = host.querySelector<HTMLButtonElement>('.lilt-chart__pin');
      expect(pin?.getAttribute('aria-label')).toBe('Release pinned point');
      await act(async () => {
        pin!.click();
        await new Promise((resolve) => setTimeout(resolve, 600));
      });
      expect(host.querySelector('.lilt-chart__pin')).toBeNull();
    } finally {
      unmount();
      vi.restoreAllMocks();
    }
  }, 15_000);

  it('lands the crosshair exactly on a point pinned mid-glide', async () => {
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
      width: 700,
      height: 240,
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 700,
      bottom: 240,
      toJSON: () => ({}),
    } as DOMRect);
    const months = Array.from({ length: 12 }, (_, index) => ({ month: `M${index}`, value: index }));
    const { host, unmount } = await render(
      <AreaChartCard title="Visitors" data={months} x="month" series={[{ key: 'value' }]} />,
    );
    try {
      await act(async () => new Promise((resolve) => setTimeout(resolve, 300)));
      const plot = host.querySelector('.lilt-chart__svg')!;
      // Enter on the left, then jump far right and pin while the crosshair is still gliding.
      await act(async () => {
        plot.dispatchEvent(
          new PointerEvent('pointermove', { bubbles: true, clientX: 40, clientY: 100 }),
        );
        await new Promise((resolve) => setTimeout(resolve, 40));
        plot.dispatchEvent(
          new PointerEvent('pointermove', { bubbles: true, clientX: 640, clientY: 100 }),
        );
        await new Promise((resolve) => setTimeout(resolve, 20));
        plot.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 640, clientY: 100 }));
      });
      // Frames run slowly when the whole suite shares the CPU, so wait for the glide to settle.
      const pin = () => host.querySelector<HTMLElement>('.lilt-chart__pin');
      const crosshairX = () =>
        Number(host.querySelector('.lilt-chart__crosshair')?.getAttribute('x1'));
      let pinCenter = Number.NaN;
      for (let waited = 0; waited < 6000; waited += 100) {
        await act(async () => new Promise((resolve) => setTimeout(resolve, 100)));
        pinCenter = Number.parseFloat(pin()?.style.left ?? 'NaN') + 12;
        if (Math.abs(crosshairX() - pinCenter) < 0.05) break;
      }
      expect(crosshairX()).toBeCloseTo(pinCenter, 1);
    } finally {
      unmount();
      vi.restoreAllMocks();
    }
  }, 15_000);
});
