import type { ChartSnapshot } from '../chart-context';
import type { NormalizedRow } from '../engine/normalize';
import type { ChartSeries, ChartTooltipContext } from '../types';
import { fieldEntries } from './field-values';

export function tooltipContext<T>(
  snapshot: ChartSnapshot<T>,
  row: NormalizedRow<T>,
  series: readonly ChartSeries<T>[],
  pinned: boolean,
  activeSeriesId: string | null = null,
): ChartTooltipContext<T> {
  return {
    activeSeriesId: activeSeriesId ?? undefined,
    row: row.datum,
    sourceIndex: row.sourceIndex,
    x: row.x,
    formattedX: snapshot.formatX(row.x),
    pinned,
    series: series.map((descriptor) => {
      const value = row.values[descriptor.id] ?? null;
      return {
        id: descriptor.id,
        label: descriptor.label,
        value,
        formattedValue:
          value === null
            ? 'No data'
            : (descriptor.formatValue?.(value) ?? snapshot.formatValue(value)),
        status: row.statuses[descriptor.id] ?? 'observed',
        fields: fieldEntries(descriptor, row.fields[descriptor.id], snapshot.formatValue),
      };
    }),
  };
}
