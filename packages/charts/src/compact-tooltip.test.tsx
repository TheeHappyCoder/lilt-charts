// @vitest-environment jsdom

import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChartPlot } from './chart-plot';
import { Line } from './primitives/line';
import { Tooltip } from './interaction/tooltip';
import { Chart } from './runtime/chart-runtime';
import type { TooltipProps } from './types';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const keys = ['lifeSafety', 'critical', 'urgent', 'advisory'] as const;
type Row = { id: string; label: string } & Record<(typeof keys)[number], number>;

/** Twenty-four buckets whose date labels repeat: identity is the ID, the label is display. */
const rows: readonly Row[] = Array.from({ length: 24 }, (_, index) => ({
  id: String(index),
  label: `Oct ${1 + Math.floor(index / 4)}`,
  lifeSafety: index % 3,
  critical: (index * 2) % 6,
  urgent: (index * 3) % 7,
  advisory: (index + 1) % 4,
}));

const series = keys.map((key) => ({
  id: key,
  label: key,
  accessor: (row: Row) => row[key],
}));

afterEach(() => vi.restoreAllMocks());

/** A fixed dashboard widget: a 246px-wide chart whose plot is 132px tall. */
async function renderWidget(tooltip: TooltipProps, width = 246) {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    width,
    height: 132,
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: width,
    bottom: 132,
    toJSON: () => ({}),
  });
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  await act(async () =>
    root.render(
      <Chart
        aria-label="Alarm activity"
        data={rows}
        series={series}
        x={{
          type: 'category',
          accessor: (row) => row.id,
          format: (id) => rows[Number(id)]?.label ?? id,
        }}
        motion="none"
      >
        <ChartPlot height={132} compactHeight={132} pill={false} tooltip={<Tooltip {...tooltip} />}>
          {keys.map((key) => (
            <Line key={key} series={key} />
          ))}
        </ChartPlot>
      </Chart>,
    ),
  );
  const input = container.querySelector<HTMLInputElement>('.lilt-chart__keyboard-input input')!;
  const press = (key: string) =>
    act(async () => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    });
  return {
    container,
    input,
    press,
    unmount: async () => {
      await act(async () => root.unmount());
      container.remove();
    },
  };
}

describe('inspection in a small fixed-height plot', () => {
  it('reserves the narrow readout below the plot by default', async () => {
    const widget = await renderWidget({});
    try {
      await act(async () => widget.input.focus());
      expect(widget.container.querySelector('.lilt-chart__adaptive-readout')).not.toBeNull();
      expect(widget.container.querySelector('.lilt-chart__tooltip')).toBeNull();
    } finally {
      await widget.unmount();
    }
  });

  it('keeps every bucket inspectable when date labels repeat', async () => {
    const widget = await renderWidget({ adaptive: false });
    try {
      expect(widget.input.max).toBe('23');
    } finally {
      await widget.unmount();
    }
  });

  it('turns compact and carries the key hints when the panel would not fit', async () => {
    const widget = await renderWidget({ adaptive: false });
    try {
      await act(async () => widget.input.focus());
      await widget.press('ArrowLeft');
      await widget.press('Enter');
      const tooltip = widget.container.querySelector<HTMLElement>('.lilt-chart__tooltip')!;
      expect(tooltip.dataset.density).toBe('compact');
      expect(tooltip.dataset.pinned).toBe('true');
      // All four values, Unpin beside the date, and the hints that replace the slider panel.
      expect(tooltip.querySelectorAll('.lilt-chart__tooltip-row')).toHaveLength(4);
      expect(tooltip.querySelector('.lilt-chart__tooltip-release')?.textContent).toBe('Unpin');
      expect(tooltip.querySelector('.lilt-chart__tooltip-actions')).toBeNull();
      expect(tooltip.hasAttribute('data-keyboard-hint')).toBe(true);
      expect(tooltip.querySelector('.lilt-chart__tooltip-hint')?.textContent).toContain(
        'Up and Down switch series.',
      );
      // Never taller than the plot.
      const panel = tooltip.querySelector<HTMLElement>('.lilt-chart__tooltip-panel')!;
      expect(Number.parseFloat(panel.style.maxHeight)).toBeLessThanOrEqual(132);

      await act(async () => {
        tooltip.querySelector<HTMLButtonElement>('.lilt-chart__tooltip-release')!.click();
      });
      expect(widget.container.querySelector('.lilt-chart__tooltip[data-pinned]')).toBeNull();
    } finally {
      await widget.unmount();
    }
  });

  it('drops the hints when focus leaves the slider', async () => {
    const widget = await renderWidget({ adaptive: false });
    try {
      await act(async () => widget.input.focus());
      await widget.press('ArrowLeft');
      expect(widget.container.querySelector('.lilt-chart__tooltip-hint')).not.toBeNull();
      await act(async () => widget.input.blur());
      expect(widget.container.querySelector('.lilt-chart__tooltip-hint')).toBeNull();
    } finally {
      await widget.unmount();
    }
  });

  it('honors an explicit density', async () => {
    const widget = await renderWidget({ adaptive: false, density: 'comfortable' });
    try {
      await act(async () => widget.input.focus());
      await widget.press('ArrowLeft');
      await widget.press('Enter');
      const tooltip = widget.container.querySelector<HTMLElement>('.lilt-chart__tooltip')!;
      expect(tooltip.dataset.density).toBe('comfortable');
      expect(tooltip.querySelector('.lilt-chart__tooltip-actions')?.textContent).toBe('Unpin');
    } finally {
      await widget.unmount();
    }
  });
});
