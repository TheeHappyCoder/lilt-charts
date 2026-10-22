import { hash3 } from '../engine/noise';
import type { Rgb } from './colour';

/*
 * Colour in type. The stage paints with one fill style per palette colour and opacity step, so a
 * picture's colours are cut down to a few dozen. Brightness rides on opacity rather than on the
 * colour: on a dark page a colour scaled to full brightness, laid on at the pixel's brightness,
 * gives the pixel back; on a light page the same holds for darkness. That leaves only hue and
 * saturation to the palette, and a small palette covers them well.
 */

/**
 * A pixel's colour with its brightness taken out, for a dark backdrop: scaled until its brightest
 * channel is full. Its brightness, the opacity to lay it on at, is that channel's value.
 */
export function chromaOnDark(r: number, g: number, b: number, out: Rgb): number {
  const m = Math.max(r, g, b);
  if (m < 1e-3) {
    out[0] = out[1] = out[2] = 1;
    return 0;
  }
  out[0] = r / m;
  out[1] = g / m;
  out[2] = b / m;
  return m;
}

/** The same for a light backdrop: the colour's darkness scaled to full, as ink on paper. */
export function chromaOnLight(r: number, g: number, b: number, out: Rgb): number {
  const m = Math.max(1 - r, 1 - g, 1 - b);
  if (m < 1e-3) {
    out[0] = out[1] = out[2] = 0;
    return 0;
  }
  out[0] = 1 - (1 - r) / m;
  out[1] = 1 - (1 - g) / m;
  out[2] = 1 - (1 - b) / m;
  return m;
}

/** HSV to RGB, all from 0 to 1. */
export function hsv(h: number, s: number, v: number): Rgb {
  const f = (n: number) => {
    const k = (n + h * 6) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  return [f(5), f(3), f(1)];
}

/**
 * A palette for any picture on a dark backdrop: hues round the wheel at a few saturations, plus
 * white. Used for video, whose colours change from frame to frame.
 */
export function wheelPalette(hues = 16, saturations: readonly number[] = [0.22, 0.5, 0.85]): Rgb[] {
  const out: Rgb[] = [[1, 1, 1]];
  for (const s of saturations) {
    for (let h = 0; h < hues; h++) out.push(hsv(h / hues, s, 1));
  }
  return out;
}

/** A dark-backdrop palette turned for a light one: each colour's complement. */
export const forPaper = (palette: readonly Rgb[]): Rgb[] =>
  palette.map(([r, g, b]) => [1 - r, 1 - g, 1 - b]);

/**
 * Picks `k` colours that best stand for a set of weighted colours, by k-means seeded with
 * k-means++. `points` holds r, g, b triples. Deterministic: the seeding draws from a hash.
 */
export function kMeans(points: Float32Array, weights: Float32Array, k: number, rounds = 10): Rgb[] {
  const n = Math.floor(points.length / 3);
  let total = 0;
  for (let i = 0; i < n; i++) total += weights[i]!;
  if (!n || total <= 0) return [[1, 1, 1]];
  const centres: number[] = [];
  const near = new Float32Array(n).fill(Infinity);

  // k-means++: each new centre is drawn in proportion to how far a point is from the nearest one.
  let pick = 0;
  let target = hash3(1, 2, 3) * total;
  for (let i = 0; i < n; i++) {
    target -= weights[i]!;
    if (target <= 0) {
      pick = i;
      break;
    }
  }
  for (let c = 0; c < k; c++) {
    centres.push(points[pick * 3]!, points[pick * 3 + 1]!, points[pick * 3 + 2]!);
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const dr = points[i * 3]! - centres[c * 3]!;
      const dg = points[i * 3 + 1]! - centres[c * 3 + 1]!;
      const db = points[i * 3 + 2]! - centres[c * 3 + 2]!;
      near[i] = Math.min(near[i]!, dr * dr + dg * dg + db * db);
      sum += near[i]! * weights[i]!;
    }
    if (sum <= 1e-9) break;
    target = hash3(c, 7, 11) * sum;
    pick = n - 1;
    for (let i = 0; i < n; i++) {
      target -= near[i]! * weights[i]!;
      if (target <= 0) {
        pick = i;
        break;
      }
    }
  }

  const count = centres.length / 3;
  const acc = new Float64Array(count * 4);
  for (let round = 0; round < rounds; round++) {
    acc.fill(0);
    for (let i = 0; i < n; i++) {
      const c = nearestOf(centres, count, points[i * 3]!, points[i * 3 + 1]!, points[i * 3 + 2]!);
      const w = weights[i]!;
      acc[c * 4] += points[i * 3]! * w;
      acc[c * 4 + 1] += points[i * 3 + 1]! * w;
      acc[c * 4 + 2] += points[i * 3 + 2]! * w;
      acc[c * 4 + 3] += w;
    }
    for (let c = 0; c < count; c++) {
      const w = acc[c * 4 + 3]!;
      if (w <= 0) continue;
      centres[c * 3] = acc[c * 4]! / w;
      centres[c * 3 + 1] = acc[c * 4 + 1]! / w;
      centres[c * 3 + 2] = acc[c * 4 + 2]! / w;
    }
  }
  const out: Rgb[] = [];
  for (let c = 0; c < count; c++)
    out.push([centres[c * 3]!, centres[c * 3 + 1]!, centres[c * 3 + 2]!]);
  return out;
}

function nearestOf(centres: readonly number[], count: number, r: number, g: number, b: number) {
  let best = 0;
  let bestD = Infinity;
  for (let c = 0; c < count; c++) {
    const dr = r - centres[c * 3]!;
    const dg = g - centres[c * 3 + 1]!;
    const db = b - centres[c * 3 + 2]!;
    // Weighted toward green, as the eye is.
    const d = dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11;
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best;
}

const BITS = 5;
const SIDE = 1 << BITS;

/**
 * Finds the nearest palette colour fast, through a table of every 15-bit colour, filled in as
 * colours are asked for.
 */
export class Quantiser {
  private flat: number[];
  private table = new Uint8Array(SIDE * SIDE * SIDE).fill(255);

  constructor(readonly palette: readonly Rgb[]) {
    this.flat = palette.flat();
  }

  /** The index of the nearest palette colour to a colour with channels from 0 to 1. */
  index(r: number, g: number, b: number): number {
    const q = (v: number) => Math.min(SIDE - 1, Math.max(0, Math.floor(v * SIDE)));
    const key = (q(r) << (BITS * 2)) | (q(g) << BITS) | q(b);
    let hit = this.table[key]!;
    if (hit === 255) {
      // The middle of the table cell stands for every colour in it.
      const s = 1 / SIDE;
      hit = nearestOf(
        this.flat,
        this.palette.length,
        (q(r) + 0.5) * s,
        (q(g) + 0.5) * s,
        (q(b) + 0.5) * s,
      );
      this.table[key] = hit;
    }
    return hit;
  }
}
