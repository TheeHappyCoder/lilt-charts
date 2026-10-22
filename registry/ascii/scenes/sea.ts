import { ramp } from '../engine/glyphs';
import { approach, clamp, fbm3, hash3, noise3, smoothstep } from '../engine/noise';
import { DOT, type GlyphSurface } from '../engine/surface';
import type { AsciiGrid, AsciiPointer, AsciiScene } from '../engine/types';

export interface SeaOptions {
  /** How rough the water is, 0 glassy to 1 choppy. Default 0.5. */
  swell?: number;
  /** Colour of the moon and its path on the water. Default a warm pale gold. */
  moon?: string;
  /** Colour of the sea. Default a night blue. */
  water?: string;
}

const INK = 0;
const MOON = 1;
const GLITTER = 2;
const SEA = 3;
const MOON_FACE = '.:-=+*#%@';

interface Meteor {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
}

/**
 * A moonlit sea, seen from the shore. Swells roll toward you in perspective, small and tight at
 * the horizon and broad up close, and the moon lays a broken path of light across them that
 * glitters as the waves turn. Thin clouds drift over the stars. The moon follows the pointer
 * across the sky; a click sends a shooting star.
 */
export function createSea(options: SeaOptions = {}): AsciiScene {
  const swell = clamp(options.swell ?? 0.5, 0, 1);
  let grid: AsciiGrid = { cols: 0, rows: 0, aspect: 2 };
  let time = 0;
  let moonX = 0;
  let moonTarget = 0;
  const meteors: Meteor[] = [];

  const horizon = () => Math.round(grid.rows * 0.44);

  /** Water height at a point on the sea, in world units: a few long swells and a chop. */
  function height(x: number, z: number) {
    const chop = 0.35 + swell;
    return (
      Math.sin(x * 0.9 + z * 1.7 - time * 1.3) * 0.5 +
      Math.sin(x * -1.6 + z * 2.3 - time * 1.9 + 1.3) * 0.3 * chop +
      Math.sin(x * 2.9 + z * 3.1 - time * 2.6 + 4.1) * 0.18 * chop +
      Math.sin(x * 4.7 - z * 2.1 - time * 3.1 + 2.2) * 0.12 * chop
    );
  }

  return {
    palette: [
      'ink',
      options.moon ?? '#ffe9b0',
      options.moon ?? '#ffe9b0',
      options.water ?? '#5b7fe0',
    ],
    settle: 2,
    resize(next) {
      grid = next;
      moonX = moonTarget = grid.cols * 0.66;
    },
    step(dt, pointer: AsciiPointer) {
      time += dt;
      if (pointer.active) moonTarget = clamp(pointer.x, grid.cols * 0.08, grid.cols * 0.92);
      moonX = approach(moonX, moonTarget, 1.5, dt);
      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i]!;
        m.age += dt;
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        if (m.age > 0.9) meteors.splice(i, 1);
      }
    },
    press(x, y) {
      const fromLeft = x > grid.cols / 2;
      meteors.push({
        x: fromLeft ? x - grid.cols * 0.25 : x + grid.cols * 0.25,
        y: Math.max(0, y - grid.rows * 0.2),
        vx: (fromLeft ? 1 : -1) * grid.cols * 0.55,
        vy: grid.rows * 0.22,
        age: 0,
      });
    },
    draw(surface: GlyphSurface) {
      const { cols, rows, aspect } = grid;
      const sea = horizon();
      const radius = Math.max(2.5, Math.min(cols, rows * aspect) * 0.07);
      const moonY = sea * 0.38 * aspect;

      // The sky: stars, thin drifting cloud, and the moon.
      for (let row = 0; row < sea; row++) {
        const y = (row + 0.5) * aspect;
        for (let col = 0; col < cols; col++) {
          const dx = col + 0.5 - moonX;
          const dy = y - moonY;
          const d = Math.hypot(dx, dy) / radius;
          if (d < 1) {
            // A full moon: lit face, darker seas of maria, a soft limb.
            const maria = fbm3(dx * 0.35 + 3.1, dy * 0.35 + 1.7, 0.5, 3);
            const limb = Math.sqrt(1 - d * d);
            const v = clamp(0.55 + 0.45 * limb - (maria > 0.55 ? 0.3 : 0), 0, 1);
            surface.put(col, row, ramp(MOON_FACE, v), MOON, 0.6 + 0.4 * v);
            continue;
          }
          if (d < 1.9) {
            const halo = (1.9 - d) / 0.9;
            if (hash3(col, row, 2) < halo * 0.6) surface.put(col, row, DOT, MOON, halo * 0.45);
            continue;
          }
          // Thin cloud, sampled only where a wisp could be drawn.
          if (hash3(col, row, 7) < 0.35) {
            const cloud = smoothstep(
              0.66,
              0.8,
              fbm3(col * 0.035 - time * 0.03 + 0.3, row * 0.32 + 0.6, 2.5, 3),
            );
            if (cloud > 0.05) {
              surface.put(col, row, '-', INK, cloud * 0.14);
              continue;
            }
          }
          const h = hash3(col, row, 3);
          if (h < 0.025) {
            const twinkle = 0.5 + 0.5 * Math.sin(time * (0.7 + h * 50) + h * 700);
            surface.put(
              col,
              row,
              h < 0.003 ? '+' : DOT,
              INK,
              (0.12 + twinkle * 0.4) * (0.4 + (0.6 * (sea - row)) / sea),
            );
          }
        }
      }
      for (const m of meteors) {
        const life = 1 - m.age / 0.9;
        for (let k = 0; k < 10; k++) {
          const tx = m.x - (m.vx / 30) * k * 0.6;
          const ty = m.y - (m.vy / 30) * k * 0.6;
          if (ty >= sea) continue;
          surface.put(tx, ty, k === 0 ? '*' : m.vx > 0 ? '\\' : '/', INK, life * (1 - k / 10));
        }
      }

      // The sea: each row further down is nearer, so its waves are broader and slower to change.
      for (let row = sea; row < rows; row++) {
        const near = row - sea + 0.6;
        const z = 22 / near;
        const t = (row - sea) / (rows - sea);
        const spread = 1.2 + near * 0.9;
        for (let col = 0; col < cols; col++) {
          // Near water still shows several swells across the view, just broader ones.
          const x = ((col - cols / 2) * (z + 2.5)) / 26;
          const h = height(x, z);
          // The slope across the view: faces tilted toward the moon catch its light.
          const slope = (height(x + z * 0.02, z) - h) / (z * 0.02);
          const path = Math.exp(-(((col - moonX) / spread) ** 2));
          // Only faces turned just so catch the moon, and they flicker as the water moves.
          const facing = slope * Math.sign(moonX - col || 1) * 0.35 + 0.5 + h * 0.35;
          const flicker = path > 0.2 ? noise3(col * 0.7, row * 1.3, time * 3) : 0;
          const glint = path * smoothstep(0.5, 0.85, facing * 0.7 + flicker * 0.5);
          if (glint > 0.2) {
            surface.put(
              col,
              row,
              glint > 0.6 ? '=' : '-',
              GLITTER,
              clamp(glint * (0.6 + 0.4 * t) + 0.15, 0, 1),
            );
            continue;
          }
          const crest = (h + 1) / 2;
          if (crest > 0.7) {
            const g = t > 0.35 && crest > 0.82 ? '~' : '-';
            surface.put(col, row, g, SEA, clamp((crest - 0.55) * (0.8 + t), 0, 0.85));
          } else if (crest > 0.5 && hash3(col, row, Math.floor(time * 2)) < 0.15) {
            surface.put(col, row, '.', SEA, 0.2 + t * 0.2);
          }
        }
      }
      for (let col = 0; col < cols; col++) {
        if (!surface.filled(col, sea)) surface.put(col, sea, '_', SEA, 0.25);
      }
    },
  };
}
