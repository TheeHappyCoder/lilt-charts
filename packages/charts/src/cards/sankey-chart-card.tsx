'use client';

import { SkeletonExit, useSkeletonExit } from '../lifecycle/skeleton-exit';
import { SkeletonSheen, SKELETON_INK } from '../lifecycle/skeleton-sheen';
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  type MouseEvent,
} from 'react';
import {
  layoutSankey,
  mixSankeyLayout,
  normalizeSankey,
  type ConservationPolicy,
  type SankeyGraph,
  type SankeyLink,
  type SankeyNode,
} from '../engine/sankey';
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
} from '../types';
import { useChartWidth } from '../use-chart-width';
import { glideTarget, useTouchGlide } from '../interaction/use-touch-glide';
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
import { useCardFormat } from './format';
import type { NumericKey, TextKey } from './keys';
import type { AnimatedNumberVariant } from '../motion/animated-number';
import { prismFaces } from '../engine/depth';
import { prismShades, shade, tubeLayers } from '../primitives/depth-paint';

export interface SankeyChartCardProps<Row, Key extends NumericKey<Row>> {
  /** Optional visible title. Use aria-label to name an embedded chart. */
  title?: string;
  /** Show the header, including headline and period controls. Defaults to true. */
  header?: boolean;
  /** Accessible name, independent of the visible title. */
  'aria-label'?: string;
  /** One row per flow between two steps. Omit when `ranges` supplies the data. */
  data?: readonly Row[];
  /** Text field naming the step a flow leaves. */
  source: TextKey<Row>;
  /** Text field naming the step a flow reaches. */
  target: TextKey<Row>;
  /** How much moves along the flow. `null` means it wasn't measured and isn't drawn. */
  value: Key;
  /**
   * `loss` (default) lets a step pass on less than it receives, as when visitors leave;
   * `strict` requires every middle step to pass on exactly what it receives.
   */
  conservation?: 'loss' | 'strict';
  /** Plot height in pixels. Defaults to 280. */
  /**
   * Gives the diagram depth: flows become lit pipes and nodes small blocks. Flow widths and node
   * heights stay exact.
   */
  depth?: boolean;
  height?: number;
  /** Resting headline. Defaults to everything entering the first steps. */
  headline?: number;
  /** Fractional change shown as a chip, e.g. 0.052 → +5.2%. */
  delta?: number;
  deltaTone?: 'default' | 'inverse' | 'neutral';
  /** Static period label, e.g. "Last 7 days". */
  range?: string;
  /** Period select. Each range replaces data, delta, and headline; flows redraw left to right. */
  ranges?: readonly CardRange<Row>[];
  defaultRange?: string;
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

interface FlowGraph<Row> {
  graph: SankeyGraph<SankeyNode, SankeyLink & { row: Row }> | null;
  error: string | null;
}

const EMPTY: readonly never[] = [];
const DEFAULT_HEIGHT = 280;
/** Below this width, every label moves inside the plot and the side gutters close. */
const COMPACT_WIDTH = 460;
/** How far a node block reaches back over its flows, in pixels. */
const NODE_DEPTH = 6;

/** Placeholder ribbons while the first data loads: [x1, y1, x2, y2, thickness] in 0–1 units. */
/**
 * A neutral two-stage flow for the skeleton: node columns as `[centre, height]` on the plot's
 * height, and flows as `[stage, from y, to y, thickness]` joining a column to the next.
 */
const SKELETON_NODES = [
  [
    [0.3, 0.32],
    [0.68, 0.2],
  ],
  [
    [0.2, 0.22],
    [0.48, 0.2],
    [0.78, 0.18],
  ],
  [
    [0.18, 0.14],
    [0.5, 0.22],
    [0.8, 0.16],
  ],
] as const;
const SKELETON_FLOWS = [
  [0, 0.22, 0.2, 0.15],
  [0, 0.38, 0.47, 0.15],
  [0, 0.68, 0.78, 0.18],
  [1, 0.2, 0.18, 0.13],
  [1, 0.48, 0.5, 0.18],
  [1, 0.78, 0.8, 0.15],
] as const;
const SKELETON_NODE_WIDTH = 10;

const read = (row: unknown, key: string) => (row as Record<string, unknown>)[key];

/** Plain-language versions of the flow engine's validation errors. */
function explain(message: string): string {
  if (message.includes('acyclic'))
    return 'The flows loop back on themselves; a Sankey needs every flow to move forward.';
  if (message.includes('does not conserve'))
    return `${message.match(/node "([^"]+)"/)?.[1] ?? 'A step'} passes on a different amount than it receives; use conservation="loss" if some flow leaves there.`;
  if (message.includes('creates flow'))
    return `${message.match(/node "([^"]+)"/)?.[1] ?? 'A step'} passes on more than it receives.`;
  if (message.includes('distinct known source and target'))
    return 'A flow starts and ends at the same step.';
  if (message.includes('non-negative')) return 'Flow values must be zero or more.';
  return message;
}

/** Turn rows of flows into a validated graph; steps take their names from the rows. */
export function sankeyGraph<Row>({
  data,
  source,
  target,
  value,
  conservation,
}: {
  data: readonly Row[];
  source: string;
  target: string;
  value: string;
  conservation: 'loss' | 'strict';
}): FlowGraph<Row> {
  const nodes: SankeyNode[] = [];
  const seen = new Set<string>();
  const links: (SankeyLink & { row: Row })[] = [];
  const pairs = new Set<string>();
  for (const row of data) {
    const from = String(read(row, source) ?? '').trim();
    const to = String(read(row, target) ?? '').trim();
    if (!from || !to) return { graph: null, error: 'Every flow needs a source and a target.' };
    for (const name of [from, to])
      if (!seen.has(name)) {
        seen.add(name);
        nodes.push({ id: name, label: name });
      }
    const id = `${from} → ${to}`;
    if (pairs.has(id))
      return { graph: null, error: `${id} appears twice; combine it into one row.` };
    pairs.add(id);
    const amount = read(row, value);
    links.push({
      id,
      source: from,
      target: to,
      value: typeof amount === 'number' && Number.isFinite(amount) ? amount : null,
      row,
    });
  }
  try {
    const policy: ConservationPolicy = conservation === 'strict' ? 'strict' : 'allow-loss';
    return { graph: normalizeSankey(nodes, links, policy), error: null };
  } catch (cause) {
    return {
      graph: null,
      error: explain(cause instanceof Error ? cause.message : 'Invalid flows.'),
    };
  }
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;
const share = (part: number, whole: number) =>
  whole > 0 ? `${Math.round((part / whole) * 100)}%` : '—';

/**
 * A Sankey card: steps as columns of nodes, flows between them as ribbons whose thickness is the
 * amount that moved. Hovering or stepping through flows with the arrow keys reads each in the
 * headline with its share of the step it left.
 */
export function SankeyChartCard<Row, const Key extends NumericKey<Row>>({
  title,
  header = true,
  'aria-label': ariaLabel = title || 'Sankey chart',
  data: suppliedData,
  source,
  target,
  value,
  conservation = 'loss',
  depth = false,
  height = DEFAULT_HEIGHT,
  headline: suppliedHeadline,
  delta: suppliedDelta,
  deltaTone,
  range,
  ranges,
  defaultRange,
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
}: SankeyChartCardProps<Row, Key>): ReactElement {
  const reduced = useReducedMotion(motionMode);
  const skeletonLeaving = useSkeletonExit(loading, reduced);
  const skeletonShown = loading || skeletonLeaving;
  const format = useCardFormat({ valueFormat, locale, formatValue: suppliedFormatValue });
  const [rangeId, setRangeId] = useState(defaultRange ?? ranges?.[0]?.id);
  const activeRange = ranges?.find((item) => item.id === rangeId) ?? ranges?.[0];
  const data = activeRange?.data ?? suppliedData ?? (EMPTY as readonly Row[]);
  const delta = activeRange ? activeRange.delta : suppliedDelta;
  const { ref, width: measured } = useChartWidth<HTMLDivElement>();
  const width = measured || 520;
  const compact = width < COMPACT_WIDTH;
  const clipId = `lilt-sankey-card-${useId().replace(/:/g, '')}`;

  const flows = useMemo(
    () => sankeyGraph({ data, source, target, value, conservation }),
    [data, source, target, value, conservation],
  );
  const graph = flows.graph;
  const layout = useMemo(
    () => (graph ? layoutSankey(graph, width, height, compact) : { nodes: [], links: [] }),
    [graph, width, height, compact],
  );
  const nodeIndex = new Map(graph?.nodes.map((node, index) => [node.id, index]) ?? []);
  const colorOf = (node: string) => `var(--lilt-series-${((nodeIndex.get(node) ?? 0) % 6) + 1})`;
  const maxDepth = Math.max(0, ...layout.nodes.map((node) => node.depth));

  // Totals from measured flows only; an unmeasured flow never counts as zero.
  const inbound = (node: string) =>
    graph?.links
      .filter((link) => link.target === node && link.value !== null)
      .reduce((sum, link) => sum + link.value!, 0) ?? 0;
  const outbound = (node: string) =>
    graph?.links
      .filter((link) => link.source === node && link.value !== null)
      .reduce((sum, link) => sum + link.value!, 0) ?? 0;
  /** A step's total, or `null` when none of its flows were measured. */
  const totalOf = (node: string) =>
    graph?.links.some(
      (link) => (link.source === node || link.target === node) && link.value !== null,
    )
      ? Math.max(inbound(node), outbound(node))
      : null;
  const totalText = (node: string) => {
    const total = totalOf(node);
    return total === null ? '—' : format.value(total);
  };
  const entering =
    layout.nodes
      .filter((node) => node.depth === 0)
      .reduce((sum, node) => sum + outbound(node.id), 0) || 0;
  const unmeasured = graph?.links.filter((link) => link.value === null).length ?? 0;
  const firstSteps = layout.nodes.filter((node) => node.depth === 0).length;

  // Keyboard order: flows left to right, then top to bottom.
  const ordered = [...layout.links].sort(
    (a, b) =>
      (layout.nodes.find((node) => node.id === a.source)?.depth ?? 0) -
        (layout.nodes.find((node) => node.id === b.source)?.depth ?? 0) || a.sourceY - b.sourceY,
  );
  const [hovered, setHovered] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);
  const activeId = pinned ?? focused ?? hovered;
  const glideRef = useTouchGlide<string>({
    resolve: glideTarget,
    onGlide: setHovered,
    onLift: (id) => id !== null && setPinned(id),
    pinned: pinned !== null,
    onRelease: () => setPinned(null),
    disabled: loading,
  });
  const plotRef = useCallback(
    (node: HTMLDivElement | null) => {
      ref.current = node;
      glideRef(node);
    },
    [glideRef, ref],
  );
  const activeLink = layout.links.find((link) => link.id === activeId);
  const activeNode = activeLink ? undefined : layout.nodes.find((node) => node.id === activeId);
  const connected = (link: SankeyLink) =>
    activeLink
      ? link.id === activeLink.id
      : activeNode
        ? link.source === activeNode.id || link.target === activeNode.id
        : true;

  // Flows sweep in from the left on first view. A period change then reshapes the same flows on
  // the spring, nodes and ribbons moving from where they are, instead of sweeping in again.
  const sweepTimeline = useChartTimeline(
    // Only once the plot has a size, so the sweep is seen rather than spent off screen.
    { key: 'first', active: !skeletonShown && measured > 0, duration: 720 },
    reduced,
  );
  const sweep = measured > 0 ? sweepTimeline : 0;
  const drawn = useRef(layout);
  // Only a new period reshapes on the spring; a resize or anything else lands at once.
  const period = activeRange?.id;
  const [morph, setMorph] = useState({ key: 0, period, from: layout, to: layout });
  if (morph.to !== layout)
    setMorph(
      morph.period !== period
        ? { key: morph.key + 1, period, from: drawn.current, to: layout }
        : { ...morph, from: layout, to: layout },
    );
  const settle = useChartTimeline(
    { key: morph.key, active: morph.key > 0 && !skeletonShown, duration: 600, spring: true },
    reduced,
  );
  // The first sweep clears a soft blur, like every family's arrival.
  const sweepBlur = sweep < 1 ? { filter: `blur(${(8 * (1 - sweep)).toFixed(2)}px)` } : undefined;
  const shownLayout =
    morph.key > 0 && settle !== 1 ? mixSankeyLayout(morph.from, morph.to, settle) : layout;
  useEffect(() => {
    drawn.current = shownLayout;
  });

  // The skeleton builds the way flows read: each column of nodes rises in turn, and the flows
  // draw from one column into the next.
  const columnX = (stage: number) =>
    stage === 0
      ? 0
      : stage === 1
        ? width / 2 - SKELETON_NODE_WIDTH / 2
        : width - SKELETON_NODE_WIDTH;
  const skeletonShapes = (tubes: boolean) => (
    <>
      {SKELETON_FLOWS.map(([stage, from, to, thickness], index) => {
        const x1 = columnX(stage) + SKELETON_NODE_WIDTH;
        const x2 = columnX(stage + 1);
        const mid = (x1 + x2) / 2;
        const d = `M${x1},${from * height} C${mid},${from * height} ${mid},${to * height} ${x2},${to * height}`;
        const step = { '--lilt-skeleton-step': stage * 4 + 1.5 + index * 0.35 } as CSSProperties;
        const draw = { pathLength: 1, strokeDasharray: 1 } as const;
        return tubes ? (
          <g key={index} data-lilt-tube="" style={step}>
            {tubeLayers(thickness * height, 'tube', [0, 1]).map((layer, layerIndex) => (
              <path
                key={layerIndex}
                d={d}
                fill="none"
                transform={layer.transform}
                stroke={shade(SKELETON_INK, layer.amount)}
                strokeWidth={layer.strokeWidth}
                data-skeleton="stroke"
                {...draw}
              />
            ))}
          </g>
        ) : (
          <path
            key={index}
            className="lilt-sankey-card__skeleton"
            d={d}
            strokeWidth={thickness * height}
            style={step}
            data-skeleton="stroke"
            {...draw}
          />
        );
      })}
      {SKELETON_NODES.flatMap((column, stage) =>
        column.map(([centre, size], index) => (
          <rect
            key={`${stage}-${index}`}
            className="lilt-sankey-card__skeleton-node"
            data-skeleton="rise"
            x={columnX(stage)}
            y={(centre - size / 2) * height}
            width={SKELETON_NODE_WIDTH}
            height={size * height}
            rx={3}
            style={{ '--lilt-skeleton-step': stage * 4 + index * 0.4 } as CSSProperties}
          />
        )),
      )}
    </>
  );

  const restingHeadline = activeRange?.headline ?? suppliedHeadline ?? entering;
  let headlineValue: number | null = restingHeadline;
  let caption: string | null = null;
  if (activeLink) {
    headlineValue = activeLink.value;
    caption = `${activeLink.source} → ${activeLink.target} · ${share(activeLink.value!, totalOf(activeLink.source) ?? 0)} of ${activeLink.source}`;
  } else if (activeNode) {
    const total = totalOf(activeNode.id);
    const lost = graph?.losses[activeNode.id];
    headlineValue = total;
    const soleStart = activeNode.depth === 0 && firstSteps === 1;
    caption =
      total === null
        ? `${activeNode.label} · Not measured`
        : soleStart || !entering
          ? activeNode.label
          : `${activeNode.label} · ${share(total, entering)} of all`;
    if (lost) caption += ` · ${format.value(lost)} left here`;
  }
  const describe = () =>
    activeLink
      ? `${activeLink.source} to ${activeLink.target}: ${format.value(activeLink.value!)}`
      : activeNode
        ? `${activeNode.label}: ${totalText(activeNode.id)}`
        : '';

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!ordered.length) return;
    const index = ordered.findIndex((link) => link.id === (focused ?? pinned));
    let next: number | null = null;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = index + 1;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp')
      next = index < 0 ? ordered.length - 1 : index - 1;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = ordered.length - 1;
    else if ((event.key === 'Enter' || event.key === ' ') && index >= 0) {
      event.preventDefault();
      const id = ordered[index]!.id;
      setPinned((current) => (current === id ? null : id));
      return;
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setPinned(null);
      setFocused(null);
      return;
    } else return;
    event.preventDefault();
    setFocused(ordered[Math.max(0, Math.min(ordered.length - 1, next))]!.id);
  };

  const labelSide = (depth: number): 'start' | 'end' =>
    compact ? (depth === maxDepth ? 'end' : 'start') : depth === 0 ? 'end' : 'start';
  const empty = !loading && !flows.error && data.length === 0;

  return (
    <ChartCard
      motion={motionMode}
      className={['lilt-sankey-card', className].filter(Boolean).join(' ')}
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
            {loading ? null : caption ? (
              <ChartCardCaption>{caption}</ChartCardCaption>
            ) : delta !== undefined ? (
              <ChartCardDelta value={delta} tone={deltaTone} />
            ) : null}
          </ChartCardValue>
        </ChartCardHeader>
      ) : null}

      {flows.error ? (
        <StatusContent kind="error" message={flows.error} />
      ) : empty ? (
        <EmptySlot block state={emptyState} shape="flow" />
      ) : (
        <>
          <div
            ref={plotRef}
            className="lilt-sankey-card__plot"
            data-lilt-glide=""
            style={{ height }}
            data-loading={skeletonShown || undefined}
            data-motion={reduced ? 'none' : undefined}
            data-active={activeId ? '' : undefined}
            tabIndex={skeletonShown ? undefined : 0}
            role="group"
            aria-label={`${ariaLabel}: ${plural(layout.links.length, 'flow', 'flows')} between ${plural(layout.nodes.length, 'step', 'steps')}. Arrow keys step through the flows; Enter pins one.`}
            onKeyDown={skeletonShown ? undefined : onKeyDown}
            onBlur={() => setFocused(null)}
            onPointerLeave={() => setHovered(null)}
            onClick={(event) => {
              const element = event.target as Element;
              if (element === event.currentTarget || element.tagName === 'svg') setPinned(null);
            }}
          >
            {/* The flows' skeleton freezes and sinks toward the left, where the flows sweep in. */}
            <SkeletonExit leaving={skeletonLeaving} origin="left">
              <svg
                aria-hidden="true"
                className="lilt-sankey-card__svg"
                width={width}
                height={height}
                viewBox={`0 0 ${width} ${height}`}
              >
                {loading ? (
                  <SkeletonSheen
                    width={width}
                    height={height}
                    reduced={reduced}
                    loadingStyle={loadingStyle}
                    depth={depth}
                    mask={skeletonShapes(false)}
                  >
                    {skeletonShapes(depth)}
                  </SkeletonSheen>
                ) : (
                  <>
                    <defs>
                      <clipPath id={clipId}>
                        <rect x={0} y={0} width={width * sweep} height={height} />
                      </clipPath>
                    </defs>
                    <g
                      clipPath={`url(#${clipId})`}
                      data-lilt-travel={morph.key ? morph.key % 2 : undefined}
                      style={sweepBlur}
                    >
                      {shownLayout.links.map((link) => {
                        const flow = {
                          className: 'lilt-sankey-card__flow',
                          'data-flow': link.id,
                          'data-glide-id': link.id,
                          'data-active': link.id === activeLink?.id || undefined,
                          'data-muted': (activeId && !connected(link)) || undefined,
                          onPointerEnter: () => setHovered(link.id),
                          onClick: (event: MouseEvent) => {
                            event.stopPropagation();
                            setPinned((current) => (current === link.id ? null : link.id));
                          },
                        };
                        return depth ? (
                          // A lit pipe, lit from straight above so its highlight runs the full
                          // length between the two nodes.
                          <g key={link.id} {...flow}>
                            {tubeLayers(link.width, 'tube', [0, 1]).map((layer, index) => (
                              <path
                                key={index}
                                d={link.path}
                                fill="none"
                                transform={layer.transform}
                                style={{
                                  stroke: shade(colorOf(link.source), layer.amount),
                                  strokeWidth: layer.strokeWidth,
                                  strokeOpacity: 1,
                                }}
                              />
                            ))}
                          </g>
                        ) : (
                          <path
                            key={link.id}
                            {...flow}
                            d={link.path}
                            strokeWidth={link.width}
                            style={{ stroke: colorOf(link.source) }}
                          />
                        );
                      })}
                    </g>
                    <g data-lilt-travel={morph.key ? morph.key % 2 : undefined} style={sweepBlur}>
                      {shownLayout.nodes.map((node) => {
                        const muted =
                          (activeId &&
                            !(
                              node.id === activeNode?.id ||
                              node.id === activeLink?.source ||
                              node.id === activeLink?.target
                            )) ||
                          undefined;
                        const nodeHeight = Math.max(2, node.height);
                        const handlers = {
                          onPointerEnter: () => setHovered(node.id),
                          onClick: () =>
                            setPinned((current) => (current === node.id ? null : node.id)),
                        };
                        if (depth) {
                          // A block: its front is the node's exact rectangle, its depth reaching back
                          // over where the flows leave it.
                          const faces = prismFaces(
                            node.x,
                            node.y,
                            node.width + NODE_DEPTH,
                            nodeHeight,
                            NODE_DEPTH,
                          );
                          const paint = prismShades(colorOf(node.id));
                          return (
                            <g
                              key={node.id}
                              className="lilt-sankey-card__node"
                              data-node={node.id}
                              data-glide-id={node.id}
                              data-muted={muted}
                              {...handlers}
                            >
                              <path d={faces.side} style={{ fill: paint.side }} />
                              {faces.top ? (
                                <path d={faces.top} style={{ fill: paint.top }} />
                              ) : null}
                              <path d={faces.front} style={{ fill: paint.front }} />
                            </g>
                          );
                        }
                        return (
                          <rect
                            key={node.id}
                            className="lilt-sankey-card__node"
                            data-node={node.id}
                            data-glide-id={node.id}
                            data-muted={muted}
                            x={node.x}
                            y={node.y}
                            width={node.width}
                            height={nodeHeight}
                            rx={3}
                            style={{ fill: colorOf(node.id) }}
                            {...handlers}
                          />
                        );
                      })}
                    </g>
                    {shownLayout.nodes.map((node) => {
                      const side = labelSide(node.depth);
                      const x = side === 'end' ? node.x - 8 : node.x + node.width + 8;
                      const middle = node.y + node.height / 2;
                      return (
                        <text
                          key={node.id}
                          className="lilt-sankey-card__label"
                          data-muted={
                            (activeId &&
                              !(
                                node.id === activeNode?.id ||
                                node.id === activeLink?.source ||
                                node.id === activeLink?.target
                              )) ||
                            undefined
                          }
                          x={x}
                          y={middle}
                          textAnchor={side}
                        >
                          <tspan x={x} dy="-0.2em">
                            {node.label}
                          </tspan>
                          <tspan x={x} dy="1.25em" className="lilt-sankey-card__label-value">
                            {totalText(node.id)}
                          </tspan>
                        </text>
                      );
                    })}
                  </>
                )}
              </svg>
            </SkeletonExit>
            <p className="lilt-chart__sr-only" aria-live="polite">
              {describe()}
            </p>
          </div>

          {!loading && unmeasured ? (
            <p className="lilt-sankey-card__footer">
              {plural(unmeasured, 'flow isn’t', 'flows aren’t')} measured yet and{' '}
              {unmeasured === 1 ? 'isn’t' : 'aren’t'} drawn; totals count measured flows only.
            </p>
          ) : null}

          {skeletonShown || !graph ? null : (
            <table className="lilt-chart__sr-only">
              <caption>{ariaLabel}</caption>
              <thead>
                <tr>
                  <th scope="col">From</th>
                  <th scope="col">To</th>
                  <th scope="col">Amount</th>
                </tr>
              </thead>
              <tbody>
                {graph.links.map((link) => (
                  <tr key={link.id}>
                    <th scope="row">{link.source}</th>
                    <td>{link.target}</td>
                    <td>{link.value === null ? 'Not measured' : format.value(link.value)}</td>
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
