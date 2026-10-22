import { clamp, noise3 } from '../engine/noise';
import { DOT, type GlyphSurface } from '../engine/surface';
import type { AsciiGrid, AsciiPointer, AsciiScene } from '../engine/types';

export interface WindowRainOptions {
  /** The city's lights behind the glass, as hex colours. */
  lights?: readonly string[];
  /** How hard it rains on the glass, 0 to 2. Default 1. */
  rain?: number;
  /** How misted the glass is, 0 to 1. Default 0.6. */
  fog?: number;
}

const GLASS = 0;
const FOG = 1;
/** The lights' colours start here. */
const LIGHTS = 2;

interface Bokeh {
  x: number;
  y: number;
  r: number;
  tone: number;
  phase: number;
  drift: number;
}

interface Drop {
  x: number;
  y: number;
  /** Size in cells across. */
  r: number;
  /** Rows a second it slides at; 0 while it clings. */
  slide: number;
  wander: number;
}

/**
 * Rain on a window at night, with the city out of focus behind it. Drops land and cling, merge
 * when they touch, and once heavy enough run down the glass in a wavering line, sweeping up the
 * drops in their path and leaving a clear streak through the mist. The pointer wipes the glass
 * with a finger; a click throws a handful of rain at it.
 */
export function createWindowRain(options: WindowRainOptions = {}): AsciiScene {
  const lights = options.lights?.length
    ? options.lights
    : ['#ffb547', '#ff5a5f', '#7fc8ff', '#fff2cc', '#c77dff'];
  const rain = clamp(options.rain ?? 1, 0, 2);
  const fogLevel = clamp(options.fog ?? 0.6, 0, 1);
  let grid: AsciiGrid = { cols: 0, rows: 0, aspect: 2 };
  let bokeh: Bokeh[] = [];
  const drops: Drop[] = [];
  let mist = new Float32Array(0);
  let time = 0;
  let lastX = NaN;
  let lastY = NaN;

  function clear(x: number, y: number, radius: number) {
    for (let row = Math.floor(y - radius / grid.aspect); row <= y + radius / grid.aspect; row++) {
      for (let col = Math.floor(x - radius); col <= x + radius; col++) {
        if (col < 0 || row < 0 || col >= grid.cols || row >= grid.rows) continue;
        const d = Math.hypot(col - x, (row - y) * grid.aspect) / radius;
        if (d < 1) mist[row * grid.cols + col] = Math.min(mist[row * grid.cols + col]!, d * 0.3);
      }
    }
  }

  function land(
    x = Math.random() * grid.cols,
    y = Math.random() * grid.rows,
    r = 0.3 + Math.random() ** 3 * 0.9,
  ) {
    // Landing on a drop that is already there, it joins it.
    for (const o of drops) {
      if (o.slide === 0 && Math.hypot(o.x - x, (o.y - y) * grid.aspect) < (o.r + r) * 1.1) {
        o.r = Math.min(1.6, Math.hypot(o.r, r));
        return;
      }
    }
    drops.push({ x, y, r, slide: 0, wander: Math.random() * 10 });
  }

  return {
    palette: ['ink', 'ink', ...lights],
    settle: 4,
    resize(next) {
      grid = next;
      mist = new Float32Array(grid.cols * grid.rows).fill(fogLevel);
      drops.length = 0;
      bokeh = Array.from(
        { length: Math.max(6, Math.round((grid.cols * grid.rows) / 500)) },
        (_, i) => ({
          x: Math.random() * grid.cols,
          y: grid.rows * (0.25 + Math.random() * 0.75),
          r: 5 + Math.random() * 9,
          tone: LIGHTS + (i % lights.length),
          phase: Math.random() * 6,
          drift: (Math.random() - 0.5) * 0.6,
        }),
      );
      for (let i = 0; i < (grid.cols * grid.rows) / 60; i++) land();
    },
    step(dt, pointer: AsciiPointer) {
      time += dt;
      for (const b of bokeh) {
        b.x += b.drift * dt;
        if (b.x < -b.r) b.x = grid.cols + b.r;
        if (b.x > grid.cols + b.r) b.x = -b.r;
      }
      // New drops land, more in heavier rain.
      const arrivals = dt * rain * grid.cols * 0.15;
      for (let i = 0; i < Math.floor(arrivals) + (Math.random() < arrivals % 1 ? 1 : 0); i++)
        land();
      // The mist creeps back over cleared glass.
      for (let i = 0; i < mist.length; i++)
        mist[i] = Math.min(fogLevel, mist[i]! + dt * 0.02 * fogLevel);

      for (let i = drops.length - 1; i >= 0; i--) {
        const d = drops[i]!;
        if (d.slide === 0 && d.r > 1.05) d.slide = 3 + Math.random() * 2;
        if (d.slide > 0) {
          d.slide = Math.min(16, d.slide + dt * 8 * d.r);
          d.y += d.slide * dt;
          d.x += Math.sin(time * 2 + d.wander + d.y * 0.5) * dt * 1.6;
          clear(d.x, d.y, d.r * 1.4);
          // It leaves a trail of beads and loses a little of itself to them.
          if (Math.random() < dt * 4) {
            drops.push({ x: d.x, y: d.y - 1, r: 0.25, slide: 0, wander: 0 });
            d.r = Math.max(0.9, d.r - 0.02);
          }
          // It swallows drops in its path.
          for (let j = drops.length - 1; j >= 0; j--) {
            if (j === i) continue;
            const o = drops[j]!;
            if (
              o.slide === 0 &&
              Math.abs(o.x - d.x) < d.r + o.r &&
              o.y > d.y - 0.5 &&
              o.y < d.y + 1
            ) {
              d.r = Math.min(2.2, Math.hypot(d.r, o.r));
              drops.splice(j, 1);
              if (j < i) i--;
            }
          }
          if (d.y > grid.rows + 2) drops.splice(i, 1);
        }
      }
      // Bounded, so a heavy storm stays cheap.
      if (drops.length > 1400) drops.splice(0, drops.length - 1400);

      if (pointer.active) {
        // A finger wipes the glass along its path.
        const steps = Number.isNaN(lastX)
          ? 1
          : Math.max(1, Math.ceil(Math.hypot(pointer.x - lastX, pointer.y - lastY)));
        for (let s = 0; s < steps; s++) {
          const t = steps === 1 ? 1 : s / (steps - 1);
          const x = Number.isNaN(lastX) ? pointer.x : lastX + (pointer.x - lastX) * t;
          const y = Number.isNaN(lastY) ? pointer.y : lastY + (pointer.y - lastY) * t;
          clear(x, y, 3);
          for (let j = drops.length - 1; j >= 0; j--) {
            const o = drops[j]!;
            if (Math.hypot(o.x - x, (o.y - y) * grid.aspect) < 3) drops.splice(j, 1);
          }
        }
        lastX = pointer.x;
        lastY = pointer.y;
      } else lastX = lastY = NaN;
    },
    press(x, y) {
      for (let i = 0; i < 24; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = Math.random() * 8;
        land(x + Math.cos(a) * r, y + (Math.sin(a) * r) / grid.aspect, 0.4 + Math.random() * 0.8);
      }
    },
    draw(surface: GlyphSurface) {
      const { cols, rows, aspect } = grid;
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          // The city's lights, soft discs out of focus, and how much mist dims them here.
          let best = 0;
          let tone = LIGHTS;
          for (const b of bokeh) {
            const d = Math.hypot(col - b.x, (row - b.y) * aspect) / b.r;
            if (d > 1.2) continue;
            const pulse = 0.85 + 0.15 * Math.sin(time * 0.7 + b.phase);
            const v = (d < 1 ? 1 - d * d * 0.5 : (1.2 - d) * 2.5) * pulse;
            if (v > best) {
              best = v;
              tone = b.tone;
            }
          }
          const fog = mist[row * cols + col]!;
          const clearness = 1 - fog * 0.85;
          // Out of focus, a light is a soft disc of colour rather than type.
          if (best > 0.05) surface.fill(col, row, tone, clamp(best * clearness * 0.42, 0, 1));
          if (fog > 0.2 && noise3(col * 0.5, row * 0.8, 1) > 0.76)
            surface.put(col, row, DOT, FOG, fog * 0.1);
        }
      }
      for (const d of drops) {
        const glyph = d.r < 0.6 ? DOT : 'o';
        surface.put(d.x, d.y, glyph, GLASS, clamp(0.35 + d.r * 0.4, 0, 1));
        if (d.slide > 0) surface.put(d.x, d.y - 1, '|', GLASS, 0.25);
      }
    },
  };
}
