import { useMemo, type ReactElement } from 'react';
import { useChartContext } from '../chart-context';
import { buildGeometry, pointAtX } from '../engine/geometry';
import { normalizeData } from '../engine/normalize';
import type { ChangeComparisonProps } from '../types';

export function ChangeComparison<T>({
  data,
  label,
  series: seriesId,
  className,
}: ChangeComparisonProps<T>): ReactElement {
  const context = useChartContext<T>();
  const id = seriesId ?? context.series[0]?.id;
  const descriptor = context.series.find((item) => item.id === id);
  const previous = useMemo(() => {
    if (!descriptor || !context.snapshot.yDomain) return null;
    try {
      const normalized = normalizeData(data, context.series, context.xConfig);
      return {
        normalized,
        geometry: buildGeometry(normalized, {
          plotLeft: context.snapshot.plot.left,
          plotTop: context.snapshot.plot.top,
          plotWidth: context.snapshot.plot.width,
          plotHeight: context.snapshot.plot.height,
          xDomain: context.snapshot.xDomain,
          yDomain: context.snapshot.yDomain,
          series: context.series,
          curveBySeries: Object.fromEntries(
            context.series.map((item) => [item.id, item.curve ?? 'monotone']),
          ),
        }),
      };
    } catch {
      return null;
    }
  }, [context.series, context.snapshot, context.xConfig, data, descriptor]);

  if (!id || !descriptor || !previous || !context.visibleSeries.includes(id)) return <g />;
  const oldGeometry = previous.geometry.series[id];
  const currentGeometry = context.snapshot.geometry?.series[id];
  const currentByX = new Map(context.snapshot.data.rows.map((row) => [row.x, row.values[id]]));
  const matchedSegments: (typeof previous.normalized.rows)[] = [];
  let currentSegment: typeof previous.normalized.rows = [];
  for (const row of previous.normalized.rows) {
    const current = currentByX.get(row.x);
    if (row.values[id] === null || current === null || current === undefined) {
      if (currentSegment.length) matchedSegments.push(currentSegment);
      currentSegment = [];
    } else {
      currentSegment = [...currentSegment, row];
    }
  }
  if (currentSegment.length) matchedSegments.push(currentSegment);
  const differencePaths = matchedSegments
    .filter((segment) => segment.length > 1 && currentGeometry)
    .map((segment) => {
      const start = context.snapshot.xToPixel(segment[0].x);
      const end = context.snapshot.xToPixel(segment.at(-1)!.x);
      const samples = Math.max(8, (segment.length - 1) * 8);
      const currentPoints = Array.from({ length: samples + 1 }, (_, index) => {
        const x = start + ((end - start) * index) / samples;
        return pointAtX(currentGeometry!, x);
      });
      const previousPoints = Array.from({ length: samples + 1 }, (_, index) => {
        const x = end - ((end - start) * index) / samples;
        return pointAtX(oldGeometry, x);
      });
      if (currentPoints.some((point) => !point) || previousPoints.some((point) => !point))
        return null;
      const currentEdge = currentPoints.map(
        (point, index) => `${index === 0 ? 'M' : 'L'}${point!.x},${point!.y}`,
      );
      const previousEdge = previousPoints.map((point) => `L${point!.x},${point!.y}`);
      return `${[...currentEdge, ...previousEdge].join(' ')} Z`;
    })
    .filter((path): path is string => path !== null);

  return (
    <g
      aria-label={`${label}, previous snapshot`}
      className={['lilt-chart__change-comparison', className].filter(Boolean).join(' ')}
      clipPath={`url(#${context.clipId}-plot)`}
    >
      {differencePaths.map((path, index) => (
        <path className="lilt-chart__difference" d={path} key={`difference-${index}`} />
      ))}
      {oldGeometry.segments.map((segment) => (
        <path
          className="lilt-chart__previous-snapshot"
          d={segment.path}
          fill="none"
          key={`${segment.startX}-${segment.endX}`}
          stroke={descriptor.color ?? 'var(--lilt-series-1)'}
          style={{ stroke: descriptor.color ?? 'var(--lilt-series-1)' }}
          vectorEffect="non-scaling-stroke"
        />
      ))}
      <text
        className="lilt-chart__previous-snapshot-label"
        x={context.snapshot.plot.left + 8}
        y={context.snapshot.plot.bottom - 10}
      >
        {label}
      </text>
    </g>
  );
}
