import type {
  ChartComparison,
  ChartComparisonSeries,
  ChartPercentagePolicy,
  ChartRange,
  ChartSeries,
} from '../types';
import { comparisonForRange } from '../engine/comparison';
import type { NormalizedData } from '../engine/normalize';
import { seriesColor } from '../paint';

export interface ComparisonAnswer {
  values: string;
  change: string;
  percentage: string | null;
  unavailable: string | null;
}

/** Every visible descriptor keeps its own units, gaps and baseline policy. */
export function comparisonRows<T>(
  data: NormalizedData<T>,
  range: ChartRange,
  series: readonly ChartSeries<T>[],
  formatValue: (value: number) => string,
  percentage?: ChartPercentagePolicy,
): readonly ChartComparisonSeries[] {
  return series.map((descriptor) => {
    const comparison = comparisonForRange(data, range, descriptor.id, percentage);
    const format = descriptor.formatValue ?? formatValue;
    const answer = comparisonAnswer(comparison, format);
    return {
      startX: comparison.startX,
      endX: comparison.endX,
      startValue: comparison.startValue,
      endValue: comparison.endValue,
      absoluteChange: comparison.absoluteChange,
      percentageChange: comparison.percentageChange,
      elapsed: comparison.elapsed,
      unavailableReason: comparison.unavailableReason,
      id: descriptor.id,
      label: descriptor.label,
      color: seriesColor(
        descriptor,
        data.series.findIndex((item) => item.id === descriptor.id),
      ),
      dasharray: descriptor.line?.dasharray,
      formattedStartValue:
        comparison.startValue === null ? 'No data' : format(comparison.startValue),
      formattedEndValue: comparison.endValue === null ? 'No data' : format(comparison.endValue),
      formattedChange: answer.change,
      formattedPercentage: answer.percentage,
    };
  });
}

export function comparisonAnswer(
  comparison: ChartComparison,
  formatValue: (value: number) => string,
): ComparisonAnswer {
  const values = `${comparison.startValue === null ? 'No data' : formatValue(comparison.startValue)} → ${comparison.endValue === null ? 'No data' : formatValue(comparison.endValue)}`;
  if (comparison.absoluteChange === null)
    return {
      values,
      change: 'Change unavailable',
      percentage: null,
      unavailable: comparison.unavailableReason ?? 'Change unavailable.',
    };
  return {
    values,
    change: `${comparison.absoluteChange < 0 ? '−' : '+'}${formatValue(Math.abs(comparison.absoluteChange))}`,
    percentage:
      comparison.percentageChange === null
        ? null
        : `${comparison.percentageChange < 0 ? '−' : '+'}${Math.abs(comparison.percentageChange).toFixed(1)}%`,
    unavailable: null,
  };
}
