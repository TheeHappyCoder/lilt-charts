'use client';

import type { NumericKey, TextKey } from './keys';
import type { CardSeries } from './cartesian-card';
import {
  ObservationsCard,
  readField,
  readNumber,
  seriesColor,
  type ObservationsCardProps,
  type ObservationScene,
} from './observations-card';
import { bad, ribbonMark, tint, type Point } from './sculpted-geometry';

export interface ViolinCardProps<Row, Key extends NumericKey<Row>>
  extends ObservationsCardProps<Row> {
  category: TextKey<Row>;
  value: Key;
  label?: TextKey<Row>;
  points?: boolean;
  /** Kernel bandwidth in measurement units; defaults to a data-derived bandwidth per group. */
  bandwidth?: number;
  scale?: 'width' | 'density';
}
export interface CorrelationMatrixCardProps<Row, Key extends NumericKey<Row>>
  extends ObservationsCardProps<Row> {
  metrics: readonly CardSeries<Key>[];
  /** Minimum complete pairs per coefficient; defaults to 3. */
  minPairs?: number;
}

export function quantileSorted(values: readonly number[], p: number): number | null {
  if (!values.length) return null;
  const index = (values.length - 1) * p,
    lo = Math.floor(index),
    fraction = index - lo;
  return values[lo]! * (1 - fraction) + values[Math.ceil(index)]! * fraction;
}
export function violinDensity(values: readonly number[], bandwidth?: number) {
  const sorted = [...values].sort((a, b) => a - b),
    median = quantileSorted(sorted, 0.5);
  if (median === null) return null;
  const min = sorted[0]!,
    max = sorted.at(-1)!,
    range = max - min;
  const spread = (quantileSorted(sorted, 0.75)! - quantileSorted(sorted, 0.25)!) / 1.34;
  const h =
    bandwidth ??
    Math.max(
      (spread || range || Math.abs(median) || 1) * 0.9 * Math.pow(values.length, -0.2),
      range / 100 || 0.001,
    );
  if (
    !Number.isFinite(h) ||
    h <= 0 ||
    !Number.isFinite(range) ||
    !Number.isFinite(min - h) ||
    !Number.isFinite(max + h)
  )
    return null;
  const low = min - h,
    high = max + h;
  const points = Array.from({ length: 65 }, (_, i) => {
    const x = low + ((high - low) * i) / 64;
    const density =
      values.reduce((sum, v) => {
        const u = (x - v) / h;
        return sum + (Math.abs(u) <= 1 ? (0.75 * (1 - u * u)) / h : 0);
      }, 0) / values.length;
    return { x, density };
  });
  return { points, median, low, high, bandwidth: h };
}
export function violinLayout<Row>(
  data: readonly Row[],
  category: string,
  value: string,
  label: string | undefined,
  points: boolean,
  bandwidth: number | undefined,
  scale: 'width' | 'density',
  width: number,
  height: number,
): ObservationScene<Row> {
  if (bandwidth !== undefined && (!Number.isFinite(bandwidth) || bandwidth <= 0))
    return bad('Bandwidth must be a positive finite measurement.');
  const categories = [...new Set(data.map((r) => readField(r, category)))];
  if (categories.some((c) => typeof c !== 'string' || !c.trim()))
    return bad('Every sample needs a nonempty category.');
  const groups = categories.map((name) => {
    const rows = data
      .map((row, i) => ({
        row,
        id: String(i),
        label: label ? String(readField(row, label)) : `Sample ${i + 1}`,
        value: readNumber(row, value),
      }))
      .filter((r) => readField(r.row, category) === name);
    const known = rows.flatMap((r) => (r.value === null ? [] : [r.value]));
    return { name: String(name), rows, known, density: violinDensity(known, bandwidth) };
  });
  if (groups.some((g) => g.known.length && !g.density))
    return bad('Sample range exceeds the supported numeric range.');
  const low = Math.min(...groups.flatMap((g) => (g.density ? [g.density.low] : []))),
    high = Math.max(...groups.flatMap((g) => (g.density ? [g.density.high] : [])));
  const scene: ObservationScene<Row> = {
    marks: [],
    paths: [],
    labels: [],
    readings: [],
    groups: [],
    highlightGroup: true,
    width: Math.max(width, groups.length * 78),
  };
  const w = scene.width!,
    lane = (w - 44) / Math.max(1, groups.length),
    py = (v: number) => height - 28 - ((v - low) / (high - low || 1)) * (height - 48),
    maxDensity = Math.max(
      1e-12,
      ...groups.flatMap((g) => g.density?.points.map((p) => p.density) ?? []),
    );
  groups.forEach((g, i) => {
    const cx = 36 + lane * (i + 0.5),
      color = seriesColor(i),
      d = g.density;
    g.rows.forEach((r) =>
      scene.readings!.push({ id: r.id, label: `${g.name} · ${r.label}`, value: r.value }),
    );
    scene.labels!.push({ x: cx, y: height - 5, text: g.name, anchor: 'middle' });
    scene.groups!.push({ id: g.name, label: g.name, color, value: d?.median ?? null });
    if (!d) return;
    const peak = scale === 'density' ? maxDensity : Math.max(...d.points.map((p) => p.density));
    const edges = d.points.map(
      (p): Point => [cx + (p.density / (peak || 1)) * lane * 0.4, py(p.x)],
    );
    scene.marks.push(
      ribbonMark<Row>(
        {
          id: `violin-${g.name}`,
          label: `${g.name} median`,
          datum: null,
          value: d.median,
          color,
          group: g.name,
          description: `${g.known.length} samples · bandwidth ${d.bandwidth.toPrecision(3)}`,
          wave: i / Math.max(1, groups.length),
        },
        [
          ...edges,
          ...d.points
            .map((p): Point => [cx - (p.density / (peak || 1)) * lane * 0.4, py(p.x)])
            .reverse(),
        ],
      ),
    );
    scene.marks.push({
      id: `median-${g.name}`,
      label: `${g.name} median`,
      datum: null,
      value: d.median,
      x: cx - lane * 0.12,
      y: py(d.median) - 1,
      width: lane * 0.24,
      height: 2,
      color: 'var(--lilt-text)',
      shape: 'bar',
      layer: 1,
      group: g.name,
    });
    if (points)
      g.rows.forEach((r, j) => {
        if (r.value === null) return;
        const offset = (((j * 0.61803398875) % 1) - 0.5) * lane * 0.28;
        scene.marks.push({
          id: r.id,
          label: `${g.name} · ${r.label}`,
          datum: r.row,
          value: r.value,
          x: cx + offset - 2.5,
          y: py(r.value) - 2.5,
          width: 5,
          height: 5,
          color: 'var(--lilt-text)',
          group: g.name,
          shape: 'dot',
          layer: 2,
        });
      });
  });
  if (Number.isFinite(low) && Number.isFinite(high))
    [low, (low + high) / 2, high].forEach((v) =>
      scene.labels!.push({
        x: 28,
        y: py(v) + 4,
        text: Number(v.toPrecision(3)).toString(),
        anchor: 'end',
      }),
    );
  scene.note = `Silhouettes estimate density using an Epanechnikov kernel; marks retain measured values. ${scale === 'width' ? 'Each violin has the same maximum width.' : 'All violins share one density scale.'} Legend values are medians. Missing samples remain in the table.`;
  return scene;
}

/** Pearson correlation from complete pairs, scaled before centering to avoid overflow. */
export function pairedCorrelation(
  pairs: readonly (readonly [number | null, number | null])[],
  minPairs = 3,
): { value: number | null; count: number } {
  const known = pairs.filter(
    (p): p is readonly [number, number] =>
      p[0] !== null && p[1] !== null && Number.isFinite(p[0]) && Number.isFinite(p[1]),
  );
  const count = known.length;
  if (count < minPairs) return { value: null, count };
  const sx = Math.max(...known.map((p) => Math.abs(p[0]))) || 1,
    sy = Math.max(...known.map((p) => Math.abs(p[1]))) || 1;
  const mx = known.reduce((s, p) => s + p[0] / sx, 0) / count,
    my = known.reduce((s, p) => s + p[1] / sy, 0) / count;
  let xx = 0,
    yy = 0,
    xy = 0;
  known.forEach(([x, y]) => {
    const a = x / sx - mx,
      b = y / sy - my;
    xx += a * a;
    yy += b * b;
    xy += a * b;
  });
  return { value: xx && yy ? Math.max(-1, Math.min(1, xy / Math.sqrt(xx * yy))) : null, count };
}
export function correlationLayout<Row>(
  data: readonly Row[],
  metrics: readonly CardSeries<string>[],
  minPairs: number,
  width: number,
  height: number,
): ObservationScene<Row> {
  if (!data.length) return { marks: [] };
  if (metrics.length < 2 || new Set(metrics.map((m) => m.key)).size !== metrics.length)
    return bad('Choose at least two distinct numeric metrics.');
  if (!Number.isInteger(minPairs) || minPairs < 2)
    return bad('Minimum pairs must be an integer of at least two.');
  const n = metrics.length,
    pad = 70,
    cell = Math.max(34, Math.min((width - pad - 8) / n, (height - 42) / n)),
    w = Math.max(width, pad + n * cell + 8),
    h = Math.max(height, n * cell + 42),
    left = (w - pad - n * cell) / 2 + pad;
  const id = (a: number, b: number) => JSON.stringify([metrics[a]!.key, metrics[b]!.key]);
  const scene: ObservationScene<Row> = {
    marks: [],
    labels: [],
    readings: [],
    width: w,
    height: h,
    headline: null,
  };
  metrics.forEach((metric, a) => {
    const short = (metric.label ?? metric.key).slice(0, 9);
    scene.labels!.push(
      { x: left - 8, y: 26 + (a + 0.5) * cell + 4, text: short, anchor: 'end' },
      { x: left + (a + 0.5) * cell, y: 16, text: short, anchor: 'middle' },
    );
    metrics.forEach((other, b) => {
      const result = pairedCorrelation(
          data.map((r) => [readNumber(r, metric.key), readNumber(r, other.key)]),
          minPairs,
        ),
        v = result.value;
      const related = metrics.flatMap((_, i) => [id(a, i), id(i, b), id(b, i), id(i, a)]);
      const mark = {
        id: id(a, b),
        label: `${metric.label ?? metric.key} × ${other.label ?? other.key}`,
        datum: null,
        value: v,
        x: left + b * cell + 2,
        y: 26 + a * cell + 2,
        width: cell - 4,
        height: cell - 4,
        color:
          v === null
            ? 'var(--lilt-muted)'
            : tint(seriesColor(v < 0 ? 2 : 0), 18 + Math.abs(v) * 82),
        shape: 'tile' as const,
        text: v === null ? '—' : v.toFixed(2),
        related,
        missing: v === null,
        description: `${result.count} paired readings${v === null ? ' · insufficient pairs or constant values' : ''}`,
        wave: (a + b) / (n * 2),
      };
      scene.marks.push(mark);
      scene.readings!.push(mark);
    });
  });
  scene.note = `Pearson r from −1 to +1, using complete pairs (minimum ${minPairs}). Positive and negative coefficients use contrasting colors. Missing or constant pairs are undefined. Inspection and the table retain full metric names.`;
  return scene;
}
const violinDemo = Array.from({ length: 24 }, (_, i) => ({
  category: i < 12 ? 'A' : 'B',
  value: 20 + Math.sin(i * 2.4) * 5 + (i < 12 ? 0 : 12),
}));
const correlationDemo = Array.from({ length: 12 }, (_, i) => ({
  a: i,
  b: i * 0.7 + Math.sin(i),
  c: 12 - i + Math.cos(i),
}));
export function ViolinCard<Row, const Key extends NumericKey<Row>>({
  category,
  value,
  label,
  points = true,
  bandwidth,
  scale = 'width',
  aggregate = 'mean',
  ...props
}: ViolinCardProps<Row, Key>) {
  return (
    <ObservationsCard
      {...props}
      aggregate={aggregate}
      family="violin"
      layout={(d, w, h) => violinLayout(d, category, value, label, points, bandwidth, scale, w, h)}
      placeholder={(w, h) =>
        violinLayout(
          violinDemo,
          'category',
          'value',
          undefined,
          false,
          undefined,
          scale,
          w,
          h,
        ) as unknown as ObservationScene<Row>
      }
    />
  );
}
export function CorrelationMatrixCard<Row, const Key extends NumericKey<Row>>({
  metrics,
  minPairs = 3,
  valueFormat = { maximumFractionDigits: 2 },
  legend = false,
  ...props
}: CorrelationMatrixCardProps<Row, Key>) {
  return (
    <ObservationsCard
      {...props}
      legend={legend}
      valueFormat={valueFormat}
      family="correlation-matrix"
      layout={(d, w, h) => correlationLayout(d, metrics, minPairs, w, h)}
      placeholder={(w, h) =>
        correlationLayout(
          correlationDemo,
          [{ key: 'a' }, { key: 'b' }, { key: 'c' }],
          3,
          w,
          h,
        ) as unknown as ObservationScene<Row>
      }
    />
  );
}
