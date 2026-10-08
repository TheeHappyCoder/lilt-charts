import { readField, readNumber, type ObservationMark } from './observations-card';
import { bad, clamp, frame, polygon, strokeRibbon, type Point } from './sculpted-geometry';
import {
  axes,
  camera,
  cube,
  ink,
  names,
  negative,
  normalize,
  paint,
  readings,
  type Scene,
  type XYZ,
} from './spatial-geometry';

export interface SpatialOptions {
  yaw?: number;
  elevation?: number;
  size?: number;
  color?: string;
  group?: string;
  slice?: readonly [number, number];
}
export function voxelCloudLayout<Row>(
  data: readonly Row[],
  label: string,
  x: string,
  y: string,
  z: string,
  value: string,
  width: number,
  height: number,
  options: SpatialOptions = {},
): Scene<Row> {
  return spatialPoints(data, label, x, y, z, value, width, height, options);
}
export function clusterConstellationLayout<Row>(
  data: readonly Row[],
  label: string,
  x: string,
  y: string,
  z: string,
  value: string,
  connections: string,
  width: number,
  height: number,
  options: SpatialOptions = {},
): Scene<Row> {
  return spatialPoints(data, label, x, y, z, value, width, height, options, connections);
}
function spatialPoints<Row>(
  data: readonly Row[],
  label: string,
  x: string,
  y: string,
  z: string,
  value: string,
  width: number,
  height: number,
  options: SpatialOptions,
  connections?: string,
): Scene<Row> {
  const labels = names(data, label);
  if (typeof labels === 'string') return bad(labels);
  if (negative(data, value)) return bad('Magnitudes must be nonnegative.');
  if (
    options.slice &&
    (options.slice.some((n) => !Number.isFinite(n)) || options.slice[0] > options.slice[1])
  )
    return bad('Slice needs finite ascending z bounds.');
  if (!data.length) return { marks: [] };
  const size = frame(width, height),
    project = camera(size.width, size.height, options.yaw, options.elevation),
    keys = [x, y, z],
    domains = keys.map((key) => normalize(data.map((row) => readNumber(row, key))));
  const groups = [
    ...new Set(
      data.map((row) => (options.group ? String(readField(row, options.group)) : 'Observations')),
    ),
  ];
  const maximum = Math.max(1, ...data.map((row) => readNumber(row, value) ?? 0)),
    radius = clamp(options.size, 0.09, 0.025, 0.18);
  const all = data.map((datum, i) => {
    const coordinates = keys.map((key) => readNumber(datum, key));
    const known = coordinates.every((n): n is number => n !== null);
    const p = known ? (coordinates.map((n, j) => domains[j]!.at(n!)) as unknown as XYZ) : null;
    const group = options.group ? String(readField(datum, options.group)) : 'Observations';
    return {
      datum,
      id: labels[i]!,
      coordinates,
      p,
      group,
      value: readNumber(datum, value),
      color: paint(groups.indexOf(group), options.color),
      index: i,
    };
  });
  const adjacency = new Map(labels.map((id) => [id, new Set<string>()]));
  if (connections)
    for (const node of all) {
      const links = readField(node.datum, connections);
      if (
        !Array.isArray(links) ||
        links.some((id) => typeof id !== 'string' || !adjacency.has(id) || id === node.id) ||
        new Set(links).size !== links.length
      )
        return bad('Connections need unique existing node labels, excluding the node itself.');
      for (const id of links) {
        adjacency.get(node.id)!.add(id);
        adjacency.get(id)!.add(node.id);
      }
    }
  const visible = all.filter(
    (n) =>
      n.p &&
      (!options.slice ||
        (n.coordinates[2]! >= options.slice[0] && n.coordinates[2]! <= options.slice[1])),
  );
  const marks: ObservationMark<Row>[] = visible.map((node) => {
    const p = node.p!,
      projected = project(p),
      v = node.value;
    const meta = {
      id: node.id,
      label: node.id,
      datum: node.datum,
      value: v,
      group: node.group,
      color: node.color,
      wave: node.index / data.length,
      missing: v === null,
      description: `${x}: ${node.coordinates[0]} · ${y}: ${node.coordinates[1]} · ${z}: ${node.coordinates[2]}`,
      related: connections ? [...adjacency.get(node.id)!] : undefined,
    };
    // Keep a minimal missing/zero marker; volume (or sphere area) carries positive magnitude.
    const r = radius * (v === null || v === 0 ? 0.25 : Math.cbrt(v / maximum));
    if (!connections) return cube(meta, p, r, project);
    const diameter = Math.max(5, projected.scale * radius * 3 * Math.sqrt((v ?? 0) / maximum));
    return {
      ...meta,
      x: projected.x - diameter / 2,
      y: projected.y - diameter / 2,
      width: diameter,
      height: diameter,
      shape: 'dot',
      layer: Math.round((projected.depth + 4) * 100),
    };
  });
  const scaffold = axes<Row>(
    project,
    keys.map((key, i) => `${key} [${domains[i]!.low}, ${domains[i]!.high}]`),
  );
  const paths: NonNullable<Scene<Row>['paths']> = [...(scaffold.paths ?? [])];
  if (connections)
    for (const node of visible)
      for (const otherId of adjacency.get(node.id)!) {
        if (node.id >= otherId) continue;
        const other = visible.find((n) => n.id === otherId);
        if (!other) continue;
        const a = project(node.p!),
          b = project(other.p!);
        const points: Point[] = Array.from({ length: 25 }, (_, i) => {
          const t = i / 24;
          return [a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t - Math.sin(Math.PI * t) * 12];
        });
        paths.push({
          id: JSON.stringify([node.id, other.id]),
          d: polygon(strokeRibbon(points, 2.5)),
          fill: node.color,
          related: [node.id, other.id],
          enter: 'rise',
          wave: node.index / data.length,
        });
      }
  return {
    ...size,
    ...scaffold,
    marks,
    paths,
    headline: visible.length,
    readings: all.map((n) => ({
      id: n.id,
      label: n.id,
      value: n.value,
      description: n.p
        ? `${keys.map((k, i) => `${k}: ${n.coordinates[i]}`).join(' · ')}${visible.includes(n) ? '' : ' · Outside slice'}`
        : 'Missing position',
    })),
    groups: groups.map((g, i) => ({
      id: g,
      label: g,
      color: paint(i, options.color),
      value: visible.filter((n) => n.group === g).length,
    })),
    note: connections
      ? 'Supplied XYZ positions · Links are undirected · Inspect a node to reveal its neighbours'
      : 'Independent linear XYZ axes · Cube volume: magnitude · Slice filters original z values',
  };
}

export function ternaryPrismLayout<Row>(
  data: readonly Row[],
  label: string,
  a: string,
  b: string,
  c: string,
  value: string,
  width: number,
  height: number,
  options: { tilt?: number; rise?: number; color?: string } = {},
): Scene<Row> {
  const labels = names(data, label);
  if (typeof labels === 'string') return bad(labels);
  if ([a, b, c, value].some((key) => negative(data, key)))
    return bad('Composition and magnitude values must be nonnegative.');
  if (new Set([a, b, c]).size !== 3) return bad('Choose three distinct composition keys.');
  if (!data.length) return { marks: [] };
  const size = frame(width, height),
    tilt = clamp(options.tilt, 0.65, 0.4, 1),
    rise = clamp(options.rise, 38, 0, 80),
    span = Math.min(size.width - 80, (size.height - 70 - rise) / (0.866 * tilt));
  const left: Point = [(size.width - span) / 2, size.height - 36],
    right: Point = [(size.width + span) / 2, size.height - 36],
    top: Point = [size.width / 2, size.height - 36 - span * 0.866 * tilt];
  const point = (aa: number, bb: number, cc: number): Point => [
    left[0] * aa + right[0] * bb + top[0] * cc,
    left[1] * aa + right[1] * bb + top[1] * cc,
  ];
  const paths: NonNullable<Scene<Row>['paths']> = [
    {
      id: 'floor',
      d: polygon([left, right, top]),
      fill: 'color-mix(in oklab, var(--lilt-muted) 8%, transparent)',
      stroke: ink,
      enter: 'rise',
    },
  ];
  for (let i = 1; i < 5; i++) {
    const t = i / 5;
    for (const [from, to] of [
      [point(t, 1 - t, 0), point(t, 0, 1 - t)],
      [point(1 - t, t, 0), point(0, t, 1 - t)],
      [point(1 - t, 0, t), point(0, 1 - t, t)],
    ] as [Point, Point][]) {
      paths.push({
        id: `grid-${paths.length}`,
        d: `M${from.join(',')} L${to.join(',')}`,
        stroke: ink,
        enter: 'draw',
      });
    }
  }
  const maximum = Math.max(1, ...data.map((row) => readNumber(row, value) ?? 0));
  const marks = data.flatMap((row, i): ObservationMark<Row>[] => {
    const vals = [a, b, c].map((key) => readNumber(row, key));
    if (vals.some((v) => v === null)) return [];
    const max = Math.max(...(vals as number[]));
    if (max === 0) return [];
    const normalized = vals.map((v) => v! / max),
      total = normalized.reduce((s, v) => s + v, 0),
      shares = normalized.map((v) => v / total);
    const p = point(shares[0]!, shares[1]!, shares[2]!),
      v = readNumber(row, value),
      lift = ((v ?? 0) / maximum) * rise,
      color = paint(i, options.color),
      half = 5;
    return [
      {
        id: labels[i]!,
        label: labels[i]!,
        datum: row,
        value: v,
        color,
        missing: v === null,
        x: p[0] - half,
        y: p[1] - lift - half,
        width: half * 2,
        height: half * 2 + lift,
        shape: 'prism',
        wave: i / data.length,
        prism: {
          top: [
            [half, 0],
            [half * 2, half],
            [half, half * 2],
            [0, half],
          ],
          lift,
          depth: Math.round(p[1]),
          wave: i / data.length,
        },
        description: [a, b, c].map((k, j) => `${k}: ${(shares[j]! * 100).toFixed(1)}%`).join(' · '),
      },
    ];
  });
  return {
    ...size,
    marks,
    paths,
    headline: marks.length,
    readings: readings(data, labels, value).map((r, i) => ({
      ...r,
      description: [a, b, c]
        .map((k) => `${k}: ${readNumber(data[i]!, k) ?? 'missing'}`)
        .join(' · '),
    })),
    labels: [
      { x: left[0], y: left[1] + 22, text: a, anchor: 'middle' },
      { x: right[0], y: right[1] + 22, text: b, anchor: 'middle' },
      { x: top[0], y: top[1] - 14, text: c, anchor: 'middle' },
    ],
    note: 'Position: normalized three-part composition · Height: magnitude · All-zero compositions have no position',
  };
}
