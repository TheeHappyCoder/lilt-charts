import { max } from 'd3-array';
import { useMemo, useRef } from 'react';
import { intlFormat } from '../motion/number-format';

export type CardAggregate = 'sum' | 'mean' | 'last' | 'max';

/** Observed values of a field, skipping gaps. */
export function valuesOf<Row>(rows: readonly Row[], key: string): number[] {
  const values: number[] = [];
  for (const row of rows) {
    const value = (row as Record<string, unknown>)[key];
    if (typeof value === 'number' && Number.isFinite(value)) values.push(value);
  }
  return values;
}

/** One number for a period. `null` when nothing was observed, never zero. */
export function summarize(values: readonly number[], aggregate: CardAggregate): number | null {
  if (!values.length) return null;
  if (aggregate === 'last') return values.at(-1)!;
  if (aggregate === 'max') return max(values)!;
  const sum = values.reduce((total, value) => total + value, 0);
  return aggregate === 'mean' ? sum / values.length : sum;
}

export interface CardFormatOptions {
  valueFormat?: Intl.NumberFormatOptions;
  locale?: string;
  formatValue?: (value: number) => string;
  formatAxisValue?: (value: number) => string;
}

export interface CardFormatters {
  /** Full value text for headlines, tiles, and pills. */
  value: (value: number) => string;
  /** Compact text for axis labels. */
  axis: (value: number) => string;
  /** Stable wrappers that always call the latest formatter, for memoized chart config. */
  stable: { value: (value: number) => string; axis: (value: number) => string };
  /** Changes only when the format itself changes. */
  key: string;
}

export function numberFormatters(locale: string, valueFormat?: Intl.NumberFormatOptions) {
  // An explicit minimum keeps engines from disagreeing about trailing zeros (Node prints
  // "$520K" where browsers printed "$520.0K" for compact currency), which also broke hydration.
  // A minimum above the default maximum, such as two decimals for prices, raises the maximum.
  const full = new Intl.NumberFormat(locale, {
    maximumFractionDigits: Math.max(1, valueFormat?.minimumFractionDigits ?? 0),
    minimumFractionDigits: 0,
    ...valueFormat,
  });
  const compact = new Intl.NumberFormat(locale, {
    ...valueFormat,
    notation: 'compact',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });
  const plain = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  return { full: intlFormat(full), compact: intlFormat(compact), plain: intlFormat(plain) };
}

/**
 * Card number formatting: `valueFormat` options, or full control with `formatValue`. Inline
 * formatters are read through a ref so they never rebuild the chart model.
 */
export function useCardFormat({
  valueFormat,
  locale = 'en-US',
  formatValue,
  formatAxisValue,
}: CardFormatOptions): CardFormatters {
  const formatKey = JSON.stringify(valueFormat ?? null);
  const built = useMemo(
    () => numberFormatters(locale, valueFormat),
    // valueFormat is usually an inline object; its serialized form is the real dependency.
    [locale, formatKey],
  );
  const value = formatValue ?? built.full;
  const axis = formatAxisValue ?? built.compact;
  const latest = useRef({ value, axis });
  latest.current = { value, axis };
  const stable = useMemo(
    () => ({
      value: (number: number) => latest.current.value(number),
      axis: (number: number) => latest.current.axis(number),
    }),
    [],
  );
  return { value, axis, stable, key: `${locale}|${formatKey}` };
}

/** Signed change text: +$1,200 or −$300. */
export function signedFormat(format: (value: number) => string) {
  return (value: number) => `${value < 0 ? '−' : '+'}${format(Math.abs(value))}`;
}
