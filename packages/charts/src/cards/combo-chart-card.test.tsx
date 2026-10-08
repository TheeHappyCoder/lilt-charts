// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { ComboChartCard } from './combo-chart-card';
import { alignedSecondaryFactor, niceCeil } from '../engine/domains';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const months = Array.from({ length: 6 }, (_, index) => ({
  month: `M${index + 1}`,
  revenue: 40_000 + index * 8_000,
  budget: 45_000 + index * 5_000,
  margin: 0.2 + index * 0.03,
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
    rerender: (next: React.ReactElement) => act(async () => root.render(next)),
    unmount: () => {
      act(() => root.unmount());
      host.remove();
      vi.restoreAllMocks();
    },
  };
}

async function until(check: () => boolean, timeout = 2000) {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start > timeout) throw new Error('Timed out waiting for the card.');
    await act(async () => new Promise((resolve) => setTimeout(resolve, 20)));
  }
}

const tiles = (host: HTMLElement) =>
  [...host.querySelectorAll('.lilt-chart__legend-toggle')].map((item) => item.textContent);

describe('ComboChartCard', { timeout: 15_000 }, () => {
  it('draws bars and lines, and leaves lines out of the headline', async () => {
    const { host, unmount } = await render(
      <ComboChartCard
        motion="none"
        title="Revenue"
        data={months}
        x="month"
        bars={[{ key: 'revenue', label: 'Revenue' }]}
        lines={[{ key: 'budget', label: 'Budget' }]}
      />,
    );
    try {
      expect(host.querySelectorAll('.lilt-chart__bars')).toHaveLength(1);
      expect(host.querySelectorAll('.lilt-chart__line')).toHaveLength(1);
      expect(host.querySelectorAll('.lilt-chart__line-point')).toHaveLength(6);
      // 40k + 48k + … + 80k = 360k; the budget line is not part of the amount.
      expect(host.querySelector('.lilt-card__value')?.textContent).toContain('360,000');
      expect(tiles(host)).toEqual(['Revenue360,000', 'Budget345,000']);
      expect(host.querySelector('[data-scale="secondary"]')).toBeNull();
    } finally {
      unmount();
    }
  });

  it('gives lines on their own scale their own format, an average tile, and aligned labels', async () => {
    const { host, unmount } = await render(
      <ComboChartCard
        motion="none"
        title="Revenue"
        data={months}
        x="month"
        axis="classic"
        bars={[{ key: 'revenue', label: 'Revenue' }]}
        lines={[{ key: 'margin', label: 'Margin', valueFormat: { style: 'percent' } }]}
        lineScale="own"
      />,
    );
    try {
      expect(tiles(host)).toEqual(['Revenue360,000', 'Margin27.5%']);
      const left = [...host.querySelectorAll('.lilt-chart__y-axis:not([data-scale]) text')];
      const right = [...host.querySelectorAll('.lilt-chart__y-axis[data-scale] text')];
      expect(right.length).toBe(left.length);
      expect(right.map((label) => label.textContent)).toContain('0%');
      // Same gridlines: every right label sits at the height of its left partner.
      const heights = (labels: Element[]) =>
        labels.map(
          (label) => (label as SVGElement).style.transform.match(/translateY\([^)]+\)/)?.[0],
        );
      expect(heights(right)).toEqual(heights(left));
    } finally {
      unmount();
    }
  });

  it('reads the line in the pill when the pointer is near it, otherwise the bar', async () => {
    const { host, unmount } = await render(
      <ComboChartCard
        motion="none"
        title="Revenue"
        data={months}
        x="month"
        bars={[{ key: 'revenue', label: 'Revenue' }]}
        lines={[{ key: 'margin', label: 'Margin', valueFormat: { style: 'percent' } }]}
        lineScale="own"
      />,
    );
    try {
      const plot = host.querySelector('.lilt-chart__svg')!;
      const point = host.querySelectorAll('.lilt-chart__line-point')[5]!;
      const cx = Number(point.getAttribute('cx'));
      const cy = Number(point.getAttribute('cy'));
      const pill = () =>
        host.querySelector('.lilt-chart__y-badge .lilt-bounded-text__visible')?.textContent;
      const move = (clientY: number) =>
        plot.dispatchEvent(
          new PointerEvent('pointermove', {
            bubbles: true,
            clientX: cx,
            clientY,
            pointerType: 'mouse',
          }),
        );
      await until(() => {
        move(cy + 2);
        return pill() === '35%';
      });
      await until(() => {
        move(235);
        return pill() === '80,000';
      });
      // The headline always totals the bars.
      expect(host.querySelector('.lilt-card__value')?.textContent).toContain('80,000');
    } finally {
      unmount();
    }
  });
});

describe('changing series', { timeout: 15_000 }, () => {
  it('swaps a line for another field without failing, then draws it', async () => {
    const card = (line: 'budget' | 'margin') => (
      <ComboChartCard
        motion="none"
        title="Revenue"
        data={months}
        x="month"
        bars={[{ key: 'revenue' }]}
        lines={[{ key: line, dashed: true }]}
      />
    );
    const { host, rerender, unmount } = await render(card('budget'));
    try {
      expect(host.querySelector('.lilt-chart__line--budget')).not.toBeNull();
      const broken: string[] = [];
      const observer = new MutationObserver(() => {
        for (const path of host.querySelectorAll('path'))
          if (path.getAttribute('d')?.includes('NaN'))
            broken.push(path.getAttribute('class') ?? '');
      });
      observer.observe(host, { subtree: true, attributes: true, childList: true });
      await rerender(card('margin'));
      await until(() => host.querySelector('.lilt-chart__line--margin') !== null);
      observer.disconnect();
      expect(host.querySelector('.lilt-chart__line--budget')).toBeNull();
      // No frame of the swap draws a broken shape.
      expect(broken).toEqual([]);
    } finally {
      unmount();
    }
  });
});

describe('aligned secondary scale', () => {
  it('picks round steps that share the primary gridlines', () => {
    expect(niceCeil(0.086)).toBeCloseTo(0.1);
    expect(niceCeil(2.3)).toBe(2.5);
    expect(niceCeil(7)).toBe(10);
    // Primary [0, 100k] every 20k; a 41% margin needs 10% steps: [0, 50%].
    const factor = alignedSecondaryFactor([0, 100_000], 20_000, [0.26, 0.41])!;
    expect(factor * 20_000).toBeCloseTo(0.1);
    expect(factor * 100_000).toBeCloseTo(0.5);
  });

  it('keeps zero aligned when values fall below it, and refuses what cannot fit', () => {
    const factor = alignedSecondaryFactor([-20, 80], 20, [-3, 9])!;
    expect(-20 * factor).toBeLessThanOrEqual(-3);
    expect(80 * factor).toBeGreaterThanOrEqual(9);
    expect(alignedSecondaryFactor([0, 100], 20, [-5, 10])).toBeNull();
    expect(alignedSecondaryFactor([10, 100], 20, [5])).toBeNull();
  });
});
