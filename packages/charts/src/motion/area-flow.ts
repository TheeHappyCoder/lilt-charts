import type { NormalizedData } from '../engine/normalize';
import { snapSpring } from './use-snap-bars';

/**
 * Areas move with the same restraint as lines and bars. They arrive lifting a little from below
 * on the bars' spring, softly blurred until they land. A new period moves on a line's clock with
 * a slight lean in reading order, so the change runs left to right rather than all at once.
 */

/** How long a period change takes to roll across an area chart. */
export const FLOW_DURATION = 480;
/** Share of that time the wave's front takes to cross the plot; each column moves for the rest. */
const FLOW_SPREAD = 0.18;
/** The blur an area arrives with: half an arriving bar's, since an area is a larger surface. */
const RISE_BLUR = 4;
/** How much of its height an area has before it lifts into place. */
const RISE_FROM = 0.6;
/** The blur clears over this long, while the spring is still settling. */
const RISE_CLEAR = 0.42;
/** The area starts to rise after the sweep has uncovered its first columns. */
const RISE_DELAY = 0.04;

const clamp = (value: number) => Math.max(0, Math.min(1, value));
const easeOut = (t: number) => 1 - Math.pow(1 - clamp(t), 4);

/** How far column `index` of `count` has moved toward its new value, at `progress` of the wave. */
export function flowProgress(progress: number, index: number, count: number): number {
  if (progress >= 1) return 1;
  const start = count <= 1 ? 0 : (index / (count - 1)) * FLOW_SPREAD;
  return easeOut((progress - start) / (1 - FLOW_SPREAD));
}

/** One frame of a period change on an area chart: rows of the same shape, moving as a wave. */
export function flowFrame<T>(
  from: NormalizedData<T>,
  to: NormalizedData<T>,
  progress: number,
): NormalizedData<T> {
  if (progress >= 1) return to;
  const count = to.rows.length;
  return {
    ...to,
    rows: to.rows.map((row, index) => {
      const previous = from.rows[index];
      const local = flowProgress(progress, index, count);
      const values = Object.fromEntries(
        to.series.map(({ id }) => {
          const start = previous?.values[id];
          const end = row.values[id];
          return [
            id,
            start === null || start === undefined || end === null || end === undefined
              ? end
              : start + (end - start) * local,
          ];
        }),
      );
      return { ...row, values };
    }),
  };
}

/**
 * An area's first arrival at `elapsed` milliseconds into the chart's entrance: how far it has
 * risen from its floor (the spring may pass 1 briefly) and the blur it still carries.
 */
export function riseAt(elapsed: number): { rise: number; blur: number } {
  if (!Number.isFinite(elapsed)) return { rise: 1, blur: 0 };
  const seconds = Math.max(0, elapsed / 1000 - RISE_DELAY);
  return {
    rise: RISE_FROM + (1 - RISE_FROM) * snapSpring(seconds),
    blur: RISE_BLUR * (1 - easeOut(seconds / RISE_CLEAR)),
  };
}

/**
 * The SVG transform and filter that raise a mark from `floor` (its baseline in pixels), or
 * nothing once it has landed.
 */
export function riseStyle(elapsed: number, floor: number): { transform?: string; filter?: string } {
  const { rise, blur } = riseAt(elapsed);
  if (Math.abs(rise - 1) < 0.001 && blur < 0.05) return {};
  return {
    transform: `translate(0 ${floor * (1 - rise)}) scale(1 ${rise})`,
    filter: blur >= 0.05 ? `blur(${blur.toFixed(2)}px)` : undefined,
  };
}

/** Where an area stands: the zero line, kept inside the plot. */
export function areaFloor(snapshot: {
  yToPixel: (value: number) => number;
  plot: { top: number; bottom: number };
}): number {
  const zero = snapshot.yToPixel(0);
  return Number.isFinite(zero)
    ? Math.max(snapshot.plot.top, Math.min(snapshot.plot.bottom, zero))
    : snapshot.plot.bottom;
}
