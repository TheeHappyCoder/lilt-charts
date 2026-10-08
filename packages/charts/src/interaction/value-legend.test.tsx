// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { ValueLegend } from './value-legend';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('ValueLegend keyboard and swatches', () => {
  it('uses square color keys and lets arrows move between values', async () => {
    const selected = vi.fn();
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    try {
      await act(async () =>
        root.render(
          <ValueLegend
            items={[
              { id: 'a', label: 'A', color: '#f00', value: 1, formattedValue: '1' },
              { id: 'b', label: 'B', color: '#0f0', value: 2, formattedValue: '2' },
            ]}
            onSelectedIdChange={selected}
          />,
        ),
      );
      const buttons = host.querySelectorAll<HTMLButtonElement>('.lilt-chart__legend-toggle');
      expect(host.querySelectorAll('.lilt-chart__legend-swatch')).toHaveLength(2);
      expect(host.querySelector('.lilt-chart__legend-item')?.getAttribute('style')).toContain(
        '#f00',
      );
      await act(async () => buttons[0]?.focus());
      await act(async () =>
        buttons[0]?.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
        ),
      );
      expect(document.activeElement).toBe(buttons[1]);
      await act(async () =>
        buttons[1]?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })),
      );
      expect(selected).toHaveBeenCalledWith(null);
    } finally {
      await act(async () => root.unmount());
      host.remove();
    }
  });
});

describe('ValueLegend layouts', () => {
  const items = [
    { id: 'a', label: 'A', color: '#f00', value: 40, formattedValue: '40' },
    { id: 'b', label: 'B', color: '#0f0', value: 10, formattedValue: '10' },
    { id: 'c', label: 'C', color: '#00f', value: null, formattedValue: '—' },
    { id: 'd', label: 'D', color: '#ff0', value: -5, formattedValue: '−5' },
  ];
  const render = async (element: React.ReactElement) => {
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
  };

  it('keeps cards as the default, with square marks', async () => {
    const { host, unmount } = await render(<ValueLegend items={items} />);
    try {
      const legend = host.querySelector('.lilt-chart__legend')!;
      expect(legend.getAttribute('data-variant')).toBe('cards');
      expect(legend.hasAttribute('data-swatch')).toBe(false);
      expect(host.querySelector('.lilt-chart__legend-meter')).toBeNull();
    } finally {
      unmount();
    }
  });

  it('shows every value in list, pills and bars, and only marks in inline', async () => {
    for (const variant of ['list', 'pills', 'bars', 'inline'] as const) {
      const { host, unmount } = await render(
        <ValueLegend items={items} variant={variant} swatch="line" />,
      );
      try {
        const legend = host.querySelector('.lilt-chart__legend')!;
        expect(legend.getAttribute('data-variant')).toBe(variant);
        expect(legend.getAttribute('data-swatch')).toBe('line');
        const values = [...host.querySelectorAll('.lilt-chart__legend-value')].map(
          (node) => node.textContent,
        );
        expect(values).toEqual(variant === 'inline' ? [] : ['40', '10', '—', '−5']);
      } finally {
        unmount();
      }
    }
  });

  it('measures bars against the largest value, leaving missing and negative ones empty', async () => {
    const { host, unmount } = await render(<ValueLegend items={items} variant="bars" />);
    try {
      const widths = [
        ...host.querySelectorAll<HTMLElement>('.lilt-chart__legend-meter > span'),
      ].map((bar) => bar.style.width);
      expect(widths).toEqual(['100%', '25%', '0%', '0%']);
    } finally {
      unmount();
    }
  });

  it('measures only against the series still shown', async () => {
    const { host, unmount } = await render(
      <ValueLegend items={items} variant="bars" hiddenIds={['a']} onHiddenIdsChange={() => {}} />,
    );
    try {
      const widths = [
        ...host.querySelectorAll<HTMLElement>('.lilt-chart__legend-meter > span'),
      ].map((bar) => bar.style.width);
      expect(widths.slice(0, 2)).toEqual(['100%', '100%']);
    } finally {
      unmount();
    }
  });
});
