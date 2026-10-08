'use client';

import type { ReactElement } from 'react';
import {
  CartesianCard,
  cardStack,
  type CardSeries,
  type CartesianCardProps,
} from './cartesian-card';
import type { CardAggregate } from './format';
import type { NumericKey } from './keys';
import type { ChartBarAppearance } from '../types';

export interface ComboLineSeries<Key extends string> extends CardSeries<Key> {
  /** Number format for this line's tiles, pill, and right-hand labels, e.g. a percentage. */
  valueFormat?: Intl.NumberFormatOptions;
  /**
   * How this line's tile summarizes the period. Defaults to the card's `aggregate`, or `mean`
   * when the line has its own scale, since those are usually rates.
   */
  aggregate?: CardAggregate;
}

export interface ComboChartCardProps<Row, Key extends NumericKey<Row>>
  extends Omit<CartesianCardProps<Row, Key>, 'series' | 'pillValue'> {
  /** Numeric fields drawn as bars, grouped or stacked. They make up the headline. */
  bars: readonly CardSeries<Key>[];
  /**
   * Stack the bars: `true` adds them, `'percent'` shows each bar series' share. Lines stay
   * unstacked over the stack, such as a target over stacked revenue. Omit to group the bars.
   */
  stack?: boolean | 'percent';
  /** Numeric fields drawn as lines over the bars, e.g. a budget, a forecast, or a rate. */
  lines: readonly ComboLineSeries<Key>[];
  /**
   * `shared` (default) puts lines on the bar scale, so heights compare directly, as with actual
   * against budget. `own` fits lines to their own scale for a different unit, such as margin
   * over revenue; its labels sit on the right and share the bar gridlines.
   */
  lineScale?: 'shared' | 'own';
  /** Corner radius in pixels. Defaults to 6. */
  radius?: number;
  /** `end` (default) rounds each bar's value end; `all` rounds every corner. */
  corners?: 'end' | 'all';
  /** Quiet full-height lanes behind each bar or stack. Defaults to false. */
  tracks?: boolean;
  /** Maximum bar width in pixels; bars never exceed their slot. */
  barWidth?: number;
  /** `solid` (default), `segmented`, `needle`, `gradient`, `outline`, or `isometric`. */
  barStyle?: ChartBarAppearance;
  /** Shorthand for depth across every card family: here it makes `barStyle` default to `isometric`. */
  depth?: boolean;
  /** `smooth` (default) or `linear` line segments. */
  curve?: 'smooth' | 'linear';
  /** Mark every line observation with a small dot. Defaults to true. */
  points?: boolean;
}

/**
 * Bars and lines in one card: amounts as bars, with a target, forecast, or rate drawn over them.
 * The headline totals the bars; every series gets a tile, and the pill reads whichever mark is
 * nearest the pointer.
 */
export function ComboChartCard<Row, const Key extends NumericKey<Row>>({
  bars,
  lines,
  lineScale = 'shared',
  stack,
  radius = 6,
  corners = 'end',
  tracks = false,
  barWidth,
  depth = false,
  barStyle = depth ? 'isometric' : 'solid',
  curve = 'smooth',
  points = true,
  aggregate = 'sum',
  pillPosition,
  ...props
}: ComboChartCardProps<Row, Key>): ReactElement {
  const own = lineScale === 'own';
  return (
    <CartesianCard
      {...props}
      depth={depth}
      aggregate={aggregate}
      // An axis pill could only sit on one side; pills over the marks read either scale.
      pillPosition={pillPosition ?? (own ? 'mark' : 'auto')}
      series={[
        ...bars,
        ...lines.map((line) => ({
          ...line,
          as: 'line' as const,
          scale: own ? ('secondary' as const) : undefined,
          aggregate: line.aggregate ?? (own ? 'mean' : aggregate),
        })),
      ]}
      shape={{
        kind: 'bar',
        stack: cardStack(stack),
        radius,
        corners,
        tracks,
        barWidth,
        appearance: barStyle,
        curve: curve === 'linear' ? 'linear' : 'monotone',
        points,
      }}
    />
  );
}
