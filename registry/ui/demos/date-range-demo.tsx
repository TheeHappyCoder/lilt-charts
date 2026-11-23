'use client';

import type { CSSProperties } from 'react';
import { DateRange } from '../date-range';

/** The docs stage's date range: the last 7 days, ready to change, with a hint that order is free. */
export function DateRangeDemo({
  defaultCompare = false,
  style,
}: {
  defaultCompare?: boolean;
  style?: CSSProperties;
}) {
  return (
    <div style={{ display: 'grid', width: 'min(560px, 100%)', ...style }}>
      <DateRange
        key={String(defaultCompare)}
        defaultCompare={defaultCompare}
        note="Two days, in either order"
      />
    </div>
  );
}
