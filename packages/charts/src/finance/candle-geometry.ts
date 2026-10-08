import type { NormalizedRow } from '../engine/normalize';
import { ColorBatches, columnsInView, roundedRect, type RangeScales } from '../engine/ranges';
import { centeredPrism } from '../engine/depth';

/**
 * How a candle is drawn: a filled `candle`, a `hollow` candle whose rising bodies are outlined
 * so direction reads without color, or `ohlc` bars with an open tick left and a close tick right.
 */
export type CandleDisplay = 'candle' | 'hollow' | 'ohlc';

export const CANDLE_UP = 'var(--lilt-candle-up)';
export const CANDLE_DOWN = 'var(--lilt-candle-down)';

export interface CandleFields {
  open: string;
  high: string;
  low: string;
}

export interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
  /** Close at or above open; a flat candle counts as rising. */
  up: boolean;
}

export interface CandlePaths {
  /** Filled bodies, one path per color. */
  bodies: { color: string; d: string }[];
  /** Outlined bodies of hollow rising candles, one path per color. */
  hollow: { color: string; d: string }[];
  /** Wicks, and for OHLC bars the whole bar, stroked, one path per color. */
  strokes: { color: string; d: string }[];
  /** With depth: the receding side and top of every body, one path per color. */
  sides: { color: string; d: string }[];
  tops: { color: string; d: string }[];
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

export function candleAt(
  row: NormalizedRow<unknown>,
  series: string,
  fields: CandleFields,
): Candle | null {
  const values = row.fields[series];
  const open = values?.[fields.open];
  const high = values?.[fields.high];
  const low = values?.[fields.low];
  const close = row.values[series];
  if (open == null || high == null || low == null || close == null) return null;
  return { open, high, low, close, up: close >= open };
}

/** Throws on a candle whose high or low does not contain its open and close. */
export function assertCandles(
  rows: readonly NormalizedRow<unknown>[],
  series: string,
  fields: CandleFields,
): void {
  for (const row of rows) {
    const candle = candleAt(row, series, fields);
    if (!candle) continue;
    const top = Math.max(candle.open, candle.close);
    const bottom = Math.min(candle.open, candle.close);
    if (candle.high < top || candle.low > bottom)
      throw new Error(
        `Lilt Candles on series "${series}" expects low ≤ open, close ≤ high at row ${row.sourceIndex + 1}.`,
      );
  }
}

interface CandleShape {
  body: string | null;
  hollow: string | null;
  stroke: string;
  side: string | null;
  top: string | null;
}

/** One candle's geometry. Wicks stop at the body, so a hollow body stays empty. */
export function candleShape(
  cx: number,
  candle: Candle,
  scales: RangeScales,
  display: CandleDisplay,
  depth = false,
): CandleShape {
  const width = Math.max(1, scales.columnWidth);
  const half = width / 2;
  const x = round(cx);
  const highY = round(scales.y(candle.high));
  const lowY = round(scales.y(candle.low));
  if (display === 'ohlc') {
    const openY = round(scales.y(candle.open));
    const closeY = round(scales.y(candle.close));
    const tick = round(Math.max(2, half));
    return {
      body: null,
      hollow: null,
      stroke: `M${x},${highY}V${lowY}M${round(cx - tick)},${openY}H${x}M${x},${closeY}H${round(cx + tick)}`,
      side: null,
      top: null,
    };
  }
  let top = scales.y(Math.max(candle.open, candle.close));
  let bottom = scales.y(Math.min(candle.open, candle.close));
  // A doji still shows a body a pixel tall.
  if (bottom - top < 1) {
    const middle = (top + bottom) / 2;
    top = middle - 0.5;
    bottom = middle + 0.5;
  }
  const outlined = display === 'hollow' && candle.up && width >= 3;
  // Outlines sit half a pixel inside the column so their stroke stays within it.
  const inset = outlined ? 0.5 : 0;
  // With depth the body is a square block centered on the candle; its front keeps open and close.
  const prism = depth ? centeredPrism(cx, top, width, bottom - top) : null;
  const left = prism ? cx - prism.frontWidth / 2 : cx - half;
  const rect = roundedRect(
    left + inset,
    top + inset,
    Math.max(1, (prism ? prism.frontWidth : width) - inset * 2),
    Math.max(1, bottom - top - inset * 2),
    !prism && width >= 6 ? 1.5 : 0,
  );
  const wicks =
    (highY < top ? `M${x},${highY}V${round(top)}` : '') +
    (lowY > bottom ? `M${x},${round(bottom)}V${lowY}` : '');
  return {
    body: outlined ? null : rect,
    hollow: outlined ? rect : null,
    stroke: wicks,
    side: prism?.side ?? null,
    top: prism?.top ?? null,
  };
}

/**
 * Every candle in view batched into a handful of paths: bodies, hollow bodies and strokes,
 * each grouped by color. Thousands of candles stay a few DOM nodes.
 */
export function candlePaths(
  rows: readonly NormalizedRow<unknown>[],
  series: string,
  fields: CandleFields,
  scales: RangeScales,
  display: CandleDisplay,
  colorOf: (row: NormalizedRow<unknown>, candle: Candle) => string,
  depth = false,
): CandlePaths {
  const bodies = new ColorBatches();
  const hollow = new ColorBatches();
  const strokes = new ColorBatches();
  const sides = new ColorBatches();
  const tops = new ColorBatches();
  for (const { row, cx } of columnsInView(rows, scales)) {
    const candle = candleAt(row, series, fields);
    if (!candle) continue;
    const color = colorOf(row, candle);
    const shape = candleShape(cx, candle, scales, display, depth);
    if (shape.side) sides.add(color, shape.side);
    if (shape.top) tops.add(color, shape.top);
    if (shape.body) bodies.add(color, shape.body);
    if (shape.hollow) hollow.add(color, shape.hollow);
    if (shape.stroke) strokes.add(color, shape.stroke);
  }
  return {
    bodies: bodies.entries(),
    hollow: hollow.entries(),
    strokes: strokes.entries(),
    sides: sides.entries(),
    tops: tops.entries(),
  };
}
