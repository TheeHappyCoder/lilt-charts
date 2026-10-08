'use client';

import { isValidElement, useMemo, type ReactElement } from 'react';
import { ChartPlotRenderer } from './chart';
import { useChartRuntime } from './runtime/chart-runtime';
import { HoverBand } from './primitives/hover-band';
import { PlotBackground } from './primitives/plot-background';
import { Tooltip } from './interaction/tooltip';
import type { ChartBars, ChartPlotProps, ChartStack, ChartStackMode, TooltipProps } from './types';
import type { PlotArrangement } from './chart-context';
import { collectMarks, type PlotMark } from './marks/contract';
import type { CartesianChartModel } from './model/cartesian-model';

export type ModelChartPlotProps<Row, Id extends string> = Omit<ChartPlotProps, 'bars' | 'stack'> & {
  model: CartesianChartModel<Row, Id>;
  bars?: true | ChartBars<NoInfer<Id>>;
  stack?: true | ChartStackMode | ChartStack<NoInfer<Id>>;
  inspectionSeries?: NoInfer<Id>;
};

function validSize(name: string, value: number): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`Lilt ${name} must be a positive finite number; received ${value}.`);
  }
}

export function ChartPlot<Row, Id extends string>(
  props: ModelChartPlotProps<Row, Id>,
): ReactElement;
export function ChartPlot(props: ChartPlotProps & { model?: never }): ReactElement;
export function ChartPlot({
  model,
  children,
  height = 340,
  compactHeight,
  margins,
  bars: barsProp,
  stack: stackProp,
  compact = false,
  tooltip,
  inspectionSeries,
  className,
  style,
  axis,
  pill,
  pillSeries,
  pillValue,
  pillPosition,
  background = 'none',
  spotlight = true,
  axisInset,
  runoff,
  labelOverhang,
  slots = false,
  decimate,
}: ChartPlotProps & { model?: CartesianChartModel<unknown, string> }): ReactElement {
  if (height !== 'fill') validSize('ChartPlot height', height);
  if (compactHeight !== undefined) validSize('ChartPlot compactHeight', compactHeight);
  const bars = barsProp === true ? {} : barsProp;
  if (bars) {
    if (bars.width !== undefined) validSize('ChartPlot bars.width', bars.width);
    for (const [name, value] of [
      ['gap', bars.gap],
      ['segmentGap', bars.segmentGap],
    ] as const) {
      if (value !== undefined && (!Number.isFinite(value) || value < 0))
        throw new Error(
          `Lilt ChartPlot bars.${name} must be a non-negative finite number; received ${value}.`,
        );
    }
  }
  const runtime = useChartRuntime();
  const marks = useMemo(() => collectMarks(children), [children]);
  if (model && model !== runtime.model) {
    throw new Error('Lilt ChartPlot model must be the model supplied to its Chart.');
  }
  const arrangement = useArrangement(
    runtime.props.series.map((series) => series.id),
    bars,
    stackProp,
    marks,
    slots,
  );
  if (
    runtime.props.x.type === 'category' &&
    (runtime.linked ||
      runtime.props.compare ||
      runtime.props.focus ||
      runtime.props.live ||
      runtime.props.brush)
  ) {
    throw new Error(
      'Category plots support inspection and visibility; time-range comparison, focus, live, brush and linked controllers require numeric or time x.',
    );
  }
  const tooltipNode =
    tooltip === false || tooltip === undefined ? null : isValidElement(tooltip) ? (
      tooltip
    ) : (
      <Tooltip {...(tooltip as TooltipProps)} />
    );
  return (
    <ChartPlotRenderer
      {...runtime.props}
      className={className}
      compactHeight={compactHeight}
      controller={runtime.controller}
      controllerLinked={runtime.linked}
      height={height}
      margins={margins}
      arrangement={arrangement}
      marks={marks}
      barLayout={bars}
      compact={compact}
      tooltipNode={tooltipNode}
      inspectionSeries={inspectionSeries}
      style={style}
      toolkit={runtime.toolkit}
      model={runtime.model}
      axis={axis}
      pill={pill}
      pillSeries={pillSeries}
      pillValue={pillValue}
      pillPosition={pillPosition}
      axisInset={axisInset}
      runoff={runoff}
      labelOverhang={labelOverhang}
      decimate={decimate}
    >
      {background !== 'none' ? <PlotBackground kind={background} spotlight={spotlight} /> : null}
      {spotlight ? <HoverBand /> : null}
      {children}
    </ChartPlotRenderer>
  );
}

function checkSeries(name: string, ids: readonly string[], known: readonly string[]): void {
  if (new Set(ids).size !== ids.length || ids.some((id) => !known.includes(id)))
    throw new Error(`Lilt ChartPlot ${name} must list unique IDs from the chart series.`);
}

/** Resolves `bars` and `stack` into series lists, stable while their contents are unchanged. */
function useArrangement(
  known: readonly string[],
  bars: ChartBars | undefined,
  stackProp: ChartPlotProps['stack'],
  marks: readonly PlotMark[],
  slots: boolean,
): PlotArrangement {
  const stack: ChartStack | undefined =
    stackProp === undefined
      ? undefined
      : stackProp === true
        ? {}
        : typeof stackProp === 'string'
          ? { mode: stackProp }
          : stackProp;
  if (stack?.series) {
    checkSeries('stack.series', stack.series, known);
    if (!stack.series.length) throw new Error('Lilt ChartPlot stack.series must not be empty.');
  }
  if (bars?.series) checkSeries('bars.series', bars.series, known);
  // Stack order is chart series order, whatever order the list uses.
  const stackIds = stack ? known.filter((id) => !stack.series || stack.series.includes(id)) : null;
  if (
    stackIds &&
    bars?.series &&
    (bars.series.length !== stackIds.length || bars.series.some((id) => !stackIds.includes(id)))
  )
    throw new Error(
      'Lilt ChartPlot stacked bars draw exactly the stacked series; other series draw as lines.',
    );
  const barIds = bars
    ? (stackIds ?? known.filter((id) => !bars.series || bars.series.includes(id)))
    : null;
  const columnIds = [
    ...new Set(marks.filter((mark) => mark.layout === 'column').map((mark) => mark.series)),
  ];
  for (const id of columnIds) {
    if (!known.includes(id))
      throw new Error(`Lilt ChartPlot mark references unknown series "${id}".`);
    if (barIds?.includes(id) || stackIds?.includes(id))
      throw new Error(
        `Lilt series "${id}" is drawn by a column mark, so it cannot also be a bar or stacked.`,
      );
  }
  // Keyed by content, so inline arrays do not rebuild every snapshot on each render.
  const key = JSON.stringify({
    bars: barIds,
    stack: stackIds ? { series: stackIds, mode: stack?.mode ?? 'sum' } : null,
    ...(columnIds.length ? { columns: columnIds } : {}),
    ...(slots ? { slots: true } : {}),
  } satisfies PlotArrangement);
  return useMemo(() => JSON.parse(key) as PlotArrangement, [key]);
}
