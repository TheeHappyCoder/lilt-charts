import { clamp, hash3 } from '../engine/noise';
import type { GlyphSurface } from '../engine/surface';

/** Space kept clear around a chart, in cells, so it never runs into the edge of its frame. */
export const INSET = { x: 4, top: 1, bottom: 2 };

/** Characters data scrambles through on its way in. */
export const SCRAMBLE = '01<>/\\{}[]#$%&*+=?~';

/** The glyph at a cell on a given tick of the scramble. */
export const scrambled = (col: number, row: number, tick: number) =>
  SCRAMBLE[Math.floor(hash3(col, row, tick) * SCRAMBLE.length)]!;

/** Writes a run of text from a cell, left to right. Spaces leave their cells as they are. */
export function text(
  surface: GlyphSurface,
  col: number,
  row: number,
  value: string,
  tone: number,
  opacity = 1,
) {
  for (let i = 0; i < value.length; i++) {
    const ch = value[i]!;
    if (ch !== ' ') surface.put(col + i, row, ch, tone, opacity);
  }
}

const compactFormat = new Intl.NumberFormat('en', {
  notation: 'compact',
  maximumFractionDigits: 1,
});
const fullFormat = new Intl.NumberFormat('en', { maximumFractionDigits: 2 });

/** A short number for an axis: 1.2K, 48, 3M. */
export const compact = (value: number) => compactFormat.format(value);

/** A number in full for a readout: 12,480. */
export const full = (value: number) => fullFormat.format(value);

/** Round steps for an axis from `min` to `max`: 1, 2 or 5 times a power of ten. */
export function ticks(min: number, max: number, count: number): number[] {
  if (!(max > min)) return [min];
  const raw = (max - min) / Math.max(1, count);
  const power = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 5, 10].map((m) => m * power).find((s) => s >= raw) ?? raw;
  const out: number[] = [];
  for (let v = Math.floor(min / step) * step; v <= max + step * 0.5; v += step) {
    out.push(Math.round(v / step) * step);
    if (v >= max) break;
  }
  return out;
}

/** An entrance easing: quick out of the gate, settling softly. */
export const easeOut = (t: number) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);

/** A believable daily series for demos: a gentle trend, a weekly rhythm and some noise. */
export function demoSeries(length: number, seed = 1): number[] {
  return Array.from({ length }, (_, i) => {
    const trend = 2200 + i * 16 + Math.sin(i / 11 + seed) * 420 + Math.sin(i / 4.3) * 120;
    const week = i % 7 === 5 || i % 7 === 6 ? -160 : 40;
    const noise = (hash3(i, seed, 7) - 0.5) * 140;
    return Math.max(0, Math.round(trend + week + noise));
  });
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const monthName = (date: Date) => MONTHS[date.getMonth()]!;
export const dayName = (date: Date) => DAYS[date.getDay()]!;
export const shortDate = (date: Date) => `${monthName(date)} ${date.getDate()}`;

/** A date a whole number of days from another, at local midnight. */
export function addDays(date: Date, days: number) {
  const out = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  out.setDate(out.getDate() + days);
  return out;
}

/** Parses `YYYY-MM-DD` as a local date; anything else falls back to today. */
export function parseDay(value: string | undefined): Date {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const today = new Date();
  if (!match) return new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

/** The labels demo data uses: one date a day, ending on `end`. */
export const dayLabels = (length: number, end: Date) =>
  Array.from({ length }, (_, i) => shortDate(addDays(end, i - length + 1)));

/** A one-line description of a series for screen readers. */
export function describe(kind: string, data: readonly number[], labels?: readonly string[]) {
  if (!data.length) return `${kind} with no data.`;
  let lo = 0;
  let hi = 0;
  data.forEach((v, i) => {
    if (v < data[lo]!) lo = i;
    if (v > data[hi]!) hi = i;
  });
  const at = (i: number) => (labels?.[i] ? ` (${labels[i]})` : '');
  const last = data.length - 1;
  return (
    `${kind} of ${data.length} values: lowest ${full(data[lo]!)}${at(lo)}, ` +
    `highest ${full(data[hi]!)}${at(hi)}, latest ${full(data[last]!)}${at(last)}.`
  );
}

/**
 * The label a chart gets when none is given: a chart is information, so unlike a scene it is never
 * hidden from screen readers.
 */
export const chartLabel = (kind: string, data?: readonly number[], labels?: readonly string[]) =>
  data?.length ? describe(kind, data, labels) : `${kind} of demo data.`;
