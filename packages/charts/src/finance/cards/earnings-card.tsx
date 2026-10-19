'use client';

import { useMemo, type ReactElement } from 'react';
import type { NumericKey, TextKey } from '../../cards/keys';
import { numberFormatters } from '../../cards/format';
import {
  ObservationsCard,
  readField,
  readNumber,
  type ObservationsCardProps,
  type ObservationScene,
} from '../../cards/observations-card';
import { EmptyShapeContext } from '../../lifecycle/chart-empty';
import { CANDLE_DOWN, CANDLE_UP } from '../candle-geometry';
import { percentFormat, signedPercent } from './change-tone';
import { niceTicks } from './scale';

export interface EarningsCardProps<Row, Key extends NumericKey<Row>>
  extends Omit<ObservationsCardProps<Row>, 'color' | 'aggregate' | 'legend' | 'legendSwatch'> {
  /** Text field naming each reporting period, such as "Q1 '26". Input order sets position. */
  period: TextKey<Row>;
  /** The consensus estimate, drawn as a ring. */
  estimate: Key;
  /** The reported result, drawn as a dot colored by beat or miss. Null for a period still to come. */
  actual: NumericKey<Row>;
}

/** How far a result came in above (positive) or below its estimate, as a fraction of it. */
export function surprise(estimate: number | null, actual: number | null): number | null {
  if (estimate === null || actual === null || estimate === 0) return null;
  return (actual - estimate) / Math.abs(estimate);
}

export function earningsLayout<Row>(
  data: readonly Row[],
  period: string,
  estimate: string,
  actual: string,
  width: number,
  height: number,
  money: (value: number) => string,
  axis: (value: number) => string,
  percent: (value: number) => string,
): ObservationScene<Row> {
  if (!data.length) return { marks: [] };
  const rows = data.map((datum) => ({
    datum,
    name: String(readField(datum, period) ?? ''),
    estimate: readNumber(datum, estimate),
    actual: readNumber(datum, actual),
  }));
  const names = new Set<string>();
  for (const row of rows) {
    if (!row.name.trim() || names.has(row.name))
      return { marks: [], error: 'Each period needs a unique, nonempty name.' };
    names.add(row.name);
  }
  const values = rows.flatMap((row) =>
    [row.estimate, row.actual].filter((value): value is number => value !== null),
  );
  if (!values.length) return { marks: [] };
  const low = Math.min(...values);
  const high = Math.max(...values);
  const pad = (high - low || Math.abs(high) || 1) * 0.18;
  const ticks = niceTicks(low - pad, high + pad, 3);
  const bottomValue = Math.min(ticks[0]!, low - pad);
  const topValue = Math.max(ticks.at(-1)!, high + pad);
  const left = 48;
  const top = 26;
  const bottom = 26;
  const plotHeight = Math.max(80, height - top - bottom);
  const y = (value: number) =>
    top + (1 - (value - bottomValue) / (topValue - bottomValue || 1)) * plotHeight;
  const slot = (width - left) / rows.length;
  const size = Math.max(10, Math.min(22, slot * 0.34));
  const scene: ObservationScene<Row> = {
    marks: [],
    paths: ticks.map((tick) => ({
      id: `tick-${tick}`,
      d: `M${left} ${y(tick)} H${width}`,
      stroke: 'color-mix(in srgb, var(--lilt-border) 70%, transparent)',
    })),
    labels: ticks.map((tick) => ({
      x: left - 10,
      y: y(tick) + 4,
      text: axis(tick),
      anchor: 'end' as const,
    })),
    readings: [],
  };
  let beats = 0;
  let reported = 0;
  rows.forEach((row, index) => {
    const center = left + (index + 0.5) * slot;
    const wave = index / rows.length;
    const change = surprise(row.estimate, row.actual);
    const beat = row.actual !== null && row.estimate !== null && row.actual >= row.estimate;
    if (row.actual !== null && row.estimate !== null) {
      reported++;
      if (beat) beats++;
    }
    const ids = [`${row.name}:estimate`, `${row.name}:actual`];
    scene.labels!.push({ x: center, y: top + plotHeight + 18, text: row.name, anchor: 'middle' });
    if (row.estimate !== null && row.actual !== null)
      scene.paths!.push({
        id: `gap-${row.name}`,
        d: `M${center} ${y(row.estimate)} V${y(row.actual)}`,
        stroke: beat ? CANDLE_UP : CANDLE_DOWN,
        related: ids,
        enter: 'draw',
        wave,
      });
    if (change !== null && slot >= 44)
      scene.labels!.push({
        x: center,
        y: Math.min(y(row.estimate!), y(row.actual!)) - size / 2 - 8,
        text: signedPercent(change, percent),
        anchor: 'middle',
      });
    const status =
      row.actual === null
        ? 'Upcoming'
        : row.estimate === null
          ? 'No estimate'
          : `${beat ? 'Beat' : 'Missed'} by ${signedPercent(change ?? 0, percent).slice(1)}`;
    if (row.estimate !== null)
      scene.marks.push({
        id: ids[0]!,
        label: `${row.name} estimate`,
        datum: row.datum,
        value: row.estimate,
        x: center - size / 2,
        y: y(row.estimate) - size / 2,
        width: size,
        height: size,
        color: 'var(--lilt-muted)',
        shape: 'dot',
        future: true,
        related: ids,
        layer: 1,
        wave,
        description: row.actual === null ? 'Upcoming' : `reported ${money(row.actual)}`,
      });
    if (row.actual !== null)
      scene.marks.push({
        id: ids[1]!,
        label: `${row.name} reported`,
        datum: row.datum,
        value: row.actual,
        x: center - size / 2,
        y: y(row.actual) - size / 2,
        width: size,
        height: size,
        color: row.estimate === null ? 'var(--lilt-series-1)' : beat ? CANDLE_UP : CANDLE_DOWN,
        shape: 'dot',
        related: ids,
        layer: 2,
        wave,
        description: status,
      });
    scene.readings!.push({
      id: row.name,
      label: row.name,
      value: row.actual,
      detail: row.actual === null ? 'Upcoming' : money(row.actual),
      description:
        row.estimate === null
          ? status
          : `estimate ${money(row.estimate)} · ${status.toLowerCase()}`,
    });
  });
  const latest = [...rows].reverse().find((row) => row.actual !== null);
  scene.headline = latest?.actual ?? null;
  scene.note = reported
    ? `Beat the estimate ${beats} of ${reported} ${reported === 1 ? 'time' : 'times'}. Rings are the consensus estimate; dots the reported result.`
    : 'Rings are the consensus estimate; dots the reported result.';
  return scene;
}

const demo = Array.from({ length: 6 }, (_, index) => ({
  period: `Q${(index % 4) + 1}`,
  estimate: 1 + index * 0.1,
  actual: 1 + index * 0.1 + (index % 2 ? -0.05 : 0.08),
})).map((row, index) => ({ ...row, period: `${row.period} ${index}` }));

/**
 * Earnings against expectations: each period's consensus estimate as a ring and the reported
 * result as a dot, green for a beat and red for a miss, with the surprise above. The headline is
 * the latest result and the chip its surprise.
 */
export function EarningsCard<Row, const Key extends NumericKey<Row>>({
  period,
  estimate,
  actual,
  data,
  ranges,
  delta,
  locale = 'en-US',
  valueFormat = {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  },
  formatValue,
  ...props
}: EarningsCardProps<Row, Key>): ReactElement {
  const formatKey = JSON.stringify(valueFormat);
  const formats = useMemo(() => numberFormatters(locale, valueFormat), [locale, formatKey]);
  const money = formatValue ?? formats.full;
  const percent = useMemo(() => percentFormat(locale), [locale]);
  const latestSurprise = useMemo(
    () => (rows: readonly Row[]) => {
      const latest = [...rows].reverse().find((row) => readNumber(row, actual) !== null);
      return latest ? surprise(readNumber(latest, estimate), readNumber(latest, actual)) : null;
    },
    [estimate, actual],
  );
  // Each period's chip is its own latest surprise.
  const periods = useMemo(
    () =>
      ranges?.map((range) => ({
        ...range,
        delta: range.delta ?? latestSurprise(range.data) ?? undefined,
      })),
    [ranges, latestSurprise],
  );
  return (
    <EmptyShapeContext.Provider value="points">
      <ObservationsCard
        {...props}
        data={data}
        ranges={periods}
        delta={delta ?? (data ? (latestSurprise(data) ?? undefined) : undefined)}
        locale={locale}
        legend={false}
        valueFormat={valueFormat}
        formatValue={formatValue}
        family="earnings"
        layout={(rows, width, height) =>
          earningsLayout(rows, period, estimate, actual, width, height, money, money, percent)
        }
        placeholder={(width, height) =>
          earningsLayout(
            demo,
            'period',
            'estimate',
            'actual',
            width,
            height,
            money,
            money,
            percent,
          ) as unknown as ObservationScene<Row>
        }
      />
    </EmptyShapeContext.Provider>
  );
}
