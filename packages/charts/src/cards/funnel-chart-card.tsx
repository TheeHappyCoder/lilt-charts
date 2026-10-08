'use client';

import { SkeletonExit, useSkeletonExit } from '../lifecycle/skeleton-exit';
import { SkeletonSheen, SKELETON_INK } from '../lifecycle/skeleton-sheen';
import {
  Fragment,
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from 'react';
import { funnelRows, type FunnelRow } from '../engine/analysis';
import { useChartTimeline, useReducedMotion } from '../motion/use-chart-motion';
import { StatusContent } from '../lifecycle/status-content';
import { EmptySlot } from '../lifecycle/chart-empty';
import { ValueLegend, cardLegendVariant } from '../interaction/value-legend';
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
import type { NumericKey, TextKey } from './keys';
import { useCardSelection } from './use-card-selection';
import { useCardFormat } from './format';
import type { AnimatedNumberVariant } from '../motion/animated-number';
import { glideTarget, useTouchGlide } from '../interaction/use-touch-glide';
import { ramp } from '../primitives/depth-paint';
import { layoutSize } from '../use-chart-width';

export interface FunnelChartCardProps<Row, Key extends NumericKey<Row>> {
  /** Optional visible title. Use aria-label to name an embedded chart. */
  title?: string;
  /** Show the header, including headline and period controls. Defaults to true. */
  header?: boolean;
  /** Accessible name, independent of the visible title. */
  'aria-label'?: string;
  /** One row per stage, in funnel order. Omit when `ranges` supplies the data. */
  data?: readonly Row[];
  /** Text field that names each stage. Names must be unique. */
  category: TextKey<Row>;
  /** How many reached each stage. Counts never rise from one stage to the next. */
  value: Key;
  /** `smooth` (default) eases each stage into the next; `linear` tapers in straight lines. */
  curve?: 'smooth' | 'linear';
  /** `stages` (default) gives each stage its own palette color; `single` uses one color. */
  colors?: 'stages' | 'single';
  /** A quiet full-height lane behind each stage, marking where 100% sits. Defaults to false. */
  tracks?: boolean;
  /**
   * Gives the funnel depth: a pipe seen a little from the right, every stage shaded as a cylinder
   * of its own thickness, with curved seams and elliptical ends. Band heights still read true.
   */
  depth?: boolean;
  /** Plot height in pixels. Defaults to 180. */
  height?: number;
  /** Resting headline. Defaults to the first stage. */
  headline?: number;
  /** Fractional change shown as a chip, e.g. 0.052 → +5.2%. */
  delta?: number;
  deltaTone?: 'default' | 'inverse' | 'neutral';
  /** Static period label, e.g. "Last 7 days". */
  range?: string;
  /** Period select. Each range replaces data, delta, and headline; bands ease to their new size. */
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
  /** Any CSS color for `colors="single"`. Defaults to the palette's first color. */
  color?: string;
  surface?: ChartSurface;
  /** A glass tab tucked behind the card's top edge, e.g. a caption, a command, or actions. */
  badge?: ReactNode;
  /** Headline motion: `count` (default), `pop`, `slide`, `roll`, `flow`, or `scramble`. */
  numberStyle?: AnimatedNumberVariant;
  /**
   * The pinned stage, by name, for a selection you own: external filters and a click on the
   * chart then share it. `null` pins nothing. Omit it and the card keeps its own pin.
   */
  selected?: string | null;
  /** Asked when a click, tap, or Escape pins or releases a stage. */
  onSelectedChange?: (stage: string | null) => void;
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

const EMPTY: readonly never[] = [];
/** Placeholder band heights while the first data loads. */
const SKELETON = [100, 62, 40, 24];
/** Where a smooth stage stops holding its height and starts easing into the next. */
const HOLD = 55;
/** The thinnest band still drawn, so a tiny stage reads as a line rather than vanishing. */
const MIN_BAND = 1.4;

/** Share of the first stage as text; anything above zero but under 1% says so. */
export function stageShare(share: number | null): string {
  if (share === null) return '—';
  if (share > 0 && share < 0.01) return '<1%';
  return `${Math.round(share * 100)}%`;
}

/**
 * The band of one stage in a 100-wide column of a 100-tall plot: it holds its own height, then
 * reaches the next stage's height at the column edge. The last stage and stages before a gap
 * stay level.
 */
export function stagePath(
  index: number,
  height: number,
  next: number | null,
  curve: 'smooth' | 'linear',
): string {
  const x0 = index * 100;
  const x1 = x0 + 100;
  const top = (value: number) => 50 - value / 2;
  const bottom = (value: number) => 50 + value / 2;
  const to = next ?? height;
  if (curve === 'linear') {
    return `M${x0},${top(height)} L${x1},${top(to)} L${x1},${bottom(to)} L${x0},${bottom(height)} Z`;
  }
  const xh = x0 + HOLD;
  const reach = (x1 - xh) * 0.5;
  return [
    `M${x0},${top(height)}`,
    `L${xh},${top(height)}`,
    `C${xh + reach},${top(height)} ${x1 - reach},${top(to)} ${x1},${top(to)}`,
    `L${x1},${bottom(to)}`,
    `C${x1 - reach},${bottom(to)} ${xh + reach},${bottom(height)} ${xh},${bottom(height)}`,
    `L${x0},${bottom(height)}`,
    'Z',
  ].join(' ');
}

/** Height across a pipe's end, as a share of its height on screen: a gentle, low view. */
const PIPE_ELLIPSE = 0.28;

/**
 * Upright strips that tile one stage's band from left to right, each as tall as the band where
 * it stands, so a gradient mapped to each strip shades the band like a cylinder of that local
 * thickness. Strips overlap a little; the stage's own outline trims them.
 */
export function pipeStrips(
  index: number,
  height: number,
  next: number | null,
  curve: 'smooth' | 'linear',
): { x: number; width: number; half: number }[] {
  const x0 = index * 100;
  const x1 = x0 + 100;
  const to = next ?? height;
  const samples: { x: number; half: number }[] = [];
  const STEPS = 24;
  if (curve === 'linear') {
    for (let step = 0; step <= STEPS; step += 1) {
      const t = step / STEPS;
      samples.push({ x: x0 + 100 * t, half: (height + (to - height) * t) / 2 });
    }
  } else {
    // The same cubic as `stagePath`: level until HOLD, then easing to the next stage's height.
    const xh = x0 + HOLD;
    const reach = (x1 - xh) * 0.5;
    samples.push({ x: x0, half: height / 2 });
    for (let step = 0; step <= STEPS; step += 1) {
      const t = step / STEPS;
      const u = 1 - t;
      const x =
        u * u * u * xh +
        3 * u * u * t * (xh + reach) +
        3 * u * t * t * (x1 - reach) +
        t * t * t * x1;
      const ease = 3 * u * t * t + t * t * t;
      samples.push({ x, half: (height + (to - height) * ease) / 2 });
    }
  }
  return samples.slice(1).map((sample, step) => {
    const from = samples[step]!;
    return {
      x: from.x,
      width: sample.x - from.x + 0.6,
      half: Math.max(from.half, sample.half),
    };
  });
}

/** Half of a pipe's elliptical cross-section at `x`: the side facing `right` or left. */
export function pipeEnd(x: number, half: number, rx: number, side: 'left' | 'right'): string {
  return `M${x},${50 - half}A${rx},${half} 0 0 ${side === 'right' ? 1 : 0} ${x},${50 + half}`;
}

/**
 * A funnel card: stages left to right, each band sized by its share of the first stage, with
 * its percentage on the band and its count in a tile beneath. Hovering a stage reads it in the
 * headline with the conversion from the step before.
 */
export function FunnelChartCard<Row, const Key extends NumericKey<Row>>({
  title,
  header = true,
  'aria-label': ariaLabel = title || 'Funnel chart',
  data: suppliedData,
  category,
  value,
  curve = 'smooth',
  colors = 'stages',
  tracks = false,
  depth = false,
  height = 180,
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
  color,
  surface = 'elevated',
  badge,
  numberStyle,
  palette,
  selected,
  onSelectedChange,
  loading = false,
  loadingStyle = 'shimmer',
  empty: emptyState = 'dots',
  motion: motionMode = 'auto',
  className,
  style,
}: FunnelChartCardProps<Row, Key>): ReactElement {
  const reduced = useReducedMotion(motionMode);
  const skeletonLeaving = useSkeletonExit(loading, reduced);
  const skeletonShown = loading || skeletonLeaving;
  const format = useCardFormat({ valueFormat, locale, formatValue: suppliedFormatValue });
  const [rangeId, setRangeId] = useState(defaultRange ?? ranges?.[0]?.id);
  const activeRange = ranges?.find((item) => item.id === rangeId) ?? ranges?.[0];
  const data = activeRange?.data ?? suppliedData ?? (EMPTY as readonly Row[]);
  const delta = activeRange ? activeRange.delta : suppliedDelta;

  const funnel = useMemo(() => {
    try {
      const read = (row: Row, key: string) => (row as Record<string, unknown>)[key];
      const rows = funnelRows({
        data,
        category: {
          id: (row) => String(read(row, category) ?? ''),
          label: (row) => String(read(row, category) ?? ''),
        },
        value: (row) => {
          const cell = read(row, value);
          return typeof cell === 'number' ? cell : null;
        },
      });
      return { rows, error: null };
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Invalid funnel.';
      return {
        rows: [] as FunnelRow<Row>[],
        error: message.includes('must not increase')
          ? 'A later stage has more than an earlier one; funnel counts can only stay level or fall.'
          : message,
      };
    }
  }, [data, category, value]);
  const rows = funnel.rows;

  // Band heights ease between periods and sweep in from the left on first view.
  const heights = useMemo(
    () => rows.map((row) => (row.share === null ? null : Math.max(MIN_BAND, row.share * 100))),
    [rows],
  );
  const [transition, setTransition] = useState({
    key: 0,
    from: [] as (number | null)[],
    to: heights,
    initial: true,
  });
  const shownRef = useRef<(number | null)[]>([]);
  if (transition.to !== heights)
    setTransition({ key: transition.key + 1, from: shownRef.current, to: heights, initial: false });
  // A first view sweeps in from the left; a period change lands on the spring, like bars.
  const progress = useChartTimeline(
    {
      key: transition.key,
      active: !skeletonShown,
      duration: transition.initial ? 720 : 550,
      spring: !transition.initial,
    },
    reduced,
  );
  const shown = transition.initial
    ? transition.to
    : transition.to.map((height, index) => {
        const from = transition.from[index];
        return height === null || from === null || from === undefined
          ? height
          : from + (height - from) * progress;
      });
  shownRef.current = shown;
  const sweep = transition.initial ? progress : 1;
  // The first sweep clears a soft blur; each period change restarts the light motion blur.
  const sweepBlur = transition.initial && progress < 1 ? 8 * Math.pow(1 - progress, 2) : 0;
  const snaps = transition.initial ? 0 : transition.key;

  const [hovered, setHovered] = useState<string | null>(null);
  const ids = useMemo(() => rows.map((row) => row.id), [rows]);
  const [pinned, setPinned] = useCardSelection(selected, onSelectedChange, ids, !loading);
  const glideRef = useTouchGlide<string>({
    resolve: glideTarget,
    onGlide: setHovered,
    onLift: (id) => id !== null && setPinned(id),
    pinned: pinned !== null,
    onRelease: () => setPinned(null),
    disabled: loading,
  });
  // Depth needs the plot's width in pixels; the flat funnel never measures.
  const [width, setWidth] = useState(0);
  const observer = useRef<ResizeObserver | null>(null);
  const plotRef = useCallback(
    (node: HTMLDivElement | null) => {
      glideRef(node);
      observer.current?.disconnect();
      observer.current = null;
      if (!node || !depth || typeof ResizeObserver === 'undefined') return;
      const update = () => setWidth(layoutSize(node).width);
      update();
      observer.current = new ResizeObserver(update);
      observer.current.observe(node);
    },
    [glideRef, depth],
  );
  const activeId = pinned ?? hovered;
  const activeIndex = rows.findIndex((row) => row.id === activeId);
  const active = rows[activeIndex];
  const previous = activeIndex > 0 ? rows[activeIndex - 1] : undefined;

  const colorOf = (index: number) =>
    colors === 'single' ? 'var(--lilt-series-1)' : `var(--lilt-series-${(index % 6) + 1})`;
  // A leaving skeleton keeps the stage count it was drawn with, so the card does not reflow.
  const loadingCount = useRef(SKELETON.length);
  const count = skeletonLeaving
    ? loadingCount.current
    : loading && !rows.length
      ? SKELETON.length
      : Math.max(1, rows.length);
  if (loading) loadingCount.current = count;
  const stages = loading
    ? Array.from({ length: count }, (_, index) => {
        const own = SKELETON[index] ?? SKELETON.at(-1)!;
        const next = index + 1 < count ? (SKELETON[index + 1] ?? SKELETON.at(-1)!) : null;
        return {
          id: `loading-${index}`,
          index,
          own,
          next,
          to: next ?? own,
          d: stagePath(index, own, next, curve),
          color: SKELETON_INK,
          muted: undefined as boolean | undefined,
        };
      })
    : rows.flatMap((row, index) => {
        const own = shown[index];
        if (own === null || own === undefined) return [];
        const next = index + 1 < rows.length ? (shown[index + 1] ?? null) : null;
        return [
          {
            id: row.id,
            index,
            own,
            next,
            to: next ?? own,
            d: stagePath(index, own, next, curve),
            color: colorOf(index),
            muted: (active && row.id !== active.id) || undefined,
          },
        ];
      });
  const bands = () =>
    stages.map((stage) => (
      <path
        key={stage.id}
        className="lilt-funnel-card__band"
        d={stage.d}
        data-stage={stage.id}
        data-active={stage.id === active?.id || undefined}
        data-muted={stage.muted}
        style={{ fill: stage.color }}
      />
    ));
  // With depth the funnel is a pipe seen a little from the right: every stage shaded as a
  // cylinder of its own thickness, curved seams between stages, and elliptical ends. The plot
  // stretches its viewBox to fit, so the ends are sized in pixels and converted per axis, and
  // the pipe narrows a touch so both ends stay inside the plot.
  const pipe =
    depth && width > 0 && stages.length
      ? (() => {
          const span = count * 100;
          const xPerPx = span / width;
          const yPerPx = 100 / height;
          const rx = (half: number) => (half / yPerPx) * PIPE_ELLIPSE * xPerPx;
          const first = stages[0]!;
          const last = stages[stages.length - 1]!;
          const left = rx(first.own / 2);
          const right = rx(last.to / 2);
          const sx = (span - left - right) / span;
          return {
            left,
            sx,
            // Ellipse radii inside the narrowed group, where x is scaled by `sx`.
            rx: (half: number) => rx(half) / sx,
            shadow: { dy: 4 * yPerPx, sx: (7 * xPerPx) / sx, sy: 7 * yPerPx },
          };
        })()
      : null;
  const clipId = `lilt-funnel-${useId().replace(/:/g, '')}`;
  const pipeId = `${clipId}-pipe`;
  const shadeOf = (index: number) => `url(#${pipeId}-shade-${index})`;
  // While loading, each stage grows from the left once the one before it is under way, so the
  // placeholder fills the way people move through the funnel.
  const stageStep = (index: number) => ({ '--lilt-skeleton-step': index * 3 }) as CSSProperties;
  const pipeStages = () =>
    pipe
      ? // Drawn last to first, so each stage's curved end overlaps the narrower stage after it.
        [...stages].reverse().map((stage) => {
          const index = stage.index;
          const isFirst = stage === stages[0];
          const isLast = stage === stages[stages.length - 1];
          const endHalf = stage.to / 2;
          const ownHalf = stage.own / 2;
          const x0 = index * 100;
          const x1 = x0 + 100;
          return (
            <g
              key={stage.id}
              className="lilt-funnel-card__pipe"
              data-stage={stage.id}
              data-active={(!loading && stage.id === active?.id) || undefined}
              data-muted={stage.muted}
              data-skeleton={loading ? 'grow' : undefined}
              style={loading ? stageStep(index) : undefined}
            >
              <clipPath id={`${pipeId}-clip-${index}`}>
                <path d={stage.d} />
                <path d={`${pipeEnd(x1, endHalf, pipe.rx(endHalf), 'right')}Z`} />
                {isFirst ? <path d={`${pipeEnd(x0, ownHalf, pipe.rx(ownHalf), 'left')}Z`} /> : null}
              </clipPath>
              <g clipPath={`url(#${pipeId}-clip-${index})`}>
                {isFirst ? (
                  <rect
                    x={x0 - pipe.rx(ownHalf) - 1}
                    y={50 - ownHalf}
                    width={pipe.rx(ownHalf) + 1.5}
                    height={ownHalf * 2}
                    style={{ fill: shadeOf(index) }}
                  />
                ) : null}
                {pipeStrips(index, stage.own, stage.next, curve).map((strip) => (
                  <rect
                    key={strip.x}
                    x={strip.x}
                    y={50 - strip.half}
                    width={strip.width}
                    height={strip.half * 2}
                    style={{ fill: shadeOf(index) }}
                  />
                ))}
                <rect
                  x={x1 - 0.5}
                  y={50 - endHalf}
                  width={pipe.rx(endHalf) + 1}
                  height={endHalf * 2}
                  style={{ fill: shadeOf(index) }}
                />
              </g>
              {isLast ? (
                // The open end faces the reader's right: a flat disc, turned from the light.
                <ellipse
                  cx={x1}
                  cy={50}
                  rx={pipe.rx(endHalf)}
                  ry={endHalf}
                  style={{ fill: `url(#${pipeId}-cap-${index})` }}
                />
              ) : (
                <path
                  className="lilt-funnel-card__seam"
                  d={pipeEnd(x1, endHalf, pipe.rx(endHalf), 'right')}
                  fill="none"
                  vectorEffect="non-scaling-stroke"
                />
              )}
            </g>
          );
        })
      : null;
  const restingHeadline = activeRange?.headline ?? suppliedHeadline ?? rows[0]?.value ?? null;
  const empty = !loading && (funnel.error !== null || rows.length === 0);

  return (
    <ChartCard
      motion={motionMode}
      className={['lilt-funnel-card', className].filter(Boolean).join(' ')}
      style={
        {
          ...style,
          '--lilt-funnel-stages': count,
          ...(color ? { '--lilt-series-1': color } : {}),
        } as ChartStyle
      }
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
            value={active ? active.value : restingHeadline}
            format={format.value}
            loading={loading}
            motion={motionMode}
          >
            {loading ? null : active ? (
              <ChartCardCaption>
                {active.label}
                {active.conversion !== null && previous
                  ? ` · ${stageShare(active.conversion)} of ${previous.label}`
                  : ''}
              </ChartCardCaption>
            ) : !empty && delta !== undefined ? (
              <ChartCardDelta value={delta} tone={deltaTone} />
            ) : null}
          </ChartCardValue>
        </ChartCardHeader>
      ) : null}

      {funnel.error ? (
        <StatusContent kind="error" message={funnel.error} />
      ) : empty ? (
        <EmptySlot block state={emptyState} shape="rows" />
      ) : (
        <>
          <div
            ref={plotRef}
            className="lilt-funnel-card__plot"
            data-lilt-glide=""
            style={{ height }}
            data-loading={skeletonShown || undefined}
            onPointerLeave={() => setHovered(null)}
          >
            {/* The stages' skeleton freezes and sinks toward the edge they grow from. */}
            <SkeletonExit leaving={skeletonLeaving} origin="left">
              <svg
                aria-hidden="true"
                className="lilt-funnel-card__svg"
                viewBox={`0 0 ${count * 100} 100`}
                preserveAspectRatio="none"
              >
                <defs>
                  <clipPath id={clipId}>
                    <rect
                      x={-10}
                      y={-10}
                      width={sweep < 1 ? count * 100 * sweep + 10 : count * 100 + 20}
                      height={120}
                    />
                  </clipPath>
                  {pipe ? (
                    <>
                      <filter id={`${pipeId}-shadow`} x="-10%" y="-30%" width="120%" height="160%">
                        <feDropShadow
                          dx={0}
                          dy={pipe.shadow.dy}
                          stdDeviation={`${pipe.shadow.sx} ${pipe.shadow.sy}`}
                          floodColor="black"
                          floodOpacity={0.3}
                        />
                      </filter>
                      {stages.map((stage) => {
                        const index = stage.index;
                        return (
                          <Fragment key={stage.id}>
                            {/* Lit from above: a bright band near the top, shade underneath. */}
                            <linearGradient
                              id={`${pipeId}-shade-${index}`}
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              {ramp(stage.color, [
                                [0, -4],
                                [0.16, 30],
                                [0.34, 10],
                                [0.62, -6],
                                [0.86, -24],
                                [1, -40],
                              ])}
                            </linearGradient>
                            <linearGradient
                              id={`${pipeId}-cap-${index}`}
                              x1="0"
                              y1="0"
                              x2="1"
                              y2="1"
                            >
                              {ramp(stage.color, [
                                [0, -6],
                                [1, -34],
                              ])}
                            </linearGradient>
                          </Fragment>
                        );
                      })}
                    </>
                  ) : null}
                </defs>
                {tracks && !loading
                  ? rows.map((row, index) => (
                      <rect
                        key={`track-${row.id}`}
                        className="lilt-funnel-card__track"
                        x={index * 100}
                        y={0}
                        width={100}
                        height={100}
                      />
                    ))
                  : null}
                {loading ? (
                  <SkeletonSheen
                    width={count * 100}
                    height={100}
                    reduced={reduced}
                    loadingStyle={loadingStyle}
                    depth={depth}
                    mask={stages.map((stage) => (
                      <path key={stage.id} className="lilt-funnel-card__skeleton" d={stage.d} />
                    ))}
                  >
                    {pipe ? (
                      <g
                        transform={`translate(${pipe.left} 0) scale(${pipe.sx} 1)`}
                        filter={`url(#${pipeId}-shadow)`}
                      >
                        {pipeStages()}
                      </g>
                    ) : (
                      stages.map((stage) => (
                        <path
                          key={stage.id}
                          className="lilt-funnel-card__skeleton"
                          d={stage.d}
                          data-skeleton="grow"
                          style={stageStep(stage.index)}
                        />
                      ))
                    )}
                  </SkeletonSheen>
                ) : (
                  <g
                    clipPath={`url(#${clipId})`}
                    data-lilt-snap={snaps ? snaps % 2 : undefined}
                    style={
                      sweepBlur > 0.05 ? { filter: `blur(${sweepBlur.toFixed(2)}px)` } : undefined
                    }
                  >
                    {pipe ? (
                      <g
                        transform={`translate(${pipe.left} 0) scale(${pipe.sx} 1)`}
                        filter={`url(#${pipeId}-shadow)`}
                      >
                        {pipeStages()}
                      </g>
                    ) : (
                      bands()
                    )}
                  </g>
                )}
                {(pipe ? [] : Array.from({ length: count - 1 })).map((_, index) => (
                  <line
                    key={`divider-${index}`}
                    className="lilt-funnel-card__divider"
                    x1={(index + 1) * 100}
                    x2={(index + 1) * 100}
                    y1={0}
                    y2={100}
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
              </svg>
            </SkeletonExit>
            {skeletonShown
              ? null
              : rows.map((row, index) => (
                  <button
                    key={row.id}
                    type="button"
                    tabIndex={-1}
                    aria-hidden="true"
                    className="lilt-funnel-card__column"
                    data-glide-id={row.id}
                    data-muted={(active && row.id !== active.id) || undefined}
                    style={
                      pipe
                        ? {
                            left: `${((pipe.left + index * 100 * pipe.sx) / (count * 100)) * 100}%`,
                            width: `${(100 * pipe.sx) / count}%`,
                          }
                        : { left: `${(index / count) * 100}%`, width: `${100 / count}%` }
                    }
                    onPointerEnter={() => setHovered(row.id)}
                    onClick={() => setPinned((current) => (current === row.id ? null : row.id))}
                  >
                    <span
                      className="lilt-funnel-card__pill"
                      style={{
                        opacity:
                          sweep < (index + 0.5) / count
                            ? 0
                            : active && row.id !== active.id
                              ? 0.45
                              : 1,
                      }}
                    >
                      {stageShare(row.share)}
                    </span>
                  </button>
                ))}
          </div>
          {legend !== false ? (
            <ValueLegend
              className="lilt-funnel-card__tiles"
              variant={cardLegendVariant(legend)}
              swatch={legendSwatch}
              aria-label={`${ariaLabel} by stage`}
              items={rows.map((row, index) => ({
                id: row.id,
                label: row.label,
                color: row.value === null ? 'transparent' : colorOf(index),
                value: row.value,
                formattedValue: row.value === null ? 'No data' : format.value(row.value),
              }))}
              activeId={active?.id ?? null}
              selectedId={pinned}
              onHoverIdChange={setHovered}
              onSelectedIdChange={setPinned}
              renderValue={
                loading
                  ? () => <span className="lilt-card__skeleton lilt-card__skeleton--tile" />
                  : undefined
              }
            />
          ) : null}
        </>
      )}
    </ChartCard>
  );
}
