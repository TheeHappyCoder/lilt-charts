'use client';

import type { NumericKey } from './keys';
import { ObservationsCard, type ObservationScene } from './observations-card';
import {
  calendarCells,
  cellMark,
  monthFormatter,
  utcDate,
  type CalendarHeatmapCardProps,
  type CalendarOptions,
} from './calendar-heatmap-card';
import { prismGridLayout, type PrismGridOptions } from './prism-grid';
import { EmptyShapeContext } from '../lifecycle/chart-empty';

const DAY = 86_400_000;

export interface SkylineCardProps<Row, Key extends NumericKey<Row>>
  extends CalendarHeatmapCardProps<Row, Key>,
    PrismGridOptions {}

/**
 * A calendar stood up in three dimensions: weeks run away to the right, weekdays come toward the
 * viewer, and each day is a prism whose height and color both carry its value.
 */
export function skylineLayout<Row>(
  data: readonly Row[],
  date: string,
  value: string,
  width: number,
  height: number,
  options: CalendarOptions<Row> & PrismGridOptions = {},
): ObservationScene<Row> {
  const { error, cells, weeks } = calendarCells(data, date, value, options);
  if (error !== undefined || !cells.length) return { marks: [], ...(error ? { error } : {}) };
  const formatter = monthFormatter(options.locale);
  return prismGridLayout(
    cells.map((cell) => ({
      ...cellMark(cell),
      column: cell.column,
      row: cell.row,
      share: cell.share,
    })),
    weeks,
    7,
    width,
    height,
    {
      rise: options.rise,
      gap: options.gap,
      // Months run along the front edge of the floor.
      columnLabels: cells.flatMap((cell, index) =>
        index === 0 || new Date(cell.day).getUTCDate() === 1
          ? [{ column: cell.column, text: formatter.format(cell.day) }]
          : [],
      ),
      note: 'Taller and darker: more · Grey: no data · Outline: future day',
    },
  );
}

export function SkylineCard<Row, const Key extends NumericKey<Row>>({
  date,
  value,
  from,
  to,
  weekStartsOn,
  today,
  domain,
  rise,
  gap,
  color,
  locale,
  height = 320,
  ...props
}: SkylineCardProps<Row, Key>) {
  const placeholderEnd = utcDate(to) ?? utcDate(today) ?? Date.UTC(2024, 11, 31);
  const placeholderStart = utcDate(from) ?? placeholderEnd - 364 * DAY;
  const options = { from, to, weekStartsOn, today, domain, color, locale, rise, gap };
  return (
    <EmptyShapeContext.Provider value="tiles">
      <ObservationsCard
        {...props}
        height={height}
        color={color}
        locale={locale}
        family="skyline"
        legend={false}
        layout={(data, width, plotHeight) =>
          skylineLayout(data, date, value, width, plotHeight, options)
        }
        placeholder={(width, plotHeight) =>
          skylineLayout(
            // A quiet skyline of busy stretches, so the placeholder already reads in depth.
            Array.from(
              { length: Math.round((placeholderEnd - placeholderStart) / DAY) + 1 },
              (_, index) => ({
                date: placeholderStart + index * DAY,
                value:
                  10 * Math.max(0, Math.sin(index / 6) * Math.sin(index / 19)) ** 2 +
                  ((index * 37) % 3),
              }),
            ),
            'date',
            'value',
            width,
            plotHeight,
            {
              ...options,
              domain: undefined,
              from: placeholderStart,
              to: Math.max(placeholderStart, placeholderEnd),
              today: placeholderEnd,
            },
          ) as ObservationScene<Row>
        }
      />
    </EmptyShapeContext.Provider>
  );
}
