import { hasStackedSuccessor, type barMarkPath, type BarGeometry } from './bars';
import { MAX_RISE, columnDepth, prismFaces } from './depth';

/** Extra paint above the measured front face; shared by resting and inspection clips. */
export const ISOMETRIC_BAR_RISE = MAX_RISE;

type MarkOptions = Parameters<typeof barMarkPath>[1];

/**
 * A square prism inside the original horizontal slot. The front keeps the real y values; corner
 * radius does not apply, because a rounded front reads as a plate stuck on a box.
 */
export function isometricBarGeometry(bar: BarGeometry, options: MarkOptions) {
  const progress = Math.max(0, Math.min(1, options.progress ?? 1));
  const origin = options.originY ?? bar.baseline;
  const covered =
    options.stacked &&
    hasStackedSuccessor(options.geometry, options.seriesIds, options.seriesId, bar);
  let height = bar.height * progress;
  let y = origin + (bar.y - origin) * progress;
  const trim = Math.min(covered ? (options.segmentGap ?? 0) : 0, height / 2);
  height -= trim;
  if (!bar.negative) y += trim;
  if (height <= 0 || bar.width <= 0) return null;

  const depth = columnDepth(bar.width, height);
  const x = bar.x;
  const index = options.seriesIds.indexOf(options.seriesId);
  const below = (negative: boolean) =>
    options.stacked &&
    options.seriesIds
      .slice(0, index)
      .some((id) =>
        options.geometry[id]?.some(
          (previous) =>
            previous.valueX === bar.valueX && previous.negative === negative && previous.height > 0,
        ),
      );
  // Negative stacks expose their top at the zero end, where no earlier negative segment sits.
  const topCovered = bar.negative ? below(true) : covered;
  const showTop = !topCovered || (options.segmentGap ?? 0) > 0;
  // Only a positive bar's first segment stands on the floor; it alone casts a contact shadow.
  const grounded = !bar.negative && !below(false);
  // The shadow fades out inside the bar's own slot, so the last bar never meets the plot edge.
  const siblings = options.geometry[options.seriesId] ?? [];
  let gap = Infinity;
  for (let i = 1; i < siblings.length; i += 1) {
    const [a, b] = [siblings[i - 1]!, siblings[i]!];
    gap = Math.min(gap, Math.abs(b.x - a.x) - a.width);
  }
  const cast = Math.max(0, Math.min(depth * 1.6, gap / 2));

  const faces = prismFaces(x, y, bar.width, height, depth, showTop);
  const { rise } = faces;
  const right = x + faces.frontWidth;
  const bottom = y + height;

  return {
    x,
    y,
    width: faces.frontWidth,
    height,
    depth,
    rise,
    /** Square: an extruded bar has no rounded plate on its front. */
    front: faces.front,
    side: faces.side,
    top: faces.top,
    grounded,
    /** A short contact shadow on the floor band, behind and to the right of the footprint. */
    shadow:
      grounded && depth >= 3 && cast >= 2
        ? `M${right},${bottom}L${right + depth},${bottom - rise}` +
          `H${right + depth + cast}L${right + cast},${bottom}Z`
        : null,
    cast,
  };
}
