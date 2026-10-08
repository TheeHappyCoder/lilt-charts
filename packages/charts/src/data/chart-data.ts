import type { ChartRange } from '../types';

export interface ChartSummary {
  count: number;
  missing: number;
  total: number | null;
  mean: number | null;
  min: number | null;
  max: number | null;
  first: number | null;
  last: number | null;
  change: number | null;
}

/** Inclusive bounds; missing observations are counted, never silently turned into zero. */
export function summarizeRange<T>(
  data: readonly T[],
  options: {
    x: (row: T) => number | Date;
    value: (row: T) => number | null;
    range?: ChartRange | null;
  },
): ChartSummary {
  const range = options.range;
  if (range && (!Number.isFinite(range.startX) || !Number.isFinite(range.endX)))
    throw new Error('Range bounds must be finite.');
  const start = range ? Math.min(range.startX, range.endX) : -Infinity;
  const end = range ? Math.max(range.startX, range.endX) : Infinity;
  let count = 0,
    missing = 0,
    total = 0,
    min = Infinity,
    max = -Infinity;
  let firstX = Infinity,
    lastX = -Infinity,
    first: number | null = null,
    last: number | null = null;
  const positions = new Set<number>();
  for (const row of data) {
    const position = Number(options.x(row));
    if (!Number.isFinite(position))
      throw new Error('Summary positions must be finite numbers or valid dates.');
    if (position < start || position > end) continue;
    if (positions.has(position)) throw new Error('Summary positions must be unique.');
    positions.add(position);
    const value = options.value(row);
    if (value !== null && (typeof value !== 'number' || !Number.isFinite(value)))
      throw new Error('Summary values must be finite numbers or null.');
    if (position < firstX) {
      firstX = position;
      first = value;
    }
    if (position > lastX) {
      lastX = position;
      last = value;
    }
    if (value === null) {
      missing++;
      continue;
    }
    count++;
    total += value;
    min = Math.min(min, value);
    max = Math.max(max, value);
  }
  if (!Number.isFinite(total)) throw new Error('Summary total exceeds the finite numeric range.');
  return {
    count,
    missing,
    total: count ? total : null,
    mean: count ? total / count : null,
    min: count ? min : null,
    max: count ? max : null,
    first,
    last,
    change: first === null || last === null ? null : last - first,
  };
}

export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string | number | boolean | Date | null;
}
/** RFC 4180 fields, UTC dates, blank nulls and spreadsheet-safe text cells. No browser side effects. */
export function toChartCsv<T>(data: readonly T[], columns: readonly CsvColumn<T>[]): string {
  if (!columns.length) throw new Error('CSV needs at least one column.');
  const field = (value: ReturnType<CsvColumn<T>['value']>): string => {
    if (typeof value === 'number' && !Number.isFinite(value))
      throw new Error('CSV numbers must be finite.');
    if (value instanceof Date && !Number.isFinite(value.getTime()))
      throw new Error('CSV dates must be valid.');
    let text = value === null ? '' : value instanceof Date ? value.toISOString() : String(value);
    if (typeof value === 'string' && /^[\s]*[=+\-@]|^[\t\r\n]/.test(text)) text = "'" + text;
    return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  return (
    [
      columns.map((column) => field(column.header)).join(','),
      ...data.map((row) => columns.map((column) => field(column.value(row))).join(',')),
    ].join('\r\n') + '\r\n'
  );
}
