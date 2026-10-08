'use client';

import { extent } from 'd3-array';
import { useMemo, type ReactElement } from 'react';
import { summarizeBox, type BoxSummary } from '../engine/box';
import { BoxPlot } from '../primitives/box-plot';
import { CartesianCard, type CartesianCardProps } from './cartesian-card';
import type { KeysOfType } from './keys';

/** One box, with its x value and the row it came from. */
interface BoxRow<Row> {
  x: string | number | Date;
  median: number | null;
  box: BoxSummary | null;
  source: Row;
}

type SharedProps<Row> = Omit<
  CartesianCardProps<BoxRow<Row>, 'median'>,
  | 'series'
  | 'data'
  | 'ranges'
  | 'x'
  | 'headlineSeries'
  | 'pillSeries'
  | 'target'
  | 'forecast'
  | 'bleed'
  | 'tiles'
  | 'aggregate'
>;

export interface BoxPlotCardProps<Row> extends SharedProps<Row> {
  data?: readonly Row[];
  /** One box per row, placed by this field: labels, numbers, or dates. */
  x: KeysOfType<Row, string | number | Date>;
  /** Field holding each row's raw samples; Lilt computes the quartiles, whiskers and outliers. */
  samples: KeysOfType<Row, readonly number[]>;
  /** Names the series in hover. Defaults to "Median". */
  label?: string;
  color?: string;
  /** Draw samples beyond the whiskers as dots. Defaults to true. */
  outliers?: boolean;
  /** Draws each box as a solid block receding up and to the right; the front keeps Q1 and Q3. */
  depth?: boolean;
}

/**
 * Distributions side by side: quartile boxes, a median line, Tukey whiskers and outliers,
 * computed from each row's raw samples. The headline is the median of every sample.
 */
export function BoxPlotCard<Row>({
  data = [],
  x,
  samples,
  label = 'Median',
  color,
  outliers = true,
  depth = false,
  headline,
  ...props
}: BoxPlotCardProps<Row>): ReactElement {
  const rows = useMemo(
    () =>
      data.map((row) => {
        const record = row as Record<string, unknown>;
        const box = summarizeBox(record[samples] as readonly number[]);
        return {
          x: record[x] as BoxRow<Row>['x'],
          median: box?.median ?? null,
          box,
          source: row,
        } satisfies BoxRow<Row>;
      }),
    [data, samples, x],
  );
  const pooled = useMemo(
    () =>
      summarizeBox(
        data.flatMap((row) => (row as Record<string, unknown>)[samples] as readonly number[]),
      )?.median,
    [data, samples],
  );
  const extremes = useMemo(() => {
    const all = outliers ? rows.flatMap((row) => row.box?.outliers ?? []) : [];
    return all.length ? (extent(all) as [number, number]) : [];
  }, [rows, outliers]);
  const stat = (name: 'min' | 'q1' | 'q3' | 'max') => (row: never) =>
    (row as BoxRow<Row>).box?.[name] ?? null;
  return (
    <CartesianCard
      {...props}
      data={rows}
      x="x"
      headline={headline ?? pooled}
      aggregate="mean"
      tiles={false}
      series={[{ key: 'median', label, color }]}
      shape={{
        kind: 'marks',
        id: `box:${samples}:${outliers}:${depth}`,
        includeZero: false,
        include: extremes,
        describe: (inspection) => {
          const fields = inspection.series[0]?.fields ?? [];
          const q1 = fields.find((field) => field.id === 'q1');
          const q3 = fields.find((field) => field.id === 'q3');
          return q1?.value != null && q3?.value != null
            ? `Q1 ${q1.formattedValue} · Q3 ${q3.formattedValue}`
            : null;
        },
        series: () => ({
          fields: {
            max: { label: 'Max', accessor: stat('max') },
            q3: { label: 'Q3', accessor: stat('q3') },
            q1: { label: 'Q1', accessor: stat('q1') },
            min: { label: 'Min', accessor: stat('min') },
          },
        }),
        draw: (ids) =>
          ids.map((id) => (
            <BoxPlot
              key={id}
              series={id}
              min="min"
              q1="q1"
              q3="q3"
              max="max"
              outliers={outliers ? (row) => (row as BoxRow<Row>).box?.outliers ?? [] : undefined}
              depth={depth}
            />
          )),
      }}
    />
  );
}
