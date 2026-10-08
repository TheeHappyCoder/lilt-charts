'use client';

import type { NumericKey, TextKey } from './keys';
import {
  ObservationsCard,
  readField,
  readNumber,
  seriesColor,
  type ObservationsCardProps,
  type ObservationScene,
} from './observations-card';
import { bad, clamp, frame, identity, polygon, tint, type Point } from './sculpted-geometry';
import { densityContours } from './density-contours';
import { EmptyShapeContext } from '../lifecycle/chart-empty';

export interface ContourIslandsCardProps<Row, Key extends NumericKey<Row>>
  extends Omit<ObservationsCardProps<Row>, 'legend' | 'legendSwatch'> {
  x: Key;
  y: Key;
  label: TextKey<Row>;
  /** Optional nonnegative density weight. Without it each observation has weight one. */
  weight?: Key;
  /** Kernel bandwidth as a fraction of each axis span, 0.04–0.25. Default 0.1. */
  bandwidth?: number;
  /** Number of contour terraces, 3–9. Default 6. */
  levels?: number;
}

export const placeholderCloud = Array.from({ length: 45 }, (_, i) => ({
  name: `Point ${i + 1}`,
  x: [25, 65, 50][i % 3]! + Math.sin(i * 2.4) * (3 + (i % 8)),
  y: [35, 65, 20][i % 3]! + Math.cos(i * 1.7) * (3 + (i % 9)),
}));

export function contourIslandsLayout<Row>(
  data: readonly Row[],
  xKey: string,
  yKey: string,
  label: string,
  width: number,
  height: number,
  options: { weight?: string; bandwidth?: number; levels?: number; color?: string } = {},
): ObservationScene<Row> {
  const seen = new Set<string>();
  const items: {
    name: string;
    datum: Row;
    x: number | null;
    y: number | null;
    weight: number | null;
  }[] = [];
  for (const datum of data) {
    const name = readField(datum, label);
    if (typeof name !== 'string' || seen.has(name))
      return bad('Every point needs a unique text label.');
    seen.add(name);
    const weight = options.weight ? readNumber(datum, options.weight) : 1;
    if (weight !== null && weight < 0) return bad('Density weights cannot be negative.');
    items.push({ name, datum, x: readNumber(datum, xKey), y: readNumber(datum, yKey), weight });
  }
  if (!items.length) return { marks: [] };
  const readings = items.map((item) => ({
    id: identity(item.name),
    label: item.name,
    value: item.x === null || item.y === null ? null : item.weight,
  }));
  const located = items.filter(
    (item): item is typeof item & { x: number; y: number } => item.x !== null && item.y !== null,
  );
  if (!located.length)
    return { marks: [], readings, note: 'No observations with both coordinates.' };
  const size = frame(width, height);
  const bandwidth = clamp(options.bandwidth, 0.1, 0.04, 0.25),
    levels = Math.round(clamp(options.levels, 6, 3, 9));
  const extent = (values: number[]) => {
    let low = Math.min(...values),
      high = Math.max(...values);
    if (low === high) {
      const pad = Math.max(0.5, Math.abs(low) * 1e-6);
      low -= pad;
      high += pad;
    }
    const span = high - low,
      pad = span * bandwidth * 3;
    return { low: low - pad, high: high + pad, kernel: span * bandwidth };
  };
  const xs = extent(located.map((item) => item.x)),
    ys = extent(located.map((item) => item.y));
  if (![xs.low, xs.high, ys.low, ys.high].every(Number.isFinite))
    return bad('Coordinate spans must be finite.');
  const nx = 53,
    ny = 37;
  // Relative density, normalized by the largest weight to avoid overflow for large counts.
  const maxWeight = Math.max(1, ...located.map((item) => item.weight ?? 0));
  const grid = Array.from({ length: ny }, (_, j) =>
    Array.from({ length: nx }, (_, i) => {
      const x = xs.low + (i / (nx - 1)) * (xs.high - xs.low),
        y = ys.low + (j / (ny - 1)) * (ys.high - ys.low);
      return located.reduce(
        (sum, item) =>
          sum +
          ((item.weight ?? 0) / maxWeight) *
            Math.exp(-0.5 * (((x - item.x) / xs.kernel) ** 2 + ((y - item.y) / ys.kernel) ** 2)),
        0,
      );
    }),
  );
  const peak = Math.max(...grid.flat());
  const color = options.color ?? seriesColor(0);
  const lift = 3;
  const screen = (x: number, y: number, level = 0): Point => [
    38 + (x / (nx - 1)) * (size.width - 76),
    30 + levels * lift + (1 - y / (ny - 1)) * (size.height - 78 - levels * lift) - level * lift,
  ];
  const paths: NonNullable<ObservationScene<Row>['paths']> = [];
  if (peak > 0)
    for (let level = 1; level <= levels; level++) {
      const rings = densityContours(grid, (peak * level) / (levels + 1));
      // Compound paths preserve holes as well as separate islands.
      const top = rings.map((ring) => polygon(ring.map(([x, y]) => screen(x, y, level)))).join(' ');
      if (!top) continue;
      const side = rings
        .map((ring) => polygon(ring.map(([x, y]) => screen(x, y, level - 1))))
        .join(' ');
      paths.push({
        id: `side-${level}`,
        d: side,
        fill: tint(color, 18 + (level / levels) * 50),
        enter: 'rise',
        wave: level / levels,
        shade: 0.7,
      });
      paths.push({
        id: `top-${level}`,
        d: top,
        fill: tint(color, 22 + (level / levels) * 78),
        stroke: tint(color, 45 + (level / levels) * 55),
        enter: 'rise',
        wave: level / levels,
        shade: level / levels,
      });
    }
  const marks = located.map((item, index) => {
    const gx = ((item.x - xs.low) / (xs.high - xs.low)) * (nx - 1),
      gy = ((item.y - ys.low) / (ys.high - ys.low)) * (ny - 1);
    const density = grid[Math.round(gy)]![Math.round(gx)]!;
    const level = peak > 0 ? Math.min(levels, Math.floor((density / peak) * (levels + 1))) : 0;
    const [x, y] = screen(gx, gy, level);
    return {
      id: identity(item.name),
      label: `${item.name} · ${xKey}: ${item.x} · ${yKey}: ${item.y}`,
      datum: item.datum,
      value: item.weight,
      x: x - 4,
      y: y - 4,
      width: 8,
      height: 8,
      color: `color-mix(in oklab, ${color}, white 42%)`,
      shape: 'dot' as const,
      wave: index / located.length,
      missing: item.weight === null,
    };
  });
  return {
    ...size,
    marks,
    paths,
    readings,
    labels: [
      { x: 38, y: size.height - 14, text: `${xKey} →` },
      { x: size.width - 38, y: 19, text: `${yKey} ↑`, anchor: 'end' },
    ],
    note: 'Higher terraces: denser observations · Contours are estimates; dots are actual readings',
  };
}

export function ContourIslandsCard<Row, const Key extends NumericKey<Row>>({
  x,
  y,
  label,
  weight,
  bandwidth,
  levels,
  color,
  height = 320,
  ...props
}: ContourIslandsCardProps<Row, Key>) {
  const options = { weight, bandwidth, levels, color };
  return (
    <EmptyShapeContext.Provider value="wave">
      <ObservationsCard
        {...props}
        color={color}
        height={height}
        family="contour-islands"
        legend={false}
        layout={(data, width, h) => contourIslandsLayout(data, x, y, label, width, h, options)}
        placeholder={(width, h) =>
          contourIslandsLayout(placeholderCloud, 'x', 'y', 'name', width, h, {
            ...options,
            weight: undefined,
          }) as ObservationScene<Row>
        }
      />
    </EmptyShapeContext.Provider>
  );
}
