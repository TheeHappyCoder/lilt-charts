'use client';

import { useMemo, useSyncExternalStore } from 'react';
import { summarizeRange } from '../data/chart-data';
import { useChartRuntime } from '../runtime/chart-runtime';
import { useAcceptedRows } from '../interaction/use-category-state';
import { AnimatedNumber } from '../motion/animated-number';

export interface ChartRangeSummaryProps {
  series?: string;
  className?: string;
}
export function ChartRangeSummary({ series: seriesId, className }: ChartRangeSummaryProps) {
  const runtime = useChartRuntime<unknown>();
  const focus = useSyncExternalStore(
    runtime.controller.subscribe,
    () => runtime.controller.getSnapshot().focus,
    () => runtime.controller.getSnapshot().focus,
  );
  const { props } = runtime;
  const accepted = useAcceptedRows(props.data, props.status ?? 'ready', props.resetKey);
  const series = props.series.find((item) => item.id === (seriesId ?? props.series[0]?.id));
  const outcome = useMemo(() => {
    if (!series || props.x.type === 'category' || !accepted.rows)
      return { value: null, error: null };
    try {
      return {
        value: summarizeRange(accepted.rows, {
          x: props.x.accessor,
          value: series.accessor,
          range: focus,
        }),
        error: null,
      };
    } catch (error) {
      return {
        value: null,
        error: error instanceof Error ? error.message : 'Summary unavailable.',
      };
    }
  }, [accepted.rows, props.x, series, focus]);
  const result = outcome.value;
  if (props.x.type === 'category')
    throw new Error('ChartRangeSummary needs a time or numeric x axis.');
  if (!series) throw new Error('ChartRangeSummary needs a known series.');
  const format = series.formatValue ?? String;
  return (
    <div
      className={['lilt-range-summary', className].filter(Boolean).join(' ')}
      aria-label={`${series.label} range summary`}
    >
      <dl>
        {(['total', 'mean', 'min', 'max'] as const).map((key) => (
          <div key={key}>
            <dt>
              {
                {
                  total: result?.missing ? 'Known total' : 'Total',
                  mean: 'Average',
                  min: 'Low',
                  max: 'High',
                }[key]
              }
            </dt>
            <dd>
              {result?.[key] == null ? (
                '—'
              ) : (
                <AnimatedNumber value={result[key]} format={format} motion={props.motion} />
              )}
            </dd>
          </div>
        ))}
      </dl>
      <span className="lilt-range-summary__count">
        {outcome.error ??
          (result
            ? `${result.count} observations${result.missing ? ` · ${result.missing} missing` : ''}`
            : props.status === 'loading'
              ? 'Loading observations'
              : 'No observations')}
      </span>
    </div>
  );
}
