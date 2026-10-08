import type { ChartSeries } from '../types';
import type { NormalizedData, NormalizedRow } from './normalize';

/** Past this many rows in either frame, a keyed morph costs more than it shows. */
const MAX_KEYED_ROWS = 4000;

/**
 * Whether a change of rows can morph by x value rather than cross-fade: both frames are time or
 * number data in ascending order, they keep the same series, and they share at least two x values
 * to anchor the glide. A period switch such as 30 → 90 days qualifies; categories do not.
 */
export function canMorphByKey<T>(
  from: NormalizedData<T>,
  to: NormalizedData<T>,
  series: readonly ChartSeries<T>[],
): boolean {
  if (from.xType === 'category' || from.xType !== to.xType) return false;
  if (from.rows.length < 2 || to.rows.length < 2) return false;
  if (from.rows.length > MAX_KEYED_ROWS || to.rows.length > MAX_KEYED_ROWS) return false;
  if (!ascending(from.rows) || !ascending(to.rows)) return false;
  const fromIds = new Set(from.series.map((item) => item.id));
  if (
    to.series.length !== from.series.length ||
    to.series.some((item) => !fromIds.has(item.id)) ||
    series.some((item) => !fromIds.has(item.id))
  )
    return false;
  const keys = new Set(from.rows.map((row) => row.x));
  let shared = 0;
  for (const row of to.rows) {
    if (keys.has(row.x) && ++shared >= 2) return true;
  }
  return false;
}

/**
 * One frame of a keyed morph: every row from both frames, in x order. Rows in both ease from
 * their old values to their new ones; rows added after the old last row grow out of its value,
 * so arriving data draws the line forward; other one-sided rows keep their own values, and the
 * gliding domain carries them in or out past the plot edge.
 */
export function keyedFrame<T>(
  from: NormalizedData<T>,
  to: NormalizedData<T>,
  progress: number,
): NormalizedData<T> {
  if (progress >= 1) return to;
  const previous = new Map(from.rows.map((row) => [row.x, row]));
  // Data arriving after the old last row grows out of it: the line draws itself forward.
  const last = from.rows.at(-1);
  const rows: NormalizedRow<T>[] = to.rows.map((row) => {
    const start = previous.get(row.x);
    if (!start)
      return last && row.x > last.x
        ? { ...row, values: mixValues(last.values, row.values, to, progress) }
        : row;
    previous.delete(row.x);
    return { ...row, values: mixValues(start.values, row.values, to, progress) };
  });
  if (previous.size) {
    rows.push(...previous.values());
    rows.sort((a, b) => a.x - b.x);
  }
  return { ...to, rows };
}

function mixValues<T>(
  start: NormalizedRow<T>['values'],
  end: NormalizedRow<T>['values'],
  data: NormalizedData<T>,
  progress: number,
): NormalizedRow<T>['values'] {
  return Object.fromEntries(
    data.series.map(({ id }) => {
      const a = start[id];
      const b = end[id];
      return [
        id,
        a === null || a === undefined || b === null || b === undefined ? b : a + (b - a) * progress,
      ];
    }),
  );
}

function ascending<T>(rows: readonly NormalizedRow<T>[]): boolean {
  for (let index = 1; index < rows.length; index += 1) {
    if (rows[index].x <= rows[index - 1].x) return false;
  }
  return true;
}

/** Ease for something moving across the plot: slow out, quick through, soft landing. */
export function morphEase(progress: number): number {
  const t = Math.max(0, Math.min(1, progress));
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** A domain between two others, at the same eased progress as the data. */
export function mixDomain(
  from: readonly [number, number],
  to: readonly [number, number],
  progress: number,
): readonly [number, number] {
  return [from[0] + (to[0] - from[0]) * progress, from[1] + (to[1] - from[1]) * progress];
}
