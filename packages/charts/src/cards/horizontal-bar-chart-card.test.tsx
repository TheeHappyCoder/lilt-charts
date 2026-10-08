// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import { HorizontalBarChartCard, rankRows } from './horizontal-bar-chart-card';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const channels = [
  { channel: 'Email', revenue: 20 as number | null },
  { channel: 'Organic', revenue: 50 },
  { channel: 'Direct', revenue: 30 },
  { channel: 'Referral', revenue: null },
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

const text = (host: HTMLElement, selector: string) =>
  [...host.querySelectorAll(selector)].map((node) => node.textContent);

describe('HorizontalBarChartCard', { timeout: 15_000 }, () => {
  it('ranks rows, totals observed values, and gives each a share', async () => {
    const { host, unmount } = await render(
      <HorizontalBarChartCard
        motion="none"
        title="Revenue"
        data={channels}
        category="channel"
        value="revenue"
        delta={0.1}
      />,
    );
    try {
      expect(text(host, '.lilt-list__label')).toEqual(['Organic', 'Direct', 'Email', 'Referral']);
      expect(host.querySelector('.lilt-card__value')?.textContent).toContain('100');
      expect(text(host, '.lilt-list__share')).toEqual(['50%', '30%', '20%', '—']);
      // The missing row says so and draws no bar; it is never a zero.
      expect(text(host, '.lilt-list__value').at(-1)).toBe('No data');
      expect(host.querySelectorAll('.lilt-list__bar')).toHaveLength(3);
      const widths = [...host.querySelectorAll<HTMLElement>('.lilt-list__bar')].map(
        (bar) => bar.style.width,
      );
      expect(widths).toEqual(['100%', '60%', '40%']);
    } finally {
      unmount();
    }
  });

  it('reads the hovered row in the headline with its share', async () => {
    const { host, unmount } = await render(
      <HorizontalBarChartCard
        motion="none"
        title="Revenue"
        data={channels}
        category="channel"
        value="revenue"
      />,
    );
    try {
      const rows = host.querySelectorAll('.lilt-list__row');
      await act(async () => {
        rows[1]!.dispatchEvent(new PointerEvent('pointerover', { bubbles: true }));
      });
      expect(host.querySelector('.lilt-card__value')?.textContent).toContain('30');
      expect(host.querySelector('.lilt-card__caption')?.textContent).toBe('Direct · 30%');
      expect(host.querySelectorAll('li[data-muted]')).toHaveLength(3);
      // Arrow keys move through the list.
      await act(async () => {
        (rows[1] as HTMLButtonElement).focus();
        rows[1]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      });
      expect(document.activeElement).toBe(rows[2]);
    } finally {
      unmount();
    }
  });

  it('hides shares when values mix gains and losses', async () => {
    const { host, unmount } = await render(
      <HorizontalBarChartCard
        motion="none"
        title="Change"
        data={[
          { product: 'A', change: 40 },
          { product: 'B', change: -10 },
        ]}
        category="product"
        value="change"
      />,
    );
    try {
      expect(host.querySelectorAll('.lilt-list__share')).toHaveLength(0);
      expect(host.querySelectorAll('.lilt-list__zero')).toHaveLength(2);
      expect(host.querySelector('.lilt-list__bar[data-negative]')).not.toBeNull();
    } finally {
      unmount();
    }
  });

  it('blurs only the rows that change rank while they travel', async () => {
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    const card = (data: typeof channels) => (
      <HorizontalBarChartCard title="Revenue" data={data} category="channel" value="revenue" />
    );
    const travelling = () =>
      [...host.querySelectorAll<HTMLElement>('.lilt-list__rows > li[data-travel]')].map(
        (row) => row.querySelector('.lilt-list__label')?.textContent,
      );
    try {
      await act(async () => root.render(card(channels)));
      expect(travelling()).toEqual([]);
      // Email overtakes Direct; Organic keeps first place and stays still.
      await act(async () =>
        root.render(
          card(channels.map((row) => (row.channel === 'Email' ? { ...row, revenue: 40 } : row))),
        ),
      );
      expect(travelling().sort()).toEqual(['Direct', 'Email']);
    } finally {
      act(() => root.unmount());
      host.remove();
    }
  });

  it('folds rows past the limit into one Other row that keeps the total', () => {
    const rows = rankRows(
      [
        { name: 'a', value: 10 },
        { name: 'b', value: 40 },
        { name: 'c', value: 5 },
        { name: 'd', value: null },
        { name: 'e', value: 15 },
      ],
      'name',
      'value',
      'descending',
      2,
      'Other',
    );
    expect(rows.map((row) => [row.label, row.value])).toEqual([
      ['b', 40],
      ['e', 15],
      ['Other', 15],
    ]);
    // A limit that would hide a single row shows it instead of an "Other" of one.
    expect(
      rankRows(
        [
          { name: 'a', value: 1 },
          { name: 'b', value: 2 },
        ],
        'name',
        'value',
        'descending',
        1,
        'Other',
      ),
    ).toHaveLength(2);
  });

  it('reports duplicate names instead of drawing them', async () => {
    const { host, unmount } = await render(
      <HorizontalBarChartCard
        motion="none"
        title="Revenue"
        data={[
          { channel: 'Email', revenue: 1 },
          { channel: 'Email', revenue: 2 },
        ]}
        category="channel"
        value="revenue"
      />,
    );
    try {
      expect(host.querySelector('.lilt-chart__status')?.textContent).toContain('Duplicate');
    } finally {
      unmount();
    }
  });
});

describe('HorizontalBarChartCard with a selection you own', { timeout: 15_000 }, () => {
  it('shows the owner’s pin and asks before changing it', async () => {
    const requests: (string | null)[] = [];
    const { host, unmount } = await render(
      <HorizontalBarChartCard
        motion="none"
        title="Revenue"
        data={channels}
        category="channel"
        value="revenue"
        selected="Direct"
        onSelectedChange={(next) => requests.push(next)}
      />,
    );
    try {
      const pressed = () =>
        [...host.querySelectorAll('[aria-pressed="true"]')].map((node) =>
          node.getAttribute('aria-label'),
        );
      expect(pressed()).toEqual(['Direct: 30, 30% of total']);
      const organic = host.querySelector<HTMLButtonElement>('[data-glide-id="Organic"]')!;
      await act(async () => organic.click());
      expect(requests).toEqual(['Organic']);
      // The owner has not agreed, so Direct stays pinned.
      expect(pressed()).toEqual(['Direct: 30, 30% of total']);
    } finally {
      unmount();
    }
  });
});
