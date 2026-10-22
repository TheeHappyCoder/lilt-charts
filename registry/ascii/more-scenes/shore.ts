import { stroke } from '../engine/glyphs';
import { clamp, hash3, noise3, smoothstep } from '../engine/noise';
import { DOT, type GlyphSurface } from '../engine/surface';
import type { AsciiGrid, AsciiPointer, AsciiScene } from '../engine/types';
import { gradient } from './shared';

export interface ShoreOptions {
  /** Colour of the open sea. Default a deep clear blue. */
  water?: string;
  /** Colour of the dry sand. Default a warm pale sand. */
  sand?: string;
  /** Colour of the shallows by the shore. Default a pale turquoise. */
  shallow?: string;
  /** Seconds between waves. Default 7. */
  period?: number;
}

const FOAM = 0;
/** Light on the water, and the lace cut into foam: a mid blue that shows on any page. */
const GLINT = 1;
/** Dry sand grain. */
const GRAIN = 2;
/** Grooves the pointer draws. */
const GROOVE = 3;
/** The sea, from far and deep to near and shallow. */
const SEA = 4;
const SEA_STEPS = 8;
/** Wet sand, from soaked to nearly dry. */
const WET = SEA + SEA_STEPS;
const WET_STEPS = 5;
/** The thin sheet of a spent wave over sand, from clear to sandy. */
const SHEET = WET + WET_STEPS;
const SHEET_STEPS = 4;

/** Seconds a wave takes to roll in, run up the sand, and draw back. */
const ROLL = 3.6;
const RUN = 2.2;
const BACK = 3.2;

interface Wave {
  age: number;
  strength: number;
  seed: number;
}

/**
 * A beach from above and a little to the side. Waves roll in from the horizon, rear up and break
 * into foam, then run up the sand as a thin sheet edged with lace. As they draw back they leave the
 * sand dark and wet, and it dries slowly to pale again. The pointer writes in the sand, and the
 * next wave washes the marks away; a click sends in a bigger wave.
 */
export function createShore(options: ShoreOptions = {}): AsciiScene {
  const period = Math.max(3, options.period ?? 7);
  const water = options.water ?? '#2a5db0';
  const shallow = options.shallow ?? '#5cc8d2';
  const sand = options.sand ?? '#dcbb8a';
  let grid: AsciiGrid = { cols: 0, rows: 0, aspect: 2 };
  let wet = new Float32Array(0);
  let foam = new Float32Array(0);
  let marks = new Float32Array(0);
  let markGlyph = new Uint16Array(0);
  /** How far up the sand the water reaches in each column this frame, as a row. */
  let edge = new Float32Array(0);
  let lastEdge = new Float32Array(0);
  const waves: Wave[] = [];
  let time = 0;
  let owed = 0;
  let lastX = -1;
  let lastY = -1;
  let seeds = 0;

  const horizon = () => Math.max(2, Math.round(grid.rows * 0.3));
  /** The row the sea meets the sand when the water is still. */
  const shore = () => Math.round(grid.rows * 0.56);
  const reach = () => grid.rows * 0.14;

  function addWave(strength: number) {
    waves.push({ age: 0, strength, seed: seeds++ });
  }

  /** How far a wave has run up the sand at a column, in rows past the shore, or null. */
  function swash(w: Wave, col: number): number | null {
    const a = w.age - ROLL;
    if (a < 0) return null;
    const along = 0.55 + 0.75 * noise3(col * 0.025, w.seed * 3.1, 1);
    const run = reach() * w.strength * along;
    if (a < RUN) return run * Math.sin((a / RUN) * (Math.PI / 2));
    const back = (a - RUN) / BACK;
    if (back > 1) return null;
    return run * (1 - smoothstep(0, 1, back)) - back * 1.5;
  }

  /** The row of a wave's crest as it rolls in, or null once it has broken. */
  function crest(w: Wave, col: number): number | null {
    const t = w.age / ROLL;
    if (t >= 1) return null;
    const hz = horizon();
    // Waves come in slowly at first, then quicken in perspective; the line bows with the beach.
    const bow = (noise3(col * 0.02, w.seed, 5) - 0.5) * 2.4 * t;
    return hz + 1 + (shore() - hz - 1) * Math.pow(t, 1.5) + bow;
  }

  return {
    palette: [
      '#f4f8fc',
      '#6aa6d8',
      sand,
      '#5a3f27',
      ...gradient([water, shallow], SEA_STEPS),
      ...gradient(['#7a5b3e', '#a3835c', sand], WET_STEPS),
      ...gradient([shallow, '#7d6a52'], SHEET_STEPS),
    ],
    lineHeight: 1,
    settle: 6.2,
    resize(next) {
      const same =
        next.cols === grid.cols && next.rows === grid.rows && next.aspect === grid.aspect;
      grid = next;
      if (same && wet.length) return;
      const size = grid.cols * grid.rows;
      wet = new Float32Array(size);
      foam = new Float32Array(size);
      marks = new Float32Array(size);
      markGlyph = new Uint16Array(size);
      edge = new Float32Array(grid.cols);
      lastEdge = new Float32Array(grid.cols);
      waves.length = 0;
      // One wave already on the sand and the next on its way, so the first frame is a beach.
      waves.push({ age: ROLL + RUN * 0.8, strength: 1, seed: seeds++ });
      addWave(1);
      waves[1]!.age = 1;
      owed = 0.3;
    },
    step(dt, pointer: AsciiPointer) {
      if (!grid.cols) return;
      const { cols, rows } = grid;
      time += dt;
      owed += dt / period;
      if (owed >= 1) {
        owed -= 1;
        addWave(0.75 + 0.45 * Math.random());
      }
      for (let i = waves.length - 1; i >= 0; i--) {
        waves[i]!.age += dt;
        if (waves[i]!.age > ROLL + RUN + BACK) waves.splice(i, 1);
      }

      const s0 = shore();
      lastEdge.set(edge);
      for (let col = 0; col < cols; col++) {
        let e = s0 - 0.4;
        for (const w of waves) {
          const run = swash(w, col);
          if (run !== null) e = Math.max(e, s0 + run);
        }
        edge[col] = e;
        const rising = e - lastEdge[col]! > 0;
        for (let row = s0; row < rows; row++) {
          const i = row * cols + col;
          if (row < e) {
            wet[i] = 1;
            // Water lifts the marks out of the sand.
            marks[i] = Math.max(0, marks[i]! - dt * 2.5);
          } else {
            wet[i] = Math.max(0, wet[i]! - dt * 0.11);
          }
          foam[i] = Math.max(0, foam[i]! - dt * 0.55);
        }
        // Lace at the leading edge, thick while the water runs up and thin as it draws back.
        const er = Math.floor(e);
        if (er >= s0 && er < rows) {
          const i = er * cols + col;
          const thick = 0.4 + noise3(col * 0.12, time * 0.3, 8);
          foam[i] = Math.min(1, foam[i]! + dt * thick * (rising ? 5 : 1));
          if (er - 1 >= s0)
            foam[i - cols] = Math.min(1, foam[i - cols]! + dt * thick * (rising ? 1.6 : 0.3));
        }
      }

      // Writing in the sand: a groove along the pointer's path.
      if (pointer.active && pointer.y > s0 + 0.5 && pointer.y < rows) {
        if (lastX >= 0) {
          const dx = pointer.x - lastX;
          const dy = pointer.y - lastY;
          const len = Math.hypot(dx, dy * grid.aspect);
          const g = stroke(dx, dy * grid.aspect).charCodeAt(0);
          for (let u = 0; u <= len; u += 0.5) {
            const col = Math.floor(lastX + (dx * u) / (len || 1));
            const row = Math.floor(lastY + (dy * u) / (len || 1));
            if (col < 0 || col >= cols || row <= s0 || row >= rows) continue;
            const i = row * cols + col;
            marks[i] = 1;
            markGlyph[i] = len < 0.3 ? DOT : g;
          }
        }
        lastX = pointer.x;
        lastY = pointer.y;
      } else {
        lastX = -1;
      }
    },
    press() {
      // A big wave that runs further up the beach than the rest.
      addWave(1.55);
      waves[waves.length - 1]!.age = ROLL * 0.35;
    },
    draw(surface: GlyphSurface) {
      const { cols, rows } = grid;
      if (!cols) return;
      const hz = horizon();
      const s0 = shore();

      // The sea: solid blocks, deep and dim at the horizon, shallow and bright toward the shore,
      // with a few slow glints of light cut into them.
      for (let row = hz; row < s0; row++) {
        const t = (row - hz) / Math.max(1, s0 - hz);
        const tone = SEA + Math.round(t * t * (SEA_STEPS - 3));
        for (let col = 0; col < cols; col++) {
          surface.fill(col, row, tone, 0.3 + 0.35 * t);
          const n = noise3(col * (0.05 + 0.08 * (1 - t)), row * 0.9 - time * 0.3, time * 0.05);
          if (n > 0.7) surface.put(col, row, '-', GLINT, (0.15 + 0.35 * t) * (n - 0.7) * 3.3);
        }
      }

      // Waves rolling in: a swell of brighter water that rears into a band of foam as it breaks.
      for (const w of waves) {
        const t = w.age / ROLL;
        if (t >= 1) continue;
        const lip = smoothstep(0.55, 0.95, t) * Math.min(1, w.strength);
        for (let col = 0; col < cols; col++) {
          const c = crest(w, col);
          if (c === null || c < hz || c >= s0) continue;
          const row = Math.floor(c);
          const lace = noise3(col * 0.18, w.seed * 7, time * 0.5);
          const depth = (row - hz) / Math.max(1, s0 - hz);
          if (lip > 0.08 && lace < 0.25 + lip * 0.6) {
            surface.fill(col, row, FOAM, 0.6 + 0.35 * lip);
            if (hash3(col, row, w.seed) < 0.45) surface.put(col, row, '~', GLINT, 0.75);
            // The face of the wave in front of the foam, a shade deeper.
            if (row + 1 < s0) surface.fill(col, row + 1, SEA + SEA_STEPS - 3, 0.7);
          } else {
            // The swell: one shade lighter than the water around it, so it reads as a gentle rise.
            const tone =
              SEA + Math.min(SEA_STEPS - 1, Math.round(depth * depth * (SEA_STEPS - 3)) + 1);
            surface.fill(col, row, tone, 0.36 + 0.36 * depth);
          }
        }
      }

      // The beach: the thin sheet of a wave, its lacy edge, wet sand drying, and dry sand.
      for (let row = s0; row < rows; row++) {
        const near = (row - s0) / Math.max(1, rows - s0);
        for (let col = 0; col < cols; col++) {
          const i = row * cols + col;
          const e = edge[col]!;
          const under = e - row;
          if (under >= 1) {
            // Under the sheet: shallow water, thinning toward its edge.
            const thin = clamp(under / 4, 0, 1);
            surface.fill(
              col,
              row,
              SHEET + Math.round((1 - thin) * (SHEET_STEPS - 1)),
              0.3 + 0.2 * thin,
            );
            const lace = noise3(col * 0.3, row * 0.7, time * 0.4 + 2);
            if (foam[i]! > 0.2 && lace < foam[i]! * 0.6) {
              surface.fill(col, row, FOAM, 0.55 + 0.4 * foam[i]!);
              if (hash3(col, row, 31) < 0.35) surface.put(col, row, '.', GLINT, 0.7);
            } else if (lace > 0.72) {
              surface.put(col, row, '-', GLINT, 0.35);
            }
            continue;
          }
          if (under > 0) {
            // The leading edge: lace where the foam gathers, clear water where it parts.
            const lace = noise3(col * 0.35, time * 0.35, 4);
            if (lace > 0.32) {
              surface.fill(col, row, FOAM, 0.6 + 0.35 * under);
              if (lace < 0.6) surface.put(col, row, lace < 0.45 ? '~' : '-', GLINT, 0.8);
            } else surface.fill(col, row, SHEET, 0.2 + 0.2 * under);
            continue;
          }
          const f = foam[i]!;
          const lace = noise3(col * 0.3, row * 0.7, time * 0.15 + 2);
          if (f > 0.2 && lace < f * 0.45) {
            // Foam left behind on the sand, breaking up as it fades.
            surface.fill(col, row, FOAM, 0.7 + 0.25 * f);
            if (lace < f * 0.25) surface.put(col, row, '.', GLINT, 0.6);
            continue;
          }
          const w = wet[i]!;
          if (w > 0.04) {
            // Wet sand: dark and smooth, fading back to dry.
            // Wettest by the water, paler up the beach and as it dries.
            const up = clamp((row - s0) / Math.max(1, reach()), 0, 1);
            const tone = WET + Math.round(clamp(1 - w + up * 0.5, 0, 1) * (WET_STEPS - 1));
            surface.fill(col, row, tone, 0.12 + 0.4 * w);
            if (marks[i]! > 0.02)
              surface.put(col, row, markGlyph[i]!, GROOVE, 0.5 + 0.5 * marks[i]!);
            else if (w > 0.6 && hash3(col, row, Math.floor(time * 1.5)) < 0.01) {
              surface.put(col, row, DOT, FOAM, 0.6 * w);
            }
            continue;
          }
          // Dry sand: left open, with sparse grain.
          if (marks[i]! > 0.02) {
            surface.put(col, row, markGlyph[i]!, GRAIN, 0.4 + 0.5 * marks[i]!);
            continue;
          }
          const grain = hash3(col, row, 9);
          if (grain < 0.05 + 0.05 * near) {
            surface.put(col, row, grain < 0.02 ? ',' : DOT, GRAIN, 0.25 + 0.3 * near);
          }
        }
      }
    },
  };
}
