'use client';

import type { NumericKey, TextKey } from './keys';
import {
  ObservationsCard,
  seriesColor,
  type ObservationsCardProps,
  type ObservationScene,
} from './observations-card';
import { bezier, clamp, frame, polygon, ribbonMark, tint, type Point } from './sculpted-geometry';
import { linkReadings, placeholderLinks } from './link-readings';
import { EmptyShapeContext } from '../lifecycle/chart-empty';

export interface ChordLoomCardProps<Row, Key extends NumericKey<Row>>
  extends ObservationsCardProps<Row> {
  source: TextKey<Row>;
  target: TextKey<Row>;
  value: Key;
  /** Vertical proportion of the circular frame, 0.4–1. Default 0.68. */
  tilt?: number;
  /** Gap between node sectors in radians, 0–0.16. Default 0.06. */
  gap?: number;
}

export function chordLoomLayout<Row>(
  data: readonly Row[],
  source: string,
  target: string,
  value: string,
  width: number,
  height: number,
  options: { tilt?: number; gap?: number; color?: string } = {},
): ObservationScene<Row> {
  const { names, links, error } = linkReadings(data, source, target, value);
  if (error) return { marks: [], error };
  if (!links.length) return { marks: [] };
  const size = frame(width, height);
  const tilt = clamp(options.tilt, 0.68, 0.4, 1);
  const radius = Math.min((size.width - 112) / 2, (size.height - 68) / (2 * tilt));
  const cx = size.width / 2,
    cy = size.height / 2;
  const totals = names.map((name) =>
    links.reduce(
      (sum, link) => sum + (link.source === name || link.target === name ? (link.value ?? 0) : 0),
      0,
    ),
  );
  const total = totals.reduce((sum, n) => sum + n, 0);
  const readings = links.map((link) => ({
    id: link.id,
    label: `${link.source} → ${link.target}`,
    value: link.value,
  }));
  if (!Number.isFinite(total))
    return { marks: [], error: 'The sum of link values must be finite.' };
  if (!total) return { marks: [], readings, note: 'No positive flows to draw.' };
  const gap = Math.min(clamp(options.gap, 0.06, 0, 0.16), Math.PI / names.length);
  const unit = (Math.PI * 2 - names.length * gap) / total;
  let angle = -Math.PI / 2;
  const starts = totals.map((amount) => {
    const start = angle;
    angle += amount * unit + gap;
    return start;
  });
  const cursor = [...starts];
  const at = (a: number, r = radius, drop = 0): Point => [
    cx + Math.cos(a) * r,
    cy + Math.sin(a) * r * tilt + drop,
  ];
  const arc = (a: number, b: number, r: number, drop = 0) =>
    Array.from({ length: 25 }, (_, i) => at(a + ((b - a) * i) / 24, r, drop));
  const paths: NonNullable<ObservationScene<Row>['paths']> = [];
  const labels: NonNullable<ObservationScene<Row>['labels']> = [];
  names.forEach((name, index) => {
    const start = starts[index]!,
      end = start + totals[index]! * unit;
    const color = options.color ?? seriesColor(index);
    const rim = (drop: number) =>
      polygon([...arc(start, end, radius + 10, drop), ...arc(end, start, radius, drop)]);
    paths.push({
      id: `${name}-side`,
      d: rim(6),
      fill: tint(color, 44),
      enter: 'rise',
      wave: index / names.length,
      group: name,
    });
    paths.push({
      id: name,
      d: rim(0),
      fill: color,
      enter: 'rise',
      wave: index / names.length,
      group: name,
    });
    const mid = (start + end) / 2;
    const [x, y] = at(mid, radius + 23);
    labels.push({
      x,
      y: y + 4,
      text: name,
      anchor: Math.cos(mid) < -0.25 ? 'end' : Math.cos(mid) > 0.25 ? 'start' : 'middle',
    });
  });
  const marks = links.flatMap((link, index) => {
    if (link.value === null || link.value === 0) return [];
    const s = names.indexOf(link.source),
      t = names.indexOf(link.target);
    const a = cursor[s]!,
      b = cursor[t]!,
      span = link.value * unit;
    cursor[s]! += span;
    cursor[t]! += span;
    const a0 = at(a),
      a1 = at(a + span),
      b0 = at(b),
      b1 = at(b + span);
    const center: Point = [cx, cy + radius * 0.12];
    const points = [
      ...arc(a, a + span, radius),
      ...bezier(a1, center, center, b0),
      ...arc(b, b + span, radius),
      ...bezier(b1, center, center, a0),
    ];
    return [
      ribbonMark(
        {
          id: link.id,
          label: `${link.source} → ${link.target}`,
          datum: link.datum,
          value: link.value,
          color: options.color ?? seriesColor(s),
          group: link.source,
          layer: index + 1,
          wave: index / links.length,
        },
        points,
      ),
    ];
  });
  return {
    ...size,
    marks,
    paths,
    labels,
    readings,
    groups: names.map((name, i) => ({
      id: name,
      label: name,
      color: options.color ?? seriesColor(i),
      value: totals[i]!,
    })),
    note: 'Wider ribbons: more flow · Color follows the source · Node totals include both directions',
  };
}

export function ChordLoomCard<Row, const Key extends NumericKey<Row>>({
  source,
  target,
  value,
  tilt,
  gap,
  color,
  height = 340,
  ...props
}: ChordLoomCardProps<Row, Key>) {
  const options = { tilt, gap, color };
  return (
    <EmptyShapeContext.Provider value="ring">
      <ObservationsCard
        {...props}
        color={color}
        height={height}
        family="chord-loom"
        layout={(data, width, h) => chordLoomLayout(data, source, target, value, width, h, options)}
        placeholder={(width, h) =>
          chordLoomLayout(
            placeholderLinks,
            'source',
            'target',
            'value',
            width,
            h,
            options,
          ) as ObservationScene<Row>
        }
      />
    </EmptyShapeContext.Provider>
  );
}
