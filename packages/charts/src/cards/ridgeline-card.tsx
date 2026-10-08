'use client';

import type { NumericKey, TextKey, XKey } from './keys';
import {
  ObservationsCard,
  readField,
  readNumber,
  seriesColor,
  type ObservationMark,
  type ObservationsCardProps,
  type ObservationScene,
} from './observations-card';
import { EmptyShapeContext } from '../lifecycle/chart-empty';

export interface RidgelineCardProps<Row, Key extends NumericKey<Row>>
  extends Omit<ObservationsCardProps<Row>, 'legend' | 'legendSwatch'> {
  /** One ridge per series, back to front in first-seen order. */
  series: TextKey<Row>;
  /** Position along each ridge, in first-seen order. */
  x: XKey<Row>;
  value: Key;
  /** How many rows the tallest peak rises over the ridges behind it. Default 2.2. */
  overlap?: number;
  /** Fixed value domain that must contain every value. Defaults to zero through the largest. */
  domain?: readonly [number, number];
}

const labelOf = (value: unknown) =>
  value instanceof Date ? value.toISOString().slice(0, 10) : String(value);

/** A smooth line through the points that never overshoots between them. */
function smooth(points: readonly (readonly [number, number])[]) {
  let d = `M${points[0]![0]},${points[0]![1]}`;
  for (let index = 1; index < points.length; index++) {
    const [x0, y0] = points[index - 1]!;
    const [x1, y1] = points[index]!;
    const mid = (x1 - x0) / 2;
    d += ` C${x0 + mid},${y0} ${x1 - mid},${y1} ${x1},${y1}`;
  }
  return d;
}

/**
 * Layered distributions receding into depth. Each series is a ridge that rises over the ones
 * behind it and hides them where it is taller, so the shape of every row reads at a glance while
 * every value stays inspectable.
 */
export function ridgelineLayout<Row>(
  data: readonly Row[],
  series: string,
  x: string,
  value: string,
  width: number,
  height: number,
  options: { overlap?: number; domain?: readonly [number, number]; color?: string } = {},
): ObservationScene<Row> {
  const names: string[] = [];
  const positions: string[] = [];
  const readings = new Map<string, { datum: Row; value: number | null }>();
  for (const datum of data) {
    const name = readField(datum, series);
    const at = readField(datum, x);
    if (typeof name !== 'string' || at === null || at === undefined)
      return { marks: [], error: 'Each row needs a text series and an x position.' };
    const key = `${name}\u0000${labelOf(at)}`;
    if (readings.has(key))
      return { marks: [], error: 'Each series needs one row per x position; sum them first.' };
    readings.set(key, { datum, value: readNumber(datum, value) });
    if (!names.includes(name)) names.push(name);
    if (!positions.includes(labelOf(at))) positions.push(labelOf(at));
  }
  if (!readings.size) return { marks: [] };
  const known = [...readings.values()].flatMap((item) => (item.value === null ? [] : [item.value]));
  const low = options.domain?.[0] ?? Math.min(0, ...known);
  const high = options.domain?.[1] ?? Math.max(low + 1, ...known);
  if (!(low < high) || known.some((v) => v < low || v > high))
    return {
      marks: [],
      error: 'domain must contain every value with a finite low end below its high end.',
    };
  const overlap = Math.max(0.5, Math.min(6, options.overlap ?? 2.2));
  const left = 76;
  const right = width - 8;
  const top = 4;
  const bottom = 22;
  const step = Math.max(10, (height - top - bottom) / (names.length - 1 + overlap));
  const peak = step * overlap;
  const slot = positions.length > 1 ? (right - left) / (positions.length - 1) : right - left;
  const at = (index: number) => (positions.length > 1 ? left + index * slot : (left + right) / 2);
  const color = options.color ?? seriesColor(0);
  const marks: ObservationMark<Row>[] = [];
  const paths: NonNullable<ObservationScene<Row>['paths']> = [];
  const labels: NonNullable<ObservationScene<Row>['labels']> = [];
  for (const [row, name] of names.entries()) {
    const base = top + peak + row * step;
    // Nearer ridges are stronger, so the stack recedes into the card like distance haze.
    const strength = names.length > 1 ? 30 + (row / (names.length - 1)) * 70 : 100;
    const fill = `color-mix(in oklab, ${color} ${strength}%, var(--lilt-card-background, var(--lilt-surface)))`;
    const points = positions.map((position, index) => {
      const reading = readings.get(`${name}\u0000${position}`)?.value ?? null;
      const share = reading === null ? 0 : (reading - low) / (high - low);
      return [at(index), base - share * peak] as const;
    });
    paths.push({
      id: name,
      group: name,
      d: `${smooth(points)} L${points.at(-1)![0]},${base} L${points[0]![0]},${base} Z`,
      fill,
      enter: 'rise',
      wave: names.length > 1 ? row / (names.length - 1) : 0,
      stroke: `color-mix(in oklab, ${color}, var(--lilt-text) 25%)`,
    });
    labels.push({ x: 0, y: base - 3, text: name });
    for (const [index, position] of positions.entries()) {
      const item = readings.get(`${name}\u0000${position}`);
      // A flat reading still gets a small hit area, kept above its baseline.
      const y = Math.min(points[index]![1], base - 4);
      marks.push({
        id: `${name} · ${position}`,
        label: `${name} · ${position}`,
        datum: item?.datum ?? null,
        value: item?.value ?? null,
        x: at(index) - slot / 2,
        y,
        width: slot,
        height: base - y,
        color,
        group: name,
        shape: 'point',
        layer: row + 1,
        missing: (item?.value ?? null) === null,
      });
    }
  }
  const every = Math.max(
    1,
    Math.ceil(positions.length / Math.max(2, Math.floor((right - left) / 56))),
  );
  const front = top + peak + (names.length - 1) * step;
  for (const [index, position] of positions.entries())
    if (index % every === 0)
      labels.push({ x: at(index), y: front + 16, text: position, anchor: 'middle' });
  return {
    marks,
    paths,
    labels,
    width,
    height: front + bottom,
    note: 'Hover a ridge to read it · Nearer rows are stronger',
  };
}

export function RidgelineCard<Row, const Key extends NumericKey<Row>>({
  series,
  x,
  value,
  overlap,
  domain,
  color,
  height = 300,
  ...props
}: RidgelineCardProps<Row, Key>) {
  const options = { overlap, domain, color };
  return (
    <EmptyShapeContext.Provider value="wave">
      <ObservationsCard
        {...props}
        height={height}
        color={color}
        family="ridgeline"
        legend={false}
        layout={(data, width, plotHeight) =>
          ridgelineLayout(data, series, x, value, width, plotHeight, options)
        }
        placeholder={(width, plotHeight) =>
          ridgelineLayout(
            // Smooth single peaks drifting across the rows, so the placeholder reads as ridges.
            Array.from({ length: 5 * 24 }, (_, index) => {
              const row = Math.floor(index / 24);
              const at = index % 24;
              return {
                series: `${row}`,
                x: at,
                value: 1 + 9 * Math.exp(-(((at - 9 - row * 1.5) / 4.5) ** 2)),
              };
            }),
            'series',
            'x',
            'value',
            width,
            plotHeight,
            options,
          ) as ObservationScene<Row>
        }
      />
    </EmptyShapeContext.Provider>
  );
}
