'use client';

import { useMemo, type ReactElement, type ReactNode } from 'react';
import {
  CartesianCard,
  type CardPaneContext,
  type CardRange,
  type CartesianCardProps,
} from '../../cards/cartesian-card';
import { numberFormatters } from '../../cards/format';
import type { NumericKey } from '../../cards/keys';
import { ReferenceBand } from '../../primitives/annotations';
import { Bar } from '../../primitives/bar';
import { IntervalBand } from '../../primitives/interval-band';
import { Line } from '../../primitives/line';
import { ReferenceLine } from '../../primitives/reference-line';
import type { ChartSeries } from '../../types';
import { CANDLE_DOWN, CANDLE_UP, type CandleDisplay } from '../candle-geometry';
import { Candles } from '../candles';
import { bollinger, ema, macd, rsi, sma } from '../indicators';
import { describeCandle, periodChange } from './candlestick-chart-card';
import { Pane } from './pane';

/** A line over the price: a simple or exponential average, or Bollinger bands. */
export type IndicatorOverlay =
  | 'sma'
  | 'ema'
  | 'bollinger'
  | { kind: 'sma' | 'ema'; period: number }
  | { kind: 'bollinger'; period?: number; deviations?: number };

/** A linked pane under the price. */
export type IndicatorPane =
  | 'rsi'
  | 'macd'
  | 'volume'
  | { kind: 'rsi'; period: number }
  | { kind: 'macd'; fast?: number; slow?: number; signal?: number };

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

export interface IndicatorChartCardProps<Row, Key extends NumericKey<Row>>
  extends SharedProps<Row, Key> {
  /** Field holding each period's close; every indicator derives from it. */
  close: Key;
  /** Fields for candles. With all three, the price draws as candles; otherwise as a line. */
  open?: Key;
  high?: Key;
  low?: Key;
  /** Field holding traded volume, for a `volume` pane. */
  volume?: Key;
  /** `candle`, `hollow`, `ohlc`, or `line`. Defaults to candles when open, high and low are set. */
  display?: CandleDisplay | 'line';
  /** Lines drawn over the price. Defaults to none. */
  overlays?: readonly IndicatorOverlay[];
  /** Linked panes under the price, top to bottom. Defaults to RSI then MACD. */
  panes?: readonly IndicatorPane[];
  /** Names the price series in hover. Defaults to "Price". */
  label?: string;
  scale?: 'linear' | 'log';
  live?: boolean;
  /** Height of each indicator pane in pixels. Defaults to 72. */
  paneHeight?: number;
}

/**
 * Rows copied with indicator values under reserved keys. Typed as numbers so every key is a
 * valid card key; the source fields, including x, ride along untouched.
 */
type IndicatorRow = Record<string, number | null>;

interface OverlaySpec {
  id: string;
  label: string;
  kind: 'sma' | 'ema' | 'bollinger';
  period: number;
  deviations: number;
}

interface PaneSpec {
  kind: 'rsi' | 'macd' | 'volume';
  id: string;
  period: number;
  fast: number;
  slow: number;
  signal: number;
}

function overlaySpecs(overlays: readonly IndicatorOverlay[]): OverlaySpec[] {
  return overlays.map((overlay, index) => {
    const item = typeof overlay === 'string' ? { kind: overlay } : overlay;
    const period =
      'period' in item && item.period !== undefined
        ? item.period
        : item.kind === 'bollinger'
          ? 20
          : 20;
    const deviations = 'deviations' in item && item.deviations !== undefined ? item.deviations : 2;
    const name = item.kind === 'bollinger' ? 'BB' : item.kind.toUpperCase();
    return {
      id: `__overlay${index}`,
      label: `${name} ${period}`,
      kind: item.kind,
      period,
      deviations,
    };
  });
}

function paneSpecs(panes: readonly IndicatorPane[]): PaneSpec[] {
  return panes.map((pane, index) => {
    const item = typeof pane === 'string' ? { kind: pane } : pane;
    return {
      kind: item.kind,
      id: `__pane${index}`,
      period: 'period' in item && item.period !== undefined ? item.period : 14,
      fast: 'fast' in item && item.fast !== undefined ? item.fast : 12,
      slow: 'slow' in item && item.slow !== undefined ? item.slow : 26,
      signal: 'signal' in item && item.signal !== undefined ? item.signal : 9,
    };
  });
}

function numberAt(row: unknown, key: string | undefined): number | null {
  if (!key) return null;
  const value = (row as Record<string, unknown>)[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** Copies each row with every indicator's values under reserved keys. */
function withIndicators<Row>(
  data: readonly Row[],
  close: string,
  overlays: readonly OverlaySpec[],
  panes: readonly PaneSpec[],
): IndicatorRow[] {
  const closes = data.map((row) => numberAt(row, close));
  const rows = data.map((row) => ({ ...(row as unknown as IndicatorRow) }));
  const assign = (key: string, values: readonly (number | null)[]) =>
    values.forEach((value, index) => (rows[index]![key] = value));
  for (const overlay of overlays) {
    if (overlay.kind === 'bollinger') {
      const bands = bollinger(closes, overlay.period, overlay.deviations);
      assign(overlay.id, bands.middle);
      assign(`${overlay.id}Upper`, bands.upper);
      assign(`${overlay.id}Lower`, bands.lower);
    } else assign(overlay.id, (overlay.kind === 'sma' ? sma : ema)(closes, overlay.period));
  }
  for (const pane of panes) {
    if (pane.kind === 'rsi') assign(pane.id, rsi(closes, pane.period));
    if (pane.kind === 'macd') {
      const result = macd(closes, pane.fast, pane.slow, pane.signal);
      assign(`${pane.id}Macd`, result.macd);
      assign(`${pane.id}Signal`, result.signal);
      assign(`${pane.id}Histogram`, result.histogram);
    }
  }
  return rows;
}

const PRICE_FORMAT: Intl.NumberFormatOptions = {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
};
const OVERLAY_COLORS = ['var(--lilt-series-4)', 'var(--lilt-series-3)', 'var(--lilt-series-5)'];

/**
 * Price with technical indicators: moving averages or Bollinger bands over candles or a line, and
 * RSI, MACD or volume panes below that move together as you hover.
 */
export function IndicatorChartCard<Row, const Key extends NumericKey<Row>>({
  close,
  open,
  high,
  low,
  volume,
  display: suppliedDisplay,
  overlays = [],
  panes = ['rsi', 'macd'],
  label = 'Price',
  scale = 'linear',
  live = false,
  data,
  ranges,
  delta,
  valueFormat = PRICE_FORMAT,
  locale = 'en-US',
  paneHeight = 72,
  ...props
}: IndicatorChartCardProps<Row, Key>): ReactElement {
  const candles = Boolean(open && high && low);
  const display = suppliedDisplay ?? (candles ? 'candle' : 'line');
  if (display !== 'line' && !candles)
    throw new Error('Lilt IndicatorChartCard candles need open, high and low fields.');
  const overlayKey = JSON.stringify(overlays);
  const paneKey = JSON.stringify(panes);
  const overlayList = useMemo(() => overlaySpecs(overlays), [overlayKey]);
  const paneList = useMemo(() => paneSpecs(panes), [paneKey]);
  if (paneList.some((pane) => pane.kind === 'volume') && !volume)
    throw new Error('Lilt IndicatorChartCard needs a `volume` field for a volume pane.');
  const rows = useMemo(
    () => (data ? withIndicators(data, close, overlayList, paneList) : undefined),
    [data, close, overlayList, paneList],
  );
  const rangeRows = useMemo(
    () =>
      ranges?.map(
        (range: CardRange<Row>): CardRange<IndicatorRow> => ({
          ...range,
          data: withIndicators(range.data, close, overlayList, paneList),
          delta: range.delta ?? (open ? periodChange(range.data, open, close) : undefined),
        }),
      ),
    [ranges, close, open, overlayList, paneList],
  );
  const detailFormat = useMemo(
    () => numberFormatters(locale, valueFormat).full,
    [locale, JSON.stringify(valueFormat)],
  );
  const indicatorFormat = useMemo(
    () => numberFormatters(locale, { maximumFractionDigits: 2 }).full,
    [locale],
  );
  const volumeFormat = useMemo(() => numberFormatters(locale).compact, [locale]);
  const candleFields: ChartSeries<never>['fields'] = candles
    ? {
        open: { label: 'Open', accessor: (row) => numberAt(row, open) },
        high: { label: 'High', accessor: (row) => numberAt(row, high) },
        low: { label: 'Low', accessor: (row) => numberAt(row, low) },
      }
    : undefined;
  const overlayById = new Map(overlayList.map((overlay) => [overlay.id, overlay]));
  const firstClose = data?.length ? numberAt(data[0], close) : null;
  const lastClose = data?.length ? numberAt(data.at(-1), close) : null;
  const rising = firstClose === null || lastClose === null || lastClose >= firstClose;
  const lastPane = paneList.at(-1)?.id;

  const renderPane = (pane: PaneSpec, context: CardPaneContext<IndicatorRow>) => {
    const xAxis = pane.id === lastPane;
    const value = (key: string) => (row: IndicatorRow) => numberAt(row, key);
    const readoutValue = (row: IndicatorRow, key: string, name?: string): ReactNode => {
      const reading = numberAt(row, key);
      return (
        <span key={key} className="lilt-card__pane-value">
          {name ? `${name} ` : ''}
          {reading === null ? '—' : indicatorFormat(reading)}
        </span>
      );
    };
    if (pane.kind === 'volume')
      return (
        <Pane
          key={pane.id}
          context={context}
          label={`${props.title} volume`}
          caption="Volume"
          readout={(row) => (
            <span className="lilt-card__pane-value">
              {numberAt(row, volume) === null ? '—' : volumeFormat(numberAt(row, volume)!)}
            </span>
          )}
          height={paneHeight}
          xAxis={xAxis}
          y={{ includeZero: true, ticks: 2, format: volumeFormat }}
          bars={{ series: ['volume'] }}
          series={[
            {
              id: 'volume',
              label: 'Volume',
              accessor: value(volume!),
              formatValue: volumeFormat,
              colorAt: (row) =>
                (numberAt(row, close) ?? 0) >= (numberAt(row, open) ?? numberAt(row, close) ?? 0)
                  ? 'color-mix(in srgb, var(--lilt-candle-up) 42%, transparent)'
                  : 'color-mix(in srgb, var(--lilt-candle-down) 42%, transparent)',
              bar: { radius: 1 },
            },
          ]}
        >
          <Bar series="volume" />
        </Pane>
      );
    if (pane.kind === 'rsi')
      return (
        <Pane
          key={pane.id}
          context={context}
          label={`${props.title} RSI ${pane.period}`}
          caption={`RSI ${pane.period}`}
          readout={(row) => readoutValue(row, pane.id)}
          height={paneHeight}
          xAxis={xAxis}
          y={{ domain: [0, 100], ticks: 2, format: (tick) => String(Math.round(tick)) }}
          series={[
            {
              id: pane.id,
              label: `RSI ${pane.period}`,
              accessor: value(pane.id),
              color: 'var(--lilt-series-1)',
              formatValue: indicatorFormat,
              line: { width: 1.5, depth: props.depth },
            },
          ]}
        >
          <ReferenceBand axis="y" from={30} to={70} color="var(--lilt-series-1)" />
          <ReferenceLine value={70} color="var(--lilt-muted)" />
          <ReferenceLine value={30} color="var(--lilt-muted)" />
          <Line series={pane.id} />
        </Pane>
      );
    const macdKey = `${pane.id}Macd`;
    const signalKey = `${pane.id}Signal`;
    const histogramKey = `${pane.id}Histogram`;
    return (
      <Pane
        key={pane.id}
        context={context}
        label={`${props.title} MACD`}
        caption={`MACD ${pane.fast} · ${pane.slow} · ${pane.signal}`}
        readout={(row) => [readoutValue(row, macdKey), readoutValue(row, signalKey, 'Signal')]}
        height={paneHeight}
        xAxis={xAxis}
        y={{ includeZero: true, ticks: 2, format: indicatorFormat }}
        bars={{ series: [histogramKey] }}
        series={[
          {
            id: histogramKey,
            label: 'Histogram',
            accessor: value(histogramKey),
            formatValue: indicatorFormat,
            colorAt: (row) =>
              (numberAt(row, histogramKey) ?? 0) >= 0
                ? 'color-mix(in srgb, var(--lilt-candle-up) 55%, transparent)'
                : 'color-mix(in srgb, var(--lilt-candle-down) 55%, transparent)',
            bar: { radius: 1 },
          },
          {
            id: macdKey,
            label: 'MACD',
            accessor: value(macdKey),
            color: 'var(--lilt-series-4)',
            formatValue: indicatorFormat,
            line: { width: 1.5, depth: props.depth },
          },
          {
            id: signalKey,
            label: 'Signal',
            accessor: value(signalKey),
            color: 'var(--lilt-series-3)',
            formatValue: indicatorFormat,
            line: { width: 1.5, dasharray: '3 3' },
          },
        ]}
      >
        <Bar series={histogramKey} />
        <Line series={macdKey} />
        <Line series={signalKey} />
      </Pane>
    );
  };

  return (
    <CartesianCard<IndicatorRow, string>
      {...(props as unknown as Omit<CartesianCardProps<IndicatorRow, string>, 'series'>)}
      data={rows}
      ranges={rangeRows}
      delta={delta ?? (data && open ? periodChange(data, open, close) : undefined)}
      valueFormat={valueFormat}
      locale={locale}
      aggregate="last"
      headlineSeries={close}
      pillSeries={close}
      tiles={false}
      live={live}
      series={[
        {
          key: close,
          label,
          color: display === 'line' ? (rising ? CANDLE_UP : CANDLE_DOWN) : undefined,
        },
        ...overlayList.map((overlay, index) => ({
          key: overlay.id,
          label: overlay.label,
          color: OVERLAY_COLORS[index % OVERLAY_COLORS.length],
        })),
      ]}
      shape={{
        kind: 'marks',
        id: `indicator:${display}:${scale}:${open}:${high}:${low}:${overlayKey}:${paneKey}`,
        includeZero: false,
        scale,
        slots: true,
        xAxis: paneList.length === 0,
        series: (key) => {
          const overlay = overlayById.get(key);
          if (!overlay)
            return display === 'line'
              ? { fields: candleFields, curve: 'linear', line: { width: 2, depth: props.depth } }
              : { fields: candleFields };
          return {
            curve: 'monotone',
            line: { width: 1.5, showInspectionPoint: false, depth: props.depth },
            ...(overlay.kind === 'bollinger'
              ? {
                  fields: {
                    upper: {
                      label: 'Upper',
                      accessor: (row: never) => numberAt(row, `${overlay.id}Upper`),
                    },
                    lower: {
                      label: 'Lower',
                      accessor: (row: never) => numberAt(row, `${overlay.id}Lower`),
                    },
                  },
                }
              : {}),
          };
        },
        describe: candles ? describeCandle(detailFormat) : undefined,
        draw: (ids) =>
          ids.map((id) => {
            const overlay = overlayById.get(id);
            if (overlay)
              return overlay.kind === 'bollinger' ? (
                [
                  <IntervalBand key={`band-${id}`} series={id} lower="lower" upper="upper" />,
                  <Line key={`line-${id}`} series={id} />,
                ]
              ) : (
                <Line key={id} series={id} />
              );
            return display === 'line' ? (
              <Line key={id} series={id} />
            ) : (
              <Candles
                key={id}
                series={id}
                open="open"
                high="high"
                low="low"
                display={display}
                depth={props.depth}
              />
            );
          }),
      }}
      panes={
        paneList.length
          ? (context) => <>{paneList.map((pane) => renderPane(pane, context))}</>
          : undefined
      }
    />
  );
}
