'use client';

import type { NumericKey, TimeKey } from './keys';
import {
  ObservationsCard,
  readField,
  readNumber,
  seriesColor,
  type ObservationsCardProps,
  type ObservationScene,
  type ObservationMark,
} from './observations-card';
import { EmptyShapeContext } from '../lifecycle/chart-empty';

const DAY = 86_400_000;
/** Calendar dates are UTC days. Date-only strings are validated rather than rolled over. */
export function utcDate(value: unknown): number | null {
  if (!(value instanceof Date) && typeof value !== 'string' && typeof value !== 'number')
    return null;
  const timestamp =
    value instanceof Date ? value.getTime() : typeof value === 'number' ? value : Date.parse(value);
  if (!Number.isFinite(timestamp) || !Number.isFinite(new Date(timestamp).getTime())) return null;
  const day = Math.floor(timestamp / DAY) * DAY;
  if (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    new Date(day).toISOString().slice(0, 10) !== value
  )
    return null;
  return day;
}

export interface CalendarHeatmapCardProps<Row, Key extends NumericKey<Row>>
  extends Omit<ObservationsCardProps<Row>, 'legend' | 'legendSwatch'> {
  date: TimeKey<Row>;
  value: Key;
  /** Inclusive UTC date bounds. Default to the observed range. */
  from?: string | number | Date;
  to?: string | number | Date;
  /** Monday by default; Sunday is 0. */
  weekStartsOn?: 0 | 1;
  /** UTC day used to distinguish unobserved future dates. Defaults to today. */
  today?: string | number | Date;
  domain?: readonly [number, number];
}

export type CalendarOptions<Row> = Pick<
  CalendarHeatmapCardProps<Row, NumericKey<Row>>,
  'from' | 'to' | 'today' | 'weekStartsOn' | 'domain' | 'color' | 'locale'
>;

export interface CalendarCell<Row> {
  day: number;
  column: number;
  row: number;
  datum: Row | null;
  reading: number | null;
  /** Position of the reading in the domain, 0 to 1. */
  share: number;
  color: string;
  future: boolean;
}

/** Validates the rows and places every day of the range in a week column and weekday row. */
export function calendarCells<Row>(
  data: readonly Row[],
  date: string,
  value: string,
  options: CalendarOptions<Row>,
): { error?: string; cells: CalendarCell<Row>[]; weeks: number; weekStart: 0 | 1 } {
  const fail = (error?: string) => ({
    ...(error ? { error } : {}),
    cells: [],
    weeks: 0,
    weekStart: 1 as const,
  });
  const observed = new Map<number, { datum: Row; value: number | null }>();
  for (const datum of data) {
    const day = utcDate(readField(datum, date));
    if (day === null) return fail('Each calendar row needs a valid UTC date.');
    if (observed.has(day))
      return fail('Each calendar day needs one row; aggregate duplicate dates first.');
    observed.set(day, { datum, value: readNumber(datum, value) });
  }
  const days = [...observed.keys()];
  const from =
    options.from === undefined ? (days.length ? Math.min(...days) : null) : utcDate(options.from);
  const to =
    options.to === undefined ? (days.length ? Math.max(...days) : null) : utcDate(options.to);
  if (from === null || to === null)
    return fail(
      data.length || options.from !== undefined || options.to !== undefined
        ? 'Provide valid from and to dates.'
        : undefined,
    );
  if (from > to || (to - from) / DAY > 3660)
    return fail('Choose an ordered calendar range of at most ten years.');
  if (days.some((day) => day < from || day > to))
    return fail('A date falls outside the calendar range; widen from and to.');
  const today = utcDate(options.today ?? Date.now());
  if (today === null) return fail('today needs a valid UTC date.');
  const known = [...observed.values()].flatMap((item) => (item.value === null ? [] : [item.value]));
  const low = options.domain?.[0] ?? Math.min(0, ...known);
  const high = options.domain?.[1] ?? Math.max(low + 1, ...known);
  if (
    !Number.isFinite(low) ||
    !Number.isFinite(high) ||
    low >= high ||
    known.some((v) => v < low || v > high)
  )
    return fail('domain must contain every value with a finite low end below its high end.');
  const weekStart = options.weekStartsOn ?? 1;
  const offset = (new Date(from).getUTCDay() - weekStart + 7) % 7;
  const weeks = Math.ceil(((to - from) / DAY + 1 + offset) / 7);
  const cells: CalendarCell<Row>[] = [];
  for (let day = from, index = 0; day <= to; day += DAY, index++) {
    const item = observed.get(day);
    const reading = item?.value ?? null;
    const share = reading === null ? 0 : (reading - low) / (high - low);
    cells.push({
      day,
      column: Math.floor((offset + index) / 7),
      row: (offset + index) % 7,
      datum: item?.datum ?? null,
      reading,
      share,
      color: `color-mix(in oklab, ${options.color ?? seriesColor(0)} ${reading === null ? 0 : 12 + share * 83}%, var(--lilt-card-background, var(--lilt-surface)))`,
      future: day > today && reading === null,
    });
  }
  return { cells, weeks, weekStart };
}

export function cellMark<Row>(cell: CalendarCell<Row>) {
  const id = new Date(cell.day).toISOString().slice(0, 10);
  return {
    id,
    label: id,
    datum: cell.datum,
    value: cell.reading,
    color: cell.color,
    missing: cell.reading === null && !cell.future,
    future: cell.future,
    detail: cell.future ? 'Not yet observed' : undefined,
  };
}

export const monthFormatter = (locale: string | undefined) =>
  new Intl.DateTimeFormat(locale ?? 'en-US', { month: 'short', timeZone: 'UTC' });

export function calendarLayout<Row>(
  data: readonly Row[],
  date: string,
  value: string,
  width: number,
  height: number,
  options: CalendarOptions<Row> = {},
): ObservationScene<Row> {
  const { error, cells, weeks, weekStart } = calendarCells(data, date, value, options);
  if (error !== undefined || !cells.length) return { marks: [], ...(error ? { error } : {}) };
  // Fit each dimension independently: wide cards need wider day tiles, not a
  // fixed-size square grid stranded at the left. Retain a readable minimum for
  // long ranges, which can scroll inside the card.
  const gap = 4;
  const columnStep = Math.max(12, (width - 34 + gap) / weeks);
  const rowStep = Math.max(12, (height - 24 + gap) / 7);
  const sceneWidth = 34 + weeks * columnStep - gap;
  const sceneHeight = 24 + 7 * rowStep - gap;
  const labels: NonNullable<ObservationScene<Row>['labels']> = [];
  const formatter = monthFormatter(options.locale);
  const weekdays = new Intl.DateTimeFormat(options.locale ?? 'en-US', {
    weekday: 'short',
    timeZone: 'UTC',
  });
  for (let row = 0; row < 7; row += 2)
    labels.push({
      x: 0,
      y: 24 + row * rowStep + (rowStep - gap) / 2 + 3,
      text: weekdays.format(Date.UTC(2024, 0, 7 + ((row + weekStart) % 7))),
    });
  const marks: ObservationMark<Row>[] = [];
  let lastLabel = -Infinity;
  for (const [index, cell] of cells.entries()) {
    const x = 34 + cell.column * columnStep;
    if ((index === 0 || new Date(cell.day).getUTCDate() === 1) && x - lastLabel >= 34) {
      labels.push({ x, y: 13, text: formatter.format(cell.day) });
      lastLabel = x;
    }
    marks.push({
      ...cellMark(cell),
      x,
      y: 24 + cell.row * rowStep,
      width: columnStep - gap,
      height: rowStep - gap,
    });
  }
  return {
    marks,
    labels,
    width: sceneWidth,
    height: sceneHeight,
    note: 'Less → more color · Hatched: no data · Outline: future day',
  };
}

export function CalendarHeatmapCard<Row, const Key extends NumericKey<Row>>({
  date,
  value,
  from,
  to,
  weekStartsOn,
  today,
  domain,
  color,
  locale,
  ...props
}: CalendarHeatmapCardProps<Row, Key>) {
  const placeholderStart = utcDate(from) ?? (utcDate(to) ?? Date.UTC(2024, 2, 31)) - 90 * DAY;
  const placeholderEnd = utcDate(to) ?? placeholderStart + 90 * DAY;
  return (
    <EmptyShapeContext.Provider value="tiles">
      <ObservationsCard
        {...props}
        color={color}
        locale={locale}
        family="calendar"
        legend={false}
        layout={(data, width, height) =>
          calendarLayout(data, date, value, width, height, {
            from,
            to,
            weekStartsOn,
            today,
            domain,
            color,
            locale,
          })
        }
        placeholder={(width, height) =>
          calendarLayout([], '', '', width, height, {
            from: placeholderStart,
            to: Math.max(placeholderStart, placeholderEnd),
            today: placeholderEnd,
            weekStartsOn,
          }) as ObservationScene<Row>
        }
      />
    </EmptyShapeContext.Provider>
  );
}
