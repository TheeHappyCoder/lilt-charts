'use client';

import type { NumericKey, TextKey } from './keys';
import type { CardSeries } from './cartesian-card';
import {
  ObservationsCard,
  readNumber,
  seriesColor,
  type ObservationsCardProps,
  type ObservationScene,
} from './observations-card';
import { bad, ribbonMark } from './sculpted-geometry';
import { names } from './spatial-geometry';

export interface DivergingBarCardProps<Row, Key extends NumericKey<Row>>
  extends ObservationsCardProps<Row> {
  category: TextKey<Row>;
  series: readonly (CardSeries<Key> & { side: 'negative' | 'neutral' | 'positive' })[];
  /** Normalize each complete response to 100%. Neutral responses straddle zero. */
  percent?: boolean;
}
export interface MirroredBarCardProps<Row, Key extends NumericKey<Row>>
  extends ObservationsCardProps<Row> {
  category: TextKey<Row>;
  left: Key;
  right: Key;
  leftLabel?: string;
  rightLabel?: string;
}
export interface ComparativeFunnelCardProps<Row, Key extends NumericKey<Row>>
  extends ObservationsCardProps<Row> {
  stage: TextKey<Row>;
  cohorts: readonly [CardSeries<Key>, CardSeries<Key>];
}

export function divergingLayout<Row>(
  data: readonly Row[],
  category: string,
  series: readonly (CardSeries<string> & { side: 'negative' | 'neutral' | 'positive' })[],
  percent: boolean,
  width: number,
  height: number,
): ObservationScene<Row> {
  const labels = names(data, category);
  if (typeof labels === 'string') return bad(labels);
  if (!series.length || new Set(series.map((s) => s.key)).size !== series.length)
    return bad('Response series need unique keys.');
  if (series.filter((s) => s.side === 'neutral').length > 1)
    return bad('Only one neutral response can straddle zero.');
  const rows = data.map((row) => series.map((s) => readNumber(row, s.key)));
  if (rows.some((v) => v.some((n) => n !== null && n < 0)))
    return bad('Response counts must be nonnegative; side sets their direction.');
  const scene: ObservationScene<Row> = {
    marks: [],
    paths: [],
    labels: [],
    readings: [],
    height: Math.max(height, labels.length * 48 + 36),
    highlightGroup: true,
  };
  const normalized = rows.map((values) => {
    if (values.some((v) => v === null)) return null;
    const total = values.reduce<number>((a, b) => a + b!, 0);
    if (!Number.isFinite(total)) return null;
    return values.map((v) => (percent ? (total ? (v! / total) * 100 : 0) : v!));
  });
  if (rows.some((values) => !Number.isFinite(values.reduce<number>((a, b) => a + (b ?? 0), 0))))
    return bad('Response total exceeds the finite numeric range.');
  let extent = 1;
  for (const values of normalized)
    if (values) {
      const sides = series.reduce(
        (s, item, i) => [
          s[0]! +
            (item.side === 'negative' ? values[i]! : item.side === 'neutral' ? values[i]! / 2 : 0),
          s[1]! +
            (item.side === 'positive' ? values[i]! : item.side === 'neutral' ? values[i]! / 2 : 0),
        ],
        [0, 0],
      );
      extent = Math.max(extent, ...sides);
    }
  const left = Math.min(100, width * 0.25),
    mid = (width + left) / 2,
    scale = (width - left - 16) / 2 / extent;
  scene.paths!.push({
    id: 'zero',
    d: `M${mid},8 V${scene.height! - 22}`,
    stroke: 'var(--lilt-border)',
  });
  scene.labels!.push({ x: mid, y: scene.height! - 3, text: '0', anchor: 'middle' });
  rows.forEach((values, rowIndex) => {
    const y = (rowIndex * (scene.height! - 28)) / Math.max(1, rows.length) + 8;
    scene.labels!.push({ x: left - 8, y: y + 20, text: labels[rowIndex]!, anchor: 'end' });
    const units = normalized[rowIndex];
    const neutralIndex = series.findIndex((s) => s.side === 'neutral');
    const half = units && neutralIndex >= 0 ? units[neutralIndex]! / 2 : 0;
    let negative = -half,
      positive = half;
    series.forEach((s, i) => {
      const id = JSON.stringify([labels[rowIndex], s.key]);
      const value = values[i]!;
      scene.readings!.push({
        id,
        label: `${labels[rowIndex]} · ${s.label ?? s.key}`,
        value,
        description: units && percent ? `${units[i]!.toFixed(1)}% of responses` : undefined,
      });
      if (!units || value === null || units[i] === 0) return;
      const n = units[i]!;
      const from = s.side === 'neutral' ? -half : s.side === 'negative' ? negative - n : positive;
      if (s.side === 'negative') negative -= n;
      if (s.side === 'positive') positive += n;
      scene.marks.push({
        id,
        label: `${labels[rowIndex]} · ${s.label ?? s.key}`,
        datum: data[rowIndex]!,
        value,
        x: mid + from * scale,
        y,
        width: n * scale,
        height: 30,
        color: s.color ?? seriesColor(i),
        group: s.key,
        shape: 'bar',
        description: percent ? `${n.toFixed(1)}% of responses` : undefined,
      });
    });
  });
  scene.groups = series.map((s, i) => ({
    id: s.key,
    label: s.label ?? s.key,
    color: s.color ?? seriesColor(i),
    value: rows.some((v) => v[i] === null) ? null : rows.reduce((a, v) => a + v[i]!, 0),
  }));
  scene.note =
    'Negative responses extend left; positive responses extend right. Neutral responses straddle zero.' +
    (normalized.some((r) => r === null)
      ? ' Incomplete rows are not stacked; recorded readings remain in the table.'
      : '');
  return scene;
}

export function mirroredLayout<Row>(
  data: readonly Row[],
  category: string,
  keys: readonly [string, string],
  labels: readonly [string, string],
  width: number,
  height: number,
): ObservationScene<Row> {
  const categories = names(data, category);
  if (typeof categories === 'string') return bad(categories);
  const values = data.map((r) => keys.map((k) => readNumber(r, k)));
  if (values.some((v) => v.some((n) => n !== null && n < 0)))
    return bad('Mirrored bar lengths must be nonnegative.');
  const max = Math.max(1, ...values.flat().map((v) => v ?? 0));
  const h = Math.max(height, data.length * 42 + 44),
    middle = width / 2,
    gap = Math.min(92, width * 0.3),
    half = (width - gap) / 2 - 8;
  const scene: ObservationScene<Row> = {
    marks: [],
    labels: labels.map((text, i) => ({
      x: i ? middle + gap / 2 : middle - gap / 2,
      y: 16,
      text,
      anchor: i ? 'start' : 'end',
    })),
    readings: [],
    height: h,
    highlightGroup: true,
  };
  data.forEach((row, r) => {
    const y = 32 + (r * (h - 38)) / Math.max(1, data.length);
    scene.labels!.push({ x: middle, y: y + 19, text: categories[r]!, anchor: 'middle' });
    keys.forEach((key, i) => {
      const value = values[r]![i]!,
        w = ((value ?? 0) / max) * half,
        id = JSON.stringify([categories[r], key]);
      const label = `${categories[r]} · ${labels[i]}`;
      scene.readings!.push({ id, label, value });
      if (value === null) return;
      scene.marks.push({
        id,
        label,
        datum: row,
        value,
        x: i ? middle + gap / 2 : middle - gap / 2 - w,
        y,
        width: Math.max(1, w),
        height: 28,
        color: seriesColor(i),
        group: key,
        shape: 'bar',
      });
    });
  });
  scene.groups = keys.map((key, i) => ({
    id: key,
    label: labels[i]!,
    color: seriesColor(i),
    value: values.some((v) => v[i] === null) ? null : values.reduce((a, v) => a + v[i]!, 0),
  }));
  scene.note = 'Both sides share one scale; lengths measure magnitude, not negative values.';
  return scene;
}

export function comparativeFunnelLayout<Row>(
  data: readonly Row[],
  stage: string,
  cohorts: readonly CardSeries<string>[],
  width: number,
  height: number,
): ObservationScene<Row> {
  const stages = names(data, stage);
  if (typeof stages === 'string') return bad(stages);
  if (cohorts.length !== 2 || cohorts[0]!.key === cohorts[1]!.key)
    return bad('Choose two distinct cohort keys.');
  const values = data.map((r) => cohorts.map((c) => readNumber(r, c.key)));
  if (values.some((v) => v.some((n) => n !== null && n < 0)))
    return bad('Funnel counts must be nonnegative.');
  if (
    values.some(
      (v, r) =>
        r > 0 &&
        v.some((n, i) => n !== null && values[r - 1]![i] !== null && n > values[r - 1]![i]!),
    )
  )
    return bad('Funnel counts cannot increase between successive stages.');
  const max = Math.max(1, ...values.flat().map((v) => v ?? 0)),
    h = Math.max(height, data.length * 54 + 35),
    lane = (width - 96) / 2,
    step = (h - 36) / Math.max(1, data.length);
  const scene: ObservationScene<Row> = {
    marks: [],
    labels: [],
    readings: [],
    height: h,
    highlightGroup: true,
  };
  cohorts.forEach((cohort, c) => {
    const cx = c ? width - lane / 2 : lane / 2,
      color = cohort.color ?? seriesColor(c);
    scene.labels!.push({ x: cx, y: 15, text: cohort.label ?? cohort.key, anchor: 'middle' });
    data.forEach((row, r) => {
      const value = values[r]![c]!,
        next = values[r + 1]?.[c],
        first = values[0]?.[c],
        y = 30 + r * step;
      const id = JSON.stringify([stages[r], cohort.key]),
        label = `${stages[r]} · ${cohort.label ?? cohort.key}`;
      const description =
        first && value !== null
          ? `${((value / first) * 100).toFixed(1)}% of entry cohort`
          : undefined;
      scene.readings!.push({ id, label, value, description });
      if (value === null || value === 0) return;
      const a = ((value / max) * (lane - 20)) / 2,
        b = (((next ?? value) / max) * (lane - 20)) / 2;
      scene.marks.push(
        ribbonMark(
          {
            id,
            label,
            datum: row,
            value,
            color,
            group: cohort.key,
            description,
            wave: r / Math.max(1, data.length - 1),
          },
          [
            [cx - a, y],
            [cx + a, y],
            [cx + b, y + step - 7],
            [cx - b, y + step - 7],
          ],
        ),
      );
    });
  });
  scene.groups = cohorts.map((c, i) => ({
    id: c.key,
    label: c.label ?? c.key,
    color: c.color ?? seriesColor(i),
    value: values.at(-1)?.[i] ?? null,
  }));
  stages.forEach((text, r) =>
    scene.labels!.push({ x: width / 2, y: 30 + (r + 0.5) * step, text, anchor: 'middle' }),
  );
  scene.headline = values.at(-1)?.every((v) => v !== null)
    ? values.at(-1)!.reduce<number>((a, v) => a + v!, 0)
    : null;
  scene.note =
    'Cohorts use the same absolute scale. Readouts include conversion from each entry cohort.';
  return scene;
}

const demo = [
  { label: 'Discover', a: 90, b: 74, c: 18 },
  { label: 'Consider', a: 65, b: 58, c: 24 },
  { label: 'Activate', a: 38, b: 32, c: 28 },
  { label: 'Retain', a: 24, b: 22, c: 20 },
];
export function DivergingBarCard<Row, const Key extends NumericKey<Row>>({
  category,
  series,
  percent = false,
  ...props
}: DivergingBarCardProps<Row, Key>) {
  return (
    <ObservationsCard
      {...props}
      family="diverging"
      layout={(d, w, h) => divergingLayout(d, category, series, percent, w, h)}
      placeholder={(w, h) =>
        divergingLayout(
          demo,
          'label',
          [
            { key: 'a', side: 'negative' },
            { key: 'c', side: 'neutral' },
            { key: 'b', side: 'positive' },
          ],
          percent,
          w,
          h,
        ) as unknown as ObservationScene<Row>
      }
    />
  );
}
export function MirroredBarCard<Row, const Key extends NumericKey<Row>>({
  category,
  left,
  right,
  leftLabel = String(left),
  rightLabel = String(right),
  ...props
}: MirroredBarCardProps<Row, Key>) {
  return (
    <ObservationsCard
      {...props}
      family="mirrored"
      layout={(d, w, h) =>
        mirroredLayout(d, category, [left, right], [leftLabel, rightLabel], w, h)
      }
      placeholder={(w, h) =>
        mirroredLayout(
          demo,
          'label',
          ['a', 'b'],
          ['A', 'B'],
          w,
          h,
        ) as unknown as ObservationScene<Row>
      }
    />
  );
}
export function ComparativeFunnelCard<Row, const Key extends NumericKey<Row>>({
  stage,
  cohorts,
  ...props
}: ComparativeFunnelCardProps<Row, Key>) {
  return (
    <ObservationsCard
      {...props}
      family="comparative-funnel"
      layout={(d, w, h) => comparativeFunnelLayout(d, stage, cohorts, w, h)}
      placeholder={(w, h) =>
        comparativeFunnelLayout(
          demo,
          'label',
          [{ key: 'a' }, { key: 'b' }],
          w,
          h,
        ) as unknown as ObservationScene<Row>
      }
    />
  );
}
