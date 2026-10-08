'use client';

import { area, curveBasis, curveLinear } from 'd3-shape';
import type { CardSeries } from './cartesian-card';
import { resolveX, type NumericKey, type XKey } from './keys';
import {
  ObservationsCard,
  readField,
  readNumber,
  seriesColor,
  type ObservationsCardProps,
  type ObservationScene,
} from './observations-card';
import { bad } from './sculpted-geometry';

export interface StreamgraphCardProps<Row, Key extends NumericKey<Row>>
  extends ObservationsCardProps<Row> {
  x: XKey<Row>;
  series: readonly CardSeries<Key>[];
  curve?: 'smooth' | 'linear';
}
/** A centered, additive silhouette. Nonnegative thicknesses share one interpolator. */
export function streamgraphLayout<Row>(
  data: readonly Row[],
  x: string,
  series: readonly CardSeries<string>[],
  curve: 'smooth' | 'linear',
  width: number,
  height: number,
): ObservationScene<Row> {
  if (!series.length || new Set(series.map((s) => s.key)).size !== series.length)
    return bad('Stream layers need unique keys.');
  const position = resolveX(data, x),
    rows = data
      .map((row) => ({
        row,
        x: position.position(row),
        values: series.map((s) => readNumber(row, s.key)),
      }))
      .sort((a, b) => a.x - b.x);
  if (rows.some((r, i) => !Number.isFinite(r.x) || (i > 0 && r.x === rows[i - 1]!.x)))
    return bad('Stream positions must be finite and unique.');
  if (rows.some((r) => r.values.some((v) => v !== null && v < 0)))
    return bad('Stream thicknesses must be nonnegative.');
  const totals = rows.map((r) =>
    r.values.some((v) => v === null) ? null : r.values.reduce<number>((a, v) => a + v!, 0),
  );
  if (totals.some((v) => v !== null && !Number.isFinite(v)))
    return bad('Stream total exceeds the finite numeric range.');
  const max = Math.max(1, ...totals.map((v) => v ?? 0)),
    first = rows[0]?.x ?? 0,
    last = rows.at(-1)?.x ?? 1,
    bottom = height - 28;
  const px = (v: number) => 16 + ((v - first) / (last - first || 1)) * (width - 32),
    py = (v: number) => bottom / 2 - (v / max) * (bottom - 16);
  const scene: ObservationScene<Row> = {
    marks: [],
    paths: [],
    labels: [],
    readings: [],
    groups: [],
    highlightGroup: true,
    headline: totals.at(-1) ?? null,
  };
  series.forEach((s, i) => {
    const color = s.color ?? seriesColor(i),
      boundaries = rows.map((r, j) => {
        const total = totals[j];
        const lower =
          total === null
            ? null
            : -total / 2 + r.values.slice(0, i).reduce<number>((a, v) => a + v!, 0);
        return { x: px(r.x), lower, upper: lower === null ? null : lower + r.values[i]! };
      });
    const d = area<(typeof boundaries)[number]>()
      .defined((p) => p.lower !== null)
      .x((p) => p.x)
      .y0((p) => py(p.lower!))
      .y1((p) => py(p.upper!))
      .curve(curve === 'smooth' ? curveBasis : curveLinear)(boundaries);
    if (d)
      scene.paths!.push({
        id: s.key,
        d,
        fill: color,
        group: s.key,
        enter: 'rise',
        wave: i / series.length,
      });
    rows.forEach((r, j) => {
      const value = r.values[i]!,
        label = `${String(readField(r.row, x))} · ${s.label ?? s.key}`,
        id = JSON.stringify([r.x, s.key]);
      scene.readings!.push({ id, label, value });
      const b = boundaries[j]!;
      if (b.lower === null || value === null) return;
      // Inspect exact readings, while the ribbon is a visual interpolation between them.
      scene.marks.push({
        id,
        label,
        datum: r.row,
        value,
        x: b.x - 4,
        y: py((b.lower + b.upper!) / 2) - 4,
        width: 8,
        height: 8,
        color,
        shape: 'dot',
        group: s.key,
        wave: j / Math.max(1, rows.length - 1),
      });
    });
    scene.groups!.push({
      id: s.key,
      label: s.label ?? s.key,
      color,
      value: rows.at(-1)?.values[i] ?? null,
    });
  });
  const stride = Math.max(1, Math.ceil(rows.length / Math.max(2, Math.floor(width / 95))));
  rows.forEach((r, i) => {
    if (i % stride === 0 || i === rows.length - 1)
      scene.labels!.push({
        x: px(r.x),
        y: height - 5,
        text: position.format(r.x),
        anchor: i === 0 ? 'start' : i === rows.length - 1 ? 'end' : 'middle',
      });
  });
  scene.note =
    'Thickness carries value; the centered baseline is not zero. Dots inspect supplied observations. Incomplete periods break every layer.';
  return scene;
}
const demo = Array.from({ length: 9 }, (_, i) => ({
  x: i,
  a: 20 + Math.sin(i) * 10,
  b: 32 + Math.cos(i * 0.7) * 17,
  c: 18 + Math.sin(i * 0.5) * 12,
}));
export function StreamgraphCard<Row, const Key extends NumericKey<Row>>({
  x,
  series,
  curve = 'smooth',
  ...props
}: StreamgraphCardProps<Row, Key>) {
  return (
    <ObservationsCard
      {...props}
      family="streamgraph"
      layout={(d, w, h) => streamgraphLayout(d, x, series, curve, w, h)}
      placeholder={(w, h) =>
        streamgraphLayout(
          demo,
          'x',
          [{ key: 'a' }, { key: 'b' }, { key: 'c' }],
          curve,
          w,
          h,
        ) as unknown as ObservationScene<Row>
      }
    />
  );
}
