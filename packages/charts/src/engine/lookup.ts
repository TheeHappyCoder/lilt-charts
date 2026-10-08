export function nearestVisibleRowIndex<T extends { x: number }>(
  rows: readonly T[],
  domain: readonly [number, number],
  pixel: number,
  xToPixel: (x: number) => number,
): number | null {
  let low = 0;
  let high = rows.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (rows[middle].x < domain[0]) low = middle + 1;
    else high = middle;
  }
  const first = low;
  high = rows.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (rows[middle].x <= domain[1]) low = middle + 1;
    else high = middle;
  }
  const last = low - 1;
  if (first > last) return null;
  low = first;
  high = last;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (xToPixel(rows[middle].x) < pixel) low = middle + 1;
    else high = middle;
  }
  const before = Math.max(first, low - 1);
  return Math.abs(xToPixel(rows[before].x) - pixel) <= Math.abs(xToPixel(rows[low].x) - pixel)
    ? before
    : low;
}
