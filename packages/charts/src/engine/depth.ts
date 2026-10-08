/**
 * Shared geometry for charts drawn with depth. Every family recedes the same way: up and to the
 * right at about 30°, so a bar, a candle, a ring, and a funnel side by side share one light and
 * one camera. The front face always keeps the measured geometry; depth only adds paint behind it.
 */

/** The deepest a column recedes, in pixels. */
export const MAX_DEPTH = 14;
/** Rise per unit of depth. */
export const DEPTH_SLOPE = 8 / 14;
/** Extra paint above the tallest front face; clips reserve this much headroom. */
export const MAX_RISE = MAX_DEPTH * DEPTH_SLOPE;

/** Screen offset of the back face for a given depth. */
export function depthOffset(depth: number): { dx: number; dy: number } {
  return { dx: depth, dy: -depth * DEPTH_SLOPE };
}

/**
 * Depth for a column of a given footprint. Tiny readings and dense charts get proportionately
 * less, never a false minimum.
 */
export function columnDepth(width: number, height: number): number {
  if (!(width > 0) || !(height > 0)) return 0;
  return Math.min(MAX_DEPTH, width * 0.24) * Math.min(1, height / 8);
}

export interface PrismFaces {
  /** The front, left edge at `x`: the footprint minus the depth, so the prism fits its slot. */
  front: string;
  /** The whole silhouette; drawn first in the side's shade, it also fills every seam. */
  side: string;
  top: string | null;
  frontWidth: number;
  depth: number;
  rise: number;
}

/**
 * A square prism inside a `width`-wide footprint. The faces overlap underneath the front by a
 * pixel so antialiased edges never show the plot through a seam.
 */
export function prismFaces(
  x: number,
  y: number,
  width: number,
  height: number,
  depth = columnDepth(width, height),
  showTop = true,
): PrismFaces {
  const rise = depth * DEPTH_SLOPE;
  const frontWidth = width - depth;
  const right = x + frontWidth;
  const bottom = y + height;
  const tuck = Math.min(1, height / 2);
  const back = `L${right + depth},${bottom - rise}L${right},${bottom}H${x}Z`;
  return {
    front: `M${x},${y}H${right}V${bottom}H${x}Z`,
    side: showTop
      ? `M${x},${y}L${x + depth},${y - rise}H${right + depth}${back}`
      : `M${x},${y}H${right}L${right + depth},${y - rise}${back}`,
    top: showTop
      ? `M${x},${y + tuck}V${y}L${x + depth},${y - rise}H${right + depth}` +
        `L${right},${y}V${y + tuck}Z`
      : null,
    frontWidth,
    depth,
    rise,
  };
}

/**
 * A prism for a column centered on `cx`, such as a range bar or a candle body. The front stays
 * centered on the reading, so the crosshair and any whisker or wick pass through its middle;
 * the depth extends to the right.
 */
export function centeredPrism(cx: number, y: number, width: number, height: number): PrismFaces {
  const depth = columnDepth(width, height);
  return prismFaces(cx - (width - depth) / 2, y, width, height, depth);
}
