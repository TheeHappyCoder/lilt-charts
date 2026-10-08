/**
 * Smootherstep: zero slope and zero curvature at both ends. A notch drawn with it leaves the
 * straight border with no bend at all and settles into its flat run the same way, so the outline
 * reads as one continuous line rather than a curve joined to an edge.
 */
const smoother = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

/** Enough segments that each stays under a few pixels, so the outline renders as a curve. */
const STEPS = 32;

/**
 * Line segments from `from` to `to` (the start is not included). `along` names the axis that runs
 * along the border and moves evenly; the other axis eases out and back in.
 */
export function swellTo(
  from: readonly [number, number],
  to: readonly [number, number],
  along: 'x' | 'y',
): string {
  const points: string[] = [];
  for (let step = 1; step <= STEPS; step += 1) {
    const t = step / STEPS;
    const even = (a: number, b: number) => a + (b - a) * t;
    const eased = (a: number, b: number) => a + (b - a) * smoother(t);
    const x = along === 'x' ? even(from[0], to[0]) : eased(from[0], to[0]);
    const y = along === 'y' ? even(from[1], to[1]) : eased(from[1], to[1]);
    points.push(`L ${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  return points.join(' ');
}
