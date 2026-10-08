import type { ReactElement } from 'react';
import type { ChartRange } from '../types';
import type { ChartSnapshot } from '../chart-context';

interface FocusOverviewProps<T> {
  snapshot: ChartSnapshot<T>;
  range: ChartRange;
  series: string;
}

export function FocusOverview<T>({ snapshot, range, series }: FocusOverviewProps<T>): ReactElement {
  const geometry = (snapshot.drawGeometry ?? snapshot.geometry)?.series[series];
  const start = snapshot.xToPixel(range.startX);
  const end = snapshot.xToPixel(range.endX);
  return (
    <div className="lilt-chart__overview">
      <svg
        aria-label="Full data range with focused interval"
        height="30"
        viewBox={`0 0 ${Math.max(1, snapshot.plot.right)} 30`}
        width="100%"
      >
        {snapshot.geometry?.bars[series] ? (
          <g fill="var(--lilt-series-1)" opacity={0.5} style={{ fill: 'var(--lilt-series-1)' }}>
            {snapshot.geometry?.bars[series]?.map((bar) => (
              <rect
                key={bar.valueX}
                x={bar.x}
                width={bar.width}
                y={2 + ((bar.y - snapshot.plot.top) / Math.max(1, snapshot.plot.height)) * 26}
                height={(bar.height / Math.max(1, snapshot.plot.height)) * 26}
                rx={1}
              />
            ))}
          </g>
        ) : (
          <g
            transform={`translate(0 ${2 - snapshot.plot.top * (26 / Math.max(1, snapshot.plot.height))}) scale(1 ${26 / Math.max(1, snapshot.plot.height)})`}
          >
            {geometry?.segments.map((segment) => (
              <path
                className="lilt-chart__overview-line"
                d={segment.path}
                fill="none"
                key={segment.startX}
              />
            ))}
          </g>
        )}
        <rect
          className="lilt-chart__overview-window"
          height="26"
          width={Math.max(2, Math.abs(end - start))}
          x={Math.min(start, end)}
          y="2"
        />
      </svg>
    </div>
  );
}
