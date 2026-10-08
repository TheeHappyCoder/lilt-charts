'use client';

import { SkeletonSheen, SKELETON_INK } from '../lifecycle/skeleton-sheen';
import { EmptyShapeContext } from '../lifecycle/chart-empty';
import { SkeletonBlock } from '../lifecycle/skeleton-block';
import { SkeletonExit, useSkeletonExit } from '../lifecycle/skeleton-exit';
import { useSkeletonClock } from '../lifecycle/use-skeleton-clock';
import {
  Fragment,
  useId,
  useMemo,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from 'react';
import { m as animated } from 'motion/react';
import { REVEAL_EASE, useReducedMotion } from '../motion/use-chart-motion';
import { Chart } from '../runtime/chart-runtime';
import { ChartPlot } from '../chart-plot';
import { Area } from '../primitives/area';
import { Bar } from '../primitives/bar';
import { Line } from '../primitives/line';
import { useCartesianChartModel } from '../model/cartesian-model';
import { useChartState } from '../model/use-chart-state';
import { useCardSync } from '../interaction/chart-sync';
import type {
  ChartBarAppearance,
  ChartLoadingStyle,
  ChartEmptyState,
  ChartMotion,
  ChartPalette,
  ChartSeries,
  ChartStyle,
  ChartSurface,
} from '../types';
import {
  ChartCard,
  ChartCardDelta,
  ChartCardHeader,
  ChartCardTitle,
  ChartCardValue,
} from './chart-card';
import { resolveX, type NumericKey, type XKey, type XKind } from './keys';
import { summarize, useCardFormat, valuesOf, type CardAggregate } from './format';
import { CARD_PADDING } from './cartesian-card';
import { DropShadow, shade, tubeLayers } from '../primitives/depth-paint';
import type { AnimatedNumberVariant } from '../motion/animated-number';

export type StatCardChart = 'area' | 'line' | 'bars' | 'meter' | 'ring' | 'none';

export interface StatCardProps<Row, Key extends NumericKey<Row>> {
  /** The metric's name, e.g. "Revenue". Also names the card for screen readers. */
  /** Optional visible title. Use aria-label to name an embedded chart. */
  title?: string;
  /** Show the header, including headline and period controls. Defaults to true. */
  header?: boolean;
  /** Accessible name, independent of the visible title. */
  'aria-label'?: string;
  /** One row per observation. Optional when `headline` is supplied. */
  data?: readonly Row[];
  /** Numeric field to summarize and chart. */
  value?: Key;
  /** Field that names each observation on hover: text, number, or Date. */
  x?: XKey<Row>;
  /** Override x inference. Numbers default to `number`; use `time` for timestamps. */
  xType?: XKind;
  /** Resting value. Defaults to `value` summarized with `aggregate`. */
  headline?: number;
  /**
   * How the resting value summarizes the data: `sum` (default) for counts and money, `mean` or
   * `max` for rates, `last` for levels such as active users.
   */
  aggregate?: CardAggregate;
  /** Fractional change shown as a chip, e.g. 0.082 → +8.2%. */
  delta?: number;
  deltaTone?: 'default' | 'inverse' | 'neutral';
  /** Quiet text beside the delta, e.g. "vs last month". */
  caption?: string;
  /**
   * The small chart: `area` (default), `line`, or `bars` under the value; a `meter` of cells or a
   * `ring` beside the value, both filling toward `target`; or `none`.
   */
  chart?: StatCardChart;
  /** Bar treatment for `chart="bars"`: `solid` (default), `segmented`, `needle`, `gradient`, `outline`, or `isometric`. */
  barStyle?: ChartBarAppearance;
  /**
   * Gives the small chart depth: lines and the ring become lit tubes, the meter a solid bar, and bars default
   * to `isometric`. Values still read from the front faces.
   */
  depth?: boolean;
  /** Goal for `chart="meter"` or `chart="ring"`, in the same unit as the value. */
  target?: number;
  /**
   * Link the small chart's hover with every card that uses the same name, matched by `x`.
   * Requires `x`.
   */
  sync?: string;
  /** Chart height in pixels. Defaults to 56 (also the ring's size), or 10 for a meter. */
  height?: number;
  /** Any CSS color. Defaults to the palette's first color. */
  color?: string;
  /** Right side of the header, e.g. an icon or a menu. */
  aside?: ReactNode;
  valueFormat?: Intl.NumberFormatOptions;
  locale?: string;
  formatValue?: (value: number) => string;
  formatX?: (value: string | number | Date) => string;
  /** `elevated` (default), `outline`, or `ghost` inside your own card. */
  surface?: ChartSurface;
  /** A glass tab tucked behind the card's top edge, e.g. a caption, a command, or actions. */
  badge?: ReactNode;
  /** Headline motion: `count` (default), `pop`, `slide`, `roll`, `flow`, or `scramble`. */
  numberStyle?: AnimatedNumberVariant;
  palette?: ChartPalette;
  loading?: boolean;
  loadingStyle?: ChartLoadingStyle;
  /**
   * What the trend shows when the period has no data: `dots` (default), the chart's own `shape`,
   * your own element, or `null` for nothing. The headline reads a dash either way.
   */
  empty?: ChartEmptyState;
  motion?: ChartMotion;
  className?: string;
  style?: CSSProperties | ChartStyle;
}

const EMPTY: readonly never[] = [];
const METER_CELLS = 28;
const FILL = 'var(--lilt-series-1)';
/** One stroke of a band drawn in layers. */
interface Layer {
  width: number;
  transform: string;
  stroke: string;
}
/** Grooves are shaded from the track's color, so it needs an opaque color rather than a tint. */
const SOLID_TRACK = 'color-mix(in oklab, var(--lilt-muted) 16%, var(--lilt-surface))';

/** Cells of a meter: whole cells up to the value, then one cell trimmed to the exact remainder. */
export function meterCells(ratio: number, count = METER_CELLS): number[] {
  const filled = Math.max(0, Math.min(1, ratio)) * count;
  return Array.from({ length: count }, (_, index) => Math.max(0, Math.min(1, filled - index)));
}

function Meter({
  value,
  target,
  height,
  depth = false,
  formatValue,
}: {
  value: number | null;
  target: number;
  height: number;
  depth?: boolean;
  formatValue: (value: number) => string;
}) {
  const ratio = value === null || target <= 0 ? 0 : value / target;
  const percent = new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 0 });
  const label = `${value === null ? 'No data' : percent.format(ratio)} of ${formatValue(target)}`;
  return (
    <div className="lilt-stat__meter">
      {depth ? (
        // One solid bar: the fill is painted onto a full-length track, so only the track's far
        // end shows a side until the goal is reached.
        <div
          className="lilt-stat__block"
          role="meter"
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={target}
          aria-valuenow={value ?? 0}
          style={{ height }}
        >
          {ratio > 0 ? (
            <span
              className="lilt-stat__block-fill"
              data-full={ratio >= 1 || undefined}
              style={{ width: `${Math.min(1, ratio) * 100}%` }}
            />
          ) : null}
        </div>
      ) : (
        <div
          className="lilt-stat__cells"
          role="meter"
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={target}
          aria-valuenow={value ?? 0}
          style={{ height }}
        >
          {meterCells(ratio).map((fill, index) => (
            <span key={index} className="lilt-stat__cell">
              {fill > 0 ? (
                <span className="lilt-stat__cell-fill" style={{ width: `${fill * 100}%` }} />
              ) : null}
            </span>
          ))}
        </div>
      )}
      <div className="lilt-stat__meter-labels" aria-hidden="true">
        <span>{value === null ? '—' : `${percent.format(ratio)} of target`}</span>
        <span>{formatValue(target)}</span>
      </div>
    </div>
  );
}

/** A progress ring toward a target. Past the target it stays full and the label says so. */
function Ring({
  value,
  target,
  size,
  reduced,
  loading = false,
  loadingStyle = 'shimmer',
  skeletonLeaving = false,
  depth = false,
  formatValue,
}: {
  value: number | null;
  target: number;
  size: number;
  reduced: boolean;
  loading?: boolean;
  loadingStyle?: ChartLoadingStyle;
  skeletonLeaving?: boolean;
  depth?: boolean;
  formatValue: (value: number) => string;
}) {
  const ratio = value === null || target <= 0 ? null : Math.max(0, value / target);
  const stroke = Math.max(4, Math.round(size / 9));
  const radius = (size - stroke) / 2;
  const percent = new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 0 });
  const depthId = `lilt-stat-ring-${useId().replace(/:/g, '')}`;
  const trackShape = (layer?: Layer, skeleton = false) => (
    <circle
      className="lilt-stat__ring-track"
      data-loading={skeleton || undefined}
      cx={size / 2}
      cy={size / 2}
      r={radius}
      strokeWidth={layer?.width ?? stroke}
      transform={layer?.transform}
      style={layer ? { stroke: layer.stroke } : undefined}
    />
  );
  const fillShape = (layer?: Layer) => (
    <animated.circle
      className="lilt-stat__ring-fill"
      cx={size / 2}
      cy={size / 2}
      r={radius}
      strokeWidth={layer?.width ?? stroke}
      transform={`${layer?.transform ?? ''} rotate(-90 ${size / 2} ${size / 2})`.trim()}
      style={layer ? { stroke: layer.stroke } : undefined}
      initial={reduced ? false : { pathLength: 0, filter: 'blur(3px)' }}
      animate={{ pathLength: Math.min(1, ratio ?? 0), filter: 'blur(0px)' }}
      transition={
        reduced
          ? { duration: 0 }
          : {
              pathLength: { type: 'spring', duration: 0.85, bounce: 0.18 },
              filter: { duration: 0.45, ease: REVEAL_EASE },
            }
      }
    />
  );
  return (
    <div
      className="lilt-stat__ring"
      role="meter"
      aria-label={`${ratio === null ? 'No data' : percent.format(ratio)} of ${formatValue(target)}`}
      aria-valuemin={0}
      aria-valuemax={target}
      aria-valuenow={value ?? 0}
      style={{ width: size, height: size }}
    >
      <svg aria-hidden="true" viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
        {/* The track's skeleton freezes and sinks into the middle before the fill sweeps in. */}
        <SkeletonExit leaving={skeletonLeaving} origin="center">
          <g>
            {loading ? (
              <SkeletonSheen
                width={size}
                height={size}
                reduced={reduced}
                loadingStyle={loadingStyle}
                depth={depth}
                mask={trackShape(undefined, true)}
                sweep={
                  <circle
                    className="lilt-skeleton__sweep"
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="white"
                    strokeWidth={stroke + 8}
                    pathLength={1}
                    strokeDasharray="1"
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                  />
                }
              >
                {depth
                  ? tubeLayers(stroke).map((layer, index) => (
                      <Fragment key={index}>
                        {trackShape(
                          {
                            width: layer.strokeWidth,
                            transform: layer.transform,
                            stroke: shade(SKELETON_INK, layer.amount),
                          },
                          true,
                        )}
                      </Fragment>
                    ))
                  : trackShape(undefined, true)}
              </SkeletonSheen>
            ) : depth ? (
              // The track is a groove cut into the card; the fill is a lit tube lifted off it.
              <>
                <defs>
                  <DropShadow id={`${depthId}-shadow`} size={2.5} />
                </defs>
                {tubeLayers(stroke, 'groove').map((layer, index) => (
                  <Fragment key={`track-${index}`}>
                    {trackShape({
                      width: layer.strokeWidth,
                      transform: layer.transform,
                      stroke: shade(SOLID_TRACK, layer.amount),
                    })}
                  </Fragment>
                ))}
                {ratio ? (
                  <g filter={`url(#${depthId}-shadow)`}>
                    {tubeLayers(stroke).map((layer, index) => (
                      <Fragment key={`fill-${index}`}>
                        {fillShape({
                          width: layer.strokeWidth,
                          transform: layer.transform,
                          stroke: shade(FILL, layer.amount),
                        })}
                      </Fragment>
                    ))}
                  </g>
                ) : null}
              </>
            ) : (
              <>
                {trackShape()}
                {ratio ? fillShape() : null}
              </>
            )}
          </g>
        </SkeletonExit>
      </svg>
      <span className="lilt-stat__ring-label">{ratio === null ? '—' : percent.format(ratio)}</span>
    </div>
  );
}

/**
 * A compact metric tile: name, value, change, and a small chart. Hovering the chart swaps the
 * value for that observation. Designed to sit four across in a dashboard row.
 */
const acceptedRevision = (state: { acceptedRevision: number }) => state.acceptedRevision;

export function StatCard<Row, const Key extends NumericKey<Row>>({
  title,
  header = true,
  'aria-label': ariaLabel = title || 'Stat',
  data = EMPTY as readonly Row[],
  value: valueKey,
  x,
  xType,
  headline: suppliedHeadline,
  aggregate = 'sum',
  delta,
  deltaTone,
  caption,
  chart = 'area',
  depth = false,
  barStyle = depth ? 'isometric' : 'solid',
  target,
  sync,
  height,
  color,
  aside,
  valueFormat,
  locale,
  formatValue: suppliedFormatValue,
  formatX,
  surface = 'elevated',
  badge,
  numberStyle,
  palette,
  loading = false,
  motion,
  loadingStyle = 'shimmer',
  empty,
  className,
  style,
}: StatCardProps<Row, Key>): ReactElement {
  const format = useCardFormat({ valueFormat, locale, formatValue: suppliedFormatValue });
  const key = (valueKey ?? '') as string;
  const bars = chart === 'bars';
  const plotted = (chart === 'area' || chart === 'line' || bars) && Boolean(valueKey);

  const rows = plotted ? data : (EMPTY as readonly Row[]);
  const resolvedX = useMemo(
    () => {
      if (x) return resolveX(rows, x, xType, formatX);
      // Without an x field, observations are evenly spaced in input order and unnamed.
      const index = new Map(rows.map((row, position) => [row, position]));
      return {
        kind: 'number' as const,
        position: (row: Row) => index.get(row) ?? 0,
        format: () => '',
      };
    },
    // formatX is usually inline; the rendered labels only depend on the data and key.
    [rows, x, xType],
  );
  const xConfig = useMemo(
    () => ({
      type: resolvedX.kind === 'time' ? ('time' as const) : ('number' as const),
      accessor: resolvedX.position,
      format: resolvedX.format,
    }),
    [resolvedX],
  );
  const series = useMemo(
    (): (ChartSeries<Row> & { id: string })[] => [
      {
        id: key || 'value',
        label: ariaLabel,
        // The card sets --lilt-series-1 from `color`, so the plot and meter share it.
        color: 'var(--lilt-series-1)',
        accessor: (row) => {
          const cell = (row as Record<string, unknown>)[key];
          return typeof cell === 'number' ? cell : null;
        },
        curve: 'monotone',
        line: { width: chart === 'line' ? 2 : 1.75, depth },
        ...(chart === 'area' ? { area: { treatment: 'fade' as const } } : {}),
        ...(bars ? { bar: { appearance: barStyle, radius: 2 } } : {}),
        formatValue: format.stable.value,
      },
    ],
    [key, ariaLabel, chart, bars, barStyle, depth, format.stable],
  );
  // Bars read as lengths from zero; lines fit their data so small changes stay visible.
  const yConfig = useMemo(() => ({ includeZero: bars, ticks: 3 }), [bars]);
  const model = useCartesianChartModel({
    data: rows,
    x: xConfig,
    y: yConfig,
    series,
    status: loading ? 'loading' : 'ready',
  });
  const inspection = useChartState(model, (state) => state.inspection);
  useCardSync(x ? sync : undefined, model.getController(), rows, x ?? '', resolvedX, {
    label: ariaLabel,
    release: model.actions.release,
  });
  // A new `value` reaches the model in an effect after this render; until then, draw nothing
  // rather than a mark the model cannot look up.
  useChartState(model, acceptedRevision);
  const markSeries = model.series.some((item) => item.id === series[0]!.id) ? series[0]!.id : null;

  const resting = suppliedHeadline ?? (valueKey ? summarize(valuesOf(data, key), aggregate) : null);
  const hovered = plotted && inspection ? (inspection.series[0]?.value ?? null) : undefined;
  const shown = hovered === undefined ? resting : hovered;
  const chartHeight = height ?? (chart === 'meter' ? (depth ? 12 : 10) : bars ? 44 : 56);
  const runoff = !bars;
  const reduced = useReducedMotion(motion ?? 'auto');
  const skeletonLeaving = useSkeletonExit(loading, reduced);
  const skeletonRef = useSkeletonClock<HTMLDivElement>(loading, loadingStyle);
  const ring = chart === 'ring' && target !== undefined;
  const ringCaption = ring ? `Target ${format.value(target)}` : undefined;

  const ringVisual = ring ? (
    <Ring
      loading={loading}
      loadingStyle={loadingStyle}
      skeletonLeaving={skeletonLeaving}
      value={loading ? null : resting}
      target={target}
      size={height ?? 56}
      reduced={reduced}
      depth={depth}
      formatValue={format.value}
    />
  ) : null;

  return (
    <ChartCard
      motion={motion}
      className={['lilt-stat', className].filter(Boolean).join(' ')}
      style={color ? ({ ...style, '--lilt-series-1': color } as ChartStyle) : style}
      aria-label={ariaLabel}
      surface={surface}
      badge={badge}
      numberStyle={numberStyle}
      palette={palette}
    >
      {header ? (
        <ChartCardHeader
          aside={
            ring ? (
              <>
                {aside}
                {ringVisual}
              </>
            ) : (
              aside
            )
          }
        >
          {title ? <ChartCardTitle>{title}</ChartCardTitle> : null}
          <ChartCardValue value={shown} format={format.value} loading={loading} motion={motion}>
            {/* A change needs a measured value behind it. */}
            {loading || hovered !== undefined || delta === undefined || shown === null ? null : (
              <ChartCardDelta value={delta} tone={deltaTone} />
            )}
          </ChartCardValue>
          {/* One steady line under the value: the caption at rest, the hovered point's name. */}
          {caption || x || ringCaption ? (
            <p className="lilt-stat__caption">
              {loading
                ? ''
                : hovered !== undefined
                  ? (inspection?.formattedX ?? '')
                  : (caption ?? ringCaption ?? '')}
            </p>
          ) : null}
        </ChartCardHeader>
      ) : null}

      {!header ? ringVisual : null}

      {chart === 'meter' && target !== undefined ? (
        // The meter's skeleton freezes and sinks toward the edge it fills from.
        <SkeletonExit leaving={skeletonLeaving} origin="left">
          {loading ? (
            <div
              ref={skeletonRef}
              className="lilt-stat__meter lilt-skeleton"
              aria-hidden="true"
              data-style={loadingStyle}
              data-depth={depth || undefined}
              data-reduced-motion={reduced || undefined}
            >
              <SkeletonBlock height={chartHeight} />
              <div className="lilt-stat__meter-labels">
                <span>—</span>
                <span>—</span>
              </div>
            </div>
          ) : (
            <Meter
              value={resting}
              target={target}
              height={chartHeight}
              depth={depth}
              formatValue={format.value}
            />
          )}
        </SkeletonExit>
      ) : plotted ? (
        <EmptyShapeContext.Provider value={bars ? 'bars' : 'wave'}>
          <Chart
            className={
              runoff
                ? 'lilt-card__chart lilt-card__chart--bleed lilt-stat__chart'
                : 'lilt-card__chart lilt-stat__chart'
            }
            aria-label={`${ariaLabel} trend`}
            model={model}
            motion={motion}
            status={loading ? 'loading' : 'ready'}
            loadingStyle={loadingStyle}
            empty={empty}
          >
            <ChartPlot
              model={model}
              height={chartHeight}
              margins={{ top: 4, right: 0, bottom: 2, left: 0 }}
              compact
              axis="minimal"
              {...(bars
                ? { layout: 'bars' as const, bars: { gap: 2 } }
                : { runoff: true, axisInset: CARD_PADDING })}
            >
              {chart === 'area' && markSeries ? <Area model={model} series={markSeries} /> : null}
              {!markSeries ? null : bars ? (
                <Bar model={model} series={markSeries} />
              ) : (
                <Line model={model} series={markSeries} />
              )}
            </ChartPlot>
          </Chart>
        </EmptyShapeContext.Provider>
      ) : null}
    </ChartCard>
  );
}
