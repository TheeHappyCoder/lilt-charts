// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import { ActivityRingCard, clockLabel } from './activity-ring-card';
import { choosePeriod } from '../test-utils/choose-period';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

interface Slot {
  hour: number;
  requests: number | null;
}

// Six four-hour slots: a measured zero at 04:00, no record at 08:00, a peak at 16:00.
const day: Slot[] = [
  { hour: 0, requests: 10 },
  { hour: 4, requests: 0 },
  { hour: 8, requests: null },
  { hour: 12, requests: 60 },
  { hour: 16, requests: 90 },
  { hour: 20, requests: 40 },
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
const tiles = (host: HTMLElement) =>
  [...host.querySelectorAll('.lilt-chart__legend-item')].map(
    (item) =>
      `${item.querySelector('.lilt-chart__legend-label')?.textContent}: ${item.querySelector('.lilt-chart__legend-value')?.textContent}`,
  );

describe('clockLabel', () => {
  it('reads hours as clock times and wraps at midnight', () => {
    expect(clockLabel(14)).toBe('14:00');
    expect(clockLabel(3 + 1 / 3)).toBe('03:20');
    expect(clockLabel(24)).toBe('00:00');
  });
});

describe('ActivityRingCard', { timeout: 15_000 }, () => {
  const card = (
    props: Partial<React.ComponentProps<typeof ActivityRingCard<Slot, 'requests'>>> = {},
  ) => (
    <ActivityRingCard
      motion="none"
      title="Request rhythm"
      data={day}
      hour="hour"
      value="requests"
      bucketMinutes={240}
      {...props}
    />
  );

  it('totals the day, names the busiest and quietest times, and keys the gap', async () => {
    const { host, unmount } = await render(card({ delta: 0.12 }));
    try {
      expect(headline(host)).toContain('200');
      expect(host.querySelector('.lilt-card__delta')?.textContent).toBe('+12.0%');
      // A measured zero is the quietest time; the unrecorded slot is not.
      expect(tiles(host)).toEqual(['Busiest · 16:00: 90', 'Quietest · 04:00: 0']);
      expect(host.querySelector('.lilt-activity__center')?.textContent).toBe('90peak · 16:00');
      expect(host.querySelector('.lilt-activity-card__footer')?.textContent).toBe(
        '1 time slot has no data and stays empty rather than reading as zero.',
      );
    } finally {
      unmount();
    }
  });

  it('reads the slot under focus in the headline', async () => {
    const { host, unmount } = await render(card());
    try {
      const svg = host.querySelector<SVGSVGElement>('.lilt-activity svg')!;
      const key = (name: string) =>
        act(async () => {
          svg.dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true }));
        });
      await key('ArrowRight');
      expect(headline(host)).toContain('0');
      expect(caption(host)).toBe('04:00 · requests');
      await key('ArrowRight');
      expect(headline(host)).toBe('—');
      expect(caption(host)).toBe('08:00 · No data');
      await key('Escape');
      expect(host.querySelector('.lilt-card__caption')).toBeNull();
      expect(headline(host)).toContain('200');
    } finally {
      unmount();
    }
  });

  it('follows the chosen aggregate and unit', async () => {
    const { host, rerender, unmount } = await render(card({ aggregate: 'max', unit: 'calls' }));
    try {
      expect(headline(host)).toContain('90');
      await rerender(card({ aggregate: 'mean' }));
      expect(headline(host)).toContain('40');
    } finally {
      unmount();
    }
  });

  it('shows no readings while loading', async () => {
    const { host, unmount } = await render(card({ loading: true }));
    try {
      expect(host.querySelector('.lilt-activity__center')?.textContent).toBe('');
      expect(tiles(host)).toEqual(['Busiest: ', 'Quietest: ']);
      expect(host.querySelector('.lilt-activity-card__footer')).toBeNull();
    } finally {
      unmount();
    }
  });

  it('explains data it cannot place instead of failing', async () => {
    const { host, rerender, unmount } = await render(card({ bucketMinutes: 90 }));
    try {
      expect(host.querySelector('.lilt-chart__status--error')?.textContent).toBe(
        'Every time must fall on a 90-minute slot between 0 and 24, once.',
      );
      await rerender(card({ bucketMinutes: 7 }));
      expect(host.querySelector('.lilt-chart__status--error')?.textContent).toMatch(
        /must divide a day evenly/,
      );
      await rerender(card({ maximum: 50 }));
      expect(host.querySelector('.lilt-chart__status--error')?.textContent).toMatch(
        /no higher than `maximum`/,
      );
      await rerender(card({ data: [] }));
      expect(host.querySelector('.lilt-chart-empty__text')?.textContent).toBe(
        'No data for this period',
      );
    } finally {
      unmount();
    }
  });

  it('swaps periods from the range select', async () => {
    const quiet = day.map((slot) => ({
      ...slot,
      requests: slot.requests === null ? null : slot.requests / 2,
    }));
    const { host, unmount } = await render(
      card({
        data: undefined,
        ranges: [
          { id: 'today', label: 'Today', data: day, delta: 0.2 },
          { id: 'yesterday', label: 'Yesterday', data: quiet, delta: -0.1 },
        ],
      }),
    );
    try {
      await choosePeriod(host, 'yesterday');
      expect(headline(host)).toContain('100');
      expect(tiles(host)[0]).toBe('Busiest · 16:00: 45');
    } finally {
      unmount();
    }
  });
});
