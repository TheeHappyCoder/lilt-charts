'use client';

import type { ReactElement } from 'react';
import { CartesianCard, cardStack, type CartesianCardProps } from './cartesian-card';
import type { NumericKey } from './keys';
import type { ChartBarAppearance } from '../types';

export interface BarChartCardProps<Row, Key extends NumericKey<Row>>
  extends CartesianCardProps<Row, Key> {
  /**
   * Stack the bars: `true` adds them, `'percent'` shows each series' share of its period, and
   * the headline and tiles then read shares of the latest period. Omit to group them side by
   * side. Dashed series stay reference lines over the bars, such as a target.
   */
  stack?: boolean | 'percent';
  /** Corner radius in pixels. Defaults to 6. */
  radius?: number;
  /**
   * `end` (default) rounds each bar's value end; `all` rounds every corner, so stacked segments
   * read as separate rounded blocks.
   */
  corners?: 'end' | 'all';
  /** Quiet full-height lanes behind each bar or stack. Defaults to false. */
  tracks?: boolean;
  /** Maximum bar width in pixels; bars never exceed their slot. */
  barWidth?: number;
  /**
   * How bars are drawn: `solid` (default), `segmented` into small cells, `needle` (thin segmented
   * lines; the hovered bar expands), `gradient` fading toward the baseline, `outline`, or
   * `isometric` with a shaded top and side around the measured front face.
   */
  barStyle?: ChartBarAppearance;
  /** Shorthand for depth across every card family: here it makes `barStyle` default to `isometric`. */
  depth?: boolean;
}

/**
 * A complete bar chart card: headline, delta, period, plot, and value tiles.
 * Dashed series draw as reference lines over the bars. Bars stay inside the card padding by
 * default, so every label centers on its bar.
 */
export function BarChartCard<Row, const Key extends NumericKey<Row>>({
  stack,
  radius = 6,
  corners = 'end',
  tracks = false,
  barWidth,
  depth = false,
  barStyle = depth ? 'isometric' : 'solid',
  ...props
}: BarChartCardProps<Row, Key>): ReactElement {
  return (
    <CartesianCard
      {...props}
      depth={depth}
      shape={{
        kind: 'bar',
        stack: cardStack(stack),
        radius,
        corners,
        tracks,
        barWidth,
        appearance: barStyle,
      }}
    />
  );
}
