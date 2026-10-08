import type { ChartObservationStatus, ChartSeries, ChartXConfig } from '../types';

export interface NormalizedRow<T> {
  datum: T;
  sourceIndex: number;
  x: number;
  categoryId?: string;
  values: Readonly<Record<string, number | null>>;
  statuses: Readonly<Record<string, ChartObservationStatus>>;
  /** Companion field values by series ID, then field ID. Series without fields map to {}. */
  fields: Readonly<Record<string, Readonly<Record<string, number | null>>>>;
}

export interface NormalizedData<T> {
  rows: readonly NormalizedRow<T>[];
  series: readonly ChartSeries<T>[];
  xType: 'time' | 'number' | 'category';
}

function formatRow(index: number): string {
  return `row ${index + 1}`;
}

function validateAppearance<T>(descriptor: ChartSeries<T>): void {
  for (const [id, field] of Object.entries(descriptor.fields ?? {})) {
    if (!id.trim())
      throw new Error(`Invalid fields for series "${descriptor.id}": field IDs must be non-empty.`);
    if (typeof field?.accessor !== 'function' || !field.label?.trim())
      throw new Error(
        `Invalid field "${id}" for series "${descriptor.id}": expected a label and an accessor.`,
      );
  }
  const nonNegative = [
    ['line.width', descriptor.line?.width],
    ['line.pointRadius', descriptor.line?.pointRadius],
    ['line.pointStrokeWidth', descriptor.line?.pointStrokeWidth],
    ['bar.radius', descriptor.bar?.radius],
    ['bar.strokeWidth', descriptor.bar?.strokeWidth],
  ] as const;
  const opacity = [
    ['line.opacity', descriptor.line?.opacity],
    ['area.opacity', descriptor.area?.opacity],
    ['bar.fillOpacity', descriptor.bar?.fillOpacity],
  ] as const;
  for (const [name, value] of nonNegative)
    if (value !== undefined && (!Number.isFinite(value) || value < 0))
      throw new Error(
        `Invalid ${name} for series "${descriptor.id}": expected a non-negative finite number.`,
      );
  for (const [name, value] of opacity)
    if (value !== undefined && (!Number.isFinite(value) || value < 0 || value > 1))
      throw new Error(
        `Invalid ${name} for series "${descriptor.id}": expected a number from 0 to 1.`,
      );
}

function normalizeX<T>(row: T, index: number, x: ChartXConfig<T>): number {
  if (x.type === 'category') return index;
  let value: Date | number;
  try {
    value = x.accessor(row);
  } catch {
    throw new Error(`Invalid x at ${formatRow(index)}: accessor threw an error.`);
  }

  if (x.type === 'time') {
    const timestamp = value instanceof Date ? value.getTime() : value;
    if (!Number.isFinite(timestamp)) {
      throw new Error(
        `Invalid x at ${formatRow(index)}: expected a valid Date or finite epoch milliseconds.`,
      );
    }
    return timestamp;
  }

  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Invalid x at ${formatRow(index)}: expected a finite number.`);
  }
  return value;
}

function normalizeY<T>(row: T, index: number, descriptor: ChartSeries<T>): number | null {
  let value: number | null;
  try {
    value = descriptor.accessor(row);
  } catch {
    throw new Error(
      `Invalid value for series "${descriptor.id}" at ${formatRow(index)}: accessor threw an error.`,
    );
  }

  if (value === null) return null;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(
      `Invalid value for series "${descriptor.id}" at ${formatRow(index)}: expected a finite number or null.`,
    );
  }
  return value;
}

export function normalizeData<T>(
  data: readonly T[],
  series: readonly ChartSeries<T>[],
  x: ChartXConfig<T>,
): NormalizedData<T> {
  const ids = new Set<string>();
  for (const descriptor of series) {
    if (!descriptor.id) throw new Error('Invalid series: every series must have a non-empty id.');
    if (ids.has(descriptor.id)) {
      throw new Error(`Invalid series: duplicate series id "${descriptor.id}".`);
    }
    validateAppearance(descriptor);
    ids.add(descriptor.id);
  }

  const rows: NormalizedRow<T>[] = [];
  const categoryIds = new Set<string>();
  let previousX: number | undefined;
  data.forEach((datum, sourceIndex) => {
    let categoryId: string | undefined;
    if (x.type === 'category') {
      try {
        categoryId = x.accessor(datum);
      } catch {
        throw new Error(`Invalid category at ${formatRow(sourceIndex)}: accessor threw an error.`);
      }
      if (typeof categoryId !== 'string' || categoryId.trim() === '')
        throw new Error(
          `Invalid category at ${formatRow(sourceIndex)}: expected a non-empty string ID.`,
        );
      if (categoryIds.has(categoryId))
        throw new Error(
          `Invalid category at ${formatRow(sourceIndex)}: duplicate ID "${categoryId}".`,
        );
      categoryIds.add(categoryId);
    }
    const numericX = normalizeX(datum, sourceIndex, x);
    if (previousX !== undefined && numericX === previousX) {
      throw new Error(`Invalid x at ${formatRow(sourceIndex)}: duplicate x value ${numericX}.`);
    }
    if (previousX !== undefined && numericX < previousX) {
      throw new Error(
        `Invalid x at ${formatRow(sourceIndex)}: x values must be strictly ascending.`,
      );
    }
    previousX = numericX;

    const values: Record<string, number | null> = {};
    const statuses: Record<string, ChartObservationStatus> = {};
    const fields: Record<string, Record<string, number | null>> = {};
    for (const descriptor of series) {
      values[descriptor.id] = normalizeY(datum, sourceIndex, descriptor);
      const fieldValues: Record<string, number | null> = {};
      for (const [id, field] of Object.entries(descriptor.fields ?? {})) {
        let value: number | null;
        try {
          value = field.accessor(datum);
        } catch {
          throw new Error(
            `Invalid field "${id}" for series "${descriptor.id}" at ${formatRow(sourceIndex)}: accessor threw an error.`,
          );
        }
        if (value !== null && (typeof value !== 'number' || !Number.isFinite(value)))
          throw new Error(
            `Invalid field "${id}" for series "${descriptor.id}" at ${formatRow(sourceIndex)}: expected a finite number or null.`,
          );
        fieldValues[id] = value;
      }
      fields[descriptor.id] = fieldValues;
      let observationStatus: ChartObservationStatus = 'observed';
      if (descriptor.status) {
        try {
          observationStatus = descriptor.status(datum);
        } catch {
          throw new Error(
            `Invalid status for series "${descriptor.id}" at ${formatRow(sourceIndex)}: accessor threw an error.`,
          );
        }
        if (
          observationStatus !== 'observed' &&
          observationStatus !== 'provisional' &&
          observationStatus !== 'forecast'
        )
          throw new Error(
            `Invalid status for series "${descriptor.id}" at ${formatRow(sourceIndex)}: expected observed, provisional or forecast.`,
          );
      }
      statuses[descriptor.id] = observationStatus;
    }
    rows.push({ datum, sourceIndex, x: numericX, categoryId, values, statuses, fields });
  });

  return { rows, series, xType: x.type };
}

export function hasFiniteValue<T>(data: NormalizedData<T>, seriesId?: string): boolean {
  return data.rows.some((row) =>
    seriesId
      ? row.values[seriesId] !== null && Number.isFinite(row.values[seriesId] as number)
      : Object.values(row.values).some((value) => value !== null && Number.isFinite(value)),
  );
}

export function hasMatchingTopology<T>(
  a: NormalizedData<T>,
  b: NormalizedData<T>,
  series: readonly ChartSeries<T>[],
): boolean {
  if (a.rows.length !== b.rows.length || a.xType !== b.xType) return false;
  return a.rows.every((row, index) => {
    const other = b.rows[index];
    if (!other || row.x !== other.x || row.categoryId !== other.categoryId) return false;
    return series.every((descriptor) => {
      const first = row.values[descriptor.id];
      const second = other.values[descriptor.id];
      return (
        (first === null) === (second === null) &&
        sameFieldPresence(row.fields[descriptor.id], other.fields[descriptor.id]) &&
        row.statuses[descriptor.id] === other.statuses[descriptor.id]
      );
    });
  });
}

function sameFieldPresence(
  a: Readonly<Record<string, number | null>> | undefined,
  b: Readonly<Record<string, number | null>> | undefined,
): boolean {
  const ids = new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})]);
  for (const id of ids) if ((a?.[id] == null) !== (b?.[id] == null)) return false;
  return true;
}
