'use client';

import { useMemo, type ReactElement, type ReactNode } from 'react';
import {
  CartesianCard,
  type CardRange,
  type CardSeries,
  type CartesianCardProps,
} from '../../cards/cartesian-card';
import { numberFormatters, signedFormat } from '../../cards/format';
import type { NumericKey } from '../../cards/keys';
import { Area } from '../../primitives/area';
import { Line } from '../../primitives/line';
import { CANDLE_DOWN, CANDLE_UP } from '../candle-geometry';
import { rebase } from '../indicators';

type SharedProps<Row, Key extends NumericKey<Row>> = Omit<
  CartesianCardProps<Row, Key>,
  'series' | 'headlineSeries' | 'pillSeries' | 'aggregate' | 'target' | 'forecast' | 'tiles'
>;

export interface PriceChartCardProps<Row, Key extends NumericKey<Row>>
  extends SharedProps<Row, Key> {
  /** Field holding the price, or any level such as protocol TVL. */
  price: Key;
  /** Ticker shown in the heading, e.g. "SOL". */
  symbol?: string;
  /** Full name beside the ticker, e.g. "Solana". */
  name?: string;
  /** A logo or glyph before the ticker. */
  icon?: ReactNode;
  /** `area` (default) or `line`. */
  display?: 'area' | 'line';
  /**
   * Other instruments to compare. Every series is then rebased to its change since the first
   * row, so different price levels share one axis.
   */
  versus?: readonly CardSeries<Key>[];
}

type PriceRow = Record<string, number | null>;

function numberAt(row: unknown, key: string): number | null {
  const value = (row as Record<string, unknown>)[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function firstToLast<Row>(data: readonly Row[], key: string) {
  const values = data.map((row) => numberAt(row, key)).filter((v): v is number => v !== null);
  return values.length > 1 ? { first: values[0]!, last: values.at(-1)! } : null;
}

/** Rows with each compared series' change since the first row under a reserved key. */
function rebased<Row>(data: readonly Row[], keys: readonly string[]): PriceRow[] {
  const rows = data.map((row) => ({ ...(row as unknown as PriceRow) }));
  for (const key of keys)
    rebase(data.map((row) => numberAt(row, key))).forEach(
      (value, index) => (rows[index]![`__rebased${key}`] = value),
    );
  return rows;
}

const PRICE_FORMAT: Intl.NumberFormatOptions = {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
};

/**
 * A ticker card: symbol and name, the latest price, and its signed change over the period, over
 * an area colored by direction. With `versus`, every instrument is rebased to percent change.
 */
export function PriceChartCard<Row, const Key extends NumericKey<Row>>({
  price,
  symbol,
  name,
  icon,
  display = 'area',
  versus,
  data,
  ranges,
  delta,
  valueFormat = PRICE_FORMAT,
  locale = 'en-US',
  title,
  ...props
}: PriceChartCardProps<Row, Key>): ReactElement {
  const comparing = Boolean(versus?.length);
  const keys = useMemo(
    () => [price, ...(versus ?? []).map((item) => item.key)] as string[],
    [price, versus],
  );
  const rows = useMemo(
    () => (data ? (comparing ? rebased(data, keys) : (data as unknown as PriceRow[])) : undefined),
    [data, comparing, keys],
  );
  const rangeRows = useMemo(
    () =>
      ranges?.map((range: CardRange<Row>): CardRange<PriceRow> => {
        const span = firstToLast(range.data, price);
        return {
          ...range,
          data: comparing ? rebased(range.data, keys) : (range.data as unknown as PriceRow[]),
          delta: range.delta ?? (span && span.first ? span.last / span.first - 1 : undefined),
        };
      }),
    [ranges, comparing, keys, price],
  );
  const current = data ?? ranges?.[0]?.data ?? [];
  const span = firstToLast(current, price);
  const rising = !span || span.last >= span.first;
  const money = useMemo(
    () => numberFormatters(locale, valueFormat).full,
    [locale, JSON.stringify(valueFormat)],
  );
  const percent = useMemo(
    () =>
      numberFormatters(locale, {
        style: 'percent',
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }).full,
    [locale],
  );
  const keyOf = (key: string) => (comparing ? `__rebased${key}` : key);
  const heading = (
    <span className="lilt-card__ticker">
      {icon ? <span className="lilt-card__ticker-icon">{icon}</span> : null}
      <span className="lilt-card__ticker-symbol">{symbol ?? title}</span>
      {name ? <span className="lilt-card__ticker-name">{name}</span> : null}
    </span>
  );
  return (
    <CartesianCard<PriceRow, string>
      {...(props as unknown as Omit<CartesianCardProps<PriceRow, string>, 'series'>)}
      title={title}
      aria-label={props['aria-label'] ?? title ?? symbol ?? name ?? 'Price chart'}
      heading={title || symbol || name || icon ? heading : undefined}
      data={rows}
      ranges={rangeRows}
      delta={
        comparing
          ? undefined
          : (delta ?? (data && span && span.first ? span.last / span.first - 1 : undefined))
      }
      valueFormat={comparing ? { style: 'percent', maximumFractionDigits: 1 } : valueFormat}
      formatValue={comparing ? (value: number) => signedFormat(percent)(value) : props.formatValue}
      locale={locale}
      aggregate="last"
      headlineSeries={keyOf(price)}
      pillSeries={comparing ? 'nearest' : keyOf(price)}
      tiles={comparing}
      restCaption={
        comparing
          ? undefined
          : (rows) => {
              const change = firstToLast(rows, price);
              return change ? signedFormat(money)(change.last - change.first) : null;
            }
      }
      series={[
        {
          key: keyOf(price),
          label: symbol ?? title,
          color: comparing ? undefined : rising ? CANDLE_UP : CANDLE_DOWN,
        },
        ...(versus ?? []).map((item) => ({ ...item, key: keyOf(item.key) })),
      ]}
      shape={{
        kind: 'marks',
        id: `price:${display}:${keys.join()}:${comparing}`,
        includeZero: comparing,
        series: () =>
          display === 'area' && !comparing
            ? { area: { treatment: 'fade' }, curve: 'monotone' }
            : { curve: 'monotone' },
        draw: (ids) =>
          ids.map((id) =>
            display === 'area' && !comparing ? (
              [<Area key={`area-${id}`} series={id} />, <Line key={id} series={id} />]
            ) : (
              <Line key={id} series={id} />
            ),
          ),
      }}
      bleed={props.bleed ?? true}
    />
  );
}
