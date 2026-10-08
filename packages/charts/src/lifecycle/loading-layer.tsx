import { curveMonotoneX, line as d3Line } from 'd3-shape';
import { useLayoutEffect, useRef, type CSSProperties, type ReactElement } from 'react';
import { barPath, barSpacing, type BarGeometry } from '../engine/bars';
import { ISOMETRIC_BAR_RISE, isometricBarGeometry } from '../engine/isometric-bars';
import { IsometricBar } from '../primitives/isometric-bar';
import { DropShadow, TubePath, tubeWidth } from '../primitives/depth-paint';
import type { ChartAxisStyle, ChartBarAppearance, ChartLoadingStyle } from '../types';
import { skeletonClock } from './use-skeleton-clock';
import type { LoadingMark } from '../marks/contract';
export { skeletonClock, SKELETON_CYCLE } from './use-skeleton-clock';

export interface LoadingLayerProps {
  width: number;
  height: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
  visible: boolean;
  opacity: number;
  reducedMotion: boolean;
  id: string;
  /** The marks the skeleton stands in for. */
  marks?: 'line' | 'bars' | 'area-stack' | 'bar-stack' | 'columns';
  mark?: LoadingMark;
  compact?: boolean;
  barCount?: number;
  seriesCount?: number;
  barAppearances?: readonly ChartBarAppearance[];
  barWidth?: number;
  showLine?: boolean;
  lineDepth?: boolean;
  /** Mirror the real axis: which placeholders and grid rows to draw. Defaults to `classic`. */
  axis?: ChartAxisStyle;
  /** Padding between the plot edges and label placeholders, as on the real axis. */
  inset?: number;
  /** Gap between the plot edges and the skeleton shape; 0 when marks run edge to edge. */
  edge?: number;
  /**
   * How the skeleton moves: `shimmer` (default) sweeps a highlight over still shapes, `draw`
   * reveals bars or contours in order, and `breathe` lets them rise and settle.
   */
  loadingStyle?: ChartLoadingStyle;
}

/**
 * The pen's dash. Drawing runs a little past both ends of the line, so the head enters and
 * leaves with momentum; a 1.2 dash and 1.4 gap keep the line whole when the run overshoots
 * the end, and hidden while it is still off the start. See `lilt-skeleton-pen` in loading.css.
 */
const PEN_DASH = '1.2 1.4';

export const SKELETON_CONTOUR = [
  0.38, 0.45, 0.42, 0.56, 0.5, 0.63, 0.58, 0.72, 0.65, 0.77, 0.72, 0.81,
];

function contourPath(left: number, top: number, width: number, height: number): string {
  const points = SKELETON_CONTOUR.map((value, index) => ({
    x: left + (index / (SKELETON_CONTOUR.length - 1)) * width,
    y: top + height * (1 - value),
  }));
  return (
    d3Line<{ x: number; y: number }>()
      .x((point) => point.x)
      .y((point) => point.y)
      .curve(curveMonotoneX)(points) ?? ''
  );
}

export interface SkeletonGeometry {
  plotWidth: number;
  plotBottom: number;
  contour: string;
  areaPath: string;
  gridRows: string;
  yBars: string;
  xBars: string;
}

export function buildSkeletonGeometry({
  width,
  height,
  left,
  right,
  top,
  bottom,
  axis = 'classic',
  inset = 0,
  edge = 8,
}: Pick<
  LoadingLayerProps,
  'width' | 'height' | 'left' | 'right' | 'top' | 'bottom' | 'axis' | 'inset' | 'edge'
>): SkeletonGeometry {
  const plotWidth = Math.max(0, width - left - right);
  const plotRight = left + plotWidth;
  const plotBottom = Math.max(top, height - bottom);
  const contourHeight = Math.max(0, plotBottom - top - Math.min(18, (plotBottom - top) * 0.15));
  const contour = contourPath(
    left + edge,
    top + 4,
    Math.max(0, plotWidth - edge * 2),
    contourHeight,
  );
  const areaPath = `${contour} L${plotRight - edge},${plotBottom} L${left + edge},${plotBottom} Z`;
  const rows = [0, 0.25, 0.5, 0.75, 1];
  const rowY = (value: number) => top + value * (plotBottom - top);
  const yBarWidths = [29, 23, 32, 25, 18];
  // Dots label the y axis in its gutter but, like minimal, only the x ends.
  const quiet = axis === 'minimal' || axis === 'dots';
  const quietY = axis === 'minimal';
  const inline = axis === 'inline' || axis === 'ruler';
  // Minimal keeps only the baseline; dots draws none; the others draw every row.
  const gridValues = axis === 'dots' ? [] : axis === 'minimal' ? [1] : rows;
  const gridRows = gridValues
    .map(rowY)
    .map((y) => `<line x1="${left}" x2="${plotRight}" y1="${y}" y2="${y}" />`)
    .join('');
  const yBars = quietY
    ? ''
    : rows
        .map((value, index) => {
          const widthValue = yBarWidths[index];
          if (inline)
            return value === 1
              ? ''
              : `<rect x="${left + inset}" y="${rowY(value) - 14}" width="${widthValue}" height="8" rx="4" />`;
          if (left <= 40) return '';
          return `<rect x="${Math.max(2, left - widthValue - 12)}" y="${rowY(value) - 4}" width="${widthValue}" height="8" rx="4" />`;
        })
        .join('');
  // Label placeholders sit where the real labels do and never leave the plot box.
  const place = (center: number, barWidth: number) =>
    Math.min(Math.max(center - barWidth / 2, left + 4), plotRight - 4 - barWidth);
  const span = Math.max(0, plotWidth - inset * 2);
  const xBarWidths = quiet ? [30, 30] : [38, 30, 38, 30];
  const xBars = xBarWidths
    .map((barWidth, index) => {
      const center = left + inset + (span * index) / Math.max(1, xBarWidths.length - 1);
      return `<rect x="${place(center, barWidth)}" y="${plotBottom + 20}" width="${barWidth}" height="8" rx="4" />`;
    })
    .join('');
  return { plotWidth, plotBottom, contour, areaPath, gridRows, yBars, xBars };
}

export function LoadingLayer({
  width,
  height,
  left,
  right,
  top,
  bottom,
  visible,
  opacity,
  reducedMotion,
  id,
  marks = 'line',
  mark,
  compact = false,
  barCount = 12,
  seriesCount = 1,
  barAppearances = [],
  barWidth,
  showLine = false,
  lineDepth = false,
  axis = 'classic',
  inset: labelInset = 0,
  edge = 8,
  loadingStyle = 'shimmer',
}: LoadingLayerProps): ReactElement | null {
  const rootRef = useRef<HTMLDivElement>(null);
  // Set after mount: the wall clock differs between server and browser.
  useLayoutEffect(() => {
    rootRef.current?.style.setProperty('--lilt-skeleton-clock', skeletonClock(Date.now()));
  }, [visible, loadingStyle]);
  if (!visible || width <= 0 || height <= 0) return null;
  const { plotWidth, plotBottom, contour, areaPath, gridRows, yBars, xBars } =
    buildSkeletonGeometry({
      width,
      height,
      left,
      right,
      top,
      bottom,
      axis,
      inset: labelInset,
      edge,
    });
  const maskId = `${id}-mask`;
  const sheenId = `${id}-sheen`;
  const lineShadowId = `${id}-line-shadow`;
  const barsClipId = `${id}-bars-clip`;
  const contourClipId = `${id}-contour-clip`;
  const headFadeId = `${id}-head-fade`;
  const sheenWidth = Math.max(120, Math.min(300, width * 0.3));
  const style = {
    '--lilt-skeleton-opacity': opacity,
    '--lilt-sheen-start': `${-sheenWidth * 0.65}px`,
    '--lilt-sheen-end': `${width}px`,
    '--lilt-skeleton-contour-rise': `${Math.min(16, Math.max(0, plotBottom - top) * 0.1)}px`,
  } as CSSProperties;
  const count = Math.max(1, Math.min(200, barCount));
  const { inset, groupWidth } = barSpacing(
    Array.from({ length: count }, (_, index) => index),
    count - 1,
    plotWidth,
  );
  const slot = groupWidth / Math.max(1, seriesCount);
  const widthPerBar = slot * (seriesCount > 1 ? 0.84 : 1);
  const barParts = Array.from({ length: count }, (_, index) =>
    Array.from({ length: seriesCount }, (_, group) => {
      const barWidthValue =
        barAppearances[group] === 'isometric' && barWidth !== undefined
          ? Math.max(0, Math.min(widthPerBar, barWidth))
          : widthPerBar;
      const barHeight =
        (plotBottom - top) *
        SKELETON_CONTOUR[(index + group * 3) % SKELETON_CONTOUR.length] *
        (group ? 0.76 : 1);
      return {
        valueX: index,
        x:
          left +
          inset +
          (count === 1 ? 0 : (index / (count - 1)) * (plotWidth - 2 * inset)) -
          groupWidth / 2 +
          group * slot +
          (slot - barWidthValue) / 2,
        y: plotBottom - barHeight,
        width: barWidthValue,
        height: barHeight,
        baseline: plotBottom,
        negative: false,
      } satisfies BarGeometry;
    }),
  );
  const seriesIds = Array.from({ length: seriesCount }, (_, index) => String(index));
  const barGeometry = Object.fromEntries(
    seriesIds.map((seriesId, series) => [seriesId, barParts.map((group) => group[series]!)]),
  );
  const barMark = (series: number) => ({
    stacked: false,
    geometry: barGeometry,
    seriesIds,
    seriesId: seriesIds[series]!,
  });
  const barShapes = barParts
    .flatMap((group) =>
      group.map((bar, series) =>
        barAppearances[series] === 'isometric'
          ? (isometricBarGeometry(bar, barMark(series))?.side ?? '')
          : barPath(bar),
      ),
    )
    .join(' ');
  const isBars = marks === 'bars' || marks === 'bar-stack';
  const isColumns = marks === 'columns' && mark !== undefined;
  const columns = Array.from({ length: Math.max(1, Math.min(12, barCount)) }, (_, index) => {
    const total = Math.max(1, Math.min(12, barCount));
    const center = 0.22 + SKELETON_CONTOUR[index % SKELETON_CONTOUR.length] * 0.52;
    return {
      cx: left + ((index + 0.5) / total) * plotWidth,
      low: center - 0.17,
      high: center + 0.17,
      scales: {
        x: (value: number) => value,
        y: (value: number) => plotBottom - value * Math.max(0, plotBottom - top),
        xDomain: [left, left + plotWidth] as const,
        columnWidth: Math.max(1, Math.min(36, (plotWidth / total) * 0.55)),
      },
    };
  });
  // Columns rise from their middles one after another, as candles and ranges are read.
  const columnShapes = (mask: boolean) =>
    columns.map((column, index) => (
      <g
        key={index}
        data-loading-mark={mark?.kind}
        data-skeleton={mask ? undefined : 'rise'}
        style={mask ? undefined : ({ '--lilt-skeleton-step': index } as CSSProperties)}
      >
        {mark?.render({ ...column, mask })}
      </g>
    ));
  const hasDepth = isBars && barAppearances.includes('isometric');
  const barsClipTop = Math.max(0, top - ISOMETRIC_BAR_RISE);
  const moving = loadingStyle !== 'shimmer' && !reducedMotion;
  const swell = (step = 0) =>
    ({ '--lilt-skeleton-step': step, '--lilt-skeleton-floor': `${plotBottom}px` }) as CSSProperties;
  const axes = compact ? '' : `${yBars}${xBars}`;
  const stackContours =
    marks === 'area-stack'
      ? Array.from({ length: Math.max(1, seriesCount) }, (_, index) => {
          const fraction = (index + 1) / seriesCount;
          const plotBottom = height - bottom;
          const layerHeight = Math.max(0, plotBottom - top - 18) * fraction;
          return contourPath(
            left + edge,
            plotBottom - layerHeight,
            Math.max(0, plotWidth - edge * 2),
            layerHeight,
          );
        })
      : [];
  // Several lines get a pen each, up to three, a little lower and flatter one after another.
  const contourTop = top + 4;
  const lineContours =
    marks === 'line'
      ? Array.from({ length: Math.min(3, Math.max(1, seriesCount)) }, (_, index) => {
          if (index === 0) return contour;
          const span = Math.max(0, plotBottom - top);
          const layerHeight = Math.max(0, span - Math.min(18, span * 0.15)) * (1 - 0.22 * index);
          return contourPath(
            left + edge,
            contourTop + span * 0.17 * index,
            Math.max(0, plotWidth - edge * 2),
            layerHeight,
          );
        })
      : [contour];
  const shape =
    marks === 'bars' || marks === 'bar-stack'
      ? barShapes
      : marks === 'area-stack'
        ? `${stackContours.at(-1)} L${left + plotWidth - edge},${height - bottom} L${left + edge},${height - bottom} Z`
        : areaPath;
  // Contours follow one another two steps apart, squeezed so the last starts within four.
  const contourCount = marks === 'area-stack' ? stackContours.length : lineContours.length;
  const contourStep = (index: number) => index * Math.min(2, 4 / Math.max(1, contourCount - 1));
  const lastStep = contourStep(contourCount - 1);
  // A contour is drawn by a pen with a bright head riding its tip (see loading.css); stacked
  // layers follow one another up the stack, and each swells from the floor when breathing.
  const penWidth = lineDepth ? tubeWidth() : 2.5;
  // How much of each plot edge the head fades across as it comes in and goes out.
  const headFade = Math.min(0.2, 72 / Math.max(1, plotWidth));
  const drawing = loadingStyle === 'draw' && !reducedMotion;
  const renderContour = (d: string, index = 0) => (
    <g key={index} style={{ '--lilt-skeleton-step': contourStep(index) } as CSSProperties}>
      {lineDepth ? (
        <g opacity={0.7} filter={`url(#${lineShadowId})`}>
          <TubePath
            d={d}
            color="var(--lilt-skeleton)"
            width={penWidth}
            pathLength={1}
            dasharray={PEN_DASH}
            className="lilt-chart__skeleton-pen"
          />
        </g>
      ) : (
        <path
          className="lilt-chart__skeleton-contour lilt-chart__skeleton-pen"
          d={d}
          pathLength={1}
          strokeDasharray={PEN_DASH}
        />
      )}
      {drawing ? (
        <g mask={`url(#${headFadeId})`}>
          <path
            className="lilt-chart__skeleton-head"
            d={d}
            pathLength={1}
            strokeDasharray="0.16 3"
            strokeWidth={penWidth + 0.5}
            strokeOpacity={0.3}
            data-tail=""
          />
          <path
            className="lilt-chart__skeleton-head"
            d={d}
            pathLength={1}
            strokeDasharray="0.035 3"
            strokeWidth={penWidth + 1}
          />
        </g>
      ) : null}
    </g>
  );
  // The area fills in behind the pen; the pen itself is never clipped, so its head stays whole.
  const area = (
    <path
      className="lilt-chart__skeleton-area"
      d={shape}
      clipPath={drawing ? `url(#${contourClipId})` : undefined}
    />
  );
  const contours =
    marks === 'area-stack'
      ? stackContours.map((path, index) => (
          <g key={index} className="lilt-chart__skeleton-swell" style={swell(contourStep(index))}>
            {renderContour(path, index)}
          </g>
        ))
      : !isBars && !isColumns
        ? lineContours.map((path, index) => renderContour(path, index))
        : showLine
          ? renderContour(contour)
          : null;

  return (
    <div
      ref={rootRef}
      className="lilt-chart__loading"
      data-reduced-motion={reducedMotion || undefined}
      data-style={loadingStyle}
      data-loading-mark={mark?.kind}
      data-depth={mark?.depth || undefined}
      style={style}
      aria-hidden="true"
    >
      <svg
        className="lilt-chart__loading-svg"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
      >
        <defs>
          {!isBars ? (
            <clipPath id={contourClipId}>
              <rect
                className="lilt-chart__skeleton-reveal"
                x={left}
                y={0}
                width={plotWidth}
                height={plotBottom}
              />
            </clipPath>
          ) : null}
          {!isBars && !isColumns && loadingStyle === 'draw' && !reducedMotion ? (
            // The pen's head glides in from under the left edge and out under the right one.
            <>
              <linearGradient
                id={`${headFadeId}-ramp`}
                gradientUnits="userSpaceOnUse"
                x1={left}
                x2={left + plotWidth}
                y1={0}
                y2={0}
              >
                <stop offset={0} stopColor="white" stopOpacity={0} />
                <stop offset={headFade} stopColor="white" stopOpacity={1} />
                <stop offset={1 - headFade} stopColor="white" stopOpacity={1} />
                <stop offset={1} stopColor="white" stopOpacity={0} />
              </linearGradient>
              <mask
                id={headFadeId}
                maskUnits="userSpaceOnUse"
                x={left}
                y={0}
                width={plotWidth}
                height={height}
              >
                <rect
                  x={left}
                  y={0}
                  width={plotWidth}
                  height={height}
                  fill={`url(#${headFadeId}-ramp)`}
                />
              </mask>
            </>
          ) : null}
          {lineDepth ? (
            <DropShadow id={lineShadowId} size={3.5} region={{ x: 0, y: 0, width, height }} />
          ) : null}
          {hasDepth ? (
            <clipPath id={barsClipId}>
              <rect x={left} y={barsClipTop} width={plotWidth} height={plotBottom - barsClipTop} />
            </clipPath>
          ) : null}
          <linearGradient id={sheenId} x1="0" x2="1" y1="0" y2="0">
            <stop
              offset="0"
              stopColor="var(--lilt-skeleton-sheen)"
              stopOpacity="0"
              style={{ stopColor: 'var(--lilt-skeleton-sheen)' }}
            />
            <stop
              offset="0.5"
              stopColor="var(--lilt-skeleton-sheen)"
              stopOpacity="0.75"
              style={{ stopColor: 'var(--lilt-skeleton-sheen)' }}
            />
            <stop
              offset="1"
              stopColor="var(--lilt-skeleton-sheen)"
              stopOpacity="0"
              style={{ stopColor: 'var(--lilt-skeleton-sheen)' }}
            />
          </linearGradient>
          <mask id={maskId} maskUnits="userSpaceOnUse" x={0} y={0} width={width} height={height}>
            <g fill="white">
              {isColumns ? columnShapes(true) : <path d={shape} opacity={isBars ? 0.8 : 0.36} />}
              {marks === 'area-stack'
                ? stackContours.map((path, index) => (
                    <path
                      key={index}
                      d={path}
                      fill="none"
                      stroke="white"
                      strokeWidth={lineDepth ? tubeWidth() : 3}
                      opacity="0.8"
                    />
                  ))
                : (!isBars && !isColumns) || showLine
                  ? (isBars ? [contour] : lineContours).map((path, index) => (
                      <path
                        key={index}
                        d={path}
                        fill="none"
                        stroke="white"
                        strokeWidth={lineDepth ? tubeWidth() : 3}
                        opacity="0.8"
                      />
                    ))
                  : null}
              <g
                stroke="white"
                strokeOpacity={0.35}
                dangerouslySetInnerHTML={{ __html: compact ? '' : gridRows }}
              />
              <g dangerouslySetInnerHTML={{ __html: axes }} />
            </g>
          </mask>
        </defs>
        <g className="lilt-chart__skeleton-grid">
          <g dangerouslySetInnerHTML={{ __html: compact ? '' : gridRows }} />
        </g>
        {isBars ? (
          <g
            className="lilt-chart__skeleton-bars"
            data-depth={hasDepth || undefined}
            clipPath={hasDepth ? `url(#${barsClipId})` : undefined}
          >
            {barParts.map((group, index) =>
              group.map((bar, series) =>
                barAppearances[series] === 'isometric' ? (
                  <g
                    key={`${index}-${series}`}
                    className="lilt-chart__skeleton-bar"
                    data-depth="true"
                    style={
                      {
                        '--lilt-skeleton-step': index,
                        '--lilt-skeleton-bar-height': `${bar.height}px`,
                      } as CSSProperties
                    }
                  >
                    <IsometricBar
                      bar={bar}
                      mark={barMark(series)}
                      id={`${id}-bar-${index}-${series}`}
                      color="var(--lilt-skeleton)"
                      fill="var(--lilt-skeleton)"
                      fillOpacity={1}
                    />
                  </g>
                ) : (
                  <path
                    key={`${index}-${series}`}
                    className="lilt-chart__skeleton-bar"
                    d={barPath(bar)}
                    style={{ '--lilt-skeleton-step': index } as CSSProperties}
                  />
                ),
              ),
            )}
          </g>
        ) : (
          // The wave fades on the last contour's beat, so every series has finished before
          // they all fade together, and every pen has reset before the wave comes back.
          <g
            className="lilt-chart__skeleton-wave"
            style={{ '--lilt-skeleton-step': lastStep } as CSSProperties}
          >
            {isColumns ? (
              <g opacity={mark?.depth ? 0.7 : 0.5}>{columnShapes(false)}</g>
            ) : marks === 'area-stack' ? (
              <>
                <g className="lilt-chart__skeleton-swell" style={swell(lastStep)}>
                  {area}
                </g>
                {contours}
              </>
            ) : (
              <g className="lilt-chart__skeleton-swell" style={swell()}>
                {area}
                {contours}
              </g>
            )}
          </g>
        )}
        {isBars ? contours : null}
        <g className="lilt-chart__skeleton-axis-bars">
          <g dangerouslySetInnerHTML={{ __html: axes }} />
        </g>
        {!reducedMotion && !moving ? (
          <g mask={`url(#${maskId})`}>
            <rect
              className="lilt-chart__skeleton-sheen"
              fill={`url(#${sheenId})`}
              height={height}
              width={sheenWidth}
              x={0}
              y={0}
            />
          </g>
        ) : null}
      </svg>
    </div>
  );
}
