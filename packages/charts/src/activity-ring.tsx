'use client';

import type { SkeletonExitOrigin } from './lifecycle/skeleton-exit';
import { SkeletonSheen, SKELETON_INK } from './lifecycle/skeleton-sheen';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { animate } from 'motion';
import { REVEAL_EASE, useReducedMotion } from './motion/use-chart-motion';
import { useChartWidth } from './use-chart-width';
import { useTouchGlide } from './interaction/use-touch-glide';
import type { ChartLoadingStyle, ChartMotion } from './types';
import { depthOffset } from './engine/depth';
import { shade } from './primitives/depth-paint';

export interface ActivitySelection<Row> {
  hour: number;
  row: Row | null;
  value: number | null;
  pinned: boolean;
}

export interface ActivityRingProps<Row> {
  data: readonly Row[];
  hour: (row: Row) => number;
  value: (row: Row) => number | null;
  /** Explicit positive upper bound for dot intensity. Values must be in [0, maximum]. */
  maximum: number;
  /** Minutes per position across a full 24-hour cycle. Must divide 1,440. */
  bucketMinutes?: number;
  /** Number of radial dots used to show intensity. */
  dotDensity?: number;
  unit: string;
  formatValue?: (value: number) => string;
  /** Content at the centre; defaults to the peak reading. */
  center?: ReactNode;
  onSelectionChange?: (selection: ActivitySelection<Row> | null) => void;
  /** `loading` keeps showing the last accepted day until new data is ready. */
  status?: 'ready' | 'loading';
  loadingStyle?: ChartLoadingStyle;
  /** Set while the skeleton leaves (lifecycle/skeleton-exit.tsx): where it sinks to. */
  skeletonLeaving?: SkeletonExitOrigin;
  /** A new key drops the accepted day and any selection. */
  resetKey?: string | number;
  motion?: ChartMotion;
  height?: number;
  /** Turns each dot into a small puck with walls receding up and to the right. */
  depth?: boolean;
  'aria-label': string;
  className?: string;
}

interface Slot<Row> {
  hour: number;
  row: Row | null;
  value: number | null;
}

const INNER_RADIUS = 0.54;
const OUTER_RADIUS = 1.065;
/** How far each puck recedes, in pixels. */
const DOT_DEPTH = 3.2;
/** Walls stack under empty dots, so they need an opaque color rather than the grid tint. */
const DOT_TRACK = 'color-mix(in oklab, var(--lilt-grid), var(--lilt-surface) 20%)';

export function activitySlots<Row>(
  data: readonly Row[],
  hour: (row: Row) => number,
  value: (row: Row) => number | null,
  maximum: number,
  bucketMinutes = 60,
): readonly Slot<Row>[] {
  if (!Number.isFinite(maximum) || maximum <= 0)
    throw new Error('Lilt ActivityRing maximum must be positive and finite.');
  if (!Number.isInteger(bucketMinutes) || bucketMinutes <= 0 || 1440 % bucketMinutes !== 0)
    throw new Error('Lilt ActivityRing bucketMinutes must divide a 24-hour day.');
  const count = 1440 / bucketMinutes;
  const slots: Slot<Row>[] = Array.from({ length: count }, (_, index) => ({
    hour: (index * bucketMinutes) / 60,
    row: null,
    value: null,
  }));
  const seen = new Set<number>();
  for (const row of data) {
    const position = hour(row);
    const rawIndex = (position * 60) / bucketMinutes;
    const index = Math.round(rawIndex);
    if (
      !Number.isFinite(rawIndex) ||
      Math.abs(rawIndex - index) > 1e-8 ||
      index < 0 ||
      index >= count ||
      seen.has(index)
    )
      throw new Error(
        'Lilt ActivityRing requires unique bucket-aligned times within the 24-hour day.',
      );
    const measurement = value(row);
    if (
      measurement !== null &&
      (!Number.isFinite(measurement) || measurement < 0 || measurement > maximum)
    )
      throw new Error(
        'Lilt ActivityRing values must be null or finite values within [0, maximum].',
      );
    seen.add(index);
    slots[index] = { hour: position, row, value: measurement };
  }
  return slots;
}

const hourLabel = (hour: number) => {
  const minutes = Math.round(hour * 60);
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
};

/** Fades the dots in on each accepted day; an interrupted fade continues from its opacity. */
function useEntrance(slots: unknown, ready: boolean, motion: ChartMotion) {
  const reduced = useReducedMotion(motion);
  const [progress, setProgress] = useState(0);
  // The first entrance sweeps clockwise; later updates regrow each hour's column in place.
  const [sweeping, setSweeping] = useState(true);
  const current = useRef(progress);
  const hadSlots = useRef(false);
  useLayoutEffect(() => {
    if (!slots || !ready || reduced) {
      current.current = 1;
      setProgress(1);
      return;
    }
    const first = !hadSlots.current;
    hadSlots.current = true;
    setSweeping(first);
    const from = 0;
    current.current = from;
    setProgress(from);
    const controls = animate(from, 1, {
      duration: first ? 1.15 : 0.7,
      ease: REVEAL_EASE,
      onUpdate: (latest) => {
        current.current = latest;
        setProgress(latest);
      },
      onComplete: () => {
        current.current = 1;
        setProgress(1);
      },
    });
    return () => controls.stop();
  }, [slots, ready, reduced]);
  return { progress: reduced ? 1 : progress, sweeping: sweeping && !reduced, reduced };
}

/**
 * The 24-hour dot ring inside `ActivityRingCard`: one column of dots per time slot, filled by
 * how much happened then. One tab stop; arrow keys step around the day and Enter pins a slot.
 */
export function ActivityRing<Row>({
  data,
  hour,
  value,
  maximum,
  bucketMinutes = 60,
  dotDensity = 6,
  unit,
  formatValue = String,
  center,
  onSelectionChange,
  status = 'ready',
  loadingStyle = 'shimmer',
  skeletonLeaving,
  resetKey,
  motion = 'auto',
  height = 320,
  depth = false,
  className,
  'aria-label': ariaLabel,
}: ActivityRingProps<Row>) {
  if (!unit.trim()) throw new Error('Lilt ActivityRing requires a measurement unit.');
  if (!Number.isFinite(height) || height < 180)
    throw new Error('Lilt ActivityRing height must be at least 180px.');
  if (!Number.isInteger(dotDensity) || dotDensity < 1 || dotDensity > 24)
    throw new Error('Lilt ActivityRing dotDensity must be an integer from 1 to 24.');
  const target = useMemo(
    () =>
      status === 'ready'
        ? {
            slots: activitySlots(data, hour, value, maximum, bucketMinutes),
            maximum,
            bucketMinutes,
            unit,
            formatValue,
          }
        : null,
    [data, hour, value, maximum, bucketMinutes, unit, formatValue, status],
  );
  const [accepted, setAccepted] = useState<{
    key: typeof resetKey;
    frame: typeof target;
  }>({ key: resetKey, frame: target });
  useEffect(() => {
    if (target) setAccepted({ key: resetKey, frame: target });
  }, [target, resetKey]);
  const frame = target ?? (accepted.key === resetKey ? accepted.frame : null);
  const slots = frame?.slots;
  const shownBucketMinutes = frame?.bucketMinutes ?? bucketMinutes;
  const slotCount = 1440 / shownBucketMinutes;
  const shownMaximum = frame?.maximum ?? maximum;
  const shownUnit = frame?.unit ?? unit;
  const shownFormatValue = frame?.formatValue ?? formatValue;
  const { ref, width } = useChartWidth<HTMLDivElement>();
  const size = Math.min(height, Math.max(240, width || height));
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.33;
  const [hovered, setHovered] = useState<number | null>(null);
  const [pinned, setPinned] = useState<number | null>(null);
  const activeIndex = hovered ?? pinned;
  const activeSlot = activeIndex === null ? null : (slots?.[activeIndex] ?? null);
  const selection: ActivitySelection<Row> | null = activeSlot
    ? {
        hour: activeSlot.hour,
        row: activeSlot.row,
        value: activeSlot.value,
        pinned: pinned === activeIndex,
      }
    : null;
  const { progress, sweeping, reduced } = useEntrance(slots, status === 'ready', motion);
  // A period change regrows every hour from the dots it showed to its new count, rippling
  // clockwise round the day: columns fill or drain dot by dot instead of fading in place.
  const counts =
    slots?.map((slot) =>
      slot.value == null ? 0 : Math.round((slot.value / shownMaximum) * dotDensity),
    ) ?? [];
  const settledCounts = useRef<number[] | null>(null);
  const startCounts = useRef<number[]>([]);
  const changes = useRef(0);
  useLayoutEffect(() => {
    if (settledCounts.current) changes.current += 1;
    startCounts.current = settledCounts.current ?? counts;
    // `slots` marks a new period; the counts are read from it.
  }, [slots]);
  useLayoutEffect(() => {
    if (progress >= 1) settledCounts.current = counts;
  });
  const svgRef = useRef<SVGSVGElement>(null);
  // A finger reads the time slot by its angle, so it can circle the ring without lifting.
  const slotAt = (clientX: number, clientY: number, plot: Element): number | null => {
    if (!slots) return null;
    const box = plot.getBoundingClientRect();
    const dx = clientX - box.left - (box.width / size) * cx;
    const dy = clientY - box.top - (box.height / size) * cy;
    const distance = Math.hypot(dx, dy) / (box.width / size || 1);
    if (distance < radius * 0.3 || distance > radius * 1.3) return null;
    const angle = (Math.atan2(dx, -dy) + Math.PI * 2) % (Math.PI * 2);
    return Math.round((angle / (Math.PI * 2)) * slotCount) % slotCount;
  };
  const glideRef = useTouchGlide<number>({
    resolve: slotAt,
    onGlide: setHovered,
    onLift: (index) => index !== null && setPinned(index),
    disabled: !slots,
    pinned: pinned !== null,
    onRelease: () => setPinned(null),
  });
  const svgRefs = useCallback(
    (node: SVGSVGElement | null) => {
      svgRef.current = node;
      glideRef(node);
    },
    [glideRef],
  );
  useEffect(() => {
    if (pinned !== null && (!slots || pinned >= slotCount)) setPinned(null);
  }, [pinned, slots, slotCount]);
  useEffect(() => {
    onSelectionChange?.(selection);
  }, [activeIndex, activeSlot, pinned, onSelectionChange]);
  useEffect(() => {
    setHovered(null);
    setPinned(null);
  }, [resetKey]);
  const onKeyDown = (event: KeyboardEvent<SVGSVGElement>) => {
    if (!slots) return;
    const current = activeIndex ?? 0;
    if (
      [
        'ArrowRight',
        'ArrowDown',
        'ArrowLeft',
        'ArrowUp',
        'Home',
        'End',
        'Enter',
        ' ',
        'Escape',
      ].includes(event.key)
    )
      event.preventDefault();
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown')
      setHovered((current + 1) % slotCount);
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp')
      setHovered((current + slotCount - 1) % slotCount);
    if (event.key === 'Home') setHovered(0);
    if (event.key === 'End') setHovered(slotCount - 1);
    if (event.key === 'Enter' || event.key === ' ') setPinned(pinned === current ? null : current);
    if (event.key === 'Escape') {
      setPinned(null);
      setHovered(null);
      svgRef.current?.focus();
    }
  };
  const point = (index: number, distance: number) => {
    const angle = (index / slotCount) * Math.PI * 2 - Math.PI / 2;
    return {
      x: Number((cx + Math.cos(angle) * distance).toFixed(3)),
      y: Number((cy + Math.sin(angle) * distance).toFixed(3)),
    };
  };
  const peak = slots?.reduce<Slot<Row> | null>(
    (best, slot) =>
      slot.value !== null && (!best || slot.value > (best.value ?? -1)) ? slot : best,
    null,
  );
  // Every dot of one time slot, filled by how much happened then.
  const dotsFor = (index: number) => {
    const slot = slots?.[index];
    const fullCount =
      slot?.value == null ? 0 : Math.round((slot.value / shownMaximum) * dotDensity);
    // Sweeping in, each time slot's column grows outward once the sweep reaches it.
    const reached = sweeping
      ? Math.max(0, Math.min(1, (progress - (index / slotCount) * 0.7) / 0.3))
      : 1;
    const start = startCounts.current[index];
    const regrow = Math.max(0, Math.min(1, (progress - (index / slotCount) * 0.35) / 0.65));
    const filledCount = sweeping
      ? Math.ceil(fullCount * reached)
      : start === undefined || progress >= 1
        ? fullCount
        : Math.round(start + (fullCount - start) * regrow);
    return Array.from({ length: dotDensity }, (_, dot) => ({
      dot,
      ...point(
        index,
        radius *
          (INNER_RADIUS + (dot / Math.max(1, dotDensity - 1)) * (OUTER_RADIUS - INNER_RADIUS)),
      ),
      filled: dot < filledCount,
      active: activeIndex === index,
    }));
  };
  const puck = depthOffset(DOT_DEPTH);
  const skeletonDots = Array.from({ length: slotCount }, (_, index) => {
    const wave = 0.5 - 0.5 * Math.cos(((index / slotCount) * 2 - 0.25) * Math.PI);
    const count = Math.max(1, Math.round(dotDensity * (0.25 + 0.55 * wave)));
    return Array.from({ length: count }, (_, dot) =>
      point(
        index,
        radius *
          (INNER_RADIUS + (dot / Math.max(1, dotDensity - 1)) * (OUTER_RADIUS - INNER_RADIUS)),
      ),
    );
  }).flat();
  const summary = selection
    ? `${hourLabel(selection.hour)}: ${selection.value === null ? 'No data' : `${shownFormatValue(selection.value)} ${shownUnit}`}`
    : 'No bucket selected.';
  return (
    <div
      ref={ref}
      className={['lilt-activity', className].filter(Boolean).join(' ')}
      data-lilt-chart=""
      data-motion={reduced ? 'none' : undefined}
      data-inspecting={selection ? true : undefined}
      aria-label={ariaLabel}
      aria-busy={status === 'loading'}
    >
      <div
        className="lilt-activity__plot"
        style={{ width: size, height: size }}
        data-lilt-snap={!sweeping && changes.current ? changes.current % 2 : undefined}
      >
        <svg
          ref={svgRefs}
          data-lilt-glide=""
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          role="group"
          aria-label={ariaLabel}
          tabIndex={slots ? 0 : -1}
          onKeyDown={onKeyDown}
          onPointerLeave={() => setHovered(null)}
        >
          <circle
            cx={cx}
            cy={cy}
            r={radius * 0.52}
            fill="none"
            stroke="var(--lilt-grid)"
            strokeWidth="1"
          />
          {depth ? (
            // Each dot is a puck: a round-capped stroke as wide as the dot traces its walls
            // exactly, and every wall goes down before any face.
            <g data-lilt-depth="wall" pointerEvents="none">
              {Array.from({ length: slotCount }, (_, index) =>
                dotsFor(index).map(({ dot, x, y, filled, active }) => (
                  <line
                    key={`${index}-${dot}`}
                    x1={x}
                    y1={y}
                    x2={x + puck.dx}
                    y2={y + puck.dy}
                    strokeWidth={(active ? 3.3 : 2.7) * 2}
                    strokeLinecap="round"
                    style={{
                      stroke: shade(filled ? 'var(--lilt-series-1)' : DOT_TRACK, -38),
                      opacity: 1,
                    }}
                  />
                )),
              )}
            </g>
          ) : null}
          <g>
            {Array.from({ length: slotCount }, (_, index) => {
              const slot = slots?.[index];
              const active = activeIndex === index;
              return (
                <g
                  key={index}
                  data-hour={index}
                  data-active={active || undefined}
                  data-missing={slot?.value === null || undefined}
                  onPointerEnter={() => setHovered(index)}
                  onClick={() => setPinned(pinned === index ? null : index)}
                >
                  <line
                    x1={point(index, radius * 0.45).x}
                    y1={point(index, radius * 0.45).y}
                    x2={point(index, radius * 1.12).x}
                    y2={point(index, radius * 1.12).y}
                    stroke="transparent"
                    strokeWidth="12"
                  />
                  {dotsFor(index).map(({ dot, x, y, filled, active: dotActive }) => (
                    <circle
                      key={dot}
                      cx={x}
                      cy={y}
                      r={dotActive ? 3.3 : 2.7}
                      fill={
                        filled ? 'var(--lilt-series-1)' : depth ? DOT_TRACK : 'var(--lilt-grid)'
                      }
                      opacity={filled ? 1 : depth ? 1 : 0.8}
                    />
                  ))}
                  {active ? (
                    <circle
                      cx={point(index, radius * 1.12).x}
                      cy={point(index, radius * 1.12).y}
                      r="4.5"
                      fill="none"
                      stroke="var(--lilt-focus)"
                      strokeWidth="1.5"
                    />
                  ) : null}
                </g>
              );
            })}
          </g>
          {!slots && status === 'loading' ? (
            // A soft daily wave of placeholder dots, lit by the shared loading sheen.
            <g data-skeleton-leaving={skeletonLeaving}>
              <SkeletonSheen
                width={size}
                height={size}
                reduced={reduced}
                loadingStyle={loadingStyle}
                depth={depth}
                mask={skeletonDots.map(({ x, y }, index) => (
                  <circle key={index} cx={x} cy={y} r={2.7} fill="white" />
                ))}
              >
                {skeletonDots.map((position, index) => (
                  // Dots pop in round the day, clockwise from midnight.
                  <g
                    key={index}
                    data-skeleton="pop"
                    style={
                      {
                        '--lilt-skeleton-step': (index * 14) / skeletonDots.length,
                      } as CSSProperties
                    }
                  >
                    {depth ? (
                      <line
                        x1={position.x}
                        y1={position.y}
                        x2={position.x + puck.dx}
                        y2={position.y + puck.dy}
                        stroke={shade(SKELETON_INK, -38)}
                        strokeWidth={5.4}
                        strokeLinecap="round"
                      />
                    ) : null}
                    <circle
                      className="lilt-activity__skeleton-dot"
                      cx={position.x}
                      cy={position.y}
                      r={2.7}
                      style={depth ? { fill: shade(SKELETON_INK, 12) } : undefined}
                    />
                  </g>
                ))}
              </SkeletonSheen>
            </g>
          ) : null}
          <g>
            {[0, 1, 2, 3].map((quarter) => {
              const position = point(Math.round((quarter * slotCount) / 4), radius * 1.26);
              return (
                <text
                  key={quarter}
                  x={position.x}
                  y={position.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="var(--lilt-muted)"
                  fontSize="11"
                >
                  {String(quarter * 6).padStart(2, '0')}
                </text>
              );
            })}
          </g>
        </svg>
        <div className="lilt-activity__center">
          {center ?? (
            <>
              <strong>{peak ? shownFormatValue(peak.value!) : '—'}</strong>
              <span>{shownUnit} peak</span>
            </>
          )}
        </div>
      </div>
      <p className="lilt-chart__sr-only" role="status" aria-atomic="true">
        {summary}
      </p>
      <span className="lilt-chart__sr-only">
        {slotCount} cyclic positions; missing observations are distinct from zero.
      </span>
    </div>
  );
}
