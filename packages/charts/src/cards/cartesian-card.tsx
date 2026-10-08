'use client';

import { useMemo, useState, type CSSProperties, type ReactElement, type ReactNode } from 'react';
import { Chart } from '../runtime/chart-runtime';
import { ChartPlot } from '../chart-plot';
import { Area } from '../primitives/area';
import { Bar } from '../primitives/bar';
import { Line } from '../primitives/line';
import { Grid } from '../primitives/grid';
import { XAxis, YAxis } from '../primitives/axes';
import { ReferenceBand } from '../primitives/annotations';
import { IntervalBand } from '../primitives/interval-band';
import { ReferenceLine } from '../primitives/reference-line';
import { useCardSync } from '../interaction/chart-sync';
import { ValueLegend, cardLegendVariant } from '../interaction/value-legend';
import { useCartesianChartModel } from '../model/cartesian-model';
import { useChartState } from '../model/use-chart-state';
import type {
  ChartController,
  ChartMargins,
  ChartTooltipContext,
  NumericXConfig,
  TimeXConfig,
  ChartAxis,
  ChartBarAppearance,
  ChartBackground,
  ChartCurve,
  ChartMotion,
  ChartPalette,
  ChartHoverReadout,
  ChartHoverStyle,
  ChartSeries,
  ChartTooltipIndicator,
  ChartStyle,
  ChartSurface,
  CardLegend,
  ChartLegendSwatch,
  ChartLoadingStyle,
  ChartEmptyState,
} from '../types';
import {
  ChartCard,
  ChartCardCaption,
  ChartCardDelta,
  ChartCardHeader,
  ChartCardRange,
  ChartCardTitle,
  ChartCardValue,
} from './chart-card';
import { hasYGutter, resolveAxis, resolvePillPosition } from '../interaction/axis-cursor';
import { resolveX, type NumericKey, type ResolvedX, type XKey, type XKind } from './keys';
import {
  numberFormatters,
  signedFormat,
  summarize,
  useCardFormat,
  valuesOf,
  type CardAggregate,
} from './format';
import type { AnimatedNumberVariant } from '../motion/animated-number';
import { EmptyShapeContext, type ChartEmptyShape } from '../lifecycle/chart-empty';
import { compositionShares } from '../engine/composition';

export interface CardSeries<Key extends string> {
  /** A numeric field of each row. */
  key: Key;
  /** Defaults to the key. */
  label?: string;
  /** Any CSS color. Defaults to the next palette color. */
  color?: string;
  /**
   * A reference such as a previous period or target: drawn as a dashed line without a fill and
   * left out of the headline total.
   */
  dashed?: boolean;
}

/** A goal each point should reach. A number, or a value with its own line label. */
export type CardTarget = number | { value: number; label?: string };

/** Rows from `from` onward are projections rather than measurements. */
export interface CardForecast<Row> {
  /** Supplied uncertainty envelopes, ordered widest to narrowest. Values are never estimated. */
  bands?: readonly { lower: NumericKey<Row>; upper: NumericKey<Row>; label: string }[];
  /** The x value of the first projected row: a label, number, or Date. */
  from: string | number | Date;
  /** Fields holding the low and high end of the projection, drawn as a band around it. */
  lower?: NumericKey<Row>;
  upper?: NumericKey<Row>;
  /** Names the projected region and the hover caption. Defaults to "Forecast". */
  label?: string;
}

export interface CardRange<Row> {
  id: string;
  label: string;
  data: readonly Row[];
  delta?: number;
  headline?: number;
}

/** Props every Cartesian card shares. Each card adds its own shape options. */
export interface CartesianCardProps<Row, Key extends NumericKey<Row>> {
  /** Optional visible title. Use aria-label to name an embedded chart. */
  title?: string;
  /** Show the header, including headline and period controls. Defaults to true. */
  header?: boolean;
  /** Accessible name, independent of the visible title. */
  'aria-label'?: string;
  /** One row per x position. Omit when `ranges` supplies the data. */
  data?: readonly Row[];
  /** Field used for the x axis: labels, numbers, or dates. */
  x: XKey<Row>;
  series: readonly CardSeries<Key>[];
  /** Resting headline. Defaults to the total of every series except dashed references. */
  headline?: number;
  /**
   * How the headline and tiles summarize the period at rest: `sum` (default) for counts and
   * money, `mean` or `max` for rates such as latency, `last` for levels such as seats.
   */
  aggregate?: CardAggregate;
  /** Make the headline follow one series instead of the total, e.g. p95 latency. */
  headlineSeries?: NoInfer<Key>;
  /** Fractional change shown as a chip, e.g. 0.082 → +8.2%. */
  delta?: number;
  deltaTone?: 'default' | 'inverse' | 'neutral';
  /** Static period label, e.g. "This year". */
  range?: string;
  /** Period select. Each range replaces data, delta and headline. */
  ranges?: readonly CardRange<Row>[];
  defaultRange?: string;
  /** Per-series stat tiles under the plot. Defaults to true; false hides the legend. */
  tiles?: boolean;
  /**
   * How the legend under the plot lays out: value `tiles` (default), compact `inline` labels,
   * `list` rows, tinted `pills`, or `bars` that also draw each value against the largest.
   * False removes the legend without changing the data or marks.
   */
  legend?: CardLegend | false;
  /** The mark beside each legend label: `square` (default), `dot`, or `line`. */
  legendSwatch?: ChartLegendSwatch;
  /**
   * Gives the plot depth: lines become lit tubes with a soft shadow, and bar cards draw
   * `isometric` blocks. Every point and bar still reads its exact value.
   */
  depth?: boolean;
  /** Plot height in pixels. Defaults to 240. */
  height?: number;
  /** Number format for the headline, tiles, and axis, e.g. `{ style: 'currency', currency: 'USD' }`. */
  valueFormat?: Intl.NumberFormatOptions;
  locale?: string;
  /** Full control over value text. Takes precedence over `valueFormat`. */
  formatValue?: (value: number) => string;
  formatAxisValue?: (value: number) => string;
  formatX?: (value: string | number | Date) => string;
  /** Override x inference. Numbers default to `number`; use `time` for timestamps. */
  xType?: XKind;
  /**
   * Axis preset: `minimal` (default), `dots`, `inline`, `ruler`, `classic`, or `segmented`, for
   * both axes or one per axis, e.g. `{ x: 'minimal', y: { style: 'segmented', gradient: true } }`.
   */
  axis?: ChartAxis;
  /** Texture behind the plot: `dots` (default), `grid`, `lines`, or `none`. */
  background?: ChartBackground;
  /**
   * Light up what is under the pointer: the background around a point, and on bar charts the
   * whole column. Defaults to true.
   */
  spotlight?: boolean;
  /**
   * Draw a long line or area from each pixel column's first, last, lowest and highest
   * observation, so tens of thousands of points stay fast to hover. The ink is the same, and the
   * headline, tiles, hover and exports still read every row. Defaults to true.
   */
  decimate?: boolean;
  /** Card treatment: `elevated` (default), `outline`, or `ghost` inside your own card. */
  surface?: ChartSurface;
  /** A glass tab tucked behind the card's top edge, e.g. a caption, a command, or actions. */
  badge?: ReactNode;
  /** Headline motion: `count` (default), `pop`, `slide`, `roll`, `flow`, or `scramble`. */
  numberStyle?: AnimatedNumberVariant;
  /** Series color set. Explicit series colors still win. */
  palette?: ChartPalette;
  /**
   * Run marks to the card's edges. Line and area cards fade past the first and last
   * observations. With `false`, data starts and ends at the plot edges and edge labels hang into
   * the card padding to stay centered.
   */
  bleed?: boolean;
  /**
   * Padding in pixels between the plot edges and axis labels or pills.
   * Defaults to the card padding (20) when `bleed` is on, otherwise 0.
   */
  axisInset?: number;
  /**
   * What the hovered point shows, one readout at a time: `pills` (default) on the axes, a
   * `tooltip` with every series, a `strip` docked above the plot, or `headline`, which leaves the
   * plot to the hover dots.
   */
  hover?: ChartHoverReadout;
  /** How the pills or tooltip look: `soft` (default), `solid`, or `accent`. */
  hoverStyle?: ChartHoverStyle;
  /**
   * Which series the y pill follows and the tooltip leads with: `nearest` (default) tracks the
   * line closest to the pointer, a series key locks it, and `total` follows the top of a stack.
   */
  pillSeries?: 'nearest' | 'total' | NoInfer<Key>;
  /** Stacks: show the series' own value (`series`, default) or its stacked height (`stack`). */
  pillValue?: 'series' | 'stack';
  /**
   * Where the value pill sits: `mark` above the hovered bar or point, `axis` on the y axis.
   * `auto` (default) uses `mark` when the axis shows no y labels.
   */
  pillPosition?: 'auto' | 'axis' | 'mark';
  /** Series marker on each tooltip row: `square` (default), `dot`, or `line`. */
  tooltipIndicator?: ChartTooltipIndicator;
  /**
   * Enable range comparison by dragging across the plot. Off by default. `true` or `'headline'`
   * reads the change out in the headline; `'badge'` reads it out in the card's badge tab and
   * leaves the headline and tiles at rest.
   */
  compare?: boolean | 'headline' | 'badge';
  /**
   * The value each point should reach, drawn as a dashed line. The hovered point reads against
   * it, and at rest the header counts points on target. With `deltaTone="inverse"`, on target
   * means at or below it.
   */
  target?: CardTarget;
  /**
   * Mark rows from `forecast.from` onward as projections: drawn dotted, left out of the headline
   * and tiles, and captioned "Forecast" on hover. `lower` and `upper` add a range band on line
   * and unstacked area cards; each bound must contain the projected value.
   */
  forecast?: CardForecast<Row>;
  /**
   * Link hover and pins with every card that uses the same name. Cards match by x: labels
   * exactly, dates and numbers to the nearest row. Every linked card shows its hover marks,
   * pills, and headline at that point. A click pins every linked card: the clicked card shows the
   * pin and the others a ghost of it, and any of them releases it. Alt-click pins one card only.
   */
  sync?: string;
  loading?: boolean;
  /**
   * How the skeleton moves while `loading`: `shimmer` (default) sweeps a highlight over still
   * shapes, `draw` reveals bars or contours in order, `breathe` lets them rise and settle.
   * Moving skeletons on a page share a clock.
   */
  loadingStyle?: ChartLoadingStyle;
  /**
   * What the plot shows when the period has no data: `dots` (default), the chart's own `shape`,
   * your own element such as `<ChartEmpty>No visits yet</ChartEmpty>`, or `null` for nothing.
   */
  empty?: ChartEmptyState;
  /** `none` turns off decorative motion; reduced-motion users get this automatically. */
  motion?: ChartMotion;
  className?: string;
  style?: CSSProperties | ChartStyle;
}

/**
 * Series options only some cards expose. The Combo card draws `as: 'line'` series over its bars,
 * optionally on their own scale and with their own number format and summary.
 */
export interface CoreSeries<Key extends string> extends CardSeries<Key> {
  as?: 'line';
  scale?: 'secondary';
  valueFormat?: Intl.NumberFormatOptions;
  aggregate?: CardAggregate;
}

/**
 * How a card combines its series: `false` side by side (bars) or overlapping (areas), `sum`
 * adds them, `percent` shows each series' share of its period.
 */
export type CardStack = false | 'sum' | 'percent';

/** The public `stack` prop: `true` adds series, `'percent'` shows shares. */
export function cardStack(stack: boolean | 'percent' | undefined): CardStack {
  return stack === true ? 'sum' : (stack ?? false);
}

/** How a specific card draws its marks; everything else is shared. */
export type CardShape =
  | { kind: 'area'; stack: CardStack; curve: ChartCurve }
  | { kind: 'line'; curve: ChartCurve; points: boolean; zero: boolean; indexed?: boolean }
  | {
      kind: 'bar';
      stack: CardStack;
      radius: number;
      /** `end` rounds each bar's value end; `all` rounds every corner of every bar and segment. */
      corners: 'end' | 'all';
      tracks: boolean;
      barWidth?: number;
      appearance: ChartBarAppearance;
      /** Curve and point markers of lines drawn over the bars. */
      curve?: ChartCurve;
      points?: boolean;
    }
  | CardMarks;

/**
 * Column marks drawn from each series' fields, such as candles or range bars. Cards built on
 * this shape keep every Cartesian card behaviour: headline, ranges, hover sync and tiles.
 */
export interface CardMarks {
  kind: 'marks';
  /** A stable description of everything below, so memoized series only rebuild when it changes. */
  id: string;
  /** Descriptor options for a series by key, such as its fields, colors, curve, or area. */
  series?: (key: string) => Partial<ChartSeries<never>> | undefined;
  /**
   * The marks for the drawn series, as elements or fragments of them (not wrapped in a
   * component), so the plot can find column marks. Dashed references still draw as lines.
   */
  draw: (ids: readonly string[]) => ReactNode;
  includeZero: boolean;
  scale?: 'linear' | 'log';
  curve?: ChartCurve;
  /** Values the y axis must reach, such as outliers beyond the fields. */
  include?: readonly number[];
  /** Slot every observation like a bar, so linked bar panes line up. Column marks imply it. */
  slots?: boolean;
  /** Label the x axis here. Turn off when a pane below carries it. Defaults to true. */
  xAxis?: boolean;
  /** Extra text after the hovered x in the headline caption, e.g. open, high and low. */
  describe?: (inspection: ChartTooltipContext) => string | null;
  /** The outline the `shape` empty look draws. Defaults to `bars` for column marks. */
  emptyShape?: ChartEmptyShape;
}

/** Panes drawn under the main plot, linked to it: same data, x, margins and crosshair. */
export interface CardPaneContext<Row> {
  loadingStyle?: ChartLoadingStyle;
  data: readonly Row[];
  x: TimeXConfig<Row> | NumericXConfig<Row>;
  controller: ChartController;
  margins: ChartMargins;
  /** The main plot's `axisInset` and `slots`, so a pane's observations sit under its own. */
  axisInset: number;
  slots: boolean;
  axis: ChartAxis;
  loading: boolean;
  motion?: ChartMotion;
  hoverStyle: ChartHoverStyle;
  formatValue: (value: number) => string;
  formatAxis: (value: number) => string;
}

const EMPTY: readonly never[] = [];
const acceptedRevision = (state: { acceptedRevision: number }) => state.acceptedRevision;
/** Matches the default `--lilt-card-padding`. */
export const CARD_PADDING = 20;

/**
 * The shared card body: headline, delta, period, plot, and value tiles, with hover sync and
 * range comparison. Area, Line, and Bar cards differ only in their `shape`.
 */
export function CartesianCard<Row, Key extends NumericKey<Row>>({
  shape,
  title,
  header = true,
  'aria-label': ariaLabel = title || 'Chart',
  data: suppliedData,
  x,
  series: seriesInput,
  headline: suppliedHeadline,
  aggregate: suppliedAggregate = 'sum',
  headlineSeries,
  delta: suppliedDelta,
  deltaTone,
  range,
  ranges,
  defaultRange,
  tiles = true,
  legend = 'tiles',
  legendSwatch,
  depth = false,
  height = 240,
  valueFormat,
  locale = 'en-US',
  formatValue: suppliedFormatValue,
  formatAxisValue: suppliedFormatAxisValue,
  formatX,
  xType,
  compare = false,
  target: suppliedTarget,
  forecast,
  sync,
  axis = 'minimal',
  hover = 'pills',
  hoverStyle = 'soft',
  background = 'dots',
  spotlight = true,
  decimate = true,
  surface = 'elevated',
  badge,
  numberStyle,
  palette,
  bleed = shape.kind !== 'bar' && shape.kind !== 'marks',
  axisInset,
  pillSeries = 'nearest',
  pillValue = 'series',
  pillPosition = 'auto',
  tooltipIndicator = 'square',
  loading = false,
  loadingStyle,
  empty,
  motion,
  className,
  style,
  panes,
  live = false,
  heading,
  restCaption,
}: Omit<CartesianCardProps<Row, Key>, 'series'> & {
  series: readonly CoreSeries<Key>[];
  shape: CardShape;
  /** Linked panes under the plot, such as volume or indicators. */
  panes?: (context: CardPaneContext<Row>) => ReactNode;
  /** Follow the newest observation as rows arrive. */
  live?: boolean;
  /** Richer title content, such as a ticker and its name; `title` still labels the chart. */
  heading?: ReactNode;
  /** Text beside the delta at rest, such as an absolute change, from the active data. */
  restCaption?: (data: readonly Row[]) => ReactNode;
}): ReactElement {
  const [rangeId, setRangeId] = useState(defaultRange ?? ranges?.[0]?.id);
  const activeRange = ranges?.find((item) => item.id === rangeId) ?? ranges?.[0];
  const data = activeRange?.data ?? suppliedData ?? (EMPTY as readonly Row[]);
  const delta = activeRange ? activeRange.delta : suppliedDelta;
  const stack = shape.kind === 'line' || shape.kind === 'marks' ? false : shape.stack;
  const stacked = stack !== false;
  // Percent stacks read shares of each complete period, and summarize the latest one.
  const percent = stack === 'percent';
  const indexed = shape.kind === 'line' && shape.indexed;
  const aggregate = percent ? 'last' : suppliedAggregate;
  // Lines and areas can run past the data to the edges; bars sit in slots and never need to.
  const runoff = bleed && shape.kind !== 'bar' && shape.kind !== 'marks';

  const formatPercent = useMemo(() => {
    const formatter = new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 });
    return (value: number) => formatter.format(value / 100);
  }, [locale]);
  const format = useCardFormat({
    valueFormat,
    locale,
    formatValue: percent ? formatPercent : suppliedFormatValue,
    formatAxisValue: percent ? formatPercent : suppliedFormatAxisValue,
  });
  const formatValue = format.value;
  const formatKey = format.key;

  const shapeKey = JSON.stringify(shape);
  const seriesKey = seriesInput
    .map(
      (item) =>
        `${item.key}|${item.label}|${item.color}|${item.dashed}|${item.as}|${item.scale}|${JSON.stringify(item.valueFormat ?? null)}`,
    )
    .join();
  // Drawn as lines over the bars or stack: dashed references, and Combo lines.
  const overlays = new Set(
    seriesInput
      .filter((item) => item.as === 'line' || item.dashed)
      .map((item) => item.key as string),
  );
  const shares = useMemo(() => {
    if (indexed) {
      const bases = seriesInput.map((item) =>
        data.map((row) => numberAt(row, item.key)).find((v) => v !== null),
      );
      return new Map(
        data.map((row) => [
          row,
          Object.fromEntries(
            seriesInput.map((item, i) => {
              const base = bases[i],
                value = numberAt(row, item.key);
              const result = base && value !== null ? (value / base) * 100 : null;
              return [item.key, result !== null && Number.isFinite(result) ? result : null];
            }),
          ),
        ]),
      );
    }
    if (!percent) return null;
    const layers = seriesInput.filter((item) => !overlays.has(item.key));
    return new Map(
      data.map((row) => [
        row,
        Object.fromEntries(
          compositionShares(layers.map((item) => (row as Record<string, unknown>)[item.key])).map(
            (value, index) => [layers[index]!.key, value],
          ),
        ),
      ]),
    );
    // overlays is derived from the series, which seriesKey summarizes.
  }, [percent, indexed, data, seriesKey]);
  // Series with their own number format, e.g. a conversion rate over revenue bars.
  const seriesFormats = useMemo(
    () =>
      new Map(
        seriesInput.flatMap((item) =>
          item.valueFormat
            ? [[item.key as string, numberFormatters(locale, item.valueFormat)]]
            : [],
        ),
      ),
    [seriesKey, locale],
  );
  const formatFor = (id: string) => seriesFormats.get(id)?.full ?? formatValue;
  const resolvedX = useMemo(
    () => resolveX(data, x, xType, formatX),
    // formatX is usually inline; the rendered labels only depend on the data and key.
    [data, x, xType],
  );
  const forecastFrom = forecast?.from instanceof Date ? forecast.from.getTime() : forecast?.from;
  const forecastStart = useMemo(
    () => (forecastFrom === undefined ? null : forecastPosition(data, x, resolvedX, forecastFrom)),
    [data, x, resolvedX, forecastFrom],
  );
  // Headline and tiles summarize what was measured; projections only read out on hover.
  const measured = useMemo(
    () =>
      forecastStart === null ? data : data.filter((row) => resolvedX.position(row) < forecastStart),
    [data, forecastStart, resolvedX],
  );
  const bandKey =
    ((forecast?.lower && forecast.upper) || forecast?.bands?.length) &&
    !indexed &&
    !stacked &&
    shape.kind !== 'bar' &&
    shape.kind !== 'marks'
      ? ((headlineSeries ?? seriesInput.find((item) => item.as !== 'line' && !item.dashed)?.key) as
          | string
          | undefined)
      : undefined;
  const series = useMemo(
    () =>
      seriesInput.map((item, index): ChartSeries<Row> & { id: Key } => {
        // A dashed series is a reference line, drawn over the marks and never stacked.
        const reference = Boolean(item.dashed);
        const dashedLine = { width: 1.5, dasharray: '4 4', pointRadius: 3 };
        const own = seriesFormats.get(item.key);
        return {
          id: item.key,
          label: item.label ?? item.key,
          color: item.color ?? `var(--lilt-series-${(index % 6) + 1})`,
          accessor: (row) => {
            if (shares && (indexed || !overlays.has(item.key)))
              return shares.get(row)?.[item.key] ?? null;
            const value = (row as Record<string, unknown>)[item.key];
            return typeof value === 'number' ? value : null;
          },
          curve: shape.curve ?? 'monotone',
          scale: item.scale,
          ...(forecastStart !== null && !reference
            ? {
                status: (row: Row) =>
                  resolvedX.position(row) >= forecastStart ? 'forecast' : 'observed',
              }
            : {}),
          ...(bandKey === item.key && forecast
            ? {
                fields: {
                  ...Object.fromEntries(
                    (forecast.bands ?? []).flatMap((band, i) => [
                      [
                        `fanLow${i}`,
                        {
                          label: `${band.label} low`,
                          accessor: (row: Row) => numberAt(row, band.lower),
                        },
                      ],
                      [
                        `fanHigh${i}`,
                        {
                          label: `${band.label} high`,
                          accessor: (row: Row) => numberAt(row, band.upper),
                        },
                      ],
                    ]),
                  ),
                  ...(forecast.lower && forecast.upper
                    ? {
                        lower: {
                          label: `${forecast.label ?? 'Forecast'} low`,
                          accessor: (row: Row) =>
                            forecast.lower ? numberAt(row, forecast.lower) : null,
                        },
                        upper: {
                          label: `${forecast.label ?? 'Forecast'} high`,
                          accessor: (row: Row) =>
                            forecast.upper ? numberAt(row, forecast.upper) : null,
                        },
                      }
                    : {}),
                },
              }
            : {}),
          ...(shape.kind === 'marks'
            ? {
                line: reference ? dashedLine : { width: 2, depth },
                ...(shape.series?.(item.key) as Partial<ChartSeries<Row>>),
              }
            : shape.kind === 'area'
              ? {
                  area:
                    stacked && !reference
                      ? { treatment: 'solid', opacity: percent ? 0.72 : 0.2 }
                      : { treatment: 'fade' },
                  line: reference ? dashedLine : { width: 2, depth },
                }
              : shape.kind === 'line'
                ? { line: reference ? dashedLine : { width: 2, points: shape.points, depth } }
                : {
                    line: reference
                      ? dashedLine
                      : {
                          width: 2,
                          points: shape.points,
                          pointRadius: shape.points ? 3 : undefined,
                          depth,
                        },
                    bar: {
                      appearance: shape.appearance,
                      radius: shape.radius,
                      roundBothEnds: shape.corners === 'all',
                      ...(shape.tracks ? { track: { opacity: 0.45 } } : {}),
                    },
                  }),
          formatValue: own ? own.full : format.stable.value,
        } as ChartSeries<Row> & { id: Key };
      }),
    [
      seriesKey,
      shapeKey,
      stacked,
      percent,
      formatKey,
      seriesFormats,
      shares,
      indexed,
      forecastStart,
      resolvedX,
      bandKey,
      forecast?.lower,
      forecast?.upper,
      forecast?.label,
      JSON.stringify(forecast?.bands),
      depth,
    ],
  );
  const xConfig = useMemo(
    () => ({
      type: resolvedX.kind === 'time' ? ('time' as const) : ('number' as const),
      accessor: resolvedX.position,
      format: resolvedX.format,
    }),
    [resolvedX],
  );
  const secondaryKey = seriesInput.find((item) => item.scale === 'secondary')?.key;
  const secondaryAxisFormat = secondaryKey
    ? (seriesFormats.get(secondaryKey)?.compact ?? format.stable.axis)
    : undefined;
  // Areas and bars encode value as length, so they start at zero; lines fit their data.
  const includeZero =
    shape.kind === 'marks' ? shape.includeZero : shape.kind !== 'line' || shape.zero;
  const yScale = shape.kind === 'marks' ? shape.scale : undefined;
  const markInclude = shape.kind === 'marks' ? (shape.include ?? []) : [];
  const includeKey = markInclude.join();
  const target =
    suppliedTarget === undefined
      ? null
      : typeof suppliedTarget === 'number'
        ? { value: suppliedTarget, label: 'Target' }
        : { value: suppliedTarget.value, label: suppliedTarget.label ?? 'Target' };
  // Percent stacks plot shares, which a target in the data's own unit cannot sit on.
  const targetValue = target && Number.isFinite(target.value) && !percent ? target.value : null;
  const include = [...(targetValue !== null ? [targetValue] : []), ...markInclude];
  const yConfig = useMemo(
    () => ({
      includeZero,
      ...(yScale ? { scale: yScale } : {}),
      ...(include.length ? { include } : {}),
      ...(percent ? { domain: [0, 100] as const } : {}),
      ticks: 4,
      format: percent ? (value: number) => `${Math.round(value)}%` : format.stable.axis,
      secondaryFormat: secondaryAxisFormat,
    }),
    // include is summarized by the target and mark keys.
    [percent, includeZero, yScale, format.stable, secondaryAxisFormat, targetValue, includeKey],
  );

  const model = useCartesianChartModel({
    data,
    x: xConfig,
    y: yConfig,
    series,
    status: loading ? 'loading' : 'ready',
  });
  const inspection = useChartState(model, (state) => state.inspection);
  useCardSync(sync, model.getController(), data, x, resolvedX as ResolvedX<unknown>, {
    label: ariaLabel,
    release: model.actions.release,
  });
  // The model adopts new series in an effect after this render, so marks for a series it has not
  // seen yet would fail their lookup. Draw only what it knows; a new series appears on the next
  // render, which the accepted revision triggers.
  useChartState(model, acceptedRevision);
  const drawn = new Set<string>(model.series.map((item) => item.id));
  const [focusedId, setFocusedId] = useState<Key | null>(null);
  // Series hidden from the legend leave the plot and the headline; their tiles stay to bring
  // them back.
  const [hiddenIds, setHiddenIds] = useState<Key[]>([]);
  const hidden = new Set<string>(hiddenIds);

  const totals = useMemo(
    () =>
      series.map((item, index) => ({
        id: item.id,
        total: shares
          ? measured.length && (indexed || !overlays.has(item.id))
            ? (shares.get(measured.at(-1)!)?.[item.id] ?? null)
            : null
          : summarize(valuesOf(measured, item.id), seriesInput[index]?.aggregate ?? aggregate),
      })),
    // seriesInput is summarized by seriesKey, which series already depends on.
    [series, measured, aggregate, shares, indexed],
  );
  // Lines drawn over bars (references such as a target, or a Combo rate) never count toward the
  // headline; a headline series narrows it to one series.
  const counted = new Set<string>(
    headlineSeries
      ? [headlineSeries]
      : seriesInput
          .filter((item) => !overlays.has(item.key) && !hidden.has(item.key))
          .map((item) => item.key as string),
  );
  // Per-row totals of the counted series, summarized the same way as the tiles.
  const rowTotals = useMemo(
    () =>
      measured.flatMap((row) => {
        const values = [...counted].map((key) =>
          indexed ? shares?.get(row)?.[key] : (row as Record<string, unknown>)[key],
        );
        return values.every((value) => typeof value === 'number')
          ? [values.reduce<number>((sum, value) => sum + (value as number), 0)]
          : [];
      }),
    // counted is derived from the series, headline props, and hidden series.
    [measured, seriesKey, headlineSeries, stacked, hiddenIds, indexed, shares],
  );
  // With every headline series hidden, or nothing measured in the period, there is nothing to
  // total: a dash, never a false zero.
  const nothingMeasured = !totals.some((item) => counted.has(item.id) && item.total !== null);
  const restingHeadline = percent
    ? totals.some((item) => counted.has(item.id) && item.total === null) || !measured.length
      ? null
      : totals.reduce((sum, item) => sum + (counted.has(item.id) ? (item.total ?? 0) : 0), 0)
    : (activeRange?.headline ??
      suppliedHeadline ??
      (counted.size === 0 || nothingMeasured
        ? null
        : aggregate === 'sum'
          ? totals.reduce((sum, item) => sum + (counted.has(item.id) ? (item.total ?? 0) : 0), 0)
          : (summarize(rowTotals, aggregate) ?? 0)));
  // A tooltip is the readout, so the headline and tiles stay at rest beneath it.
  // A panel reads the point out, so the headline and tiles rest.
  const panelReadout = hover === 'tooltip' || hover === 'strip';
  const following = panelReadout ? null : inspection;
  const hoveredValues = following
    ? new Map<string, number | null>(following.series.map((item) => [item.id, item.value]))
    : null;
  // A completed range comparison reports the change between its endpoints; hover still wins.
  // In the badge, a comparison reads out while it is drawn and stays beside hover; the headline
  // and tiles stay at rest.
  const comparison = useChartState(model, (state) => state.comparison);
  const inBadge = compare === 'badge';
  const compared = !inBadge && !inspection && comparison?.phase === 'complete' ? comparison : null;
  const badgeComparison = inBadge ? comparison : null;
  const comparedChanges = compared
    ? new Map(compared.series.map((item) => [item.id, item.absoluteChange]))
    : null;
  const totalsOf = (result: NonNullable<typeof comparison>) =>
    result.series
      .filter((item) => counted.has(item.id))
      .reduce(
        (sum, item) => ({
          start: sum.start + (item.startValue ?? 0),
          end: sum.end + (item.endValue ?? 0),
        }),
        { start: 0, end: 0 },
      );
  const comparedTotals = compared ? totalsOf(compared) : undefined;
  const badgeTotals = badgeComparison ? totalsOf(badgeComparison) : undefined;
  // Shares change by percentage points, not by percent.
  const changeFormat = percent
    ? (value: number) =>
        `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value)} pp`
    : formatValue;
  const signed = signedFormat(changeFormat);
  // Direction is not desirability: with an inverse tone, staying under the target is the goal.
  const targetHits =
    targetValue === null
      ? null
      : rowTotals.filter((value) =>
          deltaTone === 'inverse' ? value <= targetValue : value >= targetValue,
        ).length;
  const restCaptionNode = restCaption && data.length ? restCaption(data) : null;
  const hoveredDetail =
    following && shape.kind === 'marks' ? (shape.describe?.(following) ?? null) : null;
  const hoveredForecast = Boolean(
    forecastStart !== null && following?.series.some((item) => item.status === 'forecast'),
  );
  const headline =
    counted.size === 0 ||
    (percent &&
      compared?.series.some(
        (item) => counted.has(item.id) && (item.startValue === null || item.endValue === null),
      ))
      ? null
      : hoveredValues
        ? percent && [...counted].some((id) => hoveredValues.get(id) == null)
          ? null
          : [...hoveredValues].reduce<number>(
              (sum, [id, value]) => sum + (counted.has(id) ? (value ?? 0) : 0),
              0,
            )
        : comparedTotals
          ? comparedTotals.end - comparedTotals.start
          : restingHeadline;

  const focus = (id: Key | null) => {
    setFocusedId(id);
    model.actions.focusSeries(id);
  };
  const changeHidden = (ids: Key[]) => {
    setHiddenIds(ids);
    focus(null);
    model.actions.setVisibleSeries(series.map((item) => item.id).filter((id) => !ids.includes(id)));
  };
  const sides = resolveAxis(axis);
  const gutter = hasYGutter(sides.y);
  const gutterWidth = sides.y === 'classic' ? 44 : 48;
  const secondaryScale = Boolean(secondaryKey);
  const edge = bleed ? 0 : 4;
  // Pills above marks need headroom over the tallest bar or highest point.
  const markPills = resolvePillPosition(pillPosition, sides.y) === 'mark';
  const margins = {
    top:
      hover === 'strip'
        ? 44
        : markPills
          ? 30
          : sides.y === 'inline' || sides.y === 'ruler'
            ? 22
            : 8,
    right: gutter && secondaryScale ? gutterWidth : edge,
    bottom: shape.kind === 'marks' && shape.xAxis === false ? 6 : 28,
    left: gutter ? gutterWidth : edge,
  };
  const inset = axisInset ?? (bleed ? CARD_PADDING : 0);
  // The bars, or the stack's layers; overlays draw as lines over them.
  const markSeries = series.filter((item) => !overlays.has(item.id)).map((item) => item.id);
  const drawnSeries = series.filter((item) => drawn.has(item.id));

  const lastMeasured = measured.length ? resolvedX.position(measured.at(-1)!) : null;
  const lastPosition = data.length ? resolvedX.position(data.at(-1)!) : null;
  // The projected region starts where the projection is drawn: lines and areas turn dotted at
  // the last measurement, and bars change between the last measured slot and the first projected.
  const forecastEdge =
    forecastStart === null || lastPosition === null || forecastStart > lastPosition
      ? null
      : lastMeasured === null
        ? forecastStart
        : shape.kind === 'bar'
          ? (lastMeasured + firstAtOrAfter(data, resolvedX, forecastStart)) / 2
          : lastMeasured;
  const marks = (
    <>
      <Grid pattern="lines" />
      {forecastEdge !== null ? (
        <ReferenceBand
          from={forecastEdge}
          // Runs to the plot's right edge, which includes the last bar's slot.
          to={Number.POSITIVE_INFINITY}
          label={forecast?.label ?? 'Forecast'}
          color="var(--lilt-muted)"
          className="lilt-card__forecast"
        />
      ) : null}
      {bandKey && drawn.has(bandKey) ? (
        <>
          {forecast?.bands?.map((band, i) => (
            <IntervalBand
              key={`${band.lower}-${band.upper}`}
              series={bandKey}
              lower={`fanLow${i}`}
              upper={`fanHigh${i}`}
            />
          ))}
          {forecast?.lower && forecast.upper ? (
            <IntervalBand series={bandKey} lower="lower" upper="upper" />
          ) : null}
        </>
      ) : null}
      {shape.kind === 'area'
        ? drawnSeries.map((item) =>
            overlays.has(item.id) ? null : (
              <Area key={`area-${item.id}`} model={model} series={item.id} />
            ),
          )
        : null}
      {shape.kind === 'bar'
        ? markSeries
            .filter((id) => drawn.has(id))
            .map((id) => <Bar key={`bar-${id}`} model={model} series={id} />)
        : null}
      {shape.kind === 'marks' ? shape.draw(markSeries.filter((id) => drawn.has(id))) : null}
      {drawnSeries.map((item) =>
        (shape.kind === 'bar' || shape.kind === 'marks') && !overlays.has(item.id) ? null : (
          <Line key={`line-${item.id}`} model={model} series={item.id} />
        ),
      )}
      {targetValue !== null ? (
        <ReferenceLine
          value={targetValue}
          label={`${target!.label} ${format.axis(targetValue)}`}
          className="lilt-card__target"
        />
      ) : null}
      {/* Lines and areas read from their ends; every bar slot deserves a label that fits. */}
      {shape.kind !== 'marks' || shape.xAxis !== false ? (
        <XAxis labels={shape.kind === 'bar' || shape.kind === 'marks' ? 'fit' : undefined} />
      ) : null}
      <YAxis />
      {secondaryScale ? <YAxis scale="secondary" /> : null}
    </>
  );
  const plot = {
    model,
    height,
    margins,
    axis,
    pill: hover === 'pills' ? hoverStyle : (false as const),
    pillSeries,
    pillPosition,
    background,
    spotlight,
    decimate,
    axisInset: inset,
    runoff,
    labelOverhang: bleed ? 0 : CARD_PADDING - 4,
    // The card's tiles already read out narrow charts, so the panel always floats.
    tooltip: panelReadout
      ? {
          variant: hoverStyle,
          indicator: tooltipIndicator,
          adaptive: false,
          layout: hover === 'strip' ? ('strip' as const) : ('float' as const),
        }
      : undefined,
  };
  // Percent stacks already plot shares, so their layers add up like any other stack.
  const plotStack = stacked && markSeries.length ? { series: markSeries } : undefined;
  const plotElement = (
    <ChartPlot
      {...plot}
      bars={
        shape.kind === 'bar'
          ? stacked
            ? { segmentGap: 2, width: shape.barWidth }
            : { series: markSeries, gap: 3, width: shape.barWidth }
          : undefined
      }
      stack={plotStack}
      pillValue={stacked ? pillValue : undefined}
      slots={shape.kind === 'marks' && Boolean(shape.slots)}
    >
      {marks}
    </ChartPlot>
  );

  const badgeChange =
    !badgeTotals ||
    (percent &&
      badgeComparison!.series.some(
        (item) => counted.has(item.id) && (item.startValue === null || item.endValue === null),
      ))
      ? null
      : badgeTotals.end - badgeTotals.start;
  // The tab stays in place at rest, so a comparison never moves the card; it shows the
  // consumer's badge, or a hint until there is one.
  const cardBadge =
    badgeComparison && !loading ? (
      <>
        <span className="lilt-card-badge__comparison" role="status">
          <span className="lilt-card-badge__range">
            {badgeComparison.formattedStartX} → {badgeComparison.formattedEndX}
          </span>
          <span className="lilt-card-badge__change">
            {badgeChange === null ? '—' : signed(badgeChange)}
          </span>
          {!percent && badgeTotals && badgeTotals.start !== 0 ? (
            <ChartCardDelta value={badgeTotals.end / badgeTotals.start - 1} tone={deltaTone} />
          ) : null}
        </span>
        <button
          type="button"
          className="lilt-card-badge__clear"
          aria-label={
            badgeComparison.phase === 'preview' ? 'Cancel comparison' : 'Clear comparison'
          }
          onClick={model.actions.clearComparison}
        >
          <svg aria-hidden="true" viewBox="0 0 16 16" fill="none">
            <path
              d="m4 4 8 8M12 4l-8 8"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </>
    ) : (
      (badge ??
      (inBadge ? (
        <span className="lilt-card-badge__hint">Drag across the chart to compare</span>
      ) : undefined))
    );

  return (
    <ChartCard
      motion={motion}
      className={className}
      style={style}
      aria-label={ariaLabel}
      surface={surface}
      badge={cardBadge}
      numberStyle={numberStyle}
      palette={palette}
    >
      {header ? (
        <ChartCardHeader
          aside={
            compared ? (
              <button
                type="button"
                className="lilt-card__action"
                onClick={model.actions.clearComparison}
              >
                Clear
              </button>
            ) : ranges || range ? (
              <ChartCardRange
                label={range}
                options={ranges?.map(({ id, label }) => ({ id, label }))}
                value={activeRange?.id}
                onValueChange={setRangeId}
              />
            ) : null
          }
        >
          {heading || title ? <ChartCardTitle>{heading ?? title}</ChartCardTitle> : null}
          <ChartCardValue
            // Totals, shares and signed changes are different units: a new unit starts fresh
            // rather than counting from one to the other (200 → 118% → 100%).
            key={compared ? 'change' : percent ? 'share' : 'total'}
            value={headline}
            format={compared ? signed : formatValue}
            loading={loading}
            motion={motion}
          >
            {loading ? null : following ? (
              <>
                {targetValue !== null && targetValue !== 0 && headline !== null ? (
                  <ChartCardDelta
                    value={headline / targetValue - 1}
                    tone={deltaTone}
                    format={vsTarget}
                  />
                ) : null}
                <ChartCardCaption>
                  {following.formattedX}
                  {hoveredForecast ? ` · ${forecast?.label ?? 'Forecast'}` : ''}
                  {hoveredDetail ? ` · ${hoveredDetail}` : ''}
                </ChartCardCaption>
              </>
            ) : compared && comparedTotals ? (
              <>
                {!percent && comparedTotals.start !== 0 ? (
                  <ChartCardDelta
                    value={comparedTotals.end / comparedTotals.start - 1}
                    tone={deltaTone}
                  />
                ) : null}
                <ChartCardCaption>
                  {compared.formattedStartX} → {compared.formattedEndX}
                </ChartCardCaption>
              </>
            ) : percent && measured.length ? (
              <ChartCardCaption>
                {resolvedX.format(resolvedX.position(measured.at(-1)!))}
              </ChartCardCaption>
            ) : (delta !== undefined && !nothingMeasured) ||
              targetHits !== null ||
              restCaptionNode ? (
              <>
                {/* A change needs a measured period behind it. */}
                {delta !== undefined && !nothingMeasured ? (
                  <ChartCardDelta value={delta} tone={deltaTone} />
                ) : null}
                {restCaptionNode ? <ChartCardCaption>{restCaptionNode}</ChartCardCaption> : null}
                {targetHits !== null && rowTotals.length ? (
                  <ChartCardCaption>
                    {targetHits} of {rowTotals.length} on target
                  </ChartCardCaption>
                ) : null}
              </>
            ) : null}
          </ChartCardValue>
        </ChartCardHeader>
      ) : null}

      <EmptyShapeContext.Provider
        value={
          shape.kind === 'bar'
            ? 'bars'
            : shape.kind === 'marks'
              ? (shape.emptyShape ?? 'bars')
              : 'wave'
        }
      >
        <Chart
          className={[
            'lilt-card__chart',
            bleed ? 'lilt-card__chart--bleed' : '',
            // A pane below carries the x axis; the headline already names the hovered date.
            shape.kind === 'marks' && shape.xAxis === false ? 'lilt-card__chart--axis-below' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-label={`${ariaLabel} by ${x}`}
          model={model}
          compare={compare !== false}
          live={live}
          motion={motion}
          status={loading ? 'loading' : 'ready'}
          loadingStyle={loadingStyle}
          empty={empty}
        >
          {plotElement}
        </Chart>
      </EmptyShapeContext.Provider>

      {panes
        ? panes({
            data,
            x: xConfig,
            controller: model.getController(),
            margins,
            axisInset: inset,
            slots: shape.kind === 'marks' && Boolean(shape.slots),
            axis,
            loading,
            loadingStyle,
            motion,
            hoverStyle,
            formatValue,
            formatAxis: format.axis,
          })
        : null}

      {tiles && legend !== false ? (
        <ValueLegend
          className="lilt-card__tiles"
          variant={cardLegendVariant(legend)}
          swatch={legendSwatch}
          aria-label={`${ariaLabel} by series`}
          activeId={focusedId ?? inspection?.activeSeriesId ?? null}
          renderValue={
            loading
              ? () => <span className="lilt-card__skeleton lilt-card__skeleton--tile" />
              : undefined
          }
          onHoverIdChange={focus}
          hiddenIds={hiddenIds}
          onHiddenIdsChange={changeHidden}
          items={series.map((item) => {
            const value = hoveredValues
              ? (hoveredValues.get(item.id) ?? null)
              : comparedChanges
                ? (comparedChanges.get(item.id) ?? null)
                : (totals.find((total) => total.id === item.id)?.total ?? null);
            return {
              id: item.id,
              label: item.label,
              color: item.color!,
              value,
              formattedValue:
                value === null
                  ? '—'
                  : comparedChanges
                    ? signedFormat(percent ? changeFormat : formatFor(item.id))(value)
                    : formatFor(item.id)(value),
            };
          })}
        />
      ) : null}
    </ChartCard>
  );
}

const vsTarget = (value: number) =>
  `${value >= 0 ? '+' : '−'}${Math.abs(value * 100).toFixed(1)}% vs target`;

function numberAt<Row>(row: Row, key: string): number | null {
  const value = (row as Record<string, unknown>)[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** The plot position where projections begin: a label's row, or the date or number itself. */
export function forecastPosition<Row>(
  data: readonly Row[],
  x: string,
  resolved: ResolvedX<Row>,
  from: string | number,
): number | null {
  if (resolved.kind === 'category') {
    const index = data.findIndex(
      (row) => String((row as Record<string, unknown>)[x]) === String(from),
    );
    return index < 0 ? null : index;
  }
  const value = Number(from);
  return Number.isFinite(value) ? value : null;
}

function firstAtOrAfter<Row>(data: readonly Row[], resolved: ResolvedX<Row>, start: number) {
  let first = Number.POSITIVE_INFINITY;
  for (const row of data) {
    const position = resolved.position(row);
    if (position >= start && position < first) first = position;
  }
  return Number.isFinite(first) ? first : start;
}
