'use client';

import type { NumericKey, TextKey } from './keys';
import {
  ObservationsCard,
  readField,
  readNumber,
  seriesColor,
  type ObservationMark,
  type ObservationsCardProps,
  type ObservationScene,
} from './observations-card';
import { project } from './prism-grid';
import { EmptyShapeContext } from '../lifecycle/chart-empty';

export interface TerrainCardProps<Row, Key extends NumericKey<Row>>
  extends Omit<ObservationsCardProps<Row>, 'legend' | 'legendSwatch'> {
  /** Columns, running away to the right, in first-seen order. */
  x: TextKey<Row>;
  /** Rows, coming toward the viewer, in first-seen order. */
  y: TextKey<Row>;
  value: Key;
  /** How many cell lengths the highest value rises, default 3. */
  rise?: number;
  /** Surface samples between neighbouring readings, 1 to 6, default 4. Higher is smoother. */
  smoothing?: number;
  /** Fixed value domain that must contain every value. Defaults to zero through the largest. */
  domain?: readonly [number, number];
}

/** Catmull-Rom through four neighbours; the surface passes exactly through every reading. */
const catmull = (a: number, b: number, c: number, d: number, t: number) =>
  0.5 *
  (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (3 * b - a - 3 * c + d) * t * t * t);

/** Light from above, behind and to the left of the viewer. */
const LIGHT = (() => {
  const [x, y, z] = [-0.55, -0.45, 0.8];
  const length = Math.hypot(x, y, z);
  return [x / length, y / length, z / length] as const;
})();

/**
 * A grid of readings as a lit landscape. The surface passes through every reading, peaks catch
 * the light and slopes facing away fall into shade, and hovering drops a pin onto the reading.
 */
export function terrainLayout<Row>(
  data: readonly Row[],
  x: string,
  y: string,
  value: string,
  width: number,
  height: number,
  options: Pick<
    TerrainCardProps<Row, NumericKey<Row>>,
    'rise' | 'smoothing' | 'domain' | 'color'
  > = {},
): ObservationScene<Row> {
  const columns: string[] = [];
  const rows: string[] = [];
  const readings = new Map<string, { datum: Row; value: number | null }>();
  for (const datum of data) {
    const column = readField(datum, x);
    const row = readField(datum, y);
    if (typeof column !== 'string' || typeof row !== 'string')
      return { marks: [], error: 'Each row needs text x and y categories.' };
    const id = `${column} · ${row}`;
    if (readings.has(id))
      return { marks: [], error: 'Each x and y pair needs one row; sum them first.' };
    readings.set(id, { datum, value: readNumber(datum, value) });
    if (!columns.includes(column)) columns.push(column);
    if (!rows.includes(row)) rows.push(row);
  }
  if (!readings.size) return { marks: [] };
  if (columns.length < 2 || rows.length < 2)
    return { marks: [], error: 'A terrain needs at least two x and two y categories.' };
  const known = [...readings.values()].flatMap((item) => (item.value === null ? [] : [item.value]));
  const low = options.domain?.[0] ?? Math.min(0, ...known);
  const high = options.domain?.[1] ?? Math.max(low + 1, ...known);
  if (!(low < high) || known.some((v) => v < low || v > high))
    return {
      marks: [],
      error: 'domain must contain every value with a finite low end below its high end.',
    };
  const rise = Math.max(0.5, Math.min(10, options.rise ?? 3));
  // Heights in floor units; a missing reading sits on the floor.
  const grid = rows.map((row) =>
    columns.map((column) => {
      const reading = readings.get(`${column} · ${row}`)?.value ?? null;
      return reading === null ? 0 : ((reading - low) / (high - low)) * rise;
    }),
  );
  const at = (i: number, j: number) =>
    grid[Math.max(0, Math.min(rows.length - 1, j))]![Math.max(0, Math.min(columns.length - 1, i))]!;
  const steps = Math.max(1, Math.min(6, Math.round(options.smoothing ?? 4)));
  const sampleColumns = (columns.length - 1) * steps + 1;
  const sampleRows = (rows.length - 1) * steps + 1;
  const surface = Array.from({ length: sampleRows }, (_, b) =>
    Array.from({ length: sampleColumns }, (_, a) => {
      const i = Math.floor(a / steps);
      const j = Math.floor(b / steps);
      const s = a / steps - i;
      const t = b / steps - j;
      const along = (jj: number) =>
        catmull(at(i - 1, jj), at(i, jj), at(i + 1, jj), at(i + 2, jj), s);
      return Math.max(0, catmull(along(j - 1), along(j), along(j + 1), along(j + 2), t));
    }),
  );
  // Fit the floor and the highest peak; labels below and to the right.
  const below = 22;
  const right = 64;
  const headroom = 4;
  const peak = Math.max(...surface.flat());
  const corners = [
    project(0, 0, peak),
    project(columns.length - 1, 0, peak),
    project(0, rows.length - 1),
    project(columns.length - 1, rows.length - 1),
  ];
  const minX = Math.min(...corners.map(([px]) => px));
  const maxX = Math.max(...corners.map(([px]) => px));
  const minY = Math.min(...corners.map(([, py]) => py));
  const maxY = Math.max(...corners.map(([, py]) => py));
  const scale = Math.max(
    6,
    Math.min((width - right) / (maxX - minX), (height - below - headroom) / (maxY - minY)),
  );
  const sceneWidth = Math.max(width, (maxX - minX) * scale + right);
  const offsetX = (sceneWidth - right - (maxX - minX) * scale) / 2 - minX * scale;
  const offsetY = headroom - minY * scale;
  const screen = (gx: number, gy: number, z: number) => {
    const [px, py] = project(gx, gy, z);
    return [px * scale + offsetX, py * scale + offsetY] as const;
  };
  const color = options.color ?? seriesColor(0);
  const paths: NonNullable<ObservationScene<Row>['paths']> = [];
  // Back to front: nearer quads paint over farther ones.
  const quads: [number, number][] = [];
  for (let b = 0; b < sampleRows - 1; b++)
    for (let a = 0; a < sampleColumns - 1; a++) quads.push([a, b]);
  quads.sort(([a1, b1], [a2, b2]) => a1 + b1 - (a2 + b2));
  const span = sampleColumns + sampleRows - 2;
  const shape = (corners: readonly (readonly [number, number])[]) =>
    `M${corners.map(([px, py]) => `${px.toFixed(2)},${py.toFixed(2)}`).join(' L')} Z`;
  for (const [a, b] of quads) {
    const heights = [
      surface[b]![a]!,
      surface[b]![a + 1]!,
      surface[b + 1]![a + 1]!,
      surface[b + 1]![a]!,
    ];
    const cells = [
      [a, b],
      [a + 1, b],
      [a + 1, b + 1],
      [a, b + 1],
    ] as const;
    const point = (index: number, flat = false) =>
      screen(cells[index]![0] / steps, cells[index]![1] / steps, flat ? 0 : heights[index]!);
    // Surface normal from the two slopes, in floor units.
    const dx = ((heights[1]! + heights[2]! - heights[0]! - heights[3]!) / 2) * steps;
    const dy = ((heights[3]! + heights[2]! - heights[0]! - heights[1]!) / 2) * steps;
    const length = Math.hypot(dx, dy, 1);
    const light = Math.max(0, (-dx * LIGHT[0] - dy * LIGHT[1] + LIGHT[2]) / length);
    // Smoothing can overshoot a little between readings; colour stays within the scale.
    const share = Math.min(1, heights.reduce((sum, h) => sum + h, 0) / 4 / rise);
    const fill = `color-mix(in oklab, color-mix(in oklab, ${color} ${18 + share * 82}%, var(--lilt-card-background, var(--lilt-surface))), black ${Math.round((1 - light) * 40)}%)`;
    paths.push({
      id: `${a}:${b}`,
      d: shape([0, 1, 2, 3].map((index) => point(index))),
      from: shape([0, 1, 2, 3].map((index) => point(index, true))),
      fill,
      stroke: fill,
      wave: (a + b) / span,
      // Placeholder tone: stretch the light so hills still read in grey.
      shade: Math.min(1, (1 - light) * 2.4),
    });
  }
  const marks: ObservationMark<Row>[] = [];
  const slot = Math.max(8, scale * 0.8);
  for (const [j, row] of rows.entries())
    for (const [i, column] of columns.entries()) {
      const item = readings.get(`${column} · ${row}`);
      const [px, py] = screen(i, j, grid[j]![i]!);
      const [, floor] = screen(i, j, 0);
      const top = Math.min(py, floor - 4);
      marks.push({
        id: `${column} · ${row}`,
        label: `${column} · ${row}`,
        datum: item?.datum ?? null,
        value: item?.value ?? null,
        x: px - slot / 2,
        y: top,
        width: slot,
        height: floor - top,
        color,
        shape: 'point',
        layer: i + j + 1,
        missing: (item?.value ?? null) === null,
      });
    }
  const labels: NonNullable<ObservationScene<Row>['labels']> = [];
  let last = -Infinity;
  for (const [i, column] of columns.entries()) {
    const [px, py] = screen(i, rows.length - 1, 0);
    if (px - last < 34) continue;
    labels.push({ x: px, y: py + 16, text: column, anchor: 'middle' });
    last = px;
  }
  for (const [j, row] of rows.entries()) {
    const [px, py] = screen(columns.length - 1, j, 0);
    labels.push({ x: px + 8, y: py + 4, text: row });
  }
  const floorBottom = screen(columns.length - 1, rows.length - 1, 0)[1];
  return {
    marks,
    paths,
    labels,
    width: sceneWidth,
    height: floorBottom + below,
    note: 'Higher and brighter: more · Hover to pin a reading',
  };
}

export function TerrainCard<Row, const Key extends NumericKey<Row>>({
  x,
  y,
  value,
  rise,
  smoothing,
  domain,
  color,
  height = 320,
  ...props
}: TerrainCardProps<Row, Key>) {
  const options = { rise, smoothing, domain, color };
  return (
    <EmptyShapeContext.Provider value="wave">
      <ObservationsCard
        {...props}
        height={height}
        color={color}
        family="terrain"
        legend={false}
        layout={(data, width, plotHeight) =>
          terrainLayout(data, x, y, value, width, plotHeight, options)
        }
        placeholder={(width, plotHeight) =>
          terrainLayout(
            // Two soft hills, so the placeholder already reads as a landscape.
            Array.from({ length: 10 * 6 }, (_, index) => {
              const i = index % 10;
              const j = Math.floor(index / 10);
              return {
                x: `${i}`,
                y: `${j}`,
                value:
                  8 * Math.exp(-((i - 3) ** 2 + (j - 2) ** 2) / 6) +
                  5 * Math.exp(-((i - 7) ** 2 + (j - 4) ** 2) / 5),
              };
            }),
            'x',
            'y',
            'value',
            width,
            plotHeight,
            { ...options, domain: undefined },
          ) as ObservationScene<Row>
        }
      />
    </EmptyShapeContext.Provider>
  );
}
