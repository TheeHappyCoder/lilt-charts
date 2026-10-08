// @vitest-environment jsdom
import { act, type ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { AreaChartCard } from './area-chart-card';
import { BarChartCard } from './bar-chart-card';
import { choosePeriod } from '../test-utils/choose-period';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const data = [
  { month: 'Jan', web: 20, app: 80 },
  { month: 'Feb', web: 60, app: 40 },
];
const props = {
  title: 'Mix',
  data,
  x: 'month',
  series: [{ key: 'web' }, { key: 'app' }],
  stack: 'percent',
  motion: 'none',
} as const;
async function render(element: ReactElement) {
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
  const update = async (next: ReactElement) => {
    await act(async () => root.render(next));
    await act(async () => new Promise((resolve) => setTimeout(resolve, 120)));
  };
  await update(element);
  return {
    host,
    update,
    /** Render without letting any animation run, to read the first frame of a change. */
    commit: async (next: ReactElement) => act(async () => root.render(next)),
    unmount: () => {
      act(() => root.unmount());
      host.remove();
      vi.restoreAllMocks();
    },
  };
}
const tiles = (host: HTMLElement) =>
  [...host.querySelectorAll('.lilt-chart__legend-value')].map((tile) => tile.textContent);

describe('percent stacks', { timeout: 15_000 }, () => {
  it.each(['bar', 'area'] as const)(
    'uses the same shares for %s marks, final-period tiles, and keyboard inspection',
    async (marks) => {
      const { host, unmount } = await render(
        marks === 'bar' ? <BarChartCard {...props} /> : <AreaChartCard {...props} />,
      );
      try {
        expect(tiles(host)).toEqual(['60%', '40%']);
        expect(host.querySelector('.lilt-card__value')?.textContent).toContain('100%');
        expect(host.querySelector('.lilt-card__caption')?.textContent).toContain('Feb');
        expect(
          host.querySelectorAll(marks === 'bar' ? '.lilt-chart__bars' : '.lilt-chart__area'),
        ).toHaveLength(2);
        const plot = host.querySelector<HTMLInputElement>('input[type="range"]')!;
        await act(async () => {
          Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(
            plot,
            '0',
          );
          plot.dispatchEvent(new Event('input', { bubbles: true }));
        });
        expect(tiles(host)).toEqual(['20%', '80%']);
        await act(async () => {
          plot.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        });
        await act(async () => {
          plot.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        });
        expect(host.querySelector('[role="tooltip"]')).toBeNull();
      } finally {
        unmount();
      }
    },
  );
  it.each(['bar', 'area'] as const)(
    'switches the %s headline to shares without counting across units',
    async (marks) => {
      const Card = marks === 'bar' ? BarChartCard : AreaChartCard;
      // Settle the first render without motion; the switch itself animates.
      const { host, commit, unmount } = await render(<Card {...props} stack={false} />);
      const shown = () =>
        host.querySelector('.lilt-card__value .lilt-number__characters')?.textContent;
      expect(shown()).toBe('200');
      // A count from 200 to 100 in the percent format would read "200%" or "1xx%" on the way.
      await commit(<Card {...props} motion="auto" />);
      expect(host.querySelectorAll('.lilt-card__value .lilt-number__characters')).toHaveLength(1);
      expect(shown()).toBe('100%');
      await commit(<Card {...props} stack={false} motion="auto" />);
      expect(shown()).toBe('200');
      unmount();
    },
  );

  it('preserves the denominator when toggling a series', async () => {
    const { host, unmount } = await render(<BarChartCard {...props} />);
    try {
      const toggle = host.querySelector('.lilt-chart__legend-toggle')!;
      await act(async () => {
        toggle.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
      expect(tiles(host)).toEqual(['60%', '40%']);
      expect(host.querySelector('.lilt-card__value')?.textContent).toContain('40%');
      expect(host.querySelector('.lilt-chart__legend-item')?.getAttribute('data-visible')).toBe(
        'false',
      );
    } finally {
      unmount();
    }
  });
  it.each([null, 0, -1, NaN])(
    'does not use an earlier valid period or invent a headline for a final gap (%s)',
    async (web) => {
      const rows = [...data, { month: 'Mar', web, app: 0 }];
      const { host, unmount } = await render(<BarChartCard {...props} data={rows} />);
      try {
        expect(tiles(host)).toEqual(['—', '—']);
        expect(host.querySelector('.lilt-card__value')?.textContent).toContain('—');
        expect(host.querySelector('.lilt-card__caption')?.textContent).toContain('Mar');
      } finally {
        unmount();
      }
    },
  );
  it('changes ranges and retains the same loading treatment', async () => {
    const { host, update, unmount } = await render(
      <BarChartCard
        {...props}
        data={undefined}
        ranges={[
          { id: 'now', label: 'Now', data },
          { id: 'before', label: 'Before', data: [{ month: 'Dec', web: 0, app: 9 }] },
        ]}
      />,
    );
    try {
      await choosePeriod(host, 'before');
      expect(tiles(host)).toEqual(['0%', '100%']);
      await update(<BarChartCard {...props} loading />);
      expect(host.querySelectorAll('.lilt-card__skeleton--tile')).toHaveLength(2);
      await update(<BarChartCard {...props} data={[] as typeof data} />);
      expect(tiles(host)).toEqual(['—', '—']);
      expect(host.querySelector('.lilt-card__value')?.textContent).toContain('—');
    } finally {
      unmount();
    }
  });
});
