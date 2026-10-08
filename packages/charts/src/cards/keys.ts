/** Row keys whose values extend `Value`. Used to type key-based chart props. */
export type KeysOfType<Row, Value> = {
  [Key in keyof Row]-?: Row[Key] extends Value ? Key : never;
}[keyof Row] &
  string;

/** Row keys that hold a measurement. `null` and `undefined` are missing values. */
export type NumericKey<Row> = KeysOfType<Row, number | null | undefined>;

/** Row keys that hold text, such as category names. */
export type TextKey<Row> = KeysOfType<Row, string>;

/** Row keys usable as an x position: labels, numbers, or dates. */
export type XKey<Row> = KeysOfType<Row, string | number | Date>;

/** Nullable time fields for observations whose endpoints may still be missing. */
export type TimeKey<Row> = KeysOfType<Row, string | number | Date | null | undefined>;

export type XKind = 'category' | 'number' | 'time';

export interface ResolvedX<Row> {
  kind: XKind;
  /** Plot position. Category labels are placed by input order. */
  position: (row: Row) => number;
  format: (value: number) => string;
}

const dayFormat = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});
const plainNumber = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

/** Infer the x kind from the first value, then build a position and a tick formatter. */
export function resolveX<Row>(
  data: readonly Row[],
  key: string,
  kind?: XKind,
  format?: (value: string | number | Date) => string,
): ResolvedX<Row> {
  const read = (row: Row) => (row as Record<string, unknown>)[key] as string | number | Date;
  const sample = data.length > 0 ? read(data[0]!) : undefined;
  const resolved: XKind =
    kind ?? (typeof sample === 'string' ? 'category' : sample instanceof Date ? 'time' : 'number');

  if (resolved === 'category') {
    const index = new Map<Row, number>();
    data.forEach((row, position) => index.set(row, position));
    return {
      kind: resolved,
      position: (row) => index.get(row) ?? 0,
      format: (value) => {
        if (!Number.isInteger(value)) return '';
        const row = data[value];
        return row === undefined ? '' : format ? format(read(row)) : String(read(row));
      },
    };
  }
  if (resolved === 'time') {
    return {
      kind: resolved,
      position: (row) => {
        const value = read(row);
        return value instanceof Date ? value.getTime() : Number(value);
      },
      format: (value) => (format ? format(new Date(value)) : dayFormat.format(value)),
    };
  }
  return {
    kind: resolved,
    position: (row) => Number(read(row)),
    format: (value) => (format ? format(value) : plainNumber.format(value)),
  };
}
