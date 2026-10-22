import { clamp } from '../engine/noise';

/** Brand stops: violet to rose. */
export const BRAND = ['#7c5cff', '#e5489c'] as const;

/** Colours `steps` evenly along a run of hex stops, for a palette. */
export function gradient(stops: readonly string[], steps: number): string[] {
  return Array.from({ length: steps }, (_, i) => sample(stops, steps === 1 ? 0 : i / (steps - 1)));
}

/** The colour a share of the way along a run of hex stops. */
export function sample(stops: readonly string[], t: number): string {
  if (stops.length === 0) return BRAND[0];
  if (stops.length === 1) return stops[0]!;
  const span = clamp(t, 0, 1) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(span));
  const a = rgb(stops[i]!);
  const b = rgb(stops[i + 1]!);
  const k = span - i;
  const mix = (m: number, n: number) => Math.round(m + (n - m) * k);
  return `rgb(${mix(a[0], b[0])},${mix(a[1], b[1])},${mix(a[2], b[2])})`;
}

function rgb(colour: string): [number, number, number] {
  let h = colour.replace('#', '');
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** A Gaussian bump: 1 at the centre, about 0.37 at `radius`. */
export const bump = (d2: number, radius: number) => Math.exp(-d2 / (radius * radius));
