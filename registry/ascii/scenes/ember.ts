import { approach, clamp, hash3, noise3 } from '../engine/noise';
import { DOT, type GlyphSurface } from '../engine/surface';
import type { AsciiGrid, AsciiPointer, AsciiScene } from '../engine/types';

export interface EmberOptions {
  /** Share of the width the fire burns across. 1 lights the whole floor. Default 0.42. */
  width?: number;
  /** How high the flames reach, as a share of the height. Default 0.62. */
  height?: number;
  /** Sparks per second. Default 14. */
  sparks?: number;
  /** Four colours from the cool edge of a flame to its core. Default embers to white-hot. */
  colors?: readonly [string, string, string, string];
}

// Thin glyphs at the cool tips, heavy ones in the core.
const FLAME = '.:;+*%#@';
const DARK_RED = 0;
const ORANGE = 1;
const AMBER = 2;
const PALE = 3;
const LOG = 4;

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  age: number;
}

/**
 * A campfire: a heat field fed from the floor rises, spreads and cools through drifting noise, so
 * the flames lick and fork rather than pulse. Sparks break off the tips and wander up. The flames
 * lean away from the pointer; a click throws a shower of sparks.
 */
export function createEmber(options: EmberOptions = {}): AsciiScene {
  const share = clamp(options.width ?? 0.42, 0.05, 1);
  const reach = clamp(options.height ?? 0.62, 0.15, 0.95);
  const sparkRate = options.sparks ?? 14;
  let grid: AsciiGrid = { cols: 0, rows: 0, aspect: 2 };
  let heat = new Float32Array(0);
  let next = new Float32Array(0);
  const sparks: Spark[] = [];
  let time = 0;
  let tick = 0;
  let lean = 0;
  let owed = 0;
  let flare = 0;

  const index = (col: number, row: number) => row * grid.cols + col;
  // Fire is drawn from a little above the floor so the logs show.
  const floor = () => grid.rows - 2;

  function feed() {
    const { cols } = grid;
    const half = (cols * share) / 2;
    const mid = cols / 2;
    for (let col = 0; col < cols; col++) {
      const edge = share >= 1 ? 1 : clamp(1 - Math.abs(col - mid) / half, 0, 1);
      const flicker = 0.45 + 0.65 * noise3(col * 0.45, time * 4, 1);
      const value = Math.pow(edge, 0.6) * flicker * (1 + flare * 0.4);
      heat[index(col, floor())] = value;
      heat[index(col, floor() - 1)] = Math.max(heat[index(col, floor() - 1)]!, value * 0.92);
    }
  }

  /** One rise of the heat field: each cell takes the heat below it, nudged sideways and cooled. */
  function rise() {
    const { cols } = grid;
    const top = floor();
    const cooling = 2.3 / (top * reach);
    for (let row = 0; row < top - 1; row++) {
      for (let col = 0; col < cols; col++) {
        const drift = (noise3(col * 0.15, row * 0.15 - time * 1.4, 4) - 0.5) * 2.4 + lean;
        const from = clamp(Math.round(col - drift), 1, cols - 2);
        const below = index(from, row + 1);
        const twoBelow = index(from, Math.min(top, row + 2));
        const h = (heat[below - 1]! + heat[below]! * 2 + heat[below + 1]! + heat[twoBelow]!) / 5;
        // Cooling varies through space and time, which tears the flame into tongues.
        const cool = cooling * (0.1 + 2.2 * noise3(col * 0.3, row * 0.22 + time * 3.2, 9) ** 2);
        next[index(col, row)] = Math.max(0, h - cool);
      }
    }
    for (let row = top - 1; row <= top; row++) {
      for (let col = 0; col < cols; col++) next[index(col, row)] = heat[index(col, row)]!;
    }
    [heat, next] = [next, heat];
  }

  function spawn(x: number, y: number, burst = 1) {
    sparks.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 6 * burst,
      vy: -(6 + Math.random() * 10) * burst,
      life: 0.8 + Math.random() * 1.6,
      age: 0,
    });
  }

  return {
    palette: [...(options.colors ?? ['#a3201a', '#f2621f', '#ffb22e', '#fff1c7']), 'ink'],
    settle: 2,
    resize(nextGrid) {
      grid = nextGrid;
      heat = new Float32Array(grid.cols * grid.rows);
      next = new Float32Array(grid.cols * grid.rows);
      sparks.length = 0;
    },
    step(dt, pointer: AsciiPointer) {
      if (grid.rows < 4) return;
      time += dt;
      flare = approach(flare, 0, 2, dt);
      // Lean away from the pointer, more strongly the closer it is to the fire.
      let target = 0;
      if (pointer.active) {
        const dx = grid.cols / 2 - pointer.x;
        const near = clamp(1 - Math.abs(dx) / (grid.cols * 0.5), 0, 1);
        target = Math.sign(dx) * near * 1.4;
      }
      lean = approach(lean, target, 2.5, dt);

      // The field rises at 30 Hz: fast enough to dance, slow enough to read.
      tick += dt;
      while (tick >= 1 / 30) {
        tick -= 1 / 30;
        feed();
        rise();
      }

      owed += dt * sparkRate * (1 + flare * 3);
      while (owed >= 1) {
        owed -= 1;
        const x = grid.cols / 2 + (Math.random() - 0.5) * grid.cols * share * 0.8;
        spawn(x, floor() - 2 - Math.random() * grid.rows * reach * 0.4);
      }
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i]!;
        s.age += dt;
        if (s.age > s.life || s.y < 0) {
          sparks.splice(i, 1);
          continue;
        }
        const wobble = (noise3(s.x * 0.2, s.y * 0.2, time + i) - 0.5) * 18;
        s.vx = approach(s.vx, wobble + lean * 6, 1.5, dt);
        s.vy = approach(s.vy, -9, 0.8, dt);
        s.x += s.vx * dt;
        s.y += (s.vy * dt) / grid.aspect;
      }
    },
    press(x) {
      flare = 1;
      const near = clamp(
        x,
        grid.cols / 2 - grid.cols * share * 0.4,
        grid.cols / 2 + grid.cols * share * 0.4,
      );
      for (let i = 0; i < 26; i++) spawn(near + (Math.random() - 0.5) * 6, floor() - 3, 1.6);
    },
    draw(surface: GlyphSurface) {
      const { cols } = grid;
      const top = floor();
      for (let row = 0; row <= top; row++) {
        for (let col = 0; col < cols; col++) {
          const h = heat[index(col, row)]!;
          if (h < 0.06) continue;
          const g = FLAME[Math.min(FLAME.length - 1, Math.floor(h * FLAME.length * 1.05))]!;
          const tone = h > 0.78 ? PALE : h > 0.5 ? AMBER : h > 0.24 ? ORANGE : DARK_RED;
          surface.put(col, row, g, tone, clamp(0.25 + h * 0.95, 0, 1));
        }
      }
      for (const s of sparks) {
        const fade = 1 - s.age / s.life;
        surface.put(s.x, s.y, fade > 0.6 ? '*' : DOT, fade > 0.5 ? AMBER : ORANGE, fade);
      }
      drawLogs(surface, top);
    },
  };

  /** Two crossed logs under the fire, and a glow of embers between them. */
  function drawLogs(surface: GlyphSurface, top: number) {
    const { cols } = grid;
    const mid = cols / 2;
    const half = Math.max(4, (cols * Math.min(share, 0.5)) / 2);
    const first = Math.floor(mid - half);
    const last = Math.floor(mid + half);
    for (let col = first; col <= last; col++) {
      const ember = noise3(col * 0.5, time * 1.5, 2);
      surface.put(col, top + 1, col === first ? '(' : col === last ? ')' : '=', LOG, 0.32);
      if (hash3(col, 0, 5) < 0.5 && ember > 0.5) surface.put(col, top + 1, DOT, AMBER, ember);
    }
  }
}
