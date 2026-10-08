import { useId, type ReactElement } from 'react';
import { m, useTransform, type MotionValue } from 'motion/react';

/** Space between segments, where tick labels sit. */
const GAP = 4;
/** Segment thickness; the ends are fully rounded. */
const THICKNESS = 5;

/** One stop of a segmented axis gradient, low values first. */
export interface AxisGradientStop {
  color: string;
  opacity?: number;
}

function Segment({
  from,
  to,
  cross,
  vertical,
  fill,
  cursor,
  active,
}: {
  from: number;
  to: number;
  cross: number;
  vertical: boolean;
  fill: string | undefined;
  cursor: MotionValue<number>;
  active: MotionValue<number>;
}): ReactElement {
  // The segment holding the inspected value lights up; the rest stay quiet.
  const opacity = useTransform([cursor, active], ([value, on]) => {
    const inside = Number(value) >= Math.min(from, to) && Number(value) <= Math.max(from, to);
    return 0.55 + (inside ? Number(on) * 0.45 : 0);
  });
  const start = Math.min(from, to) + GAP / 2;
  const length = Math.max(0, Math.abs(to - from) - GAP);
  return (
    <m.rect
      className="lilt-chart__axis-segment"
      x={vertical ? cross - THICKNESS / 2 : start}
      y={vertical ? start : cross - THICKNESS / 2}
      width={vertical ? THICKNESS : length}
      height={vertical ? length : THICKNESS}
      rx={THICKNESS / 2}
      fill={fill}
      style={{ opacity, ...(fill ? { fill } : {}) }}
    />
  );
}

/**
 * A segmented axis: rounded segments between ticks instead of one continuous line, with a gap at
 * each tick. With a gradient, one scale runs the length of the axis, low values first, so the
 * axis reads as a range; the segment under the pointer lights up.
 */
export function AxisSegments({
  stops,
  cross,
  vertical,
  gradient,
  cursor,
  active,
  opacity = 1,
}: {
  /** Pixel positions that bound the segments, in any order. */
  stops: readonly number[];
  /** Where the segments sit across the axis: x for a vertical axis, y for a horizontal one. */
  cross: number;
  vertical: boolean;
  gradient: readonly AxisGradientStop[] | null;
  cursor: MotionValue<number>;
  active: MotionValue<number>;
  opacity?: number;
}): ReactElement | null {
  const id = `lilt-axis-scale-${useId().replace(/:/g, '')}`;
  const bounds = [...new Set(stops.map((stop) => Math.round(stop * 2) / 2))].sort((a, b) => a - b);
  if (bounds.length < 2) return null;
  const low = vertical ? bounds.at(-1)! : bounds[0]!;
  const high = vertical ? bounds[0]! : bounds.at(-1)!;
  return (
    <g aria-hidden="true" className="lilt-chart__axis-segments" opacity={opacity}>
      {gradient && gradient.length ? (
        <defs>
          <linearGradient
            id={id}
            gradientUnits="userSpaceOnUse"
            x1={vertical ? cross : low}
            x2={vertical ? cross : high}
            y1={vertical ? low : cross}
            y2={vertical ? high : cross}
          >
            {gradient.map((stop, index) => (
              <stop
                key={index}
                offset={gradient.length === 1 ? 0 : index / (gradient.length - 1)}
                stopColor={stop.color}
                stopOpacity={stop.opacity ?? 1}
                style={{ stopColor: stop.color, stopOpacity: stop.opacity ?? 1 }}
              />
            ))}
          </linearGradient>
        </defs>
      ) : null}
      {bounds.slice(1).map((to, index) => (
        <Segment
          key={`${bounds[index]}-${to}`}
          from={bounds[index]!}
          to={to}
          cross={cross}
          vertical={vertical}
          fill={gradient && gradient.length ? `url(#${id})` : undefined}
          cursor={cursor}
          active={active}
        />
      ))}
    </g>
  );
}
