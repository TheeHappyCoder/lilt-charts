import { centeredPrism, prismFaces, type PrismFaces } from './depth';
import type { NormalizedRow } from './normalize';

/** Pixel mappings a range mark draws with. */
export interface RangeScales {
  x: (value: number) => number;
  y: (value: number) => number;
  xDomain: readonly [number, number];
  /** Width of one observation's column in pixels. */
  columnWidth: number;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function fieldOf<T>(row: NormalizedRow<T>, series: string, id: string): number | null {
  return row.fields[series]?.[id] ?? null;
}

/**
 * Throws when a present row breaks the order a mark relies on, e.g. low ≤ high. Rows missing
 * any listed value are gaps and skip the check.
 */
export function assertOrdered<T>(
  mark: string,
  rows: readonly NormalizedRow<T>[],
  series: string,
  ids: readonly (string | { value: true })[],
): void {
  for (const row of rows) {
    const values = ids.map((id) =>
      typeof id === 'string' ? fieldOf(row, series, id) : (row.values[series] ?? null),
    );
    if (values.some((value) => value === null)) continue;
    for (let index = 1; index < values.length; index += 1) {
      if (values[index]! < values[index - 1]!) {
        const names = ids.map((id) => (typeof id === 'string' ? id : 'value')).join(' ≤ ');
        throw new Error(
          `Lilt ${mark} on series "${series}" expects ${names} at row ${row.sourceIndex + 1}.`,
        );
      }
    }
  }
}

/** Closed band paths between two fields, split wherever a row lacks either edge. */
export function bandPaths<T>(
  rows: readonly NormalizedRow<T>[],
  series: string,
  lower: string,
  upper: string,
  scales: RangeScales,
): string[] {
  const paths: string[] = [];
  let run: { x: number; lower: number; upper: number }[] = [];
  const flush = () => {
    if (run.length >= 2) {
      const top = run.map((point) => `${round(point.x)},${round(scales.y(point.upper))}`);
      const bottom = run
        .map((point) => `${round(point.x)},${round(scales.y(point.lower))}`)
        .reverse();
      paths.push(`M${top.join(' L')} L${bottom.join(' L')} Z`);
    }
    run = [];
  };
  for (const row of rows) {
    const low = fieldOf(row, series, lower);
    const high = fieldOf(row, series, upper);
    if (row.x < scales.xDomain[0] || row.x > scales.xDomain[1] || low === null || high === null)
      flush();
    else run.push({ x: scales.x(row.x), lower: low, upper: high });
  }
  flush();
  return paths;
}

/** A rounded rectangle as path data; the radius shrinks to fit. */
export function roundedRect(
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): string {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  if (r === 0) return `M${round(x)},${round(y)}h${round(width)}v${round(height)}h${round(-width)}Z`;
  return (
    `M${round(x + r)},${round(y)}h${round(width - 2 * r)}a${r},${r} 0 0 1 ${r},${r}` +
    `v${round(height - 2 * r)}a${r},${r} 0 0 1 ${-r},${r}h${round(-(width - 2 * r))}` +
    `a${r},${r} 0 0 1 ${-r},${-r}v${round(-(height - 2 * r))}a${r},${r} 0 0 1 ${r},${-r}Z`
  );
}

/** A dot as path data, so many dots share one path element. */
export function dotPath(x: number, y: number, radius: number): string {
  return (
    `M${round(x - radius)},${round(y)}a${radius},${radius} 0 1 0 ${radius * 2},0` +
    `a${radius},${radius} 0 1 0 ${-radius * 2},0Z`
  );
}

/** Path data grouped by color, so a mark draws one element per color. */
export class ColorBatches {
  private readonly batches = new Map<string, string[]>();

  add(color: string, path: string): void {
    const list = this.batches.get(color);
    if (list) list.push(path);
    else this.batches.set(color, [path]);
  }

  entries(): { color: string; d: string }[] {
    return [...this.batches].map(([color, parts]) => ({ color, d: parts.join('') }));
  }
}

/** Prism faces batched by color: every side, then every top, then every front. */
export class PrismBatches {
  readonly sides = new ColorBatches();
  readonly tops = new ColorBatches();
  readonly fronts = new ColorBatches();

  add(color: string, faces: PrismFaces): void {
    this.sides.add(color, faces.side);
    if (faces.top) this.tops.add(color, faces.top);
    this.fronts.add(color, faces.front);
  }
}

/** Column geometry shared by candles and range marks: center and body width per row. */
export function columnFrame(scales: RangeScales): { width: number; half: number } {
  const width = Math.max(1, scales.columnWidth);
  return { width, half: width / 2 };
}

export interface RangeColumn<T> {
  row: NormalizedRow<T>;
  cx: number;
}

/** Rows in view with their pixel centers. */
export function columnsInView<T>(
  rows: readonly NormalizedRow<T>[],
  scales: RangeScales,
): RangeColumn<T>[] {
  const result: RangeColumn<T>[] = [];
  for (const row of rows) {
    if (row.x < scales.xDomain[0] || row.x > scales.xDomain[1]) continue;
    result.push({ row, cx: scales.x(row.x) });
  }
  return result;
}

/** One floating bar from low to high as a prism; its front spans exactly low to high. */
export function rangeBarPrism(
  cx: number,
  low: number,
  high: number,
  scales: RangeScales,
): PrismFaces {
  const { width } = columnFrame(scales);
  const top = scales.y(Math.max(low, high));
  const height = Math.max(1, scales.y(Math.min(low, high)) - top);
  return centeredPrism(cx, top - (height === 1 ? 0.5 : 0), width, height);
}

/** One floating bar from low to high. */
export function rangeBarPath(cx: number, low: number, high: number, scales: RangeScales): string {
  const { width, half } = columnFrame(scales);
  const top = scales.y(Math.max(low, high));
  const bottom = scales.y(Math.min(low, high));
  const height = Math.max(1, bottom - top);
  return roundedRect(cx - half, top - (height === 1 ? 0.5 : 0), width, height, Math.min(4, half));
}

function capHalf(scales: RangeScales): number {
  return Math.min(12, columnFrame(scales).width * 0.5) / 2;
}

/** A stem from one value to another with a cap at the far end. */
function cappedStem(cx: number, from: number, to: number, cap: number): string {
  const x = round(cx);
  const end = round(to);
  return (
    `M${x},${round(from)}V${end}` +
    (cap >= 1.5 ? `M${round(cx - cap)},${end}H${round(cx + cap)}` : '')
  );
}

/** A whisker from low to high with caps a little narrower than the column. */
export function whiskerPath(cx: number, low: number, high: number, scales: RangeScales): string {
  const cap = capHalf(scales);
  const top = round(scales.y(high));
  const bottom = round(scales.y(low));
  const caps =
    cap >= 1.5
      ? `M${round(cx - cap)},${top}H${round(cx + cap)}M${round(cx - cap)},${bottom}H${round(cx + cap)}`
      : '';
  return `M${round(cx)},${top}V${bottom}${caps}`;
}

export interface BoxShape {
  box: string;
  median: string;
  whiskers: string;
}

/** A box from q1 to q3 with a median line and capped whiskers to min and max. */
export function boxShape(
  cx: number,
  values: { min: number; q1: number; median: number; q3: number; max: number },
  scales: RangeScales,
): BoxShape {
  const { width, half } = columnFrame(scales);
  const cap = capHalf(scales);
  const top = scales.y(values.q3);
  const bottom = scales.y(values.q1);
  const medianY = round(scales.y(values.median));
  return {
    box: roundedRect(cx - half, top, width, Math.max(1, bottom - top), Math.min(3, half)),
    median: `M${round(cx - half)},${medianY}H${round(cx + half)}`,
    whiskers:
      cappedStem(cx, top, scales.y(values.max), cap) +
      cappedStem(cx, bottom, scales.y(values.min), cap),
  };
}

/**
 * A box plot drawn as a solid block. The block's middle, not its front, sits on the reading, so
 * the whiskers run through the center of its top and bottom faces, half the depth back. The
 * front still spans exactly Q1 to Q3, and the median wraps from the front around the side.
 */
export function boxBlock(
  cx: number,
  values: { min: number; q1: number; median: number; q3: number; max: number },
  scales: RangeScales,
) {
  const { width, half } = columnFrame(scales);
  const cap = capHalf(scales);
  const top = scales.y(values.q3);
  const bottom = scales.y(values.q1);
  const faces = prismFaces(cx - half, top, width, Math.max(1, bottom - top));
  const lift = faces.rise / 2;
  const left = cx - half;
  const right = left + faces.frontWidth;
  const medianY = scales.y(values.median);
  return {
    faces,
    /** How far the whiskers and outliers sit above their values: half the depth back. */
    lift,
    median: `M${left},${medianY}H${right}L${right + faces.depth},${medianY - faces.rise}`,
    /** Drawn before the block, which hides where it leaves the bottom face. */
    lower: cappedStem(cx, bottom - lift, scales.y(values.min) - lift, cap),
    /** Drawn after the block, rising from the middle of its top face. */
    upper: cappedStem(cx, top - lift, scales.y(values.max) - lift, cap),
  };
}
