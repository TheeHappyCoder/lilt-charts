'use client';

import type { NumericKey, TextKey, XKey } from './keys';
import {
  ObservationsCard,
  readField,
  readNumber,
  seriesColor,
  type ObservationsCardProps,
  type ObservationScene,
} from './observations-card';
import {
  bad,
  clamp,
  frame,
  identity,
  polygon,
  strokeRibbon,
  tint,
  type Point,
} from './sculpted-geometry';
import { EmptyShapeContext } from '../lifecycle/chart-empty';

export interface EventHelixCardProps<Row, Key extends NumericKey<Row>>
  extends ObservationsCardProps<Row> {
  /** Unique event label, including for simultaneous events. */
  label: TextKey<Row>;
  date: XKey<Row>;
  value: Key;
  group?: TextKey<Row>;
  /** One revolution per UTC day or week. Default day. */
  cycle?: 'day' | 'week';
  /** Vertical spacing between turns, 26–100 pixels. Default 54. */
  pitch?: number;
}

export const placeholderEvents = Array.from({ length: 22 }, (_, i) => ({
  event: `Event ${i + 1}`,
  date: new Date(Date.UTC(2026, 8, 28, i * 5)).toISOString(),
  value: 3 + ((i * 7) % 16),
  group: ['API', 'Worker', 'Edge'][i % 3]!,
}));

function timestamp(value: unknown): number {
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}(?:$|T.*(?:Z|[+-]\d{2}:\d{2})$)/i.test(value)
  )
    return NaN;
  return Date.parse(value);
}

export function eventHelixLayout<Row>(
  data: readonly Row[],
  label: string,
  date: string,
  value: string,
  width: number,
  height: number,
  options: { group?: string; cycle?: 'day' | 'week'; pitch?: number; color?: string } = {},
): ObservationScene<Row> {
  const seen = new Set<string>(),
    groups: string[] = [];
  const items: { name: string; time: number; value: number | null; datum: Row; group?: string }[] =
    [];
  for (const datum of data) {
    const name = readField(datum, label),
      time = timestamp(readField(datum, date)),
      n = readNumber(datum, value);
    if (typeof name !== 'string' || seen.has(name))
      return bad('Every event needs a unique text label.');
    if (!Number.isFinite(time) || !Number.isFinite(new Date(time).getTime()))
      return bad(
        'Dates must be valid Dates, epoch milliseconds, or ISO dates with an explicit time zone.',
      );
    if (n !== null && n < 0) return bad('Event magnitudes cannot be negative.');
    seen.add(name);
    const group = options.group ? readField(datum, options.group) : undefined;
    if (options.group && typeof group !== 'string') return bad('Every event needs a text group.');
    if (typeof group === 'string' && !groups.includes(group)) groups.push(group);
    items.push({
      name,
      time,
      value: n,
      datum,
      group: typeof group === 'string' ? group : undefined,
    });
  }
  if (!items.length) return { marks: [] };
  items.sort((a, b) => a.time - b.time);
  const duration = options.cycle === 'week' ? 604800000 : 86400000;
  const anchor = options.cycle === 'week' ? 345600000 : 0;
  const start = Math.floor((items[0]!.time - anchor) / duration) * duration + anchor;
  const turns = Math.floor((items.at(-1)!.time - start) / duration) + 1;
  if (turns > 60)
    return bad('Show at most 60 cycles at once; use a larger cycle or a shorter date range.');
  const pitch = clamp(options.pitch, 54, 26, 100);
  const size = frame(width, Math.max(height, turns * pitch + 108));
  const radius = Math.min((size.width - 110) / 2, 180),
    ellipse = Math.min(38, radius * 0.24);
  const rise = (size.height - ellipse * 2 - 60) / turns;
  const point = (t: number): Point => {
    const angle = t * Math.PI * 2 - Math.PI / 2;
    return [
      size.width / 2 + Math.cos(angle) * radius,
      size.height - 30 - ellipse - t * rise + Math.sin(angle) * ellipse,
    ];
  };
  const paths: NonNullable<ObservationScene<Row>['paths']> = [];
  for (let i = 0; i < turns * 24; i++) {
    const t = i / 24;
    const points = Array.from({ length: 5 }, (_, j) => point(t + j / 96));
    paths.push({
      id: `coil-${i}`,
      d: polygon(strokeRibbon(points, 4)),
      fill: tint(
        options.color ?? seriesColor(0),
        24 + (Math.sin(t * Math.PI * 2 - Math.PI / 2) + 1) * 18,
      ),
      enter: 'rise',
      wave: i / (turns * 24),
      shade: (i % 24) / 24,
    });
  }
  const max = Math.max(1, ...items.map((item) => item.value ?? 0));
  const marks = items.map((item, index) => {
    const t = (item.time - start) / duration;
    const [x, y] = point(t);
    const diameter = item.value === null ? 8 : 8 + Math.sqrt(item.value / max) * 16;
    return {
      id: identity(item.name),
      label: `${item.name} · ${new Date(item.time).toISOString().replace('T', ' ').slice(0, 16)} UTC`,
      datum: item.datum,
      value: item.value,
      group: item.group,
      x: x - diameter / 2,
      y: y - diameter / 2,
      width: diameter,
      height: diameter,
      color: options.color ?? seriesColor(item.group ? groups.indexOf(item.group) : 0),
      shape: 'dot' as const,
      layer: Math.round(t * 100) + 1,
      wave: index / items.length,
      missing: item.value === null,
    };
  });
  const labels = Array.from({ length: turns }, (_, i) => ({
    x: size.width / 2 - radius - 10,
    y: point(i + 0.75)[1] + 4,
    text: new Date(start + i * duration).toISOString().slice(5, 10),
    anchor: 'end' as const,
  }));
  return {
    ...size,
    marks,
    paths,
    labels,
    groups: groups.map((name, i) => ({
      id: name,
      label: name,
      color: options.color ?? seriesColor(i),
      value: items
        .filter((item) => item.group === name)
        .reduce((sum, item) => sum + (item.value ?? 0), 0),
    })),
    note: `One turn per UTC ${options.cycle ?? 'day'} · Time rises from bottom to top · Larger beads: larger events`,
  };
}

export function EventHelixCard<Row, const Key extends NumericKey<Row>>({
  label,
  date,
  value,
  group,
  cycle,
  pitch,
  color,
  height = 360,
  ...props
}: EventHelixCardProps<Row, Key>) {
  const options = { group, cycle, pitch, color };
  return (
    <EmptyShapeContext.Provider value="ring">
      <ObservationsCard
        {...props}
        color={color}
        height={height}
        family="event-helix"
        layout={(data, width, h) => eventHelixLayout(data, label, date, value, width, h, options)}
        placeholder={(width, h) =>
          eventHelixLayout(placeholderEvents, 'event', 'date', 'value', width, h, {
            ...options,
            group: 'group',
          }) as ObservationScene<Row>
        }
      />
    </EmptyShapeContext.Provider>
  );
}
