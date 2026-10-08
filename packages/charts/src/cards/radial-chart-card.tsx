'use client';

import { SkeletonExit, useSkeletonExit } from '../lifecycle/skeleton-exit';
import { SkeletonSheen } from '../lifecycle/skeleton-sheen';
import {
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import { arc as d3Arc } from 'd3-shape';
import { useChartTimeline, useReducedMotion } from '../motion/use-chart-motion';
import { StatusContent } from '../lifecycle/status-content';
import { EmptySlot } from '../lifecycle/chart-empty';
import type {
  ChartMotion,
  ChartLoadingStyle,
  ChartEmptyState,
  ChartPalette,
  ChartStyle,
  ChartSurface,
  RankingOrder,
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
import { useCardFormat } from './format';
import { ValueLegend, cardLegendVariant } from '../interaction/value-legend';
import { rankRows, sharePercent, shareTotals, type RankedRow } from './rank';
import { useCardSelection } from './use-card-selection';
import type { AnimatedNumberVariant } from '../motion/animated-number';
import { glideTarget, useTouchGlide } from '../interaction/use-touch-glide';
import { DropShadow, ramp, shade, tubeLayers } from '../primitives/depth-paint';

export type RadialChartCardVariant = 'donut' | 'pie' | 'semi' | 'rings';

export interface RadialChartCardProps<Row, Key extends NumericKey<Row>> {
  /** Optional visible title. Use aria-label to name an embedded chart. */
  title?: string;
  /** Show the header, including headline and period controls. Defaults to true. */
  header?: boolean;
  /** Accessible name, independent of the visible title. */
  'aria-label'?: string;
  /** One row per category. Omit when `ranges` supplies the data. */
  data?: readonly Row[];
  /** Text field that names each slice. Names must be unique. */
  category: TextKey<Row>;
  /** Numeric field sized by each slice. Values must not be negative; `null` is "No data". */
  value: Key;
  /**
   * `donut` (default) shows the share in the middle, `pie` fills the circle, `semi` is a half
   * donut with rounded ends, and `rings` gives each category its own ring on one shared scale.
   */
  variant?: RadialChartCardVariant;
  /**
   * Gives the chart depth: every band is lit as a tube from the upper left, ring tracks become
   * grooves, and a soft shadow lifts the chart off the card. Outlines keep their exact angles,
   * so shares read the same as the flat chart.
   */
  depth?: boolean;
  /**
   * `list` rows with value and share, value `tiles`, an `inline` key, tinted `pills`, or `bars`
   * that also draw each value against the largest. Defaults to tiles for rings, inline for semi,
   * and list otherwise.
   * False removes the legend without changing the data or marks.
   */
  legend?: CardLegend | false;
  /** The mark beside each legend label: `square` (default), `dot`, or `line`. */
  legendSwatch?: ChartLegendSwatch;
  /** Resting headline. Defaults to the total of every slice. */
  headline?: number;
  /** Fractional change shown as a chip, e.g. 0.082 → +8.2%. */
  delta?: number;
  deltaTone?: 'default' | 'inverse' | 'neutral';
  /** Static period label, e.g. "This month". */
  range?: string;
  /** Period select. Each range replaces data, delta, and headline; slices ease to their new size. */
  ranges?: readonly CardRange<Row>[];
  defaultRange?: string;
  /**
   * The pinned category, by name, for a selection you own: external filters and a click on a
   * slice then share it. `null` pins nothing. Omit it and the card keeps its own pin.
   */
  selected?: string | null;
  /** Asked when a click, tap, or Escape pins or releases a category. */
  onSelectedChange?: (category: string | null) => void;
  /**
   * Fixed colors by category name, e.g. `{ Critical: '#ef4444' }`, for categories whose color
   * means something. Others take the palette in order, and keep it as values change.
   */
  colors?: Readonly<Record<string, string>>;
  /**
   * Replaces what the middle of a donut or half donut shows (by default the share of the
   * hovered, pinned, or largest category).
   */
  center?: (category: RadialCenterCategory) => ReactNode;
  /**
   * Slices shown before the rest are added up as one "Other" slice. Defaults to 5, since more
   * than six colors stop being told apart. `Infinity` shows every category.
   */
  limit?: number;
  /** Label of the combined slice. Defaults to "Other". */
  otherLabel?: string;
  /** `descending` (default) puts the largest first; `input` keeps your order. */
  sort?: RankingOrder;
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
  /** Shimmer (default), a clockwise draw, or a gentle pulse. Honors reduced motion. */
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

/** The category the middle of the chart speaks for: the active one, or else the largest. */
export interface RadialCenterCategory {
  category: string;
  value: number | null;
  /** Its part of the visible total, 0 to 1; null when unknown. */
  share: number | null;
  /** True while it is hovered, focused, or pinned rather than shown at rest. */
  active: boolean;
  pinned: boolean;
}

const EMPTY: readonly never[] = [];
const OUTER = 92;
const ACTIVE_OUTER = 98;
const TAU = Math.PI * 2;
/** Leaves room inside the flat chart's box for the drop shadow under a chart with depth. */
const DEPTH_SCALE = 0.94;
/** Grooves are shaded from the track's color, so it needs an opaque color rather than a tint. */
const SOLID_TRACK = 'color-mix(in oklab, var(--lilt-muted) 13%, var(--lilt-surface))';

interface Slice {
  id: string;
  startAngle: number;
  endAngle: number;
}

/** Angles for each observed slice, in row order. Missing values take no room. */
export function sliceAngles(rows: readonly RankedRow[]): Slice[] {
  const total = rows.reduce((sum, row) => sum + Math.max(0, row.value ?? 0), 0);
  let angle = 0;
  return rows.flatMap((row) => {
    if (row.value === null || total <= 0) return [];
    const startAngle = angle;
    angle += (Math.max(0, row.value) / total) * TAU;
    return [{ id: row.id, startAngle, endAngle: angle }];
  });
}

/**
 * The top of a rings scale: the largest value rounded up to a quarter step of its magnitude, so
 * the longest ring stops short of closing and every ring reads against the same full turn.
 */
export function ringScale(max: number): number {
  if (!(max > 0)) return 1;
  const step = 10 ** Math.floor(Math.log10(max)) / 4;
  return Math.ceil((max * 1.05) / step) * step;
}

/** One ring per observed row: each sweeps from the top by its value on the shared scale. */
export function ringAngles(rows: readonly RankedRow[]): Slice[] {
  const max = Math.max(0, ...rows.map((row) => row.value ?? 0));
  const scale = ringScale(max);
  return rows.flatMap((row) =>
    row.value === null
      ? []
      : [{ id: row.id, startAngle: 0, endAngle: (Math.max(0, row.value) / scale) * TAU }],
  );
}

/** A gentle ease-out for each ring's own draw, layered on the shared timeline. */
function easeOut(value: number): number {
  return 1 - Math.pow(1 - value, 2);
}

/**
 * Slices that left in a period change: each collapses toward where its gap closes, the start of
 * the next slice that stays, while the others spring wider. Drawn apart from the live slices, so
 * hover, legend and pins only ever see real data.
 */
function leavingSlices(from: readonly Slice[], to: readonly Slice[], progress: number) {
  const next = new Map(to.map((slice) => [slice.id, slice]));
  const t = Math.max(0, Math.min(1, progress));
  return from.flatMap((slice, index) => {
    if (next.has(slice.id)) return [];
    const after = from.slice(index + 1).find((candidate) => next.has(candidate.id));
    const edge = after ? next.get(after.id)!.startAngle : (to.at(-1)?.endAngle ?? slice.startAngle);
    return [
      {
        id: slice.id,
        startAngle: slice.startAngle + (edge - slice.startAngle) * t,
        endAngle: slice.endAngle + (edge - slice.endAngle) * t,
        opacity: 1 - Math.min(1, t * 1.6),
        blur: 3 * t,
      },
    ];
  });
}

const blurStyle = (blur: number) => (blur > 0.05 ? { filter: `blur(${blur.toFixed(2)}px)` } : {});

/** Ease every slice from its old angles to its new ones; new slices grow from their start. */
function mixSlices(from: readonly Slice[], to: readonly Slice[], progress: number): Slice[] {
  const previous = new Map(from.map((slice) => [slice.id, slice]));
  return to.map((slice) => {
    const start = previous.get(slice.id) ?? {
      ...slice,
      endAngle: slice.startAngle,
    };
    return {
      id: slice.id,
      startAngle: start.startAngle + (slice.startAngle - start.startAngle) * progress,
      endAngle: start.endAngle + (slice.endAngle - start.endAngle) * progress,
    };
  });
}

/**
 * A donut or pie card: the headline total, slices with a matching legend, and each slice's
 * share. Hovering a slice or a legend row reads it in the headline.
 */
export function RadialChartCard<Row, const Key extends NumericKey<Row>>({
  title,
  header = true,
  'aria-label': ariaLabel = title || 'Radial chart',
  data: suppliedData,
  category,
  value,
  variant = 'donut',
  depth = false,
  legend = variant === 'rings' ? 'tiles' : variant === 'semi' ? 'inline' : 'list',
  legendSwatch,
  headline: suppliedHeadline,
  delta: suppliedDelta,
  deltaTone,
  range,
  ranges,
  defaultRange,
  limit = 5,
  otherLabel = 'Other',
  sort = 'descending',
  valueFormat,
  locale,
  formatValue: suppliedFormatValue,
  surface = 'elevated',
  badge,
  numberStyle,
  palette,
  selected,
  onSelectedChange,
  colors: fixedColors,
  center,
  loading = false,
  loadingStyle = 'shimmer',
  empty: emptyState = 'dots',
  motion: motionMode = 'auto',
  className,
  style,
}: RadialChartCardProps<Row, Key>): ReactElement {
  const reduced = useReducedMotion(motionMode);
  // The skeleton freezes and sinks into the middle before the ring draws in from there.
  const skeletonLeaving = useSkeletonExit(loading, reduced);
  const skeletonShown = loading || skeletonLeaving;
  const format = useCardFormat({ valueFormat, locale, formatValue: suppliedFormatValue });
  const [rangeId, setRangeId] = useState(defaultRange ?? ranges?.[0]?.id);
  const activeRange = ranges?.find((item) => item.id === rangeId) ?? ranges?.[0];
  const data = activeRange?.data ?? suppliedData ?? (EMPTY as readonly Row[]);
  const delta = activeRange ? activeRange.delta : suppliedDelta;
  const depthId = `lilt-radial-depth-${useId().replace(/:/g, '')}`;

  const ranked = useMemo(() => {
    try {
      const rows = rankRows(data, category, value, sort, limit, otherLabel);
      const negative = rows.find((row) => row.value !== null && row.value < 0);
      if (negative)
        throw new Error(`Slices can’t be negative, and “${negative.label}” is below zero.`);
      return { rows, error: null };
    } catch (cause) {
      return { rows: [] as RankedRow[], error: cause instanceof Error ? cause.message : null };
    }
  }, [data, category, value, sort, limit, otherLabel]);
  const rows = ranked.rows;
  // Categories hidden from the legend leave the circle; shares and the headline cover what is
  // shown. The legend keeps every row so hidden ones can come back.
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const shownRows = useMemo(
    () => rows.filter((row) => !hiddenIds.includes(row.id)),
    [rows, hiddenIds],
  );
  const { total, observed } = shareTotals(shownRows);

  // A category keeps its color when periods re-rank it; "Other" is always the quiet gray.
  const colors = useRef(new Map<string, number>());
  const colorOf = (id: string) => {
    const fixed = fixedColors?.[id];
    if (fixed) return fixed;
    if (rows.find((row) => row.id === id)?.other) return 'var(--lilt-reference)';
    // First seen, first served: slots follow the first ranking, then stay with the category.
    if (!colors.current.has(id)) colors.current.set(id, colors.current.size % 6);
    return `var(--lilt-series-${colors.current.get(id)! + 1})`;
  };
  for (const row of rows) if (!row.other && !fixedColors?.[row.id]) colorOf(row.id);

  // Slices sweep in on first view and ease between periods.
  const rings = variant === 'rings';
  const semi = variant === 'semi';
  const target = useMemo(
    () => (rings ? ringAngles(shownRows) : sliceAngles(shownRows)),
    [shownRows, rings],
  );
  const [transition, setTransition] = useState({
    key: 0,
    from: [] as Slice[],
    to: target,
    initial: true,
  });
  const shownRef = useRef<Slice[]>([]);
  // Nothing on screen yet (first view, or data arriving after loading) draws in clockwise from
  // twelve o'clock; anything already drawn eases to its new size.
  if (transition.to !== target)
    setTransition({
      key: transition.key + 1,
      from: shownRef.current,
      to: target,
      initial: shownRef.current.length === 0,
    });
  // Each period change restarts the light motion blur over the slices.
  const snaps = transition.initial ? 0 : transition.key;
  // A first draw sweeps in clockwise; a period change lands on the spring, like bars.
  const progress = useChartTimeline(
    {
      key: transition.key,
      active: !skeletonShown,
      duration: transition.initial ? 900 : 550,
      spring: !transition.initial,
    },
    reduced,
  );
  const drawing = progress < 1;
  // Rings start one after another, outermost first, so the draw reads as a cascade.
  const RING_LAG = 0.09;
  const ringProgress = (index: number) =>
    rings && transition.initial
      ? Math.max(
          0,
          Math.min(1, (progress - index * RING_LAG) / (1 - (target.length - 1) * RING_LAG || 1)),
        )
      : progress;
  const shown = transition.initial
    ? transition.to.map((slice, index) => {
        const reach = rings ? easeOut(ringProgress(index)) : progress;
        return {
          ...slice,
          startAngle: slice.startAngle * reach,
          endAngle: slice.endAngle * reach,
        };
      })
    : mixSlices(transition.from, transition.to, progress);
  shownRef.current = shown;
  const changing = !transition.initial && drawing;
  const leaving = changing && !rings ? leavingSlices(transition.from, transition.to, progress) : [];
  // Slices new to this period clear an 8px blur as they grow; the first draw clears one too.
  const arrived = useMemo(
    () => new Set(transition.from.map((slice) => slice.id)),
    [transition.from],
  );
  const arrivalBlur = (id: string) =>
    changing && !arrived.has(id) ? 8 * (1 - Math.max(0, Math.min(1, progress))) : 0;
  const drawBlur = transition.initial && drawing ? 8 * Math.pow(1 - progress, 2) : 0;

  const [hovered, setHovered] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);
  const shownIds = useMemo(() => shownRows.map((row) => row.id), [shownRows]);
  const [pinned, setPinned] = useCardSelection(
    selected,
    onSelectedChange,
    shownIds,
    !loading && ranked.error === null,
  );
  const activeId = pinned ?? focused ?? hovered;
  const active = shownRows.find((row) => row.id === activeId);
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const glideRef = useTouchGlide<string>({
    resolve: glideTarget,
    onGlide: setHovered,
    onLift: (id) => id !== null && setPinned(id),
    pinned: pinned !== null,
    onRelease: () => setPinned(null),
    disabled: loading,
  });
  const shareOf = (row: RankedRow | undefined) =>
    row && row.value !== null && total > 0 && !hiddenIds.includes(row.id)
      ? sharePercent.format(row.value / total)
      : null;
  const leader = shownRows.find((row) => row.value !== null && !row.other);
  const changeHidden = (ids: string[]) => {
    setHiddenIds(ids);
    setHovered(null);
    setPinned(null);
  };
  // The circle always keeps at least one category.
  const toggleRow = (id: string) =>
    hiddenIds.includes(id)
      ? changeHidden(hiddenIds.filter((other) => other !== id))
      : shownRows.length > 1
        ? changeHidden([...hiddenIds, id])
        : undefined;
  const centerRow = active ?? leader;

  const inner = variant === 'donut' ? 62 : semi ? 64 : 0;
  const arcFor = (outer: number) =>
    d3Arc<Slice>()
      .innerRadius(inner)
      .outerRadius(outer)
      .cornerRadius(variant === 'donut' ? 3 : semi ? 14 : 0)
      .padAngle(shown.length > 1 ? (semi ? 0.05 : 0.012) : 0);
  const restingArc = arcFor(OUTER);
  const activeArc = arcFor(ACTIVE_OUTER);
  // A half donut maps the full turn onto the top half, from nine o'clock to three.
  const toSemi = (slice: Slice): Slice => ({
    ...slice,
    startAngle: -Math.PI / 2 + slice.startAngle / 2,
    endAngle: -Math.PI / 2 + slice.endAngle / 2,
  });
  // Rings share the radius between them, outermost first, with round ends.
  const ringCount = Math.max(1, target.length);
  const ringGap = 4;
  const ringWidth = Math.min(9, (OUTER - 30) / ringCount - ringGap);
  const ringArc = (index: number, widen = 0) =>
    d3Arc<Slice>()
      .innerRadius(OUTER - index * (ringWidth + ringGap) - ringWidth - widen / 2)
      .outerRadius(OUTER - index * (ringWidth + ringGap) + widen / 2)
      .cornerRadius(ringWidth);
  const sliceHandlers = (id: string) => ({
    'data-glide-id': id,
    onPointerEnter: () => setHovered(id),
    onPointerLeave: () => setHovered(null),
    onClick: () => setPinned((current) => (current === id ? null : id)),
  });

  // The flat look, and the shapes depth lights.
  const ringShapes = rings
    ? shown.map((slice, index) => {
        const isActive = slice.id === active?.id;
        return {
          slice,
          isActive,
          muted: (active && !isActive) || undefined,
          band: ringArc(index)({ id: slice.id, startAngle: 0, endAngle: TAU }) ?? '',
          path: slice.endAngle > 0 ? ringArc(index, isActive ? 3 : 0)(slice) : null,
          color: colorOf(slice.id),
        };
      })
    : [];
  const sliceShapes = rings
    ? []
    : shown.flatMap((slice) => {
        const isActive = slice.id === active?.id;
        const angles = semi ? toSemi(slice) : slice;
        const path = (isActive ? activeArc : restingArc)(angles);
        return path
          ? [
              {
                slice,
                isActive,
                muted: (active && !isActive) || undefined,
                angles,
                path,
                color: colorOf(slice.id),
              },
            ]
          : [];
      });
  const leavingLayer = leaving.length ? (
    <g className="lilt-radial-card__leaving" aria-hidden="true">
      {leaving.map((slice) => {
        const path = restingArc(semi ? toSemi(slice) : slice);
        return path ? (
          <path
            key={slice.id}
            d={path}
            data-lilt-leaving=""
            style={{ fill: colorOf(slice.id), opacity: slice.opacity, ...blurStyle(slice.blur) }}
          />
        ) : null;
      })}
    </g>
  ) : null;
  const flat = () =>
    rings
      ? ringShapes.map((ring) => (
          <g
            key={ring.slice.id}
            className="lilt-radial-card__ring"
            data-category={ring.slice.id}
            data-active={ring.isActive || undefined}
            data-muted={ring.muted}
            {...sliceHandlers(ring.slice.id)}
          >
            <path className="lilt-radial-card__track" d={ring.band} />
            {ring.path ? (
              <path
                className="lilt-radial-card__slice"
                d={ring.path}
                style={{ fill: ring.color, ...blurStyle(arrivalBlur(ring.slice.id)) }}
              />
            ) : null}
          </g>
        ))
      : sliceShapes.map((shape) => (
          // The hover target is always the grown shape, so hovering never changes what is under
          // the pointer. A target that grew and shrank with hover would flicker at the slice
          // edge, entering and leaving on every frame.
          <g key={shape.slice.id}>
            <path
              className="lilt-radial-card__slice"
              d={shape.path}
              data-category={shape.slice.id}
              data-active={shape.isActive || undefined}
              data-muted={shape.muted}
              style={{ fill: shape.color, ...blurStyle(arrivalBlur(shape.slice.id)) }}
            />
            <path
              className="lilt-radial-card__hit"
              d={activeArc(shape.angles) ?? shape.path}
              data-category={shape.slice.id}
              {...sliceHandlers(shape.slice.id)}
            />
          </g>
        ));
  // Depth lights each band as a tube, cut from its centerline: the outline, and so every angle,
  // stays exactly the flat chart's. A pie has no band, so it is lit as a shallow dome.
  const arcLine = (radius: number, start: number, end: number) => {
    if (end - start >= TAU - 1e-6)
      return `M0,${-radius}A${radius},${radius} 0 1 1 0,${radius}A${radius},${radius} 0 1 1 0,${-radius}`;
    const at = (angle: number) =>
      `${(radius * Math.sin(angle)).toFixed(3)},${(-radius * Math.cos(angle)).toFixed(3)}`;
    return `M${at(start)}A${radius},${radius} 0 ${end - start > Math.PI ? 1 : 0} 1 ${at(end)}`;
  };
  const tube = (
    key: string,
    outline: string,
    radius: number,
    width: number,
    angles: { startAngle: number; endAngle: number },
    color: string,
    kind: 'tube' | 'groove' = 'tube',
  ) => {
    // The centerline runs past the band's ends; the outline trims it, round ends included.
    const line = arcLine(radius, angles.startAngle - 0.3, angles.endAngle + 0.3);
    return (
      <>
        <clipPath id={`${depthId}-${key}`}>
          <path className="lilt-radial-card__tube-outline" d={outline} />
        </clipPath>
        <g clipPath={`url(#${depthId}-${key})`}>
          {tubeLayers(width, kind).map((layer, index) => (
            <path
              key={index}
              className="lilt-radial-card__tube-layer"
              d={line}
              fill="none"
              transform={layer.transform}
              style={{ stroke: shade(color, layer.amount), strokeWidth: layer.strokeWidth }}
            />
          ))}
        </g>
      </>
    );
  };
  const ringBand = (index: number, widen = 0) => {
    const outer = OUTER - index * (ringWidth + ringGap) + widen / 2;
    return { radius: outer - (ringWidth + widen) / 2, width: ringWidth + widen };
  };
  const deepSlices = () =>
    rings
      ? ringShapes.map((ring, index) => {
          if (!ring.path) return null;
          const band = ringBand(index, ring.isActive ? 3 : 0);
          return (
            <g
              key={ring.slice.id}
              className="lilt-radial-card__slice"
              data-category={ring.slice.id}
              data-muted={ring.muted}
            >
              {tube(`ring-${index}`, ring.path, band.radius, band.width, ring.slice, ring.color)}
            </g>
          );
        })
      : sliceShapes.map((shape) => {
          const outer = shape.isActive ? ACTIVE_OUTER : OUTER;
          return (
            <g
              key={shape.slice.id}
              className="lilt-radial-card__slice"
              data-category={shape.slice.id}
              data-active={shape.isActive || undefined}
              data-muted={shape.muted}
            >
              {inner > 0 ? (
                tube(
                  `slice-${shown.indexOf(shape.slice)}`,
                  shape.path,
                  (inner + outer) / 2,
                  outer - inner,
                  shape.angles,
                  shape.color,
                )
              ) : (
                <path
                  className="lilt-radial-card__dome"
                  d={shape.path}
                  style={{ fill: `url(#${depthId}-dome-${shown.indexOf(shape.slice)})` }}
                />
              )}
            </g>
          );
        });
  const deep = () => (
    <>
      <defs>
        <DropShadow id={`${depthId}-shadow`} size={6} />
        {inner === 0 && !rings
          ? sliceShapes.map((shape) => (
              <radialGradient
                key={shape.slice.id}
                id={`${depthId}-dome-${shown.indexOf(shape.slice)}`}
                gradientUnits="userSpaceOnUse"
                cx={-28}
                cy={-36}
                r={150}
              >
                {ramp(shape.color, [
                  [0, 26],
                  [0.42, 2],
                  [1, -36],
                ])}
              </radialGradient>
            ))
          : null}
      </defs>
      {/* Ring tracks are grooves cut into the card; they cast no shadow and take the pointer. */}
      {rings
        ? ringShapes.map((ring, index) => {
            const band = ringBand(index);
            return (
              <g
                key={`track-${ring.slice.id}`}
                className="lilt-radial-card__ring"
                data-category={ring.slice.id}
                data-active={ring.isActive || undefined}
                data-muted={ring.muted}
                {...sliceHandlers(ring.slice.id)}
              >
                <path className="lilt-radial-card__track" d={ring.band} />
                {tube(
                  `track-${index}`,
                  ring.band,
                  band.radius,
                  band.width,
                  { startAngle: 0, endAngle: TAU },
                  SOLID_TRACK,
                  'groove',
                )}
              </g>
            );
          })
        : null}
      <g filter={`url(#${depthId}-shadow)`}>{deepSlices()}</g>
      {rings
        ? null
        : sliceShapes.map((shape) => (
            <path
              key={`hit-${shape.slice.id}`}
              className="lilt-radial-card__hit"
              d={activeArc(shape.angles) ?? shape.path}
              data-category={shape.slice.id}
              {...sliceHandlers(shape.slice.id)}
            />
          ))}
    </>
  );

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next = index;
    if (event.key === 'ArrowDown') next = Math.min(rows.length - 1, index + 1);
    else if (event.key === 'ArrowUp') next = Math.max(0, index - 1);
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = rows.length - 1;
    else return;
    event.preventDefault();
    buttons.current.get(rows[next]!.id)?.focus();
  };

  const restingHeadline = activeRange?.headline ?? suppliedHeadline ?? (observed ? total : null);
  const empty = !loading && (ranked.error !== null || total <= 0);
  // The placeholder is a few slices (or a few partial rings) that sweep in round the ring one
  // after another, or bloom out of it with depth. Sizes are fixed, never a reading.
  const skeletonSpan = semi ? ([-Math.PI / 2, Math.PI / 2] as const) : ([0, TAU] as const);
  const skeletonSlices = (
    rings
      ? [86, 66, 46].map((radius, index) => ({
          radius,
          width: 12,
          from: 0,
          to: [0.78, 0.6, 0.44][index]!,
          step: index * 2.5,
        }))
      : [0.38, 0.26, 0.2, 0.16].map((share, index, shares) => {
          const from = shares.slice(0, index).reduce((sum, value) => sum + value, 0);
          return {
            radius: (OUTER + inner) / 2,
            width: OUTER - inner,
            from,
            to: from + share,
            step: from * 12,
          };
        })
  ).map((slice) => {
    const gap = rings ? 0 : semi ? 0.025 : 0.015;
    const span = skeletonSpan[1] - skeletonSpan[0];
    return {
      ...slice,
      startAngle: skeletonSpan[0] + slice.from * span + (slice.from > 0 ? gap : 0),
      endAngle: skeletonSpan[0] + slice.to * span - (slice.to < 1 ? gap : 0),
    };
  });
  type SkeletonSlice = (typeof skeletonSlices)[number];
  const sliceStep = (slice: SkeletonSlice) =>
    ({ '--lilt-skeleton-step': slice.step, transformOrigin: '0 0' }) as CSSProperties;
  const sliceOutline = (slice: SkeletonSlice) =>
    d3Arc<Slice>()
      .innerRadius(slice.radius - slice.width / 2)
      .outerRadius(slice.radius + slice.width / 2)({ id: '', ...slice }) ?? '';
  const skeletonFlat = (mask: boolean) =>
    skeletonSlices.map((slice, index) => (
      <path
        key={index}
        className="lilt-radial-card__skeleton"
        d={arcLine(slice.radius, slice.startAngle, slice.endAngle)}
        strokeWidth={slice.width}
        pathLength={1}
        strokeDasharray={mask ? undefined : 1}
        data-skeleton={mask ? undefined : 'stroke'}
        style={mask ? undefined : sliceStep(slice)}
      />
    ));
  const skeletonDepth = () => (
    <g data-lilt-loading-depth="" transform={`scale(${DEPTH_SCALE})`} opacity={0.6}>
      <defs>
        <DropShadow id={`${depthId}-loading-shadow`} size={6} />
        {inner === 0 && !rings ? (
          <radialGradient
            id={`${depthId}-loading-dome`}
            gradientUnits="userSpaceOnUse"
            cx={-28}
            cy={-36}
            r={150}
          >
            {ramp('var(--lilt-skeleton)', [
              [0, 26],
              [0.42, 2],
              [1, -36],
            ])}
          </radialGradient>
        ) : null}
      </defs>
      <g filter={`url(#${depthId}-loading-shadow)`}>
        {skeletonSlices.map((slice, index) => (
          <g key={index} data-skeleton="bloom" style={sliceStep(slice)}>
            {inner === 0 && !rings ? (
              <path d={sliceOutline(slice)} fill={`url(#${depthId}-loading-dome)`} />
            ) : (
              tube(
                `loading-${index}`,
                sliceOutline(slice),
                slice.radius,
                slice.width,
                slice,
                'var(--lilt-skeleton)',
              )
            )}
          </g>
        ))}
      </g>
    </g>
  );

  return (
    <ChartCard
      motion={motionMode}
      className={['lilt-radial-card', className].filter(Boolean).join(' ')}
      style={style}
      aria-label={ariaLabel}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && pinned !== null && !event.defaultPrevented) {
          event.preventDefault();
          event.stopPropagation();
          setPinned(null);
        }
      }}
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
                {shareOf(active) ? ` · ${shareOf(active)}` : ''}
              </ChartCardCaption>
            ) : !empty && delta !== undefined ? (
              <ChartCardDelta value={delta} tone={deltaTone} />
            ) : null}
          </ChartCardValue>
        </ChartCardHeader>
      ) : null}

      {ranked.error ? (
        <StatusContent kind="error" message={ranked.error} />
      ) : empty ? (
        <EmptySlot
          block
          state={emptyState}
          shape="ring"
          message={data.length ? 'No values for this period' : undefined}
        />
      ) : (
        <div className="lilt-radial-card__body" data-variant={variant} data-legend={legend}>
          <div
            ref={glideRef}
            className="lilt-radial-card__graphic"
            data-lilt-glide=""
            role={legend === false ? 'group' : undefined}
            tabIndex={legend === false && !loading ? 0 : undefined}
            aria-label={
              legend === false
                ? `${ariaLabel}${!loading && centerRow ? `: ${centerRow.label}, ${centerRow.value === null ? 'No data' : format.value(centerRow.value)}` : ''}`
                : undefined
            }
            aria-describedby={legend === false && !loading ? `${depthId}-keys` : undefined}
            onFocus={
              legend === false ? () => setFocused(pinned ?? shownRows[0]?.id ?? null) : undefined
            }
            onBlur={legend === false ? () => setFocused(null) : undefined}
            onKeyDown={
              legend === false
                ? (event) => {
                    if (event.target !== event.currentTarget || loading || !shownRows.length)
                      return;
                    const index = Math.max(
                      0,
                      shownRows.findIndex((row) => row.id === (focused ?? pinned)),
                    );
                    let next = index;
                    if (event.key === 'ArrowRight' || event.key === 'ArrowDown')
                      next = Math.min(shownRows.length - 1, index + 1);
                    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp')
                      next = Math.max(0, index - 1);
                    else if (event.key === 'Home') next = 0;
                    else if (event.key === 'End') next = shownRows.length - 1;
                    else if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      const id = shownRows[index]!.id;
                      setPinned(pinned === id ? null : id);
                      return;
                    } else return;
                    event.preventDefault();
                    const id = shownRows[next]!.id;
                    setFocused(id);
                    if (pinned !== null) setPinned(id);
                  }
                : undefined
            }
          >
            <svg
              aria-hidden="true"
              className="lilt-radial-card__svg"
              viewBox={semi ? '-100 -100 200 104' : '-100 -100 200 200'}
              data-loading={skeletonShown || undefined}
              data-drawing={drawing || undefined}
            >
              <SkeletonExit leaving={skeletonLeaving} origin="center">
                <g>
                  {loading ? (
                    <SkeletonSheen
                      x={-100}
                      y={-100}
                      width={200}
                      height={semi ? 104 : 200}
                      reduced={reduced}
                      loadingStyle={loadingStyle}
                      depth={depth}
                      mask={
                        depth ? (
                          <g transform={`scale(${DEPTH_SCALE})`}>{skeletonFlat(true)}</g>
                        ) : (
                          skeletonFlat(true)
                        )
                      }
                    >
                      {depth ? skeletonDepth() : skeletonFlat(false)}
                    </SkeletonSheen>
                  ) : (
                    <g data-lilt-snap={snaps ? snaps % 2 : undefined} style={blurStyle(drawBlur)}>
                      {depth ? (
                        // Scaled a touch so the drop shadow stays inside the flat chart's box.
                        <g transform={`scale(${DEPTH_SCALE})`}>
                          {deep()}
                          {leavingLayer}
                        </g>
                      ) : (
                        <>
                          {flat()}
                          {leavingLayer}
                        </>
                      )}
                    </g>
                  )}
                </g>
              </SkeletonExit>
            </svg>
            {(variant === 'donut' || semi) && !skeletonShown && centerRow ? (
              <div
                className="lilt-radial-card__center"
                aria-hidden={center ? undefined : true}
                // The share settles in as the ring finishes drawing.
                style={
                  transition.initial && drawing
                    ? { opacity: Math.max(0, (progress - 0.55) / 0.45) }
                    : undefined
                }
              >
                {center ? (
                  center({
                    category: centerRow.label,
                    value: centerRow.value,
                    share: centerRow.value !== null && total > 0 ? centerRow.value / total : null,
                    active: centerRow === active,
                    pinned: centerRow.id === pinned,
                  })
                ) : (
                  <>
                    <strong>{shareOf(centerRow) ?? '—'}</strong>
                    <span>{centerRow.label}</span>
                  </>
                )}
              </div>
            ) : null}
          </div>

          {legend === false && !loading ? (
            <div className="lilt-chart__sr-only">
              <p id={`${depthId}-keys`}>
                Arrow keys inspect categories. Home and End jump to the ends. Enter or Space pins or
                releases. Escape clears the pin.
              </p>
              <table>
                <caption>{ariaLabel}</caption>
                <thead>
                  <tr>
                    <th scope="col">Category</th>
                    <th scope="col">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <th scope="row">{row.label}</th>
                      <td>{row.value === null ? 'No data' : format.value(row.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {legend === false ? null : legend !== 'list' ? (
            <ValueLegend
              className="lilt-radial-card__key"
              aria-label={`${ariaLabel} by category`}
              variant={cardLegendVariant(legend)}
              swatch={legendSwatch}
              items={rows.map((row) => ({
                id: row.id,
                label: row.label,
                color: row.value === null ? 'transparent' : colorOf(row.id),
                value: row.value,
                formattedValue: row.value === null ? 'No data' : format.value(row.value),
              }))}
              activeId={active?.id ?? null}
              selectedId={pinned}
              onHoverIdChange={setHovered}
              hiddenIds={hiddenIds}
              onHiddenIdsChange={changeHidden}
              renderValue={
                loading
                  ? () => <span className="lilt-card__skeleton lilt-card__skeleton--tile" />
                  : legend === 'inline'
                    ? (entry) => entry.formattedValue
                    : undefined
              }
            />
          ) : loading ? (
            <div className="lilt-radial-card__legend" aria-hidden="true">
              {Array.from({ length: Math.min(limit + 1, 6) }, (_, index) => (
                <div className="lilt-radial-card__skeleton-row" key={index}>
                  <span style={{ width: `${80 - index * 9}%` }} />
                </div>
              ))}
            </div>
          ) : (
            <ol className="lilt-radial-card__legend" aria-label={`${ariaLabel} by share`}>
              {rows.map((row, index) => {
                const isActive = row.id === active?.id;
                const rowShare = shareOf(row);
                const rowHidden = hiddenIds.includes(row.id);
                return (
                  <li
                    key={row.id}
                    data-active={isActive || undefined}
                    data-muted={(active && !isActive) || undefined}
                    data-hidden={rowHidden || undefined}
                  >
                    <button
                      type="button"
                      className="lilt-radial-card__row"
                      ref={(node) => {
                        if (node) buttons.current.set(row.id, node);
                        else buttons.current.delete(row.id);
                      }}
                      tabIndex={row.id === (focused ?? rows[0]?.id) ? 0 : -1}
                      aria-label={`${row.label}: ${row.value === null ? 'No data' : format.value(row.value)}${rowShare ? `, ${rowShare} of total` : ''}. ${rowHidden ? 'Hidden; press to show' : shownRows.length > 1 ? 'Shown; press to hide' : 'The only category shown'}`}
                      aria-pressed={!rowHidden}
                      onPointerEnter={() => !rowHidden && setHovered(row.id)}
                      onPointerLeave={() => setHovered(null)}
                      onFocus={() => !rowHidden && setFocused(row.id)}
                      onBlur={() => setFocused(null)}
                      onClick={() => toggleRow(row.id)}
                      onKeyDown={(event) => onKeyDown(event, index)}
                    >
                      <span
                        className="lilt-radial-card__swatch"
                        style={
                          row.value === null
                            ? undefined
                            : rowHidden
                              ? { boxShadow: `inset 0 0 0 1.5px ${colorOf(row.id)}` }
                              : { background: colorOf(row.id) }
                        }
                        data-missing={row.value === null || undefined}
                      />
                      <span className="lilt-radial-card__label">{row.label}</span>
                      <span className="lilt-radial-card__value">
                        {row.value === null ? (
                          <span className="lilt-list__missing">No data</span>
                        ) : (
                          format.value(row.value)
                        )}
                      </span>
                      <span className="lilt-radial-card__share">{rowShare ?? '—'}</span>
                    </button>
                    {rows.length > 1 ? (
                      <span className="lilt-chart__legend-actions">
                        {shownRows.length > 1 || rowHidden ? (
                          <button
                            type="button"
                            className="lilt-chart__legend-action"
                            aria-label={`Show only ${row.label}`}
                            onClick={() =>
                              changeHidden(
                                rows.map((other) => other.id).filter((id) => id !== row.id),
                              )
                            }
                          >
                            Only
                          </button>
                        ) : null}
                        {hiddenIds.length ? (
                          <button
                            type="button"
                            className="lilt-chart__legend-action"
                            aria-label="Show all categories"
                            onClick={() => changeHidden([])}
                          >
                            Show all
                          </button>
                        ) : null}
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      )}
    </ChartCard>
  );
}
