import { clamp, hash3, noise3 } from '../engine/noise';
import type { GlyphSurface } from '../engine/surface';
import type { AsciiGrid, AsciiPointer, AsciiScene } from '../engine/types';

export interface GlowOptions {
  /** Gradient stops as hex colours, from the coolest light to the warmest. Default violet to rose. */
  colors?: readonly string[];
  /** Soft lights drifting across the field. Default 4. */
  lights?: number;
  /** Characters the pointer stirs the type into. */
  scramble?: string;
  /** How large the lights are; 1 is about a third of the shorter side. Default 1. */
  size?: number;
  /** Radius of the stir around the pointer, in cells. Default 4.5. */
  reach?: number;
}

const RAMP = ' .:-=+*#%@';
const SCRAMBLE = '01<>/\\{}[]#$%&*+=?~';
/** Colours the gradient is cut into. More looks smoother and costs a few more fill styles. */
const STEPS = 12;

interface Light {
  /** Where on the gradient this light sits, 0 → 1. */
  hue: number;
  seed: number;
  x: number;
  y: number;
  radius: number;
}

interface Ring {
  x: number;
  y: number;
  age: number;
}

/**
 * Soft gradient light drawn in type. A few glows drift on slow paths and pool into one another;
 * dense glyphs sit in their hearts and sparse ones at the edges. Moving the pointer stirs the
 * characters into code that settles back; a click sends a ring of it outward.
 */
export function createGlow(options: GlowOptions = {}): AsciiScene {
  const stops = options.colors?.length ? options.colors : ['#7c5cff', '#e5489c'];
  const scramble = options.scramble ?? SCRAMBLE;
  const count = Math.max(1, options.lights ?? 4);
  const size = options.size ?? 1;
  const reach = Math.max(1, options.reach ?? 4.5);
  let grid: AsciiGrid = { cols: 0, rows: 0, aspect: 2 };
  let stir = new Float32Array(0);
  const rings: Ring[] = [];
  let time = 0;
  let lastX = -1;
  let lastY = -1;

  const lights: Light[] = Array.from({ length: count }, (_, i) => ({
    hue: count === 1 ? 0.5 : i / (count - 1),
    seed: i * 17.3 + 4,
    x: 0,
    y: 0,
    radius: 0,
  }));

  /** Raises the stir around a point, measured in square units. */
  function stamp(px: number, py: number, radius: number, amount: number) {
    const { cols, rows, aspect } = grid;
    const r0 = Math.floor((py - radius) / aspect);
    const r1 = Math.ceil((py + radius) / aspect);
    for (let row = Math.max(0, r0); row <= Math.min(rows - 1, r1); row++) {
      for (
        let col = Math.max(0, Math.floor(px - radius));
        col <= Math.min(cols - 1, px + radius);
        col++
      ) {
        const d = Math.hypot(col + 0.5 - px, (row + 0.5) * aspect - py);
        if (d > radius) continue;
        const i = row * cols + col;
        stir[i] = Math.min(1, stir[i]! + amount * (1 - d / radius));
      }
    }
  }

  return {
    palette: Array.from({ length: STEPS }, (_, i) => sample(stops, i / (STEPS - 1))),
    settle: 2,
    resize(next) {
      grid = next;
      stir = new Float32Array(grid.cols * grid.rows);
    },
    step(dt, pointer: AsciiPointer) {
      time += dt;
      const width = grid.cols;
      const height = grid.rows * grid.aspect;
      const base = Math.min(width, height);
      for (const light of lights) {
        // Slow, unrelated drifts for each light so the pools keep changing shape.
        light.x = width * (0.15 + 0.7 * noise3(light.seed, time * 0.05, 0));
        light.y = height * (0.15 + 0.7 * noise3(0, light.seed, time * 0.05));
        light.radius = base * size * (0.2 + 0.12 * noise3(time * 0.08, light.seed, 5));
      }

      const decay = Math.exp(-dt * 1.8);
      for (let i = 0; i < stir.length; i++) stir[i]! *= decay;

      if (pointer.active) {
        const px = pointer.x;
        const py = pointer.y * grid.aspect;
        // Stir along the path travelled, so fast strokes leave a continuous wake.
        const moved = lastX < 0 ? 0 : Math.hypot(px - lastX, py - lastY);
        const steps = Math.min(12, Math.ceil(moved / 1.5));
        for (let s = 0; s <= steps; s++) {
          const t = steps ? s / steps : 1;
          stamp(
            lastX < 0 ? px : lastX + (px - lastX) * t,
            lastY < 0 ? py : lastY + (py - lastY) * t,
            reach,
            0.35,
          );
        }
        lastX = px;
        lastY = py;
      } else {
        lastX = -1;
      }

      for (let i = rings.length - 1; i >= 0; i--) {
        const ring = rings[i]!;
        ring.age += dt;
        const radius = ring.age * 38;
        if (radius > Math.hypot(width, height)) {
          rings.splice(i, 1);
          continue;
        }
        // Stamp a band of the ring each step.
        const around = Math.max(12, Math.round(radius * 1.2));
        for (let k = 0; k < around; k++) {
          const a = (k / around) * Math.PI * 2;
          stamp(ring.x + Math.cos(a) * radius, ring.y + Math.sin(a) * radius, 2.2, 0.5);
        }
      }
    },
    press(x, y) {
      rings.push({ x, y: y * grid.aspect, age: 0 });
    },
    draw(surface: GlyphSurface) {
      const { cols, rows, aspect } = grid;
      const frame = Math.floor(time * 14);
      for (let row = 0; row < rows; row++) {
        const py = (row + 0.5) * aspect;
        for (let col = 0; col < cols; col++) {
          const px = col + 0.5;
          let total = 0;
          let hue = 0;
          for (const light of lights) {
            const dx = px - light.x;
            const dy = py - light.y;
            const w = Math.exp(-(dx * dx + dy * dy) / (light.radius * light.radius));
            total += w;
            hue += w * light.hue;
          }
          // A little grain breaks up the bands between ramp steps.
          const grain = (hash3(col, row, 1) - 0.5) * 0.08;
          // Light adds up but never clips: overlapping glows brighten toward full without a flat plateau.
          const v = clamp(Math.pow(1 - Math.exp(-total * 1.15), 1.35) * 0.95 + grain, 0, 1);
          const i = row * cols + col;
          const stirred = stir[i]!;
          const tone = Math.round(clamp(hue / (total || 1), 0, 1) * (STEPS - 1));

          if (stirred > 0.08 && stirred > hash3(col, row, 2) * 0.8) {
            const g = scramble[Math.floor(hash3(col, row, frame) * scramble.length)]!;
            surface.put(col, row, g, tone, clamp(0.35 + v * 0.5 + stirred * 0.4, 0, 1));
            continue;
          }
          const g = RAMP[Math.min(RAMP.length - 1, Math.floor(v * RAMP.length))]!;
          if (g === ' ') continue;
          surface.put(col, row, g, tone, 0.25 + v * 0.75);
        }
      }
    },
  };
}

/** The colour a share of the way along a run of hex stops. */
function sample(stops: readonly string[], t: number): string {
  if (stops.length === 1) return stops[0]!;
  const span = t * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(span));
  const a = rgb(stops[i]!);
  const b = rgb(stops[i + 1]!);
  const k = span - i;
  const mix = (m: number, n: number) => Math.round(m + (n - m) * k);
  return `rgb(${mix(a[0], b[0])},${mix(a[1], b[1])},${mix(a[2], b[2])})`;
}

function rgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '');
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
