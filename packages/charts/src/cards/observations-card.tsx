'use client';

import { useEffect, useId, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { useCategoryState, useAcceptedRows } from '../interaction/use-category-state';
import { ValueLegend, cardLegendVariant } from '../interaction/value-legend';
import { SkeletonExit, useSkeletonExit } from '../lifecycle/skeleton-exit';
import { SkeletonSheen, SKELETON_INK } from '../lifecycle/skeleton-sheen';
import { SphereGradient } from '../primitives/depth-paint';
import { StatusContent } from '../lifecycle/status-content';
import { EmptySlot } from '../lifecycle/chart-empty';
import { useReducedMotion } from '../motion/use-chart-motion';
import { useDeparting } from '../motion/use-departing';
import { useChartWidth } from '../use-chart-width';
import type {
  CardLegend,
  ChartLegendSwatch,
  ChartLoadingStyle,
  ChartEmptyState,
  CategorySelection,
} from '../types';
import {
  ChartCard,
  ChartCardHeader,
  ChartCardTitle,
  ChartCardValue,
  ChartCardCaption,
  ChartCardRange,
  ChartCardDelta,
  type ChartCardProps,
} from './chart-card';
import { summarize, useCardFormat } from './format';
import { Prism, PrismSkeleton, prismOutline, type ObservationPrism } from './prism';

export type { ObservationPrism } from './prism';
import type { CardRange } from './cartesian-card';

/** Shared presentation options for observation-based cards. */
export interface ObservationsCardProps<Row> extends Omit<ChartCardProps, 'children'> {
  title?: string;
  header?: boolean;
  data?: readonly Row[];
  height?: number;
  depth?: boolean;
  color?: string;
  headline?: number;
  aggregate?: 'sum' | 'mean' | 'max';
  delta?: number;
  deltaTone?: 'default' | 'inverse' | 'neutral';
  range?: string;
  ranges?: readonly CardRange<Row>[];
  defaultRange?: string;
  valueFormat?: Intl.NumberFormatOptions;
  locale?: string;
  formatValue?: (value: number) => string;
  legend?: CardLegend | false;
  legendSwatch?: ChartLegendSwatch;
  loading?: boolean;
  loadingStyle?: ChartLoadingStyle;
  /**
   * What the card shows when the period has no data: `dots` (default), the chart's own `shape`,
   * your own element such as `<ChartEmpty>No visits yet</ChartEmpty>`, or `null` for nothing.
   */
  empty?: ChartEmptyState;
  onSelectionChange?: (selection: CategorySelection<Row | null> | null) => void;
  /** Optional consumer-owned readout, also available when the header is hidden. */
  renderReadout?: (selection: CategorySelection<Row | null> | null) => ReactNode;
}

export interface ObservationMark<Row> {
  id: string;
  label: string;
  datum: Row | null;
  value: number | null;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  group?: string;
  /** Neighbour mark IDs retained when this mark is inspected. */
  related?: readonly string[];
  text?: string;
  detail?: string;
  /** Extra context alongside the formatted numeric value; detail instead replaces it. */
  description?: string;
  shape?: 'dot' | 'bar' | 'tile' | 'prism' | 'point' | 'ribbon';
  /** Closed SVG silhouette in local coordinates; also used for exact pointer hit testing. */
  ribbon?: string;
  /** Degrees clockwise about the mark's bottom centre, so a bar can point away from a centre. */
  rotate?: number;
  /** Stacking order where hit areas overlap: higher layers sit in front. */
  layer?: number;
  /** 0 to 1: where the mark falls in the order the chart builds, for entry and skeleton waves. */
  wave?: number;
  /** `grow` rises from the mark's foot; `drop` falls into place from above. */
  enter?: 'grow' | 'drop';
  /** A square prism seen from above, filling the mark's box: its top sits `lift` above the floor. */
  prism?: ObservationPrism;
  missing?: boolean;
  future?: boolean;
}

export interface ObservationScene<Row> {
  marks: ObservationMark<Row>[];
  /** Keep every segment of an inspected series lit. */
  highlightGroup?: boolean;
  /** A family-specific resting summary, calculated from accepted data. */
  headline?: number | null;
  /** Shapes painted under the marks, in order; `group` mutes with the active mark's group. */
  paths?: {
    id: string;
    d: string;
    fill?: string;
    stroke?: string;
    group?: string;
    /** Endpoint IDs: this path stays lit when either endpoint is inspected. */
    related?: readonly string[];
    /** `rise` grows up from the shape's baseline; `draw` strokes along the path. */
    enter?: 'rise' | 'draw';
    /** 0 to 1: the order shapes build in. */
    wave?: number;
    /** The shape it grows from on entry, such as a surface laid flat on its floor. */
    from?: string;
    /** 0 lit to 1 in shade, so the placeholder keeps the scene's light. */
    shade?: number;
  }[];
  labels?: { x: number; y: number; text: string; anchor?: 'start' | 'middle' | 'end' }[];
  /** All readings, including observations with no visible area or position. */
  readings?: {
    id: string;
    label: string;
    value: number | null;
    detail?: string;
    description?: string;
  }[];
  groups?: { id: string; label: string; color: string; value: number | null }[];
  note?: string;
  error?: string;
  height?: number;
  width?: number;
}

const EMPTY: readonly never[] = [];
export const seriesColor = (index: number) => `var(--lilt-series-${(index % 6) + 1})`;
export const readField = (row: unknown, key: string): unknown =>
  (row as Record<string, unknown>)[key];
export const readNumber = (row: unknown, key: string): number | null => {
  const value = readField(row, key);
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
};

/** Private shell: every family uses the same inspection, card and skeleton lifecycle. */
export function ObservationsCard<Row>({
  title,
  header = true,
  data: suppliedData,
  height = 260,
  depth = false,
  headline,
  aggregate = 'sum',
  delta,
  deltaTone,
  range,
  ranges,
  defaultRange,
  valueFormat,
  locale,
  formatValue,
  legend = 'tiles',
  legendSwatch,
  loading = false,
  loadingStyle = 'shimmer',
  empty: emptyState = 'dots',
  onSelectionChange,
  renderReadout,
  motion = 'auto',
  className,
  color,
  layout,
  placeholder,
  family,
  scope,
  renderControls,
  ...frame
}: ObservationsCardProps<Row> & {
  family: string;
  scope?: string;
  renderControls?: (
    scene: ObservationScene<Row>,
    active: ObservationMark<Row> | undefined,
  ) => ReactNode;
  layout: (data: readonly Row[], width: number, height: number) => ObservationScene<Row>;
  placeholder: (width: number, height: number) => ObservationScene<Row>;
}) {
  const reduced = useReducedMotion(motion);
  const paintId = useId().replace(/:/g, '');
  const [rangeId, setRangeId] = useState(defaultRange ?? ranges?.[0]?.id);
  const activeRange = ranges?.find((item) => item.id === rangeId) ?? ranges?.[0];
  const activeDelta = activeRange ? activeRange.delta : delta;
  const incoming = activeRange?.data ?? suppliedData ?? EMPTY;
  const accepted = useAcceptedRows(
    loading ? null : incoming,
    loading ? 'loading' : 'ready',
    activeRange?.id,
  );
  const cold = loading && accepted.rows === null;
  const leaving = useSkeletonExit(cold, reduced);
  const busy = cold || leaving;
  const { ref, width: measuredWidth } = useChartWidth<HTMLDivElement>();
  // The viewport has 5px of outline/shadow room on either side; it isn't plot space.
  const width = measuredWidth ? Math.max(1, measuredWidth - 10) : 560;
  const plotHeight = Math.max(100, height);
  const data = accepted.rows ?? incoming;
  const scene = useMemo(() => layout(data, width, plotHeight), [layout, data, width, plotHeight]);
  // Marks that left with a period change shrink away where they were; each change of period
  // restarts the light motion blur over the plot.
  const departing = useDeparting(scene.marks, (mark) => mark.id, 420);
  // Marks travel only around a period change, never on a resize or a moving page.
  const sceneId = `${activeRange?.id ?? ''}|${scope ?? ''}`;
  const [periods, setPeriods] = useState({ id: sceneId, count: 0, moving: false });
  if (periods.id !== sceneId) setPeriods({ id: sceneId, count: periods.count + 1, moving: true });
  useEffect(() => {
    if (!periods.moving) return;
    const timer = window.setTimeout(
      () => setPeriods((current) => ({ ...current, moving: false })),
      900,
    );
    return () => window.clearTimeout(timer);
  }, [periods.moving, periods.count]);
  const skeleton = useMemo(() => placeholder(width, plotHeight), [placeholder, width, plotHeight]);
  // Shapes with a `from` first paint flat, then settle into place on the next frames so the
  // browser transitions between the two; reduced motion paints them settled. They wait out the
  // skeleton's exit too, or the settle would spend itself before the data view mounts.
  const morphs = !busy && !reduced && Boolean(scene.paths?.some((path) => path.from));
  const [settled, setSettled] = useState(!morphs);
  if (busy && settled && !reduced) setSettled(false);
  useEffect(() => {
    if (!morphs || settled) return;
    // Two frames lets the flat shape paint first; the timer covers pages that are not drawing.
    const settle = () => setSettled(true);
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(settle);
    });
    const timer = window.setTimeout(settle, 120);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [morphs, settled]);
  const selection = useCategoryState(
    scene.error ? [] : scene.marks,
    !busy && !loading,
    onSelectionChange,
    sceneId,
  );
  const active = scene.marks.find((mark) => mark.id === selection.active?.id);
  const format = useCardFormat({ valueFormat, locale, formatValue });
  const readings = scene.readings ?? scene.marks;
  const value =
    activeRange?.headline ??
    headline ??
    (scene.headline !== undefined
      ? scene.headline
      : summarize(
          readings.flatMap((row) => (row.value === null ? [] : [row.value])),
          aggregate,
        ));
  const name = frame['aria-label'] ?? title ?? `${family} chart`;
  const [hoverGroup, setHoverGroup] = useState<string | null>(null);
  const [pinnedGroup, setPinnedGroup] = useState<string | null>(null);
  const group = active?.group ?? hoverGroup ?? pinnedGroup;
  const visible = cold ? skeleton : scene;
  const sceneWidth = visible.width ?? width;
  const sceneHeight = visible.height ?? plotHeight;
  const showValue = (mark: { value: number | null; detail?: string; description?: string }) => {
    const value = mark.detail ?? (mark.value === null ? 'No data' : format.value(mark.value));
    return mark.description ? `${value} · ${mark.description}` : value;
  };
  const legendItems = cold ? (scene.groups ?? skeleton.groups) : scene.groups;
  const skeletonShapes = (painted: boolean) => [
    // Filled shapes (ridges) are part of the placeholder, back to front, rising from their floor.
    ...(skeleton.paths ?? []).flatMap((path, index, paths) =>
      path.fill
        ? [
            <path
              key={`path-${path.id}`}
              className={
                path.enter === 'rise'
                  ? 'lilt-observations-card__skeleton lilt-observations-card__skeleton-floor'
                  : 'lilt-observations-card__skeleton'
              }
              data-skeleton={path.enter === 'rise' ? 'rise' : undefined}
              d={path.d}
              fillRule="evenodd"
              style={
                {
                  '--lilt-skeleton-step': Math.round((path.wave ?? index / paths.length) * 8),
                  ...(painted
                    ? (() => {
                        const tone = `color-mix(in srgb, var(--lilt-skeleton) ${32 + (path.shade ?? path.wave ?? 0) * 40}%, var(--lilt-card-background, var(--lilt-surface)))`;
                        return { fill: tone, ...(path.stroke ? { stroke: tone } : {}) };
                      })()
                    : {}),
                } as CSSProperties
              }
            />,
          ]
        : [],
    ),
    // SVG paints in document order, so placeholder prisms go back to front by depth.
    ...[...skeleton.marks]
      .sort((a, b) => (a.prism?.depth ?? 0) - (b.prism?.depth ?? 0))
      .flatMap((mark, index) => {
        if (mark.shape === 'point') return [];
        const step = mark.wave !== undefined ? Math.round(mark.wave * 16) : index % 16;
        if (mark.ribbon)
          return [
            <g key={mark.id} transform={`translate(${mark.x} ${mark.y})`}>
              <path
                className="lilt-observations-card__skeleton"
                d={mark.ribbon}
                data-skeleton="grow"
                style={{ '--lilt-skeleton-step': step } as CSSProperties}
              />
            </g>,
          ];
        if (mark.prism)
          return [
            <g
              key={mark.id}
              className="lilt-observations-card__skeleton-floor"
              data-skeleton="rise"
              style={{ '--lilt-skeleton-step': step } as CSSProperties}
            >
              <PrismSkeleton prism={mark.prism} x={mark.x} y={mark.y} painted={painted} />
            </g>,
          ];
        const box = (
          <rect
            className={[
              'lilt-observations-card__skeleton',
              mark.enter === 'grow' ? 'lilt-observations-card__skeleton-floor' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            data-depth={(painted && depth) || undefined}
            data-skeleton={mark.enter === 'grow' ? 'rise' : undefined}
            style={
              {
                ...(mark.enter === 'grow' ? { '--lilt-skeleton-step': step } : {}),
                ...(painted && depth
                  ? { fill: `url(#${paintId}-${mark.shape === 'dot' ? 'sphere' : 'face'})` }
                  : {}),
              } as CSSProperties
            }
            x={mark.x}
            y={mark.y}
            width={mark.width}
            height={mark.height}
            rx={mark.shape === 'dot' ? mark.width / 2 : Math.min(4, mark.width / 2)}
          />
        );
        // A grown mark scales from its own foot, so any rotation sits on a wrapper around it.
        if (mark.enter === 'grow')
          return [
            <g
              key={mark.id}
              transform={
                mark.rotate
                  ? `rotate(${mark.rotate} ${mark.x + mark.width / 2} ${mark.y + mark.height})`
                  : undefined
              }
            >
              {box}
            </g>,
          ];
        return [
          <g
            key={mark.id}
            data-skeleton={mark.shape === 'bar' ? 'grow' : 'pop'}
            style={{ '--lilt-skeleton-step': step } as CSSProperties}
          >
            {box}
          </g>,
        ];
      }),
  ];

  return (
    <ChartCard
      {...frame}
      style={
        color
          ? {
              ...frame.style,
              ...Object.fromEntries(
                Array.from({ length: 6 }, (_, i) => [`--lilt-series-${i + 1}`, color]),
              ),
            }
          : frame.style
      }
      motion={motion}
      aria-label={name}
      className={['lilt-observations-card', `lilt-${family}-card`, className]
        .filter(Boolean)
        .join(' ')}
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
            value={active ? active.value : value}
            format={format.value}
            loading={busy}
            motion={motion}
          >
            {!busy && active ? (
              <ChartCardCaption>
                {active.label}
                {active.detail || active.description
                  ? ` · ${active.detail ?? active.description}`
                  : active.value === null
                    ? ' · No data'
                    : ''}
              </ChartCardCaption>
            ) : !busy && scene.marks.length > 0 && activeDelta !== undefined ? (
              <ChartCardDelta value={activeDelta} tone={deltaTone} />
            ) : null}
          </ChartCardValue>
        </ChartCardHeader>
      ) : null}
      {!busy && !scene.error ? renderControls?.(scene, active) : null}
      <div ref={ref} className="lilt-observations-card__viewport" aria-busy={loading || leaving}>
        <SkeletonExit leaving={leaving} origin={family === 'timeline' ? 'left' : 'center'}>
          <div
            className="lilt-observations-card__body"
            style={{ minHeight: sceneHeight }}
            data-motion={reduced ? 'none' : undefined}
          >
            {!cold && scene.error ? (
              <StatusContent kind="error" message={scene.error} />
            ) : !cold && scene.marks.length === 0 ? (
              <EmptySlot block state={emptyState} message={scene.note ?? undefined} />
            ) : (
              <div
                ref={selection.glideRef}
                className="lilt-observations-card__plot"
                data-lilt-glide=""
                data-depth={depth || undefined}
                data-loading={cold || undefined}
                data-lilt-snap={periods.count ? periods.count % 2 : undefined}
                data-moving={periods.moving || undefined}
                style={{ width: sceneWidth, height: sceneHeight }}
                role="group"
                aria-label={name}
              >
                <svg
                  width={sceneWidth}
                  height={sceneHeight}
                  className="lilt-observations-card__svg"
                  aria-hidden="true"
                >
                  {cold && depth ? (
                    <defs>
                      <SphereGradient id={`${paintId}-sphere`} color={SKELETON_INK} />
                      <linearGradient id={`${paintId}-face`} x1="0" x2="0.6" y1="0" y2="1">
                        <stop
                          offset="0"
                          stopColor={`color-mix(in oklab, ${SKELETON_INK}, white 24%)`}
                        />
                        <stop offset="0.55" stopColor={SKELETON_INK} />
                        <stop
                          offset="1"
                          stopColor={`color-mix(in oklab, ${SKELETON_INK}, black 12%)`}
                        />
                      </linearGradient>
                    </defs>
                  ) : null}
                  {!cold
                    ? scene.paths?.map((path) => (
                        <path
                          key={path.id}
                          className="lilt-observations-card__path"
                          d={path.from && !settled ? path.from : path.d}
                          fillRule="evenodd"
                          fill={path.fill ?? 'none'}
                          stroke={path.stroke}
                          pathLength={path.enter === 'draw' ? 1 : undefined}
                          data-enter={path.enter}
                          style={
                            {
                              '--lilt-path-delay': `${Math.round((path.wave ?? 0) * 420)}ms`,
                            } as CSSProperties
                          }
                          data-muted={
                            (active &&
                              path.related !== undefined &&
                              !path.related.includes(active.id)) ||
                            (path.group !== undefined && group != null && group !== path.group) ||
                            undefined
                          }
                        />
                      ))
                    : null}
                  {!cold ? (
                    scene.labels?.map((label, index) => (
                      <text
                        key={index}
                        x={label.x}
                        y={label.y}
                        textAnchor={label.anchor ?? 'start'}
                      >
                        {label.text}
                      </text>
                    ))
                  ) : (
                    <SkeletonSheen
                      width={sceneWidth}
                      height={sceneHeight}
                      loadingStyle={loadingStyle}
                      reduced={reduced}
                      depth={depth}
                      mask={skeletonShapes(false)}
                    >
                      {skeletonShapes(true)}
                    </SkeletonSheen>
                  )}
                </svg>
                {!cold
                  ? departing.map((mark) => (
                      <span
                        key={`departing-${mark.id}`}
                        className="lilt-observations-card__mark"
                        data-shape={mark.shape ?? 'tile'}
                        data-departing=""
                        aria-hidden="true"
                        style={
                          {
                            left: mark.x,
                            top: mark.y,
                            width: mark.width,
                            height: mark.height,
                            ...(mark.rotate ? { rotate: `${mark.rotate}deg` } : {}),
                            '--lilt-observation-color': mark.color || color || seriesColor(0),
                          } as CSSProperties
                        }
                      />
                    ))
                  : null}
                {!cold
                  ? scene.marks.map((mark, index) => (
                      <button
                        key={mark.id}
                        {...selection.bind(mark.id, index)}
                        type="button"
                        className="lilt-observations-card__mark"
                        data-shape={mark.shape ?? 'tile'}
                        data-enter={mark.enter}
                        data-missing={mark.missing || undefined}
                        data-future={mark.future || undefined}
                        data-active={active?.id === mark.id || undefined}
                        data-muted={
                          (active
                            ? scene.highlightGroup && active.group !== undefined
                              ? active.group !== mark.group
                              : active.id !== mark.id && !active.related?.includes(mark.id)
                            : group !== null && mark.group !== group) || undefined
                        }
                        aria-label={`${mark.label}: ${showValue(mark)}`}
                        style={
                          {
                            left: mark.x,
                            top: mark.y,
                            width: mark.width,
                            height: mark.height,
                            '--lilt-observation-color': mark.color || color || seriesColor(0),
                            '--lilt-observation-delay':
                              mark.wave !== undefined
                                ? `${Math.round(mark.wave * 900)}ms`
                                : `${Math.min(index, 16) * 18}ms`,
                            // Colour changes ripple diagonally from the top left.
                            '--lilt-observation-ripple': `${Math.round(((mark.x + mark.y) / Math.max(1, sceneWidth + sceneHeight)) * 320)}ms`,
                            ...(mark.rotate ? { rotate: `${mark.rotate}deg` } : {}),
                            ...(mark.layer !== undefined ? { zIndex: mark.layer } : {}),
                            ...(mark.ribbon ? { clipPath: `path('${mark.ribbon}')` } : {}),
                            ...(mark.prism
                              ? {
                                  zIndex: mark.prism.depth,
                                  // Hit-test the silhouette, not the box around it.
                                  clipPath: `polygon(${prismOutline(mark.prism)
                                    .map(([x, y]) => `${x}px ${y}px`)
                                    .join(', ')})`,
                                  '--lilt-prism-lift': `${mark.prism.lift}px`,
                                  '--lilt-prism-delay': `${Math.round(mark.prism.wave * 360)}ms`,
                                }
                              : {}),
                          } as CSSProperties
                        }
                      >
                        {mark.ribbon ? (
                          <svg
                            width={mark.width}
                            height={mark.height}
                            aria-hidden="true"
                            className="lilt-observations-card__ribbon"
                          >
                            <defs>
                              <linearGradient
                                id={`${paintId}-ribbon-${index}`}
                                x1="0"
                                y1="0"
                                x2="0.2"
                                y2="1"
                              >
                                <stop
                                  offset="0"
                                  stopColor="color-mix(in oklab, var(--lilt-observation-color), white 24%)"
                                />
                                <stop offset="0.38" stopColor="var(--lilt-observation-color)" />
                                <stop
                                  offset="1"
                                  stopColor="color-mix(in oklab, var(--lilt-observation-color), black 20%)"
                                />
                              </linearGradient>
                            </defs>
                            <path
                              d={mark.ribbon}
                              className="lilt-observations-card__ribbon-face"
                              style={{ fill: `url(#${paintId}-ribbon-${index})` }}
                            />
                          </svg>
                        ) : mark.prism ? (
                          <Prism prism={mark.prism} />
                        ) : mark.text ? (
                          <span aria-hidden="true">{mark.text}</span>
                        ) : null}
                      </button>
                    ))
                  : null}
              </div>
            )}
            {scene.note ? (
              <div
                className="lilt-observations-card__note"
                aria-hidden={cold || undefined}
                style={cold ? { visibility: 'hidden' } : undefined}
              >
                {scene.note}
              </div>
            ) : null}
            {legendItems?.length && legend !== false ? (
              <div className="lilt-observations-card__legend" aria-hidden={cold || undefined}>
                <ValueLegend
                  items={legendItems.map((item) => ({
                    ...item,
                    color: cold ? 'var(--lilt-skeleton)' : item.color,
                    value: cold ? null : item.value,
                    formattedValue:
                      cold || item.value === null ? 'No data' : format.value(item.value),
                  }))}
                  variant={cardLegendVariant(legend)}
                  swatch={legendSwatch}
                  activeId={group}
                  selectedId={pinnedGroup}
                  onHoverIdChange={cold ? undefined : setHoverGroup}
                  onSelectedIdChange={cold ? undefined : setPinnedGroup}
                  renderValue={
                    cold
                      ? () => <span className="lilt-card__skeleton lilt-card__skeleton--tile" />
                      : undefined
                  }
                />
              </div>
            ) : null}
          </div>
        </SkeletonExit>
      </div>
      {loading && !busy ? (
        <span className="lilt-observations-card__note" role="status">
          Updating…
        </span>
      ) : null}
      {renderReadout?.(
        active
          ? {
              id: active.id,
              row: active.datum,
              value: active.value,
              pinned: selection.pinned === active.id,
            }
          : null,
      )}
      {!busy ? (
        <table className="lilt-chart__sr-only">
          <caption>{name}</caption>
          <thead>
            <tr>
              <th scope="col">Observation</th>
              <th scope="col">Value</th>
            </tr>
          </thead>
          <tbody>
            {readings.map((row) => (
              <tr key={row.id}>
                <th scope="row">{row.label}</th>
                <td>{showValue(row)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </ChartCard>
  );
}
