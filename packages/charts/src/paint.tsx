import type { ReactElement } from 'react';
import type { ChartFillTreatment, ChartSeries } from './types';

export type PaintKind = 'area' | 'bar' | 'line';

export function seriesColor<T>(descriptor: ChartSeries<T>, index: number): string {
  return descriptor.color ?? `var(--lilt-series-${(index % 6) + 1})`;
}

/** IDs use descriptor positions, so punctuation in a public series ID cannot collide. */
export function paintId(chartId: string, index: number, treatment: ChartFillTreatment): string {
  return `${chartId}-paint-${index}-${treatment}`;
}

export function fillFor(
  color: string,
  explicit: string | undefined,
  treatment: ChartFillTreatment,
  id: string,
): string {
  if (explicit) return explicit;
  return treatment === 'solid' ? color : `url(#${id})`;
}

export function ChartPaintDefs<T>({
  chartId,
  series,
}: {
  chartId: string;
  series: readonly ChartSeries<T>[];
}): ReactElement {
  return (
    <>
      {series.map((descriptor, index) => {
        const color = seriesColor(descriptor, index);
        return (
          <g key={descriptor.id}>
            <linearGradient
              id={`${paintId(chartId, index, 'fade')}-ramp`}
              x1="0"
              x2="0"
              y1="0"
              y2="1"
            >
              <stop offset="0" stopColor="white" stopOpacity="1" />
              <stop offset="1" stopColor="white" stopOpacity="0.02" />
            </linearGradient>
            <mask
              id={`${paintId(chartId, index, 'fade')}-mask`}
              maskUnits="objectBoundingBox"
              maskContentUnits="objectBoundingBox"
              x="0"
              y="0"
              width="1"
              height="1"
            >
              <rect
                x="0"
                y="0"
                width="1"
                height="1"
                fill={`url(#${paintId(chartId, index, 'fade')}-ramp)`}
              />
            </mask>
            <linearGradient id={paintId(chartId, index, 'fade')} x1="0" x2="0" y1="0" y2="1">
              <stop
                offset="0"
                stopColor={color}
                stopOpacity="var(--lilt-area-fill-start)"
                style={{ stopColor: color, stopOpacity: 'var(--lilt-area-fill-start)' }}
              />
              <stop
                offset="1"
                stopColor={color}
                stopOpacity="var(--lilt-area-fill-end)"
                style={{ stopColor: color, stopOpacity: 'var(--lilt-area-fill-end)' }}
              />
            </linearGradient>
            <pattern
              id={paintId(chartId, index, 'hatch')}
              patternUnits="userSpaceOnUse"
              width="8"
              height="8"
            >
              <rect width="8" height="8" fill={color} fillOpacity="0.15" style={{ fill: color }} />
              <path
                d="M-2 2 L2 -2 M0 8 L8 0 M6 10 L10 6"
                stroke={color}
                style={{ stroke: color }}
                strokeOpacity="0.72"
                strokeWidth="1.1"
              />
            </pattern>
            <pattern
              id={paintId(chartId, index, 'dots')}
              patternUnits="userSpaceOnUse"
              width="7"
              height="7"
            >
              <rect width="7" height="7" fill={color} fillOpacity="0.12" style={{ fill: color }} />
              <circle
                cx="3.5"
                cy="3.5"
                r="1.15"
                fill={color}
                fillOpacity="0.78"
                style={{ fill: color }}
              />
            </pattern>
          </g>
        );
      })}
    </>
  );
}
