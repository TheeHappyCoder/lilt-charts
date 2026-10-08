'use client';

import { useMemo, type ReactElement } from 'react';
import { CartesianCard, type CardRange, type CartesianCardProps } from '../../cards/cartesian-card';
import { numberFormatters } from '../../cards/format';
import type { NumericKey } from '../../cards/keys';
import { Area } from '../../primitives/area';
import { Bar } from '../../primitives/bar';
import { Line } from '../../primitives/line';
import type { ChartSeries, ChartTooltipContext } from '../../types';
import { CANDLE_DOWN, CANDLE_UP, type CandleDisplay } from '../candle-geometry';
import { Candles } from '../candles';
import { Pane } from './pane';

type SharedProps<Row, Key extends NumericKey<Row>> = Omit<
  CartesianCardProps<Row, Key>,
  | 'series'
  | 'headlineSeries'
  | 'pillSeries'
  | 'aggregate'
  | 'target'
  | 'forecast'
  | 'bleed'
  | 'tiles'
>;

export interface CandlestickChartCardProps<Row, Key extends NumericKey<Row>>
  extends SharedProps<Row, Key> {
  /** Fields holding each period's open, high, low and close. */
  open: Key;
  high: Key;
  low: Key;
  close: Key;
  /** Field holding traded volume, drawn as a linked pane under the price. */
  volume?: Key;
  /**
   * `candle` (default), `hollow` rising bodies, `ohlc` bars, or `area` for the close alone,
   * colored by the period's direction.
   */
  display?: CandleDisplay | 'area';
  /**
   * Draws each candle body as a solid block receding up and to the right; the front keeps open
   * and close. OHLC bars and the area stay flat.
   */
  depth?: boolean;
  /** `log` spaces prices by ratio, for long histories. Defaults to `linear`. */
  scale?: 'linear' | 'log';
  /** Names the price series in hover. Defaults to "Price". */
  label?: string;
  /** Follow the newest candle as rows arrive, with a control to return to it. */
  live?: boolean;
  /** Plot height in pixels. Defaults to 240. */
  height?: number;
  /** Volume pane height in pixels. Defaults to 64. */
  volumeHeight?: number;
}

function numberAt<Row>(row: Row, key: string): number | null {
  const value = (row as Record<string, unknown>)[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** Change from the first open to the last close. */
export function periodChange<Row>(data: readonly Row[], open: string, close: string) {
  const first = data.length ? numberAt(data[0]!, open) : null;
  const last = data.length ? numberAt(data.at(-1)!, close) : null;
  return first && last !== null ? last / first - 1 : undefined;
}

/** A hovered candle's open, high and low, formatted for the headline caption. */
export function describeCandle(format: (value: number) => string) {
  return (inspection: ChartTooltipContext): string | null => {
    const fields = inspection.series[0]?.fields;
    if (!fields?.length || fields.some((field) => field.value === null)) return null;
    return fields.map((field) => `${field.label[0]} ${format(field.value!)}`).join('  ');
  };
}

const PRICE_FORMAT: Intl.NumberFormatOptions = {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
};

/**
 * A market chart card: open-high-low-close candles (or an area of the close) with an optional
 * linked volume pane, a headline that follows the hovered candle, and its open, high and low
 * beside the date.
 */
export function CandlestickChartCard<Row, const Key extends NumericKey<Row>>({
  open,
  high,
  low,
  close,
  volume,
  display = 'candle',
  depth = false,
  scale = 'linear',
  label = 'Price',
  live = false,
  data,
  ranges,
  delta,
  valueFormat = PRICE_FORMAT,
  locale = 'en-US',
  volumeHeight = 64,
  ...props
}: CandlestickChartCardProps<Row, Key>): ReactElement {
  const detailFormat = useMemo(
    () => numberFormatters(locale, valueFormat).full,
    [locale, JSON.stringify(valueFormat)],
  );
  const volumeFormat = useMemo(() => numberFormatters(locale).compact, [locale]);
  const withChange = useMemo(
    () =>
      ranges?.map((range: CardRange<Row>) => ({
        ...range,
        delta: range.delta ?? periodChange(range.data, open, close),
      })),
    [ranges, open, close],
  );
  const current = data ?? ranges?.[0]?.data ?? [];
  const rising = (periodChange(current, open, close) ?? 0) >= 0;
  const up = (row: never) => (numberAt(row, close) ?? 0) >= (numberAt(row, open) ?? 0);
  const area = display === 'area';
  const fields: ChartSeries<never>['fields'] = {
    open: { label: 'Open', accessor: (row) => numberAt(row, open) },
    high: { label: 'High', accessor: (row) => numberAt(row, high) },
    low: { label: 'Low', accessor: (row) => numberAt(row, low) },
  };
  return (
    <CartesianCard
      {...props}
      depth={depth}
      data={data}
      ranges={withChange}
      delta={delta ?? (data ? periodChange(data, open, close) : undefined)}
      valueFormat={valueFormat}
      locale={locale}
      aggregate="last"
      tiles={false}
      live={live}
      series={[
        {
          key: close,
          label,
          color: area ? (rising ? CANDLE_UP : CANDLE_DOWN) : undefined,
        },
      ]}
      shape={{
        kind: 'marks',
        id: `candles:${display}:${depth}:${scale}:${open}:${high}:${low}:${Boolean(volume)}`,
        includeZero: false,
        scale,
        slots: true,
        xAxis: !volume,
        series: () =>
          area
            ? { fields, area: { treatment: 'fade' }, curve: 'linear' }
            : { fields, line: { showInspectionPoint: false } },
        describe: describeCandle(detailFormat),
        draw: (ids) =>
          ids.map((id) =>
            area ? (
              [<Area key={`area-${id}`} series={id} />, <Line key={`line-${id}`} series={id} />]
            ) : (
              <Candles
                key={id}
                series={id}
                open="open"
                high="high"
                low="low"
                display={display}
                depth={depth}
              />
            ),
          ),
      }}
      panes={
        volume
          ? (context) => (
              <Pane
                context={context}
                label={`${props.title} volume`}
                caption="Volume"
                height={volumeHeight}
                xAxis
                y={{ includeZero: true, ticks: 2, format: volumeFormat }}
                bars={{ series: ['volume'] }}
                series={[
                  {
                    id: 'volume',
                    label: 'Volume',
                    accessor: (row: Row) => numberAt(row, volume),
                    formatValue: volumeFormat,
                    colorAt: (row: Row) =>
                      up(row as never)
                        ? 'color-mix(in srgb, var(--lilt-candle-up) 42%, transparent)'
                        : 'color-mix(in srgb, var(--lilt-candle-down) 42%, transparent)',
                    bar: { radius: 1 },
                  },
                ]}
              >
                <Bar series="volume" />
              </Pane>
            )
          : undefined
      }
    />
  );
}
