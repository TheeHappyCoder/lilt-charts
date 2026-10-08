export interface ScatterPoint<T> {
  id: string;
  label: string;
  row: T;
  x: number | null;
  y: number | null;
  size: number | null;
}

export interface PositionedScatterPoint<T> extends ScatterPoint<T> {
  cx: number;
  cy: number;
  radius: number;
}

/** Nearest candidate wins; a repeated click can cycle coincident points. */
export function hitTestScatter<T>(
  points: readonly PositionedScatterPoint<T>[],
  x: number,
  y: number,
  selectedId: string | null,
  cycle = false,
): string | null {
  if (!cycle) {
    let nearest: PositionedScatterPoint<T> | null = null;
    let nearestSquared = Infinity;
    for (const point of points) {
      const dx = point.cx - x;
      const dy = point.cy - y;
      const squared = dx * dx + dy * dy;
      const reach = Math.max(12, point.radius + 7);
      if (squared > reach * reach) continue;
      if (
        squared < nearestSquared ||
        (squared === nearestSquared && point.id < (nearest?.id ?? ''))
      ) {
        nearest = point;
        nearestSquared = squared;
      }
    }
    return nearest?.id ?? null;
  }
  const candidates = points
    .map((point) => ({ point, distance: Math.hypot(point.cx - x, point.cy - y) }))
    .filter(({ point, distance }) => distance <= Math.max(12, point.radius + 7))
    .sort((a, b) => a.distance - b.distance || a.point.id.localeCompare(b.point.id));
  if (!candidates.length) return null;
  if (!cycle) return candidates[0].point.id;
  const nearest = candidates[0].distance;
  const overlap = candidates.filter((candidate) => candidate.distance - nearest <= 2);
  const current = overlap.findIndex((candidate) => candidate.point.id === selectedId);
  return overlap[(current + 1) % overlap.length].point.id;
}
