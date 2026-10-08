'use client';

import { min } from 'd3-array';
import { useMemo, type ReactElement } from 'react';
import { CartesianCard, type CardRange, type CartesianCardProps } from '../../cards/cartesian-card';
import { numberFormatters } from '../../cards/format';
import type { NumericKey } from '../../cards/keys';
import { Area } from '../../primitives/area';
import { Line } from '../../primitives/line';
import { drawdown } from '../indicators';
import { Pane } from './pane';

type SharedProps<Row, Key extends NumericKey<Row>> = Omit<
  CartesianCardProps<Row, Key>,
  'series' | 'headlineSeries' | 'pillSeries' | 'aggregate' | 'target' | 'forecast' | 'tiles'
>;

export interface PortfolioChartCardProps<Row, Key extends NumericKey<Row>>
  extends SharedProps<Row, Key> {
  /** Field holding the account's value. */
  value: Key;
  /** Field holding the cost basis: what went in. Drawn as a stepped dashed line. */
  basis?: Key;
  /** Names the value series. Defaults to "Value". */
  label?: string;
  /** Shade how far the value sits below its best in a linked pane. Defaults to true. */
  drawdown?: boolean;
  /** Drawdown pane height in pixels. Defaults to 64. */
  drawdownHeight?: number;
}

function numberAt(row: unknown, key: string | undefined): number | null {
  if (!key) return null;
  const value = (row as Record<string, unknown>)[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** Gain over the cost basis at the latest row, as a fraction. */
function gainOverBasis<Row>(data: readonly Row[], value: string, basis: string | undefined) {
  const last = data.at(-1);
  const worth = numberAt(last, value);
  const paid = numberAt(last, basis);
  return worth !== null && paid ? worth / paid - 1 : undefined;
}

/**
 * Account value next to its cost basis, with how far it sits below its best shaded in a
 * linked pane. The delta is the gain over basis; the pane reads the current and worst drawdown.
 */
export function PortfolioChartCard<Row, const Key extends NumericKey<Row>>({
  value,
  basis,
  label = 'Value',
  drawdown: showDrawdown = true,
  drawdownHeight = 64,
  data,
  ranges,
  delta,
  locale = 'en-US',
  ...props
}: PortfolioChartCardProps<Row, Key>): ReactElement {
  const current = data ?? ranges?.[0]?.data ?? [];
  const withGain = useMemo(
    () =>
      ranges?.map((range: CardRange<Row>) => ({
        ...range,
        delta: range.delta ?? gainOverBasis(range.data, value, basis),
      })),
    [ranges, value, basis],
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
  const worst = useMemo(() => {
    const falls = drawdown(current.map((row) => numberAt(row, value))).filter(
      (fall): fall is number => fall !== null,
    );
    return min(falls) ?? null;
  }, [current, value]);
  return (
    <CartesianCard
      {...props}
      data={data}
      ranges={withGain}
      delta={delta ?? (data ? gainOverBasis(data, value, basis) : undefined)}
      locale={locale}
      aggregate="last"
      headlineSeries={value}
      pillSeries={value}
      tiles={false}
      restCaption={basis ? () => 'over basis' : undefined}
      series={[
        { key: value, label },
        ...(basis ? [{ key: basis, label: 'Basis', dashed: true }] : []),
      ]}
      shape={{
        kind: 'marks',
        id: `portfolio:${value}:${basis}:${showDrawdown}:${props.depth}`,
        includeZero: false,
        xAxis: !showDrawdown,
        series: (key) =>
          key === basis
            ? { curve: 'step-after', color: 'var(--lilt-muted)' }
            : { area: { treatment: 'fade' }, curve: 'monotone' },
        draw: (ids) =>
          ids.map((id) => [<Area key={`area-${id}`} series={id} />, <Line key={id} series={id} />]),
      }}
      panes={
        showDrawdown
          ? (context) => {
              const falls = drawdown(context.data.map((row) => numberAt(row, value)));
              const fallAt = new Map(context.data.map((row, index) => [row, falls[index] ?? null]));
              return (
                <Pane
                  context={context}
                  label={`${props.title} drawdown`}
                  caption="Drawdown"
                  readout={(row) => (
                    <>
                      <span className="lilt-card__pane-value">
                        {fallAt.get(row) == null ? '—' : percent(fallAt.get(row)!)}
                      </span>
                      {worst !== null ? (
                        <span className="lilt-card__pane-value">Max {percent(worst)}</span>
                      ) : null}
                    </>
                  )}
                  height={drawdownHeight}
                  xAxis
                  y={{ includeZero: true, ticks: 2, format: percent }}
                  series={[
                    {
                      id: 'drawdown',
                      label: 'Drawdown',
                      accessor: (row: Row) => fallAt.get(row) ?? null,
                      color: 'var(--lilt-candle-down)',
                      formatValue: percent,
                      area: { treatment: 'fade' },
                      line: { width: 1.5 },
                      curve: 'monotone',
                    },
                  ]}
                >
                  <Area series="drawdown" />
                  <Line series="drawdown" />
                </Pane>
              );
            }
          : undefined
      }
    />
  );
}
