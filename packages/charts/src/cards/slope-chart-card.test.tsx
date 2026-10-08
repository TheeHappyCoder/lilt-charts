// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { SlopeChartCard } from './slope-chart-card';

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

const regions = [
  { region: 'North', lastYear: 100, thisYear: 130 },
  { region: 'South', lastYear: 200, thisYear: 150 },
  { region: 'East', lastYear: null as number | null, thisYear: 90 },
];

class Observer {
  observe() {}
  disconnect() {}
}

describe('SlopeChartCard', { timeout: 15_000 }, () => {
  it('totals the later values and compares categories measured at both ends', async () => {
    const { host, unmount } = await render(
      <SlopeChartCard
        motion="none"
        title="Revenue by region"
        data={regions}
        category="region"
        from="lastYear"
        to="thisYear"
        fromLabel="2025"
        toLabel="2026"
        variant="dumbbell"
      />,
    );
    try {
      expect(host.querySelector('.lilt-card__value')?.textContent).toContain('370');
      // North and South: 300 → 280.
      expect(host.querySelector('.lilt-card__delta')?.textContent).toBe('-6.7%');
      expect(host.querySelector('.lilt-card__caption')?.textContent).toBe('vs 2025');
      const rows = [...host.querySelectorAll<HTMLButtonElement>('.lilt-slope__row')];
      expect(rows.map((row) => row.querySelector('.lilt-slope__label')?.textContent)).toEqual([
        'North',
        'South',
        'East',
      ]);
      expect(rows.map((row) => row.dataset.tone)).toEqual(['positive', 'negative', 'neutral']);
      expect(rows[2]!.getAttribute('aria-label')).toBe('East: 2025 No data, 2026 90');
      expect(rows[2]!.querySelector('.lilt-slope__dot[data-end="from"]')).toBeNull();
    } finally {
      unmount();
    }
  });

  it('reads a hovered or focused category in the headline and moves with the arrow keys', async () => {
    const { host, unmount } = await render(
      <SlopeChartCard
        motion="none"
        title="Revenue by region"
        data={regions}
        category="region"
        from="lastYear"
        to="thisYear"
        variant="dumbbell"
      />,
    );
    try {
      const rows = [...host.querySelectorAll<HTMLButtonElement>('.lilt-slope__row')];
      await act(async () => {
        rows[1]!.dispatchEvent(new PointerEvent('pointerover', { bubbles: true }));
      });
      expect(host.querySelector('.lilt-card__value')?.textContent).toContain('150');
      expect(host.querySelector('.lilt-card__delta')?.textContent).toBe('-25.0%');
      expect(host.querySelector('.lilt-card__caption')?.textContent).toBe('South');
      expect(rows[0]!.dataset.muted).toBe('true');

      await act(async () => {
        rows[1]!.dispatchEvent(new PointerEvent('pointerout', { bubbles: true }));
        rows[0]!.focus();
      });
      await act(async () => {
        rows[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      });
      expect(document.activeElement).toBe(rows[1]);
      expect(host.querySelector('.lilt-card__caption')?.textContent).toBe('South');
    } finally {
      unmount();
    }
  });

  it('draws one line per category measured at both ends in the slope variant', async () => {
    vi.stubGlobal('ResizeObserver', Observer);
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
      width: 480,
      height: 260,
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 480,
      bottom: 260,
      toJSON: () => ({}),
    } as DOMRect);
    const { host, unmount } = await render(
      <SlopeChartCard
        motion="none"
        title="Revenue by region"
        data={regions}
        category="region"
        from="lastYear"
        to="thisYear"
        fromLabel="2025"
        toLabel="2026"
      />,
    );
    try {
      const lines = [...host.querySelectorAll<SVGGElement>('.lilt-slope__line')];
      expect(lines).toHaveLength(3);
      expect(host.querySelectorAll('.lilt-slope__stroke')).toHaveLength(2);
      expect(
        [...host.querySelectorAll('.lilt-slope__column')].map((node) => node.textContent),
      ).toEqual(['2025', '2026']);
      expect(lines[0]!.getAttribute('role')).toBe('button');
      expect(lines[0]!.getAttribute('aria-label')).toBe('North: 2025 100, 2026 130, +30.0%');
    } finally {
      unmount();
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
    }
  });

  it('shows an error for duplicate names', async () => {
    const { host, unmount } = await render(
      <SlopeChartCard
        motion="none"
        title="Revenue"
        data={[regions[0]!, regions[0]!]}
        category="region"
        from="lastYear"
        to="thisYear"
      />,
    );
    try {
      expect(host.querySelector('.lilt-chart__status--error')?.textContent).toContain('Duplicate');
    } finally {
      unmount();
    }
  });
});
