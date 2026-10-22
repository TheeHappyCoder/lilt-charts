import { approach, clamp, hash3, noise3 } from '../engine/noise';
import { DOT, type GlyphSurface } from '../engine/surface';

/** A campfire's colours, from the cool edge of a flame to its core, then the logs. */
export const FIRE_COLORS = ['#a3201a', '#f2621f', '#ffb22e', '#fff1c7', '#7a5640'] as const;

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

export interface Campfire {
  /** Where the fire sits: the centre of its base in cells, and its size in cells. */
  place(col: number, base: number, width: number, height: number): void;
  /**
   * One step. `lean` tips the flames, -1 to 1: a host leans them toward a warm hand. `aspect` is
   * the grid's cell height over width, so sparks rise at the same speed whatever the font.
   */
  step(dt: number, lean: number, aspect: number): void;
  /** A poke with a stick: the fire flares and throws sparks. */
  stoke(): void;
  /** Draws the fire, its sparks and its logs; `tone` is the palette index of FIRE_COLORS[0]. */
  draw(surface: GlyphSurface, tone: number): void;
  /** The centre of the flames, in cells, for measuring warmth. */
  readonly centre: { x: number; y: number };
  readonly width: number;
  readonly height: number;
}

/**
 * A small campfire for a scene to set on its ground: a heat field fed from the logs rises, drifts
 * and cools through noise, so the flames lick and fork. Sparks break off and wander up. Built for
 * hosts that place several: each keeps its own little field, so a fire costs only its own cells.
 */
export function createCampfire(seed = 0): Campfire {
  let w = 0;
  let h = 0;
  let x0 = 0;
  let y0 = 0;
  let heat = new Float32Array(0);
  let next = new Float32Array(0);
  const sparks: Spark[] = [];
  let time = seed * 7.3;
  let tick = 0;
  let lean = 0;
  let flare = 0;
  let owed = 0;
  const centre = { x: 0, y: 0 };

  const at = (col: number, row: number) => row * w + col;

  function feed() {
    const mid = (w - 1) / 2;
    for (let col = 0; col < w; col++) {
      const edge = clamp(1 - Math.abs(col - mid) / (w * 0.42), 0, 1);
      const flicker = 0.5 + 0.6 * noise3(col * 0.5, time * 4, seed + 1);
      const value = Math.pow(edge, 0.55) * flicker * (1 + flare * 0.5);
      heat[at(col, h - 1)] = value;
      heat[at(col, h - 2)] = Math.max(heat[at(col, h - 2)]!, value * 0.92);
    }
  }

  function rise() {
    const cooling = 2.1 / (h * 0.92);
    for (let row = 0; row < h - 2; row++) {
      for (let col = 0; col < w; col++) {
        const drift = (noise3(col * 0.2, row * 0.2 - time * 1.4, seed + 4) - 0.5) * 1.6 + lean;
        const from = clamp(Math.round(col - drift), 1, w - 2);
        const below = at(from, row + 1);
        const twoBelow = at(from, Math.min(h - 1, row + 2));
        const v = (heat[below - 1]! + heat[below]! * 2 + heat[below + 1]! + heat[twoBelow]!) / 5;
        const cool =
          cooling * (0.15 + 2 * noise3(col * 0.35, row * 0.25 + time * 3.2, seed + 9) ** 2);
        next[at(col, row)] = Math.max(0, v - cool);
      }
    }
    for (let row = h - 2; row < h; row++)
      for (let col = 0; col < w; col++) next[at(col, row)] = heat[at(col, row)]!;
    [heat, next] = [next, heat];
  }

  function spark(burst = 1) {
    sparks.push({
      x: x0 + w / 2 + (Math.random() - 0.5) * w * 0.5,
      y: y0 + h * (0.45 + Math.random() * 0.3),
      vx: (Math.random() - 0.5) * 4 * burst,
      vy: -(4 + Math.random() * 7) * burst,
      life: 0.7 + Math.random() * 1.2,
      age: 0,
    });
  }

  return {
    centre,
    get width() {
      return w;
    },
    get height() {
      return h;
    },
    place(col, base, width, height) {
      const nw = Math.max(5, Math.round(width) | 1);
      const nh = Math.max(4, Math.round(height));
      x0 = Math.round(col - nw / 2);
      y0 = Math.round(base - nh + 1);
      if (nw !== w || nh !== h) {
        w = nw;
        h = nh;
        heat = new Float32Array(w * h);
        next = new Float32Array(w * h);
        sparks.length = 0;
      }
      centre.x = x0 + w / 2;
      centre.y = y0 + h * 0.6;
    },
    step(dt, target, aspect) {
      if (!w) return;
      time += dt;
      flare = approach(flare, 0, 1.6, dt);
      lean = approach(lean, clamp(target, -1, 1) * 1.1, 3, dt);
      tick += dt;
      while (tick >= 1 / 30) {
        tick -= 1 / 30;
        feed();
        rise();
      }
      owed += dt * (2.5 + flare * 14);
      while (owed >= 1) {
        owed -= 1;
        spark();
      }
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i]!;
        s.age += dt;
        if (s.age > s.life) {
          sparks.splice(i, 1);
          continue;
        }
        const wobble = (noise3(s.x * 0.3, s.y * 0.3, time + i) - 0.5) * 10;
        s.vx = approach(s.vx, wobble + lean * 4, 1.5, dt);
        s.vy = approach(s.vy, -6, 0.8, dt);
        s.x += s.vx * dt;
        s.y += (s.vy * dt) / aspect;
      }
    },
    stoke() {
      flare = 1;
      for (let i = 0; i < 18; i++) spark(1.5);
    },
    draw(surface, tone) {
      if (!w) return;
      for (let row = 0; row < h; row++) {
        for (let col = 0; col < w; col++) {
          const v = heat[at(col, row)]!;
          if (v < 0.07) continue;
          const glyph = FLAME[Math.min(FLAME.length - 1, Math.floor(v * FLAME.length * 1.05))]!;
          const shade = v > 0.78 ? PALE : v > 0.5 ? AMBER : v > 0.24 ? ORANGE : DARK_RED;
          surface.put(x0 + col, y0 + row, glyph, tone + shade, clamp(0.3 + v * 0.9, 0, 1));
        }
      }
      for (const s of sparks) {
        const fade = 1 - s.age / s.life;
        surface.put(s.x, s.y, fade > 0.6 ? '*' : DOT, tone + (fade > 0.5 ? AMBER : ORANGE), fade);
      }
      // Two logs under the flames, with embers glowing between them.
      const first = x0 + 1;
      const last = x0 + w - 2;
      for (let col = first; col <= last; col++) {
        const glyph = col === first ? '(' : col === last ? ')' : '=';
        surface.put(col, y0 + h, glyph, tone + LOG, 0.75);
        const ember = noise3(col * 0.6, time * 1.5, seed + 2);
        if (hash3(col, seed, 5) < 0.5 && ember > 0.5)
          surface.put(col, y0 + h, DOT, tone + AMBER, ember);
      }
    },
  };
}
