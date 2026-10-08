import { m, useTransform, type MotionValue } from 'motion/react';
import type { ReactElement, ReactNode } from 'react';
import { useChartContext, type AxisTick } from '../chart-context';
import type { XAxisProps, YAxisProps } from '../types';
import { entranceProgress, entranceStagger } from '../motion/entrance';
import {
  hasYGutter,
  proximityOpacity,
  useAxisCursor,
  X_LABEL_CENTER,
} from '../interaction/axis-cursor';
import { seriesColor } from '../paint';
import { AxisSegments, type AxisGradientStop } from './axis-segments';

const REVEAL_EASE = [0.22, 1, 0.36, 1] as const;
/** Horizontal distance at which an approaching pill starts to fade an x label. */
const X_REACH = 64;
/** Vertical distance at which an approaching pill starts to fade a y label. */
const Y_REACH = 26;
const MAX_RULER_TICKS = 160;
/** Minimum space between an axis label and the plot edge. */
const EDGE_GAP = 4;

/** Where a segmented axis sits: just below the plot, or just left of it. */
const SEGMENT_OFFSET = 6;

/**
 * A segmented axis's color scale, low values first: `true` fades the first shown series' color
 * from faint to full; a list of colors is spread evenly.
 */
function useAxisGradient(
  spec: boolean | readonly string[] | undefined,
): readonly AxisGradientStop[] | null {
  const { series, visibleSeries } = useChartContext<unknown>();
  if (!spec) return null;
  if (spec !== true) return spec.map((color) => ({ color }));
  const first = series.find((item) => visibleSeries.includes(item.id)) ?? series[0];
  if (!first) return null;
  const color = seriesColor(first, series.indexOf(first));
  return [
    { color, opacity: 0.22 },
    { color, opacity: 1 },
  ];
}

function transitionFor(duration: number, reducedMotion: boolean, reveal: boolean) {
  if (reducedMotion || reveal) return { duration: 0 };
  return { duration: Math.max(0, duration) / 1000, ease: REVEAL_EASE };
}

/** Fades and softens its label as the inspection pill approaches, and restores it as it leaves. */
function Proximity({
  cursor,
  active,
  center,
  reach,
  children,
}: {
  cursor: MotionValue<number>;
  active: MotionValue<number>;
  center: number;
  reach: number;
  children: ReactNode;
}): ReactElement {
  const opacity = useTransform([cursor, active], ([value, on]) =>
    proximityOpacity(Number(value) - center, reach, Number(on)),
  );
  // A filter, even blur(0), clips glyphs to a tight box, so only apply one while fading.
  const filter = useTransform(opacity, (value) =>
    value > 0.995 ? 'none' : `blur(${((1 - value) * 1.2).toFixed(2)}px)`,
  );
  return <m.g style={{ opacity, filter }}>{children}</m.g>;
}

/**
 * Lights the label of the inspected observation when no pill covers it (tooltip and strip
 * readouts), so the axis still says where the reading is. CSS reads `--lilt-label-lit`.
 */
function LabelLight({
  x,
  reach,
  children,
}: {
  x: number;
  reach: number;
  children: ReactNode;
}): ReactElement {
  const { pointerX, inspecting, active } = useAxisCursor();
  const lit = useTransform([pointerX, inspecting, active], ([value, on, pills]) =>
    Math.abs(Number(value) - x) <= reach ? Number(on) * (1 - Number(pills)) : 0,
  );
  return <m.g style={{ '--lilt-label-lit': lit } as never}>{children}</m.g>;
}

/** Offsets below the plot where ruler marks start; the crosshair ends at the same line. */
export const RULER_GAP = { ticks: 4, dots: 7 } as const;

/**
 * One mark per observation. Marks are identical at rest; only the mark under the pointer grows,
 * handing off smoothly to its neighbour as the pointer travels.
 */
function RulerMark({
  kind,
  x,
  baseline,
  reach,
  cursor,
  active,
}: {
  kind: 'ticks' | 'dots';
  x: number;
  baseline: number;
  reach: number;
  cursor: MotionValue<number>;
  active: MotionValue<number>;
}): ReactElement {
  const nearness = useTransform([cursor, active], ([value, on]) => {
    const t = Math.max(0, 1 - Math.abs(Number(value) - x) / reach);
    return Number(on) * t * t * (3 - 2 * t);
  });
  const opacity = useTransform(nearness, (value) => 0.28 + value * 0.62);
  const top = baseline + RULER_GAP[kind];
  const tickEnd = useTransform(nearness, (value) => top + 4 + value * 5);
  const radius = useTransform(nearness, (value) => 1.25 + value * 1.5);
  if (kind === 'dots')
    return (
      <m.circle className="lilt-chart__ruler-dot" cx={x} cy={top} r={radius} style={{ opacity }} />
    );
  return (
    <m.line
      className="lilt-chart__ruler-tick"
      shapeRendering="crispEdges"
      x1={x}
      x2={x}
      y1={top}
      y2={tickEnd}
      style={{ opacity }}
    />
  );
}

export function XAxis({ className, edgeInset, labels }: XAxisProps = {}): ReactElement {
  const {
    snapshot,
    previousSnapshot,
    axis,
    transitionDuration,
    reducedMotion,
    transitionKind,
    revealProgress,
  } = useChartContext<unknown>();
  const cursor = useAxisCursor();
  const reveal = transitionKind === 'initial';
  const previous = new Map(
    (previousSnapshot?.xTicks ?? []).map((value) => [value, previousSnapshot!.xToPixel(value)]),
  );
  const rows = snapshot.data.rows;
  const style = cursor.axis.x;
  const segmented = style === 'segmented';
  const gradient = useAxisGradient(cursor.axis.xGradient);
  // Minimal labels only the ends, so the plot reads as a shape rather than a table.
  const quiet = style === 'minimal' || style === 'dots';
  const ruler = style === 'ruler' ? 'ticks' : style === 'dots' ? 'dots' : null;
  const endsOnly = (labels ?? (quiet ? 'ends' : 'fit')) === 'ends';
  const ends = endsOnly && rows.length ? [...new Set([rows[0]!.x, rows.at(-1)!.x])] : null;
  const tickValues = ends ?? snapshot.xTicks;
  const ticks: readonly AxisTick[] = ends ? ends.map((value) => ({ value })) : axis.x;
  const current = new Set(tickValues);
  const inset = Math.min(
    Math.max(0, edgeInset ?? 0),
    (snapshot.plot.right - snapshot.plot.left) / 4,
  );
  const rulerStep = Math.max(1, Math.ceil(rows.length / MAX_RULER_TICKS));
  const rulerRows = rows.filter((_, index) => index % rulerStep === 0);
  const rulerSpacing =
    rulerRows.length > 1 ? (snapshot.plot.right - snapshot.plot.left) / (rulerRows.length - 1) : 40;
  // Half the distance between observations: the reach of the lit label.
  const rowReach =
    rows.length > 1
      ? Math.abs(snapshot.xToPixel(rows[1]!.x) - snapshot.xToPixel(rows[0]!.x)) / 2
      : snapshot.plot.width / 2;
  const rulerOpacity =
    reveal && !reducedMotion ? entranceProgress(revealProgress * transitionDuration, 0, 320) : 1;

  return (
    <g
      aria-hidden="true"
      className={['lilt-chart__axis', 'lilt-chart__x-axis', className].filter(Boolean).join(' ')}
    >
      {ruler || segmented ? null : (
        <line
          className="lilt-chart__axis-baseline"
          x1={snapshot.plot.left}
          x2={snapshot.plot.right}
          y1={snapshot.plot.bottom}
          y2={snapshot.plot.bottom}
        />
      )}
      {segmented ? (
        <AxisSegments
          stops={[
            snapshot.plot.left,
            ...tickValues.map((value) => snapshot.xToPixel(value)),
            snapshot.plot.right,
          ]}
          cross={snapshot.plot.bottom + SEGMENT_OFFSET}
          vertical={false}
          gradient={gradient}
          cursor={cursor.pointerX}
          active={cursor.active}
          opacity={rulerOpacity}
        />
      ) : null}
      {ruler ? (
        <g className="lilt-chart__ruler" data-kind={ruler} opacity={rulerOpacity}>
          {rulerRows.map((row) => (
            <RulerMark
              key={`ruler-${row.x}`}
              kind={ruler}
              x={snapshot.xToPixel(row.x)}
              baseline={snapshot.plot.bottom}
              reach={Math.max(8, rulerSpacing * 0.75)}
              cursor={cursor.pointerX}
              active={cursor.active}
            />
          ))}
        </g>
      ) : null}
      {ticks.map((tick, index) => {
        const isCurrent = current.has(tick.value);
        const targetX = isCurrent
          ? snapshot.xToPixel(tick.value)
          : (previous.get(tick.value) ?? snapshot.xToPixel(tick.value));
        const initialX = previous.get(tick.value) ?? targetX;
        const arrival =
          reveal && !reducedMotion
            ? entranceProgress(
                revealProgress * transitionDuration,
                60 + entranceStagger(index, ticks.length, 100),
                320,
              )
            : 1;
        const currentIndex = tickValues.indexOf(tick.value);
        const tickIndex = currentIndex < 0 ? index : currentIndex;
        const label = snapshot.formatX(tick.value);
        const halfWidth = label.length * 3.3;
        // Center every label on its observation; only edge labels that would touch the plot
        // edge anchor to the side instead.
        const first = tickIndex === 0;
        const last = tickIndex === tickValues.length - 1;
        const room = EDGE_GAP - cursor.overhang;
        const anchor =
          first && targetX - halfWidth < snapshot.plot.left + room
            ? 'start'
            : last && targetX + halfWidth > snapshot.plot.right - room
              ? 'end'
              : 'middle';
        const edgeOffset = anchor === 'start' ? inset : anchor === 'end' ? -inset : 0;
        const center =
          targetX +
          edgeOffset +
          (anchor === 'start' ? halfWidth : anchor === 'end' ? -halfWidth : 0);
        return (
          <Proximity
            key={`x-${tick.value}`}
            cursor={cursor.x}
            active={cursor.active}
            center={center}
            reach={X_REACH}
          >
            <LabelLight x={targetX} reach={rowReach}>
              <m.text
                animate={{
                  opacity: isCurrent ? arrival : 0,
                  filter: arrival >= 1 ? 'none' : `blur(${(1 - arrival) * 1.5}px)`,
                  x: targetX + edgeOffset,
                  y: snapshot.plot.bottom + X_LABEL_CENTER + 4 + (1 - arrival) * 4,
                }}
                className="lilt-chart__axis-label"
                initial={
                  reveal || reducedMotion || transitionDuration === 0
                    ? false
                    : {
                        opacity: tick.entering ? 0 : 1,
                        x: initialX + edgeOffset,
                        y: snapshot.plot.bottom + X_LABEL_CENTER + 9,
                      }
                }
                textAnchor={anchor}
                transition={transitionFor(transitionDuration, reducedMotion, reveal)}
              >
                {label}
              </m.text>
            </LabelLight>
          </Proximity>
        );
      })}
    </g>
  );
}

export function YAxis({
  className,
  showTicks = true,
  scale = 'primary',
}: YAxisProps = {}): ReactElement | null {
  const {
    snapshot,
    previousSnapshot,
    axis,
    transitionDuration,
    reducedMotion,
    transitionKind,
    revealProgress,
  } = useChartContext<unknown>();
  const cursor = useAxisCursor();
  const reveal = transitionKind === 'initial';
  const previous = new Map(
    (previousSnapshot?.yTicks ?? []).map((value) => [value, previousSnapshot!.yToPixel(value)]),
  );
  const current = new Set(snapshot.yTicks);
  const style = cursor.axis.y;
  const segmented = style === 'segmented';
  const gradient = useAxisGradient(cursor.axis.yGradient);
  // Inline labels sit on their grid line inside the plot instead of in a gutter; segmented and
  // dotted axes keep their labels in the gutter, dots leading each one into the plot.
  const inline = !hasYGutter(style);
  const leaders = style === 'dots';
  const gutterGap = segmented || leaders ? 16 : 12;
  // The secondary scale mirrors the primary ticks on the right edge.
  const right = scale === 'secondary';
  const secondary = snapshot.secondary;
  const labelX = right
    ? inline
      ? snapshot.plot.right - cursor.inset
      : snapshot.plot.right + gutterGap
    : inline
      ? snapshot.plot.left + cursor.inset
      : snapshot.plot.left - gutterGap;
  const anchor = right === inline ? 'end' : 'start';
  const labelFor = (value: number) =>
    right && secondary ? secondary.format(value * secondary.factor) : snapshot.formatY(value);
  const labelOffset = inline ? -6 : 4;
  // An inline baseline label would sit inside the filled marks, and the axis line already reads as zero.
  const lowest = snapshot.yTicks.length ? Math.min(...snapshot.yTicks) : null;

  if (right && !secondary) return null;
  return (
    <g
      aria-hidden="true"
      className={['lilt-chart__axis', 'lilt-chart__y-axis', className].filter(Boolean).join(' ')}
      data-inline={inline || undefined}
      data-scale={right ? 'secondary' : undefined}
    >
      {segmented && !right ? (
        <AxisSegments
          stops={[
            snapshot.plot.top,
            ...snapshot.yTicks.map((value) => snapshot.yToPixel(value)),
            snapshot.plot.bottom,
          ]}
          cross={snapshot.plot.left - SEGMENT_OFFSET}
          vertical
          gradient={gradient}
          cursor={cursor.y}
          active={cursor.active}
          opacity={
            reveal && !reducedMotion
              ? entranceProgress(revealProgress * transitionDuration, 0, 320)
              : 1
          }
        />
      ) : null}
      {leaders && !right
        ? axis.y.map((tick, index) => {
            const isCurrent = current.has(tick.value);
            const targetY = isCurrent
              ? snapshot.yToPixel(tick.value)
              : (previous.get(tick.value) ?? snapshot.yToPixel(tick.value));
            const arrival =
              reveal && !reducedMotion
                ? entranceProgress(
                    revealProgress * transitionDuration,
                    entranceStagger(index, axis.y.length, 80),
                    320,
                  )
                : 1;
            // A node on the axis, then a dotted leader across the plot at the tick's value.
            return (
              <m.g
                key={`y-leader-${tick.value}`}
                className="lilt-chart__y-leader"
                initial={false}
                animate={{ opacity: isCurrent ? arrival : 0, y: targetY }}
                transition={transitionFor(transitionDuration, reducedMotion, reveal)}
              >
                <circle
                  className="lilt-chart__y-leader-node"
                  cx={snapshot.plot.left - 7}
                  cy={0}
                  r={1.6}
                />
                <line
                  className="lilt-chart__y-leader-line"
                  x1={snapshot.plot.left}
                  x2={snapshot.plot.right}
                  y1={0}
                  y2={0}
                  strokeDasharray="0 5"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
              </m.g>
            );
          })
        : null}
      {showTicks &&
        style !== 'minimal' &&
        axis.y.map((tick, index) => {
          if (inline && tick.value === lowest) return null;
          const isCurrent = current.has(tick.value);
          const targetY = isCurrent
            ? snapshot.yToPixel(tick.value)
            : (previous.get(tick.value) ?? snapshot.yToPixel(tick.value));
          const initialY = previous.get(tick.value) ?? targetY + 6;
          const arrival =
            reveal && !reducedMotion
              ? entranceProgress(
                  revealProgress * transitionDuration,
                  entranceStagger(index, axis.y.length, 80),
                  280,
                )
              : 1;
          return (
            <Proximity
              key={`y-${tick.value}`}
              cursor={cursor.y}
              active={cursor.active}
              center={targetY}
              reach={Y_REACH}
            >
              <m.text
                animate={{
                  opacity: isCurrent ? arrival : 0,
                  filter: arrival >= 1 ? 'none' : `blur(${(1 - arrival) * 1.5}px)`,
                  x: labelX,
                  y: targetY + labelOffset + (1 - arrival) * 4,
                }}
                className="lilt-chart__axis-label"
                initial={
                  reveal || reducedMotion || transitionDuration === 0
                    ? false
                    : {
                        opacity: tick.entering ? 0 : 1,
                        x: labelX,
                        y: initialY + labelOffset + 6,
                      }
                }
                textAnchor={anchor}
                transition={transitionFor(transitionDuration, reducedMotion, reveal)}
              >
                {labelFor(tick.value)}
              </m.text>
            </Proximity>
          );
        })}
    </g>
  );
}
