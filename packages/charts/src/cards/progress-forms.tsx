'use client';

import type { NumericKey, TextKey } from './keys';
import {
  ObservationsCard,
  readNumber,
  seriesColor,
  type ObservationsCardProps,
  type ObservationScene,
} from './observations-card';
import { bad, fixed } from './sculpted-geometry';
import { names } from './spatial-geometry';
import { useCardFormat } from './format';

export interface GoalPacingCardProps<Row, Key extends NumericKey<Row>>
  extends ObservationsCardProps<Row> {
  /** Numeric elapsed period, e.g. day of the quarter. */
  x: NumericKey<Row>;
  actual: Key;
  expected: Key;
  /** Explicit current period; this chart never consults the wall clock. */
  at: number;
  target: number;
}
export interface MilestoneProgressCardProps<Row, Key extends NumericKey<Row>>
  extends ObservationsCardProps<Row> {
  label: TextKey<Row>;
  position: Key;
  current: number | null;
  target?: number;
}

export function pacingLayout<Row>(
  data: readonly Row[],
  x: string,
  actual: string,
  expected: string,
  at: number,
  target: number,
  width: number,
  height: number,
  format: (value: number) => string = String,
): ObservationScene<Row> {
  if (!Number.isFinite(at) || !Number.isFinite(target) || target <= 0)
    return bad('Pacing needs a finite current period and positive target.');
  if (actual === expected) return bad('Actual and expected must name different measurements.');
  const rows = data
    .map((row) => ({
      row,
      x: readNumber(row, x),
      actual: readNumber(row, actual),
      expected: readNumber(row, expected),
    }))
    .sort((a, b) => (a.x ?? 0) - (b.x ?? 0));
  if (rows.some((r, i) => r.x === null || (i > 0 && r.x === rows[i - 1]!.x)))
    return bad('Pacing periods must be finite and unique.');
  if (rows.some((r) => (r.actual ?? 0) < 0 || (r.expected ?? 0) < 0))
    return bad('Progress measurements must be nonnegative.');
  const low = Math.min(0, rows[0]?.x ?? 0, at),
    high = Math.max(at, rows.at(-1)?.x ?? 1, low + 1),
    max = Math.max(
      target,
      ...rows.flatMap((r) => [r.expected ?? 0, r.x! <= at ? (r.actual ?? 0) : 0]),
    );
  const px = (v: number) => 26 + ((v - low) / (high - low)) * (width - 52),
    py = (v: number) => height - 30 - (v / max) * (height - 60);
  const latest = rows.filter((r) => r.x! <= at).at(-1),
    current = latest?.actual ?? null;
  const scene: ObservationScene<Row> = {
    marks: [],
    paths: [
      { id: 'target', d: `M26,${py(target)} H${width - 26}`, stroke: 'var(--lilt-border)' },
      { id: 'today', d: `M${px(at)},20 V${height - 30}`, stroke: 'var(--lilt-muted)' },
    ],
    readings: [],
    labels: [
      { x: px(at), y: 12, text: `Period ${at}`, anchor: 'middle' },
      { x: width - 26, y: py(target) - 7, text: `Target ${format(target)}`, anchor: 'end' },
    ],
    headline: current,
    highlightGroup: true,
  };
  ([expected, actual] as const).forEach((key, layer) => {
    let run = '';
    rows.forEach((r, i) => {
      const value = layer ? r.actual : r.expected,
        eligible = !layer || r.x! <= at,
        id = JSON.stringify([r.x, key]),
        label = `Period ${r.x} · ${layer ? 'Actual' : 'Expected'}`;
      if (!eligible) return;
      scene.readings!.push({ id, label, value });
      if (value === null) {
        run = '';
        return;
      }
      const point = `${fixed(px(r.x!))},${fixed(py(value))}`;
      if (run)
        scene.paths!.push({
          id: `line-${id}`,
          d: `M${run} L${point}`,
          stroke: seriesColor(layer),
          group: key,
          enter: 'draw',
          wave: i / Math.max(1, rows.length - 1),
        });
      run = point;
      scene.marks.push({
        id,
        label,
        datum: r.row,
        value,
        x: px(r.x!) - 4,
        y: py(value) - 4,
        width: 8,
        height: 8,
        shape: 'dot',
        color: seriesColor(layer),
        group: key,
      });
    });
  });
  const atRow = rows.find((r) => r.x === at),
    before = rows.filter((r) => r.x! < at).at(-1),
    after = rows.find((r) => r.x! > at);
  const plan =
    atRow?.expected ??
    (atRow
      ? null
      : before?.expected != null && after?.expected != null
        ? before.expected +
          ((after.expected - before.expected) * (at - before.x!)) / (after.x! - before.x!)
        : null);
  scene.groups = [
    { id: actual, label: 'Actual', color: seriesColor(1), value: current },
    { id: expected, label: 'Expected at current period', color: seriesColor(0), value: plan },
  ];
  scene.labels!.push(
    { x: px(low), y: height - 5, text: String(low), anchor: 'start' },
    { x: px(high), y: height - 5, text: String(high), anchor: 'end' },
  );
  scene.note = `Target ${format(target)}. ${current !== null && plan !== null ? `${format(Math.abs(current - plan))} ${current >= plan ? 'ahead of' : 'behind'} expected progress.` : 'No complete actual/expected comparison at the cutoff.'} Actual is the latest supplied reading at or before period ${at}; expected follows the supplied plan.`;
  return scene;
}

export function milestoneLayout<Row>(
  data: readonly Row[],
  label: string,
  position: string,
  current: number | null,
  target: number,
  width: number,
  height: number,
): ObservationScene<Row> {
  if (!data.length) return { marks: [], headline: null };
  const labels = names(data, label);
  if (typeof labels === 'string') return bad(labels);
  if (
    !Number.isFinite(target) ||
    target <= 0 ||
    (current !== null && (!Number.isFinite(current) || current < 0))
  )
    return bad('Milestones need a positive target and a nonnegative current value, or null.');
  const rows = data
    .map((row, i) => ({ row, label: labels[i]!, value: readNumber(row, position) }))
    .sort((a, b) => (a.value ?? 0) - (b.value ?? 0));
  if (
    rows.some(
      (r, i) =>
        r.value === null ||
        r.value < 0 ||
        r.value > target ||
        (i > 0 && r.value === rows[i - 1]!.value),
    )
  )
    return bad('Checkpoint positions must be unique, finite, and between zero and target.');
  const px = (v: number) => 20 + (v / target) * (width - 40),
    y = height / 2,
    next = rows.find((r) => current !== null && r.value! > current);
  const scene: ObservationScene<Row> = {
    marks: [],
    paths: [{ id: 'track', d: `M20,${y} H${width - 20}`, stroke: 'var(--lilt-border)' }],
    readings: [],
    headline: current,
    labels: [],
  };
  if (current !== null)
    scene.paths!.push({
      id: 'progress',
      d: `M20,${y} H${px(Math.min(target, current))}`,
      stroke: seriesColor(0),
      enter: 'draw',
    });
  rows.forEach((r, i) => {
    const state =
      current === null
        ? 'Progress unknown'
        : r.value! <= current
          ? 'Completed'
          : r === next
            ? 'Current checkpoint'
            : 'Upcoming';
    const color =
      state === 'Completed'
        ? seriesColor(0)
        : state === 'Current checkpoint'
          ? seriesColor(1)
          : 'var(--lilt-muted)';
    scene.marks.push({
      id: r.label,
      label: r.label,
      datum: r.row,
      value: r.value,
      x: px(r.value!) - 7,
      y: y - 7,
      width: 14,
      height: 14,
      color,
      shape: 'dot',
      description: state,
      wave: r.value! / target,
    });
    scene.readings!.push({ id: r.label, label: r.label, value: r.value, description: state });
    scene.labels!.push({
      x: px(r.value!),
      y: y + (i % 2 ? 40 : -24),
      text: r.label,
      anchor: i === 0 ? 'start' : i === rows.length - 1 ? 'end' : 'middle',
    });
  });
  scene.note =
    current === null
      ? 'Current progress is unknown.'
      : `${current} of ${target}${current > target ? ' · target exceeded' : ''}. ${next ? `Next: ${next.label}.` : 'All supplied checkpoints completed.'}`;
  return scene;
}
const pacingDemo = [
  { x: 0, a: 0, e: 0 },
  { x: 1, a: 20, e: 15 },
  { x: 2, a: 42, e: 38 },
  { x: 3, a: 68, e: 63 },
  { x: 4, a: null, e: 100 },
];
const milestoneDemo = [
  { label: 'Start', value: 0 },
  { label: 'Review', value: 30 },
  { label: 'Launch', value: 65 },
  { label: 'Done', value: 100 },
];
export function GoalPacingCard<Row, const Key extends NumericKey<Row>>({
  x,
  actual,
  expected,
  at,
  target,
  ...props
}: GoalPacingCardProps<Row, Key>) {
  const format = useCardFormat(props);
  return (
    <ObservationsCard
      {...props}
      family="goal-pacing"
      layout={(d, w, h) => pacingLayout(d, x, actual, expected, at, target, w, h, format.value)}
      placeholder={(w, h) =>
        pacingLayout(pacingDemo, 'x', 'a', 'e', 3, 100, w, h) as unknown as ObservationScene<Row>
      }
    />
  );
}
export function MilestoneProgressCard<Row, const Key extends NumericKey<Row>>({
  label,
  position,
  current,
  target = 100,
  height = 170,
  ...props
}: MilestoneProgressCardProps<Row, Key>) {
  return (
    <ObservationsCard
      {...props}
      height={height}
      family="milestone-progress"
      layout={(d, w, h) => milestoneLayout(d, label, position, current, target, w, h)}
      placeholder={(w, h) =>
        milestoneLayout(
          milestoneDemo,
          'label',
          'value',
          52,
          100,
          w,
          h,
        ) as unknown as ObservationScene<Row>
      }
    />
  );
}
