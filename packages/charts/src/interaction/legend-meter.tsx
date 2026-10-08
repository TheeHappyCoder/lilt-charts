import type { ReactElement } from 'react';

/** The largest positive value a `bars` legend measures against, or null when there is none. */
export function legendMeterScale(values: readonly (number | null)[]): number | null {
  const largest = Math.max(0, ...values.map((value) => (value !== null && value > 0 ? value : 0)));
  return largest > 0 ? largest : null;
}

/**
 * A thin bar under a legend value, as long as the value against the largest one shown. Missing,
 * zero and negative values draw an empty track rather than a false sliver.
 */
export function LegendMeter({
  value,
  scale,
}: {
  value: number | null;
  scale: number | null;
}): ReactElement {
  const share = value !== null && value > 0 && scale ? Math.min(1, value / scale) : 0;
  return (
    <span className="lilt-chart__legend-meter" aria-hidden="true">
      <span style={{ width: `${share * 100}%` }} />
    </span>
  );
}
