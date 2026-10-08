import { readField, readNumber, type ObservationMark } from './observations-card';
import { bad, clamp, frame, identity, tint, type Point } from './sculpted-geometry';
import { TAU, camera, ink, paint, ribbon, sum, type Scene } from './spatial-geometry';

export function horizonFoldsLayout<Row>(
  data: readonly Row[],
  series: string,
  time: string,
  value: string,
  width: number,
  height: number,
  options: { bands?: number; color?: string } = {},
): Scene<Row> {
  const groups = [...new Set(data.map((row) => String(readField(row, series))))],
    ids = data.map((row) =>
      identity(String(readField(row, series)), readNumber(row, time) ?? 'missing'),
    );
  if (data.some((row) => readNumber(row, time) === null))
    return bad('Every reading needs a finite numeric time.');
  if (new Set(ids).size !== ids.length) return bad('Each series/time pair must be unique.');
  if (!data.length) return { marks: [] };
  const bands = Math.round(clamp(options.bands, 3, 2, 5)),
    size = frame(width, Math.max(height, groups.length * 62 + 32)),
    left = 75,
    right = size.width - 20,
    top = 12,
    rowHeight = (size.height - 36) / groups.length;
  const times = data.map((row) => readNumber(row, time)!),
    lo = Math.min(...times),
    hi = Math.max(...times),
    divisor = Math.max(1, Math.abs(lo), Math.abs(hi)),
    x = (t: number) =>
      left +
      (hi === lo ? 0.5 : (t / divisor - lo / divisor) / (hi / divisor - lo / divisor)) *
        (right - left);
  const maximum = Math.max(1, ...data.map((row) => Math.abs(readNumber(row, value) ?? 0))),
    unit = maximum / bands,
    marks: ObservationMark<Row>[] = [],
    paths: NonNullable<Scene<Row>['paths']> = [];
  groups.forEach((group, g) => {
    const rows = data
        .map((datum, index) => ({ datum, index, t: times[index]!, v: readNumber(datum, value) }))
        .filter((r) => String(readField(r.datum, series)) === group)
        .sort((a, b) => a.t - b.t),
      base = top + (g + 1) * rowHeight - 12,
      span = rowHeight - 18;
    paths.push({
      id: `baseline-${g}`,
      d: `M${left},${base} H${right}`,
      stroke: ink,
      enter: 'draw',
    });
    for (let i = 1; i < rows.length; i++) {
      const a = rows[i - 1]!,
        b = rows[i]!;
      if (a.v === null || b.v === null) continue;
      for (const sign of [1, -1])
        for (let band = 0; band < bands; band++) {
          const from = a.v * sign,
            to = b.v * sign,
            threshold = band * unit,
            ceiling = (band + 1) * unit;
          const cuts = [
            0,
            1,
            ...[threshold, ceiling]
              .flatMap((v) => (from === to ? [] : [(v - from) / (to - from)]))
              .filter((t) => t > 0 && t < 1),
          ].sort((a, b) => a - b);
          const curve = cuts.map((t) => ({
            x: x(a.t + (b.t - a.t) * t),
            share: Math.max(0, Math.min(1, (from + (to - from) * t - threshold) / unit)),
          }));
          if (curve.every((p) => p.share === 0)) continue;
          const points: Point[] = [
            [x(a.t), base],
            ...curve.map((p): Point => [p.x, base - p.share * span]),
            [x(b.t), base],
          ];
          const color = sign > 0 ? (options.color ?? paint(0)) : paint(3);
          marks.push(
            ribbon(
              {
                id: identity(group, b.t, sign, band),
                label: `${group} · ${b.t}`,
                datum: b.datum,
                value: b.v,
                group,
                color: tint(color, 35 + ((band + 1) / bands) * 65),
                wave: g / groups.length,
                layer: band,
                description: `${sign > 0 ? 'Positive' : 'Negative'} band ${band + 1} · Each band spans ${unit.toPrecision(3)}`,
              },
              points,
            ),
          );
        }
    }
    // A zero or an isolated sample still has a keyboard-accessible measured position.
    for (const row of rows)
      if (row.v !== null)
        marks.push({
          id: identity(group, row.t, 'sample'),
          label: `${group} · ${row.t}`,
          datum: row.datum,
          value: row.v,
          group,
          color: row.v < 0 ? paint(3) : paint(0, options.color),
          shape: 'point',
          x: x(row.t) - 3,
          y: base - span,
          width: 6,
          height: span,
          layer: bands + 1,
          wave: g / groups.length,
        });
  });
  const known = data.map((row) => readNumber(row, value)).filter((v): v is number => v !== null);
  return {
    ...size,
    marks,
    paths,
    highlightGroup: true,
    headline: known.length ? sum(known) / known.length : undefined,
    readings: data.map((row, i) => ({
      id: ids[i]!,
      label: `${String(readField(row, series))} · ${times[i]}`,
      value: readNumber(row, value),
    })),
    labels: [
      ...groups.map((text, i) => ({
        x: left - 10,
        y: top + (i + 0.5) * rowHeight,
        text,
        anchor: 'end' as const,
      })),
      { x: left, y: size.height - 4, text: String(lo) },
      { x: right, y: size.height - 4, text: String(hi), anchor: 'end' },
    ],
    note: `Signed bands folded onto each baseline · First color: positive · Fourth color: negative · ${bands} bands of ${unit.toPrecision(3)}`,
  };
}

export function helixRibbonsLayout<Row>(
  data: readonly Row[],
  series: string,
  cycle: string,
  phase: string,
  value: string,
  width: number,
  height: number,
  options: {
    yaw?: number;
    elevation?: number;
    thickness?: number;
    maxGap?: number;
    color?: string;
  } = {},
): Scene<Row> {
  const rows = data.map((datum, index) => ({
    datum,
    index,
    group: String(readField(datum, series)),
    cycle: readNumber(datum, cycle),
    phase: readNumber(datum, phase),
    value: readNumber(datum, value),
  }));
  if (
    rows.some(
      (r) =>
        r.cycle === null ||
        !Number.isSafeInteger(r.cycle) ||
        r.phase === null ||
        r.phase < 0 ||
        r.phase >= 1 ||
        (r.value !== null && r.value < 0),
    )
  )
    return bad(
      'Use integer cycles, phases from 0 (inclusive) to 1 (exclusive), and nonnegative magnitudes.',
    );
  const ids = rows.map((r) => identity(r.group, r.cycle!, r.phase!));
  if (new Set(ids).size !== ids.length)
    return bad('Each series/cycle/phase sample must be unique.');
  if (!data.length) return { marks: [] };
  const groups = [...new Set(rows.map((r) => r.group))],
    first = Math.min(...rows.map((r) => r.cycle!)),
    last = Math.max(...rows.map((r) => r.cycle!));
  if (last - first > 24) return bad('Show at most 25 consecutive cycles per view.');
  const size = frame(width, height),
    project = camera(size.width, size.height, options.yaw ?? 25, options.elevation ?? 20),
    turns = last - first + 1,
    maximum = Math.max(1, ...rows.map((r) => r.value ?? 0)),
    thickness = clamp(options.thickness, 13, 3, 26),
    gap = clamp(options.maxGap, 0.3, 0.05, 1);
  const point = (t: number, radius = 1) =>
    project([
      Math.cos(TAU * t) * radius,
      Math.sin(TAU * t) * radius,
      ((t - first) / turns) * 2 - 1,
    ]);
  const paths: NonNullable<Scene<Row>['paths']> = [],
    marks: ObservationMark<Row>[] = [];
  for (let n = first; n <= last + 1; n++) {
    const ring = Array.from({ length: 97 }, (_, i) => {
      const p = project([
        Math.cos((TAU * i) / 96),
        Math.sin((TAU * i) / 96),
        ((n - first) / turns) * 2 - 1,
      ]);
      return [p.x, p.y] as Point;
    });
    paths.push({
      id: `cycle-${n}`,
      d: `M${ring.map((p) => p.join(',')).join(' L')}`,
      stroke: ink,
      enter: 'draw',
    });
  }
  groups.forEach((group, g) => {
    const samples = rows
        .filter((r) => r.group === group)
        .sort((a, b) => a.cycle! + a.phase! - (b.cycle! + b.phase!)),
      radius = groups.length === 1 ? 1 : 0.65 + (g / (groups.length - 1)) * 0.45;
    for (let i = 1; i < samples.length; i++) {
      const a = samples[i - 1]!,
        b = samples[i]!,
        t0 = a.cycle! + a.phase!,
        t1 = b.cycle! + b.phase!;
      if (a.value === null || b.value === null || t1 - t0 > gap + 1e-9 || a.value + b.value === 0)
        continue;
      // Short panels preserve front/back order and interpolate width along each measured interval.
      const centres = Array.from({ length: 17 }, (_, j) => {
        const p = point(t0 + ((t1 - t0) * j) / 16, radius);
        return [p.x, p.y] as Point;
      });
      const upper: Point[] = [],
        lower: Point[] = [];
      centres.forEach((p, j) => {
        const prev = centres[Math.max(0, j - 1)]!,
          next = centres[Math.min(16, j + 1)]!,
          length = Math.hypot(next[0] - prev[0], next[1] - prev[1]) || 1,
          w = (((a.value! + ((b.value! - a.value!) * j) / 16) / maximum) * thickness) / 2,
          nx = (-(next[1] - prev[1]) / length) * w,
          ny = ((next[0] - prev[0]) / length) * w;
        upper.push([p[0] + nx, p[1] + ny]);
        lower.push([p[0] - nx, p[1] - ny]);
      });
      marks.push(
        ribbon(
          {
            id: ids[b.index]!,
            label: `${group} · cycle ${b.cycle} · ${(b.phase! * 100).toFixed(0)}%`,
            datum: b.datum,
            value: b.value,
            color: paint(g, options.color),
            group,
            layer: Math.round((point((t0 + t1) / 2, radius).depth + 4) * 100),
            wave: (t1 - first) / turns,
            description: 'Width interpolates between successive known samples',
          },
          [...upper, ...lower.reverse()],
        ),
      );
    }
    for (const r of samples) {
      const t = r.cycle! + r.phase!,
        p = point(t, radius);
      marks.push({
        id: `${ids[r.index]}-sample`,
        label: `${group} · cycle ${r.cycle} · ${(r.phase! * 100).toFixed(0)}%`,
        datum: r.datum,
        value: r.value,
        missing: r.value === null,
        group,
        color: paint(g, options.color),
        shape: 'dot',
        x: p.x - 2.5,
        y: p.y - 2.5,
        width: 5,
        height: 5,
        layer: Math.round((p.depth + 4) * 100) + 1,
        wave: (t - first) / turns,
      });
    }
  });
  return {
    ...size,
    marks,
    paths,
    highlightGroup: true,
    readings: rows.map((r, i) => ({
      id: ids[i]!,
      label: `${r.group} · cycle ${r.cycle} · phase ${r.phase}`,
      value: r.value,
    })),
    groups: groups.map((g, i) => ({
      id: g,
      label: g,
      color: paint(i, options.color),
      value: sum(rows.filter((r) => r.group === g).map((r) => r.value)),
    })),
    labels: Array.from({ length: turns + 1 }, (_, i) => {
      const p = project([-1, 0, (i / turns) * 2 - 1]);
      return { x: p.x - 12, y: p.y, text: String(first + i), anchor: 'end' };
    }),
    note: 'Angle: phase in the cycle · Height: successive cycles · Width: magnitude · Concentric lanes separate series',
  };
}
