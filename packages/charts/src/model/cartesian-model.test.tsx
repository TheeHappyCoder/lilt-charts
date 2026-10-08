// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { Chart } from '../runtime/chart-runtime';
import { ChartPlot } from '../chart-plot';
import { Line } from '../primitives/line';
import { Legend } from '../interaction/legend';
import { Tooltip } from '../interaction/tooltip';
import {
  createCartesianChartModel,
  useCartesianChartModel,
  useCartesianModelState,
} from './cartesian-model';
import { useChartState } from './use-chart-state';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('Cartesian model composition', () => {
  it('keeps controlled requests separate from resolved inspection, visibility and comparison', () => {
    const data = [
      { x: 1, value: 3 },
      { x: 2, value: 9 },
    ];
    const x = { type: 'number' as const, accessor: (row: (typeof data)[number]) => row.x };
    const series = [
      { id: 'value' as const, label: 'Value', accessor: (row: (typeof data)[number]) => row.value },
    ];
    const inspections: unknown[] = [];
    const visibilities: unknown[] = [];
    const comparisons: unknown[] = [];
    const control = {
      inspection: null,
      visibleSeries: ['value'] as const,
      comparison: null,
      onInspectionRequest: (value: unknown) => inspections.push(value),
      onVisibleSeriesRequest: (value: unknown) => visibilities.push(value),
      onComparisonRequest: (value: unknown) => comparisons.push(value),
    };
    const model = createCartesianChartModel({ data, x, series, control });
    model.actions.pin(2);
    model.actions.setVisibleSeries([]);
    model.actions.compare({ startX: 1, endX: 2 });
    expect(inspections).toEqual([{ x: 2, pinned: true }]);
    expect(visibilities).toEqual([[]]);
    expect(comparisons).toEqual([{ startX: 1, endX: 2 }]);
    expect(model.getSnapshot()).toMatchObject({
      inspection: null,
      visibleSeries: ['value'],
      comparison: null,
    });
    model.update({
      data,
      x,
      series,
      control: {
        ...control,
        inspection: { x: 2, pinned: true },
        visibleSeries: [],
        comparison: { startX: 1, endX: 2 },
      },
    });
    expect(model.getSnapshot().inspection).toMatchObject({ x: 2, row: data[1], pinned: true });
    expect(model.getSnapshot().visibleSeries).toEqual([]);
    expect(model.getSnapshot().comparison).toBeNull();
  });
  it('does not draw an unaccepted controlled pin from an observation legend', async () => {
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
    const requests: unknown[] = [];
    const model = createCartesianChartModel({
      data: [{ x: 1, value: 7 }],
      x: { type: 'number', accessor: (row) => row.x },
      series: [{ id: 'value', label: 'Value', accessor: (row) => row.value }],
      control: { inspection: null, onInspectionRequest: (next) => requests.push(next) },
    });
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    try {
      await act(async () =>
        root.render(
          <Chart model={model} aria-label="Controlled" motion="none">
            <ChartPlot height={240}>
              <Line model={model} series="value" />
            </ChartPlot>
            <Legend model={model} by="observation" series="value" />
          </Chart>,
        ),
      );
      await act(async () =>
        host.querySelector<HTMLButtonElement>('[aria-label="Observations"] button')!.click(),
      );
      expect(requests).toEqual([{ x: 1, pinned: true }]);
      expect(model.getSnapshot().inspection).toBeNull();
      expect(host.querySelector('.lilt-chart__inspection-dot')).toBeNull();
    } finally {
      await act(async () => root.unmount());
      host.remove();
      vi.restoreAllMocks();
    }
  });
  it('derives linked inspection and comparison from its accepted frame', async () => {
    const start = { x: 1, value: 4, note: 'start' };
    const end = { x: 2, value: 10, note: 'end' };
    const model = createCartesianChartModel({
      data: [start, end],
      x: { type: 'number', accessor: (row) => row.x },
      series: [{ id: 'value', label: 'Value', accessor: (row) => row.value }],
    });
    const controller = model.getController();
    expect(model.getSnapshot().legend).toMatchObject([
      { id: 'value', value: 10, formattedValue: '10', visible: true },
    ]);
    expect(model.getSnapshot().observations).toMatchObject([
      { row: start, x: 1, sourceIndex: 0, formattedValues: { value: '4' } },
      { row: end, x: 2, sourceIndex: 1, formattedValues: { value: '10' } },
    ]);
    await act(async () => {
      controller.inspect({ x: 2, pinned: true, ownerId: 'peer' });
      await new Promise((resolve) => setTimeout(resolve, 30));
    });
    expect(model.getSnapshot().inspection).toMatchObject({ row: end, pinned: true });
    await act(async () => controller.setComparison({ startX: 1, endX: 2 }));
    expect(model.getSnapshot().comparison).toMatchObject({
      startRow: start,
      endRow: end,
      series: [{ id: 'value', absoluteChange: 6, percentageChange: 150 }],
    });
    await act(async () => controller.setFocus({ startX: 1, endX: 2 }));
    expect(model.getSnapshot().comparison?.focused).toBe(true);
  });
  it('settles inline equivalent inputs while accepting a changed formatter', async () => {
    let renders = 0;
    function Consumer({ suffix }: { suffix: string }) {
      renders += 1;
      if (renders > 20) throw new Error('Cartesian model kept publishing equivalent input.');
      const model = useCartesianChartModel({
        data: [{ x: 1, amount: 7, meta: { campaign: 'Autumn' } }],
        x: { type: 'number', accessor: (row) => row.x },
        series: [
          {
            id: 'amount' as const,
            label: 'Amount',
            accessor: (row) => row.amount,
            formatValue: (value) => `${value}${suffix}`,
          },
        ],
      });
      useChartState(model, (state) => state.acceptedRevision);
      return (
        <output>{model.summarize({ measure: 'amount', aggregate: 'sum' }).formattedValue}</output>
      );
    }
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    try {
      await act(async () => root.render(<Consumer suffix="pt" />));
      expect(host.querySelector('output')?.textContent).toBe('7pt');
      await act(async () => root.render(<Consumer suffix="pts" />));
      expect(host.querySelector('output')?.textContent).toBe('7pts');
      expect(renders).toBeLessThan(20);
    } finally {
      await act(async () => root.unmount());
      host.remove();
    }
  });

  it('keeps an external summary aligned with the mounted chart across loading', async () => {
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
    const initial = [{ x: 1, amount: 7 }];
    const updated = [{ x: 1, amount: 12 }];
    const x = { type: 'number' as const, accessor: (row: (typeof initial)[number]) => row.x };
    const series = [
      {
        id: 'amount' as const,
        label: 'Amount',
        accessor: (row: (typeof initial)[number]) => row.amount,
        formatValue: (value: number) => `$${value}`,
      },
    ];
    function Consumer({ data, status }: { data: typeof initial; status: 'ready' | 'loading' }) {
      const model = useCartesianChartModel({ data, x, series, status });
      useChartState(model, (snapshot) => snapshot.acceptedRevision);
      return (
        <>
          <output>{model.summarize({ measure: 'amount', aggregate: 'sum' }).formattedValue}</output>
          <Chart model={model} aria-label="Amount" motion="none">
            <ChartPlot height={240}>
              <Line model={model} series="amount" />
            </ChartPlot>
          </Chart>
        </>
      );
    }
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    try {
      await act(async () => root.render(<Consumer data={initial} status="ready" />));
      expect(host.querySelector('output')?.textContent).toBe('$7');
      await act(async () => root.render(<Consumer data={updated} status="loading" />));
      expect(host.querySelector('output')?.textContent).toBe('$7');
      await act(async () => root.render(<Consumer data={updated} status="ready" />));
      expect(host.querySelector('output')?.textContent).toBe('$12');
    } finally {
      await act(async () => root.unmount());
      host.remove();
      vi.restoreAllMocks();
    }
  });

  it('accepts data and descriptors as one frame through loading, errors and reset', () => {
    const original = [{ x: 1, value: 7 as number | null }];
    const refreshed = [{ x: 1, value: 12 as number | null }];
    const x = { type: 'number' as const, accessor: (row: (typeof original)[number]) => row.x };
    const dollars = [
      {
        id: 'value' as const,
        label: 'Value',
        accessor: (row: (typeof original)[number]) => row.value,
        unit: 'USD',
        formatValue: (value: number) => `$${value}`,
      },
    ];
    const points = [
      {
        id: 'value' as const,
        label: 'Value',
        accessor: (row: (typeof original)[number]) => row.value,
        unit: 'points',
        formatValue: (value: number) => `${value} pts`,
      },
    ];
    const model = createCartesianChartModel({ data: original, x, series: dollars });
    expect(model.summarize({ measure: 'value', aggregate: 'sum' })).toMatchObject({
      value: 7,
      formattedValue: '$7',
      unit: 'USD',
      coverage: { observed: 1, missing: 0, total: 1 },
    });
    model.update({ data: refreshed, x, series: points, status: 'loading' });
    expect(model.getSnapshot().availability).toBe('loading');
    expect(model.getFrame().data).toBe(original);
    expect(model.summarize({ measure: 'value', aggregate: 'sum' })).toMatchObject({
      value: 7,
      formattedValue: '$7',
      unit: 'USD',
    });
    model.update({ data: refreshed, x, series: points, status: 'error' });
    expect(model.summarize({ measure: 'value', aggregate: 'sum' }).value).toBe(7);
    model.update({ data: refreshed, x, series: points });
    expect(model.summarize({ measure: 'value', aggregate: 'sum' })).toMatchObject({
      value: 12,
      formattedValue: '12 pts',
      unit: 'points',
    });
    expect(() =>
      model.update({ data: [{ x: Number.NaN, value: 8 }], x, series: points }),
    ).toThrow();
    expect(model.summarize({ measure: 'value', aggregate: 'sum' }).value).toBe(12);
    model.update({ data: refreshed, x, series: points, status: 'loading', resetKey: 'new' });
    expect(model.getAcceptedFrame()).toBeNull();
    expect(model.summarize({ measure: 'value', aggregate: 'sum' })).toMatchObject({
      value: null,
      unavailableReason: 'No observed value in the selected scope.',
    });
  });

  it('accepts inspection and visibility actions before mounting a plot', async () => {
    const model = createCartesianChartModel({
      data: [{ x: 1, value: 7, account: 'AC-7' }],
      x: { type: 'number', accessor: (row) => row.x },
      series: [{ id: 'value', label: 'Value', accessor: (row) => row.value }],
    });
    model.actions.inspect(1);
    expect(model.getSnapshot().inspection).toMatchObject({
      row: { account: 'AC-7' },
      pinned: false,
    });
    model.actions.clearInspection();
    expect(model.getSnapshot().inspection).toBeNull();
    model.actions.setVisibleSeries([]);
    expect(model.getSnapshot().visibleSeries).toEqual([]);
    model.actions.setVisibleSeries(['value']);
    model.actions.pin(1);
    expect(model.getSnapshot().inspection?.pinned).toBe(true);
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    try {
      await act(async () =>
        root.render(
          <Chart model={model} aria-label="Preselected" motion="none">
            <ChartPlot height={240}>
              <Line model={model} series="value" />
            </ChartPlot>
          </Chart>,
        ),
      );
      expect(model.getSnapshot().inspection?.pinned).toBe(true);
      expect(model.getSnapshot().visibleSeries).toEqual(['value']);
    } finally {
      await act(async () => root.unmount());
      host.remove();
    }
  });

  it('shares one typed comparison with external JSX and an optional Tooltip', async () => {
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
    const data = [
      { x: 1, value: 7, account: 'AC-7' },
      { x: 2, value: 11, account: 'AC-11' },
    ];
    const model = createCartesianChartModel({
      data,
      x: { type: 'number', accessor: (row) => row.x },
      series: [{ id: 'value', label: 'Value', accessor: (row) => row.value }],
    });
    model.actions.compare({ startX: 1, endX: 2 });
    expect(model.getSnapshot().comparison).toMatchObject({
      kind: 'range',
      startRow: data[0],
      endRow: data[1],
      series: [{ id: 'value', absoluteChange: 4 }],
    });
    function External() {
      const comparison = useChartState(model, (state) => state.comparison);
      return (
        <output>
          {comparison?.startRow?.account} → {comparison?.endRow?.account} ·{' '}
          {comparison?.series[0]?.formattedChange}
        </output>
      );
    }
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    try {
      await act(async () =>
        root.render(
          <>
            <Chart model={model} aria-label="Comparison" compare motion="none">
              <ChartPlot
                height={240}
                tooltip={
                  <Tooltip
                    model={model}
                    renderComparison={(comparison) => (
                      <span data-testid="tooltip-change">
                        {comparison.series[0]?.formattedChange}
                      </span>
                    )}
                  />
                }
              >
                <Line model={model} series="value" />
              </ChartPlot>
            </Chart>
            <External />
          </>,
        ),
      );
      expect(host.querySelector('output')?.textContent).toContain('AC-7 → AC-11');
      expect(host.querySelector('[data-testid="tooltip-change"]')?.textContent).toBe('+4');
    } finally {
      await act(async () => root.unmount());
      host.remove();
      vi.restoreAllMocks();
    }
  });

  it('shares inspected values with card and observation legends without mounting a tooltip', async () => {
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
    const model = createCartesianChartModel({
      data: [
        { x: 1, value: 7 },
        { x: 2, value: 11 },
      ],
      x: { type: 'number', accessor: (row) => row.x },
      series: [{ id: 'value', label: 'Value', accessor: (row) => row.value }],
    });
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    try {
      await act(async () =>
        root.render(
          <Chart model={model} aria-label="Legend example" motion="none">
            <ChartPlot height={240}>
              <Line model={model} series="value" />
            </ChartPlot>
            <Legend />
            <Legend by="observation" series="value" />
          </Chart>,
        ),
      );
      const seriesLegend = host.querySelector('[aria-label="Series"]')!;
      const observationLegend = host.querySelector('[aria-label="Observations"]')!;
      expect(seriesLegend.querySelector('.lilt-chart__legend-value')?.textContent).toBe('11');
      expect(observationLegend.querySelectorAll('.lilt-chart__legend-value')).toHaveLength(2);
      expect(host.querySelectorAll('.lilt-chart__legend-swatch')).toHaveLength(3);
      await act(async () => observationLegend.querySelector<HTMLButtonElement>('button')!.click());
      expect(model.getSnapshot().inspection).toMatchObject({ x: 1, pinned: true });
      expect(seriesLegend.querySelector('.lilt-chart__legend-value')?.textContent).toBe('7');
      expect(observationLegend.querySelector('[data-pinned]')).not.toBeNull();
      expect(host.querySelector('.lilt-chart__inspection-dot')).not.toBeNull();
      expect(host.querySelector('.lilt-chart__tooltip')).toBeNull();
      await act(async () => model.actions.release());
      expect(seriesLegend.querySelector('.lilt-chart__legend-value')?.textContent).toBe('11');
    } finally {
      await act(async () => root.unmount());
      host.remove();
      vi.restoreAllMocks();
    }
  });

  it('shares the accepted inspection and pin actions with an external panel', async () => {
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
    const model = createCartesianChartModel({
      data: [{ x: 1, value: 7, accountCode: 'AC-7' }],
      x: { type: 'number', accessor: (row) => row.x },
      series: [{ id: 'value', label: 'Value', accessor: (row) => row.value }],
    });
    function ExternalPanel() {
      const state = useCartesianModelState(model);
      return (
        <aside>
          <span data-testid="reading">{state.inspection?.row.accountCode ?? 'None'}</span>
          <span data-testid="visible">{state.visibleSeries.join(',')}</span>
          <span data-testid="legend">{state.legend[0]?.formattedValue ?? 'None'}</span>
          <button onClick={() => model.actions.pin(1)}>Pin</button>
          <button onClick={model.actions.release}>Release</button>
          <button onClick={() => model.actions.setVisibleSeries([])}>Hide</button>
          <button onClick={() => model.actions.inspect(1)}>Inspect</button>
          <button onClick={model.actions.clearInspection}>Clear hover</button>
        </aside>
      );
    }
    let comparisonRenders = 0;
    function ComparisonOnly() {
      useChartState(model, (snapshot) => snapshot.comparison);
      comparisonRenders += 1;
      return null;
    }
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    try {
      await act(async () =>
        root.render(
          <>
            <Chart model={model} aria-label="Model example" motion="none">
              <ChartPlot height={240}>
                <Line model={model} series="value" />
              </ChartPlot>
            </Chart>
            <ExternalPanel />
            <ComparisonOnly />
          </>,
        ),
      );
      expect(host.querySelector('[data-testid="reading"]')?.textContent).toBe('None');
      expect(host.querySelector('[data-testid="visible"]')?.textContent).toBe('value');
      expect(host.querySelector('[data-testid="legend"]')?.textContent).toBe('7');
      const initialComparisonRenders = comparisonRenders;
      await act(async () => host.querySelectorAll<HTMLButtonElement>('aside button')[3]!.click());
      expect(model.getSnapshot().inspection).toMatchObject({ x: 1, pinned: false });
      await act(async () => host.querySelectorAll<HTMLButtonElement>('aside button')[4]!.click());
      expect(model.getSnapshot().inspection).toBeNull();
      await act(async () => {
        model.getController().inspect({ x: 1, pinned: false, ownerId: 'peer' });
        await new Promise((resolve) => setTimeout(resolve, 30));
      });
      expect(host.querySelector('.lilt-chart__inspection-dot')).not.toBeNull();
      await act(async () => model.actions.clearInspection());
      await act(async () => host.querySelector<HTMLButtonElement>('aside button')!.click());
      expect(host.querySelector('[data-testid="reading"]')?.textContent).toBe('AC-7');
      expect(comparisonRenders).toBe(initialComparisonRenders);
      const refreshed = [{ x: 1, value: 9, accountCode: 'AC-9' }];
      await act(async () => model.update({ ...model.getFrame(), data: refreshed }));
      expect(model.getSnapshot().inspection).toMatchObject({
        row: refreshed[0],
        pinned: true,
        series: [{ value: 9, formattedValue: '9' }],
      });
      await act(async () => host.querySelectorAll<HTMLButtonElement>('aside button')[1]!.click());
      expect(host.querySelector('[data-testid="reading"]')?.textContent).toBe('None');
      await act(async () => host.querySelectorAll<HTMLButtonElement>('aside button')[2]!.click());
      expect(host.querySelector('[data-testid="visible"]')?.textContent).toBe('');
    } finally {
      await act(async () => root.unmount());
      host.remove();
      vi.restoreAllMocks();
    }
  });

  it('retains accepted measurements and a pin when its plot unmounts', async () => {
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
    const model = createCartesianChartModel({
      data: [{ x: 1, value: 7 }],
      x: { type: 'number', accessor: (row) => row.x },
      series: [{ id: 'value', label: 'Value', accessor: (row) => row.value }],
    });
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    try {
      await act(async () =>
        root.render(
          <Chart model={model} aria-label="Unmount example" motion="none">
            <ChartPlot height={240}>
              <Line model={model} series="value" />
            </ChartPlot>
          </Chart>,
        ),
      );
      await act(async () => model.actions.pin(1));
      expect(model.getSnapshot().inspection?.pinned).toBe(true);
      await act(async () => root.render(null));
      expect(model.getSnapshot().availability).toBe('ready');
      expect(model.getSnapshot().inspection?.pinned).toBe(true);
      expect(model.summarize({ measure: 'value', aggregate: 'sum' }).value).toBe(7);
    } finally {
      await act(async () => root.unmount());
      host.remove();
      vi.restoreAllMocks();
    }
  });
});
