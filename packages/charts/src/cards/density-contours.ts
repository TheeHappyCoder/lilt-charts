import type { Point } from './sculpted-geometry';

/** Marching squares on a padded density grid. Segments join into closed contour rings. */
export function densityContours(
  grid: readonly (readonly number[])[],
  threshold: number,
): Point[][] {
  const segments: [Point, Point][] = [];
  for (let y = 0; y < grid.length - 1; y++)
    for (let x = 0; x < grid[0]!.length - 1; x++) {
      const corners: Point[] = [
        [x, y],
        [x + 1, y],
        [x + 1, y + 1],
        [x, y + 1],
      ];
      const values = [grid[y]![x]!, grid[y]![x + 1]!, grid[y + 1]![x + 1]!, grid[y + 1]![x]!];
      const edges: Point[] = [];
      for (let i = 0; i < 4; i++) {
        const j = (i + 1) % 4;
        if (values[i]! >= threshold === values[j]! >= threshold) continue;
        const t = (threshold - values[i]!) / (values[j]! - values[i]!);
        edges.push([
          corners[i]![0] + (corners[j]![0] - corners[i]![0]) * t,
          corners[i]![1] + (corners[j]![1] - corners[i]![1]) * t,
        ]);
      }
      if (edges.length === 2) segments.push([edges[0]!, edges[1]!]);
      else if (edges.length === 4) {
        const centerHigh = values.reduce((sum, n) => sum + n, 0) / 4 >= threshold;
        if (centerHigh === values[0]! >= threshold)
          segments.push([edges[0]!, edges[1]!], [edges[2]!, edges[3]!]);
        else segments.push([edges[0]!, edges[3]!], [edges[1]!, edges[2]!]);
      }
    }
  const key = ([x, y]: Point) => `${x.toFixed(6)},${y.toFixed(6)}`;
  const adjacent = new Map<string, number[]>();
  segments.forEach((ends, i) =>
    ends.forEach((end) => {
      const k = key(end);
      adjacent.set(k, [...(adjacent.get(k) ?? []), i]);
    }),
  );
  const used = new Set<number>(),
    rings: Point[][] = [];
  segments.forEach((ends, index) => {
    if (used.has(index)) return;
    used.add(index);
    const ring = [...ends];
    const start = key(ring[0]!);
    let end = key(ring.at(-1)!);
    while (end !== start) {
      const next = adjacent.get(end)?.find((i) => !used.has(i));
      if (next === undefined) break;
      used.add(next);
      const pair = segments[next]!;
      const point = key(pair[0]) === end ? pair[1] : pair[0];
      ring.push(point);
      end = key(point);
    }
    if (end === start && ring.length > 3) rings.push(ring);
  });
  return rings;
}
