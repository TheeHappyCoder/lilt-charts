import type { ObservationMark, ObservationScene } from './observations-card';

export type Point = readonly [number, number];
export const fixed = (n: number) => Number(n.toFixed(4));
export const xy = ([x, y]: Point) => `${fixed(x)},${fixed(y)}`;
export const polygon = (points: readonly Point[]) => `M${points.map(xy).join(' L')} Z`;
export const clamp = (value: number | undefined, fallback: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value !== undefined && Number.isFinite(value) ? value : fallback));
export const identity = (...parts: (string | number)[]) => JSON.stringify(parts);
export const bad = <Row>(error: string): ObservationScene<Row> => ({ marks: [], error });
export const frame = (width: number, height: number) => ({
  width: Math.max(280, width),
  height: Math.max(200, height),
});

/** A sampled ribbon keeps a closed silhouette for both paint and pointer hit testing. */
export function ribbonMark<Row>(
  mark: Omit<ObservationMark<Row>, 'x' | 'y' | 'width' | 'height' | 'shape'>,
  points: readonly Point[],
): ObservationMark<Row> {
  const x = Math.min(...points.map(([px]) => px));
  const y = Math.min(...points.map(([, py]) => py));
  return {
    ...mark,
    x,
    y,
    width: Math.max(1, Math.max(...points.map(([px]) => px)) - x),
    height: Math.max(1, Math.max(...points.map(([, py]) => py)) - y),
    shape: 'ribbon',
    ribbon: polygon(points.map(([px, py]) => [px - x, py - y])),
  };
}

export function bezier(a: Point, b: Point, c: Point, d: Point, steps = 32): Point[] {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    const u = 1 - t;
    const coordinate = (axis: 0 | 1) =>
      u ** 3 * a[axis]! + 3 * u ** 2 * t * b[axis]! + 3 * u * t ** 2 * c[axis]! + t ** 3 * d[axis]!;
    return [coordinate(0), coordinate(1)];
  });
}

/** A constant-width ribbon around a polyline, with normals averaged at bends. */
export function strokeRibbon(points: readonly Point[], width: number): Point[] {
  const edges = points.map(([x, y], index) => {
    const a = points[Math.max(0, index - 1)]!;
    const b = points[Math.min(points.length - 1, index + 1)]!;
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const nx = ((-(b[1] - a[1]) / length) * width) / 2;
    const ny = (((b[0] - a[0]) / length) * width) / 2;
    return [
      [x + nx, y + ny],
      [x - nx, y - ny],
    ] as const;
  });
  return [...edges.map(([a]) => a), ...edges.map(([, b]) => b).reverse()];
}

export const tint = (color: string, percent: number) =>
  `color-mix(in oklab, ${color} ${fixed(percent)}%, var(--lilt-card-background, var(--lilt-surface)))`;
