import { act, useState, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Bar, Chart, ChartPlot, Line, createChartController } from '@lilt-ui/charts';

type Row = { id: string; x: number; value: number | null; revision: number };
const one: Row = { id: 'one', x: 1, value: 5, revision: 1 };
const two: Row = { id: 'two', x: 2, value: 10, revision: 2 };
const series = [{ id: 'value', label: 'Value', accessor: (row: Row) => row.value }];
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

async function render(node: ReactNode) {
  await act(async () => root.render(node));
}

describe('independent category acceptance-generation follow-up', () => {
  it.each(['invalid', 'loading', 'error'] as const)(
    'clears the active controlled observation on a reset to %s',
    async (replacement) => {
      const request = vi.fn();
      const selected = vi.fn();
      const draw = (data: Row[], resetKey: string, status: 'ready' | 'loading' | 'error') => (
        <Chart
          data={data}
          x={{ type: 'category', accessor: (row: Row) => row.id }}
          series={series}
          aria-label="Categories"
          motion="none"
          selectedCategoryId="one"
          onSelectedCategoryIdChange={request}
          onSelectionChange={selected}
          resetKey={resetKey}
          status={status}
        >
          <ChartPlot layout="bars">
            <Bar series="value" />
          </ChartPlot>
        </Chart>
      );
      await render(draw([one], 'old', 'ready'));
      expect(selected.mock.lastCall?.[0]?.row).toBe(one);
      request.mockClear();
      await render(
        draw(
          replacement === 'invalid' ? [one, one] : [],
          'new',
          replacement === 'invalid' ? 'ready' : replacement,
        ),
      );
      expect.soft(request).not.toHaveBeenCalled();
      expect.soft(selected.mock.lastCall?.[0]).toBeNull();
      expect.soft(host.querySelectorAll('[data-lilt-inspecting="true"]').length).toBe(0);
    },
  );

  it('accepts a new controlled category supplied with its ready dataset', async () => {
    const request = vi.fn();
    const selected = vi.fn();
    const draw = (data: Row[], selectedCategoryId: string) => (
      <Chart
        data={data}
        x={{ type: 'category', accessor: (row: Row) => row.id }}
        series={series}
        aria-label="Categories"
        motion="none"
        selectedCategoryId={selectedCategoryId}
        onSelectedCategoryIdChange={request}
        onSelectionChange={selected}
      >
        <ChartPlot layout="bars">
          <Bar series="value" />
        </ChartPlot>
      </Chart>
    );
    await render(draw([one], 'one'));
    request.mockClear();
    await render(draw([two], 'two'));
    expect.soft(request).not.toHaveBeenCalled();
    expect.soft(selected.mock.lastCall?.[0]?.row).toBe(two);
  });

  it('does not reject a new owner ID against pre-reset data while loading', async () => {
    const request = vi.fn();
    const draw = (
      data: Row[],
      selectedCategoryId: string,
      resetKey: string,
      status: 'ready' | 'loading',
    ) => (
      <Chart
        data={data}
        x={{ type: 'category', accessor: (row: Row) => row.id }}
        series={series}
        aria-label="Categories"
        motion="none"
        selectedCategoryId={selectedCategoryId}
        onSelectedCategoryIdChange={request}
        resetKey={resetKey}
        status={status}
      >
        <ChartPlot layout="bars">
          <Bar series="value" />
        </ChartPlot>
      </Chart>
    );
    await render(draw([one], 'one', 'old', 'ready'));
    request.mockClear();
    await render(draw([], 'two', 'new', 'loading'));
    expect(request).not.toHaveBeenCalled();
  });

  it('preserves a valid atomic data/selection update with a real controlled owner', async () => {
    const categorical = { type: 'category' as const, accessor: (row: Row) => row.id };
    let replace: () => void = () => {};
    function Owner() {
      const [state, setState] = useState<{ data: Row[]; selectedId: string | null }>({
        data: [one],
        selectedId: 'one',
      });
      replace = () => setState({ data: [two], selectedId: 'two' });
      return (
        <>
          <output data-owner-selection>{state.selectedId ?? 'none'}</output>
          <Chart
            data={state.data}
            x={categorical}
            series={series}
            aria-label="Owned categories"
            motion="none"
            selectedCategoryId={state.selectedId}
            onSelectedCategoryIdChange={(selectedId) =>
              setState((current) => ({ ...current, selectedId }))
            }
          >
            <ChartPlot layout="bars">
              <Bar series="value" />
            </ChartPlot>
          </Chart>
        </>
      );
    }
    await render(<Owner />);
    expect(host.querySelector('[data-owner-selection]')?.textContent).toBe('one');
    await act(async () => replace());
    expect(host.querySelector('[data-owner-selection]')?.textContent).toBe('two');
  });

  it('a ready-empty category update clears the active row while the owner defers clearing', async () => {
    const request = vi.fn();
    const selected = vi.fn();
    const draw = (data: Row[]) => (
      <Chart
        data={data}
        x={{ type: 'category', accessor: (row: Row) => row.id }}
        series={series}
        aria-label="Categories"
        motion="none"
        selectedCategoryId="one"
        onSelectedCategoryIdChange={request}
        onSelectionChange={selected}
      >
        <ChartPlot layout="bars">
          <Bar series="value" />
        </ChartPlot>
      </Chart>
    );
    await render(draw([one]));
    await render(draw([]));
    expect(request).toHaveBeenLastCalledWith(null);
    expect.soft(selected.mock.lastCall?.[0]).toBeNull();
    expect.soft(host.querySelectorAll('[data-lilt-inspecting="true"]').length).toBe(0);
  });

  it('a direct ready-to-all-null numeric update clears the owned pin', async () => {
    const controller = createChartController();
    const selected = vi.fn();
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
    await render(draw([one, two]));
    await act(async () => {
      host
        .querySelector('svg')!
        .dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 100 }));
      await new Promise((resolve) => setTimeout(resolve, 30));
    });
    expect(controller.getSnapshot().inspection?.pinned).toBe(true);
    await render(
      draw([
        { ...one, value: null },
        { ...two, value: null },
      ]),
    );
    expect(controller.getSnapshot().inspection).toBeNull();
    expect(selected.mock.lastCall?.[0]).toBeNull();
  });
});
