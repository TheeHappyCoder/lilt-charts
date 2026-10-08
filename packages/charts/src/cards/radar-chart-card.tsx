'use client';

import { SkeletonExit, useSkeletonExit } from '../lifecycle/skeleton-exit';
import { SkeletonSheen } from '../lifecycle/skeleton-sheen';
import { scaleLinear } from 'd3-scale';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import { ValueLegend, cardLegendVariant } from '../interaction/value-legend';
import { StatusContent } from '../lifecycle/status-content';
import { EmptySlot } from '../lifecycle/chart-empty';
import { useChartTimeline, useReducedMotion } from '../motion/use-chart-motion';
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
import {
  ChartCard,
  ChartCardCaption,
  ChartCardDelta,
  ChartCardHeader,
  ChartCardRange,
  ChartCardTitle,
  ChartCardValue,
} from './chart-card';
import type { CardRange, CardSeries } from './cartesian-card';
import { summarize, useCardFormat } from './format';
import type { NumericKey, TextKey } from './keys';
import type { AnimatedNumberVariant } from '../motion/animated-number';

/** How the resting headline sums up the first series across dimensions. */
export type RadarAggregate = 'mean' | 'sum' | 'max';

export interface RadarChartCardProps<Row, Key extends NumericKey<Row>> {
  /** Optional visible title. Use aria-label to name an embedded chart. */
  title?: string;
  /** Show the header, including headline and period controls. Defaults to true. */
  header?: boolean;
  /** Accessible name, independent of the visible title. */
  'aria-label'?: string;
  /** One row per dimension, in the order to draw them clockwise from the top. */
  data?: readonly Row[];
  /** Text field that names each dimension. Names must be unique. */
  category: TextKey<Row>;
  /**
   * Profiles to compare, one numeric field each. Dashed series, such as a target, draw as an
   * outline without a fill and stay out of the headline.
   */
  series: readonly CardSeries<Key>[];
  /** Values at the center and the outer ring. Defaults to zero through a round maximum. */
  domain?: readonly [number, number];
  /** How the resting headline sums up the first series: `mean` (default), `sum`, or `max`. */
  aggregate?: RadarAggregate;
  /** `polygon` (default) rings follow the spokes; `circle` rings are round. */
  grid?: 'polygon' | 'circle';
  /** Plot height in pixels. Defaults to 300. */
  height?: number;
  /** Resting headline. Defaults to the `aggregate` of the first series. */
  headline?: number;
  /** Fractional change shown as a chip, e.g. 0.052 → +5.2%. */
  delta?: number;
  deltaTone?: 'default' | 'inverse' | 'neutral';
  /** Static period label, e.g. "Q3". */
  range?: string;
  /** Period select. Each range replaces data, delta, and headline; profiles ease to their shape. */
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
  valueFormat?: Intl.NumberFormatOptions;
  locale?: string;
  formatValue?: (value: number) => string;
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

interface Dimension {
  name: string;
  /** One reading per series; `null` when missing. */
  values: (number | null)[];
}

const EMPTY: readonly never[] = [];
const DEFAULT_HEIGHT = 300;
const RINGS = 4;
/** Vertical room above and below the plot for dimension labels. */
const LABEL_ROOM_Y = 26;
/** Rough width of one label character at 12px, used to leave room for the longest label. */
const CHAR_WIDTH = 6.6;

/** A label that doesn't fit its room breaks at the space nearest its middle. */
export function labelLines(text: string, room: number): string[] {
  if (text.length * CHAR_WIDTH <= room || !text.includes(' ')) return [text];
  const middle = text.length / 2;
  let split = -1;
  for (let index = 0; index < text.length; index++)
    if (text[index] === ' ' && (split < 0 || Math.abs(index - middle) < Math.abs(split - middle)))
      split = index;
  return [text.slice(0, split), text.slice(split + 1)];
}
/** Placeholder profile while the first data loads, as fractions of the radius. */
const SKELETON = [0.72, 0.58, 0.84, 0.5, 0.66, 0.78];

const read = (row: unknown, key: string) => (row as Record<string, unknown>)[key];
const number = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

/** Rows to dimensions, with the domain and any problem stated plainly. */
export function radarDimensions<Row>({
  data,
  category,
  series,
  domain: suppliedDomain,
}: {
  data: readonly Row[];
  category: string;
  series: readonly string[];
  domain?: readonly [number, number];
}): { dimensions: Dimension[]; domain: readonly [number, number]; error: string | null } {
  const fail = (error: string) => ({ dimensions: [], domain: [0, 1] as const, error });
  const dimensions: Dimension[] = [];
  const names = new Set<string>();
  for (const row of data) {
    const name = String(read(row, category) ?? '').trim();
    if (!name) return fail('Every dimension needs a name.');
    if (names.has(name)) return fail(`“${name}” appears twice; each dimension needs one row.`);
    names.add(name);
    dimensions.push({ name, values: series.map((key) => number(read(row, key))) });
  }
  if (dimensions.length && dimensions.length < 3)
    return fail('A radar needs at least three dimensions to draw a shape.');
  if (dimensions.length > 12)
    return fail('A radar reads poorly past twelve dimensions; try a bar chart instead.');
  const values = dimensions.flatMap((dimension) =>
    dimension.values.filter((value): value is number => value !== null),
  );
  if (suppliedDomain) {
    if (!(suppliedDomain[0] < suppliedDomain[1]))
      return fail('`domain` needs a low end below its high end.');
    if (values.some((value) => value < suppliedDomain[0] || value > suppliedDomain[1]))
      return fail('A value falls outside `domain`; widen it so every point fits.');
    return { dimensions, domain: suppliedDomain, error: null };
  }
  const low = Math.min(0, ...values);
  const high = Math.max(low + 1, ...values);
  const [niceLow, niceHigh] = scaleLinear().domain([low, high]).nice(RINGS).domain();
  return { dimensions, domain: [niceLow!, niceHigh!], error: null };
}

const round = (value: number) => Math.round(value * 100) / 100 || 0;

/**
 * A point on spoke `index` of `count`, `fraction` of the way out; spoke 0 points straight up.
 * Rounded to hundredths of a pixel: server and browser trig can differ in the last digit, which
 * would otherwise mismatch on hydration.
 */
export function spokePoint(index: number, count: number, fraction: number, radius: number) {
  const angle = (index / count) * Math.PI * 2;
  return {
    x: round(Math.sin(angle) * radius * fraction),
    y: round(-Math.cos(angle) * radius * fraction),
  };
}

/**
 * The outline of a profile. A missing value breaks the outline there and drops the fill, so a gap
 * never reads as a low score.
 */
export function profilePath(fractions: readonly (number | null)[], radius: number) {
  const count = fractions.length;
  const complete = fractions.every((value) => value !== null);
  let path = '';
  fractions.forEach((fraction, index) => {
    if (fraction === null) return;
    const { x, y } = spokePoint(index, count, fraction, radius);
    const previous = fractions[(index - 1 + count) % count];
    path += `${path && previous !== null ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)} `;
  });
  // Close the loop only across the seam when the last and first values are both present.
  if (complete) path += 'Z';
  else if (fractions[0] !== null && fractions[count - 1] !== null) {
    const { x, y } = spokePoint(0, count, fractions[0]!, radius);
    path += `L${x.toFixed(2)},${y.toFixed(2)}`;
  }
  return { path: path.trim(), complete };
}

/**
 * A radar card: several dimensions on spokes around a center, one outline per profile, so the
 * shape of strengths and gaps reads at a glance. Hovering or stepping around the spokes reads
 * every profile at that dimension.
 */
export function RadarChartCard<Row, const Key extends NumericKey<Row>>({
  title,
  header = true,
  'aria-label': ariaLabel = title || 'Radar chart',
  data: suppliedData,
  category,
  series,
  domain: suppliedDomain,
  aggregate = 'mean',
  grid = 'polygon',
  height = DEFAULT_HEIGHT,
  headline: suppliedHeadline,
  delta: suppliedDelta,
  deltaTone,
  range,
  ranges,
  defaultRange,
  valueFormat,
  legend = 'tiles',
  legendSwatch,
  locale,
  formatValue: suppliedFormatValue,
  surface = 'elevated',
  badge,
  numberStyle,
  palette,
  loading = false,
  loadingStyle = 'shimmer',
  empty: emptyState = 'dots',
  motion: motionMode = 'auto',
  className,
  style,
}: RadarChartCardProps<Row, Key>): ReactElement {
  const reduced = useReducedMotion(motionMode);
  // The skeleton freezes and sinks into the middle before the profile grows out from there.
  const skeletonLeaving = useSkeletonExit(loading, reduced);
  const skeletonShown = loading || skeletonLeaving;
  const format = useCardFormat({ valueFormat, locale, formatValue: suppliedFormatValue });
  const [rangeId, setRangeId] = useState(defaultRange ?? ranges?.[0]?.id);
  const activeRange = ranges?.find((item) => item.id === rangeId) ?? ranges?.[0];
  const data = activeRange?.data ?? suppliedData ?? (EMPTY as readonly Row[]);
  const delta = activeRange ? activeRange.delta : suppliedDelta;
  const { ref, width: measured } = useChartWidth<HTMLDivElement>();
  const width = measured || 480;

  const keys = series.map((item) => item.key as string);
  const seriesKey = keys.join('\u0000');
  const radar = useMemo(
    () => radarDimensions({ data, category, series: keys, domain: suppliedDomain }),
    // `keys` is rebuilt each render; `seriesKey` is its stable identity.
    [data, category, seriesKey, suppliedDomain],
  );
  const { dimensions, domain } = radar;
  const count = dimensions.length;
  const span = domain[1] - domain[0];
  const fraction = (value: number | null) => (value === null ? null : (value - domain[0]) / span);
  const colorOf = (index: number) =>
    series[index]?.color ?? `var(--lilt-series-${(index % 6) + 1})`;
  const labelOf = (index: number) => series[index]?.label ?? keys[index]!;
  const lead = Math.max(
    0,
    series.findIndex((item) => !item.dashed),
  );

  const labelText = (dimension: Dimension) =>
    dimension.name + (dimension.values.some((value) => value === null) ? ' · no data' : '');
  // Side room fits the longest label, up to a quarter of the width; longer labels wrap.
  const labelRoom = Math.min(
    Math.max(40, ...dimensions.map((dimension) => labelText(dimension).length * CHAR_WIDTH)) + 14,
    width * 0.24,
  );
  const radius = Math.max(
    40,
    Math.min((width - labelRoom * 2) / 2, (height - LABEL_ROOM_Y * 2) / 2),
  );
  // A word too long to wrap shrinks every label together, down to 10px, so sizes stay even.
  const widestLine = Math.max(
    1,
    ...dimensions.flatMap((dimension) =>
      labelLines(labelText(dimension), labelRoom - 14).map((line) => line.length * CHAR_WIDTH),
    ),
  );
  const labelFit = Math.max(10 / 12, Math.min(1, (labelRoom - 14) / widestLine));
  const cx = width / 2;
  const cy = height / 2;

  // Profiles grow out from the center on first view. A period change then moves every vertex
  // from where it is to its new value on the spring, rather than redrawing from nothing.
  const skeletonProfile =
    SKELETON.map((level, index) => {
      const { x, y } = spokePoint(index, SKELETON.length, level, radius);
      return `${index ? 'L' : 'M'}${(cx + x).toFixed(2)},${(cy + y).toFixed(2)}`;
    }).join(' ') + ' Z';
  const timeline = useChartTimeline(
    { key: 'first', active: !skeletonShown && count > 0 && measured > 0, duration: 640 },
    reduced,
  );
  // Nothing is drawn until the plot has a size, so the grow is seen from its start.
  const grow = measured > 0 ? timeline : 0;
  const targets = new Map(
    series.flatMap((item, index) =>
      dimensions.map((dimension) => [
        `${item.key}\u0000${dimension.name}`,
        fraction(dimension.values[index] ?? null),
      ]),
    ),
  );
  const signature = JSON.stringify([...targets]);
  const shownFractions = useRef<Map<string, number | null>>(targets);
  const [morph, setMorph] = useState({ key: 0, signature, from: targets, to: targets });
  if (morph.signature !== signature)
    setMorph({ key: morph.key + 1, signature, from: shownFractions.current, to: targets });
  const settle = useChartTimeline(
    { key: morph.key, active: morph.key > 0 && !skeletonShown, duration: 550, spring: true },
    reduced,
  );
  const shownFraction = (seriesKey: string, dimension: string) => {
    const id = `${seriesKey}\u0000${dimension}`;
    const to = morph.to.get(id) ?? null;
    const from = morph.from.get(id);
    return morph.key === 0 || to === null || from === null || from === undefined
      ? to
      : from + (to - from) * settle;
  };
  const shown = new Map(
    [...targets.keys()].map((id) => {
      const [seriesKey, dimension] = id.split('\u0000') as [string, string];
      return [id, shownFraction(seriesKey, dimension)];
    }),
  );
  useEffect(() => {
    shownFractions.current = shown;
  });

  const [hovered, setHovered] = useState<number | null>(null);
  const [pinned, setPinned] = useState<number | null>(null);
  const [focused, setFocused] = useState<number | null>(null);
  const [hoveredSeries, setHoveredSeries] = useState<string | null>(null);
  const [pinnedSeries, setPinnedSeries] = useState<string | null>(null);
  const activeIndex = pinned ?? focused ?? hovered;
  const active = activeIndex === null ? undefined : dimensions[activeIndex];
  const activeSeries = pinnedSeries ?? hoveredSeries;
  // Profiles hidden from the legend fade out; the scale stays put so the rest don't jump.
  const [hiddenSeries, setHiddenSeries] = useState<string[]>([]);
  const isHidden = (index: number) => hiddenSeries.includes(keys[index]!);

  const seriesValues = series.map((_, index) =>
    summarize(
      dimensions
        .map((dimension) => dimension.values[index]!)
        .filter((value): value is number => value !== null),
      aggregate,
    ),
  );
  const restingHeadline = activeRange?.headline ?? suppliedHeadline ?? seriesValues[lead] ?? null;
  // The headline follows the lead series; hidden, it has nothing to show.
  const headlineValue = isHidden(lead) ? null : active ? active.values[lead]! : restingHeadline;
  const others = active
    ? series
        .map((item, index) => ({ item, index }))
        .filter(({ index }) => index !== lead && !isHidden(index))
        .map(
          ({ index }) =>
            `${labelOf(index)} ${active.values[index] === null ? 'no data' : format.value(active.values[index]!)}`,
        )
    : [];

  const spokeAt = (clientX: number, clientY: number, plot: Element): number | null => {
    if (!count) return null;
    const box = plot.getBoundingClientRect();
    const dx = clientX - box.left - cx;
    const dy = clientY - box.top - cy;
    // Labels count as part of their dimension, so the reach extends past the outer ring to them.
    if (Math.hypot(dx, dy) > radius + labelRoom) return null;
    // Angle clockwise from straight up, snapped to the nearest spoke.
    const angle = (Math.atan2(dx, -dy) + Math.PI * 2) % (Math.PI * 2);
    return Math.round((angle / (Math.PI * 2)) * count) % count;
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    // Touch reads the spoke through the glide below, which also stops the page scrolling.
    if (event.pointerType === 'touch') return;
    setHovered(spokeAt(event.clientX, event.clientY, event.currentTarget));
  };
  const glideRef = useTouchGlide<number>({
    resolve: spokeAt,
    onGlide: setHovered,
    onLift: (index) => index !== null && setPinned(index),
    pinned: pinned !== null || pinnedSeries !== null,
    onRelease: () => {
      setPinned(null);
      setPinnedSeries(null);
    },
    // A finger never hovers first, so a tap reads the spoke under it directly.
    onTap: (index) => setPinned((current) => (index !== null && current !== index ? index : null)),
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
    if (!count) return;
    const index = focused ?? pinned;
    let next: number | null = null;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown')
      next = index === null ? 0 : (index + 1) % count;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp')
      next = index === null ? count - 1 : (index - 1 + count) % count;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = count - 1;
    else if ((event.key === 'Enter' || event.key === ' ') && index !== null) {
      event.preventDefault();
      setPinned((current) => (current === index ? null : index));
      return;
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setPinned(null);
      setFocused(null);
      return;
    } else return;
    event.preventDefault();
    setFocused(next);
  };

  const ring = (level: number) =>
    grid === 'circle'
      ? null
      : dimensions
          .map((_, index) => {
            const { x, y } = spokePoint(index, count, level, radius);
            return `${index ? 'L' : 'M'}${(cx + x).toFixed(2)},${(cy + y).toFixed(2)}`;
          })
          .join(' ') + ' Z';
  const empty = !loading && !radar.error && dimensions.length === 0;
  const missing = dimensions.some((dimension) => dimension.values.some((value) => value === null));
  const ringLevels = Array.from({ length: RINGS }, (_, index) => (index + 1) / RINGS);

  return (
    <ChartCard
      motion={motionMode}
      className={['lilt-radar-card', className].filter(Boolean).join(' ')}
      style={style}
      aria-label={ariaLabel}
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
                options={ranges?.map(({ id, label }) => ({ id, label }))}
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
              <ChartCardCaption>{[active.name, ...others].join(' · ')}</ChartCardCaption>
            ) : !empty && delta !== undefined ? (
              <ChartCardDelta value={delta} tone={deltaTone} />
            ) : null}
          </ChartCardValue>
        </ChartCardHeader>
      ) : null}

      {radar.error ? (
        <StatusContent kind="error" message={radar.error} />
      ) : empty ? (
        <EmptySlot block state={emptyState} shape="web" />
      ) : (
        <>
          <div
            ref={plotRef}
            className="lilt-radar-card__plot"
            data-lilt-glide=""
            style={{ height }}
            data-loading={skeletonShown || undefined}
            data-motion={reduced ? 'none' : undefined}
            tabIndex={skeletonShown ? undefined : 0}
            role="group"
            aria-label={`${ariaLabel}: ${count} dimensions. Arrow keys step around them; Enter pins one.`}
            onPointerMove={skeletonShown ? undefined : onPointerMove}
            onPointerLeave={() => setHovered(null)}
            onClick={() =>
              setPinned((current) => (hovered !== null && current !== hovered ? hovered : null))
            }
            onKeyDown={skeletonShown ? undefined : onKeyDown}
            onBlur={() => setFocused(null)}
          >
            <svg
              aria-hidden="true"
              className="lilt-radar-card__svg"
              width={width}
              height={height}
              viewBox={`0 0 ${width} ${height}`}
            >
              <g className="lilt-radar-card__grid">
                {ringLevels.map((level) =>
                  grid === 'circle' || skeletonShown ? (
                    <circle key={level} cx={cx} cy={cy} r={radius * level} />
                  ) : (
                    <path key={level} d={ring(level)!} />
                  ),
                )}
                {skeletonShown
                  ? null
                  : dimensions.map((dimension, index) => {
                      const end = spokePoint(index, count, 1, radius);
                      return (
                        <line
                          key={dimension.name}
                          data-active={index === activeIndex || undefined}
                          x1={cx}
                          y1={cy}
                          x2={cx + end.x}
                          y2={cy + end.y}
                        />
                      );
                    })}
              </g>
              <SkeletonExit leaving={skeletonLeaving} origin="center">
                <g>
                  {loading ? (
                    <SkeletonSheen
                      width={width}
                      height={height}
                      reduced={reduced}
                      loadingStyle={loadingStyle}
                    >
                      {/* The radar builds the way it reads: faint spokes and rings, the outline
                          drawing itself round, each vertex popping in after it, and the fill
                          blooming out from the center last. */}
                      <path
                        className="lilt-radar-card__skeleton-grid"
                        d={[0.5, 1]
                          .map(
                            (level) =>
                              SKELETON.map((_, index) => {
                                const { x, y } = spokePoint(index, SKELETON.length, level, radius);
                                return `${index ? 'L' : 'M'}${(cx + x).toFixed(2)},${(cy + y).toFixed(2)}`;
                              }).join(' ') + ' Z',
                          )
                          .concat(
                            SKELETON.map((_, index) => {
                              const { x, y } = spokePoint(index, SKELETON.length, 1, radius);
                              return `M${cx},${cy} L${(cx + x).toFixed(2)},${(cy + y).toFixed(2)}`;
                            }),
                          )
                          .join(' ')}
                      />
                      <path
                        className="lilt-radar-card__skeleton"
                        data-skeleton="bloom"
                        style={
                          {
                            transformOrigin: `${cx}px ${cy}px`,
                            '--lilt-skeleton-step': SKELETON.length * 0.5 + 1,
                          } as CSSProperties
                        }
                        d={skeletonProfile}
                      />
                      <path
                        className="lilt-radar-card__skeleton-outline"
                        data-skeleton="stroke"
                        pathLength={1}
                        strokeDasharray={1}
                        d={skeletonProfile}
                      />
                      {SKELETON.map((level, index) => {
                        const { x, y } = spokePoint(index, SKELETON.length, level, radius);
                        return (
                          <circle
                            key={index}
                            className="lilt-radar-card__skeleton-vertex"
                            data-skeleton="pop"
                            cx={cx + x}
                            cy={cy + y}
                            r={3.5}
                            style={{ '--lilt-skeleton-step': index * 0.5 + 0.5 } as CSSProperties}
                          />
                        );
                      })}
                    </SkeletonSheen>
                  ) : (
                    <>
                      <g className="lilt-chart__axis">
                        {ringLevels.map((level) => {
                          // A small radar labels only its middle ring, so labels never crowd.
                          if (radius < 110 && level !== 0.5) return null;
                          // Halfway between the first two spokes, where no vertex can sit.
                          const { x, y } = spokePoint(0.5, count, level, radius);
                          return (
                            <text
                              key={level}
                              className="lilt-radar-card__ring-label"
                              x={cx + x}
                              y={cy + y}
                              dx={3}
                              dy="0.35em"
                            >
                              {format.axis(domain[0] + span * level)}
                            </text>
                          );
                        })}
                      </g>
                      <g
                        transform={`translate(${cx} ${cy}) scale(${grow})`}
                        data-lilt-travel={morph.key ? morph.key % 2 : undefined}
                        style={
                          // The first view grows out of a blur, like every family's arrival.
                          grow < 1
                            ? { filter: `blur(${(8 * (1 - grow)).toFixed(2)}px)` }
                            : undefined
                        }
                      >
                        {series.map((item, index) => {
                          const { path, complete } = profilePath(
                            dimensions.map((dimension) => shownFraction(item.key, dimension.name)),
                            radius,
                          );
                          const muted = activeSeries !== null && activeSeries !== item.key;
                          return (
                            <g
                              key={item.key}
                              className="lilt-radar-card__profile"
                              data-series={item.key}
                              data-dashed={item.dashed || undefined}
                              data-muted={muted || undefined}
                              data-hidden={isHidden(index) || undefined}
                              style={{ color: colorOf(index) }}
                            >
                              {complete && !item.dashed ? (
                                <path className="lilt-radar-card__fill" d={path} />
                              ) : null}
                              <path className="lilt-radar-card__outline" d={path} />
                              {dimensions.map((dimension, spoke) => {
                                const value = shownFraction(item.key, dimension.name);
                                if (value === null) return null;
                                const { x, y } = spokePoint(spoke, count, value, radius);
                                return (
                                  <circle
                                    key={dimension.name}
                                    className="lilt-radar-card__vertex"
                                    data-active={spoke === activeIndex || undefined}
                                    cx={x}
                                    cy={y}
                                    r={spoke === activeIndex ? 4.5 : 3}
                                  />
                                );
                              })}
                            </g>
                          );
                        })}
                      </g>
                      {dimensions.map((dimension, index) => {
                        const { x, y } = spokePoint(index, count, 1, radius + 14);
                        const anchor = Math.abs(x) < 1 ? 'middle' : x > 0 ? 'start' : 'end';
                        const gap = dimension.values.some((value) => value === null);
                        const lines = labelLines(labelText(dimension), labelRoom - 14);
                        // Lines stack away from the plot: upward above it, downward below it.
                        const first =
                          y < -1
                            ? -0.2 - (lines.length - 1) * 1.2
                            : y > 1
                              ? 0.9
                              : 0.35 - ((lines.length - 1) * 1.2) / 2;
                        return (
                          <text
                            key={dimension.name}
                            className="lilt-radar-card__label"
                            data-active={index === activeIndex || undefined}
                            data-missing={gap || undefined}
                            x={cx + x}
                            y={cy + y}
                            textAnchor={anchor}
                            style={
                              labelFit < 1
                                ? { fontSize: `${(12 * labelFit).toFixed(1)}px` }
                                : undefined
                            }
                          >
                            {lines.map((line, number) => (
                              <tspan
                                key={number}
                                x={cx + x}
                                dy={`${number === 0 ? first.toFixed(2) : '1.2'}em`}
                              >
                                {line}
                              </tspan>
                            ))}
                          </text>
                        );
                      })}
                    </>
                  )}
                </g>
              </SkeletonExit>
            </svg>
            <p className="lilt-chart__sr-only" aria-live="polite">
              {active
                ? `${active.name}: ${series
                    .map(
                      (_, index) =>
                        `${labelOf(index)} ${active.values[index] === null ? 'no data' : format.value(active.values[index]!)}`,
                    )
                    .join(', ')}`
                : ''}
            </p>
          </div>

          {legend !== false ? (
            <ValueLegend
              className="lilt-card__tiles"
              variant={cardLegendVariant(legend)}
              swatch={legendSwatch}
              aria-label={`${ariaLabel} by series`}
              items={series.map((item, index) => {
                const value = active ? active.values[index]! : seriesValues[index]!;
                return {
                  id: item.key as string,
                  label: labelOf(index),
                  color: colorOf(index),
                  value,
                  formattedValue: value === null ? 'No data' : format.value(value),
                };
              })}
              activeId={activeSeries}
              onHoverIdChange={setHoveredSeries}
              hiddenIds={hiddenSeries}
              onHiddenIdsChange={(ids) => {
                setHiddenSeries(ids);
                setHoveredSeries(null);
                setPinnedSeries(null);
              }}
              renderValue={
                loading
                  ? () => <span className="lilt-card__skeleton lilt-card__skeleton--tile" />
                  : undefined
              }
            />
          ) : null}

          {!loading && missing ? (
            <p className="lilt-radar-card__footer">
              A missing value breaks the outline at that dimension instead of drawing it as zero.
            </p>
          ) : null}

          {loading ? null : (
            <table className="lilt-chart__sr-only">
              <caption>{ariaLabel}</caption>
              <thead>
                <tr>
                  <th scope="col">Dimension</th>
                  {series.map((item, index) => (
                    <th scope="col" key={item.key}>
                      {labelOf(index)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dimensions.map((dimension) => (
                  <tr key={dimension.name}>
                    <th scope="row">{dimension.name}</th>
                    {dimension.values.map((value, index) => (
                      <td key={keys[index]}>{value === null ? 'No data' : format.value(value)}</td>
                    ))}
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
