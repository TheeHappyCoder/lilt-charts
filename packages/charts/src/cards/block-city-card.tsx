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
import { prismGridLayout, type PrismCell, type PrismGridOptions } from './prism-grid';
import { EmptyShapeContext } from '../lifecycle/chart-empty';

export interface BlockCityCardProps<Row, Key extends NumericKey<Row>>
  extends Omit<ObservationsCardProps<Row>, 'legend' | 'legendSwatch'>,
    PrismGridOptions {
  /** Columns, running away to the right, in first-seen order. */
  x: TextKey<Row>;
  /** Rows, coming toward the viewer, in first-seen order. */
  y: TextKey<Row>;
  value: Key;
  /** Fixed value domain that must contain every value. Defaults to zero through the largest. */
  domain?: readonly [number, number];
}

/**
 * Any two categories as a city block: one prism per pair, whose height and color both carry the
 * value. Pairs without a row stay as a low slab so a gap never reads as zero.
 */
export function blockCityLayout<Row>(
  data: readonly Row[],
  x: string,
  y: string,
  value: string,
  width: number,
  height: number,
  options: PrismGridOptions & { domain?: readonly [number, number]; color?: string } = {},
): ObservationScene<Row> {
  const columns: string[] = [];
  const rows: string[] = [];
  const seen = new Map<string, { datum: Row; value: number | null }>();
  for (const datum of data) {
    const column = readField(datum, x);
    const row = readField(datum, y);
    if (typeof column !== 'string' || typeof row !== 'string')
      return { marks: [], error: 'Each row needs text x and y categories.' };
    const id = `${column} · ${row}`;
    if (seen.has(id))
      return { marks: [], error: 'Each x and y pair needs one row; sum them first.' };
    seen.set(id, { datum, value: readNumber(datum, value) });
    if (!columns.includes(column)) columns.push(column);
    if (!rows.includes(row)) rows.push(row);
  }
  if (!seen.size) return { marks: [] };
  const known = [...seen.values()].flatMap((item) => (item.value === null ? [] : [item.value]));
  const low = options.domain?.[0] ?? Math.min(0, ...known);
  const high = options.domain?.[1] ?? Math.max(low + 1, ...known);
  if (!(low < high) || known.some((v) => v < low || v > high))
    return {
      marks: [],
      error: 'domain must contain every value with a finite low end below its high end.',
    };
  const cells: PrismCell<Row>[] = [];
  for (const [rowIndex, row] of rows.entries())
    for (const [columnIndex, column] of columns.entries()) {
      const id = `${column} · ${row}`;
      const item = seen.get(id);
      const reading = item?.value ?? null;
      const share = reading === null ? 0 : (reading - low) / (high - low);
      cells.push({
        id,
        label: id,
        datum: item?.datum ?? null,
        value: reading,
        color: `color-mix(in oklab, ${options.color ?? seriesColor(0)} ${reading === null ? 0 : 12 + share * 83}%, var(--lilt-card-background, var(--lilt-surface)))`,
        missing: reading === null,
        column: columnIndex,
        row: rowIndex,
        share,
      });
    }
  return prismGridLayout(cells, columns.length, rows.length, width, height, {
    rise: options.rise ?? 4,
    gap: options.gap,
    columnLabels: columns.map((text, column) => ({ column, text })),
    rowLabels: rows.map((text, row) => ({ row, text })),
    note: 'Taller and darker: more · Grey: no data',
  });
}

export function BlockCityCard<Row, const Key extends NumericKey<Row>>({
  x,
  y,
  value,
  domain,
  rise,
  gap,
  color,
  height = 300,
  ...props
}: BlockCityCardProps<Row, Key>) {
  const options = { domain, rise, gap, color };
  return (
    <EmptyShapeContext.Provider value="tiles">
      <ObservationsCard
        {...props}
        height={height}
        color={color}
        family="block-city"
        legend={false}
        layout={(data, width, plotHeight) =>
          blockCityLayout(data, x, y, value, width, plotHeight, options)
        }
        placeholder={(width, plotHeight) =>
          blockCityLayout(
            Array.from({ length: 24 }, (_, index) => ({
              x: `${index % 6}`,
              y: `${Math.floor(index / 6)}`,
              value: null,
            })),
            'x',
            'y',
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
