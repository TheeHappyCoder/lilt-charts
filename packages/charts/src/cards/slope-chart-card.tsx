'use client';

import {
  useId,
  useCallback,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import { AnimatePresence, m } from 'motion/react';
import {
  slopeDomain,
  slopeRows,
  slopeTotals,
  spreadLabels,
  type SlopeOrder,
  type SlopeRow,
} from '../engine/slope';
import { useReducedMotion } from '../motion/use-chart-motion';
import { entranceStagger } from '../motion/entrance';
import { StatusContent } from '../lifecycle/status-content';
import { EmptySlot } from '../lifecycle/chart-empty';
import { SkeletonExit, useSkeletonExit, type SkeletonExitOrigin } from '../lifecycle/skeleton-exit';
import { SkeletonSheen, SKELETON_INK } from '../lifecycle/skeleton-sheen';
import { useChartWidth } from '../use-chart-width';
import type {
  ChartLoadingStyle,
  ChartEmptyState,
  ChartMotion,
  ChartPalette,
  ChartStyle,
  ChartSurface,
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
import type { AnimatedNumberVariant } from '../motion/animated-number';
import { glideTarget, useTouchGlide } from '../interaction/use-touch-glide';
import { DropShadow, SphereGradient, shade, tubeLayers } from '../primitives/depth-paint';

export type { SlopeOrder } from '../engine/slope';

export interface SlopeChartCardProps<Row, Key extends NumericKey<Row>> {
  /** Optional visible title. Use aria-label to name an embedded chart. */
  title?: string;
  /** Show the header, including headline and period controls. Defaults to true. */
  header?: boolean;
  /** Accessible name, independent of the visible title. */
  'aria-label'?: string;
  /** One row per category with both measurements. Omit when `ranges` supplies the data. */
  data?: readonly Row[];
  /** Text field that names each row. Names must be unique. */
  category: TextKey<Row>;
  /** Numeric field with the earlier value, e.g. last year. */
  from: Key;
  /** Numeric field with the later value, e.g. this year. */
  to: Key;
  /** Names the earlier measurement. Defaults to the `from` key. */
  fromLabel?: string;
  /** Names the later measurement. Defaults to the `to` key. */
  toLabel?: string;
  /**
   * `slope` (default) joins each category's two values across two columns; `dumbbell` lists
   * categories as rows with both values on one shared scale.
   */
  variant?: 'slope' | 'dumbbell';
  /**
   * Draws each change as a lit tube between two spheres, with a soft shadow. Ends stay exactly on
   * their values.
   */
  depth?: boolean;
  /** `change` (default) puts the largest gain first, `to` the largest later value, `input` keeps your order. */
  sort?: SlopeOrder;
  /**
   * How the headline and its change summarize categories: `sum` (default) for counts and money,
   * `mean` for rates and shares.
   */
  aggregate?: 'sum' | 'mean';
  /** Resting headline. Defaults to the later values summarized with `aggregate`. */
  headline?: number;
  /**
   * Fractional change for the chip. Defaults to the change in total across categories measured
   * at both ends.
   */
  delta?: number;
  /** Direction is not desirability. Use `inverse` when a decrease is good, `neutral` for neither. */
  deltaTone?: 'default' | 'inverse' | 'neutral';
  /** Static period label, e.g. "2025 → 2026". */
  range?: string;
  /** Period select. Each range replaces data, delta and headline. */
  ranges?: readonly CardRange<Row>[];
  defaultRange?: string;
  /** One color for every category. By default rises and falls take the positive and negative colors. */
  color?: string;
  /** Plot height in pixels for the slope variant. Defaults to 260. */
  height?: number;
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

type Tone = 'positive' | 'negative' | 'neutral';
type DeltaTone = 'default' | 'inverse' | 'neutral';

/** Props every category mark carries, whether it is a list button or an SVG group. */
interface RowHandlers {
  ref: (node: HTMLElement | SVGGElement | null) => void;
  tabIndex: number;
  'aria-label': string;
  'aria-pressed': boolean;
  'data-active': boolean | undefined;
  'data-muted': boolean | undefined;
  'data-tone': Tone | undefined;
  'data-glide-id': string;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
  onFocus: () => void;
  onBlur: () => void;
  onClick: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement | SVGGElement>) => void;
}

/** A row that leaves with a period change softens and fades where it was. */
const departure = { opacity: 0, filter: 'blur(3px)', transition: { duration: 0.32 } };

const EMPTY: readonly never[] = [];
/** Approximate advance of a 12px Manrope-like character, used to size label columns. */
const CHAR = 6.6;
const LABEL_GAP = 17;

function toneOf(change: number | null, deltaTone: DeltaTone): Tone {
  if (change === null || change === 0 || deltaTone === 'neutral') return 'neutral';
  return change > 0 === (deltaTone !== 'inverse') ? 'positive' : 'negative';
}

const ratioText = (ratio: number | null) =>
  ratio === null ? '' : `${ratio >= 0 ? '+' : '−'}${Math.abs(ratio * 100).toFixed(1)}%`;

/**
 * Two measurements per category, such as last year and this year. The slope variant shows who
 * rose and who fell at a glance; the dumbbell variant lists the gap for each category. Hovering a
 * category reads its later value and change in the headline; click pins it, and the arrow keys
 * move through categories.
 */
export function SlopeChartCard<Row, const Key extends NumericKey<Row>>({
  title,
  header = true,
  'aria-label': ariaLabel = title || 'Slope chart',
  data: suppliedData,
  category,
  from,
  to,
  fromLabel = from,
  toLabel = to,
  variant = 'slope',
  depth = false,
  sort = 'change',
  aggregate = 'sum',
  headline: suppliedHeadline,
  delta: suppliedDelta,
  deltaTone = 'default',
  range,
  ranges,
  defaultRange,
  color,
  height = 260,
  valueFormat,
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
}: SlopeChartCardProps<Row, Key>): ReactElement {
  const reduced = useReducedMotion(motionMode);
  const skeletonLeaving = useSkeletonExit(loading, reduced);
  const format = useCardFormat({ valueFormat, locale, formatValue: suppliedFormatValue });
  const [rangeId, setRangeId] = useState(defaultRange ?? ranges?.[0]?.id);
  const activeRange = ranges?.find((item) => item.id === rangeId) ?? ranges?.[0];
  const data = activeRange?.data ?? suppliedData ?? (EMPTY as readonly Row[]);

  const parsed = useMemo(() => {
    try {
      return { rows: slopeRows(data, category, from, to, sort), error: null };
    } catch (cause) {
      return { rows: [], error: cause instanceof Error ? cause.message : 'Invalid rows.' };
    }
  }, [data, category, from, to, sort]);
  const rows = parsed.rows;
  const totals = useMemo(() => slopeTotals(rows, aggregate), [rows, aggregate]);
  const domain = useMemo(() => slopeDomain(rows), [rows]);

  const [hovered, setHovered] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const activeId = pinned ?? focused ?? hovered;
  const active = rows.find((row) => row.id === activeId) ?? null;
  const items = useRef(new Map<string, HTMLElement | SVGGElement>());
  const glideRef = useTouchGlide<string>({
    resolve: glideTarget,
    onGlide: setHovered,
    onLift: (id) => id !== null && setPinned(id),
    pinned: pinned !== null,
    onRelease: () => setPinned(null),
    disabled: loading,
  });

  const restingHeadline = activeRange?.headline ?? suppliedHeadline ?? totals.to;
  const delta = activeRange ? (activeRange.delta ?? totals.ratio) : (suppliedDelta ?? totals.ratio);
  const valueText = (value: number | null) => (value === null ? 'No data' : format.value(value));
  const describe = (row: SlopeRow) =>
    `${row.label}: ${fromLabel} ${valueText(row.from)}, ${toLabel} ${valueText(row.to)}${
      row.ratio !== null ? `, ${ratioText(row.ratio)}` : ''
    }`;

  const onKeyDown = (event: KeyboardEvent<HTMLElement | SVGGElement>, index: number) => {
    let next = index;
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight')
      next = Math.min(rows.length - 1, index + 1);
    else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') next = Math.max(0, index - 1);
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = rows.length - 1;
    else if (event.key === 'Escape') {
      event.preventDefault();
      setPinned(null);
      return;
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const id = rows[index]!.id;
      setPinned((current) => (current === id ? null : id));
      return;
    } else return;
    event.preventDefault();
    items.current.get(rows[next]!.id)?.focus();
  };
  const handlers = (row: SlopeRow, index: number): RowHandlers => ({
    ref: (node: HTMLElement | SVGGElement | null) => {
      if (node) items.current.set(row.id, node);
      else items.current.delete(row.id);
    },
    tabIndex: row.id === (focused ?? rows[0]?.id) ? 0 : -1,
    'aria-label': describe(row),
    'aria-pressed': pinned === row.id,
    'data-active': row.id === active?.id || undefined,
    'data-muted': (active !== null && row.id !== active.id) || undefined,
    'data-tone': color ? undefined : toneOf(row.change, deltaTone),
    'data-glide-id': row.id,
    onPointerEnter: () => setHovered(row.id),
    onPointerLeave: () => setHovered(null),
    onFocus: () => setFocused(row.id),
    onBlur: () => setFocused(null),
    onClick: () => setPinned((current) => (current === row.id ? null : row.id)),
    onKeyDown: (event: KeyboardEvent<HTMLElement | SVGGElement>) => onKeyDown(event, index),
  });

  // Changes land on Lilt's spring, kept gentle so an end never overshoots its column.
  const transition = reduced
    ? { duration: 0 }
    : ({ type: 'spring', duration: 0.6, bounce: 0.12 } as const);
  const cardStyle = color ? ({ ...style, '--lilt-slope-color': color } as ChartStyle) : style;
  const empty = rows.length === 0 || parsed.error;

  return (
    <ChartCard
      motion={motionMode}
      className={['lilt-slope', className].filter(Boolean).join(' ')}
      style={cardStyle}
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
            value={active ? active.to : restingHeadline}
            format={format.value}
            loading={loading}
            motion={motionMode}
          >
            {loading ? null : active ? (
              <>
                {active.ratio !== null ? (
                  <ChartCardDelta value={active.ratio} tone={deltaTone} />
                ) : null}
                <ChartCardCaption>{active.label}</ChartCardCaption>
              </>
            ) : (
              <>
                {delta !== null && delta !== undefined ? (
                  <ChartCardDelta value={delta} tone={deltaTone} />
                ) : null}
                <ChartCardCaption>vs {fromLabel}</ChartCardCaption>
              </>
            )}
          </ChartCardValue>
        </ChartCardHeader>
      ) : null}

      {variant === 'dumbbell' && !loading && !skeletonLeaving && !empty ? (
        <div className="lilt-slope__key" aria-hidden="true">
          <span data-end="from">{fromLabel}</span>
          <span data-end="to">{toLabel}</span>
        </div>
      ) : null}

      {/* The rows' skeleton freezes and sinks toward the left, where each line starts. */}
      <SkeletonExit leaving={skeletonLeaving} origin="left">
        {loading ? (
          <SlopeSkeleton
            height={height}
            variant={variant}
            depth={depth}
            reduced={reduced}
            loadingStyle={loadingStyle}
          />
        ) : parsed.error ? (
          <StatusContent kind="error" message={parsed.error} />
        ) : empty ? (
          <EmptySlot block state={emptyState} shape="wave" />
        ) : variant === 'dumbbell' ? (
          <ol
            ref={glideRef}
            className="lilt-slope__rows"
            data-depth={depth || undefined}
            data-lilt-glide=""
            aria-label={`${ariaLabel}, ${fromLabel} to ${toLabel}`}
          >
            <AnimatePresence initial={false}>
              {rows.map((row, index) => {
                const at = (value: number) => ((value - domain[0]) / (domain[1] - domain[0])) * 100;
                const start = row.from === null ? null : at(row.from);
                const end = row.to === null ? null : at(row.to);
                const delay = reduced ? 0 : entranceStagger(index, rows.length, 140) / 1000;
                return (
                  <m.li key={row.id} exit={departure}>
                    <button type="button" className="lilt-slope__row" {...handlers(row, index)}>
                      <span className="lilt-slope__label">{row.label}</span>
                      <span className="lilt-slope__track">
                        {start !== null && end !== null ? (
                          <m.span
                            className="lilt-slope__gap"
                            initial={reduced ? false : { left: `${start}%`, width: '0%' }}
                            animate={{
                              left: `${Math.min(start, end)}%`,
                              width: `${Math.abs(end - start)}%`,
                            }}
                            transition={{ ...transition, delay }}
                          />
                        ) : null}
                        {start !== null ? (
                          <m.span
                            className="lilt-slope__dot"
                            data-end="from"
                            initial={false}
                            animate={{ left: `${start}%` }}
                            transition={transition}
                          />
                        ) : null}
                        {end !== null ? (
                          <m.span
                            className="lilt-slope__dot"
                            data-end="to"
                            initial={reduced || start === null ? false : { left: `${start}%` }}
                            animate={{ left: `${end}%` }}
                            transition={{ ...transition, delay }}
                          />
                        ) : null}
                      </span>
                      <span className="lilt-slope__value">
                        {row.to === null ? (
                          <span className="lilt-list__missing">No data</span>
                        ) : (
                          format.value(row.to)
                        )}
                      </span>
                      <span className="lilt-slope__change">{ratioText(row.ratio) || '—'}</span>
                    </button>
                  </m.li>
                );
              })}
            </AnimatePresence>
          </ol>
        ) : (
          <SlopePlot
            rows={rows}
            domain={domain}
            height={height}
            fromLabel={fromLabel}
            toLabel={toLabel}
            title={ariaLabel}
            format={format.value}
            reduced={reduced}
            handlers={handlers}
            glideRef={glideRef}
            depth={depth}
          />
        )}
      </SkeletonExit>
    </ChartCard>
  );
}

function SlopeSkeleton({
  height,
  variant,
  depth,
  reduced,
  loadingStyle,
  'data-skeleton-leaving': leaving,
}: {
  height: number;
  variant: 'slope' | 'dumbbell';
  depth: boolean;
  reduced: boolean;
  loadingStyle: ChartLoadingStyle;
  /** Set by SkeletonExit while the skeleton leaves. */
  'data-skeleton-leaving'?: SkeletonExitOrigin;
}) {
  const { ref, width: measuredWidth } = useChartWidth<HTMLDivElement>();
  const width = measuredWidth || 320;
  const id = `lilt-slope-loading-${useId().replace(/:/g, '')}`;
  const lines = [0.18, 0.34, 0.5, 0.67, 0.82].map((value, index) => {
    const dumbbell = variant === 'dumbbell';
    return {
      x1: width * (dumbbell ? 0.16 + index * 0.03 : 0.2),
      x2: width * (dumbbell ? 0.48 + index * 0.065 : 0.8),
      y1: height * value,
      y2: height * (dumbbell ? value : value - 0.06 + (index % 2) * 0.14),
    };
  });
  // Each row draws the way it reads: the start point pops, the line runs to the end, and the
  // end point lands as the line arrives. Rows follow one another down the plot.
  const at = (step: number) => ({ '--lilt-skeleton-step': step }) as CSSProperties;
  const shapes = (mask: boolean) =>
    lines.map(({ x1, x2, y1, y2 }, index) => {
      const step = index * 2;
      const draw = mask
        ? {}
        : ({
            'data-skeleton': 'stroke',
            pathLength: 1,
            strokeDasharray: 1,
            style: at(step + 1),
          } as const);
      const dot = (cx: number, cy: number, r: number, delay: number) => (
        <g data-skeleton={mask ? undefined : 'pop'} style={mask ? undefined : at(delay)}>
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill={mask ? 'white' : depth ? `url(#${id})` : SKELETON_INK}
          />
        </g>
      );
      return (
        <g key={index}>
          {depth && !mask ? (
            tubeLayers(5).map((layer, layerIndex) => (
              <path
                key={layerIndex}
                d={`M${x1},${y1}L${x2},${y2}`}
                fill="none"
                transform={layer.transform}
                stroke={shade(SKELETON_INK, layer.amount)}
                strokeWidth={layer.strokeWidth}
                {...draw}
              />
            ))
          ) : (
            <line
              x1={x1}
              x2={x2}
              y1={y1}
              y2={y2}
              stroke={mask ? 'white' : SKELETON_INK}
              strokeWidth={2.5}
              {...draw}
            />
          )}
          {dot(x1, y1, depth ? 5 : 4, step)}
          {dot(x2, y2, depth ? 6 : 4.5, step + 9)}
        </g>
      );
    });
  return (
    <div
      ref={ref}
      className="lilt-slope__plot"
      style={{ height }}
      aria-hidden="true"
      data-skeleton-leaving={leaving}
    >
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {depth ? (
          <defs>
            <SphereGradient id={id} color={SKELETON_INK} />
          </defs>
        ) : null}
        <SkeletonSheen
          width={width}
          height={height}
          reduced={reduced}
          loadingStyle={loadingStyle}
          depth={depth}
          mask={shapes(true)}
        >
          {shapes(false)}
        </SkeletonSheen>
      </svg>
    </div>
  );
}

interface SlopePlotProps {
  rows: readonly SlopeRow[];
  domain: readonly [number, number];
  height: number;
  fromLabel: string;
  toLabel: string;
  title: string;
  format: (value: number) => string;
  reduced: boolean;
  handlers: (row: SlopeRow, index: number) => RowHandlers;
  glideRef: (node: Element | null) => void;
  depth: boolean;
}

function SlopePlot({
  rows,
  domain,
  height,
  fromLabel,
  toLabel,
  title,
  format,
  reduced,
  handlers,
  glideRef,
  depth,
}: SlopePlotProps) {
  const { ref, width } = useChartWidth<HTMLDivElement>();
  const sphereId = `lilt-slope-${useId().replace(/:/g, '')}`;
  const ink = 'var(--lilt-slope-ink)';
  const plotRef = useCallback(
    (node: HTMLDivElement | null) => {
      ref.current = node;
      glideRef(node);
    },
    [glideRef, ref],
  );
  const top = 30;
  const bottom = height - 10;
  const y = (value: number) =>
    bottom - ((value - domain[0]) / (domain[1] - domain[0])) * (bottom - top);
  const text = (value: number | null) => (value === null ? 'No data' : format(value));

  // Size the label columns from their text, dropping the secondary numbers when space is short.
  const fullLeft = Math.max(...rows.map((row) => row.label.length + 1 + text(row.from).length));
  const fullRight = Math.max(
    ...rows.map((row) => text(row.to).length + 1 + ratioText(row.ratio).length),
  );
  const compact = (fullLeft + fullRight) * CHAR + 48 > width * 0.72;
  const leftChars = compact ? Math.max(...rows.map((row) => row.label.length)) : fullLeft;
  const rightChars = compact ? Math.max(...rows.map((row) => text(row.to).length)) : fullRight;
  const left = Math.min(width * 0.46, leftChars * CHAR + 24);
  const right = Math.max(left + 40, width - Math.min(width * 0.36, rightChars * CHAR + 24));

  const fromPositions = rows.map((row) => (row.from === null ? bottom : y(row.from)));
  const toPositions = rows.map((row) => (row.to === null ? bottom : y(row.to)));
  const fromLabels = spreadLabels(fromPositions, LABEL_GAP, top + 6, bottom);
  const toLabels = spreadLabels(toPositions, LABEL_GAP, top + 6, bottom);
  // Changes land on Lilt's spring, kept gentle so an end never overshoots its column.
  const transition = reduced
    ? { duration: 0 }
    : ({ type: 'spring', duration: 0.65, bounce: 0.12 } as const);

  return (
    <div ref={plotRef} className="lilt-slope__plot" data-lilt-glide="" style={{ height }}>
      {width > 0 ? (
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          role="group"
          aria-label={`${title}, ${fromLabel} to ${toLabel}`}
          data-depth={depth || undefined}
        >
          {depth ? (
            <defs>
              <DropShadow
                id={`${sphereId}-shadow`}
                size={2.5}
                region={{ x: 0, y: 0, width, height }}
              />
            </defs>
          ) : null}
          <line className="lilt-slope__axis" x1={left} x2={left} y1={top - 6} y2={bottom} />
          <line className="lilt-slope__axis" x1={right} x2={right} y1={top - 6} y2={bottom} />
          <text className="lilt-slope__column" x={left} y={12} textAnchor="middle">
            {fromLabel}
          </text>
          <text className="lilt-slope__column" x={right} y={12} textAnchor="middle">
            {toLabel}
          </text>
          <AnimatePresence initial={false}>
            {rows.map((row, index) => {
              const y1 = fromPositions[index]!;
              const y2 = toPositions[index]!;
              const delay = reduced ? 0 : entranceStagger(index, rows.length, 160) / 1000;
              return (
                <m.g
                  key={row.id}
                  className="lilt-slope__line"
                  role="button"
                  exit={departure}
                  {...handlers(row, index)}
                >
                  {depth ? (
                    // Inside the row, so the gradient takes the row's own rise or fall color.
                    <defs>
                      <SphereGradient id={`${sphereId}-${index}`} color={ink} />
                    </defs>
                  ) : null}
                  {row.from !== null && row.to !== null ? (
                    <>
                      <line className="lilt-slope__hit" x1={left} x2={right} y1={y1} y2={y2} />
                      {depth ? (
                        // A lit tube: the same line in layers, each moving with the stroke.
                        <g filter={`url(#${sphereId}-shadow)`} pointerEvents="none">
                          {tubeLayers(5).map((layer, layerIndex) => (
                            <m.line
                              key={layerIndex}
                              transform={layer.transform}
                              strokeLinecap="round"
                              style={{
                                stroke: shade(ink, layer.amount),
                                strokeWidth: layer.strokeWidth,
                              }}
                              initial={reduced ? false : { x2: left, y2: y1, x1: left, y1 }}
                              animate={{ x1: left, y1, x2: right, y2 }}
                              transition={{ ...transition, delay }}
                            />
                          ))}
                        </g>
                      ) : (
                        <m.line
                          className="lilt-slope__stroke"
                          initial={reduced ? false : { x2: left, y2: y1, x1: left, y1 }}
                          animate={{ x1: left, y1, x2: right, y2 }}
                          transition={{ ...transition, delay }}
                        />
                      )}
                    </>
                  ) : null}
                  {row.from !== null ? (
                    <m.circle
                      className="lilt-slope__dot-mark"
                      data-end="from"
                      r={depth ? 5 : 4}
                      style={depth ? { fill: `url(#${sphereId}-${index})` } : undefined}
                      initial={false}
                      animate={{ cx: left, cy: y1 }}
                      transition={transition}
                    />
                  ) : null}
                  {row.to !== null ? (
                    <m.circle
                      className="lilt-slope__dot-mark"
                      data-end="to"
                      r={depth ? 6 : 4.5}
                      style={depth ? { fill: `url(#${sphereId}-${index})` } : undefined}
                      initial={reduced || row.from === null ? false : { cx: left, cy: y1 }}
                      animate={{ cx: right, cy: y2 }}
                      transition={{ ...transition, delay }}
                    />
                  ) : null}
                  <m.text
                    className="lilt-slope__label"
                    x={left - 10}
                    textAnchor="end"
                    dominantBaseline="middle"
                    initial={false}
                    animate={{ attrY: fromLabels[index]! }}
                    transition={transition}
                  >
                    <tspan className="lilt-slope__name">{row.label}</tspan>
                    {compact ? null : (
                      <tspan className="lilt-slope__number" dx={6}>
                        {text(row.from)}
                      </tspan>
                    )}
                  </m.text>
                  <m.text
                    className="lilt-slope__label"
                    x={right + 10}
                    dominantBaseline="middle"
                    initial={false}
                    animate={{ attrY: toLabels[index]! }}
                    transition={transition}
                  >
                    <tspan className="lilt-slope__end">{text(row.to)}</tspan>
                    {compact || row.ratio === null ? null : (
                      <tspan className="lilt-slope__ratio" dx={6}>
                        {ratioText(row.ratio)}
                      </tspan>
                    )}
                  </m.text>
                </m.g>
              );
            })}
          </AnimatePresence>
        </svg>
      ) : null}
    </div>
  );
}
