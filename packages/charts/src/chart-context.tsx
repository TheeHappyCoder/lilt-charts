import { createContext, useContext } from 'react';
import { scaleLinear, scaleLog, scaleUtc } from 'd3-scale';
import type {
  ChartBarLayout,
  ChartCurve,
  ChartMargins,
  ChartSeries,
  ChartXConfig,
  ChartYConfig,
} from './types';
import type { NormalizedData } from './engine/normalize';
import { decimateRows } from './engine/decimate';
import { buildGeometry, type GeometryBuildOptions, type PlotGeometry } from './engine/geometry';
import { alignedSecondaryFactor, computeYDomain, fieldValues } from './engine/domains';
import { barSpacing } from './engine/bars';
import { hasNegativeContribution, stackDomainData, type StackMode } from './engine/stack';

export const DEFAULT_MARGINS: ChartMargins = { top: 12, right: 12, bottom: 44, left: 72 };

export interface PlotBox {
  left: number;
  top: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
}

/** Which series a plot draws as bars and which it stacks, resolved from its props. */
export interface PlotArrangement {
  /** Series drawn as bars, or null for none. Stacked bars draw exactly the stack's series. */
  bars: readonly string[] | null;
  /** Series that stack, in chart series order, and how they combine. */
  stack: { series: readonly string[]; mode: StackMode } | null;
  /**
   * Series drawn by column marks such as candles or range bars: each observation takes a
   * bar-like slot, so the plot insets its edges like a bar chart.
   */
  columns?: readonly string[];
  /** Slot every observation like a bar even when nothing is drawn as one. */
  slots?: boolean;
}

export const LINE_ARRANGEMENT: PlotArrangement = { bars: null, stack: null };

export interface ChartSnapshot<T> {
  bars: readonly string[] | null;
  /** `signed` marks a sum stack with values below zero. */
  stack: { series: readonly string[]; mode: StackMode; signed: boolean } | null;
  barLayout: ChartBarLayout;
  stackWeights?: Readonly<Record<string, number>>;
  data: NormalizedData<T>;
  xDomain: readonly [number, number];
  yDomain: readonly [number, number] | null;
  xTicks: readonly number[];
  yTicks: readonly number[];
  xToPixel: (value: number) => number;
  yToPixel: (value: number) => number;
  /** Maps a value in a series' own unit, following `scale: 'secondary'`. */
  yToPixelFor: (seriesId: string) => (value: number) => number;
  /** Width of one observation's column in pixels, for bars and column marks. */
  columnWidth: number;
  /** Series drawn by column marks. */
  columns: readonly string[];
  geometry: PlotGeometry | null;
  /**
   * Lines and areas with more rows than pixels draw from this thinner geometry, which traces the
   * same ink; null when every row is drawn. Inspection and everything else read `geometry`.
   */
  drawGeometry: PlotGeometry | null;
  plot: PlotBox;
  formatX: (value: number) => string;
  formatY: (value: number) => string;
  /** Raw measurements retain their unit when the plotted axis is normalized. */
  formatValue: (value: number) => string;
  /**
   * Present when some series use `scale: 'secondary'`: their values equal primary values times
   * `factor`, so they share the primary ticks.
   */
  secondary: { factor: number; format: (value: number) => string } | null;
}

export interface AxisTick {
  value: number;
  entering?: boolean;
  leaving?: boolean;
}

export interface ChartContextValue<T> {
  snapshot: ChartSnapshot<T>;
  previousSnapshot: ChartSnapshot<T> | null;
  series: readonly ChartSeries<T>[];
  xConfig: ChartXConfig<T>;
  yConfig: ChartYConfig;
  margins: ChartMargins;
  width: number;
  height: number;
  revealProgress: number;
  reducedMotion: boolean;
  transitionDuration: number;
  transitionKind: 'initial' | 'matched-update' | 'topology-update' | null;
  axis: {
    x: readonly AxisTick[];
    y: readonly AxisTick[];
  };
  clipId: string;
  gridGradientId: string;
  paintId: (seriesId: string, treatment: 'fade' | 'hatch' | 'dots') => string;
  inspectionSeries?: string;
  inspecting: boolean;
  focusedSeries?: string | null;
  visibleSeries: readonly string[];
}

const ChartContext = createContext<ChartContextValue<unknown> | null>(null);

export function ChartContextProvider<T>({
  value,
  children,
}: {
  value: ChartContextValue<T>;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <ChartContext.Provider value={value as ChartContextValue<unknown>}>
      {children}
    </ChartContext.Provider>
  );
}

export function useChartContext<T>(): ChartContextValue<T> {
  const value = useContext(ChartContext);
  if (!value) throw new Error('Lilt chart primitives must be rendered inside <Chart>.');
  return value as ChartContextValue<T>;
}

function compactNumber(value: number): string {
  if (value !== 0 && Math.abs(value) < 1) {
    return value.toFixed(1).replace(/\.0$/, '');
  }
  if (Math.abs(value) >= 1000) {
    const compact = value / 1000;
    return `${Number.isInteger(compact) ? compact : compact.toFixed(1).replace(/\.0$/, '')}k`;
  }
  return `${Math.round(value)}`;
}

export function defaultXFormatter(type: 'time' | 'number', value: number): string {
  if (type === 'number') return compactNumber(value);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(value));
}

export function defaultYFormatter(value: number): string {
  return compactNumber(value);
}

/** How many x labels fit, from the width of the longest sampled label. */
function targetTickCount<T>(
  innerWidth: number,
  data: NormalizedData<T>,
  formatX: (value: number) => string,
): number {
  const rows = data.rows;
  const sample = [rows[0], rows[Math.floor(rows.length / 2)], rows.at(-1)];
  const chars = Math.max(1, ...sample.map((row) => (row ? formatX(row.x).length : 0)));
  const slot = Math.max(44, chars * 6.5 + 22);
  return Math.max(2, Math.min(12, Math.floor(innerWidth / slot)));
}

/** Label every nth row so ticks stay regularly spaced, starting at the first row. */
function evenlySelectedRows<T>(data: NormalizedData<T>, count: number): number[] {
  const length = data.rows.length;
  if (length <= 1) return length ? [0] : [];
  const minimum = Math.max(1, Math.ceil(length / Math.max(1, count)));
  // Prefer a nearby step that also lands on the last row, so both ends are labelled.
  const step =
    [minimum, minimum + 1, minimum + 2].find((candidate) => (length - 1) % candidate === 0) ??
    minimum;
  return Array.from({ length: Math.ceil(length / step) }, (_, index) => index * step);
}

function removeCollidingX<T>(
  data: NormalizedData<T>,
  values: readonly number[],
  xToPixel: (value: number) => number,
  formatX: (value: number) => string,
  width: number,
): number[] {
  if (values.length <= 3 || width < 420) return [...values];
  const result: number[] = [];
  const gap = 14;
  for (const value of values) {
    const label = formatX(value);
    const half = Math.max(28, label.length * 3.2);
    const pixel = xToPixel(value);
    const previous = result.at(-1);
    if (previous === undefined || pixel - xToPixel(previous) >= half + gap) result.push(value);
  }
  const first = data.rows[0]?.x;
  const last = data.rows.at(-1)?.x;
  if (first !== undefined && !result.includes(first)) result.unshift(first);
  if (last !== undefined && !result.includes(last)) {
    const previous = result.at(-1);
    const half = Math.max(28, formatX(last).length * 3.2);
    // Keep regular spacing rather than crowding the final label against its neighbour.
    if (previous === undefined || xToPixel(last) - xToPixel(previous) >= half * 2 + gap)
      result.push(last);
  }
  return [...new Set(result)];
}

function unionTickEntries(
  current: readonly number[],
  previous: readonly number[] | undefined,
): AxisTick[] {
  return [...new Set([...(previous ?? []), ...current])]
    .sort((a, b) => a - b)
    .map((value) => ({
      value,
      entering: current.includes(value) && !previous?.includes(value),
      leaving: Boolean(previous?.includes(value) && !current.includes(value)),
    }));
}

export function makeAxisTicks(
  snapshot: ChartSnapshot<unknown>,
  previous: ChartSnapshot<unknown> | undefined,
): { x: AxisTick[]; y: AxisTick[] } {
  return {
    x: unionTickEntries(snapshot.xTicks, previous?.xTicks),
    y: unionTickEntries(snapshot.yTicks, previous?.yTicks),
  };
}

/**
 * Log ticks on 1, 2 and 5 times powers of ten when the domain spans decades; within a narrow
 * range, evenly spaced round values read better, so those come from a linear scale.
 */
export function logTicks(domain: readonly [number, number], count: number): number[] {
  const [low, high] = domain;
  const decades = Math.log10(high / low);
  if (decades < 1) return scaleLinear().domain([low, high]).ticks(count);
  const steps = decades > count ? [1] : decades > count / 2 ? [1, 5] : [1, 2, 5];
  const ticks: number[] = [];
  for (let power = Math.floor(Math.log10(low)); power <= Math.ceil(Math.log10(high)); power += 1)
    for (const step of steps) {
      const value = step * 10 ** power;
      if (value >= low && value <= high) ticks.push(Number(value.toPrecision(12)));
    }
  return ticks;
}

export function buildSnapshot<T>(
  data: NormalizedData<T>,
  series: readonly ChartSeries<T>[],
  xConfig: ChartXConfig<T>,
  yConfig: ChartYConfig,
  margins: ChartMargins,
  width: number,
  height: number,
  yDomainOverride?: readonly [number, number] | null,
  xDomainOverride?: readonly [number, number] | null,
  geometrySeries: readonly ChartSeries<T>[] = series,
  arrangement: PlotArrangement = LINE_ARRANGEMENT,
  stackWeights?: Readonly<Record<string, number>>,
  barLayout: ChartBarLayout = {},
  /** Keeps line and area observations off the plot edges so labels can center on them. */
  edgeInset = 0,
  /** Draw long lines and areas from at most four rows per pixel column. */
  decimate = true,
): ChartSnapshot<T> {
  const plot: PlotBox = {
    left: margins.left,
    top: margins.top,
    width: Math.max(0, width - margins.left - margins.right),
    height: Math.max(0, height - margins.top - margins.bottom),
    right: Math.max(margins.left, width - margins.right),
    bottom: Math.max(margins.top, height - margins.bottom),
  };
  const xDomain: readonly [number, number] =
    xDomainOverride ??
    (data.rows.length === 1
      ? [data.rows[0].x - 0.5, data.rows[0].x + 0.5]
      : [data.rows[0]?.x ?? 0, data.rows.at(-1)?.x ?? 1]);
  const domainRows = xDomainOverride
    ? data.rows.filter((row) => row.x >= xDomain[0] && row.x <= xDomain[1])
    : data.rows;
  const domainData = domainRows.length > 0 ? { ...data, rows: domainRows } : data;
  const barIds = arrangement.bars;
  const stackIds = arrangement.stack?.series ?? [];
  const stackMode = arrangement.stack?.mode;
  const stack = arrangement.stack
    ? {
        ...arrangement.stack,
        signed: stackMode === 'sum' && hasNegativeContribution(data, stackIds),
      }
    : null;
  const inStack = (id: string) => stackIds.includes(id);
  const stackedDomain = stack
    ? stackDomainData(
        domainData,
        geometrySeries.filter((item) => inStack(item.id)),
        stack.mode,
      )
    : null;
  const log = yConfig.scale === 'log';
  if (log && (barIds || stack))
    throw new Error(
      'Lilt log scales need lines, areas, or column marks; bars and stacks start at zero.',
    );
  if (log && geometrySeries.some((item) => item.scale === 'secondary'))
    throw new Error('Lilt log scales do not support secondary series.');
  const columnIds = arrangement.columns ?? [];
  const spacing =
    barIds || columnIds.length || arrangement.slots
      ? barSpacing(
          domainRows.map((row) => row.x),
          xDomain[1] - xDomain[0],
          plot.width,
        )
      : { inset: Math.min(Math.max(0, edgeInset), plot.width / 4), groupWidth: 0 };
  // Visible grouped bars, in slot order; a stack of bars fills one slot.
  const groupedBars =
    barIds && !stack
      ? series.filter((item) => barIds.includes(item.id)).map((item) => item.id)
      : [];
  const barCount = stack ? 1 : Math.max(1, groupedBars.length);
  const requestedGap =
    barLayout.gap ?? (barLayout.width === undefined ? undefined : barLayout.width * 0.19);
  const groupWidth =
    barLayout.width === undefined
      ? spacing.groupWidth
      : Math.min(
          'slot' in spacing ? spacing.slot : 0,
          barLayout.width * barCount + (requestedGap ?? 0) * (barCount - 1),
        );
  // Series on a second scale are fitted separately and left out of the primary domain. Stacked
  // series always share the primary scale.
  const secondaryIds = geometrySeries
    .filter((item) => item.scale === 'secondary' && !inStack(item.id))
    .map((item) => item.id);
  const primarySeries = secondaryIds.length
    ? series.filter((item) => !secondaryIds.includes(item.id))
    : series;
  // Marks drawn unstacked over a stack, such as a target line, share its scale.
  const overlaySeries = stack ? primarySeries.filter((item) => !inStack(item.id)) : [];
  const yDomain =
    data.rows.length === 0
      ? null
      : yDomainOverride === undefined
        ? stackedDomain
          ? stackMode === 'percent' && !overlaySeries.length
            ? ([0, 100] as const)
            : computeYDomain(
                {
                  ...domainData,
                  rows: domainData.rows.map((row, index) => ({
                    ...row,
                    values: { ...row.values, ...stackedDomain.rows[index].values },
                  })),
                },
                [...stackedDomain.series, ...overlaySeries],
                { ...yConfig, includeZero: true },
              )
          : computeYDomain(domainData, primarySeries.length ? primarySeries : series, yConfig)
        : yDomainOverride;

  const xScale =
    xConfig.type === 'time'
      ? scaleUtc()
          .domain(xDomain as [number, number])
          .range([plot.left + spacing.inset, plot.right - spacing.inset])
      : scaleLinear()
          .domain(xDomain as [number, number])
          .range([plot.left + spacing.inset, plot.right - spacing.inset]);
  const yScale = yDomain
    ? (log ? scaleLog() : scaleLinear())
        .domain(yDomain as [number, number])
        .range([plot.bottom, plot.top])
    : null;
  const yToPixel = yScale ?? (() => plot.bottom);
  const formatX =
    xConfig.type === 'category'
      ? (value: number) => {
          const id = data.rows[Math.round(value)]?.categoryId ?? '';
          return xConfig.format?.(id) ?? id;
        }
      : (xConfig.format ?? ((value: number) => defaultXFormatter(xConfig.type, value)));
  const formatY =
    yConfig.format ??
    (stackMode === 'percent' ? (value: number) => `${Math.round(value)}%` : defaultYFormatter);
  const formatValue =
    stackMode === 'percent'
      ? (series.find((item) => item.formatValue)?.formatValue ?? defaultYFormatter)
      : formatY;

  const rowIndices = evenlySelectedRows(
    domainData,
    targetTickCount(plot.width, domainData, formatX),
  );
  const xTicks = removeCollidingX(
    domainData,
    rowIndices.map((index) => domainData.rows[index].x),
    xScale,
    formatX,
    plot.width,
  );
  const generatedYTicks =
    data.rows.length === 1 && yDomain
      ? [
          stackedDomain
            ? (stackedDomain.rows[0].values.total ??
              stackedDomain.rows[0].values.positive ??
              yDomain[0])
            : (data.rows[0].values[series[0]?.id] ?? yDomain[0]),
        ].filter((value): value is number => value !== null)
      : log && yDomain
        ? logTicks(yDomain, yConfig.ticks ?? (plot.height < 160 ? 3 : 5))
        : (yScale?.ticks(yConfig.ticks ?? (plot.height < 160 ? 3 : 5)) ?? []);
  // A log domain is padded rather than rounded, so its top is not a tick worth labelling.
  const yTicks =
    !log && yDomain && generatedYTicks.length > 0 && generatedYTicks.at(-1)! < yDomain[1]
      ? [...generatedYTicks, yDomain[1]]
      : generatedYTicks;

  const secondaryValues = secondaryIds.length
    ? domainRows.flatMap((row) =>
        series.flatMap((item) => {
          if (!secondaryIds.includes(item.id)) return [];
          const value = row.values[item.id];
          return [
            ...(value === null || value === undefined ? [] : [value]),
            ...fieldValues(row.fields[item.id]),
          ];
        }),
      )
    : [];
  const primaryStep =
    yTicks.length > 1 ? yTicks[1] - yTicks[0] : yDomain ? yDomain[1] - yDomain[0] : 0;
  const factor =
    yDomain && secondaryValues.length
      ? alignedSecondaryFactor(yDomain, primaryStep, secondaryValues)
      : null;
  const secondaryDomain: readonly [number, number] | null =
    yDomain && factor !== null
      ? [yDomain[0] * factor, yDomain[1] * factor]
      : secondaryValues.length
        ? computeYDomain(
            domainData,
            series.filter((item) => secondaryIds.includes(item.id)),
            { includeZero: yConfig.includeZero, ticks: yConfig.ticks },
          )
        : null;
  const secondary =
    secondaryDomain && factor !== null
      ? {
          factor,
          format:
            yConfig.secondaryFormat ??
            series.find((item) => secondaryIds.includes(item.id))?.formatValue ??
            defaultYFormatter,
        }
      : null;

  const curveBySeries = Object.fromEntries(
    geometrySeries.map((descriptor) => [descriptor.id, descriptor.curve ?? 'monotone']),
  ) as Record<string, ChartCurve>;
  const geometryOptions: GeometryBuildOptions<T> | null =
    yDomain && plot.width > 0 && plot.height > 0 && data.rows.length > 0
      ? {
          plotLeft: plot.left,
          plotTop: plot.top,
          plotWidth: plot.width,
          plotHeight: plot.height,
          xDomain,
          yDomain,
          series: geometrySeries,
          curveBySeries,
          xInset: spacing.inset,
          barSeries: groupedBars.length ? groupedBars : undefined,
          barGroupWidth: groupWidth,
          barGap: requestedGap,
          stack: stack
            ? {
                series: stack.series,
                mode: stack.mode,
                bars: Boolean(barIds),
                signed: stack.signed,
                weights:
                  stackWeights ??
                  Object.fromEntries(
                    geometrySeries.map((item) => [
                      item.id,
                      series.some((active) => active.id === item.id) ? 1 : 0,
                    ]),
                  ),
              }
            : undefined,
          yLog: log,
          yDomainBySeries: secondaryDomain
            ? Object.fromEntries(secondaryIds.map((id) => [id, secondaryDomain]))
            : undefined,
        }
      : null;
  const geometry = geometryOptions ? buildGeometry(data, geometryOptions) : null;
  const drawGeometry =
    geometry && geometryOptions && decimate && !stack?.signed
      ? drawingGeometry(data, geometry, geometryOptions, {
          lines: geometrySeries.filter(
            (item) =>
              !barIds?.includes(item.id) && !columnIds.includes(item.id) && !inStack(item.id),
          ),
          stack: stack && !barIds ? geometrySeries.filter((item) => inStack(item.id)) : [],
          xDomain,
          xToPixel: xScale,
        })
      : null;

  return {
    bars: barIds,
    stack,
    barLayout,
    stackWeights,
    data,
    xDomain,
    yDomain,
    xTicks,
    yTicks,
    xToPixel: xScale,
    yToPixel,
    yToPixelFor: (seriesId) => {
      if (!secondaryDomain || !secondaryIds.includes(seriesId)) return yToPixel;
      const scale = scaleLinear()
        .domain(secondaryDomain as [number, number])
        .range([plot.bottom, plot.top]);
      return (value) => scale(value);
    },
    columnWidth: groupWidth,
    columns: columnIds,
    geometry,
    drawGeometry,
    plot,
    formatX,
    formatY,
    formatValue,
    secondary,
  };
}

/**
 * Thinner geometry for drawing long lines and areas, or null when every row is drawn. Each
 * unstacked line keeps its own rows; stacked layers thin together so their boundaries meet.
 * Series that do not thin keep their full geometry.
 */
function drawingGeometry<T>(
  data: NormalizedData<T>,
  geometry: PlotGeometry,
  options: GeometryBuildOptions<T>,
  {
    lines,
    stack,
    xDomain,
    xToPixel,
  }: {
    lines: readonly ChartSeries<T>[];
    stack: readonly ChartSeries<T>[];
    xDomain: readonly [number, number];
    xToPixel: (x: number) => number;
  },
): PlotGeometry | null {
  const series = { ...geometry.series };
  let thinned = false;
  for (const descriptor of lines) {
    const rows = decimateRows(data, { lines: [descriptor.id], xDomain, xToPixel });
    if (!rows) continue;
    const drawn = buildGeometry(rows, {
      ...options,
      series: [descriptor],
      stack: undefined,
      barSeries: undefined,
    }).series[descriptor.id];
    if (drawn) {
      series[descriptor.id] = drawn;
      thinned = true;
    }
  }
  if (stack.length && options.stack) {
    const ids = stack.map((item) => item.id);
    const rows = decimateRows(data, {
      lines: ids,
      stack: { series: ids, mode: options.stack.mode, weights: options.stack.weights },
      xDomain,
      xToPixel,
    });
    if (rows) {
      const drawn = buildGeometry(rows, { ...options, series: stack, barSeries: undefined });
      for (const id of ids) if (drawn.series[id]) series[id] = drawn.series[id];
      thinned = true;
    }
  }
  return thinned ? { ...geometry, series } : null;
}

export { ChartContext };
