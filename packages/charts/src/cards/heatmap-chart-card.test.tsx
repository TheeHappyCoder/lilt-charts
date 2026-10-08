// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import { cellStrength, HeatmapChartCard, heatmapGrid, labelTier } from './heatmap-chart-card';
import { choosePeriod } from '../test-utils/choose-period';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

interface Cell {
  day: string;
  hour: string;
  visits: number | null;
}

// Two days by three hours. Tue 12:00 has no row at all and Mon 18:00 is null: both are missing.
// Tue 06:00 is a measured zero.
const cells: Cell[] = [
  { day: 'Mon', hour: '06:00', visits: 20 },
  { day: 'Mon', hour: '12:00', visits: 80 },
  { day: 'Mon', hour: '18:00', visits: null },
  { day: 'Tue', hour: '06:00', visits: 0 },
  { day: 'Tue', hour: '18:00', visits: 40 },
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

const text = (host: HTMLElement, selector: string) =>
  [...host.querySelectorAll(selector)].map((node) => node.textContent);
const headline = (host: HTMLElement) => host.querySelector('.lilt-card__value')?.textContent;
const buttons = (host: HTMLElement) => [
  ...host.querySelectorAll<HTMLButtonElement>('.lilt-heatmap-card__cell'),
];

describe('heatmapGrid', () => {
  const grid = (overrides: Partial<Parameters<typeof heatmapGrid<Cell>>[0]> = {}) =>
    heatmapGrid<Cell>({ data: cells, x: 'hour', y: 'day', value: 'visits', ...overrides });

  it('keeps first-seen order and fills absent cells as missing, not zero', () => {
    const result = grid();
    expect(result.error).toBeNull();
    expect(result.rows).toEqual(['Mon', 'Tue']);
    expect(result.columns).toEqual(['06:00', '12:00', '18:00']);
    expect(result.cells.map((cell) => cell.value)).toEqual([20, 80, null, 0, null, 40]);
    expect(result.cells[4]!.datum).toBeNull();
    // Zero sits at the low end of the scale; a missing cell has no intensity at all.
    expect(result.domain).toEqual([0, 80]);
    expect(result.cells.map((cell) => cell.intensity)).toEqual([0.25, 1, null, 0, null, 0.5]);
  });

  it('follows explicit row and column order, including cells with no data', () => {
    const result = grid({ rows: ['Tue', 'Mon', 'Wed'], columns: ['18:00', '12:00', '06:00'] });
    expect(result.rows).toEqual(['Tue', 'Mon', 'Wed']);
    expect(result.cells.slice(0, 3).map((cell) => cell.value)).toEqual([40, null, 0]);
    expect(result.cells.slice(6).every((cell) => cell.value === null)).toBe(true);
  });

  it('uses a fixed domain so periods compare on one scale', () => {
    const result = grid({ domain: [0, 200] });
    expect(result.cells[1]!.intensity).toBe(0.4);
  });

  it('explains data it cannot place', () => {
    expect(grid({ data: [...cells, { day: 'Mon', hour: '06:00', visits: 1 }] }).error).toBe(
      'Mon, 06:00 appears twice; each cell needs one row.',
    );
    expect(grid({ columns: ['06:00', '12:00'] }).error).toBe('“18:00” isn’t listed in `columns`.');
    expect(grid({ domain: [0, 50] }).error).toMatch(/falls outside `domain`/);
    expect(grid({ domain: [10, 10] }).error).toMatch(/low end below its high end/);
  });

  it('gives a measured zero a visible tint', () => {
    expect(cellStrength(0)).toBeGreaterThan(0);
    expect(cellStrength(1)).toBeLessThanOrEqual(100);
  });

  it('thins axis labels only when there are many columns', () => {
    expect(Array.from({ length: 7 }, (_, index) => labelTier(index, 7))).toEqual(
      Array(7).fill('major'),
    );
    const hours = Array.from({ length: 24 }, (_, index) => labelTier(index, 24));
    expect(hours.filter((tier) => tier !== 'hidden')).toHaveLength(12);
    expect(hours.slice(0, 4)).toEqual(['major', 'hidden', 'minor', 'hidden']);
  });
});

describe('HeatmapChartCard', { timeout: 15_000 }, () => {
  const card = (
    props: Partial<React.ComponentProps<typeof HeatmapChartCard<Cell, 'visits'>>> = {},
  ) => (
    <HeatmapChartCard
      motion="none"
      title="Visits"
      data={cells}
      x="hour"
      y="day"
      value="visits"
      {...props}
    />
  );

  it('draws every cell, labels rows and columns, and keys missing cells', async () => {
    const { host, unmount } = await render(card());
    try {
      expect(buttons(host)).toHaveLength(6);
      expect(text(host, '.lilt-heatmap-card__row-label')).toEqual(['Mon', 'Tue']);
      expect(text(host, '.lilt-heatmap-card__column-label')).toEqual(['06:00', '12:00', '18:00']);
      expect(buttons(host).map((cell) => cell.getAttribute('aria-label'))).toEqual([
        'Mon, 06:00: 20',
        'Mon, 12:00: 80',
        'Mon, 18:00: No data',
        'Tue, 06:00: 0',
        'Tue, 12:00: No data',
        'Tue, 18:00: 40',
      ]);
      expect(host.querySelectorAll('.lilt-heatmap-card__cell[data-missing]')).toHaveLength(2);
      // The measured zero is tinted; only missing cells go without a strength.
      const zero = buttons(host)[3]!;
      expect(zero.style.getPropertyValue('--lilt-heatmap-card-strength')).toBe('12%');
      expect(buttons(host)[2]!.style.getPropertyValue('--lilt-heatmap-card-strength')).toBe('');
      expect(host.querySelector('.lilt-heatmap-card__key')?.textContent).toBe('No data');
      expect(text(host, '.lilt-heatmap-card__scale > span')).toEqual(['0', '', '80']);
      expect(host.querySelector('table')?.getAttribute('aria-label')).toBe('Visits');
    } finally {
      unmount();
    }
  });

  it('headlines the sum of known cells, or the chosen aggregate', async () => {
    const { host, rerender, unmount } = await render(card({ delta: 0.12 }));
    try {
      expect(headline(host)).toContain('140');
      expect(host.querySelector('.lilt-card__delta')?.textContent).toBe('+12.0%');
      await rerender(card({ aggregate: 'mean' }));
      expect(headline(host)).toContain('35');
      await rerender(card({ aggregate: 'max' }));
      expect(headline(host)).toContain('80');
      await rerender(card({ headline: 999 }));
      expect(headline(host)).toContain('999');
    } finally {
      unmount();
    }
  });

  it('reads a hovered cell and lights its row and column', async () => {
    const { host, unmount } = await render(card());
    try {
      const noon = buttons(host)[1]!;
      await act(async () => {
        noon.dispatchEvent(new PointerEvent('pointerover', { bubbles: true }));
      });
      expect(headline(host)).toContain('80');
      expect(host.querySelector('.lilt-card__caption')?.textContent).toBe('Mon · 12:00');
      // Everything outside Mon and 12:00 dims: Tue 06:00 and Tue 18:00.
      expect(host.querySelectorAll('.lilt-heatmap-card__cell[data-muted]')).toHaveLength(2);
      expect(host.querySelector('.lilt-heatmap-card__row-label[data-active]')?.textContent).toBe(
        'Mon',
      );
      expect(host.querySelector('.lilt-heatmap-card__column-label[data-active]')?.textContent).toBe(
        '12:00',
      );

      const gap = buttons(host)[4]!;
      await act(async () => {
        noon.dispatchEvent(new PointerEvent('pointerout', { bubbles: true }));
        gap.dispatchEvent(new PointerEvent('pointerover', { bubbles: true }));
      });
      expect(headline(host)).toBe('—');
      expect(host.querySelector('.lilt-card__caption')?.textContent).toBe('Tue · 12:00 · No data');

      await act(async () => {
        gap.dispatchEvent(new PointerEvent('pointerout', { bubbles: true }));
      });
      expect(headline(host)).toContain('140');
      expect(host.querySelector('.lilt-heatmap-card__cell[data-muted]')).toBeNull();
    } finally {
      unmount();
    }
  });

  it('moves between cells with the arrow keys and pins with a click', async () => {
    const { host, unmount } = await render(card());
    try {
      const all = buttons(host);
      // One tab stop for the whole grid.
      expect(all.filter((cell) => cell.tabIndex === 0)).toHaveLength(1);
      await act(async () => all[0]!.focus());
      await act(async () => {
        all[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      });
      expect(document.activeElement).toBe(all[1]);
      await act(async () => {
        all[1]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      });
      expect(document.activeElement).toBe(all[4]);
      expect(host.querySelector('.lilt-card__caption')?.textContent).toBe('Tue · 12:00 · No data');

      await act(async () => all[5]!.click());
      expect(all[5]!.getAttribute('aria-pressed')).toBe('true');
      await act(async () => all[4]!.blur());
      expect(host.querySelector('.lilt-card__caption')?.textContent).toBe('Tue · 18:00');
      await act(async () => {
        all[5]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      });
      expect(all[5]!.getAttribute('aria-pressed')).toBe('false');
    } finally {
      unmount();
    }
  });

  it('lets go of a pin on a press that misses the cells, or Escape after a press inside', async () => {
    const { host, unmount } = await render(card());
    const outside = document.createElement('p');
    document.body.append(outside);
    try {
      const all = buttons(host);
      await act(async () => all[1]!.click());
      expect(all[1]!.getAttribute('aria-pressed')).toBe('true');
      await act(async () => {
        outside.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      });
      expect(all[1]!.getAttribute('aria-pressed')).toBe('false');

      // Empty space in the card lets go too; a press on a cell does not.
      await act(async () => all[3]!.click());
      await act(async () => {
        all[3]!.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      });
      expect(all[3]!.getAttribute('aria-pressed')).toBe('true');
      await act(async () => {
        host
          .querySelector('.lilt-card__header')!
          .dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      });
      expect(all[3]!.getAttribute('aria-pressed')).toBe('false');

      // A pointer pin leaves focus on the page, not the cell; Escape still belongs to the card.
      await act(async () => {
        all[2]!.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
        all[2]!.click();
        all[2]!.blur();
      });
      expect(all[2]!.getAttribute('aria-pressed')).toBe('true');
      await act(async () => {
        document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      });
      expect(all[2]!.getAttribute('aria-pressed')).toBe('false');
    } finally {
      outside.remove();
      unmount();
    }
  });

  it('swaps periods from the range select', async () => {
    const quiet = cells.map((cell) => ({ ...cell, visits: cell.visits === null ? null : 1 }));
    const { host, unmount } = await render(
      card({
        data: undefined,
        ranges: [
          { id: 'week', label: 'This week', data: cells, delta: 0.1 },
          { id: 'last', label: 'Last week', data: quiet, delta: -0.2 },
        ],
      }),
    );
    try {
      expect(headline(host)).toContain('140');
      await choosePeriod(host, 'last');
      expect(headline(host)).toContain('4');
      expect(host.querySelector('.lilt-card__delta')?.textContent).toBe('-20.0%');
    } finally {
      unmount();
    }
  });

  it('shows a placeholder grid while loading, then an error for data it cannot place', async () => {
    const { host, rerender, unmount } = await render(card({ data: [], loading: true }));
    try {
      expect(host.querySelectorAll('.lilt-heatmap-card__skeleton')).toHaveLength(84);
      expect(buttons(host)).toHaveLength(0);
      await rerender(card({ data: [...cells, cells[0]!] }));
      expect(host.querySelector('.lilt-chart__status--error')?.textContent).toBe(
        'Mon, 06:00 appears twice; each cell needs one row.',
      );
      await rerender(card({ data: [] }));
      expect(host.querySelector('.lilt-chart-empty__text')?.textContent).toBe(
        'No data for this period',
      );
    } finally {
      unmount();
    }
  });

  it('turns off cell motion when asked', async () => {
    const { host, unmount } = await render(card());
    try {
      expect(host.querySelector('table')?.getAttribute('data-motion')).toBe('none');
    } finally {
      unmount();
    }
  });
});
