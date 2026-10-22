import { approach, clamp, noise3 } from '../engine/noise';
import { DOT, type GlyphSurface } from '../engine/surface';
import type { AsciiGrid, AsciiPointer, AsciiScene } from '../engine/types';

export interface RainOptions {
  /** Drops per thousand cells. Default 16. */
  density?: number;
  /** Lean of the rain, in columns per row. Negative leans left. Default 0.45. */
  wind?: number;
  /** Hold an umbrella at the pointer. Default true. */
  umbrella?: boolean;
}

const INK = 0;
const SPLASH = 1;
const UMBRELLA = 7;

interface Drop {
  x: number;
  y: number;
  /** 0 far → 1 near: near drops are faster, longer, brighter and land lower. */
  depth: number;
}

interface Ripple {
  x: number;
  y: number;
  age: number;
  depth: number;
}

interface Bead {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
}

/**
 * Rain on still water. Drops fall in three depths, each landing on its own line of the surface
 * and opening a ripple. The pointer holds an umbrella, drawn only by the rain beading off it.
 * A click brings lightning.
 */
export function createRain(options: RainOptions = {}): AsciiScene {
  const density = options.density ?? 16;
  const baseWind = options.wind ?? 0.45;
  const umbrella = options.umbrella ?? true;
  let grid: AsciiGrid = { cols: 0, rows: 0, aspect: 2 };
  const drops: Drop[] = [];
  const ripples: Ripple[] = [];
  const beads: Bead[] = [];
  let bolt: { cells: [number, number, string][]; age: number } | null = null;
  let time = 0;
  let wind = baseWind;
  let cover = 0;
  let hx = 0;
  let hy = 0;

  const ground = (depth: number) =>
    grid.rows - 1 - Math.round((1 - depth) * Math.min(5, grid.rows * 0.12));
  const speed = (depth: number) => 16 + depth * 26;

  function makeDrop(fresh: boolean): Drop {
    const depth = Math.random() < 0.5 ? 0.15 : Math.random() < 0.6 ? 0.55 : 1;
    return {
      // Start upwind so the lean does not leave an empty strip.
      x:
        Math.random() * (grid.cols + grid.rows * Math.abs(wind)) -
        (wind > 0 ? grid.rows * wind : 0),
      y: fresh ? Math.random() * grid.rows : -Math.random() * 6,
      depth,
    };
  }

  function splash(x: number, y: number, nx: number, ny: number, count: number) {
    for (let i = 0; i < count; i++) {
      const spread = (Math.random() - 0.5) * 1.4;
      beads.push({
        x,
        y,
        vx: (nx + spread) * (6 + Math.random() * 8),
        vy: (ny - 0.6) * (4 + Math.random() * 6),
        age: 0,
      });
    }
  }

  return {
    palette: ['ink', '#7fa8ff'],
    settle: 2,
    resize(next) {
      grid = next;
      drops.length = 0;
      ripples.length = 0;
      beads.length = 0;
      const n = Math.round(((grid.cols * grid.rows) / 1000) * density);
      for (let i = 0; i < n; i++) drops.push(makeDrop(true));
    },
    step(dt, pointer: AsciiPointer) {
      time += dt;
      wind = baseWind + (noise3(time * 0.15, 0, 2) - 0.5) * 0.3;
      cover = approach(cover, umbrella && pointer.active ? 1 : 0, 6, dt);
      if (pointer.active) {
        hx = pointer.x;
        hy = pointer.y;
      }

      for (const d of drops) {
        const fall = speed(d.depth) * dt;
        d.y += fall;
        d.x += fall * wind;
        // The umbrella: a dome over the pointer, in square units.
        if (cover > 0.5 && d.depth > 0.4) {
          const dx = d.x - hx;
          const dy = (d.y - hy) * grid.aspect;
          const r = Math.hypot(dx, dy);
          if (r < UMBRELLA && dy < 0.5) {
            splash(d.x, d.y, dx / UMBRELLA, -0.5, 2);
            Object.assign(d, makeDrop(false));
            continue;
          }
        }
        if (d.y >= ground(d.depth)) {
          ripples.push({ x: d.x, y: ground(d.depth), age: 0, depth: d.depth });
          if (d.depth > 0.9 && Math.random() < 0.5) splash(d.x, d.y, 0, -0.3, 1);
          Object.assign(d, makeDrop(false));
        }
      }

      for (let i = ripples.length - 1; i >= 0; i--) {
        ripples[i]!.age += dt;
        if (ripples[i]!.age > 0.9) ripples.splice(i, 1);
      }
      for (let i = beads.length - 1; i >= 0; i--) {
        const b = beads[i]!;
        b.age += dt;
        b.vy += 40 * dt;
        b.x += b.vx * dt;
        b.y += (b.vy * dt) / grid.aspect;
        if (b.age > 0.7 || b.y > grid.rows) beads.splice(i, 1);
      }
      if (bolt) {
        bolt.age += dt;
        if (bolt.age > 0.5) bolt = null;
      }
    },
    press(x) {
      // A jagged path from the top down to the water.
      const cells: [number, number, string][] = [];
      let col = x + (Math.random() - 0.5) * 8;
      for (let row = 0; row < ground(1); row++) {
        const lean = Math.random() < 0.5 ? -1 : 1;
        const step = Math.random() < 0.35 ? 0 : lean;
        cells.push([col, row, step === 0 ? '|' : step > 0 ? '\\' : '/']);
        col += step;
      }
      bolt = { cells, age: 0 };
    },
    draw(surface: GlyphSurface) {
      const { cols } = grid;
      const flash = bolt ? clamp(1 - bolt.age / 0.25, 0, 1) : 0;
      const streak = Math.abs(wind) < 0.3 ? '|' : wind > 0 ? '\\' : '/';

      // The water's surface: faint dashes on the lines drops land on.
      for (const depth of [0.15, 0.55, 1]) {
        const row = ground(depth);
        for (let col = 0; col < cols; col++) {
          const shimmer = noise3(col * 0.15, row, time * 0.4);
          if (shimmer > 0.64) surface.put(col, row, '_', INK, 0.06 + depth * 0.1 + flash * 0.4);
        }
      }

      for (const r of ripples) {
        const t = r.age / 0.9;
        const reach = 1 + t * (2 + r.depth * 4);
        const fade = (1 - t) * (0.3 + r.depth * 0.6);
        surface.put(r.x - reach, r.y, '(', SPLASH, fade);
        surface.put(r.x + reach, r.y, ')', SPLASH, fade);
        if (t < 0.25) surface.put(r.x, r.y, DOT, SPLASH, fade);
      }

      for (const d of drops) {
        const length = 1 + Math.round(d.depth * 2);
        const alpha = 0.18 + d.depth * 0.5 + flash * 0.3;
        for (let k = 0; k < length; k++) {
          const row = d.y - k;
          if (row < 0 || row >= ground(d.depth)) continue;
          surface.put(d.x - k * wind, row, streak, INK, alpha * (1 - k / (length + 1)));
        }
      }

      for (const b of beads) surface.put(b.x, b.y, DOT, SPLASH, 1 - b.age / 0.7);

      if (cover > 0.05) {
        // A faint canopy, so the umbrella is found before the rain finds it.
        for (let a = Math.PI; a <= Math.PI * 2 + 1e-6; a += Math.PI / 18) {
          const col = hx + Math.cos(a) * UMBRELLA;
          const row = hy + (Math.sin(a) * UMBRELLA) / grid.aspect;
          surface.put(col, row, DOT, INK, cover * 0.18);
        }
      }

      if (bolt) {
        const life = clamp(1 - bolt.age / 0.5, 0, 1);
        // Lightning flickers out rather than fading smoothly.
        const on = bolt.age < 0.08 || (bolt.age > 0.14 && bolt.age < 0.22) || bolt.age > 0.3;
        if (on) for (const [col, row, g] of bolt.cells) surface.put(col, row, g, INK, life);
      }
    },
  };
}
