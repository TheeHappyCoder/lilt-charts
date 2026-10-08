import { useRef } from 'react';
import { useChartContext } from '../chart-context';
import { barPath } from '../engine/bars';
import { ISOMETRIC_BAR_RISE } from '../engine/isometric-bars';
import { BarShape } from './bar-shape';
import type { BarProps } from '../types';
import type { CartesianChartModel } from '../model/cartesian-model';
import { useChartRuntime } from '../runtime/chart-runtime';
import { entranceProgress, entranceStagger } from '../motion/entrance';
import { useSnapBars, type SnapBar } from '../motion/use-snap-bars';
import { fillFor, seriesColor } from '../paint';

export function Bar<Row, Id extends string>(
  props: BarProps & { model: CartesianChartModel<Row, Id>; series: NoInfer<Id> },
): React.ReactElement;
export function Bar(props: BarProps): React.ReactElement;
export function Bar({
  series,
  className,
  model,
}: BarProps & { model?: CartesianChartModel<unknown, string> }) {
  const runtime = useChartRuntime();
  if (model && model !== runtime.model)
    throw new Error('Lilt Bar model must be the model supplied to its Chart.');
  const {
    snapshot,
    series: descriptors,
    visibleSeries,
    inspecting,
    focusedSeries,
    reducedMotion,
    revealProgress,
    transitionDuration,
    clipId,
    paintId,
  } = useChartContext<unknown>();
  const descriptor = descriptors.find((item) => item.id === series);
  if (!descriptor) throw new Error(`Lilt Bar references unknown series "${series}".`);
  const bars = snapshot.geometry?.bars[series];
  // A bar is the same object across updates: by category on a category axis, so sorting tracks
  // it, otherwise by its x value.
  const categoryByX = new Map(snapshot.data.rows.map((row) => [row.x, row.categoryId]));
  const keyOf = (bar: { valueX: number }) => categoryByX.get(bar.valueX) ?? String(bar.valueX);
  // Changes snap, and the first reveal arrives the same way: one motion language for bars.
  const snap = useSnapBars(bars, keyOf, !reducedMotion, revealProgress < 1);
  // A leaving bar's row is gone from the data, so it keeps the color it was last drawn in rather
  // than falling back to the series color on its way out. Two generations are kept: the bars as
  // drawn now, and the set from before the data last changed.
  const drawnColors = useRef<{
    signature: string;
    current: Map<string, string>;
    previous: Map<string, string>;
  }>({ signature: '', current: new Map(), previous: new Map() });
  const stacked = Boolean(snapshot.stack?.series.includes(series));
  // Segments look for their neighbours among the other stacked series only.
  const seriesIds = descriptors
    .map((item) => item.id)
    .filter((id) => !stacked || snapshot.stack!.series.includes(id));
  const barGeometry = snapshot.geometry?.bars ?? {};
  const statusByX = new Map(snapshot.data.rows.map((row) => [row.x, row.statuses[series]]));
  const seriesColorValue = seriesColor(descriptor, descriptors.indexOf(descriptor));
  const isometric = descriptor.bar?.appearance === 'isometric';
  const plotClip = isometric
    ? `${clipId}-bar-depth-${descriptors.indexOf(descriptor)}`
    : `${clipId}-plot`;
  const colorByX = descriptor.colorAt
    ? new Map(
        snapshot.data.rows.map((row) => [
          row.x,
          descriptor.colorAt!(row.datum) ?? seriesColorValue,
        ]),
      )
    : null;
  if (colorByX) {
    const current = new Map(
      (bars ?? []).map((bar) => [keyOf(bar), colorByX.get(bar.valueX) ?? seriesColorValue]),
    );
    const signature = [...current.keys()].join('|');
    const drawn = drawnColors.current;
    if (signature !== drawn.signature) {
      // Bars still leaving from an earlier change keep their colors through this one too.
      const previous = new Map(drawn.current);
      for (const item of snap.frame ?? []) {
        const kept = item.leaving ? drawn.previous.get(item.key) : undefined;
        if (kept && !previous.has(item.key)) previous.set(item.key, kept);
      }
      drawnColors.current = { signature, current, previous };
    } else drawn.current = current;
  }
  const emphasis =
    focusedSeries && focusedSeries !== series
      ? 'var(--lilt-focus-muted-opacity, 0.18)'
      : inspecting
        ? 'var(--lilt-bar-inspection-muted-opacity, 0.26)'
        : '1';
  if (!snapshot.bars?.includes(series))
    throw new Error(
      `Lilt Bar series "${series}" must be drawn as bars: list it in <ChartPlot bars>.`,
    );
  return (
    <g
      aria-hidden="true"
      className={['lilt-chart__bars', className].filter(Boolean).join(' ')}
      data-series={series}
      fill={fillFor(
        seriesColor(descriptor, descriptors.indexOf(descriptor)),
        undefined,
        descriptor.bar?.treatment ?? 'solid',
        paintId(series, descriptor.bar?.treatment === 'hatch' ? 'hatch' : 'dots'),
      )}
      fillOpacity={1}
      clipPath={`url(#${plotClip})`}
      data-lilt-snap={snap.pulse ? snap.pulse % 2 : undefined}
      style={{
        fill: fillFor(
          seriesColor(descriptor, descriptors.indexOf(descriptor)),
          undefined,
          descriptor.bar?.treatment ?? 'solid',
          paintId(series, descriptor.bar?.treatment === 'hatch' ? 'hatch' : 'dots'),
        ),
        opacity: !stacked && !visibleSeries.includes(series) ? 0 : emphasis,
        transition: reducedMotion ? undefined : `opacity ${inspecting ? 140 : 180}ms ease-out`,
      }}
    >
      {isometric ? (
        <defs>
          <clipPath id={plotClip}>
            <rect
              x={snapshot.plot.left}
              y={snapshot.plot.top - ISOMETRIC_BAR_RISE}
              width={snapshot.plot.width}
              height={snapshot.plot.height + ISOMETRIC_BAR_RISE}
            />
          </clipPath>
        </defs>
      ) : null}
      {/* One lane per slot: each grouped bar has its own, a stack shares its bottom layer's. */}
      {descriptor.bar?.track && (!stacked || snapshot.stack!.series[0] === series)
        ? bars?.map((bar) => {
            const baseline = stacked
              ? (snapshot.geometry?.baselineY ?? bar.baseline)
              : bar.baseline;
            const trackHeight = Math.max(0, baseline - snapshot.plot.top);
            return trackHeight > 0 ? (
              <path
                key={`track-${bar.valueX}`}
                data-lilt-bar-track={bar.valueX}
                d={barPath(
                  {
                    ...bar,
                    y: snapshot.plot.top,
                    height: trackHeight,
                    baseline,
                    negative: false,
                  },
                  1,
                  {
                    radius: descriptor.bar?.track?.radius ?? descriptor.bar?.radius,
                    roundBothEnds: descriptor.bar?.roundBothEnds,
                  },
                )}
                fill={descriptor.bar?.track?.fill ?? 'var(--lilt-bar-track, var(--lilt-grid))'}
                fillOpacity={descriptor.bar?.track?.opacity ?? 0.3}
              />
            ) : null;
          })
        : null}
      {snap.frame
        ? snap.frame.map((item, index) => renderSnapBar(item, index))
        : bars?.map((bar, index) => {
            const elapsed = revealProgress < 1 ? revealProgress * transitionDuration : Infinity;
            const delay = stacked ? 0 : entranceStagger(index, bars.length);
            const status = statusByX.get(bar.valueX) ?? 'observed';
            const treatment =
              status === 'provisional'
                ? 'hatch'
                : status === 'forecast'
                  ? 'dots'
                  : (descriptor.bar?.treatment ?? 'solid');
            const color = colorByX?.get(bar.valueX) ?? seriesColorValue;
            const fill = fillFor(
              color,
              undefined,
              treatment,
              paintId(series, treatment === 'hatch' ? 'hatch' : 'dots'),
            );
            return (
              <BarShape
                key={bar.valueX}
                id={`${clipId}-bar-${descriptors.indexOf(descriptor)}-${index}`}
                bar={bar}
                appearance={descriptor.bar?.appearance}
                color={color}
                fill={fill}
                baseline={snapshot.geometry?.baselineY ?? bar.baseline}
                dataAttributes={{
                  'data-lilt-bar': bar.valueX,
                  'data-lilt-status': status !== 'observed' ? status : undefined,
                }}
                mark={{
                  stacked,
                  geometry: barGeometry,
                  seriesIds,
                  seriesId: series,
                  radius: descriptor?.bar?.radius,
                  roundBothEnds: descriptor.bar?.roundBothEnds,
                  segmentGap: snapshot.barLayout.segmentGap,
                  progress: entranceProgress(elapsed, delay, transitionDuration - delay),
                  originY: stacked ? snapshot.geometry?.baselineY : undefined,
                }}
                fillOpacity={descriptor?.bar?.fillOpacity ?? 1}
                opacity={entranceProgress(elapsed, delay, 160)}
                stroke={descriptor?.bar?.stroke}
                strokeWidth={descriptor?.bar?.strokeWidth}
              />
            );
          })}
    </g>
  );

  function renderSnapBar(item: SnapBar, index: number) {
    const { bar } = item;
    const color =
      (item.leaving ? drawnColors.current.previous.get(item.key) : undefined) ??
      colorByX?.get(bar.valueX) ??
      seriesColorValue;
    const status = statusByX.get(bar.valueX) ?? 'observed';
    const treatment =
      status === 'provisional'
        ? 'hatch'
        : status === 'forecast'
          ? 'dots'
          : (descriptor!.bar?.treatment ?? 'solid');
    const shape = (
      <BarShape
        id={`${clipId}-bar-${descriptors.indexOf(descriptor!)}-snap-${index}`}
        bar={bar}
        appearance={descriptor!.bar?.appearance}
        color={color}
        fill={fillFor(
          color,
          undefined,
          treatment,
          paintId(series, treatment === 'hatch' ? 'hatch' : 'dots'),
        )}
        baseline={snapshot.geometry?.baselineY ?? bar.baseline}
        dataAttributes={{
          'data-lilt-bar': item.leaving ? undefined : bar.valueX,
          'data-lilt-leaving': item.leaving ? '' : undefined,
        }}
        mark={{
          stacked,
          geometry: barGeometry,
          seriesIds,
          seriesId: series,
          radius: descriptor!.bar?.radius,
          roundBothEnds: descriptor!.bar?.roundBothEnds,
          segmentGap: snapshot.barLayout.segmentGap,
          progress: Math.max(0, item.rise),
          originY: stacked ? snapshot.geometry?.baselineY : undefined,
        }}
        fillOpacity={descriptor!.bar?.fillOpacity ?? 1}
        opacity={item.opacity}
        stroke={descriptor!.bar?.stroke}
        strokeWidth={descriptor!.bar?.strokeWidth}
      />
    );
    return item.blur > 0.05 ? (
      <g key={item.key} style={{ filter: `blur(${item.blur.toFixed(2)}px)` }}>
        {shape}
      </g>
    ) : (
      <g key={item.key}>{shape}</g>
    );
  }
}
