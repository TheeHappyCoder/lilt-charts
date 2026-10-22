import { approach, clamp, hash3 } from '../engine/noise';
import type { GlyphSurface } from '../engine/surface';
import type { AsciiGrid, AsciiPointer, AsciiScene } from '../engine/types';
import { BRAND, bump, gradient } from './shared';

export interface MatrixOptions {
  /** Share of lanes with a drop falling at once, 0 to 1. Default 0.4. */
  density?: number;
  /** Trail colours as hex, from just behind the head to the tail. Default violet to rose. */
  colors?: readonly string[];
  /** Characters the rain is made of. Default code symbols. */
  characters?: string;
  /** How strongly the rain shows: 1 is quiet enough for text on top. Default 1. */
  intensity?: number;
}

export const MATRIX_CHARACTERS = '01<>/\\{}[]=+*:;';

/** Trail colours the gradient is cut into. */
const STEPS = 8;
const HEAD = STEPS;
/** Columns per lane: rain in every other column breathes. */
const LANE = 2;

interface Drop {
  lane: number;
  /** The head's row, fractional. */
  y: number;
  /** Rows per second. */
  rate: number;
  length: number;
  /** 0 far → 1 near: near drops are brighter, faster and longer. */
  depth: number;
  /** A burst drop from a click: bright, and gone once it falls off the bottom. */
  burst: boolean;
  seed: number;
}

/**
 * Digital rain, done quietly: sparse drops of type fall slowly down lanes, each with a bright head
 * and a trail that fades through the brand colours. Characters change now and then. The pointer
 * parts the rain and lights it; a click sends down a burst of bright drops.
 */
export function createMatrix(options: MatrixOptions = {}): AsciiScene {
  const density = clamp(options.density ?? 0.4, 0.02, 1);
  const stops = options.colors?.length ? options.colors : BRAND;
  const chars = options.characters || MATRIX_CHARACTERS;
  const intensity = clamp(options.intensity ?? 1, 0, 3);
  let grid: AsciiGrid = { cols: 0, rows: 0, aspect: 2 };
  let lanes = 0;
  const drops: Drop[] = [];
  let time = 0;
  let seeds = 0;
  let px = 0;
  let py = 0;
  let presence = 0;

  function reset(d: Drop, fresh: boolean) {
    d.lane = Math.floor(Math.random() * lanes);
    d.depth = Math.random() ** 1.6;
    d.length = Math.round(6 + d.depth * 14 + Math.random() * 6);
    d.rate = 4 + d.depth * 7 + Math.random() * 2;
    // Later drops wait above the screen a while; fresh ones are spread as if they had too.
    const wait = grid.rows * 0.8;
    d.y = fresh ? Math.random() * (grid.rows + d.length + wait) - wait : -Math.random() * wait - 1;
    d.burst = false;
    d.seed = seeds++;
  }

  const glyphAt = (col: number, row: number, seed: number) => {
    // Each cell keeps its character for a few seconds, then swaps; cells swap out of step.
    const epoch = Math.floor(time * 0.35 + hash3(col, row, 7) * 9);
    return chars[Math.floor(hash3(col, row + seed * 131, epoch) * chars.length)]!;
  };

  return {
    palette: [...gradient(stops, STEPS), 'ink'],
    lineHeight: 1.15,
    settle: 2,
    resize(next) {
      grid = next;
      lanes = Math.max(1, Math.ceil(grid.cols / LANE));
      drops.length = 0;
      const n = Math.max(1, Math.round(lanes * density));
      for (let i = 0; i < n; i++) {
        const d = {} as Drop;
        reset(d, true);
        drops.push(d);
      }
    },
    step(dt, pointer: AsciiPointer) {
      time += dt;
      presence = approach(presence, pointer.active ? 1 : 0, pointer.active ? 5 : 2.5, dt);
      if (pointer.active) {
        if (presence < 0.05) {
          px = pointer.x;
          py = pointer.y;
        }
        px = approach(px, pointer.x, 10, dt);
        py = approach(py, pointer.y, 10, dt);
      }
      for (let i = drops.length - 1; i >= 0; i--) {
        const d = drops[i]!;
        d.y += d.rate * dt;
        if (d.y - d.length > grid.rows) {
          if (d.burst) drops.splice(i, 1);
          else reset(d, false);
        }
      }
    },
    press(x, y) {
      const lane = Math.round(x / LANE);
      for (let offset = -4; offset <= 4; offset += 2) {
        drops.push({
          lane: lane + offset,
          // A burst fans out: the middle drop leads, the outer ones trail behind it.
          y: y - Math.abs(offset) * 1.2 - Math.random() * 1.5,
          rate: 15 + Math.random() * 5,
          length: 10 + Math.round(Math.random() * 6),
          depth: 1,
          burst: true,
          seed: seeds++,
        });
      }
    },
    draw(surface: GlyphSurface) {
      const { rows, aspect } = grid;
      const reach = 9;
      const base = 0.62 * intensity;
      for (const d of drops) {
        const head = Math.floor(d.y);
        const homeCol = d.lane * LANE;
        const near = 0.35 + 0.65 * d.depth;
        for (let k = 0; k < d.length; k++) {
          const row = head - k;
          if (row < 0 || row >= rows) continue;
          const t = k / d.length;
          let col = homeCol;
          let lift = 0;
          if (presence > 0.01) {
            // The rain parts around the pointer: lanes bow away from it, and the nearest light up.
            const dx = homeCol + 0.5 - px;
            const dy = (row + 0.5 - py) * aspect;
            const g = bump(dx * dx + dy * dy, reach) * presence;
            // Lanes are two columns apart, so a one-column bow never lands on a neighbour.
            col += Math.sign(dx || 1) * Math.round(g * 1.2);
            lift = g;
          }
          const glyph = glyphAt(homeCol, row, d.seed);
          if (k === 0) {
            const opacity = d.burst ? 1 : clamp((0.45 + 0.5 * d.depth) * intensity + lift, 0, 1);
            surface.put(col, row, glyph, HEAD, opacity);
            continue;
          }
          const fade = (1 - t) ** 1.6;
          const opacity = clamp(fade * base * (d.burst ? 1.3 : near) + lift * 0.45 * (1 - t), 0, 1);
          const tone = Math.min(STEPS - 1, Math.floor(t * STEPS));
          surface.put(col, row, glyph, tone, opacity);
        }
      }

      // A torch: near the pointer the still code behind the rain shows faintly, bowed aside.
      if (presence > 0.01) {
        const span = reach * 1.8;
        const r0 = Math.max(0, Math.floor(py - span / aspect));
        const r1 = Math.min(rows - 1, Math.ceil(py + span / aspect));
        const l0 = Math.max(0, Math.floor((px - span) / LANE));
        const l1 = Math.min(lanes - 1, Math.ceil((px + span) / LANE));
        for (let row = r0; row <= r1; row++) {
          for (let lane = l0; lane <= l1; lane++) {
            const homeCol = lane * LANE;
            const dx = homeCol + 0.5 - px;
            const dy = (row + 0.5 - py) * aspect;
            const g = bump(dx * dx + dy * dy, reach) * presence;
            if (g < 0.06) continue;
            const col = homeCol + Math.sign(dx || 1) * Math.round(g * 1.2);
            if (surface.filled(col, row)) continue;
            surface.put(col, row, glyphAt(homeCol, row, 0), 0, g * 0.25 * intensity);
          }
        }
      }
    },
  };
}
