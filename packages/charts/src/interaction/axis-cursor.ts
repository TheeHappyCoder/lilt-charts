import { createContext, useContext } from 'react';
import { motionValue, type MotionValue } from 'motion/react';
import type { ChartAxis, ChartAxisSide, ChartAxisStyle, ChartHoverStyle } from '../types';

/** Visual center of x tick labels below the plot; pills center on the same line. */
export const X_LABEL_CENTER = 22;

/** The inspection pill positions, shared so axis labels can react to the approaching pill. */
export interface AxisCursor {
  /** Center of the x pill, which stays inside the plot near its edges. */
  x: MotionValue<number>;
  /** The inspected position itself, for marks that must line up with the crosshair. */
  pointerX: MotionValue<number>;
  /**
   * The inspected column, unsprung: it jumps to each observation the moment it is read, in step
   * with the bars that light up, for marks that snap to a column rather than glide.
   */
  columnX: MotionValue<number>;
  /**
   * The color of the inspected column's mark: the hovered series' bar, or a candle's direction.
   * Empty until a column is read; it keeps the last color while the band fades out.
   */
  columnColor: MotionValue<string>;
  y: MotionValue<number>;
  /** 1 while this chart owns an inspection with pills on its axes, else 0. */
  active: MotionValue<number>;
  /** 1 while any reading is shown, whatever the readout, else 0. */
  inspecting: MotionValue<number>;
  /** The preset each axis uses. */
  axis: ResolvedAxis;
  pill: ChartHoverStyle;
  /** Padding between the plot edges and axis labels or pills, for plots that run edge to edge. */
  inset: number;
  /** Continue lines and areas, faded, from the first and last observations to the plot edges. */
  runoff: boolean;
  /** How far edge labels may hang past the plot edges to stay centered on their ticks. */
  overhang: number;
  /** Where the value pill sits: on the y axis, or above the hovered mark. */
  pillPosition: 'axis' | 'mark';
}

const idle: AxisCursor = {
  x: motionValue(0),
  pointerX: motionValue(0),
  columnX: motionValue(0),
  columnColor: motionValue(''),
  y: motionValue(0),
  active: motionValue(0),
  inspecting: motionValue(0),
  axis: { x: 'minimal', y: 'minimal' },
  pill: 'soft',
  inset: 0,
  runoff: false,
  overhang: 0,
  pillPosition: 'mark',
};

export const AxisCursorContext = createContext<AxisCursor>(idle);

export function useAxisCursor(): AxisCursor {
  return useContext(AxisCursorContext);
}

/** 1 when far from the pill, easing to 0 when the pill is on top of the label. */
export function proximityOpacity(distance: number, reach: number, active: number): number {
  if (active <= 0) return 1;
  const t = Math.min(1, Math.max(0, (Math.abs(distance) - reach * 0.35) / (reach * 0.65)));
  const eased = t * t * (3 - 2 * t);
  return 1 - active * (1 - eased);
}

/** The preset each axis uses, and a segmented axis's color scale. */
export interface ResolvedAxis {
  x: ChartAxisStyle;
  y: ChartAxisStyle;
  xGradient?: boolean | readonly string[];
  yGradient?: boolean | readonly string[];
}

/** Split an `axis` prop into one preset per axis. An axis left out is `minimal`. */
export function resolveAxis(axis: ChartAxis | undefined): ResolvedAxis {
  if (axis === undefined) return { x: 'minimal', y: 'minimal' };
  if (typeof axis === 'string') return { x: axis, y: axis };
  const side = (value: ChartAxisStyle | ChartAxisSide | undefined): ChartAxisSide =>
    value === undefined
      ? { style: 'minimal' as const }
      : typeof value === 'string'
        ? { style: value }
        : value;
  const x = side(axis.x);
  const y = side(axis.y);
  return {
    x: x.style,
    y: y.style,
    ...(x.gradient ? { xGradient: x.gradient } : {}),
    ...(y.gradient ? { yGradient: y.gradient } : {}),
  };
}

/**
 * Y axes that keep their labels in a gutter beside the plot: classic, segmented, and dots, whose
 * labels lead into the plot along a dotted line.
 */
export function hasYGutter(style: ChartAxisStyle): boolean {
  return style === 'classic' || style === 'segmented' || style === 'dots';
}

/** Pills sit on the y axis when it has labels, and above the hovered mark when it does not. */
export function resolvePillPosition(
  position: 'auto' | 'axis' | 'mark',
  style: ChartAxisStyle,
): 'axis' | 'mark' {
  if (position !== 'auto') return position;
  return style === 'minimal' ? 'mark' : 'axis';
}
