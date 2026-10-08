import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from 'react';
import {
  AnimatePresence,
  animate,
  m,
  useMotionValue,
  useMotionValueEvent,
  useTransform,
  type MotionValue,
} from 'motion/react';
import { pointAtX } from '../engine/geometry';
import type { SeriesGeometry } from '../engine/geometry';
import { BoundedText } from '../motion/bounded-text';
import { useGlide } from '../motion/use-glide';
import { useMotionBlur } from '../motion/use-motion-blur';
import { tooltipContext } from './tooltip-context';
import type { ChartSelection, ChartSeries, ChartTooltipContext } from '../types';
import type { ChartSnapshot } from '../chart-context';
import { stackInspectionValue } from '../engine/stack';
import { fillFor, seriesColor } from '../paint';
import { hasYGutter, useAxisCursor, X_LABEL_CENTER } from './axis-cursor';
import { BarShape } from '../primitives/bar-shape';
import { TubePath, tubeWidth } from '../primitives/depth-paint';
import { ISOMETRIC_BAR_RISE } from '../engine/isometric-bars';
import type { PlotMark } from '../marks/contract';
import type { NormalizedRow } from '../engine/normalize';
import { FieldValues } from './field-values';

/**
 * How the crosshair travels between points; the band, pills, and pins travel the same way.
 * Critically damped and quick (most of a column in about 130ms), so the readout lands with the column it reads
 * instead of trailing it.
 */
export const SPRING_TRANSITION = { stiffness: 900, damping: 60, mass: 1 };
/** The tooltip panel carries a touch more weight than the pills, like the `Tooltip` component. */
const PANEL_TRANSITION = { stiffness: 520, damping: 42, mass: 0.6 };
const SIDE_TRANSITION = { stiffness: 520, damping: 42, mass: 0.6 };

interface InspectionLayerProps<T> {
  snapshot: ChartSnapshot<T>;
  selection: ChartSelection<T> | null;
  series: readonly ChartSeries<T>[];
  seriesColors?: Readonly<Record<string, string>>;
  paintId?: (seriesId: string, treatment: 'fade' | 'hatch' | 'dots') => string;
  renderContent?: (context: ChartTooltipContext) => ReactNode;
  inspectionSeries?: string;
  /** Stacked pills: the stack `total`, the active series' own value, or its stacked edge. */
  stackedPill?: 'total' | 'series' | 'stack';
  pinIcon?: ReactNode;
  tooltipClassName?: string;
  tooltipAriaLabel?: string;
  width: number;
  height: number;
  reducedMotion: boolean;
  highlightMaskId: string;
  crossGradientId: string;
  compactPlot?: boolean;
  inlineOnly?: boolean;
  hideAxisBadges?: boolean;
  /**
   * A panel (tooltip or strip) reads the values out away from the point, so the crosshair turns
   * dotted and the point becomes a ring that marks the spot instead of sitting on it.
   */
  panel?: boolean;
  peer?: boolean;
  onCompareFromHere?: () => void;
  /** Range marks in the plot; column marks draw their own highlight instead of a point. */
  marks?: readonly PlotMark[];
}

const PILL_HEIGHT = 24;
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function InspectionPoint<T>({
  descriptor,
  color: resolvedColor,
  geometry,
  cursorX,
  bottom,
  halo,
  ring = false,
}: {
  descriptor: ChartSeries<T>;
  color?: string;
  geometry: SeriesGeometry;
  cursorX: MotionValue<number>;
  bottom: number;
  halo: boolean;
  ring?: boolean;
}): ReactElement {
  const point = useTransform(cursorX, (x) => pointAtX(geometry, x));
  const y = useTransform(point, (value) => value?.y ?? bottom);
  const opacity = useTransform(point, (value) => (value ? 1 : 0));
  const color = resolvedColor ?? descriptor.color ?? 'var(--lilt-series-1)';
  const radius = descriptor.line?.pointRadius ?? 3.5;

  if (ring && radius > 0)
    return (
      <m.circle
        className="lilt-chart__inspection-dot"
        data-ring=""
        data-series={descriptor.id}
        cx={cursorX}
        cy={y}
        fill="var(--lilt-point-ring, var(--lilt-surface))"
        initial={false}
        opacity={opacity}
        r={radius + 1}
        stroke={color}
        strokeWidth={2}
        style={{ fill: 'var(--lilt-point-ring, var(--lilt-surface))', stroke: color }}
      />
    );
  return (
    <>
      {halo && radius > 0 ? (
        <m.circle
          className="lilt-chart__inspection-halo"
          cx={cursorX}
          cy={y}
          initial={false}
          opacity={opacity}
          r={Math.max(7, radius + 3.5)}
          style={{ fill: color }}
        />
      ) : null}
      <m.circle
        className="lilt-chart__inspection-dot"
        data-series={descriptor.id}
        cx={cursorX}
        cy={y}
        fill={color}
        initial={false}
        opacity={opacity}
        r={radius}
        stroke={descriptor.line?.pointStroke ?? 'var(--lilt-point-ring, var(--lilt-surface))'}
        strokeWidth={descriptor.line?.pointStrokeWidth ?? 2}
        style={{
          fill: color,
          stroke: descriptor.line?.pointStroke ?? 'var(--lilt-point-ring, var(--lilt-surface))',
        }}
      />
    </>
  );
}

export function InspectionLayer<T>({
  snapshot,
  selection,
  series,
  seriesColors = {},
  paintId,
  renderContent,
  inspectionSeries,
  stackedPill = 'series',
  pinIcon,
  tooltipClassName,
  tooltipAriaLabel,
  width,
  height,
  reducedMotion,
  highlightMaskId,
  crossGradientId,
  compactPlot = false,
  inlineOnly = false,
  hideAxisBadges = false,
  panel = false,
  peer = false,
  onCompareFromHere,
  marks = [],
}: InspectionLayerProps<T>): ReactElement {
  // Visible stacked layers, bottom to top; marks drawn over a stack are read on their own.
  const layers = useMemo(
    () => series.filter((descriptor) => snapshot.stack?.series.includes(descriptor.id)),
    [series, snapshot.stack],
  );
  const isStacked = layers.length > 0;
  const primary = useMemo(
    () =>
      isStacked && (stackedPill === 'total' || !inspectionSeries)
        ? layers.at(-1)
        : (series.find((descriptor) => descriptor.id === inspectionSeries) ??
          (isStacked ? layers.at(-1) : series[0])),
    [inspectionSeries, series, layers, isStacked, stackedPill],
  );
  const primaryGeometry = primary ? snapshot.geometry?.series[primary.id] : undefined;
  const isBars = snapshot.bars !== null;
  const barRise = series.some((item) => item.bar?.appearance === 'isometric')
    ? ISOMETRIC_BAR_RISE
    : 0;
  const groupedBars = isBars && !snapshot.stack;
  const rowBySource = useMemo(
    () => new Map(snapshot.data.rows.map((row) => [row.sourceIndex, row])),
    [snapshot.data.rows],
  );
  const selectedBySource = selection ? rowBySource.get(selection.sourceIndex) : undefined;
  const acceptedRow = selectedBySource?.x === selection?.x ? selectedBySource : null;
  const selectedStatuses = acceptedRow?.statuses;
  const selectedFields = acceptedRow?.fields;
  const panelGap = isBars ? 32 : 16;
  const colorOf = (descriptor: ChartSeries<T>) =>
    seriesColors[descriptor.id] ?? seriesColor(descriptor, series.indexOf(descriptor));
  const barColor = (descriptor: ChartSeries<T>) =>
    (acceptedRow ? descriptor.colorAt?.(acceptedRow.datum) : undefined) ?? colorOf(descriptor);
  const selectedBars =
    isBars && selection
      ? series.flatMap((descriptor) => {
          const bar = snapshot.geometry?.bars[descriptor.id]?.find(
            (item) => item.valueX === selection.x,
          );
          return bar ? [{ descriptor, bar }] : [];
        })
      : [];
  const seriesIds = series.map((item) => item.id);
  const columnSeries = snapshot.columns;
  const lineSeries = (
    isBars
      ? series.filter((descriptor) => snapshot.geometry?.bars[descriptor.id] === undefined)
      : series
  ).filter((descriptor) => !columnSeries.includes(descriptor.id));
  const markHighlights = acceptedRow
    ? marks.flatMap((mark, index) => {
        const descriptor = series.find((item) => item.id === mark.series);
        if (!mark.highlight || !descriptor) return [];
        const color = colorOf(descriptor);
        const node = mark.highlight({
          row: acceptedRow as NormalizedRow<unknown>,
          snapshot: snapshot as ChartSnapshot<unknown>,
          descriptor: descriptor as ChartSeries<unknown>,
          color,
        });
        return node ? [<g key={`${mark.series}-${index}`}>{node}</g>] : [];
      })
    : [];
  // The band behind the inspected column takes the color of what it holds: the series being
  // read when several share the column, so a red candle or bar is lit red and a green one green.
  const columnColors = acceptedRow
    ? [
        ...selectedBars.map(({ descriptor }) => ({
          id: descriptor.id,
          color: barColor(descriptor),
        })),
        ...marks.flatMap((mark) => {
          const descriptor = series.find((item) => item.id === mark.series);
          if (mark.layout !== 'column' || !descriptor) return [];
          const input = {
            row: acceptedRow as NormalizedRow<unknown>,
            snapshot: snapshot as ChartSnapshot<unknown>,
            descriptor: descriptor as ChartSeries<unknown>,
          };
          return [{ id: descriptor.id, color: mark.color?.(input) ?? barColor(descriptor) }];
        }),
      ]
    : [];
  const columnColor =
    (columnColors.find((item) => item.id === primary?.id) ?? columnColors[0])?.color ?? '';
  const targetX = selection ? snapshot.xToPixel(selection.x) : snapshot.plot.left;
  // Each glide lands exactly on its target, so the crosshair can never rest away from the
  // point it reads, however a gesture was interrupted.
  const [cursorX, glideCursor, cursorSpeed] = useGlide(targetX, SPRING_TRANSITION);
  const [bandX, glideBand] = useGlide(targetX, SPRING_TRANSITION);
  const [panelX, glidePanel, panelSpeed] = useGlide(targetX, PANEL_TRANSITION);
  const [sideX, glideSide, sideSpeed] = useGlide(16, SIDE_TRANSITION);
  // What travels smears a little with its speed and lands sharp.
  const cursorBlur = useMotionBlur(cursorSpeed, reducedMotion);
  const lineBlur = useMotionBlur(cursorSpeed, reducedMotion, 1.5);
  const panelTravel = useTransform(
    [panelSpeed, sideSpeed],
    ([panel, side]) => Number(panel) + Number(side),
  );
  const panelBlur = useMotionBlur(panelTravel, reducedMotion, 2);
  const sideGoal = useRef(16);
  const activeRef = useRef(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltipWidth, setTooltipWidth] = useState(renderContent ? 236 : 188);

  useLayoutEffect(() => {
    const tooltip = tooltipRef.current;
    if (!tooltip) return;
    const measure = () => {
      const bounds = tooltip.getBoundingClientRect();
      const width = Math.ceil(bounds.width);
      if (width > 0) setTooltipWidth((current) => (width !== current ? width : current));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(tooltip);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const isFirstEntry = Boolean(selection) && !activeRef.current;
    if (selection) {
      const nextX = snapshot.xToPixel(selection.x);
      const canRight = nextX + panelGap + tooltipWidth <= width - 8;
      const currentSide = sideGoal.current;
      const nextSide =
        currentSide < 0
          ? nextX + panelGap + tooltipWidth <= width - 20
            ? panelGap
            : -(tooltipWidth + panelGap)
          : canRight
            ? panelGap
            : -(tooltipWidth + panelGap);
      const instant = isFirstEntry || reducedMotion;
      glideCursor(nextX, instant);
      glideBand(nextX, instant);
      glidePanel(nextX, instant);
      glideSide(nextSide, instant);
      sideGoal.current = nextSide;
      activeRef.current = true;
    } else {
      activeRef.current = false;
    }
  }, [
    glideBand,
    glideCursor,
    glidePanel,
    glideSide,
    panelGap,
    reducedMotion,
    selection,
    snapshot,
    tooltipWidth,
    width,
  ]);

  const cursorY = useTransform(cursorX, (value) => {
    if (isBars && selection && primary) {
      const bar = snapshot.geometry?.bars[primary.id]?.find((item) => item.valueX === selection.x);
      if (bar) return bar.negative ? bar.y + bar.height : bar.y;
    }
    const point = primaryGeometry ? pointAtX(primaryGeometry, value) : null;
    return point?.y ?? snapshot.plot.bottom;
  });
  const cursorVisible = useTransform(cursorX, (value) =>
    primaryGeometry && pointAtX(primaryGeometry, value) ? 1 : 0,
  );
  // Pills size to their text; the axes read the shared position to fade labels as a pill nears.
  const axisCursor = useAxisCursor();
  const inlineY = !hasYGutter(axisCursor.axis.y);
  const xPillRef = useRef<HTMLDivElement>(null);
  const yPillRef = useRef<HTMLDivElement>(null);
  const xPillWidth = useMotionValue(48);
  const badgeLeft = useTransform([cursorX, xPillWidth], ([value, pillWidth]) =>
    clamp(
      Number(value) - Number(pillWidth) / 2,
      snapshot.plot.left + (axisCursor.inset > 0 ? 4 : -axisCursor.overhang),
      snapshot.plot.right - (axisCursor.inset > 0 ? 4 : -axisCursor.overhang) - Number(pillWidth),
    ),
  );
  const badgeCenterX = useTransform(
    [badgeLeft, xPillWidth],
    ([left, pillWidth]) => Number(left) + Number(pillWidth) / 2,
  );
  const guideY = useTransform(cursorY, (value) =>
    clamp(value, snapshot.plot.top, snapshot.plot.bottom),
  );
  // Classic pills center on the guide line; inline pills sit on it like the inline labels do.
  const badgeY = useTransform(guideY, (value) =>
    inlineY
      ? value - PILL_HEIGHT - 3
      : clamp(value, snapshot.plot.top + PILL_HEIGHT / 2, snapshot.plot.bottom) - PILL_HEIGHT / 2,
  );
  // Mark mode: the value pill floats centered above the hovered bar or point instead of
  // sitting on the y axis. It follows the crosshair spring plus a sprung offset to the bar.
  const markMode = axisCursor.pillPosition === 'mark';
  const selectedBar =
    isBars && selection && primary
      ? snapshot.geometry?.bars[primary.id]?.find((item) => item.valueX === selection.x)
      : undefined;
  const [barOffset, glideBarOffset] = useGlide(0, SPRING_TRANSITION);
  const barOffsetValue =
    selectedBar && selection
      ? selectedBar.x + selectedBar.width / 2 - snapshot.xToPixel(selection.x)
      : 0;
  useLayoutEffect(() => {
    glideBarOffset(barOffsetValue, !activeRef.current || reducedMotion);
  }, [barOffsetValue, glideBarOffset, reducedMotion]);
  const yPillWidth = useMotionValue(48);
  const markLeft = useTransform([cursorX, barOffset, yPillWidth], ([x, offset, pillWidth]) =>
    clamp(
      Number(x) + Number(offset) - Number(pillWidth) / 2,
      snapshot.plot.left + 4,
      snapshot.plot.right - 4 - Number(pillWidth),
    ),
  );
  const markGap = selectedBar ? 8 : 14;
  const markBelow = Boolean(selectedBar?.negative);
  // Over grouped bars, clear the tallest bar in the slot so the pill never covers a neighbour.
  const risingBars = selectedBars.filter((item) => !item.bar.negative);
  // A bar's pill clears every mark in its slot, including points of lines drawn over the bars.
  // Reading a line itself, the pill sits on that line's point instead.
  const slotLineTops =
    groupedBars && selectedBar && selection
      ? lineSeries.flatMap((descriptor) => {
          const geometry = snapshot.geometry?.series[descriptor.id];
          const point = geometry ? pointAtX(geometry, snapshot.xToPixel(selection.x)) : null;
          return point ? [point.y - 6] : [];
        })
      : [];
  const groupTop =
    groupedBars && selectedBar && risingBars.length
      ? Math.min(...risingBars.map((item) => item.bar.y), ...slotLineTops)
      : null;
  const markTop = useTransform(cursorY, (point) => {
    const value = groupTop !== null && !markBelow ? groupTop : point;
    const above = value - PILL_HEIGHT - markGap;
    // Hang below the mark when there is no room above it, or when the bar points down.
    return markBelow || above < -4 ? value + markGap : above;
  });
  const sharesCursor = !compactPlot && !peer && !hideAxisBadges;
  useMotionValueEvent(badgeCenterX, 'change', (value) => axisCursor.x.set(value));
  useMotionValueEvent(cursorX, 'change', (value) => axisCursor.pointerX.set(value));
  useMotionValueEvent(guideY, 'change', (value) => axisCursor.y.set(value));
  // The column snaps with the bars it holds; only the crosshair and pills glide.
  useLayoutEffect(() => {
    axisCursor.columnX.set(targetX);
    if (columnColor) axisCursor.columnColor.set(columnColor);
  }, [axisCursor, targetX, columnColor]);
  useLayoutEffect(() => {
    axisCursor.x.set(badgeCenterX.get());
    axisCursor.pointerX.set(cursorX.get());
    axisCursor.y.set(guideY.get());
  }, [axisCursor, badgeCenterX, cursorX, guideY]);
  useEffect(() => {
    if (!sharesCursor) return;
    const control = animate(axisCursor.active, 1, { duration: reducedMotion ? 0 : 0.14 });
    return () => {
      control.stop();
      animate(axisCursor.active, 0, { duration: reducedMotion ? 0 : 0.18 });
    };
  }, [axisCursor, reducedMotion, sharesCursor]);
  useEffect(() => {
    if (compactPlot) return;
    const control = animate(axisCursor.inspecting, 1, { duration: reducedMotion ? 0 : 0.14 });
    return () => {
      control.stop();
      animate(axisCursor.inspecting, 0, { duration: reducedMotion ? 0 : 0.18 });
    };
  }, [axisCursor, reducedMotion, compactPlot]);
  const panelLeft = useTransform([panelX, sideX], ([value, offset]) =>
    clamp(Number(value) + Number(offset), 8, Math.max(8, width - tooltipWidth - 8)),
  );
  const panelTop = selection?.pinned
    ? Math.min(80, Math.max(8, height - 72))
    : Math.max(-48, snapshot.plot.top - 64);
  const highlightLeft = useTransform(bandX, (value) =>
    clamp(value - 58, snapshot.plot.left, snapshot.plot.right - 116),
  );
  const activeOpacity = selection ? 1 : 0;
  const tooltipTitle = selection ? snapshot.formatX(selection.x) : '';
  const primaryColor = primary
    ? (seriesColors[primary.id] ?? seriesColor(primary, series.indexOf(primary)))
    : 'var(--lilt-series-1)';
  useLayoutEffect(() => {
    const measured = xPillRef.current?.offsetWidth;
    if (measured) xPillWidth.set(measured);
  }, [tooltipTitle, xPillWidth]);
  useLayoutEffect(() => {
    const measured = yPillRef.current?.offsetWidth;
    if (measured) yPillWidth.set(measured);
  });
  const contributions = acceptedRow
    ? layers.map((descriptor) => acceptedRow.values[descriptor.id] ?? null)
    : [];
  const total =
    contributions.length && contributions.every((value) => value !== null)
      ? contributions.reduce<number>((sum, value) => sum + (value ?? 0), 0)
      : null;
  const primaryIndex = primary ? layers.indexOf(primary) : -1;
  const ownValue = acceptedRow && primary ? (acceptedRow.values[primary.id] ?? null) : null;
  // Stacks can report the whole stack, the active series alone, or the height of its edge.
  const stackMode = snapshot.stack?.mode ?? 'sum';
  const stackedMode =
    primaryIndex === -1
      ? null
      : stackedPill === 'total'
        ? 'total'
        : stackedPill === 'stack'
          ? 'stack'
          : 'series';
  const edgeValue = (() => {
    if (stackedMode !== 'stack') return null;
    const below = contributions.slice(0, primaryIndex + 1);
    if (below.some((value) => value === null)) return null;
    // Positives stack above zero and negatives below, so an edge sums its own side.
    const negative = (below.at(-1) ?? 0) < 0;
    const height = below.reduce<number>(
      (sum, value) => sum + (negative ? Math.min(0, value ?? 0) : Math.max(0, value ?? 0)),
      0,
    );
    if (stackMode !== 'percent') return height;
    const all = contributions.reduce<number>((sum, value) => sum + (value ?? 0), 0);
    return all === 0 ? null : (height / all) * 100;
  })();
  const primaryValue =
    stackedMode === 'total'
      ? stackInspectionValue(contributions, stackMode)
      : stackedMode === 'stack'
        ? edgeValue
        : ownValue;
  const pillUsesAxisFormat = stackedMode === 'total' || stackedMode === 'stack';
  const showSeriesDot = series.length > 1 && stackedPill !== 'total';
  const panelStyle = {
    '--lilt-panel-width': `${Math.min(renderContent ? 236 : 188, Math.max(160, width - 16))}px`,
  } as CSSProperties;

  return (
    <div className="lilt-chart__inspection" aria-hidden={selection ? undefined : true}>
      <svg
        aria-hidden="true"
        className="lilt-chart__inspection-svg"
        height={height}
        viewBox={`0 0 ${Math.max(1, width)} ${Math.max(1, height)}`}
        width={width}
      >
        <defs>
          <clipPath id={`${highlightMaskId}-plot`}>
            <rect
              x={snapshot.plot.left}
              y={snapshot.plot.top - barRise}
              width={snapshot.plot.width}
              height={snapshot.plot.height + barRise}
            />
          </clipPath>
          <linearGradient
            id={crossGradientId}
            gradientUnits="userSpaceOnUse"
            x1="0"
            x2="0"
            y1={snapshot.plot.top}
            y2={snapshot.plot.bottom + 8}
          >
            <stop
              offset="0"
              stopColor="var(--lilt-muted)"
              stopOpacity="0"
              style={{ stopColor: 'var(--lilt-muted)' }}
            />
            <stop
              offset="0.08"
              stopColor="var(--lilt-muted)"
              stopOpacity="0.42"
              style={{ stopColor: 'var(--lilt-muted)' }}
            />
            <stop
              offset="0.92"
              stopColor="var(--lilt-muted)"
              stopOpacity="0.42"
              style={{ stopColor: 'var(--lilt-muted)' }}
            />
            <stop
              offset="1"
              stopColor="var(--lilt-muted)"
              stopOpacity="0"
              style={{ stopColor: 'var(--lilt-muted)' }}
            />
          </linearGradient>
          <linearGradient id={`${highlightMaskId}-feather`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="white" stopOpacity="0" />
            <stop offset="0.12" stopColor="white" />
            <stop offset="0.88" stopColor="white" />
            <stop offset="1" stopColor="white" stopOpacity="0" />
          </linearGradient>
          <mask id={highlightMaskId} maskUnits="userSpaceOnUse">
            <m.rect
              fill={`url(#${highlightMaskId}-feather)`}
              height={height}
              initial={false}
              width={116}
              x={highlightLeft}
              y={0}
            />
          </mask>
        </defs>
        <m.g
          animate={{ opacity: activeOpacity }}
          className="lilt-chart__inspection-marks"
          initial={{ opacity: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.12 }}
        >
          {isBars ? (
            <g clipPath={`url(#${highlightMaskId}-plot)`}>
              {selectedBars.map(({ descriptor, bar }) => {
                const color = barColor(descriptor);
                const fill = fillFor(
                  color,
                  undefined,
                  selectedStatuses?.[descriptor.id] === 'provisional'
                    ? 'hatch'
                    : selectedStatuses?.[descriptor.id] === 'forecast'
                      ? 'dots'
                      : (descriptor.bar?.treatment ?? 'solid'),
                  paintId?.(
                    descriptor.id,
                    selectedStatuses?.[descriptor.id] === 'provisional' ||
                      descriptor.bar?.treatment === 'hatch'
                      ? 'hatch'
                      : 'dots',
                  ) ?? '',
                );
                return (
                  <BarShape
                    key={descriptor.id}
                    id={`${highlightMaskId}-bar-${series.indexOf(descriptor)}`}
                    bar={bar}
                    appearance={descriptor.bar?.appearance}
                    expanded
                    color={color}
                    fill={fill}
                    baseline={snapshot.geometry?.baselineY ?? bar.baseline}
                    dataAttributes={{ 'data-series': descriptor.id }}
                    mark={{
                      stacked: Boolean(snapshot.stack?.series.includes(descriptor.id)),
                      geometry: snapshot.geometry?.bars ?? {},
                      seriesIds,
                      seriesId: descriptor.id,
                      radius: descriptor.bar?.radius,
                      roundBothEnds: descriptor.bar?.roundBothEnds,
                      segmentGap: snapshot.barLayout.segmentGap,
                    }}
                    fillOpacity={descriptor.bar?.fillOpacity ?? 1}
                    stroke={descriptor.bar?.stroke}
                    strokeWidth={descriptor.bar?.strokeWidth}
                  />
                );
              })}
            </g>
          ) : null}
          {/* Drawing only, so a long line highlights its thinner drawn path (see decimate). */}
          {(snapshot.drawGeometry ?? snapshot.geometry)
            ? lineSeries.flatMap(
                (descriptor) =>
                  (snapshot.drawGeometry ?? snapshot.geometry)!.series[descriptor.id]?.segments.map(
                    (segment, index) =>
                      descriptor.line?.depth && !descriptor.line.dasharray ? (
                        <g
                          className="lilt-chart__highlight"
                          key={`highlight-${descriptor.id}-${index}`}
                          mask={`url(#${highlightMaskId})`}
                        >
                          <TubePath
                            d={segment.path}
                            color={
                              seriesColors[descriptor.id] ??
                              seriesColor(descriptor, series.indexOf(descriptor))
                            }
                            width={tubeWidth(descriptor.line.width)}
                          />
                        </g>
                      ) : (
                        <m.path
                          className="lilt-chart__highlight"
                          d={segment.path}
                          key={`highlight-${descriptor.id}-${index}`}
                          mask={`url(#${highlightMaskId})`}
                          stroke={descriptor.color ?? 'var(--lilt-series-1)'}
                          strokeDasharray={descriptor.line?.dasharray}
                          strokeLinecap={descriptor.line?.cap ?? 'round'}
                          strokeLinejoin={descriptor.line?.join ?? 'round'}
                          strokeWidth={descriptor.line?.width ?? 'var(--lilt-line-width, 2)'}
                          strokeOpacity={descriptor.line?.opacity ?? 'var(--lilt-line-opacity, 1)'}
                          style={{
                            stroke: descriptor.color ?? 'var(--lilt-series-1)',
                            strokeWidth: descriptor.line?.width ?? 'var(--lilt-line-width, 2)',
                            strokeOpacity:
                              descriptor.line?.opacity ?? 'var(--lilt-line-opacity, 1)',
                          }}
                          fill="none"
                          vectorEffect="non-scaling-stroke"
                        />
                      ),
                  ) ?? [],
              )
            : null}
          {markHighlights.length ? (
            <g className="lilt-chart__mark-highlights">{markHighlights}</g>
          ) : null}
          {!isBars || lineSeries.length ? (
            <m.line
              className="lilt-chart__crosshair"
              data-panel={panel || undefined}
              initial={false}
              style={{ filter: lineBlur }}
              stroke={panel ? 'var(--lilt-muted)' : `url(#${crossGradientId})`}
              strokeDasharray={panel ? '1 4' : undefined}
              strokeLinecap={panel ? 'round' : undefined}
              strokeOpacity={panel ? 0.7 : undefined}
              strokeWidth={panel ? 1.25 : 1}
              vectorEffect="non-scaling-stroke"
              x1={cursorX}
              x2={cursorX}
              y1={snapshot.plot.top}
              y2={
                snapshot.plot.bottom +
                (axisCursor.axis.x === 'ruler'
                  ? 4
                  : axisCursor.axis.x === 'dots'
                    ? 4.5
                    : axisCursor.axis.x === 'segmented'
                      ? 3.5
                      : 8)
              }
            />
          ) : null}
          {!isBars && !compactPlot && !markMode && !hideAxisBadges ? (
            <m.line
              className="lilt-chart__y-guide"
              opacity={cursorVisible}
              initial={false}
              stroke="var(--lilt-muted)"
              style={{ stroke: 'var(--lilt-muted)' }}
              strokeDasharray="2 4"
              strokeOpacity={0.22}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
              x1={snapshot.plot.left - 2}
              x2={cursorX}
              y1={cursorY}
              y2={cursorY}
            />
          ) : null}
          {lineSeries.map((descriptor) => {
            const geometry = snapshot.geometry?.series[descriptor.id];
            return geometry && descriptor.line?.showInspectionPoint !== false ? (
              <InspectionPoint
                key={descriptor.id}
                descriptor={descriptor}
                color={seriesColors[descriptor.id]}
                geometry={geometry}
                cursorX={cursorX}
                bottom={snapshot.plot.bottom}
                halo={!isBars && !panel && descriptor.id === primary?.id}
                ring={panel}
              />
            ) : null;
          })}
        </m.g>
      </svg>

      {!compactPlot && !peer && !hideAxisBadges ? (
        <m.div
          animate={{ opacity: activeOpacity }}
          className="lilt-chart__x-badge"
          initial={false}
          ref={xPillRef}
          style={
            {
              left: badgeLeft,
              top: snapshot.plot.bottom + X_LABEL_CENTER - PILL_HEIGHT / 2,
              filter: cursorBlur,
              '--lilt-pill-accent': primaryColor,
            } as unknown as CSSProperties
          }
          transition={{ duration: reducedMotion ? 0 : 0.12 }}
        >
          <BoundedText duration={selection?.pinned ? 150 : 0} offset={5} value={tooltipTitle} />
        </m.div>
      ) : null}
      {!compactPlot && !peer && !hideAxisBadges ? (
        <m.div
          animate={{ opacity: activeOpacity && primaryValue !== null ? 1 : 0 }}
          className="lilt-chart__y-badge"
          initial={false}
          ref={yPillRef}
          data-position={markMode ? 'mark' : 'axis'}
          style={
            {
              ...(markMode
                ? { left: markLeft, top: markTop }
                : inlineY
                  ? { left: snapshot.plot.left + axisCursor.inset, top: badgeY }
                  : { right: Math.max(0, width - snapshot.plot.left + 4), top: badgeY }),
              filter: cursorBlur,
              '--lilt-pill-accent': primaryColor,
            } as unknown as CSSProperties
          }
          transition={{ duration: reducedMotion ? 0 : 0.12 }}
        >
          {showSeriesDot ? (
            <span
              aria-hidden="true"
              className="lilt-chart__pill-dot"
              style={{ background: primaryColor }}
            />
          ) : null}
          <BoundedText
            duration={selection?.pinned ? 140 : 0}
            offset={3}
            value={
              primaryValue === null
                ? 'No data'
                : pillUsesAxisFormat
                  ? snapshot.formatY(primaryValue)
                  : (primary?.formatValue?.(primaryValue) ?? snapshot.formatY(primaryValue))
            }
          />
        </m.div>
      ) : null}
      {compactPlot ? (
        <m.div
          className="lilt-sparkline__readout"
          animate={{ opacity: activeOpacity }}
          initial={false}
          transition={{ duration: reducedMotion ? 0 : 0.12 }}
        >
          <span>
            <BoundedText duration={selection?.pinned ? 140 : 0} offset={3} value={tooltipTitle} />
          </span>
          <strong>
            <BoundedText
              duration={selection?.pinned ? 140 : 0}
              offset={3}
              value={
                primaryValue === null
                  ? 'No data'
                  : (primary?.formatValue?.(primaryValue) ?? snapshot.formatY(primaryValue))
              }
            />
          </strong>
        </m.div>
      ) : inlineOnly ? null : (
        <m.div
          aria-label={selection ? (tooltipAriaLabel ?? `Values for ${tooltipTitle}`) : undefined}
          className={['lilt-chart__tooltip', tooltipClassName].filter(Boolean).join(' ')}
          data-pinned={selection?.pinned || undefined}
          inert={!selection?.pinned}
          initial={false}
          ref={tooltipRef}
          style={{ ...panelStyle, left: panelLeft, top: panelTop, opacity: 0 }}
          animate={{ opacity: activeOpacity }}
          transition={{ duration: reducedMotion ? 0 : 0.15 }}
        >
          {/* The blur sits on the panel itself so its frosted backdrop keeps working. */}
          <m.div
            className="lilt-chart__tooltip-panel"
            style={
              selection?.pinned
                ? {
                    maxHeight: Math.max(48, height - panelTop - 8),
                    overflowY: 'auto',
                    filter: panelBlur,
                  }
                : { filter: panelBlur }
            }
          >
            <div className="lilt-chart__tooltip-title">
              <BoundedText duration={selection?.pinned ? 160 : 0} offset={4} value={tooltipTitle} />
              <AnimatePresence initial={false}>
                {selection?.pinned ? (
                  <m.span
                    className="lilt-chart__tooltip-pin-status"
                    initial={reducedMotion ? false : { opacity: 0, y: 3 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -3 }}
                    transition={{
                      duration: reducedMotion ? 0 : 0.15,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    role="status"
                  >
                    <span aria-hidden="true" className="lilt-chart__tooltip-pin-icon">
                      {pinIcon ?? (
                        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <path
                            d="M9 3h6l-1 5 3 3v2H7v-2l3-3-1-5ZM12 13v8"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="1.6"
                          />
                        </svg>
                      )}
                    </span>
                    <span aria-hidden="true">Pinned</span>
                    <span className="lilt-chart__sr-only">
                      Observation pinned. Press Escape or click the selected point to release.
                    </span>
                  </m.span>
                ) : null}
              </AnimatePresence>
            </div>
            {acceptedRow
              ? series.map((descriptor) => {
                  const value = acceptedRow.values[descriptor.id] ?? null;
                  const label =
                    value === null
                      ? 'No data'
                      : (descriptor.formatValue?.(value) ?? snapshot.formatValue(value));
                  return (
                    <div className="lilt-chart__tooltip-row" key={descriptor.id}>
                      <span
                        aria-hidden="true"
                        className="lilt-chart__tooltip-swatch"
                        style={{
                          backgroundColor:
                            seriesColors[descriptor.id] ??
                            seriesColor(descriptor, series.indexOf(descriptor)),
                        }}
                      />
                      <span className="lilt-chart__tooltip-label">{descriptor.label}</span>
                      {selectedStatuses?.[descriptor.id] !== 'observed' &&
                      selectedStatuses?.[descriptor.id] ? (
                        <span className="lilt-chart__tooltip-status">
                          {selectedStatuses[descriptor.id]}
                        </span>
                      ) : null}
                      <strong>
                        <BoundedText
                          duration={selection?.pinned ? 160 : 0}
                          offset={4}
                          value={label}
                        />
                      </strong>
                      {selectedFields?.[descriptor.id] && descriptor.fields ? (
                        <FieldValues
                          descriptor={descriptor}
                          values={selectedFields[descriptor.id]}
                          format={snapshot.formatValue}
                        />
                      ) : null}
                    </div>
                  );
                })
              : null}
            {acceptedRow && selection && renderContent ? (
              <div className="lilt-chart__tooltip-custom">
                {renderContent(tooltipContext(snapshot, acceptedRow, series, selection.pinned))}
              </div>
            ) : null}
            {isStacked && acceptedRow ? (
              <div className="lilt-chart__tooltip-total">
                <span>Total</span>
                <strong>
                  <BoundedText
                    duration={selection?.pinned ? 160 : 0}
                    offset={4}
                    value={total === null ? 'Incomplete' : snapshot.formatValue(total)}
                  />
                </strong>
              </div>
            ) : null}
            {selection?.pinned && onCompareFromHere ? (
              <button
                className="lilt-chart__compare-from-pin"
                onClick={onCompareFromHere}
                type="button"
              >
                Compare from here
              </button>
            ) : null}
          </m.div>
        </m.div>
      )}
    </div>
  );
}
