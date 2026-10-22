import { clamp } from '../engine/noise';
import type { AsciiGrid } from '../engine/types';

/** How a picture sits in its frame: whole with room around it, or filling it and cropped. */
export type MediaFit = 'cover' | 'contain';

/** Where a picture lands on the grid, in cells, and the part of the source it shows. */
export interface Placement {
  col: number;
  row: number;
  cols: number;
  rows: number;
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

/** Space kept clear around a contained picture, in cells. */
export const PAD = { x: 3, y: 1 };

/**
 * Places a `width` × `height` source on the grid. Cells are taller than they are wide, so a cell
 * covers `aspect` times as much of the picture down as across: the picture keeps its shape.
 */
export function place(width: number, height: number, grid: AsciiGrid, fit: MediaFit): Placement {
  const { cols, rows, aspect } = grid;
  if (fit === 'cover') {
    const w = cols;
    const h = rows * aspect;
    const scale = Math.max(w / width, h / height);
    const sw = Math.min(width, w / scale);
    const sh = Math.min(height, h / scale);
    return { col: 0, row: 0, cols, rows, sx: (width - sw) / 2, sy: (height - sh) / 2, sw, sh };
  }
  const w = Math.max(1, cols - PAD.x * 2);
  const h = Math.max(1, rows - PAD.y * 2) * aspect;
  const scale = Math.min(w / width, h / height);
  const boxCols = clamp(Math.round(width * scale), 1, cols);
  const boxRows = clamp(Math.round((height * scale) / aspect), 1, rows);
  return {
    col: Math.floor((cols - boxCols) / 2),
    row: Math.floor((rows - boxRows) / 2),
    cols: boxCols,
    rows: boxRows,
    sx: 0,
    sy: 0,
    sw: width,
    sh: height,
  };
}

/** A picture at grid resolution: colour from 0 to 1 per cell, and how opaque it is. */
export interface CellPixels {
  cols: number;
  rows: number;
  r: Float32Array;
  g: Float32Array;
  b: Float32Array;
  a: Float32Array;
}

export function cellPixels(cols: number, rows: number): CellPixels {
  const size = cols * rows;
  return {
    cols,
    rows,
    r: new Float32Array(size),
    g: new Float32Array(size),
    b: new Float32Array(size),
    a: new Float32Array(size),
  };
}

/**
 * Averages blocks of `factor` × `factor` pixels into one cell each: every pixel under a cell
 * counts, so fine detail turns to tone instead of flickering in and out. Colour is weighted by
 * opacity, so a transparent pixel's colour never bleeds into its neighbours.
 */
export function boxAverage(
  rgba: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
  factor: number,
  out: CellPixels,
) {
  const { cols, rows } = out;
  const inv = 1 / 255;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let n = 0;
      const y0 = row * factor;
      const x0 = col * factor;
      for (let y = y0; y < Math.min(height, y0 + factor); y++) {
        let p = (y * width + x0) * 4;
        for (let x = x0; x < Math.min(width, x0 + factor); x++, p += 4) {
          const alpha = rgba[p + 3]! * inv;
          r += rgba[p]! * alpha;
          g += rgba[p + 1]! * alpha;
          b += rgba[p + 2]! * alpha;
          a += alpha;
          n++;
        }
      }
      const i = row * cols + col;
      const k = a > 0 ? inv / a : 0;
      out.r[i] = r * k;
      out.g[i] = g * k;
      out.b[i] = b * k;
      out.a[i] = n ? a / n : 0;
    }
  }
}

/**
 * The darkest and brightest values worth spreading across the ramp: the 2nd and 99th percentiles,
 * so a few stray pixels can't flatten the picture. Values are from 0 to 1, weighted.
 */
export function levels(values: Float32Array, weights: Float32Array): [number, number] {
  const bins = new Float32Array(256);
  let total = 0;
  for (let i = 0; i < values.length; i++) {
    const w = weights[i]!;
    if (w <= 0.02) continue;
    bins[clamp(Math.floor(values[i]! * 255), 0, 255)] += w;
    total += w;
  }
  if (total <= 0) return [0, 1];
  const find = (share: number) => {
    let sum = 0;
    for (let k = 0; k < 256; k++) {
      sum += bins[k]!;
      if (sum >= total * share) return k / 255;
    }
    return 1;
  };
  const lo = find(0.02);
  const hi = Math.max(find(0.99), lo + 0.15);
  return [lo, Math.min(1, hi)];
}

/**
 * Stretches a value between the levels, then bends it: `contrast` above 1 pushes tones apart
 * from the middle, below 1 pulls them together, and `gamma` lifts or sinks the mid-tones.
 */
export function shape(v: number, lo: number, hi: number, contrast: number, gamma: number) {
  const t = clamp((v - lo) / (hi - lo || 1), 0, 1);
  const x = t * 2 - 1;
  const s = (Math.sign(x) * Math.pow(Math.abs(x), 1 / Math.max(0.1, contrast)) + 1) / 2;
  return Math.pow(s, gamma);
}
