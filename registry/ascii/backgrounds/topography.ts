import { stroke } from '../engine/glyphs';
import { approach, clamp, noise3, smoothstep } from '../engine/noise';
import type { GlyphSurface } from '../engine/surface';
import type { AsciiGrid, AsciiPointer, AsciiScene } from '../engine/types';
import { bump } from './shared';

export interface TopographyOptions {
  /** Contour lines from the lowest ground to the highest. Every fifth is an index line. Default 12. */
  levels?: number;
  /** Colour of the index lines, and of the ground the pointer raises. Default violet. */
  color?: string;
  /** How fast the land drifts: 0 holds it still, 2 is twice the default. Default 1. */
  drift?: number;
  /** How strongly the map shows: 1 is quiet enough for text on top. Default 1. */
  intensity?: number;
}

const INK = 0;
const ACCENT = 1;
/**
 * Seconds of land time between keyframes. The ground is sampled at keyframes, a few rows each
 * step, and blended between them: it drifts far too slowly for the blend to show, and noise for
 * every corner on every frame would cost a dozen milliseconds.
 */
const KEY = 0.2;
/** Noise cycles per cell width: hills are about fifty cells apart. */
const SCALE = 0.02;
const COS = Math.cos(0.6);
const SIN = Math.sin(0.6);

/**
 * Smooth rolling ground in roughly [0, 1]. Two octaves of value noise, each turned off the grid so
 * its lattice never shows as boxes, with a gentle warp so ridges bend like real terrain.
 */
function ground(x: number, y: number, z: number) {
  const u = (x * COS - y * SIN) * SCALE;
  const v = (x * SIN + y * COS) * SCALE;
  const wu = u + (noise3(v * 0.7, u * 0.7, z + 9) - 0.5) * 0.9;
  const wv = v + (noise3(u * 0.7 + 4, v * 0.7, z + 13) - 0.5) * 0.9;
  const a = noise3(wu, wv, z);
  const b = noise3(wv * 2.1 + 7, wu * 2.1, z * 1.3 + 5);
  return a * 0.72 + b * 0.28;
}

interface Mark {
  x: number;
  y: number;
  /** Signed height: a peak above zero, a pit below. */
  height: number;
  age: number;
}

/**
 * A contour map of land that drifts slowly, drawn the way a topographic map is: each line follows
 * its ground with the stroke that matches its direction, and every fifth line is an index line,
 * brighter. The pointer raises a hill the lines flow around; a click drops a pit on high ground
 * and a peak on low.
 */
export function createTopography(options: TopographyOptions = {}): AsciiScene {
  const levels = clamp(Math.round(options.levels ?? 12), 3, 40);
  const drift = Math.max(0, options.drift ?? 1);
  const intensity = clamp(options.intensity ?? 1, 0, 3);
  let grid: AsciiGrid = { cols: 0, rows: 0, aspect: 2 };
  /** Height at each cell corner: (cols + 1) by (rows + 1). */
  let height = new Float32Array(0);
  /** How much of each corner's height the pointer and clicks added, for lighting. */
  let raised = new Float32Array(0);
  /** The bare ground at the last keyframe, the next, and the one after, still being built. */
  let past = new Float32Array(0);
  let future = new Float32Array(0);
  let building = new Float32Array(0);
  /** Land time of `past`; `future` is a keyframe later. */
  let keyTime = 0;
  /** Rows of `building` sampled so far. */
  let built = 0;
  const marks: Mark[] = [];
  let time = 0;
  let px = 0;
  let py = 0;
  let presence = 0;

  /** Samples rows of the bare ground at a land time into a field, from `from` up to `to`. */
  function sampleRows(field: Float32Array, land: number, from: number, to: number) {
    const w = grid.cols + 1;
    for (let r = from; r < to; r++) {
      const y = r * grid.aspect;
      for (let c = 0; c <= grid.cols; c++) {
        // Slow noise drifting sideways and changing shape as it goes.
        field[r * w + c] = 0.5 + (ground(c + land * 0.6, y, land * 0.018) - 0.5) * 1.4;
      }
    }
  }

  /** Brings the keyframes up to the land time, building the next one a slice at a time. */
  function advance(land: number) {
    const total = grid.rows + 1;
    while (land >= keyTime + KEY) {
      sampleRows(building, keyTime + 2 * KEY, built, total);
      [past, future, building] = [future, building, past];
      keyTime += KEY;
      built = 0;
    }
    // Keep the build a little ahead of the clock, so it is done before it is needed.
    const due = Math.min(total, Math.ceil(((land - keyTime) / KEY) * total * 1.25) + 1);
    if (due > built) {
      sampleRows(building, keyTime + 2 * KEY, built, due);
      built = due;
    }
  }

  // The two points where a contour crosses the edges of the cell being drawn.
  let hits = 0;
  let x0 = 0;
  let y0 = 0;
  let x1 = 0;
  let y1 = 0;
  const hit = (x: number, y: number) => {
    if (hits === 0) {
      x0 = x;
      y0 = y;
    } else if (hits === 1) {
      x1 = x;
      y1 = y;
    }
    hits++;
  };

  /** Where a level crosses the edge between two corners, 0 → 1, or -1 when it does not. */
  const cross = (a: number, b: number, level: number) =>
    (a - level) * (b - level) < 0 ? (level - a) / (b - a) : -1;

  return {
    palette: ['ink', options.color ?? '#8b6cff'],
    lineHeight: 1.1,
    settle: 1,
    resize(next) {
      grid = next;
      const size = (grid.cols + 1) * (grid.rows + 1);
      height = new Float32Array(size);
      raised = new Float32Array(size);
      past = new Float32Array(size);
      future = new Float32Array(size);
      building = new Float32Array(size);
      const land = time * drift;
      keyTime = land;
      sampleRows(past, land, 0, grid.rows + 1);
      sampleRows(future, land + KEY, 0, grid.rows + 1);
      built = 0;
    },
    step(dt, pointer: AsciiPointer) {
      time += dt;
      advance(time * drift);
      presence = approach(presence, pointer.active ? 1 : 0, pointer.active ? 3 : 1.5, dt);
      if (pointer.active) {
        if (presence < 0.05) {
          px = pointer.x;
          py = pointer.y * grid.aspect;
        }
        // The hill follows slowly, like ground being pushed up rather than a cursor.
        px = approach(px, pointer.x, 5, dt);
        py = approach(py, pointer.y * grid.aspect, 5, dt);
      }
      for (let i = marks.length - 1; i >= 0; i--) {
        marks[i]!.age += dt;
        if (marks[i]!.age > 12) marks.splice(i, 1);
      }
    },
    press(x, y) {
      const { cols, rows } = grid;
      const c = clamp(Math.round(x), 0, cols);
      const r = clamp(Math.round(y), 0, rows);
      const here = height[r * (cols + 1) + c] ?? 0.5;
      marks.push({ x, y: y * grid.aspect, height: here > 0.5 ? -0.22 : 0.22, age: 0 });
      if (marks.length > 5) marks.shift();
    },
    draw(surface: GlyphSurface) {
      const { cols, rows, aspect } = grid;
      const w = cols + 1;
      const blend = drift > 0 ? clamp((time * drift - keyTime) / KEY, 0, 1) : 0;
      const hill = 0.16 * presence;
      const hillRadius = 12;

      // The ground between keyframes, then the hill and the clicks on top of it.
      for (let i = 0; i < height.length; i++) {
        height[i] = past[i]! + (future[i]! - past[i]!) * blend;
      }
      raised.fill(0);
      const lift = (x: number, y: number, amount: number, radius: number) => {
        const r0 = Math.max(0, Math.floor((y - radius * 2.6) / aspect));
        const r1 = Math.min(rows, Math.ceil((y + radius * 2.6) / aspect));
        const c0 = Math.max(0, Math.floor(x - radius * 2.6));
        const c1 = Math.min(cols, Math.ceil(x + radius * 2.6));
        for (let r = r0; r <= r1; r++) {
          const dy = r * aspect - y;
          for (let c = c0; c <= c1; c++) {
            const dx = c - x;
            const v = amount * bump(dx * dx + dy * dy, radius);
            height[r * w + c]! += v;
            raised[r * w + c]! += Math.abs(v);
          }
        }
      };
      if (hill > 0.002) lift(px, py, hill, hillRadius);
      for (const m of marks) {
        // Rise in half a second, hold, then sink back over the last few seconds.
        const life = smoothstep(0, 0.6, m.age) * (1 - smoothstep(7, 12, m.age));
        if (life > 0.001) lift(m.x, m.y, m.height * life, 10);
      }

      const base = 0.2 * intensity;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const i = r * w + c;
          const a = height[i]!;
          const b = height[i + 1]!;
          const d = height[i + w]!;
          const e = height[i + w + 1]!;
          const lo = Math.min(a, b, d, e) * levels;
          const hi = Math.max(a, b, d, e) * levels;
          const k0 = Math.floor(lo);
          const k1 = Math.floor(hi);
          if (k0 === k1) continue;
          // Where several lines pass through one cell, draw the one nearest its middle.
          const mid = ((a + b + d + e) / 4) * levels;
          const k = clamp(Math.round(mid), k0 + 1, k1);
          const level = k / levels;

          // Marching squares: the line enters and leaves through the edges it crosses.
          hits = 0;
          let s = cross(a, b, level);
          if (s >= 0) hit(s, 0);
          s = cross(b, e, level);
          if (s >= 0) hit(1, s);
          s = cross(d, e, level);
          if (s >= 0) hit(s, 1);
          s = cross(a, d, level);
          if (s >= 0) hit(0, s);
          if (hits < 2) continue;

          // Coverage: a line that only clips a corner of the cell is drawn faint, or not at all.
          const span = Math.hypot(x1 - x0, (y1 - y0) * aspect);
          if (span < 0.35) continue;
          const cover = 0.3 + 0.7 * smoothstep(0.35, 1.3, span);
          let glyph = stroke(x1 - x0, (y1 - y0) * aspect);
          // A flat line low in its cell sits on the baseline.
          if (glyph === '-' && (y0 + y1) / 2 > 0.66) glyph = '_';
          const index = k % 5 === 0;
          const lit = Math.min(1, (raised[i]! + raised[i + w + 1]!) * 3);
          if (index) {
            const opacity = (0.45 + lit * 0.3) * intensity * cover;
            surface.put(c, r, glyph, ACCENT, clamp(opacity, 0, 1));
          } else {
            const opacity = (base + lit * 0.3) * cover;
            surface.put(c, r, glyph, lit > 0.3 ? ACCENT : INK, clamp(opacity, 0, 1));
          }
        }
      }
    },
  };
}
