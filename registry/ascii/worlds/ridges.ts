import { stroke } from '../engine/glyphs';
import { clamp, noise3 } from '../engine/noise';
import type { GlyphSurface } from '../engine/surface';
import type { AsciiGrid, AsciiPointer, AsciiScene } from '../engine/types';
import { gradient } from '../more-scenes/shared';

export interface RidgesOptions {
  /** Ridgelines in the stack, front to back. Default 22. */
  lines?: number;
  /** The stack from its front line to its back line, as hex stops. */
  colors?: readonly string[];
  /** How tall a loud ridge stands, as a share of the height. Default 0.5. */
  height?: number;
  /**
   * Reads the sound now: frequency levels from 0 to 255, lowest first, such as an
   * `AnalyserNode`'s byte frequency data. Null or silence lets the ridges breathe on their own.
   */
  listen?: () => ArrayLike<number> | null;
}

const SHADES = 6;
/** New lines are added at this rate, so the stack scrolls back at a steady pace. */
const LINES_PER_SECOND = 14;

/**
 * Sound as a landscape. Each moment of it becomes a ridgeline at the front of a stack, with the
 * low notes in the middle and the high ones out to the sides, and the stack rolls back as new
 * moments arrive. Nearer ridges hide the ones behind. With nothing playing, the ridges breathe.
 */
export function createRidges(options: RidgesOptions = {}): AsciiScene {
  const count = clamp(Math.round(options.lines ?? 22), 4, 60);
  const stops = options.colors?.length ? options.colors : ['#e5489c', '#7c5cff', '#3d6bff'];
  const tall = clamp(options.height ?? 0.5, 0.1, 0.9);
  const listen = options.listen;
  let grid: AsciiGrid = { cols: 0, rows: 0, aspect: 2 };
  // Each line: one level per column of the front line, 0 → 1. Index 0 is the newest.
  let history: Float32Array[] = [];
  let points = 0;
  let time = 0;
  let due = 0;
  let pull = 0;
  let pullX = 0;

  function sample(): Float32Array {
    const line = new Float32Array(points);
    const data = listen?.();
    const live = !!data && data.length > 8 && Array.prototype.some.call(data, (v: number) => v > 6);
    for (let i = 0; i < points; i++) {
      // Out from the middle: low notes in the centre, high notes at the edges.
      const t = Math.abs(i / Math.max(1, points - 1) - 0.5) * 2;
      // A bell across the width, so the edges lie flat like a plain.
      const bell = Math.exp(-((t / 0.62) ** 2));
      let level: number;
      if (live) {
        // Log-spaced bins: most of what we hear sits in the lower bins.
        const n = data!.length;
        const bin = Math.min(n - 1, Math.floor(Math.pow(n * 0.7, t * 0.92 + 0.08)));
        level = (data![bin] ?? 0) / 255;
        level = Math.pow(level, 1.6);
      } else {
        level = 0.18 * noise3(i * 0.08, time * 0.6, 3) + 0.06 * noise3(i * 0.4, time * 2, 9);
      }
      // Something near the pointer swells, as if you lean on the sound.
      const near = Math.exp(-(((i / Math.max(1, points) - pullX) / 0.08) ** 2)) * pull * 0.6;
      line[i] = clamp((level + near) * bell, 0, 1);
    }
    return line;
  }

  return {
    palette: gradient(stops, SHADES),
    settle: 2,
    resize(next) {
      grid = next;
      points = Math.max(8, grid.cols);
      history = Array.from({ length: count }, () => new Float32Array(points));
    },
    step(dt, pointer: AsciiPointer) {
      time += dt;
      pull += ((pointer.active ? 1 : 0) - pull) * Math.min(1, dt * 4);
      if (pointer.active) pullX = pointer.x / Math.max(1, grid.cols);
      due += dt;
      if (due < 1 / LINES_PER_SECOND) return;
      due %= 1 / LINES_PER_SECOND;
      history.unshift(sample());
      history.length = count;
    },
    draw(surface: GlyphSurface) {
      const { cols, rows } = grid;
      if (!history.length) return;
      // The highest row drawn so far in each column: nearer ridges hide what is behind them.
      const top = new Float32Array(cols).fill(rows);
      const front = rows * 0.92;
      const back = rows * 0.28;
      for (let k = 0; k < history.length; k++) {
        const line = history[k]!;
        const f = k / Math.max(1, count - 1);
        // Further back: higher up, narrower, a little smaller.
        const base = front - (front - back) * Math.pow(f, 0.85);
        const width = 1 - f * 0.35;
        const amp = rows * tall * (1 - f * 0.45);
        const shade = clamp(Math.floor(f * SHADES), 0, SHADES - 1);
        const alpha = 0.95 - f * 0.6;
        let prevY = NaN;
        for (let col = 0; col < cols; col++) {
          const x = (col - cols / 2) / (cols * width) + 0.5;
          if (x < 0 || x > 1) {
            prevY = NaN;
            continue;
          }
          const level = line[Math.min(points - 1, Math.floor(x * (points - 1)))] ?? 0;
          const y = base - level * amp;
          const r = Math.floor(y);
          if (r < top[col]!) {
            const slope = Number.isNaN(prevY) ? 0 : y - prevY;
            surface.put(
              col,
              r,
              Math.abs(slope) < 0.35 ? (y - r > 0.5 ? '_' : '-') : stroke(1, slope * 2),
              shade,
              alpha,
            );
            // A steep rise leaves no gaps: fill the rows between this point and the last.
            if (!Number.isNaN(prevY) && Math.abs(y - prevY) > 1) {
              const from = Math.min(y, prevY);
              const to = Math.max(y, prevY);
              for (let rr = Math.ceil(from); rr < Math.floor(to); rr++) {
                if (rr < top[col]!) surface.put(col, rr, '|', shade, alpha * 0.8);
              }
            }
            top[col] = Math.min(top[col]!, r);
          }
          prevY = y;
        }
      }
    },
  };
}
