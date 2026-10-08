// @vitest-environment jsdom

import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChartPlot } from './chart-plot';
import { Line } from './primitives/line';
import { Tooltip } from './interaction/tooltip';
import { Chart } from './runtime/chart-runtime';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type Row = { x: number; value: number };
const rows: readonly Row[] = [
  { x: 1, value: 2 },
  { x: 2, value: 4 },
];

afterEach(() => vi.restoreAllMocks());

describe('custom tooltip content', () => {
  it('keeps wrapped Tooltip content in the narrow readout', async () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      width: 360,
      height: 240,
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 360,
      bottom: 240,
      toJSON: () => ({}),
    });
    const WrappedTooltip = () => (
      <Tooltip renderContent={({ row }) => <span>{(row as Row).value} from wrapper</span>} />
    );
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    try {
      await act(async () =>
        root.render(
          <Chart
            data={rows}
            series={[{ id: 'value', label: 'Value', accessor: (row: Row) => row.value }]}
            x={{ type: 'number', accessor: (row: Row) => row.x }}
            aria-label="Narrow wrapper"
            motion="none"
          >
            <ChartPlot height={240} tooltip={<WrappedTooltip />}>
              <Line series="value" />
            </ChartPlot>
          </Chart>,
        ),
      );
      const input = container.querySelector<HTMLInputElement>('.lilt-chart__keyboard-input input')!;
      await act(async () => input.focus());
      expect(container.querySelector('.lilt-chart__adaptive-custom')?.textContent).toBe(
        '4 from wrapper',
      );
    } finally {
      await act(async () => root.unmount());
      container.remove();
    }
  });

  it('mounts tooltip content through a consumer wrapper', async () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      width: 700,
      height: 240,
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 700,
      bottom: 240,
      toJSON: () => ({}),
    });
    function WrappedTooltip() {
      return (
        <Tooltip renderContent={({ row }) => <span>{(row as Row).value} from wrapper</span>} />
      );
    }
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    try {
      await act(async () =>
        root.render(
          <Chart
            aria-label="Wrapped tooltip"
            data={rows}
            motion="none"
            series={[{ id: 'value', label: 'Value', accessor: (row: Row) => row.value }]}
            x={{ type: 'number', accessor: (row: Row) => row.x }}
          >
            <ChartPlot height={240} tooltip={<WrappedTooltip />}>
              <Line series="value" />
            </ChartPlot>
          </Chart>,
        ),
      );
      const input = container.querySelector<HTMLInputElement>('.lilt-chart__keyboard-input input')!;
      await act(async () => input.focus());
      expect(container.querySelector('.lilt-chart__tooltip-custom')?.textContent).toBe(
        '4 from wrapper',
      );
    } finally {
      await act(async () => root.unmount());
      container.remove();
    }
  });
  it('updates the custom reading without replacing or changing plot geometry', async () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      width: 700,
      height: 240,
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 700,
      bottom: 240,
      toJSON: () => ({}),
    });
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    const renderChart = (formatValue: (value: number) => string) => (
      <Chart
        aria-label="Custom reading geometry"
        data={rows}
        motion="none"
        series={[{ id: 'value', label: 'Value', accessor: (row: Row) => row.value, formatValue }]}
        x={{ type: 'number', accessor: (row: Row) => row.x }}
      >
        <ChartPlot
          height={240}
          tooltip={{
            renderContent: ({ formattedX, series }) => (
              <span>
                Sample {formattedX} · {series[0]?.formattedValue}
              </span>
            ),
          }}
        >
          <Line series="value" />
        </ChartPlot>
      </Chart>
    );

    try {
      await act(async () => root.render(renderChart((value) => `${value} ms`)));

      const path = container.querySelector<SVGPathElement>('[data-lilt-path="value"]')!;
      expect(path).not.toBeNull();
      const geometry = path.getAttribute('d');
      const input = container.querySelector<HTMLInputElement>('.lilt-chart__keyboard-input input')!;
      await act(async () => input.focus());
      await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, '0');
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
      expect(container.querySelector('.lilt-chart__tooltip-custom')?.textContent).toBe(
        'Sample 1 · 2 ms',
      );

      await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, '1');
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
      expect(container.querySelector('.lilt-chart__tooltip-custom')?.textContent).toBe(
        'Sample 2 · 4 ms',
      );
      expect(container.querySelector('[data-lilt-path="value"]')).toBe(path);
      expect(path.getAttribute('d')).toBe(geometry);

      await act(async () => root.render(renderChart((value) => `${value * 10} ticks`)));
      expect(container.querySelector('.lilt-chart__tooltip-custom')?.textContent).toBe(
        'Sample 2 · 40 ticks',
      );
      expect(container.querySelector('[data-lilt-path="value"]')).toBe(path);
      expect(path.getAttribute('d')).toBe(geometry);
    } finally {
      await act(async () => root.unmount());
      container.remove();
    }
  });

  it('keeps hover content out of keyboard navigation and restores focus after Escape', async () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      width: 700,
      height: 240,
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 700,
      bottom: 240,
      toJSON: () => ({}),
    });
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    try {
      await act(async () =>
        root.render(
          <Chart
            aria-label="Tooltip actions"
            data={rows}
            motion="none"
            series={[{ id: 'value', label: 'Value', accessor: (row: Row) => row.value }]}
            x={{ type: 'number', accessor: (row: Row) => row.x }}
          >
            <ChartPlot
              height={240}
              tooltip={{ renderContent: () => <button type="button">Inspect details</button> }}
            >
              <Line series="value" />
            </ChartPlot>
          </Chart>,
        ),
      );

      const input = container.querySelector<HTMLInputElement>('.lilt-chart__keyboard-input input');
      expect(input).not.toBeNull();
      await act(async () => input!.focus());
      const panel = container.querySelector<HTMLElement>('.lilt-chart__tooltip');
      expect(panel?.hasAttribute('inert')).toBe(true);
      expect(panel?.querySelector('button')?.textContent).toBe('Inspect details');

      await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, '0');
        input!.dispatchEvent(new Event('input', { bubbles: true }));
      });
      expect(panel?.getAttribute('data-pinned')).toBe('true');
      expect(panel?.hasAttribute('inert')).toBe(false);
      expect(panel?.querySelector('.lilt-chart__tooltip-swatch')).toBeNull();
      expect(panel?.querySelector('.lilt-chart__tooltip-custom')?.textContent).toBe(
        'Inspect details',
      );

      const action = panel!.querySelector<HTMLButtonElement>('button')!;
      action.focus();
      expect(document.activeElement).toBe(action);
      await act(async () => {
        action.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      });
      expect(document.activeElement).toBe(container.querySelector('.lilt-chart__plot-host'));
      expect(container.querySelector('.lilt-chart__tooltip-custom')).toBeNull();
    } finally {
      await act(async () => root.unmount());
      container.remove();
    }
  });

  it('keeps actions in the compact readout and returns focus after Escape', async () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      width: 320,
      height: 240,
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 320,
      bottom: 240,
      toJSON: () => ({}),
    });
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    try {
      await act(async () =>
        root.render(
          <Chart
            aria-label="Compact tooltip"
            data={rows}
            motion="none"
            series={[{ id: 'value', label: 'Value', accessor: (row: Row) => row.value }]}
            x={{ type: 'number', accessor: (row: Row) => row.x }}
          >
            <ChartPlot
              height={240}
              tooltip={{ renderContent: () => <button type="button">Inspect details</button> }}
            >
              <Line series="value" />
            </ChartPlot>
          </Chart>,
        ),
      );
      const input = container.querySelector<HTMLInputElement>('.lilt-chart__keyboard-input input')!;
      await act(async () => input.focus());
      expect(container.querySelector('.lilt-chart__adaptive-custom')?.hasAttribute('inert')).toBe(
        true,
      );

      await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, '0');
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
      const action = container.querySelector<HTMLButtonElement>(
        '.lilt-chart__adaptive-custom button',
      )!;
      expect(action.textContent).toBe('Inspect details');
      expect(action.closest('[inert]')).toBeNull();

      action.focus();
      await act(async () => {
        action.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      });
      expect(document.activeElement).toBe(container.querySelector('.lilt-chart__plot-host'));
      expect(container.querySelector('.lilt-chart__adaptive-custom')).toBeNull();
    } finally {
      await act(async () => root.unmount());
      container.remove();
    }
  });
});
