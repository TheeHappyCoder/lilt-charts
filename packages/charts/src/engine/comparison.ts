import type { ChartComparison, ChartPercentagePolicy, ChartRange } from '../types';
import type { NormalizedData } from './normalize';

export function comparisonForRange<T>(
  data: NormalizedData<T>,
  range: ChartRange,
  series: string,
  percentage: ChartPercentagePolicy = 'positive-baseline',
): ChartComparison {
  const start = data.rows.find((row) => row.x === range.startX);
  const end = data.rows.find((row) => row.x === range.endX);
  const startValue = start?.values[series] ?? null;
  const endValue = end?.values[series] ?? null;
  const elapsed = Math.abs(range.endX - range.startX);

  if (!start || !end) {
    return {
      ...range,
      series,
      startValue: null,
      endValue: null,
      absoluteChange: null,
      percentageChange: null,
      elapsed,
      unavailableReason: 'A selected observation is no longer available.',
    };
  }
  if (startValue === null || endValue === null) {
    return {
      ...range,
      series,
      startValue,
      endValue,
      absoluteChange: null,
      percentageChange: null,
      elapsed,
      unavailableReason: 'No data at one or both endpoints.',
    };
  }

  const absoluteChange = endValue - startValue;
  let denominator: number | null = null;
  if (percentage === 'signed' && startValue !== 0) denominator = startValue;
  if (percentage === 'absolute-baseline' && startValue !== 0) denominator = Math.abs(startValue);
  if (percentage === 'positive-baseline' && startValue > 0) denominator = startValue;

  return {
    ...range,
    series,
    startValue,
    endValue,
    absoluteChange,
    percentageChange: denominator === null ? null : (absoluteChange / denominator) * 100,
    elapsed,
  };
}
