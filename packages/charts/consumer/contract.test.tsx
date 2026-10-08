// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Bar, Chart, ChartPlot, Line, Tooltip, createChartController } from '@lilt-ui/charts';

type Row = { id: string; x: number; value: number | null; revision: number };
const value = (row: Row) => row.value;
const rows = (revision: number): Row[] => [{ id: 'one', x: 1, value: 5, revision }];
const series = [{ id: 'value', label: 'Value', accessor: value }];
let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: 600,
    bottom: 300,
    width: 600,
    height: 300,
    toJSON: () => ({}),
  } as DOMRect);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.restoreAllMocks();
});

async function render(node: React.ReactNode) {
  await act(async () => root.render(node));
}
async function click(selector: string) {
  const button = host.querySelector<HTMLElement>(selector);
  expect(button).not.toBeNull();
  await act(async () => button!.click());
}
async function clickPlot(clientX = 100) {
  await act(async () => {
    host.querySelector('svg')!.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX }));
    await new Promise((resolve) => setTimeout(resolve, 30));
  });
}

describe('built public selection contracts', () => {
  it('controls vertical category bars by ID and reports refreshed rows', async () => {
    const onSelectionChange = vi.fn();
    const onSelectedCategoryIdChange = vi.fn();
    const props = {
      x: { type: 'category' as const, accessor: (row: Row) => row.id },
      series,
      'aria-label': 'Bars',
      motion: 'none' as const,
      animateIn: false,
      onSelectionChange,
      onSelectedCategoryIdChange,
    };
    await render(
      <Chart {...props} data={rows(1)} selectedCategoryId="one">
        <ChartPlot bars>
          <Bar series="value" />
        </ChartPlot>
      </Chart>,
    );
    expect(onSelectionChange.mock.lastCall?.[0]?.row.revision).toBe(1);
    await render(
      <Chart {...props} data={rows(2)} selectedCategoryId="one">
        <ChartPlot bars>
          <Bar series="value" />
        </ChartPlot>
      </Chart>,
    );
    expect(onSelectionChange.mock.lastCall?.[0]?.row.revision).toBe(2);
    await render(
      <Chart {...props} data={[]} selectedCategoryId="one">
        <ChartPlot bars>
          <Bar series="value" />
        </ChartPlot>
      </Chart>,
    );
    expect(onSelectedCategoryIdChange).toHaveBeenLastCalledWith(null);
  });

  it('masks a removed controlled category while its owner defers clearing', async () => {
    const selected = vi.fn();
    const request = vi.fn();
    const pair = [...rows(1), { id: 'two', x: 2, value: 10, revision: 1 }];
    const draw = (data: Row[], interactive = true) => (
      <Chart
        data={data}
        x={{ type: 'category', accessor: (row: Row) => row.id }}
        series={series}
        aria-label="Bars"
        motion="none"
        interactive={interactive}
        selectedCategoryId="one"
        onSelectedCategoryIdChange={request}
        onSelectionChange={selected}
      >
        <ChartPlot bars>
          <Bar series="value" />
        </ChartPlot>
      </Chart>
    );
    await render(draw(pair));
    expect(selected.mock.lastCall?.[0]?.categoryId).toBe('one');
    await render(draw([pair[1]]));
    expect(request).toHaveBeenLastCalledWith(null);
    expect(selected.mock.lastCall?.[0]).toBeNull();
    expect(host.querySelector('[data-lilt-inspecting="true"]')).toBeNull();
    request.mockClear();
    await render(draw(pair));
    await render(draw([pair[1]], false));
    expect(request).toHaveBeenLastCalledWith(null);
    expect(selected.mock.lastCall?.[0]).toBeNull();
  });

  it('releases owned inspection for ready-empty and all-null data, then accepts later data', async () => {
    const controller = createChartController();
    const selected = vi.fn();
    const pair = [...rows(1), { id: 'two', x: 2, value: 10, revision: 1 }];
    const draw = (data: Row[]) => (
      <Chart
        data={data}
        x={{ type: 'number', accessor: (row: Row) => row.x }}
        series={series}
        aria-label="Trend"
        motion="none"
        controller={controller}
        onSelectionChange={selected}
      >
        <ChartPlot>
          <Line series="value" />
        </ChartPlot>
      </Chart>
    );
    await render(draw(pair));
    await clickPlot();
    expect(controller.getSnapshot().inspection?.pinned).toBe(true);
    await render(draw([]));
    expect(controller.getSnapshot().inspection).toBeNull();
    expect(selected.mock.lastCall?.[0]).toBeNull();
    await render(draw(pair.map((row) => ({ ...row, value: null }))));
    expect(controller.getSnapshot().inspection).toBeNull();
    expect(selected.mock.lastCall?.[0]).toBeNull();
    await render(draw(pair.map((row) => ({ ...row, revision: 2 }))));
    expect(selected.mock.lastCall?.[0]).toBeNull();
    await clickPlot();
    expect(selected.mock.lastCall?.[0]?.row.revision).toBe(2);
  });

  it('preserves an inspection owned by another chart while becoming empty', async () => {
    const controller = createChartController();
    const selected = vi.fn();
    const pair = [...rows(1), { id: 'two', x: 2, value: 10, revision: 1 }];
    const draw = (data: Row[]) => (
      <Chart
        data={data}
        x={{ type: 'number', accessor: (row: Row) => row.x }}
        series={series}
        aria-label="Peer"
        motion="none"
        controller={controller}
        onSelectionChange={selected}
      >
        <ChartPlot>
          <Line series="value" />
        </ChartPlot>
      </Chart>
    );
    await render(draw(pair));
    await act(async () => {
      controller.inspect({ x: 1, pinned: true, ownerId: 'other-chart' });
      await new Promise((resolve) => setTimeout(resolve, 30));
    });
    await render(draw([]));
    expect(controller.getSnapshot().inspection?.ownerId).toBe('other-chart');
    expect(selected.mock.lastCall?.[0]).toBeNull();
  });

  it.each(['ready', 'loading', 'error'] as const)(
    'resetKey clears prior identity when replacement status is %s',
    async (status) => {
      const controller = createChartController();
      const selected = vi.fn();
      const pair = [...rows(1), { id: 'two', x: 2, value: 10, revision: 1 }];
      const draw = (
        data: Row[],
        resetKey: string,
        currentStatus: 'ready' | 'loading' | 'error',
      ) => (
        <Chart
          data={data}
          x={{ type: 'number', accessor: (row: Row) => row.x }}
          series={series}
          aria-label="Trend"
          motion="none"
          controller={controller}
          resetKey={resetKey}
          status={currentStatus}
          onSelectionChange={selected}
        >
          <ChartPlot>
            <Line series="value" />
          </ChartPlot>
        </Chart>
      );
      await render(draw(pair, 'old', 'ready'));
      await clickPlot();
      expect(controller.getSnapshot().inspection?.pinned).toBe(true);
      const replacement = status === 'ready' ? [{ id: 'new', x: 1, value: NaN, revision: 2 }] : [];
      await render(draw(replacement, 'new', status));
      expect(controller.getSnapshot().inspection).toBeNull();
      expect(selected.mock.lastCall?.[0]).toBeNull();
      expect(host.querySelector('[data-lilt-path]')).toBeNull();
    },
  );

  it('clears a local category pin on resetKey', async () => {
    const onSelectionChange = vi.fn();
    const props = {
      x: { type: 'category' as const, accessor: (row: Row) => row.id },
      series,
      'aria-label': 'Bars',
      motion: 'none' as const,
      animateIn: false,
      onSelectionChange,
    };
    await render(
      <Chart {...props} data={rows(1)} resetKey="first">
        <ChartPlot bars>
          <Bar series="value" />
        </ChartPlot>
      </Chart>,
    );
    await act(async () =>
      host
        .querySelector('svg')!
        .dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 300 })),
    );
    expect(onSelectionChange.mock.lastCall?.[0]?.pinned).toBe(true);
    await render(
      <Chart {...props} data={rows(1)} resetKey="second">
        <ChartPlot bars>
          <Bar series="value" />
        </ChartPlot>
      </Chart>,
    );
    expect(onSelectionChange.mock.lastCall?.[0]).toBeNull();
    expect(host.querySelector('[data-lilt-inspecting="true"]')).toBeNull();
  });

  it('preserves a controlled category request through an invalid reset replacement', async () => {
    const request = vi.fn();
    const draw = (data: Row[], resetKey: string) => (
      <Chart
        data={data}
        x={{ type: 'category', accessor: (row: Row) => row.id }}
        series={series}
        aria-label="Bars"
        motion="none"
        selectedCategoryId="one"
        onSelectedCategoryIdChange={request}
        resetKey={resetKey}
      >
        <ChartPlot bars>
          <Bar series="value" />
        </ChartPlot>
      </Chart>
    );
    await render(draw(rows(1), 'old'));
    await render(draw([rows(2)[0], rows(2)[0]], 'new'));
    expect(request).not.toHaveBeenCalled();
  });

  it('preserves Cartesian selection rows and supports tooltip settings with fragment marks', async () => {
    const onSelectionChange = vi.fn();
    const props = {
      x: { type: 'number' as const, accessor: (row: Row) => row.x },
      series,
      'aria-label': 'Trend',
      motion: 'none' as const,
      animateIn: false,
      onSelectionChange,
    };
    await render(
      <Chart {...props} data={rows(1)}>
        <ChartPlot tooltip={<Tooltip className="custom-tooltip" aria-label="Details" />}>
          <>
            <Line series="value" />
          </>
        </ChartPlot>
      </Chart>,
    );
    const slider = host.querySelector<HTMLInputElement>('input[type="range"]');
    expect(slider).not.toBeNull();
    await act(async () => {
      slider!.focus();
      slider!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    });
    expect(onSelectionChange.mock.lastCall?.[0]?.row.revision).toBe(1);
    expect(host.querySelector('.custom-tooltip')?.getAttribute('aria-label')).toBe('Details');
    await render(
      <Chart {...props} data={rows(2)}>
        <ChartPlot tooltip={<Tooltip className="custom-tooltip" aria-label="Details" />}>
          <>
            <Line series="value" />
          </>
        </ChartPlot>
      </Chart>,
    );
    expect(onSelectionChange.mock.lastCall?.[0]?.row.revision).toBe(2);
  });

  it('uses explicit plot tooltip settings with component-produced children', async () => {
    const Marks = () => <Line series="value" />;
    const props = {
      x: { type: 'number' as const, accessor: (row: Row) => row.x },
      series,
      'aria-label': 'Wrapped trend',
      motion: 'none' as const,
      animateIn: false,
    };
    await render(
      <Chart {...props} data={rows(1)}>
        <ChartPlot tooltip={{ className: 'wrapped-tooltip', 'aria-label': 'Wrapped details' }}>
          <Marks />
        </ChartPlot>
      </Chart>,
    );
    await act(async () =>
      host
        .querySelector('svg')!
        .dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 300 })),
    );
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 30));
    });
    expect(host.querySelector('.wrapped-tooltip')?.getAttribute('aria-label')).toBe(
      'Wrapped details',
    );
  });

  it('supports tooltip composition through an ordinary wrapper', async () => {
    const WrappedMarks = () => <Line series="value" />;
    const WrappedTooltip = () => <Tooltip />;
    const props = {
      x: { type: 'number' as const, accessor: (row: Row) => row.x },
      series,
      'aria-label': 'Wrapped trend',
      motion: 'none' as const,
      animateIn: false,
    };
    await render(
      <Chart {...props} data={rows(1)}>
        <ChartPlot tooltip={<WrappedTooltip />}>
          <WrappedMarks />
        </ChartPlot>
      </Chart>,
    );
    const input = host.querySelector<HTMLInputElement>('.lilt-chart__keyboard-input input');
    expect(input).not.toBeNull();
    await act(async () => input!.focus());
    expect(host.querySelector('.lilt-chart__tooltip')).not.toBeNull();
  });

  it('rejects a mark whose series ID is absent from descriptors', async () => {
    const props = {
      x: { type: 'number' as const, accessor: (row: Row) => row.x },
      series,
      'aria-label': 'Trend',
      motion: 'none' as const,
      animateIn: false,
    };
    await expect(
      render(
        <Chart {...props} data={rows(1)}>
          <ChartPlot>
            <Line series="missing" />
          </ChartPlot>
        </Chart>,
      ),
    ).rejects.toThrow('Lilt Line references unknown series "missing".');
  });
});
