import type { ReactElement } from 'react';
import { useChartContext, type ChartSnapshot } from '../chart-context';
import type { AreaProps } from '../types';
import type { CartesianChartModel } from '../model/cartesian-model';
import { useChartRuntime } from '../runtime/chart-runtime';
import { entranceProgress } from '../motion/entrance';
import { areaFloor, riseStyle } from '../motion/area-flow';
import { fillFor, seriesColor } from '../paint';
import { useAxisCursor } from '../interaction/axis-cursor';
import { extendAreaPath, RunoffFade, runoffEdges, runoffMaskId, segmentEdges } from './runoff';

export function Area<Row, Id extends string>(
  props: AreaProps & { model: CartesianChartModel<Row, Id>; series: NoInfer<Id> },
): ReactElement;
export function Area(props: AreaProps): ReactElement;
export function Area({
  series,
  className,
  model,
}: AreaProps & { model?: CartesianChartModel<unknown, string> }): ReactElement {
  const runtime = useChartRuntime();
  const { runoff } = useAxisCursor();
  if (model && model !== runtime.model)
    throw new Error('Lilt Area model must be the model supplied to its Chart.');
  const {
    snapshot,
    series: descriptors,
    reducedMotion,
    inspecting,
    paintId,
    focusedSeries,
    visibleSeries,
    revealProgress,
    transitionDuration,
    clipId,
  } = useChartContext<unknown>();
  const fillEntrance = entranceProgress(
    revealProgress < 1 ? revealProgress * transitionDuration : Infinity,
    40,
    transitionDuration * 0.65,
  );
  // Drawing only: a long series draws from fewer rows tracing the same ink (see decimate).
  const geometry = (snapshot.drawGeometry ?? snapshot.geometry)?.series[series];
  if (!descriptors.some((item) => item.id === series))
    throw new Error(`Lilt Area references unknown series "${series}".`);
  const stacked = Boolean(snapshot.stack?.series.includes(series));
  const weight = stacked
    ? (snapshot.stackWeights?.[series] ?? (visibleSeries.includes(series) ? 1 : 0))
    : visibleSeries.includes(series)
      ? 1
      : 0;
  const descriptorIndex = descriptors.findIndex((item) => item.id === series);
  const descriptor = descriptors[descriptorIndex];
  const color = seriesColor(descriptor, descriptorIndex);
  const appearance = descriptor.area;
  const treatment = appearance?.treatment ?? (stacked ? 'solid' : 'fade');
  const emphasis =
    focusedSeries && focusedSeries !== series
      ? stacked
        ? 'var(--lilt-stacked-focus-muted-opacity, 0.3)'
        : 'var(--lilt-area-focus-muted-opacity, 0.12)'
      : inspecting
        ? 'var(--lilt-inspection-muted-opacity, 0.24)'
        : '1';

  if (!geometry) return <g className={className} data-series={series} />;
  const edges =
    runoff && !snapshot.stack?.signed
      ? runoffEdges(snapshot as ChartSnapshot<unknown>, geometry)
      : null;
  const runoffId = edges
    ? runoffMaskId(
        `${clipId}-runoff-area-${descriptorIndex}`,
        snapshot as ChartSnapshot<unknown>,
        edges,
      )
    : '';
  const runoffFade = edges ? (
    <RunoffFade id={runoffId} snapshot={snapshot as ChartSnapshot<unknown>} edges={edges} />
  ) : null;
  // On its first arrival the area rises out of its floor, blurred until it lands.
  const rise = riseStyle(
    revealProgress < 1 ? revealProgress * transitionDuration : Infinity,
    areaFloor(snapshot as ChartSnapshot<unknown>),
  );

  return (
    <g
      aria-hidden="true"
      className={['lilt-chart__area', `lilt-chart__area--${series}`, className]
        .filter(Boolean)
        .join(' ')}
      data-series={series}
      clipPath={`url(#${clipId}-plot)`}
      mask={revealProgress < 1 ? `url(#${clipId})` : undefined}
      style={{
        opacity: `calc(${weight} * ${emphasis})`,
        transition: reducedMotion ? undefined : `opacity ${inspecting ? 140 : 180}ms ease-out`,
      }}
    >
      {runoffFade}
      <g
        mask={edges ? `url(#${runoffId})` : undefined}
        transform={rise.transform}
        style={rise.filter ? { filter: rise.filter } : undefined}
      >
        {geometry.segments.map((segment, index) => {
          const segmentTreatment =
            segment.status === 'provisional'
              ? 'hatch'
              : segment.status === 'forecast'
                ? 'dots'
                : treatment;
          const fill = fillFor(
            color,
            appearance?.fill,
            segmentTreatment,
            paintId(series, segmentTreatment === 'solid' ? 'fade' : segmentTreatment),
          );
          return (
            <path
              d={
                edges
                  ? extendAreaPath(segment, segmentEdges(edges, index, geometry.segments.length))
                  : segment.areaPath
              }
              data-lilt-status={
                segment.status && segment.status !== 'observed' ? segment.status : undefined
              }
              fill={fill}
              mask={appearance?.fade ? `url(#${paintId(series, 'fade')}-mask)` : undefined}
              style={{ fill }}
              key={`${series}-area-${segment.startX}-${segment.endX}`}
              opacity={(appearance?.opacity ?? (stacked ? 0.62 : 1)) * fillEntrance}
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
      </g>
    </g>
  );
}
