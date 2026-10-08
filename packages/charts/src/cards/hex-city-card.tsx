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
import { fitFloorPrisms, project, type FloorPrism } from './prism-grid';
import { EmptyShapeContext } from '../lifecycle/chart-empty';

export interface HexCityCardProps<Row, Key extends NumericKey<Row>>
  extends Omit<ObservationsCardProps<Row>, 'legendSwatch'> {
  /** Unique name for each hexagon. */
  label: TextKey<Row>;
  value: Key;
  /** Colors hexagons by a category and adds its legend. */
  group?: TextKey<Row>;
  /** `rank` (default) puts the largest value in the middle and works outward; `order` keeps rows in order. */
  arrange?: 'rank' | 'order';
  /** How many hexagon widths the largest value rises, default 2. */
  rise?: number;
  /** Space between hexagons as a share of their size, 0 to 0.5, default 0.12. */
  gap?: number;
  /** Fixed value domain that must contain every value. Defaults to zero through the largest. */
  domain?: readonly [number, number];
}

const DIRECTIONS = [
  [1, 0],
  [1, -1],
  [0, -1],
  [-1, 0],
  [-1, 1],
  [0, 1],
] as const;

/** Axial hexagon coordinates spiralling out from the centre, ring by ring. */
function spiral(count: number) {
  const cells: { q: number; r: number; ring: number }[] = [{ q: 0, r: 0, ring: 0 }];
  for (let ring = 1; cells.length < count; ring++) {
    let q = -ring;
    let r = ring;
    for (const [dq, dr] of DIRECTIONS)
      for (let step = 0; step < ring; step++) {
        cells.push({ q, r, ring });
        q += dq;
        r += dr;
      }
  }
  return cells.slice(0, count);
}

/**
 * A honeycomb of hexagonal prisms: one per row, standing as tall as its value. By default the
 * largest value stands in the middle and the city falls away toward its edges.
 */
export function hexCityLayout<Row>(
  data: readonly Row[],
  label: string,
  value: string,
  width: number,
  height: number,
  options: Pick<
    HexCityCardProps<Row, NumericKey<Row>>,
    'arrange' | 'rise' | 'gap' | 'domain' | 'color'
  > & {
    group?: string;
  } = {},
): ObservationScene<Row> {
  const items: { datum: Row; label: string; value: number | null; group?: string }[] = [];
  const seen = new Set<string>();
  for (const datum of data) {
    const name = readField(datum, label);
    if (typeof name !== 'string') return { marks: [], error: 'Each row needs a text label.' };
    if (seen.has(name)) return { marks: [], error: 'Labels must be unique.' };
    seen.add(name);
    const category = options.group === undefined ? undefined : readField(datum, options.group);
    items.push({
      datum,
      label: name,
      value: readNumber(datum, value),
      group: typeof category === 'string' ? category : undefined,
    });
  }
  if (!items.length) return { marks: [] };
  const known = items.flatMap((item) => (item.value === null ? [] : [item.value]));
  const low = options.domain?.[0] ?? Math.min(0, ...known);
  const high = options.domain?.[1] ?? Math.max(low + 1, ...known);
  if (!(low < high) || known.some((v) => v < low || v > high))
    return {
      marks: [],
      error: 'domain must contain every value with a finite low end below its high end.',
    };
  const ordered =
    options.arrange === 'order'
      ? items
      : [...items].sort((a, b) => (b.value ?? -Infinity) - (a.value ?? -Infinity));
  const cells = spiral(ordered.length);
  const rings = Math.max(1, cells.at(-1)!.ring);
  const groups = [...new Set(items.flatMap((item) => (item.group ? [item.group] : [])))];
  const inset = 1 - Math.max(0, Math.min(0.5, options.gap ?? 0.12));
  const tallest = Math.max(0.5, Math.min(12, options.rise ?? 2)) * Math.sqrt(3);
  const slab = 0.12;
  // Nearer hexagons (further down the screen) paint over farther ones.
  const centres = cells.map(({ q, r }) => [Math.sqrt(3) * (q + r / 2), 1.5 * r] as const);
  const order = centres
    .map(([x, y], index) => ({ index, depth: project(x, y)[1] }))
    .sort((a, b) => a.depth - b.depth)
    .map((entry) => entry.index);
  const depthOf = new Map(order.map((index, rank) => [index, rank]));
  const prisms = ordered.map((item, index): FloorPrism<Row> => {
    const [cx, cy] = centres[index]!;
    const share = item.value === null ? 0 : (item.value - low) / (high - low);
    const base = options.color ?? seriesColor(item.group ? groups.indexOf(item.group) : 0);
    return {
      id: item.label,
      label: item.label,
      datum: item.datum,
      value: item.value,
      group: item.group,
      color: item.group
        ? base
        : `color-mix(in oklab, ${base} ${item.value === null ? 0 : 25 + share * 75}%, var(--lilt-card-background, var(--lilt-surface)))`,
      missing: item.value === null,
      footprint: Array.from({ length: 6 }, (_, corner) => {
        const angle = ((60 * corner - 30) * Math.PI) / 180;
        return [cx + Math.cos(angle) * inset, cy + Math.sin(angle) * inset] as const;
      }),
      base: 0,
      rise: item.value === null ? slab : slab + share * (tallest - slab),
      depth: depthOf.get(index)!,
      // The city grows out from its centre.
      wave: cells[index]!.ring / rings,
    };
  });
  const fitted = fitFloorPrisms(prisms, width, height);
  return {
    marks: fitted.marks,
    width: fitted.width,
    height: fitted.height,
    ...(groups.length
      ? {
          groups: groups.map((id, index) => ({
            id,
            label: id,
            color: options.color ?? seriesColor(index),
            value: items
              .filter((item) => item.group === id)
              .reduce((sum, item) => sum + (item.value ?? 0), 0),
          })),
        }
      : {}),
    note: options.arrange === 'order' ? 'Taller: more' : 'Taller: more · Largest in the middle',
  };
}

export function HexCityCard<Row, const Key extends NumericKey<Row>>({
  label,
  value,
  group,
  arrange,
  rise,
  gap,
  domain,
  color,
  legend,
  height = 260,
  ...props
}: HexCityCardProps<Row, Key>) {
  const options = { group, arrange, rise, gap, domain, color };
  return (
    <EmptyShapeContext.Provider value="tiles">
      <ObservationsCard
        {...props}
        height={height}
        color={color}
        family="hex-city"
        legend={group ? legend : false}
        layout={(data, width, plotHeight) =>
          hexCityLayout(data, label, value, width, plotHeight, options)
        }
        placeholder={(width, plotHeight) =>
          hexCityLayout(
            // A small city tapering from its centre, so loading already reads in depth.
            Array.from({ length: 19 }, (_, index) => ({
              label: `${index}`,
              value: 10 - index * 0.4 + ((index * 7) % 3),
            })),
            'label',
            'value',
            width,
            plotHeight,
            { ...options, group: undefined, domain: undefined },
          ) as ObservationScene<Row>
        }
      />
    </EmptyShapeContext.Provider>
  );
}
