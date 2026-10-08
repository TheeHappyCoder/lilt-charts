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
import { fitFloorPrisms, type FloorPrism } from './prism-grid';
import { EmptyShapeContext } from '../lifecycle/chart-empty';

export interface VoxelWaffleCardProps<Row, Key extends NumericKey<Row>>
  extends Omit<ObservationsCardProps<Row>, 'legendSwatch'> {
  category: TextKey<Row>;
  value: Key;
  /** How many cubes make the whole, default 100. */
  units?: number;
  /** Cubes along each side of a layer, default 5. */
  footprint?: number;
}

/** Whole cubes per category that add up to exactly `units`, by largest remainder. */
export function allocateUnits(values: readonly number[], units: number): number[] {
  const total = values.reduce((sum, value) => sum + value, 0);
  if (total <= 0) return values.map(() => 0);
  const exact = values.map((value) => (value / total) * units);
  const whole = exact.map(Math.floor);
  let left = units - whole.reduce((sum, value) => sum + value, 0);
  const byRemainder = exact
    .map((value, index) => ({ index, rest: value - Math.floor(value) }))
    .sort((a, b) => b.rest - a.rest || a.index - b.index);
  for (const { index } of byRemainder) {
    if (left <= 0) break;
    whole[index]! += 1;
    left -= 1;
  }
  return whole;
}

/**
 * Shares of a whole as a block of cubes: each category fills its share of `units` cubes, layer by
 * layer from the floor up, so the block reads like a stacked waffle you can count.
 */
export function voxelLayout<Row>(
  data: readonly Row[],
  category: string,
  value: string,
  width: number,
  height: number,
  options: Pick<VoxelWaffleCardProps<Row, NumericKey<Row>>, 'units' | 'footprint' | 'color'> = {},
): ObservationScene<Row> {
  const items: { datum: Row; label: string; value: number | null }[] = [];
  for (const datum of data) {
    const name = readField(datum, category);
    if (typeof name !== 'string') return { marks: [], error: 'Each row needs a text category.' };
    if (items.some((item) => item.label === name))
      return { marks: [], error: 'Each category needs one row; sum them first.' };
    const reading = readNumber(datum, value);
    if (reading !== null && reading < 0)
      return { marks: [], error: 'Shares of a whole cannot be negative.' };
    items.push({ datum, label: name, value: reading });
  }
  if (!items.length) return { marks: [] };
  const units = Math.max(1, Math.min(1000, Math.round(options.units ?? 100)));
  const side = Math.max(1, Math.min(20, Math.round(options.footprint ?? 5)));
  const counts = allocateUnits(
    items.map((item) => item.value ?? 0),
    units,
  );
  const perLayer = side * side;
  const size = 0.84;
  const inset = (1 - size) / 2;
  const prisms: FloorPrism<Row>[] = [];
  let cube = 0;
  for (const [index, item] of items.entries())
    for (let n = 0; n < counts[index]!; n++, cube++) {
      const layer = Math.floor(cube / perLayer);
      const row = Math.floor((cube % perLayer) / side);
      const column = cube % side;
      const x = column + inset;
      const y = row + inset;
      prisms.push({
        id: `${item.label}:${n}`,
        label: item.label,
        datum: item.datum,
        value: item.value,
        group: item.label,
        color: options.color ?? seriesColor(index),
        footprint: [
          [x, y],
          [x + size, y],
          [x + size, y + size],
          [x, y + size],
        ],
        base: layer + inset,
        rise: size,
        depth: column + row + layer,
        wave: cube / units,
        enter: 'drop',
      });
    }
  const total = items.reduce((sum, item) => sum + (item.value ?? 0), 0);
  // Keep the block's full height in view while it fills, even when the last layer is partial.
  const layers = Math.ceil(units / perLayer);
  const frame: FloorPrism<Row>[] = [
    {
      id: 'frame',
      label: '',
      datum: null,
      value: null,
      color: '',
      footprint: [
        [0, 0],
        [side, 0],
        [side, side],
        [0, side],
      ],
      base: 0,
      rise: layers,
      depth: 0,
      wave: 0,
    },
  ];
  const fitted = fitFloorPrisms([...frame, ...prisms], width, height);
  return {
    marks: fitted.marks.slice(1),
    width: fitted.width,
    height: fitted.height,
    readings: items.map((item) => ({ id: item.label, label: item.label, value: item.value })),
    groups: items.map((item, index) => ({
      id: item.label,
      label: item.label,
      color: options.color ?? seriesColor(index),
      value: item.value,
    })),
    note:
      total > 0
        ? `1 cube = ${units === 100 ? '1%' : `1/${units}`} of the total · Fills from the floor up`
        : undefined,
  };
}

export function VoxelWaffleCard<Row, const Key extends NumericKey<Row>>({
  category,
  value,
  units,
  footprint,
  color,
  height = 260,
  ...props
}: VoxelWaffleCardProps<Row, Key>) {
  const options = { units, footprint, color };
  return (
    <EmptyShapeContext.Provider value="tiles">
      <ObservationsCard
        {...props}
        height={height}
        color={color}
        family="voxel"
        layout={(data, width, plotHeight) =>
          voxelLayout(data, category, value, width, plotHeight, options)
        }
        placeholder={(width, plotHeight) =>
          voxelLayout(
            [
              { category: 'a', value: 46 },
              { category: 'b', value: 30 },
              { category: 'c', value: 24 },
            ],
            'category',
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
