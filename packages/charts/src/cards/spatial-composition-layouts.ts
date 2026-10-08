import { readField, readNumber, type ObservationMark } from './observations-card';
import { fitFloorPrisms, type FloorPrism } from './prism-grid';
import { bad, clamp, frame, identity, polygon } from './sculpted-geometry';
import {
  TAU,
  ink,
  negative,
  paint,
  ribbon,
  sector,
  slab,
  sum,
  type Scene,
} from './spatial-geometry';

function pairs<Row>(data: readonly Row[], a: string, b: string) {
  const ids = data.map((row) => identity(String(readField(row, a)), String(readField(row, b))));
  return new Set(ids).size === ids.length ? ids : null;
}
export function windRoseLayout<Row>(
  data: readonly Row[],
  direction: string,
  band: string,
  value: string,
  width: number,
  height: number,
  options: { sectors?: number; tilt?: number; color?: string } = {},
): Scene<Row> {
  const count = Math.round(clamp(options.sectors, 8, 4, 16)),
    tilt = clamp(options.tilt, 0.76, 0.45, 1),
    size = frame(width, height);
  if (negative(data, value)) return bad('Frequencies must be nonnegative.');
  const bands = [...new Set(data.map((row) => String(readField(row, band))))],
    ids = pairs(data, direction, band);
  if (!ids) return bad('Aggregate each direction/band pair before drawing.');
  if (
    data.some((row) => {
      const d = readNumber(row, direction);
      return (
        d === null ||
        d < 0 ||
        d >= 360 ||
        Math.abs(d / (360 / count) - Math.round(d / (360 / count))) > 1e-6
      );
    })
  )
    return bad(
      `Directions must be sector centres: multiples of ${360 / count}°, from 0° up to 360°.`,
    );
  if (!data.length) return { marks: [] };
  const totals = Array.from({ length: count }, (_, i) =>
    sum(
      data
        .filter((row) => readNumber(row, direction) === (i * 360) / count)
        .map((row) => readNumber(row, value)),
    ),
  );
  const max = Math.max(1, ...totals),
    radius = Math.min((size.width - 64) / 2, (size.height - 60) / (2 * tilt)),
    cx = size.width / 2,
    cy = size.height / 2;
  const paths: NonNullable<Scene<Row>['paths']> = Array.from({ length: 4 }, (_, i) => ({
    id: `ring-${i}`,
    d: polygon(
      sector(cx, cy, 0, (radius * (i + 1)) / 4, 0, TAU, tilt).slice(0, Math.ceil(TAU * 24) + 1),
    ),
    stroke: ink,
    enter: 'draw',
  }));
  const marks: ObservationMark<Row>[] = [];
  for (let i = 0; i < count; i++) {
    let accumulated = 0;
    for (const [j, name] of bands.entries()) {
      const index = data.findIndex(
        (row) =>
          readNumber(row, direction) === (i * 360) / count && String(readField(row, band)) === name,
      );
      if (index < 0) continue;
      const row = data[index]!,
        v = readNumber(row, value);
      if (v === null || v === 0) continue;
      const start = (TAU * i) / count - Math.PI / 2 - (TAU / count) * 0.43,
        end = start + (TAU / count) * 0.86;
      // Equal sector angles: squared radius ensures each band area represents frequency.
      const inner = Math.sqrt(accumulated / max) * radius,
        outer = Math.sqrt((accumulated + v) / max) * radius;
      marks.push(
        ribbon(
          {
            id: ids[index]!,
            label: `${(i * 360) / count}° · ${name}`,
            datum: row,
            value: v,
            group: name,
            color: paint(j, options.color),
            wave: i / count,
            description: `Direction ${(i * 360) / count}° · Sector total ${totals[i]}`,
          },
          sector(cx, cy, inner, outer, start, end, tilt),
        ),
      );
      accumulated += v;
    }
  }
  return {
    ...size,
    marks,
    paths,
    readings: data.map((row, i) => ({
      id: ids[i]!,
      label: `${readNumber(row, direction)}° · ${String(readField(row, band))}`,
      value: readNumber(row, value),
    })),
    groups: bands.map((b, i) => ({
      id: b,
      label: b,
      color: paint(i, options.color),
      value: sum(
        data.filter((row) => readField(row, band) === b).map((row) => readNumber(row, value)),
      ),
    })),
    labels: ['N', 'E', 'S', 'W'].map((text, i) => ({
      x: cx + Math.sin((i * Math.PI) / 2) * (radius + 18),
      y: cy - Math.cos((i * Math.PI) / 2) * (radius * tilt + 18) + 4,
      text,
      anchor: 'middle',
    })),
    note: 'Petal area: frequency · Bands stack in first-seen order · North is 0°, clockwise',
  };
}

export function marimekkoBlocksLayout<Row>(
  data: readonly Row[],
  category: string,
  segment: string,
  value: string,
  width: number,
  height: number,
  options: { gap?: number; color?: string } = {},
): Scene<Row> {
  if (negative(data, value)) return bad('Composition values must be nonnegative.');
  const ids = pairs(data, category, segment);
  if (!ids) return bad('Aggregate duplicate category/segment pairs first.');
  if (!data.length) return { marks: [] };
  const cats = [...new Set(data.map((row) => String(readField(row, category))))],
    segments = [...new Set(data.map((row) => String(readField(row, segment))))],
    totals = cats.map((c) =>
      sum(
        data.filter((row) => readField(row, category) === c).map((row) => readNumber(row, value)),
      ),
    ),
    total = sum(totals),
    gap = clamp(options.gap, 0.06, 0, 0.2),
    size = frame(width, height);
  if (!Number.isFinite(total)) return bad('Composition total exceeds the finite numeric range.');
  const items: FloorPrism<Row>[] = [],
    centres: { x: number; text: string }[] = [];
  let x = 0;
  cats.forEach((cat, i) => {
    const w = total ? (totals[i]! / total) * 12 : 0;
    if (w === 0) return;
    let y = 0;
    centres.push({ x: x + w / 2, text: cat });
    data.forEach((row, j) => {
      if (readField(row, category) !== cat) return;
      const v = readNumber(row, value);
      if (v === null || v === 0) return;
      const h = (v / totals[i]!) * 7;
      // Gaps are between columns only. Within a column every measured area stays intact.
      items.push({
        id: ids[j]!,
        label: `${cat} · ${String(readField(row, segment))}`,
        datum: row,
        value: v,
        group: String(readField(row, segment)),
        color: paint(segments.indexOf(String(readField(row, segment))), options.color),
        footprint: [
          [x, y],
          [x + w, y],
          [x + w, y + h],
          [x, y + h],
        ],
        base: 0,
        rise: 0.2,
        depth: x + y,
        wave: i / cats.length,
        description: `${((v / totals[i]!) * 100).toFixed(1)}% of ${cat} · ${((v / total) * 100).toFixed(1)}% of total`,
      });
      y += h;
    });
    x += w + gap;
  });
  const scene = items.length
    ? fitFloorPrisms(items, size.width - 12, size.height - 28)
    : { marks: [] };
  return {
    ...size,
    ...scene,
    readings: data.map((row, i) => ({
      id: ids[i]!,
      label: `${String(readField(row, category))} · ${String(readField(row, segment))}`,
      value: readNumber(row, value),
    })),
    groups: segments.map((s, i) => ({
      id: s,
      label: s,
      color: paint(i, options.color),
      value: sum(
        data.filter((row) => readField(row, segment) === s).map((row) => readNumber(row, value)),
      ),
    })),
    labels:
      'toScreen' in scene
        ? centres.map((c) => {
            const [x, y] = scene.toScreen(c.x, 7);
            return { x, y: y + 20, text: c.text, anchor: 'middle' as const };
          })
        : [],
    note: 'Column width: category total · Subdivision area: value · Every slab has equal depth',
  };
}

export function intersectionTowersLayout<Row>(
  data: readonly Row[],
  members: string,
  value: string,
  width: number,
  height: number,
  options: { sort?: 'value' | 'input'; color?: string } = {},
): Scene<Row> {
  if (negative(data, value)) return bad('Intersection sizes must be nonnegative.');
  const rows = data.map((datum, index) => ({
    datum,
    index,
    sets: readField(datum, members),
    value: readNumber(datum, value),
  }));
  if (
    rows.some(
      (r) =>
        !Array.isArray(r.sets) ||
        r.sets.length === 0 ||
        r.sets.some((s) => typeof s !== 'string' || !s.trim()) ||
        new Set(r.sets).size !== r.sets.length,
    )
  )
    return bad('Each row needs a nonempty array of distinct set names.');
  const checked = rows.map((r) => ({ ...r, sets: [...(r.sets as string[])].sort() })),
    ids = checked.map((r) => JSON.stringify(r.sets));
  if (new Set(ids).size !== ids.length) return bad('Each exclusive intersection must occur once.');
  if (!rows.length) return { marks: [] };
  const sets = [...new Set(checked.flatMap((r) => r.sets))],
    ordered =
      options.sort === 'input'
        ? checked
        : [...checked].sort((a, b) => (b.value ?? -1) - (a.value ?? -1));
  const size = frame(
      Math.max(width, 120 + data.length * 48),
      Math.max(height, sets.length * 25 + 150),
    ),
    left = 100,
    column = (size.width - left - 20) / data.length,
    base = size.height - sets.length * 25 - 28,
    max = Math.max(1, ...rows.map((r) => r.value ?? 0));
  const paths: NonNullable<Scene<Row>['paths']> = [],
    marks: ObservationMark<Row>[] = [];
  ordered.forEach((row, i) => {
    const id = JSON.stringify(row.sets),
      cx = left + (i + 0.5) * column,
      bar = ((row.value ?? 0) / max) * (base - 22),
      color = paint(row.sets.length - 1, options.color),
      present = sets.flatMap((s, j) => (row.sets.includes(s) ? [base + 28 + j * 25] : []));
    marks.push(
      slab(
        {
          id,
          label: row.sets.join(' ∩ '),
          datum: row.datum,
          value: row.value,
          missing: row.value === null,
          color,
          wave: i / rows.length,
          description: 'Exclusive intersection: only these sets',
        },
        cx - column * 0.28,
        base - Math.max(2, bar),
        column * 0.56,
        Math.max(2, bar),
        7,
      ),
    );
    paths.push({
      id: `${id}-stem`,
      d: `M${cx},${Math.min(...present)} V${Math.max(...present)}`,
      stroke: color,
      enter: 'draw',
      related: [id],
    });
    sets.forEach((s, j) => {
      const y = base + 28 + j * 25,
        r = row.sets.includes(s) ? 4 : 2;
      paths.push({
        id: `${id}-${s}`,
        d: `M${cx - r},${y} a${r},${r} 0 1,0 ${r * 2},0 a${r},${r} 0 1,0 ${-r * 2},0`,
        fill: row.sets.includes(s) ? color : ink,
        enter: 'rise',
        related: [id],
        wave: i / rows.length,
      });
    });
  });
  return {
    ...size,
    marks,
    paths,
    readings: checked.map((r) => ({
      id: JSON.stringify(r.sets),
      label: r.sets.join(' ∩ '),
      value: r.value,
    })),
    labels: sets.map((s, j) => ({ x: left - 14, y: base + 32 + j * 25, text: s, anchor: 'end' })),
    note: 'Tower height: exclusive intersection size · Connected dots identify included sets',
  };
}
