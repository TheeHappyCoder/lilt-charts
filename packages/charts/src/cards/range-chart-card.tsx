'use client';

import type { ReactElement } from 'react';
import { ErrorBar } from '../primitives/error-bar';
import { RangeBar } from '../primitives/range-bar';
import { CartesianCard, type CartesianCardProps } from './cartesian-card';
import type { NumericKey } from './keys';

type SharedProps<Row, Key extends NumericKey<Row>> = Omit<
  CartesianCardProps<Row, Key>,
  'series' | 'headlineSeries' | 'pillSeries' | 'target' | 'forecast' | 'bleed' | 'tiles'
>;

export interface RangeChartCardProps<Row, Key extends NumericKey<Row>>
  extends SharedProps<Row, Key> {
  /** Field holding the low end of each range. */
  low: Key;
  /** Field holding the high end of each range. */
  high: Key;
  /**
   * Field holding each measured value, such as a mean inside its uncertainty. It drives the
   * headline and pills. Defaults to `high`.
   */
  value?: Key;
  /** Names the series in hover and tiles. Defaults to the value key. */
  label?: string;
  color?: string;
  /** `bar` (default) floats a bar from low to high; `error` draws whiskers around the value. */
  display?: 'bar' | 'error';
  /** Draws each bar as a solid block receding up and to the right. Error bars stay flat. */
  depth?: boolean;
  /** Per-series stat tile under the plot. Defaults to false. */
  tiles?: boolean;
}

/**
 * Ranges per observation: floating bars from low to high, or error bars around a value. The
 * headline summarizes the values (the mean by default) and hover reads the range's ends.
 */
export function RangeChartCard<Row, const Key extends NumericKey<Row>>({
  low,
  high,
  value,
  label,
  color,
  display = 'bar',
  depth = false,
  aggregate = 'mean',
  tiles = false,
  ...props
}: RangeChartCardProps<Row, Key>): ReactElement {
  const key = value ?? high;
  const read = (field: Key) => (row: never) => {
    const raw = (row as Record<string, unknown>)[field];
    return typeof raw === 'number' ? raw : null;
  };
  return (
    <CartesianCard
      {...props}
      aggregate={aggregate}
      tiles={tiles}
      series={[{ key, label: label ?? key, color }]}
      shape={{
        kind: 'marks',
        id: `range:${display}:${depth}:${low}:${high}:${key}`,
        includeZero: false,
        describe: (inspection) => {
          const [lowField, highField] = inspection.series[0]?.fields ?? [];
          return lowField?.value != null && highField?.value != null
            ? `${lowField.formattedValue} – ${highField.formattedValue}`
            : null;
        },
        series: () => ({
          fields: {
            low: { label: 'Low', accessor: read(low) },
            high: { label: 'High', accessor: read(high) },
          },
        }),
        draw: (ids) =>
          ids.map((id) =>
            display === 'error' ? (
              <ErrorBar key={id} series={id} low="low" high="high" point={value !== undefined} />
            ) : (
              <RangeBar key={id} series={id} low="low" high="high" depth={depth} />
            ),
          ),
      }}
    />
  );
}
