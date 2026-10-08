'use client';

import type { NumericKey, TimeKey } from './keys';
import {
  ObservationsCard,
  readField,
  readNumber,
  seriesColor,
  type ObservationMark,
  type ObservationsCardProps,
  type ObservationScene,
} from './observations-card';
import { monthFormatter, utcDate } from './calendar-heatmap-card';
import { EmptyShapeContext } from '../lifecycle/chart-empty';

const DAY = 86_400_000;

export interface SpiralYearCardProps<Row, Key extends NumericKey<Row>>
  extends Omit<ObservationsCardProps<Row>, 'legend' | 'legendSwatch'> {
  date: TimeKey<Row>;
  value: Key;
  /** Inclusive UTC date bounds. Default to the observed range; at most ten years. */
  from?: string | number | Date;
  to?: string | number | Date;
  /** Fixed value domain that must contain every value. Defaults to zero through the largest. */
  domain?: readonly [number, number];
}

const yearStart = (day: number) => Date.UTC(new Date(day).getUTCFullYear(), 0, 1);
const yearLength = (day: number) => {
  const start = yearStart(day);
  return (Date.UTC(new Date(day).getUTCFullYear() + 1, 0, 1) - start) / DAY;
};

/**
 * Time as a coil: one turn per year with January at the top, so the same season lines up on every
 * turn. Each day is a bar standing out from the coil whose length and color carry its value.
 */
export function spiralLayout<Row>(
  data: readonly Row[],
  date: string,
  value: string,
  width: number,
  height: number,
  options: Pick<
    SpiralYearCardProps<Row, NumericKey<Row>>,
    'from' | 'to' | 'domain' | 'color' | 'locale'
  > = {},
): ObservationScene<Row> {
  const observed = new Map<number, { datum: Row; value: number | null }>();
  for (const datum of data) {
    const day = utcDate(readField(datum, date));
    if (day === null) return { marks: [], error: 'Each row needs a valid UTC date.' };
    if (observed.has(day))
      return { marks: [], error: 'Each day needs one row; aggregate duplicate dates first.' };
    observed.set(day, { datum, value: readNumber(datum, value) });
  }
  const days = [...observed.keys()];
  const from =
    options.from === undefined ? (days.length ? Math.min(...days) : null) : utcDate(options.from);
  const to =
    options.to === undefined ? (days.length ? Math.max(...days) : null) : utcDate(options.to);
  if (from === null || to === null) return { marks: [] };
  if (from > to || (to - from) / DAY > 3660)
    return { marks: [], error: 'Choose an ordered range of at most ten years.' };
  if (days.some((day) => day < from || day > to))
    return { marks: [], error: 'A date falls outside the range; widen from and to.' };
  const known = [...observed.values()].flatMap((item) => (item.value === null ? [] : [item.value]));
  const low = options.domain?.[0] ?? Math.min(0, ...known);
  const high = options.domain?.[1] ?? Math.max(low + 1, ...known);
  if (!(low < high) || known.some((v) => v < low || v > high))
    return {
      marks: [],
      error: 'domain must contain every value with a finite low end below its high end.',
    };
  const firstYear = new Date(from).getUTCFullYear();
  const turns = new Date(to).getUTCFullYear() - firstYear + 1;
  const labelRoom = 18;
  const radius = Math.max(60, Math.min(width, height) / 2 - labelRoom);
  const cx = width / 2;
  const cy = radius + labelRoom;
  const inner = radius * 0.24;
  // Bars on one turn may reach the next turn's coil, never past it.
  const ring = (radius - inner) / (turns + 0.9);
  const longest = ring * 0.92;
  const progress = (day: number) =>
    new Date(day).getUTCFullYear() - firstYear + (day - yearStart(day)) / DAY / yearLength(day);
  const point = (turn: number) => {
    const angle = turn * Math.PI * 2;
    const r = inner + ring * turn;
    return [cx + r * Math.sin(angle), cy - r * Math.cos(angle), angle] as const;
  };
  const color = options.color ?? seriesColor(0);
  const marks: ObservationMark<Row>[] = [];
  for (let day = from; day <= to; day += DAY) {
    const item = observed.get(day);
    const reading = item?.value ?? null;
    const share = reading === null ? 0 : (reading - low) / (high - low);
    const turn = progress(day);
    const [px, py, angle] = point(turn);
    const r = inner + ring * turn;
    const thickness = Math.max(1.2, ((Math.PI * 2 * r) / 366) * 0.62);
    const length = reading === null ? 2 : 2 + share * (longest - 2);
    const id = new Date(day).toISOString().slice(0, 10);
    marks.push({
      id,
      label: id,
      datum: item?.datum ?? null,
      value: reading,
      x: px - thickness / 2,
      y: py - length,
      width: thickness,
      height: length,
      rotate: (angle * 180) / Math.PI,
      color: `color-mix(in oklab, ${color} ${reading === null ? 0 : 30 + share * 70}%, var(--lilt-card-background, var(--lilt-surface)))`,
      shape: 'bar',
      enter: 'grow',
      // Bars grow out along the coil in time order, after the coil has drawn.
      wave: (turn - progress(from)) / Math.max(1e-6, progress(to) - progress(from)),
      missing: reading === null,
    });
  }
  // A faint coil under the bars, from the first day to the last.
  const start = progress(from);
  const end = progress(to);
  let d = '';
  for (let turn = start; turn <= end + 1e-9; turn += 1 / 180) {
    const [px, py] = point(Math.min(turn, end));
    d += `${d ? ' L' : 'M'}${px.toFixed(2)},${py.toFixed(2)}`;
  }
  const formatter = monthFormatter(options.locale);
  const labels: NonNullable<ObservationScene<Row>['labels']> = Array.from(
    { length: 12 },
    (_, month) => {
      const angle = (month / 12) * Math.PI * 2;
      const r = radius + 10;
      return {
        x: cx + r * Math.sin(angle),
        y: cy - r * Math.cos(angle) + 4,
        text: formatter.format(Date.UTC(2024, month, 1)),
        anchor: 'middle' as const,
      };
    },
  );
  return {
    marks,
    paths: [
      {
        id: 'coil',
        d,
        enter: 'draw',
        stroke: 'color-mix(in srgb, var(--lilt-muted) 30%, transparent)',
      },
    ],
    labels,
    width,
    height: cy + radius + labelRoom,
    note: 'One turn per year, January at the top · Longer and darker: more',
  };
}

export function SpiralYearCard<Row, const Key extends NumericKey<Row>>({
  date,
  value,
  from,
  to,
  domain,
  color,
  locale,
  height = 380,
  ...props
}: SpiralYearCardProps<Row, Key>) {
  const options = { from, to, domain, color, locale };
  const placeholderEnd = utcDate(to) ?? Date.UTC(2024, 11, 31);
  const placeholderStart = utcDate(from) ?? placeholderEnd - 2 * 365 * DAY;
  return (
    <EmptyShapeContext.Provider value="ring">
      <ObservationsCard
        {...props}
        height={height}
        color={color}
        locale={locale}
        family="spiral"
        legend={false}
        layout={(data, width, plotHeight) =>
          spiralLayout(data, date, value, width, plotHeight, options)
        }
        placeholder={(width, plotHeight) =>
          spiralLayout(
            // A seasonal comb, so the placeholder already reads as a coil of days.
            Array.from(
              { length: Math.round((placeholderEnd - placeholderStart) / DAY) + 1 },
              (_, index) => ({
                date: placeholderStart + index * DAY,
                value: 5 - 3 * Math.cos((index / 365.25) * Math.PI * 2) + ((index * 7919) % 5),
              }),
            ),
            'date',
            'value',
            width,
            plotHeight,
            { ...options, domain: undefined, from: placeholderStart, to: placeholderEnd },
          ) as ObservationScene<Row>
        }
      />
    </EmptyShapeContext.Provider>
  );
}
