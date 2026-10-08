import type { ReactElement } from 'react';
import { barMarkPath, type BarGeometry } from '../engine/bars';
import type { ChartBarAppearance } from '../types';
import { IsometricBar } from './isometric-bar';

/** Cell height and pitch for segmented bars, in pixels. */
const CELL = 4;
const PITCH = 6;
/** Resting width of a needle bar. */
const NEEDLE = 2.5;

type MarkOptions = Parameters<typeof barMarkPath>[1];

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Cells laid on a fixed grid from the baseline, so stacked segments continue across a color
 * change. The outermost cell is trimmed to the exact value: a segmented bar is never taller or
 * shorter than its number.
 */
export function barCells(rect: Rect, baseline: number): Rect[] {
  const top = rect.y;
  const bottom = rect.y + rect.height;
  const cells: Rect[] = [];
  const above = bottom <= baseline + 0.5;
  const near = above ? baseline - bottom : top - baseline;
  const far = above ? baseline - top : bottom - baseline;
  for (let slot = Math.max(0, Math.floor(near / PITCH)); slot * PITCH < far; slot += 1) {
    const start = slot * PITCH;
    const end = start + CELL;
    const from = Math.max(start, near);
    const to = Math.min(end, far);
    if (to - from < 0.5) continue;
    cells.push({
      x: rect.x,
      width: rect.width,
      y: above ? baseline - to : baseline + from,
      height: to - from,
    });
  }
  return cells;
}

/** The bar's rectangle at an entrance progress, matching `barPath`. */
function animatedRect(bar: BarGeometry, progress: number, originY?: number): Rect {
  const origin = originY ?? bar.baseline;
  const height = bar.height * progress;
  const y = origin + (bar.y - origin) * progress;
  return { x: bar.x, y, width: bar.width, height };
}

/**
 * One bar in any appearance. Shared by the plot and the hover highlight so both always match;
 * a needle expands to its full width when `expanded`.
 */
export function BarShape({
  bar,
  appearance = 'solid',
  mark,
  fill,
  color,
  baseline,
  expanded = false,
  id,
  fillOpacity = 1,
  stroke,
  strokeWidth,
  className = 'lilt-chart__bar-mark',
  dataAttributes,
  opacity,
}: {
  bar: BarGeometry;
  appearance?: ChartBarAppearance;
  mark: MarkOptions;
  fill: string;
  color: string;
  /** Where segmented cells start counting, usually the zero line. */
  baseline: number;
  expanded?: boolean;
  /** Unique within the chart; used for the gradient definition. */
  id: string;
  fillOpacity?: number;
  stroke?: string;
  strokeWidth?: number;
  className?: string;
  dataAttributes?: Record<string, string | number | undefined>;
  opacity?: number;
}): ReactElement {
  if (appearance === 'isometric') {
    return (
      <g className={className} data-appearance={appearance} opacity={opacity} {...dataAttributes}>
        <IsometricBar
          bar={bar}
          mark={mark}
          id={id}
          color={color}
          fill={fill}
          fillOpacity={fillOpacity}
          stroke={stroke}
          strokeWidth={strokeWidth}
          active={expanded}
        />
      </g>
    );
  }
  if (appearance === 'segmented' || appearance === 'needle') {
    const rect = animatedRect(bar, mark.progress ?? 1, mark.originY);
    const thin = appearance === 'needle' && !expanded;
    const width = thin ? Math.min(NEEDLE, rect.width) : rect.width;
    const x = rect.x + (rect.width - width) / 2;
    const radius = Math.min(1.5, width / 2);
    return (
      <g className={className} data-appearance={appearance} opacity={opacity} {...dataAttributes}>
        {barCells({ ...rect, x, width }, baseline).map((cell) => (
          <rect
            key={cell.y}
            x={cell.x}
            y={cell.y}
            width={cell.width}
            height={cell.height}
            rx={Math.min(radius, cell.height / 2)}
            fill={fill}
            fillOpacity={fillOpacity}
            style={{ fill }}
          />
        ))}
      </g>
    );
  }
  const d = barMarkPath(bar, mark);
  if (appearance === 'gradient') {
    // Full strength at the value end, fading toward the baseline.
    const [y1, y2] = bar.negative ? ['1', '0'] : ['0', '1'];
    return (
      <g className={className} data-appearance={appearance} opacity={opacity} {...dataAttributes}>
        <defs>
          <linearGradient id={id} x1="0" x2="0" y1={y1} y2={y2}>
            <stop offset="0" style={{ stopColor: color, stopOpacity: 1 }} />
            <stop offset="1" style={{ stopColor: color, stopOpacity: 0.16 }} />
          </linearGradient>
        </defs>
        <path d={d} fill={`url(#${id})`} style={{ fill: `url(#${id})` }} />
      </g>
    );
  }
  if (appearance === 'outline') {
    return (
      <path
        className={className}
        data-appearance={appearance}
        opacity={opacity}
        {...dataAttributes}
        d={d}
        fill={color}
        fillOpacity={0.14}
        stroke={color}
        strokeWidth={1.5}
        // Inline so the base bar rule (stroke-width: 0) cannot flatten the edge.
        style={{ fill: color, stroke: color, strokeWidth: 1.5 }}
        vectorEffect="non-scaling-stroke"
      />
    );
  }
  return (
    <path
      className={className}
      opacity={opacity}
      {...dataAttributes}
      d={d}
      fill={fill}
      fillOpacity={fillOpacity}
      style={{ fill, stroke, strokeWidth }}
    />
  );
}
