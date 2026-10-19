'use client';

import type { ReactElement } from 'react';
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
import { tint } from './sculpted-geometry';
import { EmptyShapeContext } from '../lifecycle/chart-empty';

export interface CohortRetentionCardProps<Row, Key extends NumericKey<Row>>
  extends Omit<ObservationsCardProps<Row>, 'aggregate' | 'legend' | 'legendSwatch'> {
  /** Text field naming each cohort, such as its signup month. Input order sets the rows. */
  cohort: TextKey<Row>;
  /**
   * One field per period since the cohort started, each the share still active from 0 to 1.
   * Null or missing is a period the cohort has not reached yet, which leaves the cell out.
   */
  periods: readonly Key[];
  /** Column headings for the periods. Defaults to 0, 1, 2… */
  periodLabels?: readonly string[];
  /** Field holding each cohort's starting size: shown beside its name and used to weight the average. */
  size?: NumericKey<Row>;
  /** Add an average row under the cohorts. Defaults to true. */
  average?: boolean;
  /** The period whose average retention is the headline. Defaults to the second period. */
  headlinePeriod?: NoInfer<Key>;
}

const whole = new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 0 });
const people = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });

export function cohortRetentionLayout<Row>(
  data: readonly Row[],
  cohort: string,
  periods: readonly string[],
  labels: readonly string[] | undefined,
  size: string | undefined,
  average: boolean,
  headlinePeriod: string | undefined,
  color: string | undefined,
  width: number,
  height: number,
): ObservationScene<Row> {
  if (!data.length) return { marks: [] };
  if (!periods.length || new Set(periods).size !== periods.length)
    return { marks: [], error: 'Choose at least one distinct period field.' };
  const rows = data.map((datum) => ({
    datum,
    name: String(readField(datum, cohort) ?? ''),
    size: size ? readNumber(datum, size) : null,
    values: periods.map((key) => readNumber(datum, key)),
  }));
  const names = new Set<string>();
  for (const row of rows) {
    if (!row.name.trim() || names.has(row.name))
      return { marks: [], error: 'Each cohort needs a unique, nonempty name.' };
    names.add(row.name);
    if (row.values.some((value) => value !== null && (value < 0 || value > 1)))
      return { marks: [], error: 'Retention is a share from 0 to 1.' };
  }
  const ink = color ?? seriesColor(0);
  const heading = (index: number) => labels?.[index] ?? String(index);
  const weightOf = (row: (typeof rows)[number]) =>
    row.size !== null && row.size > 0 ? row.size : 1;
  const averages = periods.map((_, index) => {
    const reached = rows.filter((row) => row.values[index] !== null);
    const weight = reached.reduce((sum, row) => sum + weightOf(row), 0);
    return weight
      ? reached.reduce((sum, row) => sum + row.values[index]! * weightOf(row), 0) / weight
      : null;
  });
  const left = 76 + (size ? 48 : 0);
  const top = 22;
  const lines = rows.length + (average ? 1 : 0);
  const split = average ? 8 : 0;
  const cell = Math.max(24, (width - left) / periods.length);
  const row = Math.max(20, Math.min(32, (height - top - split) / lines));
  const gap = Math.min(3, cell / 8);
  const textFits = cell >= 34 && row >= 20;
  const sceneWidth = Math.max(width, left + cell * periods.length);
  const scene: ObservationScene<Row> = {
    marks: [],
    labels: periods.map((_, index) => ({
      x: left + (index + 0.5) * cell,
      y: 13,
      text: heading(index),
      anchor: 'middle' as const,
    })),
    readings: [],
    width: sceneWidth,
    height: top + lines * row + split,
  };
  if (size) scene.labels!.push({ x: left - 10, y: 13, text: 'Size', anchor: 'end' });
  const id = (line: number, column: number) => `${line}:${column}`;
  // Inspecting a cell keeps its whole cohort and its whole period lit, like a crosshair.
  const related = (line: number, column: number) => [
    ...periods.map((_, other) => id(line, other)),
    ...Array.from({ length: lines }, (_, other) => id(other, column)),
  ];
  const tile = (
    line: number,
    column: number,
    value: number,
    label: string,
    y: number,
    extra: Partial<ObservationMark<Row>> = {},
  ): ObservationMark<Row> => ({
    id: id(line, column),
    label,
    datum: null,
    value,
    x: left + column * cell + gap / 2,
    y: y + gap / 2,
    width: cell - gap,
    height: row - gap,
    color: tint(ink, 10 + value * 90),
    shape: 'tile',
    text: textFits ? whole.format(value) : undefined,
    related: related(line, column),
    wave: (line + column) / (lines + periods.length),
    ...extra,
  });
  rows.forEach((entry, line) => {
    const y = top + line * row;
    scene.labels!.push({ x: 4, y: y + row / 2 + 4, text: entry.name.slice(0, 11) });
    if (size && entry.size !== null)
      scene.labels!.push({
        x: left - 10,
        y: y + row / 2 + 4,
        text: people.format(entry.size),
        anchor: 'end',
      });
    entry.values.forEach((value, column) => {
      if (value === null) return;
      const mark = tile(line, column, value, `${entry.name} · period ${heading(column)}`, y, {
        datum: entry.datum,
        description:
          entry.size !== null
            ? `${people.format(entry.size * value)} of ${people.format(entry.size)}`
            : undefined,
      });
      scene.marks.push(mark);
      scene.readings!.push(mark);
    });
  });
  if (average) {
    const y = top + rows.length * row + split;
    scene.labels!.push({ x: 4, y: y + row / 2 + 4, text: 'Average' });
    averages.forEach((value, column) => {
      if (value === null) return;
      const reached = rows.filter((entry) => entry.values[column] !== null).length;
      const mark = tile(rows.length, column, value, `Average · period ${heading(column)}`, y, {
        description: `${size ? 'weighted by size, ' : ''}${reached} ${reached === 1 ? 'cohort' : 'cohorts'}`,
      });
      scene.marks.push(mark);
      scene.readings!.push(mark);
    });
  }
  const focus = headlinePeriod ? periods.indexOf(headlinePeriod) : Math.min(1, periods.length - 1);
  scene.headline = averages[focus] ?? null;
  return scene;
}

const demo = Array.from({ length: 6 }, (_, index) => ({
  cohort: `C${index}`,
  ...Object.fromEntries(
    Array.from({ length: 6 - index }, (_, period) => [`p${period}`, period ? 0.7 ** period : 1]),
  ),
}));

/**
 * Retention by cohort: one row per signup group, one column per period since it started, each
 * cell the share still active. Later cohorts have fewer periods, so the grid steps down like a
 * staircase; an average row closes it. Hover lights the cell's cohort and period.
 */
export function CohortRetentionCard<Row, const Key extends NumericKey<Row>>({
  cohort,
  periods,
  periodLabels,
  size,
  average = true,
  headlinePeriod,
  color,
  valueFormat = { style: 'percent', maximumFractionDigits: 1 },
  ...props
}: CohortRetentionCardProps<Row, Key>): ReactElement {
  return (
    <EmptyShapeContext.Provider value="tiles">
      <ObservationsCard
        {...props}
        legend={false}
        valueFormat={valueFormat}
        family="cohort-retention"
        layout={(data, width, height) =>
          cohortRetentionLayout(
            data,
            cohort,
            periods,
            periodLabels,
            size,
            average,
            headlinePeriod,
            color,
            width,
            height,
          )
        }
        placeholder={(width, height) =>
          cohortRetentionLayout(
            demo,
            'cohort',
            ['p0', 'p1', 'p2', 'p3', 'p4', 'p5'],
            undefined,
            undefined,
            true,
            undefined,
            undefined,
            width,
            height,
          ) as unknown as ObservationScene<Row>
        }
      />
    </EmptyShapeContext.Provider>
  );
}
