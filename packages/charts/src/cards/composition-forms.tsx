'use client';

import type { NumericKey, TextKey } from './keys';
import {
  ObservationsCard,
  readField,
  readNumber,
  seriesColor,
  type ObservationsCardProps,
  type ObservationScene,
} from './observations-card';
import { hierarchy, type Branch } from './spatial-hierarchy';
import { sector, TAU } from './spatial-geometry';
import { bad, clamp, ribbonMark } from './sculpted-geometry';

export interface NestedDonutCardProps<Row, Key extends NumericKey<Row>>
  extends ObservationsCardProps<Row> {
  /** Unique leaf paths separated by /. Parent totals are calculated from leaves. */
  path: TextKey<Row>;
  value: Key;
  hole?: number;
}
export function nestedDonutLayout<Row>(
  data: readonly Row[],
  path: string,
  value: string,
  hole: number,
  width: number,
  height: number,
): ObservationScene<Row> {
  const root = hierarchy(data, path, value);
  if (typeof root === 'string') return bad(root);
  const all: Branch<Row>[] = [];
  const visit = (n: Branch<Row>) => {
    n.children.forEach((c) => {
      all.push(c);
      visit(c);
    });
  };
  visit(root);
  const levels = Math.max(1, ...all.map((n) => n.depth)),
    radius = Math.max(20, Math.min(width, height) / 2 - 12),
    inner = radius * clamp(hole, 0.3, 0.1, 0.7),
    ring = (radius - inner) / levels;
  const scene: ObservationScene<Row> = {
    marks: [],
    readings: data.map((row) => ({
      id: String(readField(row, path)),
      label: String(readField(row, path)),
      value: readNumber(row, value),
    })),
    headline: data.some((r) => readNumber(r, value) !== null) ? root.value : null,
  };
  const draw = (node: Branch<Row>, start: number, end: number, color: string) => {
    if (node.value <= 0) return;
    const related = all
      .filter((n) => n.id.startsWith(node.id + '/') || node.id.startsWith(n.id + '/'))
      .map((n) => n.id);
    const missing = data.some((r) => {
      const p = String(readField(r, path));
      return (p === node.id || p.startsWith(node.id + '/')) && readNumber(r, value) === null;
    });
    scene.marks.push(
      ribbonMark(
        {
          id: node.id,
          label: node.id,
          datum: node.datum,
          value: node.value,
          color,
          group: node.id.split('/')[0],
          related,
          description: `${((node.value / (root.value || 1)) * 100).toFixed(1)}% of known total${missing ? ' · partial total; some leaves are missing' : ''}`,
          wave: (node.depth - 1) / levels,
        },
        sector(
          width / 2,
          height / 2,
          inner + (node.depth - 1) * ring + 1,
          inner + node.depth * ring - 1,
          start,
          end,
        ),
      ),
    );
    let angle = start;
    node.children.forEach((child) => {
      const next = angle + ((end - start) * child.value) / node.value;
      draw(child, angle, next, color);
      angle = next;
    });
  };
  let angle = -Math.PI / 2;
  root.children.forEach((node, i) => {
    const next = angle + (TAU * node.value) / (root.value || 1);
    draw(node, angle, next, seriesColor(i));
    angle = next;
  });
  scene.groups = root.children.map((n, i) => ({
    id: n.id,
    label: n.label,
    color: seriesColor(i),
    value: n.value,
  }));
  scene.note =
    'Inner rings are parents; outer rings are their children. Hover or pin a segment to retain its ancestors and descendants. Missing leaves contribute no known area; zero leaves have no angle.';
  return scene;
}
const demo = [
  { path: 'Product/Design', value: 32 },
  { path: 'Product/Engineering', value: 48 },
  { path: 'Growth/Marketing', value: 24 },
  { path: 'Growth/Sales', value: 36 },
  { path: 'Operations/Support', value: 20 },
];
export function NestedDonutCard<Row, const Key extends NumericKey<Row>>({
  path,
  value,
  hole = 0.3,
  ...props
}: NestedDonutCardProps<Row, Key>) {
  return (
    <ObservationsCard
      {...props}
      family="nested-donut"
      layout={(d, w, h) => nestedDonutLayout(d, path, value, hole, w, h)}
      placeholder={(w, h) =>
        nestedDonutLayout(demo, 'path', 'value', hole, w, h) as unknown as ObservationScene<Row>
      }
    />
  );
}
