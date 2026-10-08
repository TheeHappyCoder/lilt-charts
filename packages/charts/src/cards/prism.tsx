import type { CSSProperties } from 'react';

type Point = readonly [number, number];

/**
 * A prism standing on the floor, seen from above and in front. `top` is its convex top face in
 * the mark's box, already lifted; the floor sits `lift` pixels below it.
 */
export interface ObservationPrism {
  top: readonly Point[];
  /** Height above the floor in pixels. */
  lift: number;
  /** Painter's order: nearer prisms have a larger depth and cover farther ones. */
  depth: number;
  /** 0 at the back of the scene to 1 at the front, for the rising stagger. */
  wave: number;
}

/** Convex hull, clockwise on screen: the silhouette of a top face and its footprint. */
function hull(points: readonly Point[]): Point[] {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: Point, a: Point, b: Point) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const build = (list: Point[]) => {
    const out: Point[] = [];
    for (const point of list) {
      while (out.length >= 2 && cross(out.at(-2)!, out.at(-1)!, point) <= 0) out.pop();
      out.push(point);
    }
    out.pop();
    return out;
  };
  return [...build(sorted), ...build([...sorted].reverse())];
}

/** The prism's silhouette in its box, for hit testing and the loading mask. */
export const prismOutline = ({ top, lift }: ObservationPrism): Point[] =>
  hull([...top, ...top.map(([x, y]) => [x, y + lift] as const)]);

/**
 * The side faces a viewer above and in front can see: edges whose outward normal points down the
 * screen. `shade` runs from 0 for a face turned to the light (left) to 1 for one turned away.
 */
export function visibleFaces({ top }: ObservationPrism) {
  const cx = top.reduce((sum, [x]) => sum + x, 0) / top.length;
  const cy = top.reduce((sum, [, y]) => sum + y, 0) / top.length;
  return top.flatMap((start, index) => {
    const end = top[(index + 1) % top.length]!;
    const dx = end[0] - start[0];
    const dy = end[1] - start[1];
    const length = Math.hypot(dx, dy);
    if (length === 0 || Math.abs(dx) < 1e-6) return [];
    let nx = dy / length;
    let ny = -dx / length;
    // Point the normal away from the face's centre.
    if (nx * ((start[0] + end[0]) / 2 - cx) + ny * ((start[1] + end[1]) / 2 - cy) < 0) {
      nx = -nx;
      ny = -ny;
    }
    if (ny <= 0.01) return [];
    const [left, right] = dx > 0 ? [start, end] : [end, start];
    return [
      {
        left,
        width: right[0] - left[0],
        angle: (Math.atan2(right[1] - left[1], right[0] - left[0]) * 180) / Math.PI,
        shade: (nx + 1) / 2,
      },
    ];
  });
}

const pointList = (points: readonly Point[], dx = 0, dy = 0) =>
  points.map(([x, y]) => `${(x + dx).toFixed(6)},${(y + dy).toFixed(6)}`).join(' ');

/**
 * Lit from above and to the left, like Lilt's isometric bars: the top is brightest, faces turned
 * to the light are lit and faces turned away fall into shade. Each side is a skewed rectangle so
 * it can rise from the floor on entry while the top travels up with it.
 */
export function Prism({ prism }: { prism: ObservationPrism }) {
  const outline = prismOutline(prism);
  const width = Math.max(...outline.map(([x]) => x));
  const height = Math.max(...outline.map(([, y]) => y));
  return (
    <svg className="lilt-observations-card__prism" width={width} height={height} aria-hidden="true">
      {prism.lift > 0
        ? visibleFaces(prism).map((face, index) => (
            <g
              key={index}
              // Trigonometric last bits can differ between server and browser runtimes.
              transform={`translate(${face.left[0]} ${face.left[1]}) skewY(${face.angle.toFixed(6)})`}
            >
              <rect
                className="lilt-observations-card__prism-side"
                width={face.width}
                height={prism.lift}
                style={{ '--lilt-prism-shade': `${10 + face.shade * 38}%` } as CSSProperties}
              />
            </g>
          ))
        : null}
      <polygon className="lilt-observations-card__prism-top" points={pointList(prism.top)} />
    </svg>
  );
}

/** The loading prism: the same faces in skeleton tones, or its silhouette for the shimmer mask. */
export function PrismSkeleton({
  prism,
  x,
  y,
  painted,
}: {
  prism: ObservationPrism;
  x: number;
  y: number;
  painted: boolean;
}) {
  if (!painted)
    return (
      <polygon
        className="lilt-observations-card__skeleton"
        points={pointList(prismOutline(prism), x, y)}
      />
    );
  const { top, lift } = prism;
  return (
    <>
      {visibleFaces(prism).map((face, index) => {
        const right = [
          face.left[0] + face.width,
          face.left[1] + Math.tan((face.angle * Math.PI) / 180) * face.width,
        ] as const;
        return (
          <polygon
            key={index}
            className="lilt-observations-card__skeleton-face"
            style={{ '--lilt-skeleton-shade': `${50 + face.shade * 34}%` } as CSSProperties}
            points={pointList(
              [face.left, right, [right[0], right[1] + lift], [face.left[0], face.left[1] + lift]],
              x,
              y,
            )}
          />
        );
      })}
      <polygon className="lilt-observations-card__skeleton-face" points={pointList(top, x, y)} />
    </>
  );
}
