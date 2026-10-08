import {
  readField,
  readNumber,
  seriesColor,
  type ObservationMark,
  type ObservationScene,
} from './observations-card';
import { clamp, fixed, polygon, ribbonMark, type Point } from './sculpted-geometry';

export const TAU = Math.PI * 2;
export type XYZ = readonly [number, number, number];
export type Scene<Row> = ObservationScene<Row>;
export const ink = 'var(--lilt-muted)';
export function names<Row>(data: readonly Row[], key: string): string[] | string {
  const labels = data.map((row) => readField(row, key));
  if (labels.some((label) => typeof label !== 'string' || !label.trim()))
    return `${key} needs a nonempty text label for every row.`;
  if (new Set(labels).size !== labels.length) return `${key} labels must be unique.`;
  return labels as string[];
}
export function readings<Row>(data: readonly Row[], labels: readonly string[], key: string) {
  return data.map((row, i) => ({ id: labels[i]!, label: labels[i]!, value: readNumber(row, key) }));
}
export const paint = (index: number, color?: string) => color ?? seriesColor(index);
export const sum = (values: readonly (number | null)[]) =>
  values.reduce<number>((a, b) => a + (b ?? 0), 0);
export const negative = <Row>(data: readonly Row[], key: string) =>
  data.some((row) => (readNumber(row, key) ?? 0) < 0);
export function sector(
  cx: number,
  cy: number,
  inner: number,
  outer: number,
  start: number,
  end: number,
  tilt = 1,
): Point[] {
  const n = Math.max(2, Math.ceil((end - start) * 24));
  const edge = (r: number, reverse: boolean) =>
    Array.from({ length: n + 1 }, (_, i): Point => {
      const t = start + (end - start) * (reverse ? 1 - i / n : i / n);
      return [fixed(cx + Math.cos(t) * r), fixed(cy + Math.sin(t) * r * tilt)];
    });
  return [...edge(outer, false), ...edge(inner, true)];
}
/** Orthographic camera: metric axes stay linear; z remains vertical during yaw. */
export function camera(width: number, height: number, yaw = 35, elevation = 25) {
  const a = (clamp(yaw, 35, -180, 180) * Math.PI) / 180;
  const e = (clamp(elevation, 25, 10, 70) * Math.PI) / 180;
  const scale = Math.min((width - 80) / 3, (height - 65) / 3);
  return (p: XYZ) => {
    const u = p[0] * Math.cos(a) - p[1] * Math.sin(a);
    const v = p[0] * Math.sin(a) + p[1] * Math.cos(a);
    return {
      x: fixed(width / 2 + u * scale),
      y: fixed(height / 2 + (v * Math.sin(e) - p[2] * Math.cos(e)) * scale),
      depth: fixed(v * Math.cos(e) + p[2] * Math.sin(e)),
      scale,
      lift: Math.cos(e) * scale,
    };
  };
}
export function normalize(values: readonly (number | null)[]) {
  const finite = values.filter((v): v is number => v !== null);
  const low = finite.length ? Math.min(...finite) : 0,
    high = finite.length ? Math.max(...finite) : 1;
  // Dividing before subtracting also handles domains spanning -MAX_VALUE to MAX_VALUE.
  const size = Math.max(1, Math.abs(low), Math.abs(high));
  return {
    low,
    high,
    at: (v: number) =>
      low === high ? 0 : ((v / size - low / size) / (high / size - low / size)) * 2 - 1,
  };
}
export function axes<Row>(
  project: ReturnType<typeof camera>,
  keys: readonly string[],
): Pick<Scene<Row>, 'paths' | 'labels'> {
  const origin = project([-1, -1, -1]);
  const tips: XYZ[] = [
    [1, -1, -1],
    [-1, 1, -1],
    [-1, -1, 1],
  ];
  return {
    paths: tips.map((tip, i) => {
      const b = project(tip);
      return {
        id: `axis-${i}`,
        d: `M${origin.x},${origin.y} L${b.x},${b.y}`,
        stroke: ink,
        enter: 'draw',
      };
    }),
    labels: tips.map((tip, i) => {
      const b = project(tip);
      return { x: b.x, y: b.y + 18, text: keys[i]!, anchor: 'middle' };
    }),
  };
}
export function cube<Row>(
  mark: Omit<ObservationMark<Row>, 'x' | 'y' | 'width' | 'height'>,
  p: XYZ,
  radius: number,
  project: ReturnType<typeof camera>,
): ObservationMark<Row> {
  const roof = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ].map(([x, y]) => project([p[0] + x! * radius, p[1] + y! * radius, p[2] + radius]));
  const x = Math.min(...roof.map((p) => p.x)),
    y = Math.min(...roof.map((p) => p.y));
  const lift = 2 * radius * project(p).lift;
  return {
    ...mark,
    x,
    y,
    width: Math.max(...roof.map((p) => p.x)) - x,
    height: Math.max(...roof.map((p) => p.y)) - y + lift,
    shape: 'prism',
    prism: {
      top: roof.map((p) => [p.x - x, p.y - y]),
      lift,
      depth: Math.round((project(p).depth + 4) * 100),
      wave: mark.wave ?? 0,
    },
  };
}
export function slab<Row>(
  mark: Omit<ObservationMark<Row>, 'x' | 'y' | 'width' | 'height'>,
  x: number,
  y: number,
  width: number,
  height: number,
  lift: number,
): ObservationMark<Row> {
  return {
    ...mark,
    x,
    y,
    width: width + lift,
    height: height + lift * 0.5,
    shape: 'prism',
    prism: {
      top: [
        [0, lift * 0.5],
        [lift, 0],
        [width + lift, 0],
        [width, lift * 0.5],
      ],
      lift: height,
      depth: Math.round(y),
      wave: mark.wave ?? 0,
    },
  };
}
export function ribbon<Row>(
  mark: Omit<ObservationMark<Row>, 'x' | 'y' | 'width' | 'height' | 'shape'>,
  points: readonly Point[],
) {
  return ribbonMark(mark, points);
}
export { polygon };
