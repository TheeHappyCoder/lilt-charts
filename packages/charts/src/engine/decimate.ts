import type { NormalizedData, NormalizedRow } from './normalize';
import type { StackMode } from './stack';

export interface DecimateOptions {
  /** Series drawn as lines or areas, in chart order. Bars are drawn per row and left out. */
  lines: readonly string[];
  /** Stacked layers, in drawing order, whose cumulative boundaries are what the plot draws. */
  stack?: {
    series: readonly string[];
    mode: StackMode;
    weights?: Readonly<Record<string, number>>;
  };
  xDomain: readonly [number, number];
  /** Maps a row's x to its screen pixel. */
  xToPixel: (x: number) => number;
}

/** Below this many rows per pixel column, drawing every row costs too little to thin. */
const MIN_ROWS_PER_COLUMN = 2;

/**
 * The rows worth drawing when a series has more rows than the plot has pixels (M4): in each pixel
 * column, every drawn line's first, last, lowest and highest row. That traces the same ink as
 * every row would, and every kept row is a real observation. Rows at the edge of a gap or a
 * change of status are always kept, so gaps and provisional runs never close up.
 *
 * Returns null when thinning would not save much; the caller then draws every row. Only drawing
 * uses the result: inspection, values and exports keep reading every row.
 */
export function decimateRows<T>(
  data: NormalizedData<T>,
  options: DecimateOptions,
): NormalizedData<T> | null {
  const rows = data.rows;
  if (data.xType === 'category') return null;
  const left = options.xToPixel(options.xDomain[0]);
  const right = options.xToPixel(options.xDomain[1]);
  if (!(right > left) || rows.length < (right - left) * MIN_ROWS_PER_COLUMN) return null;
  const tracks = trackValues(rows, options);
  if (!tracks.length) return null;

  const keep = new Uint8Array(rows.length);
  const mark = (index: number) => {
    if (index >= 0 && index < rows.length) keep[index] = 1;
  };

  // In view: the extremes of each column. Out of view: only the rows that carry a line in.
  let firstInView = -1;
  let lastInView = -1;
  for (let index = 0; index < rows.length; index += 1) {
    const x = rows[index]!.x;
    if (x < options.xDomain[0] || x > options.xDomain[1]) continue;
    if (firstInView < 0) firstInView = index;
    lastInView = index;
  }
  if (firstInView < 0) return null;
  mark(firstInView - 1);
  mark(firstInView);
  mark(lastInView);
  mark(lastInView + 1);

  for (const values of tracks) {
    let column = Number.NaN;
    let first = -1;
    let last = -1;
    let low = -1;
    let high = -1;
    const flush = () => {
      mark(first);
      mark(last);
      mark(low);
      mark(high);
    };
    for (let index = firstInView; index <= lastInView; index += 1) {
      const value = values[index];
      if (value === null) {
        // A gap: keep it and the observations either side, so it stays exactly as wide.
        mark(index - 1);
        mark(index);
        mark(index + 1);
        continue;
      }
      const at = Math.floor(options.xToPixel(rows[index]!.x));
      if (at !== column) {
        if (first >= 0) flush();
        column = at;
        first = low = high = index;
      }
      last = index;
      if (value < values[low]!) low = index;
      if (value > values[high]!) high = index;
    }
    if (first >= 0) flush();
  }

  // A change of status (observed, provisional, forecast) starts a new run with its own paint.
  for (let index = firstInView + 1; index <= lastInView; index += 1) {
    const before = rows[index - 1]!.statuses;
    const after = rows[index]!.statuses;
    if (options.lines.some((id) => (before[id] ?? 'observed') !== (after[id] ?? 'observed'))) {
      mark(index - 1);
      mark(index);
    }
  }

  let kept = 0;
  for (const flag of keep) kept += flag;
  if (kept > rows.length / 2) return null;
  const thinned: NormalizedRow<T>[] = [];
  for (let index = 0; index < rows.length; index += 1) if (keep[index]) thinned.push(rows[index]!);
  return { ...data, rows: thinned };
}

/**
 * The values each drawn line passes through, per row: an unstacked series' own values, and each
 * stacked layer's top boundary. `null` is a gap.
 */
function trackValues<T>(
  rows: readonly NormalizedRow<T>[],
  { lines, stack }: DecimateOptions,
): (number | null)[][] {
  const stacked = new Set(stack?.series ?? []);
  const tracks = lines
    .filter((id) => !stacked.has(id))
    .map((id) => rows.map((row) => row.values[id] ?? null));
  if (!stack?.series.length) return tracks;
  const layers = stack.series.filter((id) => (stack.weights?.[id] ?? 1) > 0);
  const boundaries = layers.map(() => new Array<number | null>(rows.length));
  rows.forEach((row, index) => {
    const values = layers.map((id) => row.values[id] ?? null);
    // A missing visible layer leaves a gap across the whole stack.
    if (values.some((value) => value === null)) {
      for (const boundary of boundaries) boundary[index] = null;
      return;
    }
    const weighted = values.map((value, layer) => value! * (stack.weights?.[layers[layer]!] ?? 1));
    const total = weighted.reduce((sum, value) => sum + value, 0);
    let top = 0;
    weighted.forEach((value, layer) => {
      top += stack.mode === 'percent' ? (total > 0 ? (value / total) * 100 : 0) : value;
      boundaries[layer]![index] = top;
    });
  });
  return [...tracks, ...boundaries];
}
