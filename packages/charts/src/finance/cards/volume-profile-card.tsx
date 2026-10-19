'use client';

import { useMemo, type ReactElement } from 'react';
import { tint } from '../../cards/sculpted-geometry';
import type { NumericKey } from '../../cards/keys';
import { numberFormatters } from '../../cards/format';
import {
  ObservationsCard,
  readNumber,
  type ObservationsCardProps,
  type ObservationScene,
} from '../../cards/observations-card';
import { EmptyShapeContext } from '../../lifecycle/chart-empty';
import { CANDLE_DOWN, CANDLE_UP } from '../candle-geometry';
import { niceTicks } from './scale';

export interface VolumeProfileCardProps<Row, Key extends NumericKey<Row>>
  extends Omit<ObservationsCardProps<Row>, 'color' | 'aggregate' | 'legend' | 'legendSwatch'> {
  /** Field holding each period's close. */
  close: Key;
  /** Field holding each period's traded volume. */
  volume: NumericKey<Row>;
  /** Open, so each period's volume counts as bought (close at or above open) or sold. */
  open?: NumericKey<Row>;
  /** High and low spread a period's volume over the prices it traded; otherwise it sits at close. */
  high?: NumericKey<Row>;
  low?: NumericKey<Row>;
  /** How many price bands to split the range into. Defaults to 24. */
  bins?: number;
  /** Share of volume the value area holds around the busiest price. Defaults to 0.7. */
  valueArea?: number;
  /** Volume format. Defaults to compact numbers. */
  volumeFormat?: Intl.NumberFormatOptions;
}

export interface VolumeBin {
  low: number;
  high: number;
  bought: number;
  sold: number;
}

export interface VolumeProfile {
  bins: VolumeBin[];
  /** The busiest band: the point of control. */
  poc: number;
  /** First and last band of the value area, inclusive. */
  area: readonly [number, number];
  total: number;
  last: number | null;
}

/**
 * Volume at each price. A period's volume is spread evenly over the prices between its low and
 * high, and counts as bought when it closed at or above its open (or the previous close).
 */
export function volumeProfile<Row>(
  data: readonly Row[],
  keys: { close: string; volume: string; open?: string; high?: string; low?: string },
  count: number,
  share: number,
): VolumeProfile | { error: string } | null {
  if (!Number.isInteger(count) || count < 2 || count > 200)
    return { error: 'Bins must be a whole number from 2 to 200.' };
  if (!(share > 0 && share <= 1))
    return { error: 'The value area must be a share above 0 and up to 1.' };
  const periods: { low: number; high: number; volume: number; up: boolean }[] = [];
  let previous: number | null = null;
  let last: number | null = null;
  for (const row of data) {
    const close = readNumber(row, keys.close);
    const volume = readNumber(row, keys.volume);
    if (close === null) continue;
    if (volume !== null && volume < 0) return { error: 'Volume must be nonnegative.' };
    const open = keys.open ? readNumber(row, keys.open) : null;
    const high = (keys.high ? readNumber(row, keys.high) : null) ?? close;
    const low = (keys.low ? readNumber(row, keys.low) : null) ?? close;
    if (low > high) return { error: 'Each low must be at or below its high.' };
    const reference = open ?? previous ?? close;
    if (volume) periods.push({ low, high, volume, up: close >= reference });
    previous = close;
    last = close;
  }
  if (!periods.length) return null;
  const floor = Math.min(...periods.map((period) => period.low));
  const ceiling = Math.max(...periods.map((period) => period.high));
  const span = ceiling - floor || Math.abs(ceiling) * 0.01 || 1;
  const bottom = ceiling === floor ? floor - span / 2 : floor;
  const step = span / count;
  const bins: VolumeBin[] = Array.from({ length: count }, (_, index) => ({
    low: bottom + index * step,
    high: bottom + (index + 1) * step,
    bought: 0,
    sold: 0,
  }));
  const add = (index: number, amount: number, up: boolean) => {
    const bin = bins[Math.max(0, Math.min(count - 1, index))]!;
    if (up) bin.bought += amount;
    else bin.sold += amount;
  };
  for (const period of periods) {
    if (period.high === period.low) {
      add(Math.floor((period.low - bottom) / step), period.volume, period.up);
      continue;
    }
    const first = Math.max(0, Math.floor((period.low - bottom) / step));
    const final = Math.min(count - 1, Math.floor((period.high - bottom) / step));
    for (let index = first; index <= final; index++) {
      const overlap =
        Math.min(period.high, bins[index]!.high) - Math.max(period.low, bins[index]!.low);
      if (overlap > 0)
        add(index, (period.volume * overlap) / (period.high - period.low), period.up);
    }
  }
  const sizes = bins.map((bin) => bin.bought + bin.sold);
  const total = sizes.reduce((sum, size) => sum + size, 0);
  const poc = sizes.indexOf(Math.max(...sizes));
  // Grow the value area from the busiest band toward whichever neighbour traded more.
  let from = poc;
  let to = poc;
  let held = sizes[poc]!;
  while (held < total * share && (from > 0 || to < count - 1)) {
    const below = from > 0 ? sizes[from - 1]! : -1;
    const above = to < count - 1 ? sizes[to + 1]! : -1;
    if (above >= below) held += sizes[++to]!;
    else held += sizes[--from]!;
  }
  return { bins, poc, area: [from, to], total, last };
}

export function volumeProfileLayout<Row>(
  data: readonly Row[],
  keys: { close: string; volume: string; open?: string; high?: string; low?: string },
  count: number,
  share: number,
  width: number,
  height: number,
  price: (value: number) => string,
  size: (value: number) => string,
): ObservationScene<Row> {
  const profile = volumeProfile(data, keys, count, share);
  if (profile === null) return { marks: [] };
  if ('error' in profile) return { marks: [], error: profile.error };
  const right = 64;
  const top = 6;
  const plot = Math.max(80, height - top - 6);
  const row = plot / count;
  const gap = Math.min(2, row / 4);
  const floor = profile.bins[0]!.low;
  const ceiling = profile.bins.at(-1)!.high;
  const y = (value: number) => top + (1 - (value - floor) / (ceiling - floor)) * plot;
  const widest = Math.max(...profile.bins.map((bin) => bin.bought + bin.sold)) || 1;
  const room = Math.max(40, width - right - 8);
  const scene: ObservationScene<Row> = {
    marks: [],
    paths: [],
    labels: niceTicks(floor, ceiling, 5)
      .filter((tick) => tick >= floor && tick <= ceiling)
      .map((tick) => ({ x: width - 4, y: y(tick) + 4, text: price(tick), anchor: 'end' as const })),
    readings: [],
    highlightGroup: true,
  };
  const [from, to] = profile.area;
  scene.paths!.push({
    id: 'value-area',
    d: `M0 ${y(profile.bins[to]!.high)} H${room} V${y(profile.bins[from]!.low)} H0Z`,
    fill: 'color-mix(in srgb, var(--lilt-text) 4%, transparent)',
  });
  profile.bins.forEach((bin, index) => {
    const volume = bin.bought + bin.sold;
    const inside = index >= from && index <= to;
    const band = `${price(bin.low)}–${price(bin.high)}`;
    const mid = (bin.low + bin.high) / 2;
    const edge = y(bin.high) + gap / 2;
    const thickness = Math.max(1, row - gap);
    const boughtWidth = (bin.bought / widest) * room;
    const soldWidth = (bin.sold / widest) * room;
    const group = String(index);
    const strength = index === profile.poc ? 100 : inside ? 82 : 38;
    const ids = [`${index}:bought`, `${index}:sold`];
    const wave = Math.abs(index - profile.poc) / count;
    if (bin.bought > 0)
      scene.marks.push({
        id: ids[0]!,
        label: `Bought at ${band}`,
        datum: null,
        value: mid,
        x: 0,
        y: edge,
        width: Math.max(1, boughtWidth),
        height: thickness,
        color: tint(CANDLE_UP, strength),
        group,
        related: ids,
        wave,
        detail: size(bin.bought),
      });
    if (bin.sold > 0)
      scene.marks.push({
        id: ids[1]!,
        label: `Sold at ${band}`,
        datum: null,
        value: mid,
        x: boughtWidth,
        y: edge,
        width: Math.max(1, soldWidth),
        height: thickness,
        color: tint(CANDLE_DOWN, strength),
        group,
        related: ids,
        wave,
        detail: size(bin.sold),
      });
    scene.readings!.push({
      id: group,
      label: band,
      value: volume,
      detail: `${size(volume)} traded`,
      description: [
        volume ? `${Math.round((bin.bought / volume) * 100)}% bought` : 'no volume',
        index === profile.poc ? 'point of control' : inside ? 'value area' : '',
      ]
        .filter(Boolean)
        .join(' · '),
    });
  });
  const poc = profile.bins[profile.poc]!;
  const pocY = (y(poc.high) + y(poc.low)) / 2;
  scene.paths!.push({
    id: 'poc',
    d: `M0 ${pocY} H${room}`,
    stroke: 'color-mix(in srgb, var(--lilt-text) 55%, transparent)',
    enter: 'draw',
  });
  scene.labels!.push({ x: room - 2, y: pocY - 5, text: 'POC', anchor: 'end' });
  if (profile.last !== null) {
    const lastY = y(profile.last);
    scene.paths!.push({
      id: 'last',
      d: `M0 ${lastY} H${room + 4}`,
      stroke: 'var(--lilt-series-1)',
      enter: 'draw',
    });
  }
  scene.headline = (poc.low + poc.high) / 2;
  scene.note = `Point of control ${price((poc.low + poc.high) / 2)}. Value area ${price(profile.bins[from]!.low)}–${price(profile.bins[to]!.high)}, ${Math.round(share * 100)}% of ${size(profile.total)} traded.${profile.last !== null ? ` Last close ${price(profile.last)}.` : ''}`;
  return scene;
}

const demo = Array.from({ length: 40 }, (_, index) => {
  const close = 100 + Math.sin(index / 5) * 8 + index * 0.2;
  return { close, open: close - Math.cos(index) * 2, volume: 1000 + (index % 7) * 300 };
});

const PRICE_FORMAT: Intl.NumberFormatOptions = {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
};

/**
 * Where a market traded: volume at each price as horizontal bars split into bought and sold,
 * the busiest price (point of control) marked, and the value area that holds most of the volume
 * shaded. The headline is the point of control; hover reads each band's volume.
 */
export function VolumeProfileCard<Row, const Key extends NumericKey<Row>>({
  close,
  volume,
  open,
  high,
  low,
  bins = 24,
  valueArea = 0.7,
  volumeFormat,
  locale = 'en-US',
  valueFormat = PRICE_FORMAT,
  formatValue,
  ...props
}: VolumeProfileCardProps<Row, Key>): ReactElement {
  const priceKey = JSON.stringify(valueFormat);
  const sizeKey = JSON.stringify(volumeFormat ?? null);
  const price = useMemo(() => numberFormatters(locale, valueFormat), [locale, priceKey]);
  const sizes = useMemo(() => numberFormatters(locale, volumeFormat), [locale, sizeKey]);
  const money = formatValue ?? price.full;
  const keys = { close, volume, open, high, low };
  return (
    <EmptyShapeContext.Provider value="bars">
      <ObservationsCard
        {...props}
        locale={locale}
        legend={false}
        valueFormat={valueFormat}
        formatValue={formatValue}
        family="volume-profile"
        layout={(data, width, height) =>
          volumeProfileLayout(data, keys, bins, valueArea, width, height, money, sizes.compact)
        }
        placeholder={(width, height) =>
          volumeProfileLayout(
            demo,
            { close: 'close', open: 'open', volume: 'volume' },
            bins,
            valueArea,
            width,
            height,
            money,
            sizes.compact,
          ) as unknown as ObservationScene<Row>
        }
      />
    </EmptyShapeContext.Provider>
  );
}
