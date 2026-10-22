import { approach, clamp, hash3, noise3, smoothstep } from '../engine/noise';
import { DOT, type GlyphSurface } from '../engine/surface';
import type { AsciiGrid, AsciiPointer, AsciiScene } from '../engine/types';

export interface MeadowOptions {
  /** How strong the wind is, 0 still to 1 blustery. Default 0.5. */
  wind?: number;
  /** Fireflies over the grass. Default 28. */
  fireflies?: number;
  /** Share of blades that carry a flower. Default 0.06. */
  flowers?: number;
}

const INK = 0;
const GRASS_FAR = 1;
const GRASS = 2;
const GRASS_NEAR = 3;
const FIREFLY = 4;
const BLOOMS = [5, 6, 7];

interface Blade {
  x: number;
  /** Row of the root. */
  base: number;
  /** Height in rows. */
  height: number;
  layer: number;
  bend: number;
  speed: number;
  /** Stiffer blades swing back faster and lean less. */
  stiffness: number;
  bloom: number;
  seed: number;
}

interface Firefly {
  x: number;
  y: number;
  /** Through one blink cycle, 0 → 1. */
  clock: number;
  period: number;
  seed: number;
}

/**
 * A meadow at dusk. Every blade is a little spring rooted in the ground: gusts sweep across the
 * field in visible waves, and the pointer parts the grass as it passes through. Fireflies drift
 * and blink above it; a click makes them flash together, spreading out from where you clicked.
 */
export function createMeadow(options: MeadowOptions = {}): AsciiScene {
  const windiness = clamp(options.wind ?? 0.5, 0, 1);
  const fireflyCount = clamp(Math.round(options.fireflies ?? 28), 0, 200);
  const bloomShare = clamp(options.flowers ?? 0.06, 0, 1);
  let grid: AsciiGrid = { cols: 0, rows: 0, aspect: 2 };
  let blades: Blade[] = [];
  let flies: Firefly[] = [];
  let time = 0;
  let px = -999;
  let py = -999;
  let pvx = 0;
  let pointerOn = false;

  const horizon = () => Math.round(grid.rows * 0.5);

  function populate() {
    const { cols, rows } = grid;
    const top = horizon();
    const field = rows - top;
    blades = [];
    // Three bands of depth: far blades are short and dim, near ones tall and bright.
    const layers = [
      { from: 0.08, to: 0.35, tall: [0.12, 0.22], every: 1.2 },
      { from: 0.35, to: 0.7, tall: [0.22, 0.4], every: 1.7 },
      { from: 0.7, to: 1, tall: [0.38, 0.62], every: 2.3 },
    ];
    layers.forEach((layer, l) => {
      for (let x = 0; x < cols; x += layer.every) {
        const seed = x * 3.7 + l * 101;
        const base =
          top + field * (layer.from + (layer.to - layer.from) * hash3(Math.floor(x * 10), l, 1));
        blades.push({
          x: x + (hash3(Math.floor(x * 10), l, 2) - 0.5) * 0.8,
          base: Math.min(rows - 1, base),
          height:
            field *
            (layer.tall[0]! + (layer.tall[1]! - layer.tall[0]!) * hash3(Math.floor(x * 10), l, 3)),
          layer: l,
          bend: 0,
          speed: 0,
          stiffness: 6 + 6 * hash3(Math.floor(x * 10), l, 4),
          bloom:
            l > 0 && hash3(Math.floor(x * 10), l, 5) < bloomShare
              ? 1 + Math.floor(hash3(x, l, 6) * 3)
              : 0,
          seed,
        });
      }
    });
    blades.sort((a, b) => a.base - b.base);
    flies = Array.from({ length: fireflyCount }, (_, i) => ({
      x: Math.random() * cols,
      y: (top - rows * 0.12 + Math.random() * (field * 0.75 + rows * 0.12)) * grid.aspect,
      clock: Math.random(),
      period: 3 + Math.random() * 3,
      seed: i * 9.1,
    }));
  }

  /** The wind's push at a column: a steady breath, with gusts rolling across the field. */
  function wind(x: number) {
    const gust = smoothstep(
      0.4,
      0.7,
      noise3(x * 0.035 - time * 0.55 + 0.3, time * 0.08 + 0.4, 0.5),
    );
    const breath = 0.3 + 0.12 * Math.sin(time * 0.7);
    return windiness * (breath + gust * 1.4);
  }

  return {
    palette: ['ink', '#2f6e47', '#4fa060', '#8fd36f', '#e9ff7a', '#ff8fc7', '#ffd166', '#c9b6ff'],
    settle: 3,
    resize(next) {
      grid = next;
      populate();
    },
    step(dt, pointer: AsciiPointer) {
      time += dt;
      const nx = pointer.x;
      const ny = pointer.y;
      pvx = pointerOn && pointer.active ? approach(pvx, (nx - px) / dt, 10, dt) : 0;
      pointerOn = pointer.active;
      px = nx;
      py = ny;

      for (const b of blades) {
        // Gusts and a flutter of its own; stiffer blades give less.
        let target = (wind(b.x) + (noise3(b.seed, time * 1.6, 3) - 0.5) * 0.3) * (8 / b.stiffness);
        if (pointerOn) {
          // Parting: the grass bends away from a passing hand, and along with its motion.
          const dx = b.x - px;
          const dy = b.base - b.height * 0.5 - py;
          const reach = 5 + b.layer * 2;
          if (Math.abs(dx) < reach && Math.abs(dy) < b.height * 0.8 + 2) {
            const k = 1 - Math.abs(dx) / reach;
            target += Math.sign(dx || 1) * k * 1.4 + clamp(pvx * 0.02, -1, 1) * k;
          }
        }
        // A damped spring, so blades overshoot and settle.
        const accel = (target - b.bend) * b.stiffness * 4 - b.speed * 3.2;
        b.speed += accel * dt;
        b.bend += b.speed * dt;
      }

      for (const f of flies) {
        f.clock = (f.clock + dt / f.period) % 1;
        f.x += (noise3(f.seed, time * 0.15, 1) - 0.5) * 3 * dt + wind(f.x) * 0.8 * dt;
        f.y += (noise3(f.seed, time * 0.15, 2) - 0.5) * 3 * dt;
        if (f.x > grid.cols + 2) f.x = -2;
        if (f.x < -2) f.x = grid.cols + 2;
        const top = (horizon() - grid.rows * 0.15) * grid.aspect;
        const bottom = (grid.rows - 1) * grid.aspect;
        if (f.y < top) f.y += (top - f.y) * dt;
        if (f.y > bottom) f.y -= (f.y - bottom) * dt;
      }
    },
    press(x, y) {
      // Fireflies that see a flash answer it: the closer, the sooner.
      for (const f of flies) {
        const d = Math.hypot(f.x - x, (f.y - y * grid.aspect) / 1.5);
        f.clock = (1 - Math.min(0.9, d / (grid.cols * 0.9)) * 1) % 1;
      }
    },
    draw(surface: GlyphSurface) {
      const { cols, aspect } = grid;
      const top = horizon();
      // A faint sky: a few stars, and the line of the far field.
      for (let row = 0; row < top; row++) {
        for (let col = 0; col < cols; col++) {
          const h = hash3(col, row, 12);
          if (h < 0.012) {
            const twinkle = 0.5 + 0.5 * Math.sin(time * (0.5 + h * 60) + h * 500);
            surface.put(col, row, DOT, INK, 0.1 + 0.25 * twinkle * (1 - row / top));
          }
        }
      }
      for (let col = 0; col < cols; col++) {
        if (hash3(col, 0, 13) < 0.5) surface.put(col, top, '_', GRASS_FAR, 0.35);
      }

      for (const b of blades) {
        const rows = Math.max(1, Math.round(b.height));
        let x = b.x;
        let prevX = b.x;
        for (let k = 0; k < rows; k++) {
          const t = (k + 1) / rows;
          // The blade bends more toward its tip.
          x = b.x + b.bend * Math.pow(t, 1.7) * b.height * 1.15;
          const row = b.base - k;
          // Grass reads as leaning long before it reaches 45°, so lean early.
          const lean = (x - prevX) / aspect;
          const g = lean > 0.16 ? '/' : lean < -0.16 ? '\\' : '|';
          const tone = b.layer === 0 ? GRASS_FAR : t > 0.65 && b.layer === 2 ? GRASS_NEAR : GRASS;
          const fade = b.layer === 0 ? 0.45 : b.layer === 1 ? 0.7 : 0.9;
          surface.put(x, row, k === rows - 1 && !b.bloom ? "'" : g, tone, fade * (0.55 + 0.45 * t));
          prevX = x;
        }
        if (b.bloom) {
          const row = b.base - rows;
          const tone = BLOOMS[(b.bloom - 1) % BLOOMS.length]!;
          surface.put(x, row, b.layer === 2 ? '@' : '*', tone, b.layer === 2 ? 1 : 0.8);
          if (b.layer === 2) {
            surface.put(x - 1, row, '(', tone, 0.6);
            surface.put(x + 1, row, ')', tone, 0.6);
          }
        }
      }

      for (const f of flies) {
        // A quick swell and a slower fade, then dark.
        const c = f.clock;
        const glow = c < 0.08 ? c / 0.08 : c < 0.3 ? 1 - (c - 0.08) / 0.22 : 0;
        const col = f.x;
        const row = f.y / aspect;
        if (glow <= 0.02) {
          surface.put(col, row, DOT, FIREFLY, 0.12);
          continue;
        }
        surface.put(col, row, glow > 0.6 ? '*' : '+', FIREFLY, 0.4 + glow * 0.6);
        if (glow > 0.4) {
          for (const [dx, dy] of [
            [-1, 0],
            [1, 0],
            [0, -1],
            [0, 1],
          ] as const) {
            if (!surface.filled(col + dx, row + dy))
              surface.put(col + dx, row + dy, DOT, FIREFLY, glow * 0.35);
          }
        }
      }
    },
  };
}
