import { approach, clamp, hash3, noise3 } from '../engine/noise';
import { DOT, type GlyphSurface } from '../engine/surface';
import type { AsciiGrid, AsciiPointer, AsciiScene } from '../engine/types';
import { gradient } from '../more-scenes/shared';

export interface FirefliesOptions {
  /** Fireflies in the field. Default 46. */
  count?: number;
  /** Colour of their light. Default a pale green-gold. */
  glow?: string;
  /** How strongly they fall into step, 0 never to 1 quickly. Default 0.5. */
  sync?: number;
  /** The dusk sky from its top to the horizon, as hex stops. */
  sky?: readonly string[];
}

const INK = 0;
const GLOW = 1;
const GRASS = 2;
/** The sky's bands start here, top to horizon. */
const SKY = 3;
const SKY_SHADES = 5;

interface Fly {
  x: number;
  y: number;
  /** Where it is in its cycle, 0 → 1; it flashes as it passes 1. */
  phase: number;
  /** Its own pace, cycles a second. */
  rate: number;
  seed: number;
  /** Brightness of its light now. */
  light: number;
}

/**
 * Fireflies over a field at dusk. Each blinks on its own clock, but every flash nudges the
 * neighbours that see it, so over half a minute the field falls into step and pulses in waves, as
 * some real fireflies do. The pointer draws them in; a click startles them, and they scatter and
 * lose the beat.
 */
export function createFireflies(options: FirefliesOptions = {}): AsciiScene {
  const count = clamp(Math.round(options.count ?? 46), 1, 300);
  const sync = clamp(options.sync ?? 0.5, 0, 1);
  const sky = options.sky?.length ? options.sky : ['#1b1f4a', '#5b3a7a', '#e0796b'];
  let grid: AsciiGrid = { cols: 0, rows: 0, aspect: 2 };
  let flies: Fly[] = [];
  let time = 0;
  let px = 0;
  let py = 0;
  let pull = 0;
  let scare = 0;

  const field = () => grid.rows * 0.78;

  return {
    palette: ['ink', options.glow ?? '#e8ff8a', '#3b5a3a', ...gradient(sky, SKY_SHADES)],
    settle: 3,
    resize(next) {
      grid = next;
      flies = Array.from({ length: count }, (_, i) => ({
        x: Math.random() * grid.cols,
        y: grid.rows * (0.3 + Math.random() * 0.55),
        phase: Math.random(),
        rate: 0.45 + Math.random() * 0.05,
        seed: i * 3.7,
        light: 0,
      }));
    },
    step(dt, pointer: AsciiPointer) {
      time += dt;
      pull = approach(pull, pointer.active ? 1 : 0, 1.5, dt);
      scare = approach(scare, 0, 0.8, dt);
      if (pointer.active) {
        px = pointer.x;
        py = pointer.y;
      }
      const flashed: Fly[] = [];
      for (const f of flies) {
        // A lazy wander, with a pull toward the pointer and a push from a scare.
        const wx = noise3(f.seed, time * 0.15, 1) - 0.5;
        const wy = noise3(f.seed, time * 0.15, 7) - 0.5;
        let vx = wx * 6;
        let vy = wy * 2.5;
        if (pull > 0.01) {
          const dx = px - f.x;
          const dy = (py - f.y) * grid.aspect;
          const d = Math.hypot(dx, dy) + 1;
          if (d > 4) {
            vx += (dx / d) * 5 * pull;
            vy += ((dy / d) * 5 * pull) / grid.aspect;
          }
        }
        if (scare > 0.01) {
          const dx = f.x - px;
          const dy = (f.y - py) * grid.aspect;
          const d = Math.hypot(dx, dy) + 1;
          vx += (dx / d) * 30 * scare;
          vy += ((dy / d) * 30 * scare) / grid.aspect;
        }
        f.x = clamp(f.x + vx * dt, 0, grid.cols - 1);
        f.y = clamp(f.y + vy * dt, grid.rows * 0.12, grid.rows - 2);
        f.phase += f.rate * dt;
        if (f.phase >= 1) {
          f.phase -= 1;
          f.light = 1;
          flashed.push(f);
        }
        f.light = approach(f.light, 0, 5, dt);
      }
      // Each flash pulls the cycles of the flies that see it forward, a little.
      if (sync > 0 && scare < 0.2) {
        const reach = Math.max(grid.cols, grid.rows * grid.aspect) * 0.35;
        for (const f of flashed) {
          for (const o of flies) {
            if (o === f) continue;
            const d = Math.hypot(o.x - f.x, (o.y - f.y) * grid.aspect);
            if (d > reach) continue;
            o.phase = Math.min(0.999, o.phase + sync * 0.05 * o.phase * (1 - d / reach));
          }
        }
      }
    },
    press(x, y) {
      px = x;
      py = y;
      scare = 1;
      // Startled, they lose the beat.
      for (const f of flies) f.phase = Math.random();
    },
    draw(surface: GlyphSurface) {
      const { cols, rows } = grid;
      const ground = field();
      // A few early stars up high, and a low warm glow along the horizon.
      for (let row = 0; row < ground; row++) {
        const t = row / ground;
        const tone = SKY + clamp(Math.floor(t * SKY_SHADES), 0, SKY_SHADES - 1);
        for (let col = 0; col < cols; col++) {
          const h = hash3(col, row, 17);
          if (t < 0.5 && h > 0.993) surface.put(col, row, DOT, INK, 0.25);
          else if (t > 0.72 && h > 1.04 - t * 0.12)
            surface.put(col, row, DOT, tone, 0.12 + (t - 0.72) * 0.8);
        }
      }
      // Grass against the sky, swaying a little.
      for (let col = 0; col < cols; col++) {
        if (noise3(col * 0.6, 3, 2) < 0.38) continue;
        const tall = 1 + noise3(col * 0.35, 0, 2) * 3.5;
        const lean = (noise3(col * 0.1, time * 0.4, 5) - 0.5) * 2;
        for (let k = 0; k < tall; k++) {
          const row = rows - 1 - k;
          surface.put(
            col + (k / tall) * lean,
            row,
            k > tall - 1.5 ? (lean > 0.3 ? '/' : lean < -0.3 ? '\\' : '|') : '|',
            GRASS,
            0.75,
          );
        }
        surface.put(col, rows - 1, '"', GRASS, 0.6);
      }
      for (const f of flies) {
        const glow = f.light;
        // A dim body always; a flash blooms into a soft halo a few cells across.
        if (glow > 0.12) {
          const reach = 1 + glow * 2.5;
          for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -4; dx <= 4; dx++) {
              const d = Math.hypot(dx / 2, dy) / reach;
              if (d > 1 || (dx === 0 && dy === 0)) continue;
              surface.put(f.x + dx, f.y + dy, d < 0.45 ? '*' : DOT, GLOW, glow * (1 - d) * 0.7);
            }
          }
        }
        surface.put(
          f.x,
          f.y,
          glow > 0.5 ? '@' : glow > 0.2 ? '*' : DOT,
          glow > 0.08 ? GLOW : INK,
          glow > 0.08 ? 0.5 + glow * 0.5 : 0.35,
        );
      }
    },
  };
}
