'use client';

import type { ReactElement } from 'react';
import { CartesianCard, type CartesianCardProps } from './cartesian-card';
import type { NumericKey } from './keys';

export interface LineChartCardProps<Row, Key extends NumericKey<Row>>
  extends CartesianCardProps<Row, Key> {
  /** Rebase each series' first finite reading to 100. A zero baseline is unindexable. */
  indexed?: boolean;
  /** `smooth` uses a monotone curve, `linear` straight segments, `step` holds each value flat. */
  curve?: 'smooth' | 'linear' | 'step';
  /** Mark every observation with a small dot. Defaults to false. */
  points?: boolean;
  /**
   * `auto` (default) fits the y axis to the data so trends fill the plot; `zero` starts it at
   * zero when the absolute level matters.
   */
  baseline?: 'auto' | 'zero';
}

/**
 * A complete line chart card: headline, delta, period, plot, and value tiles.
 * The headline and tiles follow the hovered point, and the y pill follows the nearest line.
 */
export function LineChartCard<Row, const Key extends NumericKey<Row>>({
  indexed = false,
  curve = 'smooth',
  points = false,
  baseline = 'auto',
  ...props
}: LineChartCardProps<Row, Key>): ReactElement {
  return (
    <CartesianCard
      {...props}
      aggregate={indexed ? 'last' : props.aggregate}
      valueFormat={indexed ? { maximumFractionDigits: 1 } : props.valueFormat}
      headlineSeries={props.headlineSeries ?? (indexed ? props.series[0]?.key : undefined)}
      shape={{
        kind: 'line',
        indexed,
        curve: curve === 'linear' ? 'linear' : curve === 'step' ? 'step-after' : 'monotone',
        points,
        zero: baseline === 'zero',
      }}
    />
  );
}
