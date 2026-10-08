'use client';

import { extent } from 'd3-array';
import { SkeletonExit, useSkeletonExit } from '../lifecycle/skeleton-exit';
import { SkeletonSheen, SKELETON_INK } from '../lifecycle/skeleton-sheen';
import { scaleLinear } from 'd3-scale';
import {
  useCallback,
  useId,
  useMemo,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import { hitTestScatter, type PositionedScatterPoint } from '../engine/scatter';
import { ValueLegend, cardLegendVariant } from '../interaction/value-legend';
import { EmptySlot } from '../lifecycle/chart-empty';
import { useReducedMotion } from '../motion/use-chart-motion';
import type {
  ChartLoadingStyle,
  ChartEmptyState,
  ChartMotion,
  ChartPalette,
  ChartStyle,
  ChartSurface,
  CardLegend,
  ChartLegendSwatch,
} from '../types';
import { useChartWidth } from '../use-chart-width';
import { useTouchGlide } from '../interaction/use-touch-glide';
import { useAcceptedRows } from '../interaction/use-category-state';
import { DropShadow, SphereGradient } from '../primitives/depth-paint';
import {
  ChartCard,
  ChartCardCaption,
  ChartCardDelta,
  ChartCardHeader,
  ChartCardRange,
  ChartCardTitle,
  ChartCardValue,
} from './chart-card';
import type { CardRange } from './cartesian-card';
import { numberFormatters, summarize, useCardFormat } from './format';
import type { NumericKey, TextKey } from './keys';
import type { AnimatedNumberVariant } from '../motion/animated-number';
import { useDeparting } from '../motion/use-departing';

/** How the resting headline sums up every plotted point's `y`. */
export type ScatterAggregate = 'sum' | 'mean' | 'max';

export interface ScatterChartCardProps<Row, Key extends NumericKey<Row>> {
  /** Optional visible title. Use aria-label to name an embedded chart. */
  title?: string;
  /** Show the header, including headline and period controls. Defaults to true. */
  header?: boolean;
  /** Accessible name, independent of the visible title. */
  'aria-label'?: string;
  /** One row per point. Omit when `ranges` supplies the data. */
  data?: readonly Row[];
  /** Numeric field for the horizontal position. */
  x: NumericKey<Row>;
  /** Numeric field for the vertical position. It also drives the headline. */
  y: Key;
  /** Numeric field that sizes each point by area, turning dots into bubbles. */
  size?: NumericKey<Row>;
  /** Names the size measure in readouts, e.g. "Reach". */
  sizeLabel?: string;
  /** Text field that colors points by group and adds a legend. */
  group?: TextKey<Row>;
  /** Text field that names a point when it is hovered or focused. */
  label?: TextKey<Row>;
  /** Axis titles, e.g. "Spend" and "Sign-ups". */
  xLabel?: string;
  yLabel?: string;
  /** A least-squares line through the points, with its r² in the footer. */
  trend?: boolean;
  /** Connect successive observations in each group. Missing coordinates break the trail. */
  trails?: boolean;
  /** Numeric time/order field for trails. Defaults to the supplied row order. */
  trailOrder?: NumericKey<Row>;
  /** Draws each point as a lit sphere with a soft contact shadow; centers and sizes stay exact. */
  depth?: boolean;
  /** Plot height in pixels, including the axes. Defaults to 260. */
  height?: number;
  /** How the resting headline sums up `y`: `sum` (default), `mean`, or `max`. */
  aggregate?: ScatterAggregate;
  /** Resting headline. Defaults to the `aggregate` of every plotted `y`. */
  headline?: number;
  /** Fractional change shown as a chip, e.g. 0.052 → +5.2%. */
  delta?: number;
  deltaTone?: 'default' | 'inverse' | 'neutral';
  /** Static period label, e.g. "Last 30 days". */
  range?: string;
  /** Period select. Each range replaces data, delta, and headline; points glide to their place. */
  ranges?: readonly CardRange<Row>[];
  defaultRange?: string;
  /**
   * How the legend lays out: value `tiles` (default), compact `inline` labels, `list` rows, tinted
   * `pills`, or `bars` that also draw each value against the largest.
   * False removes the legend without changing the data or marks.
   */
  legend?: CardLegend | false;
  /** The mark beside each legend label: `square` (default), `dot`, or `line`. */
  legendSwatch?: ChartLegendSwatch;
  /** Number format for `y`: the headline, legend, and y axis. */
  valueFormat?: Intl.NumberFormatOptions;
  /** Number format for `x`, e.g. `{ style: 'currency', currency: 'USD' }`. */
  xFormat?: Intl.NumberFormatOptions;
  locale?: string;
  formatValue?: (value: number) => string;
  formatX?: (value: number) => string;
  /** Any CSS color for the points when there is no `group`. */
  color?: string;
  surface?: ChartSurface;
  /** A glass tab tucked behind the card's top edge, e.g. a caption, a command, or actions. */
  badge?: ReactNode;
  /** Headline motion: `count` (default), `pop`, `slide`, `roll`, `flow`, or `scramble`. */
  numberStyle?: AnimatedNumberVariant;
  palette?: ChartPalette;
  loading?: boolean;
  loadingStyle?: ChartLoadingStyle;
  /**
   * What the card shows when the period has no data: `dots` (default), the chart's own `shape`,
   * your own element such as `<ChartEmpty>No visits yet</ChartEmpty>`, or `null` for nothing.
   */
  empty?: ChartEmptyState;
  /** `none` turns off decorative motion; reduced-motion users get this automatically. */
  motion?: ChartMotion;
  className?: string;
  style?: CSSProperties | ChartStyle;
}

interface CardPoint<Row> extends PositionedScatterPoint<Row> {
  /** Plotted points always have both coordinates. */
  x: number;
  y: number;
  group: string | null;
  color: string;
  /** Position in left-to-right order, used for keyboard stepping and the entrance. */
  order: number;
}

const EMPTY: readonly never[] = [];
/** Keep input identity and never bridge an unknown reading or an ambiguous duplicate time. */
export function scatterTrails<
  T extends {
    id: string;
    group: string | null;
    x: number | null;
    y: number | null;
    order: number | null;
  },
>(rows: readonly T[]) {
  type Known = T & { x: number; y: number };
  const segments: [Known, Known][] = [];
  for (const group of new Set(rows.map((r) => r.group))) {
    const ordered = rows.filter((r) => r.group === group);
    if (
      ordered.some((r) => r.order === null) ||
      new Set(ordered.map((r) => r.order)).size !== ordered.length
    )
      continue;
    ordered.sort((a, b) => a.order! - b.order!);
    for (let i = 1; i < ordered.length; i++) {
      const a = ordered[i - 1]!,
        b = ordered[i]!;
      if (a.x !== null && a.y !== null && b.x !== null && b.y !== null)
        segments.push([a as Known, b as Known]);
    }
  }
  return segments;
}
const DEFAULT_HEIGHT = 260;
const Y_TICKS = 4;
const DOT_RADIUS = 4.5;
const MIN_BUBBLE = 3;
/** Placeholder points while the first data loads, as fractions of the plot. */
const SKELETON = [
  [0.08, 0.72, 6],
  [0.16, 0.58, 9],
  [0.24, 0.66, 5],
  [0.31, 0.44, 11],
  [0.39, 0.52, 7],
  [0.47, 0.36, 13],
  [0.55, 0.42, 6],
  [0.62, 0.28, 10],
  [0.7, 0.34, 8],
  [0.78, 0.2, 12],
  [0.86, 0.26, 6],
  [0.93, 0.14, 9],
] as const;

/**
 * A readable domain for one axis: rounded to the same ticks the axis draws, anchored at zero when
 * the data starts near it, and never zero-width.
 */
export function scatterDomain(values: readonly number[], ticks = 5): [number, number] {
  if (!values.length) return [0, 1];
  let [low, high] = extent(values) as [number, number];
  if (low >= 0 && low <= high * 0.25) low = 0;
  if (low === high) {
    const pad = Math.abs(low) || 1;
    low -= pad;
    high += pad;
  }
  const [niceLow, niceHigh] = scaleLinear().domain([low, high]).nice(ticks).domain();
  return [niceLow!, niceHigh!];
}

/** Least-squares fit. `null` when fewer than three points or every x is the same. */
export function scatterTrend(
  points: readonly { x: number; y: number }[],
): { slope: number; intercept: number; r2: number } | null {
  if (points.length < 3) return null;
  const n = points.length;
  const meanX = points.reduce((sum, point) => sum + point.x, 0) / n;
  const meanY = points.reduce((sum, point) => sum + point.y, 0) / n;
  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  for (const { x, y } of points) {
    sxx += (x - meanX) ** 2;
    sxy += (x - meanX) * (y - meanY);
    syy += (y - meanY) ** 2;
  }
  if (sxx === 0) return null;
  const slope = sxy / sxx;
  return {
    slope,
    intercept: meanY - slope * meanX,
    r2: syy === 0 ? 1 : (sxy * sxy) / (sxx * syy),
  };
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;
const read = (row: unknown, key: string | undefined) =>
  key === undefined ? undefined : (row as Record<string, unknown>)[key];
const number = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

/**
 * The part of the line `y = slope·x + intercept` between `x0` and `x1` that stays inside the y
 * domain, or `null` when it never enters it.
 */
export function clipTrend(
  fit: { slope: number; intercept: number },
  [x0, x1]: readonly [number, number],
  [low, high]: readonly [number, number],
): [number, number, number, number] | null {
  const at = (value: number) => fit.slope * value + fit.intercept;
  let start = x0;
  let end = x1;
  if (fit.slope !== 0) {
    const xAtLow = (low - fit.intercept) / fit.slope;
    const xAtHigh = (high - fit.intercept) / fit.slope;
    start = Math.max(start, Math.min(xAtLow, xAtHigh));
    end = Math.min(end, Math.max(xAtLow, xAtHigh));
  } else if (fit.intercept < low || fit.intercept > high) return null;
  if (start >= end) return null;
  return [start, at(start), end, at(end)];
}

/**
 * A scatter card: one point per row, placed by two measurements and optionally sized by a third
 * and colored by group. Hovering or stepping through points with the arrow keys reads each one in
 * the headline, with its position marked on both axes.
 */
export function ScatterChartCard<Row, const Key extends NumericKey<Row>>({
  title,
  header = true,
  'aria-label': ariaLabel = title || 'Scatter chart',
  data: suppliedData,
  x,
  y,
  size,
  sizeLabel,
  group,
  label,
  xLabel,
  yLabel,
  trend = false,
  trails = false,
  trailOrder,
  depth = false,
  height = DEFAULT_HEIGHT,
  aggregate = 'sum',
  headline: suppliedHeadline,
  delta: suppliedDelta,
  deltaTone,
  range,
  ranges,
  defaultRange,
  valueFormat,
  legend = 'tiles',
  legendSwatch,
  xFormat,
  locale = 'en-US',
  formatValue: suppliedFormatValue,
  formatX: suppliedFormatX,
  color,
  surface = 'elevated',
  badge,
  numberStyle,
  palette,
  loading: pending = false,
  loadingStyle = 'shimmer',
  empty: emptyState = 'dots',
  motion: motionMode = 'auto',
  className,
  style,
}: ScatterChartCardProps<Row, Key>): ReactElement {
  const reduced = useReducedMotion(motionMode);
  const format = useCardFormat({ valueFormat, locale, formatValue: suppliedFormatValue });
  const xFormatKey = JSON.stringify(xFormat ?? null);
  const xFormats = useMemo(
    () => numberFormatters(locale, xFormat),
    // xFormat is usually an inline object; its serialized form is the real dependency.
    [locale, xFormatKey],
  );
  const formatX = suppliedFormatX ?? xFormats.full;
  const [rangeId, setRangeId] = useState(defaultRange ?? ranges?.[0]?.id);
  const activeRange = ranges?.find((item) => item.id === rangeId) ?? ranges?.[0];
  const incoming = activeRange?.data ?? suppliedData ?? (EMPTY as readonly Row[]);
  const accepted = useAcceptedRows(
    pending ? null : incoming,
    pending ? 'loading' : 'ready',
    activeRange?.id,
  );
  const data = accepted.rows ?? incoming;
  const loading = pending && accepted.rows === null;
  // Refresh keeps accepted observations; only a cold load needs the skeleton handover.
  const skeletonLeaving = useSkeletonExit(loading, reduced);
  const skeletonShown = loading || skeletonLeaving;
  const delta = activeRange ? activeRange.delta : suppliedDelta;
  const { ref, width: measured } = useChartWidth<HTMLDivElement>();
  const width = measured || 480;

  // Plain readings first; geometry depends on the measured width.
  const readings = useMemo(() => {
    const groups: string[] = [];
    const names = data.map((row) => {
      const text = read(row, label);
      return typeof text === 'string' && text ? text : null;
    });
    // A unique label keeps a point's identity across periods, so it glides to its new place.
    const unique = (name: string | null) =>
      name !== null && names.indexOf(name) === names.lastIndexOf(name);
    const rows = data.map((row, index) => {
      const name = group === undefined ? null : String(read(row, group) ?? '');
      if (name !== null && !groups.includes(name)) groups.push(name);
      const text = names[index]!;
      return {
        id: unique(text) ? text! : `${text ?? ''}\u0000${index}`,
        label: text ?? `Point ${index + 1}`,
        row,
        x: number(read(row, x)),
        y: number(read(row, y)),
        size: size === undefined ? 1 : number(read(row, size)),
        group: name,
      };
    });
    return { rows, groups };
  }, [data, x, y, size, group, label]);

  const plotted = readings.rows.filter(
    (row): row is typeof row & { x: number; y: number } => row.x !== null && row.y !== null,
  );
  const unplotted = readings.rows.length - plotted.length;
  // Groups hidden from the legend leave the plot, headline, and trend; the axes keep their
  // scale so the remaining points stay where they were.
  const [hiddenGroups, setHiddenGroups] = useState<string[]>([]);
  const shown = plotted.filter((row) => row.group === null || !hiddenGroups.includes(row.group));
  const colorOf = (name: string | null) =>
    name === null
      ? 'var(--lilt-scatter-card-color, var(--lilt-series-1))'
      : `var(--lilt-series-${(readings.groups.indexOf(name) % 6) + 1})`;

  // Geometry: rounded domains, a y-label gutter, and room for the largest bubble.
  const xTickCount = width < 420 ? 3 : 5;
  const xDomain = scatterDomain(
    plotted.map((row) => row.x),
    xTickCount,
  );
  const yDomain = scatterDomain(
    plotted.map((row) => row.y),
    Y_TICKS,
  );
  const yTicks = scaleLinear().domain(yDomain).ticks(Y_TICKS);
  const xTicks = scaleLinear().domain(xDomain).ticks(xTickCount);
  const maxBubble = Math.max(8, Math.min(16, width / 36));
  const gutter = Math.max(24, ...yTicks.map((tick) => format.axis(tick).length * 6.6 + 10));
  const inset = size === undefined ? DOT_RADIUS + 2 : maxBubble;
  const top = (yLabel ? 26 : 10) + inset;
  const bottom = height - 26 - (xLabel ? 16 : 0) - inset;
  const left = gutter + inset;
  const right = width - inset - 2;
  const xScale = scaleLinear().domain(xDomain).range([left, right]);
  const yScale = scaleLinear().domain(yDomain).range([bottom, top]);
  const largest = Math.max(1, ...plotted.map((row) => row.size ?? 0));
  const radiusOf = (value: number | null) =>
    size === undefined
      ? DOT_RADIUS
      : MIN_BUBBLE + (maxBubble - MIN_BUBBLE) * Math.sqrt(Math.max(0, value ?? 0) / largest);

  const points: CardPoint<Row>[] = [...shown]
    .sort((a, b) => a.x - b.x || a.y - b.y)
    .map((row, order) => ({
      ...row,
      cx: xScale(row.x),
      cy: yScale(row.y),
      radius: radiusOf(row.size),
      color: colorOf(row.group),
      order,
    }));
  // Points that left with a period change shrink away where they were instead of vanishing.
  const departing = useDeparting(points, (point) => point.id, 420);
  const fit = trend ? scatterTrend(shown) : null;
  const fitLine =
    fit && points.length ? clipTrend(fit, [points[0]!.x, points.at(-1)!.x], yDomain) : null;
  const sizeFormat = xFormats.plain;

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [keyboardId, setKeyboardId] = useState<string | null>(null);
  const [hoveredGroup, setHoveredGroup] = useState<string | null>(null);
  const [pinnedGroup, setPinnedGroup] = useState<string | null>(null);
  const byId = (id: string | null) => points.find((point) => point.id === id);
  const sphereId = `lilt-scatter-${useId().replace(/:/g, '')}`;
  const sphereColors = [...new Set(points.map((point) => point.color))];
  const trailSegments = trails
    ? scatterTrails(
        readings.rows.map((p, i) => ({
          ...p,
          order: trailOrder ? number(read(p.row, trailOrder)) : i,
        })),
      )
    : [];
  const active = byId(pinnedId) ?? byId(keyboardId) ?? byId(hoveredId);
  const activeGroup = active ? null : (pinnedGroup ?? hoveredGroup);

  const groupValues = readings.groups.map((name) => ({
    name,
    value: summarize(
      plotted.filter((row) => row.group === name).map((row) => row.y),
      aggregate,
    ),
  }));
  const restingHeadline =
    activeRange?.headline ??
    suppliedHeadline ??
    summarize(
      shown.map((row) => row.y),
      aggregate,
    );
  const headlineValue = active
    ? active.y
    : activeGroup !== null
      ? (groupValues.find((entry) => entry.name === activeGroup)?.value ?? null)
      : restingHeadline;
  const xText = (value: number) => (xLabel ? `${xLabel} ${formatX(value)}` : formatX(value));
  const describe = (point: CardPoint<Row>) =>
    `${point.label}: ${xText(point.x)}, ${yLabel ? `${yLabel} ` : ''}${format.value(point.y)}${
      size === undefined || point.size === null
        ? ''
        : `, ${sizeLabel ?? 'size'} ${sizeFormat(point.size)}`
    }`;

  const pointAt = (clientX: number, clientY: number, plot: Element) => {
    const box = plot.getBoundingClientRect();
    return hitTestScatter(points, clientX - box.left, clientY - box.top, pinnedId);
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    // Touch reads the point through the glide below, which also stops the page scrolling.
    if (event.pointerType === 'touch') return;
    setHoveredId(pointAt(event.clientX, event.clientY, event.currentTarget));
  };
  const glideRef = useTouchGlide<string>({
    resolve: pointAt,
    onGlide: setHoveredId,
    onLift: (id) => id !== null && setPinnedId(id),
    pinned: pinnedId !== null || pinnedGroup !== null,
    onRelease: () => {
      setPinnedId(null);
      setPinnedGroup(null);
    },
    // A finger never hovers first, so a tap reads the point under it directly.
    onTap: (id) => setPinnedId((pinned) => (id && pinned !== id ? id : null)),
    disabled: loading,
  });
  const plotRef = useCallback(
    (node: HTMLDivElement | null) => {
      ref.current = node;
      glideRef(node);
    },
    [glideRef, ref],
  );
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!points.length) return;
    const current = byId(keyboardId) ?? byId(pinnedId);
    const index = current ? current.order : -1;
    let next: number | null = null;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = index + 1;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp')
      next = index < 0 ? points.length - 1 : index - 1;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = points.length - 1;
    else if ((event.key === 'Enter' || event.key === ' ') && current) {
      event.preventDefault();
      setPinnedId((pinned) => (pinned === current.id ? null : current.id));
      return;
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setPinnedId(null);
      setKeyboardId(null);
      return;
    } else return;
    event.preventDefault();
    setKeyboardId(points[Math.max(0, Math.min(points.length - 1, next))]!.id);
  };

  const empty = !loading && readings.rows.length === 0;
  const allMissing = !loading && readings.rows.length > 0 && plotted.length === 0;
  // Tick labels give way to the pills that mark the active point on each axis.
  const xPillNear = (tick: number) => active && Math.abs(xScale(tick) - active.cx) < 40;
  const yPillNear = (tick: number) => active && Math.abs(yScale(tick) - active.cy) < 16;

  return (
    <ChartCard
      motion={motionMode}
      className={['lilt-scatter-card', className].filter(Boolean).join(' ')}
      style={
        {
          ...style,
          ...(color ? { '--lilt-scatter-card-color': color } : {}),
        } as ChartStyle
      }
      aria-label={ariaLabel}
      aria-busy={pending || skeletonLeaving}
      surface={surface}
      badge={badge}
      numberStyle={numberStyle}
      palette={palette}
    >
      {header ? (
        <ChartCardHeader
          aside={
            ranges || range ? (
              <ChartCardRange
                label={range}
                options={ranges?.map(({ id, label: text }) => ({ id, label: text }))}
                value={activeRange?.id}
                onValueChange={setRangeId}
              />
            ) : null
          }
        >
          {title ? <ChartCardTitle>{title}</ChartCardTitle> : null}
          <ChartCardValue
            value={loading ? null : headlineValue}
            format={format.value}
            loading={loading}
            motion={motionMode}
          >
            {loading ? null : active ? (
              <ChartCardCaption>
                {active.label} · {xText(active.x)}
              </ChartCardCaption>
            ) : activeGroup !== null ? (
              <ChartCardCaption>{activeGroup}</ChartCardCaption>
            ) : delta !== undefined ? (
              <ChartCardDelta value={delta} tone={deltaTone} />
            ) : null}
          </ChartCardValue>
        </ChartCardHeader>
      ) : null}

      {pending && !loading ? (
        <span className="lilt-scatter-card__footer" role="status">
          Updating…
        </span>
      ) : null}
      {empty || allMissing ? (
        <EmptySlot
          block
          state={emptyState}
          shape="points"
          message={empty ? undefined : 'No point has both values, so none can be placed'}
        />
      ) : (
        <>
          <div
            ref={plotRef}
            className="lilt-scatter-card__plot"
            data-lilt-glide=""
            style={{ height }}
            data-lilt-pill="soft"
            data-loading={skeletonShown || undefined}
            data-motion={reduced ? 'none' : undefined}
            data-active={active ? '' : undefined}
            tabIndex={skeletonShown ? undefined : 0}
            role="group"
            aria-label={`${ariaLabel}: ${plural(points.length, 'point', 'points')}. Arrow keys step through them in order of ${xLabel ?? 'x'}; Enter pins one.`}
            onPointerMove={skeletonShown ? undefined : onPointerMove}
            onPointerLeave={() => setHoveredId(null)}
            onClick={() =>
              setPinnedId((pinned) => (hoveredId && pinned !== hoveredId ? hoveredId : null))
            }
            onKeyDown={skeletonShown ? undefined : onKeyDown}
            onBlur={() => setKeyboardId(null)}
          >
            <svg
              aria-hidden="true"
              className="lilt-scatter-card__svg"
              data-depth={depth || undefined}
              width={width}
              height={height}
              viewBox={`0 0 ${width} ${height}`}
            >
              <g className="lilt-scatter-card__grid">
                {yTicks.map((tick) => (
                  <line key={tick} x1={gutter} x2={width} y1={yScale(tick)} y2={yScale(tick)} />
                ))}
              </g>
              {skeletonShown ? null : (
                <g className="lilt-chart__axis">
                  {yTicks.map((tick) => (
                    <text
                      key={tick}
                      className="lilt-chart__axis-label"
                      x={gutter - 10}
                      y={yScale(tick)}
                      dy="0.35em"
                      textAnchor="end"
                      opacity={yPillNear(tick) ? 0 : 1}
                    >
                      {format.axis(tick)}
                    </text>
                  ))}
                  {xTicks.map((tick) => (
                    <text
                      key={tick}
                      className="lilt-chart__axis-label"
                      x={xScale(tick)}
                      y={bottom + inset + 18}
                      textAnchor="middle"
                      opacity={xPillNear(tick) ? 0 : 1}
                    >
                      {xFormats.compact(tick)}
                    </text>
                  ))}
                  {yLabel ? (
                    <text className="lilt-scatter-card__axis-title" x={0} y={12}>
                      {yLabel}
                    </text>
                  ) : null}
                  {xLabel ? (
                    <text
                      className="lilt-scatter-card__axis-title"
                      x={right}
                      y={height - 2}
                      textAnchor="end"
                    >
                      {xLabel}
                    </text>
                  ) : null}
                </g>
              )}
              <SkeletonExit leaving={skeletonLeaving} origin="bottom">
                <g>
                  {loading ? (
                    <SkeletonSheen
                      width={width}
                      height={height}
                      reduced={reduced}
                      loadingStyle={loadingStyle}
                      depth={depth}
                      mask={SKELETON.map(([fx, fy, r], index) => (
                        <circle
                          key={index}
                          cx={left + (right - left) * fx}
                          cy={top + (bottom - top) * fy}
                          r={size === undefined ? DOT_RADIUS + 1 : r}
                          fill="white"
                        />
                      ))}
                    >
                      {depth ? (
                        <defs>
                          <SphereGradient id={`${sphereId}-loading`} color={SKELETON_INK} />
                          <DropShadow
                            id={`${sphereId}-loading-shadow`}
                            size={2.2}
                            region={{ x: 0, y: 0, width, height }}
                          />
                        </defs>
                      ) : null}
                      <g filter={depth ? `url(#${sphereId}-loading-shadow)` : undefined}>
                        {SKELETON.map(([fx, fy, r], index) => (
                          // Points pop in from left to right, as a reader scans the plot.
                          <g
                            key={index}
                            data-skeleton="pop"
                            style={{ '--lilt-skeleton-step': fx * 12 } as CSSProperties}
                          >
                            <circle
                              className="lilt-scatter-card__skeleton"
                              cx={left + (right - left) * fx}
                              cy={top + (bottom - top) * fy}
                              r={size === undefined ? DOT_RADIUS + 1 : r}
                              style={depth ? { fill: `url(#${sphereId}-loading)` } : undefined}
                            />
                          </g>
                        ))}
                      </g>
                    </SkeletonSheen>
                  ) : (
                    <>
                      {fitLine ? (
                        <line
                          className="lilt-scatter-card__trend"
                          x1={xScale(fitLine[0])}
                          y1={yScale(fitLine[1])}
                          x2={xScale(fitLine[2])}
                          y2={yScale(fitLine[3])}
                        />
                      ) : null}
                      {trailSegments.map(([a, b]) =>
                        hiddenGroups.includes(a.group ?? '') ? null : (
                          <path
                            key={`${a.id}-${b.id}`}
                            className="lilt-scatter-card__trail"
                            d={`M${xScale(a.x)},${yScale(a.y)} L${xScale(b.x)},${yScale(b.y)}`}
                            pathLength={1}
                            fill="none"
                            stroke={colorOf(a.group)}
                            opacity={active && active.group !== a.group ? 0.15 : 0.65}
                          />
                        ),
                      )}
                      {active ? (
                        <g className="lilt-scatter-card__guides">
                          <line x1={active.cx} x2={active.cx} y1={active.cy} y2={bottom + inset} />
                          <line x1={gutter} x2={active.cx} y1={active.cy} y2={active.cy} />
                        </g>
                      ) : null}
                      {depth ? (
                        <defs>
                          <DropShadow
                            id={`${sphereId}-shadow`}
                            size={2.2}
                            region={{ x: 0, y: 0, width, height }}
                          />
                          {sphereColors.map((color, index) => (
                            <SphereGradient key={color} id={`${sphereId}-${index}`} color={color} />
                          ))}
                        </defs>
                      ) : null}
                      <g filter={depth ? `url(#${sphereId}-shadow)` : undefined}>
                        {departing.map((point) => (
                          <g
                            key={`departing-${point.id}`}
                            className="lilt-scatter-card__point"
                            data-departing=""
                            aria-hidden="true"
                            style={{ transform: `translate(${point.cx}px, ${point.cy}px)` }}
                          >
                            <circle
                              r={point.radius}
                              style={{ fill: point.color, color: point.color }}
                            />
                          </g>
                        ))}
                        {points.map((point) => {
                          const muted =
                            (active &&
                              (trails ? point.group !== active.group : point.id !== active.id)) ||
                            (activeGroup !== null && point.group !== activeGroup);
                          return (
                            <g
                              key={point.id}
                              className="lilt-scatter-card__point"
                              data-point={point.label}
                              data-active={point.id === active?.id || undefined}
                              data-muted={muted || undefined}
                              style={
                                {
                                  transform: `translate(${point.cx}px, ${point.cy}px)`,
                                  '--lilt-scatter-card-delay': `${Math.round((point.order / Math.max(1, points.length - 1)) * 320)}ms`,
                                } as CSSProperties
                              }
                            >
                              <circle
                                r={point.radius}
                                style={{
                                  fill: depth
                                    ? `url(#${sphereId}-${sphereColors.indexOf(point.color)})`
                                    : point.color,
                                  color: point.color,
                                }}
                              />
                            </g>
                          );
                        })}
                      </g>
                    </>
                  )}
                </g>
              </SkeletonExit>
            </svg>
            {active ? (
              <>
                <div
                  className="lilt-chart__x-badge lilt-scatter-card__pill"
                  style={{
                    left: active.cx,
                    top: bottom + inset + 6,
                    transform: 'translateX(-50%)',
                  }}
                >
                  {formatX(active.x)}
                </div>
                <div
                  className="lilt-chart__y-badge lilt-scatter-card__pill"
                  style={{
                    right: width - gutter + 4,
                    top: active.cy,
                    transform: 'translateY(-50%)',
                  }}
                >
                  {format.axis(active.y)}
                </div>
              </>
            ) : null}
            <p className="lilt-chart__sr-only" aria-live="polite">
              {active ? describe(active) : ''}
            </p>
          </div>

          {legend !== false && group !== undefined && readings.groups.length ? (
            <ValueLegend
              className="lilt-card__tiles"
              variant={cardLegendVariant(legend)}
              swatch={legendSwatch}
              aria-label={`${ariaLabel} by group`}
              items={groupValues.map((entry) => ({
                id: entry.name,
                label: entry.name,
                color: colorOf(entry.name),
                value: entry.value,
                formattedValue: entry.value === null ? 'No data' : format.value(entry.value),
              }))}
              activeId={activeGroup}
              onHoverIdChange={setHoveredGroup}
              hiddenIds={hiddenGroups}
              onHiddenIdsChange={(ids) => {
                setHiddenGroups(ids);
                setHoveredGroup(null);
                setPinnedGroup(null);
              }}
              renderValue={
                loading
                  ? () => <span className="lilt-card__skeleton lilt-card__skeleton--tile" />
                  : undefined
              }
            />
          ) : null}

          {!loading && (fit || unplotted) ? (
            <div className="lilt-scatter-card__footer">
              {unplotted ? (
                <span>
                  {plural(unplotted, 'point is', 'points are')} missing a value and not plotted
                </span>
              ) : null}
              {fit ? (
                <span className="lilt-scatter-card__fit">
                  <span className="lilt-scatter-card__fit-line" aria-hidden="true" />
                  Trend · r² {fit.r2.toFixed(2)}
                </span>
              ) : null}
            </div>
          ) : null}

          {loading ? null : (
            <table className="lilt-chart__sr-only">
              <caption>{ariaLabel}</caption>
              <thead>
                <tr>
                  <th scope="col">Point</th>
                  {group !== undefined ? <th scope="col">Group</th> : null}
                  <th scope="col">{xLabel ?? x}</th>
                  <th scope="col">{yLabel ?? y}</th>
                  {size !== undefined ? <th scope="col">{sizeLabel ?? size}</th> : null}
                </tr>
              </thead>
              <tbody>
                {readings.rows.map((row) => (
                  <tr key={row.id}>
                    <th scope="row">{row.label}</th>
                    {group !== undefined ? <td>{row.group}</td> : null}
                    <td>{row.x === null ? 'No data' : formatX(row.x)}</td>
                    <td>{row.y === null ? 'No data' : format.value(row.y)}</td>
                    {size !== undefined ? (
                      <td>{row.size === null ? 'No data' : sizeFormat(row.size)}</td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </ChartCard>
  );
}
