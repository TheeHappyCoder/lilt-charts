'use client';

import { useMemo, type ReactElement } from 'react';
import { useChartContext } from '../../chart-context';
import {
  CartesianCard,
  type CardSeries,
  type CartesianCardProps,
} from '../../cards/cartesian-card';
import type { NumericKey, TextKey, XKey } from '../../cards/keys';
import { Line } from '../../primitives/line';

type SharedProps<Row, Key extends NumericKey<Row>> = Omit<
  CartesianCardProps<Row, Key>,
  | 'x'
  | 'series'
  | 'headlineSeries'
  | 'pillSeries'
  | 'aggregate'
  | 'target'
  | 'forecast'
  | 'xType'
  | 'formatX'
  | 'compare'
  | 'decimate'
>;

export interface YieldCurveCardProps<Row, Key extends NumericKey<Row>>
  extends SharedProps<Row, Key> {
  /** Text field naming each maturity, shortest first, such as "3M", "2Y" or "10Y". */
  maturity: TextKey<Row>;
  /** Field holding today's yield at that maturity, in percent: 4.21 is 4.21%. */
  yield: Key;
  /** Names today's curve. Defaults to "Today". */
  label?: string;
  /** Earlier curves to compare, such as a month or a year ago. Drawn dashed. */
  versus?: readonly CardSeries<Key>[];
  /**
   * The two maturities whose gap is the headline, short then long. Defaults to 2Y and 10Y when
   * the curve has both, otherwise its shortest and longest. A negative spread is an inversion.
   */
  spread?: readonly [string, string];
}

function numberAt(row: unknown, key: string): number | null {
  const value = (row as Record<string, unknown>)[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** The gap between two maturities of one curve, long minus short, in percentage points. */
export function curveSpread<Row>(
  data: readonly Row[],
  maturity: string,
  key: string,
  spread?: readonly [string, string],
): { short: string; long: string; value: number | null } | null {
  if (data.length < 2) return null;
  const names = data.map((row) => String((row as Record<string, unknown>)[maturity] ?? ''));
  const [short, long] =
    spread ??
    (names.includes('2Y') && names.includes('10Y') ? ['2Y', '10Y'] : [names[0]!, names.at(-1)!]);
  const at = (name: string) => {
    const index = names.indexOf(name);
    return index < 0 ? null : numberAt(data[index], key);
  };
  const a = at(short);
  const b = at(long);
  return { short, long, value: a === null || b === null ? null : b - a };
}

/** A faint red band over every stretch where the curve falls as maturities lengthen. */
function Inversions({ series }: { series: string }): ReactElement | null {
  const { snapshot } = useChartContext<unknown>();
  const rows = snapshot.data.rows;
  const { top, bottom } = snapshot.plot;
  const bands: { x: number; width: number }[] = [];
  for (let index = 1; index < rows.length; index++) {
    const a = rows[index - 1]!.values[series];
    const b = rows[index]!.values[series];
    if (a == null || b == null || b >= a) continue;
    const x = snapshot.xToPixel(rows[index - 1]!.x);
    const width = snapshot.xToPixel(rows[index]!.x) - x;
    const previous = bands.at(-1);
    if (previous && Math.abs(previous.x + previous.width - x) < 0.5) previous.width += width;
    else bands.push({ x, width });
  }
  if (!bands.length) return null;
  return (
    <g className="lilt-card__inversions" aria-hidden="true">
      {bands.map((band) => (
        <rect key={band.x} x={band.x} y={top} width={band.width} height={bottom - top} />
      ))}
    </g>
  );
}

const percentPoints = (value: number) => `${value.toFixed(2)}%`;

/**
 * Yield against maturity: today's curve over earlier ones, with every stretch where longer
 * money yields less (an inversion) shaded. The headline is the spread between two maturities,
 * 2Y to 10Y by default; hover reads each maturity's yield.
 */
export function YieldCurveCard<Row, const Key extends NumericKey<Row>>({
  maturity,
  yield: yieldKey,
  label = 'Today',
  versus,
  spread,
  data,
  ranges,
  headline,
  formatValue = percentPoints,
  ...props
}: YieldCurveCardProps<Row, Key>): ReactElement {
  const current = data ?? ranges?.[0]?.data ?? [];
  const gap = useMemo(
    () => curveSpread(current, maturity, yieldKey, spread),
    [current, maturity, yieldKey, spread],
  );
  // Each period's headline is its own spread.
  const periods = useMemo(
    () =>
      ranges?.map((range) => ({
        ...range,
        headline:
          range.headline ?? curveSpread(range.data, maturity, yieldKey, spread)?.value ?? undefined,
      })),
    [ranges, maturity, yieldKey, spread],
  );
  return (
    <CartesianCard
      {...props}
      data={data}
      ranges={periods}
      x={maturity as unknown as XKey<Row>}
      xType="category"
      headline={headline ?? gap?.value ?? undefined}
      aggregate="last"
      headlineSeries={yieldKey}
      pillSeries={yieldKey}
      tiles={props.tiles ?? Boolean(versus?.length)}
      formatValue={formatValue}
      restCaption={
        gap
          ? (rows) => {
              const now = curveSpread(rows, maturity, yieldKey, spread);
              if (!now || now.value === null) return `${gap.short}–${gap.long} spread`;
              return `${now.short}–${now.long} spread${now.value < 0 ? ' · inverted' : ''}`;
            }
          : undefined
      }
      series={[
        { key: yieldKey, label },
        ...(versus ?? []).map((item) => ({ ...item, dashed: true })),
      ]}
      shape={{
        kind: 'marks',
        id: `yield:${yieldKey}:${(versus ?? []).map((item) => item.key).join()}:${props.depth}`,
        includeZero: false,
        series: (key) =>
          key === yieldKey
            ? { curve: 'monotone', line: { width: 2, points: true, depth: props.depth } }
            : { curve: 'monotone' },
        draw: (ids) => [
          <Inversions key="inversions" series={yieldKey} />,
          ...ids.map((id) => <Line key={id} series={id} />),
        ],
      }}
      bleed={props.bleed ?? false}
    />
  );
}
