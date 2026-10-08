import { useLayoutEffect, useRef, useState, type ReactElement } from 'react';
import { useChartContext, type ChartSnapshot } from '../chart-context';
import type { LineProps } from '../types';
import type { CartesianChartModel } from '../model/cartesian-model';
import { useChartRuntime } from '../runtime/chart-runtime';
import { entranceProgress } from '../motion/entrance';
import { areaFloor, riseStyle } from '../motion/area-flow';
import { seriesColor } from '../paint';
import { useAxisCursor } from '../interaction/axis-cursor';
import { extendLinePath, RunoffFade, runoffEdges, runoffMaskId, segmentEdges } from './runoff';
import { DropShadow, TubePath, tubeWidth } from './depth-paint';

function placeDirectLabels(
  labels: readonly { id: string; y: number }[],
  top: number,
  bottom: number,
): Map<string, number> {
  const minimum = top + 9;
  const maximum = bottom - 5;
  const spacing = 17;
  if (maximum - minimum < (labels.length - 1) * spacing) return new Map();

  const positions: number[] = [];
  for (const label of labels) {
    positions.push(Math.max(label.y, (positions.at(-1) ?? minimum - spacing) + spacing, minimum));
  }
  if (positions.length && positions.at(-1)! > maximum) {
    positions[positions.length - 1] = maximum;
    for (let index = positions.length - 2; index >= 0; index -= 1) {
      positions[index] = Math.min(positions[index], positions[index + 1] - spacing);
    }
  }
  return new Map(labels.map((label, index) => [label.id, positions[index]]));
}

export function Line<Row, Id extends string>(
  props: LineProps & { model: CartesianChartModel<Row, Id>; series: NoInfer<Id> },
): ReactElement;
export function Line(props: LineProps): ReactElement;
export function Line({
  series,
  className,
  model,
}: LineProps & { model?: CartesianChartModel<unknown, string> }): ReactElement {
  const runtime = useChartRuntime();
  if (model && model !== runtime.model)
    throw new Error('Lilt Line model must be the model supplied to its Chart.');
  const { runoff } = useAxisCursor();
  const labelRef = useRef<SVGTextElement>(null);
  const [labelFits, setLabelFits] = useState(false);
  const {
    snapshot,
    width,
    series: descriptors,
    reducedMotion,
    inspecting,
    focusedSeries,
    visibleSeries,
    revealProgress,
    transitionDuration,
    clipId,
  } = useChartContext<unknown>();
  const entranceOpacity = entranceProgress(
    revealProgress < 1 ? revealProgress * transitionDuration : Infinity,
    0,
    180,
  );
  const descriptor = descriptors.find((item) => item.id === series);
  if (!descriptor) throw new Error(`Lilt Line references unknown series "${series}".`);
  // Drawing only: a long series draws from fewer rows tracing the same ink (see decimate).
  const geometry = (snapshot.drawGeometry ?? snapshot.geometry)?.series[series];
  const color = seriesColor(descriptor, descriptors.indexOf(descriptor));
  const appearance = descriptor?.line;
  // Observation colors are keyed by rounded pixel x, since points carry no row.
  const pointColors = descriptor.colorAt
    ? new Map(
        snapshot.data.rows.map((row) => [
          Math.round(snapshot.xToPixel(row.x)),
          descriptor.colorAt!(row.datum) ?? color,
        ]),
      )
    : null;
  const pointColor = (x: number) => pointColors?.get(Math.round(x)) ?? color;
  const directLabels = descriptors
    .filter((item) => item.line?.directLabel && visibleSeries.includes(item.id))
    .map((item, index) => {
      const itemGeometry = snapshot.geometry?.series[item.id];
      const endpoint =
        itemGeometry?.segments.at(-1)?.points.at(-1) ?? itemGeometry?.isolated.at(-1);
      let value: number | null | undefined;
      for (let rowIndex = snapshot.data.rows.length - 1; rowIndex >= 0; rowIndex -= 1) {
        value = snapshot.data.rows[rowIndex].values[item.id];
        if (value !== null && value !== undefined) break;
      }
      return endpoint && value !== null && value !== undefined
        ? {
            id: item.id,
            y: endpoint.y,
            text: `${item.label} ${item.formatValue?.(value) ?? snapshot.formatValue(value)}`,
            color: seriesColor(item, descriptors.indexOf(item)),
            index,
          }
        : null;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => a.y - b.y);
  const labelY = placeDirectLabels(directLabels, snapshot.plot.top, snapshot.plot.bottom);
  const labelText = directLabels.find((item) => item.id === series)?.text;
  const labelRoom = width - snapshot.plot.right - 11;
  const renderDirectLabel = Boolean(
    appearance?.directLabel &&
      labelText &&
      labelY.has(series) &&
      snapshot.plot.width >= 460 &&
      width - snapshot.plot.right >= 96,
  );
  useLayoutEffect(() => {
    if (!renderDirectLabel || !labelText || !labelRef.current) return;
    const element = labelRef.current;
    let active = true;
    const measure = () => {
      if (!active) return;
      const measured = element.getComputedTextLength?.();
      const svgWidth = element.closest('svg')?.getBoundingClientRect().width;
      const boundsWidth = element.getBoundingClientRect().width;
      const textWidth =
        measured && Number.isFinite(measured)
          ? measured
          : svgWidth && boundsWidth
            ? (boundsWidth * width) / svgWidth
            : labelText.length * 8;
      setLabelFits(textWidth <= labelRoom);
    };
    measure();
    void document.fonts?.ready.then(measure);
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(element);
    return () => {
      active = false;
      observer?.disconnect();
    };
  }, [labelRoom, labelText, renderDirectLabel, width]);
  const weight = snapshot.stack?.series.includes(series)
    ? (snapshot.stackWeights?.[series] ?? (visibleSeries.includes(series) ? 1 : 0))
    : visibleSeries.includes(series)
      ? 1
      : 0;
  const emphasis =
    focusedSeries && focusedSeries !== series
      ? 'var(--lilt-focus-muted-opacity, 0.18)'
      : inspecting
        ? 'var(--lilt-inspection-muted-opacity, 0.24)'
        : '1';

  if (!geometry) return <g className={className} data-series={series} />;
  // A line with depth is a lit tube; dashed references stay flat, as guides rather than data.
  const tube =
    appearance?.depth && !appearance.dasharray
      ? tubeWidth(typeof appearance.width === 'number' ? appearance.width : 2)
      : 0;
  const edges = runoff ? runoffEdges(snapshot as ChartSnapshot<unknown>, geometry) : null;
  const runoffId = edges
    ? runoffMaskId(
        `${clipId}-runoff-line-${descriptors.indexOf(descriptor)}`,
        snapshot as ChartSnapshot<unknown>,
        edges,
      )
    : '';
  const runoffFade = edges ? (
    <RunoffFade id={runoffId} snapshot={snapshot as ChartSnapshot<unknown>} edges={edges} />
  ) : null;
  // The outline of an area rises with its fill (see Area); a plain line draws in place.
  const rise = descriptor.area
    ? riseStyle(
        revealProgress < 1 ? revealProgress * transitionDuration : Infinity,
        areaFloor(snapshot as ChartSnapshot<unknown>),
      )
    : {};

  return (
    <>
      <g
        aria-hidden="true"
        className={['lilt-chart__line', `lilt-chart__line--${series}`, className]
          .filter(Boolean)
          .join(' ')}
        data-series={series}
        clipPath={`url(#${clipId}-plot)`}
        mask={revealProgress < 1 ? `url(#${clipId})` : undefined}
        fill="none"
        stroke={color}
        strokeLinecap={appearance?.cap ?? 'round'}
        strokeLinejoin={appearance?.join ?? 'round'}
        strokeWidth={appearance?.width ?? 'var(--lilt-line-width, 2)'}
        strokeOpacity={appearance?.opacity ?? 'var(--lilt-line-opacity, 1)'}
        strokeDasharray={appearance?.dasharray}
        style={{
          stroke: color,
          strokeWidth: appearance?.width ?? 'var(--lilt-line-width, 2)',
          strokeOpacity: appearance?.opacity ?? 'var(--lilt-line-opacity, 1)',
          opacity: `calc(${weight} * ${emphasis})`,
          transition: reducedMotion ? undefined : `opacity ${inspecting ? 140 : 180}ms ease-out`,
        }}
      >
        {runoffFade}
        <g transform={rise.transform} style={rise.filter ? { filter: rise.filter } : undefined}>
          {tube ? (
            <defs>
              <DropShadow
                id={`${clipId}-tube-${descriptors.indexOf(descriptor)}`}
                size={3}
                region={{
                  x: snapshot.plot.left - 20,
                  y: snapshot.plot.top - 20,
                  width: snapshot.plot.width + 40,
                  height: snapshot.plot.height + 40,
                }}
              />
            </defs>
          ) : null}
          <g
            mask={edges ? `url(#${runoffId})` : undefined}
            filter={tube ? `url(#${clipId}-tube-${descriptors.indexOf(descriptor)})` : undefined}
          >
            {geometry.segments.map((segment, index) => {
              const d = edges
                ? extendLinePath(segment, segmentEdges(edges, index, geometry.segments.length))
                : segment.path;
              const dasharray =
                segment.status === 'provisional'
                  ? '5 4'
                  : segment.status === 'forecast'
                    ? '2 5'
                    : appearance?.dasharray;
              return tube ? (
                <g
                  key={`${series}-${segment.startX}-${segment.endX}`}
                  data-lilt-path={series}
                  data-lilt-status={
                    segment.status && segment.status !== 'observed' ? segment.status : undefined
                  }
                  opacity={entranceOpacity}
                >
                  <TubePath d={d} color={color} width={tube} dasharray={dasharray} />
                </g>
              ) : (
                <path
                  d={d}
                  data-lilt-status={
                    segment.status && segment.status !== 'observed' ? segment.status : undefined
                  }
                  opacity={entranceOpacity}
                  data-lilt-path={series}
                  key={`${series}-${segment.startX}-${segment.endX}`}
                  strokeDasharray={dasharray}
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}
          </g>
          {appearance?.points
            ? geometry.segments.flatMap((segment) =>
                segment.points.map((point) => (
                  <circle
                    className="lilt-chart__line-point"
                    cx={point.x}
                    cy={point.y}
                    key={`${series}-point-${point.x}`}
                    r={appearance.pointRadius ?? 2.75}
                    opacity={entranceOpacity}
                    style={{
                      fill: pointColor(point.x),
                      stroke:
                        appearance.pointStroke ?? 'var(--lilt-point-ring, var(--lilt-surface))',
                      strokeWidth: appearance.pointStrokeWidth ?? 1.5,
                    }}
                  />
                )),
              )
            : null}
          {geometry.isolated.map((point) => (
            <circle
              className="lilt-chart__isolated-point"
              cx={point.x}
              cy={point.y}
              key={`${series}-isolated-${point.x}`}
              r={appearance?.pointRadius ?? 2.5}
              opacity={entranceOpacity}
              style={{
                fill: pointColor(point.x),
                stroke: appearance?.pointStroke ?? 'var(--lilt-surface)',
                strokeWidth: appearance?.pointStrokeWidth ?? 1.5,
              }}
            />
          ))}
        </g>
      </g>
      {renderDirectLabel ? (
        <text
          aria-hidden="true"
          className="lilt-chart__direct-label"
          x={snapshot.plot.right + 7}
          y={labelY.get(series)}
          fill={color}
          stroke="var(--lilt-surface)"
          strokeWidth={4}
          paintOrder="stroke"
          ref={labelRef}
          style={{ fill: color, stroke: 'var(--lilt-surface)' }}
          visibility={labelFits ? undefined : 'hidden'}
        >
          {labelText}
        </text>
      ) : null}
    </>
  );
}
