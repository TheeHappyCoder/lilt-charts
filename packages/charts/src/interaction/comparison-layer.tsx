import { useId, type KeyboardEvent, type PointerEvent, type ReactElement } from 'react';
import { AnimatePresence, m } from 'motion/react';
import type { ChartComparison, ChartComparisonSeries } from '../types';
import type { ChartSnapshot } from '../chart-context';

export type ComparisonEndpoint = 'start' | 'end';

/** Room for one endpoint's name; wicks closer than this share a single label. */
const LABEL_WIDTH = 96;

function endpointY<T>(
  snapshot: ChartSnapshot<T>,
  seriesId: string,
  x: number,
  value: number | null,
): number | null {
  if (value === null) return null;
  const geometry = snapshot.geometry;
  const pixelX = snapshot.xToPixel(x);
  const line = geometry?.series[seriesId];
  for (const point of line?.isolated ?? []) if (Math.abs(point.x - pixelX) < 0.5) return point.y;
  for (const segment of line?.segments ?? []) {
    if (pixelX < segment.startX - 0.5 || pixelX > segment.endX + 0.5) continue;
    const point = segment.points.find((candidate) => Math.abs(candidate.x - pixelX) < 0.5);
    if (point) return point.y;
  }
  const bar = geometry?.bars[seriesId]?.find((candidate) => candidate.valueX === x);
  if (bar) return bar.negative ? bar.y + bar.height : bar.y;
  return snapshot.stack?.series.includes(seriesId) ? null : snapshot.yToPixel(value);
}

interface ComparisonLayerProps<T> {
  snapshot: ChartSnapshot<T>;
  comparison: ChartComparison;
  rows: readonly ChartComparisonSeries[];
  reducedMotion: boolean;
  preview?: boolean;
  /** A range is being drawn or an endpoint moved: name the wicks until it settles. */
  ranging?: boolean;
  onEndpointPointerDown?: (handle: ComparisonEndpoint, event: PointerEvent<HTMLDivElement>) => void;
  onEndpointPointerMove?: (handle: ComparisonEndpoint, event: PointerEvent<HTMLDivElement>) => void;
  onEndpointPointerUp?: (handle: ComparisonEndpoint, event: PointerEvent<HTMLDivElement>) => void;
  onEndpointCancel?: () => void;
  onEndpointCommit?: () => void;
  onEndpointKeyDown?: (handle: ComparisonEndpoint, event: KeyboardEvent<HTMLDivElement>) => void;
}

export function ComparisonLayer<T>({
  snapshot,
  comparison,
  rows,
  reducedMotion,
  onEndpointPointerDown,
  onEndpointPointerMove,
  onEndpointPointerUp,
  onEndpointCancel,
  onEndpointCommit,
  onEndpointKeyDown,
  preview = false,
  ranging = false,
}: ComparisonLayerProps<T>): ReactElement {
  const startX = snapshot.xToPixel(comparison.startX);
  const endX = snapshot.xToPixel(comparison.endX);
  const left = Math.min(startX, endX);
  const right = Math.max(startX, endX);
  const startLabel = snapshot.formatX(comparison.startX);
  const endLabel = snapshot.formatX(comparison.endX);
  const positionDuration = reducedMotion ? 0 : 0.14;
  const endpointHintId = useId();
  const paint = useId().replace(/:/g, '');
  const { top, bottom } = snapshot.plot;
  // While a range is being drawn, each wick names where it stands, so the reader knows when to
  // let go. Wicks too close for two names share one.
  const labels = !ranging
    ? []
    : right - left < LABEL_WIDTH
      ? [{ key: 'range', x: (left + right) / 2, text: `${startLabel} → ${endLabel}` }]
      : [
          { key: 'start', x: startX, text: startLabel },
          { key: 'end', x: endX, text: endLabel },
        ];
  const edge = LABEL_WIDTH / 2;
  const clampLabel = (x: number) =>
    Math.min(
      Math.max(x, snapshot.plot.left + edge),
      Math.max(snapshot.plot.left + edge, snapshot.plot.right - edge),
    );
  const blur = reducedMotion ? 'blur(0px)' : 'blur(4px)';

  return (
    <div
      aria-label="Comparison endpoints"
      className="lilt-chart__comparison"
      data-lilt-comparison={preview ? 'preview' : 'complete'}
    >
      {!preview && onEndpointKeyDown ? (
        <span className="lilt-chart__sr-only" id={endpointHintId}>
          Arrow keys move one observation. Page Up and Page Down move five. Home and End reach the
          limits. During an edit, Enter keeps it and Escape restores the previous value. Otherwise,
          Escape leaves focus or clears the comparison.
        </span>
      ) : null}
      <svg
        aria-hidden="true"
        className="lilt-chart__comparison-svg"
        height={bottom + 1}
        width="100%"
      >
        <defs>
          {/* The band glows from the top and settles into the plot; the wicks fade the same way. */}
          <linearGradient
            id={`${paint}-band`}
            x1="0"
            x2="0"
            y1={top}
            y2={bottom}
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor="var(--lilt-series-1)" stopOpacity={0.14} />
            <stop offset="1" stopColor="var(--lilt-series-1)" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient
            id={`${paint}-wick`}
            x1="0"
            x2="0"
            y1={top}
            y2={bottom}
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor="var(--lilt-series-1)" stopOpacity={0.9} />
            <stop offset="0.7" stopColor="var(--lilt-series-1)" stopOpacity={0.4} />
            <stop offset="1" stopColor="var(--lilt-series-1)" stopOpacity={0.08} />
          </linearGradient>
        </defs>
        <m.rect
          className="lilt-chart__comparison-band"
          animate={{ x: left, width: right - left }}
          fill={`url(#${paint}-band)`}
          height={snapshot.plot.height}
          initial={false}
          transition={{ duration: positionDuration, ease: [0.22, 1, 0.36, 1] }}
          y={top}
        />
        {([startX, endX] as const).map((x, index) => {
          const sampleX = index === 0 ? comparison.startX : comparison.endX;
          return (
            <g key={index}>
              <line
                className="lilt-chart__comparison-anchor"
                stroke={`url(#${paint}-wick)`}
                x1={x}
                x2={x}
                // While ranging, the wick reaches up to hold its flag.
                y1={ranging ? Math.max(0, top - 6) : top}
                y2={bottom}
              />
              {rows.map((row) => {
                const value = index === 0 ? row.startValue : row.endValue;
                const y = endpointY(snapshot, row.id, sampleX, value);
                return y !== null ? (
                  <circle
                    key={row.id}
                    data-comparison-series={row.id}
                    className="lilt-chart__comparison-dot"
                    cx={x}
                    cy={y}
                    fill={row.color}
                    style={{ fill: row.color }}
                    r={3.5}
                  />
                ) : null;
              })}
            </g>
          );
        })}
      </svg>
      <AnimatePresence initial={false}>
        {labels.map((label) => (
          <m.span
            aria-hidden="true"
            className="lilt-chart__comparison-label"
            key={label.key}
            initial={{ x: clampLabel(label.x), y: reducedMotion ? 0 : 4, opacity: 0, filter: blur }}
            animate={{ x: clampLabel(label.x), y: 0, opacity: 1, filter: 'blur(0px)' }}
            exit={{ y: reducedMotion ? 0 : -4, opacity: 0, filter: blur }}
            transition={{
              x: { duration: positionDuration, ease: [0.22, 1, 0.36, 1] },
              default: { duration: 0.16, ease: [0.23, 1, 0.32, 1] },
            }}
            // A flag on top of its wick, just above the plot, clear of the grips.
            style={{ top: Math.max(0, top - 24) }}
          >
            <span>{label.text}</span>
          </m.span>
        ))}
      </AnimatePresence>
      {!preview && onEndpointKeyDown
        ? (['start', 'end'] as const).map((handle) => {
            const value = handle === 'start' ? comparison.startX : comparison.endX;
            const index = snapshot.data.rows.findIndex((row) => row.x === value);
            const other = snapshot.data.rows.findIndex(
              (row) => row.x === (handle === 'start' ? comparison.endX : comparison.startX),
            );
            if (index < 0 || other < 0) return null;
            const reversed = comparison.startX > comparison.endX;
            const min = reversed
              ? handle === 'start'
                ? other + 1
                : 0
              : handle === 'start'
                ? 0
                : other + 1;
            const max = reversed
              ? handle === 'start'
                ? snapshot.data.rows.length - 1
                : other - 1
              : handle === 'start'
                ? other - 1
                : snapshot.data.rows.length - 1;
            const label = handle === 'start' ? startLabel : endLabel;
            return (
              <div
                aria-label={`Comparison ${handle}`}
                aria-describedby={endpointHintId}
                aria-orientation="horizontal"
                aria-valuemin={Math.max(0, min)}
                aria-valuemax={Math.max(0, max)}
                aria-valuenow={Math.max(0, index)}
                aria-valuetext={label}
                className="lilt-chart__comparison-handle"
                data-endpoint={handle}
                key={handle}
                onKeyDown={(event) => onEndpointKeyDown(handle, event)}
                onBlur={onEndpointCommit}
                onPointerCancel={onEndpointCancel}
                onPointerDown={(event) => onEndpointPointerDown?.(handle, event)}
                onPointerMove={(event) => onEndpointPointerMove?.(handle, event)}
                onPointerUp={(event) => onEndpointPointerUp?.(handle, event)}
                role="slider"
                style={{
                  left: (handle === 'start' ? startX : endX) - 17,
                  top: snapshot.plot.top + 28,
                  height: Math.max(0, snapshot.plot.height - 28),
                }}
                tabIndex={0}
              >
                <span aria-hidden="true" className="lilt-chart__comparison-handle-knob" />
              </div>
            );
          })
        : null}
    </div>
  );
}
