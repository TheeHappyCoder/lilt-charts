import { readNumber, type ObservationMark } from './observations-card';
import { hierarchy, type Branch } from './spatial-hierarchy';
import { TAU, paint, sector, readings, polygon, ribbon, type Scene } from './spatial-geometry';
import { bad, clamp, frame, tint } from './sculpted-geometry';

export function sunburstTerracesLayout<Row>(
  data: readonly Row[],
  path: string,
  value: string,
  width: number,
  height: number,
  options: { tilt?: number; rise?: number; color?: string } = {},
): Scene<Row> {
  const root = hierarchy(data, path, value);
  if (typeof root === 'string') return bad(root);
  if (!data.length) return { marks: [] };
  const size = frame(width, height),
    all: Branch<Row>[] = [];
  const collect = (n: Branch<Row>) => {
    for (const child of n.children) {
      all.push(child);
      collect(child);
    }
  };
  collect(root);
  const levels = Math.max(1, ...all.map((n) => n.depth)),
    tilt = clamp(options.tilt, 0.62, 0.4, 1),
    rise = clamp(options.rise, 12, 0, 24);
  size.height = Math.max(size.height, 120 + rise * levels);
  const radius = Math.min((size.width - 40) / 2, (size.height - 40 - rise * levels) / (2 * tilt));
  const cx = size.width / 2,
    cy = size.height / 2 + (rise * levels) / 2,
    step = radius / (levels + 0.7);
  const marks: ObservationMark<Row>[] = [],
    paths: NonNullable<Scene<Row>['paths']> = [];
  const visit = (node: Branch<Row>, start: number, end: number, group: string, color: string) => {
    if (node.value <= 0) return;
    const gap = Math.min(0.015, (end - start) / 8),
      inner = step * (node.depth - 0.3),
      outer = step * (node.depth + 0.65),
      lift = rise * (levels - node.depth + 1);
    const top = sector(cx, cy - lift, inner, outer, start + gap, end - gap, tilt);
    // Vertical walls follow each sampled outer edge; only the near half is visible.
    const outerEdge = top.slice(0, top.length / 2);
    for (let i = 1; i < outerEdge.length; i++) {
      const a = outerEdge[i - 1]!,
        b = outerEdge[i]!;
      if ((a[1] + b[1]) / 2 < cy - lift) continue;
      paths.push({
        id: `${node.id}-wall-${i}`,
        d: polygon([a, b, [b[0], b[1] + rise], [a[0], a[1] + rise]]),
        fill: `color-mix(in oklab, ${color}, black 30%)`,
        group,
        enter: 'rise',
        wave: node.depth / levels,
        shade: 0.5,
      });
    }
    marks.push(
      ribbon(
        {
          id: node.id,
          label: node.id,
          datum: node.datum,
          value: node.value,
          description: node.children.length ? 'Branch total of known leaves' : undefined,
          color,
          group,
          layer: levels - node.depth,
          wave: node.depth / levels,
        },
        top,
      ),
    );
    let angle = start;
    for (const child of node.children) {
      const stop = angle + ((end - start) * child.value) / node.value;
      visit(child, angle, stop, group, color);
      angle = stop;
    }
  };
  let angle = -Math.PI / 2;
  root.children.forEach((node, i) => {
    const stop = angle + (root.value ? (TAU * node.value) / root.value : 0);
    visit(node, angle, stop, node.id, paint(i, options.color));
    angle = stop;
  });
  return {
    ...size,
    marks,
    paths,
    highlightGroup: true,
    headline: data.some((row) => readNumber(row, value) !== null) ? root.value : undefined,
    readings: readings(
      data,
      data.map((row) => String((row as Record<string, unknown>)[path])),
      value,
    ),
    groups: root.children.map((n, i) => ({
      id: n.id,
      label: n.label,
      value: n.value,
      color: paint(i, options.color),
    })),
    note: 'Angle: share of known total · Rings: hierarchy · Terrace height is decorative',
  };
}

interface Packed<Row> {
  node: Branch<Row>;
  x: number;
  y: number;
  r: number;
  children: Packed<Row>[];
}
/** Deterministic tangent candidates. Every leaf keeps the same area/value scale. */
export function packHierarchy<Row>(node: Branch<Row>, padding: number): Packed<Row> {
  const children = node.children
    .filter((n) => n.value > 0)
    .map((n) => packHierarchy(n, padding))
    .sort((a, b) => b.r - a.r);
  if (!children.length) return { node, x: 0, y: 0, r: Math.sqrt(node.value), children: [] };
  const placed: Packed<Row>[] = [];
  for (const child of children) {
    let best: { x: number; y: number; score: number } | undefined;
    if (!placed.length) best = { x: 0, y: 0, score: 0 };
    for (const anchor of placed)
      for (let step = 0; step < 96; step++) {
        const angle = (TAU * step) / 96,
          distance = anchor.r + child.r + padding;
        const x = anchor.x + Math.cos(angle) * distance,
          y = anchor.y + Math.sin(angle) * distance;
        if (
          placed.some(
            (other) => Math.hypot(x - other.x, y - other.y) < child.r + other.r + padding - 1e-7,
          )
        )
          continue;
        const score = Math.max(
          Math.hypot(x, y) + child.r,
          ...placed.map((p) => Math.hypot(p.x, p.y) + p.r),
        );
        if (!best || score < best.score) best = { x, y, score };
      }
    // There is always space beyond the rightmost circle, even for pathological size ratios.
    const fallback = Math.max(0, ...placed.map((p) => p.x + p.r)) + child.r + padding;
    child.x = best?.x ?? fallback;
    child.y = best?.y ?? 0;
    placed.push(child);
  }
  const minX = Math.min(...placed.map((p) => p.x - p.r)),
    maxX = Math.max(...placed.map((p) => p.x + p.r)),
    minY = Math.min(...placed.map((p) => p.y - p.r)),
    maxY = Math.max(...placed.map((p) => p.y + p.r));
  const cx = (minX + maxX) / 2,
    cy = (minY + maxY) / 2;
  placed.forEach((p) => {
    p.x -= cx;
    p.y -= cy;
  });
  return {
    node,
    x: 0,
    y: 0,
    r: Math.max(...placed.map((p) => Math.hypot(p.x, p.y) + p.r)) + padding,
    children: placed,
  };
}
export function circleArchipelagoLayout<Row>(
  data: readonly Row[],
  path: string,
  value: string,
  width: number,
  height: number,
  options: { padding?: number; color?: string } = {},
): Scene<Row> {
  const root = hierarchy(data, path, value);
  if (typeof root === 'string') return bad(root);
  if (!data.length) return { marks: [] };
  const size = frame(width, height),
    padding = clamp(options.padding, 0.7, 0, 3),
    packed = packHierarchy(root, padding),
    scale = Math.min(size.width - 30, size.height - 30) / (2 * Math.max(1, packed.r));
  const marks: ObservationMark<Row>[] = [],
    paths: NonNullable<Scene<Row>['paths']> = [];
  const visit = (p: Packed<Row>, x: number, y: number, group: string, color: string) => {
    const cx = x + p.x * scale,
      cy = y + p.y * scale,
      r = p.r * scale;
    if (p.children.length) {
      paths.push({
        id: p.node.id,
        d: polygon(sector(cx, cy, 0, r, 0, TAU).slice(0, Math.ceil(TAU * 24) + 1)),
        fill: tint(color, 12 + p.node.depth * 4),
        stroke: tint(color, 38),
        enter: 'rise',
        group,
        wave: p.node.depth / 8,
      });
      p.children.forEach((child) => visit(child, cx, cy, group, color));
    } else if (p.node.value > 0) {
      marks.push({
        id: p.node.id,
        label: p.node.id,
        datum: p.node.datum,
        value: p.node.value,
        group,
        color,
        shape: 'dot',
        x: cx - r,
        y: cy - r,
        width: r * 2,
        height: r * 2,
        wave: marks.length / Math.max(1, data.length),
        description: 'Circle area is proportional to leaf value',
      });
    }
  };
  packed.children.forEach((p, i) =>
    visit(p, size.width / 2, size.height / 2, p.node.id, paint(i, options.color)),
  );
  return {
    ...size,
    marks,
    paths,
    highlightGroup: true,
    headline: data.some((row) => readNumber(row, value) !== null) ? root.value : undefined,
    readings: readings(
      data,
      data.map((row) => String((row as Record<string, unknown>)[path])),
      value,
    ),
    groups: root.children.map((n, i) => ({
      id: n.id,
      label: n.label,
      value: n.value,
      color: paint(i, options.color),
    })),
    note: 'Leaf circle area: value · Enclosing circles group descendants; their area is not a total',
  };
}
