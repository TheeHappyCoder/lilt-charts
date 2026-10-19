'use client';

import { useMemo, type ReactElement } from 'react';
import type { NumericKey, XKey } from '../../cards/keys';
import {
  ObservationsCard,
  readField,
  readNumber,
  type ObservationMark,
  type ObservationsCardProps,
  type ObservationScene,
} from '../../cards/observations-card';
import { EmptyShapeContext } from '../../lifecycle/chart-empty';
import { changeTone, percentFormat, signedPercent } from './change-tone';

export interface MonthlyReturnsCardProps<Row, Key extends NumericKey<Row>>
  extends Omit<ObservationsCardProps<Row>, 'color' | 'aggregate'> {
  /** Date of each row: a Date, an ISO date string, or a timestamp. Months are read in UTC. */
  x: XKey<Row>;
  /** Price or level at that date. Each month returns its last close over the month before. */
  price: Key;
  /** Add each year's compounded return as a last column. Defaults to true. */
  total?: boolean;
  /** The monthly return at which tiles reach full color. Defaults to 0.08, an 8% month. */
  scale?: number;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface MonthReturn {
  year: number;
  month: number;
  value: number | null;
  /** The month had no rows, so its return could not be read. */
  missing: boolean;
}

const timeOf = (value: unknown): number | null => {
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.getTime() : null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const time = Date.parse(value);
    return Number.isFinite(time) ? time : null;
  }
  return null;
};

/** Each month's return from the last close of the month before; the first month from its open. */
export function monthlyReturns<Row>(
  data: readonly Row[],
  x: string,
  price: string,
): MonthReturn[] | { error: string } {
  const points: { time: number; price: number }[] = [];
  for (const row of data) {
    const time = timeOf(readField(row, x));
    if (time === null) return { error: 'Each row needs a valid date.' };
    const level = readNumber(row, price);
    if (level !== null) points.push({ time, price: level });
  }
  points.sort((a, b) => a.time - b.time);
  if (!points.length) return [];
  const closes = new Map<number, { first: number; last: number }>();
  for (const point of points) {
    const date = new Date(point.time);
    const index = date.getUTCFullYear() * 12 + date.getUTCMonth();
    const month = closes.get(index);
    if (month) month.last = point.price;
    else closes.set(index, { first: point.price, last: point.price });
  }
  const indices = [...closes.keys()];
  const first = Math.min(...indices);
  const last = Math.max(...indices);
  const result: MonthReturn[] = [];
  let base: number | null = closes.get(first)!.first;
  for (let index = first; index <= last; index++) {
    const month = closes.get(index);
    const year = Math.floor(index / 12);
    if (!month) {
      // No rows this month: the next month returns from the last close before the gap.
      result.push({ year, month: index % 12, value: null, missing: true });
      continue;
    }
    result.push({
      year,
      month: index % 12,
      value: base !== null && base > 0 ? month.last / base - 1 : null,
      missing: false,
    });
    base = month.last;
  }
  return result;
}

const compound = (values: readonly number[]) =>
  values.reduce((growth, value) => growth * (1 + value), 1) - 1;

export function monthlyReturnsLayout<Row>(
  data: readonly Row[],
  x: string,
  price: string,
  total: boolean,
  scale: number,
  width: number,
  height: number,
  percent: (value: number) => string,
): ObservationScene<Row> {
  if (!(scale > 0)) return { marks: [], error: 'The color scale must be a positive return.' };
  const months = monthlyReturns(data, x, price);
  if ('error' in months) return { marks: [], error: months.error };
  if (!months.length) return { marks: [] };
  const years = [...new Set(months.map((month) => month.year))].sort((a, b) => b - a);
  const columns = 12 + (total ? 1 : 0);
  const left = 40;
  const top = 22;
  const split = total ? 8 : 0;
  const cell = Math.max(18, (width - left - split) / columns);
  const row = Math.max(20, Math.min(36, cell * 0.78, (height - top) / years.length));
  const sceneWidth = Math.max(width, left + split + cell * columns);
  const sceneHeight = top + row * years.length;
  const gap = Math.min(4, cell / 6);
  const short = cell < 30;
  const textFits = cell >= 44;
  const scene: ObservationScene<Row> = {
    marks: [],
    labels: MONTHS.map((name, month) => ({
      x: left + (month + 0.5) * cell,
      y: 13,
      text: short ? name[0]! : name,
      anchor: 'middle' as const,
    })),
    width: sceneWidth,
    height: sceneHeight,
    // Inspecting a month keeps its year lit, so a row reads as one year.
    highlightGroup: true,
  };
  if (total)
    scene.labels!.push({ x: left + split + 12.5 * cell, y: 13, text: 'Year', anchor: 'middle' });
  const tile = (
    id: string,
    label: string,
    value: number | null,
    column: number,
    line: number,
    extra: Partial<ObservationMark<Row>> = {},
  ): ObservationMark<Row> => ({
    id,
    label,
    datum: null,
    value,
    x: left + column * cell + (column === 12 ? split : 0) + gap / 2,
    y: top + line * row + gap / 2,
    width: cell - gap,
    height: row - gap,
    color: changeTone(value, scale),
    shape: 'tile',
    text: value !== null && textFits ? signedPercent(value, percent) : undefined,
    wave: (column + line) / (columns + years.length),
    ...extra,
  });
  years.forEach((year, line) => {
    scene.labels!.push({
      x: left - 8,
      y: top + (line + 0.5) * row + 4,
      text: String(year),
      anchor: 'end',
    });
    const inYear = months.filter((month) => month.year === year);
    for (const month of inYear)
      scene.marks.push(
        tile(
          `${year}-${month.month + 1}`,
          `${MONTHS[month.month]} ${year}`,
          month.value,
          month.month,
          line,
          month.missing
            ? { missing: true, description: 'No prices this month' }
            : { group: String(year) },
        ),
      );
    if (total) {
      const values = inYear.flatMap((month) => (month.value === null ? [] : [month.value]));
      const yearly = values.length ? compound(values) : null;
      scene.marks.push(
        tile(`${year}`, `${year} total`, yearly, 12, line, {
          group: String(year),
          description: `compounded over ${values.length} ${values.length === 1 ? 'month' : 'months'}`,
        }),
      );
    }
  });
  const observed = months.flatMap((month) => (month.value === null ? [] : [month.value]));
  scene.headline = observed.length ? compound(observed) : null;
  scene.readings = scene.marks;
  return scene;
}

const demo = Array.from({ length: 30 }, (_, index) => ({
  date: Date.UTC(2024, index, 15),
  price: 100 + index * 2 + Math.sin(index * 1.3) * 6,
}));

/**
 * Monthly returns as a factsheet grid: one row per year, newest first, a tile per month colored
 * green or red by how far it moved, and each year's compounded return at the end.
 */
export function MonthlyReturnsCard<Row, const Key extends NumericKey<Row>>({
  x,
  price,
  total = true,
  scale = 0.08,
  legend = false,
  locale = 'en-US',
  valueFormat = { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 },
  formatValue,
  ...props
}: MonthlyReturnsCardProps<Row, Key>): ReactElement {
  const percent = useMemo(() => percentFormat(locale), [locale]);
  const signed = useMemo(() => {
    const format = new Intl.NumberFormat(locale, valueFormat);
    return (value: number) => signedPercent(value, (amount) => format.format(amount));
  }, [locale, JSON.stringify(valueFormat)]);
  return (
    <EmptyShapeContext.Provider value="tiles">
      <ObservationsCard
        {...props}
        locale={locale}
        legend={legend}
        valueFormat={valueFormat}
        formatValue={formatValue ?? signed}
        family="monthly-returns"
        layout={(data, width, height) =>
          monthlyReturnsLayout(data, x, price, total, scale, width, height, percent)
        }
        placeholder={(width, height) =>
          monthlyReturnsLayout(
            demo,
            'date',
            'price',
            total,
            0.08,
            width,
            height,
            percent,
          ) as unknown as ObservationScene<Row>
        }
      />
    </EmptyShapeContext.Provider>
  );
}
