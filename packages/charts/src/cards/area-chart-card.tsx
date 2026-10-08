'use client';

import type { ReactElement } from 'react';
import { CartesianCard, cardStack, type CartesianCardProps } from './cartesian-card';
import type { NumericKey } from './keys';

export type { CardRange, CardSeries } from './cartesian-card';

export interface AreaChartCardProps<Row, Key extends NumericKey<Row>>
  extends CartesianCardProps<Row, Key> {
  /**
   * Stack the areas: `true` adds them, `'percent'` shows each series' share of its period, and
   * the headline and tiles then read shares of the latest period. Omit to overlap them. Dashed
   * series stay reference lines over the stack.
   */
  stack?: boolean | 'percent';
  /** `smooth` uses a monotone curve; `linear` draws straight segments. */
  curve?: 'smooth' | 'linear';
}

/**
 * A complete area chart card: headline, delta, period, plot, and value tiles.
 * The headline and tiles follow the hovered point.
 */
export function AreaChartCard<Row, const Key extends NumericKey<Row>>({
  stack,
  curve = 'smooth',
  ...props
}: AreaChartCardProps<Row, Key>): ReactElement {
  return (
    <CartesianCard
      {...props}
      shape={{
        kind: 'area',
        stack: cardStack(stack),
        curve: curve === 'linear' ? 'linear' : 'monotone',
      }}
    />
  );
}
