import { useMemo } from 'react';
import { useChartContext, type ChartSnapshot } from '../chart-context';
import type { RangeScales } from '../engine/ranges';
import { seriesColor } from '../paint';
import type { ChartSeries } from '../types';
import { markSeries } from './contract';
import { MAX_DEPTH, MAX_RISE } from '../engine/depth';

export interface RangeMarkState {
  descriptor: ChartSeries<unknown>;
  color: string;
  scales: RangeScales;
  snapshot: ChartSnapshot<unknown>;
  /** Group opacity: hidden, dimmed behind focus or inspection, or full. */
  opacity: number | string;
  /** The reveal mask while the entrance sweeps in. */
  mask: string | undefined;
  clipPath: string;
  /** Like `clipPath`, with headroom above the plot for the tops of marks drawn with depth. */
  depthClip: { id: string; x: number; y: number; width: number; height: number };
  reducedMotion: boolean;
  inspecting: boolean;
}

export function scalesFor(snapshot: ChartSnapshot<unknown>, series: string): RangeScales {
  return {
    x: snapshot.xToPixel,
    y: snapshot.yToPixelFor(series),
    xDomain: snapshot.xDomain,
    columnWidth: snapshot.columnWidth,
  };
}

/** Shared state for a mark drawn from a series' fields. */
export function useRangeMark(
  mark: string,
  series: string,
  fields: readonly string[],
  layout: 'column' | 'overlay',
): RangeMarkState {
  const context = useChartContext<unknown>();
  const { snapshot, visibleSeries, focusedSeries, inspecting, revealProgress, clipId } = context;
  const { descriptor, index } = markSeries(mark, context.series, series, fields);
  if (snapshot.bars?.includes(series) || snapshot.stack?.series.includes(series))
    throw new Error(`Lilt ${mark} draws its own series; do not also draw "${series}" as bars.`);
  const scales = useMemo(() => scalesFor(snapshot, series), [snapshot, series]);
  const opacity = !visibleSeries.includes(series)
    ? 0
    : focusedSeries && focusedSeries !== series
      ? 'var(--lilt-focus-muted-opacity, 0.18)'
      : inspecting
        ? layout === 'column'
          ? 'var(--lilt-bar-inspection-muted-opacity, 0.26)'
          : 0.3
        : 1;
  return {
    descriptor,
    color: seriesColor(descriptor, index),
    scales,
    snapshot,
    opacity,
    mask: revealProgress < 1 ? `url(#${clipId})` : undefined,
    clipPath: `url(#${clipId}-plot)`,
    depthClip: {
      id: `${clipId}-depth-${index}`,
      x: snapshot.plot.left,
      y: snapshot.plot.top - MAX_RISE,
      width: snapshot.plot.width + MAX_DEPTH,
      height: snapshot.plot.height + MAX_RISE,
    },
    reducedMotion: context.reducedMotion,
    inspecting,
  };
}
