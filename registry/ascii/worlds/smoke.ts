import { ramp } from '../engine/glyphs';
import { clamp, noise3 } from '../engine/noise';
import type { GlyphSurface } from '../engine/surface';
import type { AsciiGrid, AsciiPointer, AsciiScene } from '../engine/types';
import { gradient } from '../more-scenes/shared';

export interface SmokeOptions {
  /** The smoke from thin to thick, as hex stops. */
  colors?: readonly string[];
  /** Burn a stick of incense at the bottom. Default true. */
  incense?: boolean;
  /** How strongly smoke curls into eddies, 0 to 2. Default 1. */
  curl?: number;
  /** How long smoke lingers before it thins away, 0 to 1. Default 0.5. */
  linger?: number;
}

const SHADES = 6;
const LIGHT = ' .,:;-=+*#%@';
/** Pressure solver passes a step: more is stiffer smoke, at a cost. */
const PASSES = 18;

/**
 * Smoke that moves like smoke: a real fluid, simulated one cell of type at a time. A stick of
 * incense sends a thread up that wavers, curls and spreads. Moving the pointer stirs the air and
 * leaves ink in it; a click puffs a cloud.
 */
export function createSmoke(options: SmokeOptions = {}): AsciiScene {
  const stops = options.colors?.length ? options.colors : ['#8b8fa8', '#b9a6ff', '#ffd0ea'];
  const incense = options.incense ?? true;
  const curl = clamp(options.curl ?? 1, 0, 2);
  const linger = clamp(options.linger ?? 0.5, 0, 1);
  let W = 0;
  let H = 0;
  let u = new Float32Array(0);
  let v = new Float32Array(0);
  let u0 = new Float32Array(0);
  let v0 = new Float32Array(0);
  let d = new Float32Array(0);
  let d0 = new Float32Array(0);
  let p = new Float32Array(0);
  let div = new Float32Array(0);
  let w = new Float32Array(0);
  let time = 0;
  let lastX = NaN;
  let lastY = NaN;
  const puffs: { x: number; y: number }[] = [];

  const at = (x: number, y: number) => x + 1 + (y + 1) * (W + 2);

  function bounds(field: Float32Array, kind: 0 | 1 | 2) {
    for (let x = 0; x < W; x++) {
      field[at(x, -1)] = kind === 2 ? -field[at(x, 0)]! : field[at(x, 0)]!;
      field[at(x, H)] = kind === 2 ? -field[at(x, H - 1)]! : field[at(x, H - 1)]!;
    }
    for (let y = -1; y <= H; y++) {
      field[at(-1, y)] = kind === 1 ? -field[at(0, y)]! : field[at(0, y)]!;
      field[at(W, y)] = kind === 1 ? -field[at(W - 1, y)]! : field[at(W - 1, y)]!;
    }
  }

  function advect(next: Float32Array, field: Float32Array, dt: number, kind: 0 | 1 | 2) {
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = at(x, y);
        // Trace back along the flow and read what was there.
        const sx = clamp(x - dt * u[i]!, -0.5, W - 0.5);
        const sy = clamp(y - dt * v[i]!, -0.5, H - 0.5);
        const x0 = Math.floor(sx);
        const y0 = Math.floor(sy);
        const fx = sx - x0;
        const fy = sy - y0;
        next[i] =
          (1 - fy) * ((1 - fx) * field[at(x0, y0)]! + fx * field[at(x0 + 1, y0)]!) +
          fy * ((1 - fx) * field[at(x0, y0 + 1)]! + fx * field[at(x0 + 1, y0 + 1)]!);
      }
    }
    bounds(next, kind);
  }

  /** Makes the flow incompressible: smoke cannot pile up or thin out of nowhere. */
  function project() {
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = at(x, y);
        div[i] = -0.5 * (u[i + 1]! - u[i - 1]! + v[i + W + 2]! - v[i - W - 2]!);
        p[i] = 0;
      }
    }
    bounds(div, 0);
    bounds(p, 0);
    for (let k = 0; k < PASSES; k++) {
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const i = at(x, y);
          p[i] = (div[i]! + p[i - 1]! + p[i + 1]! + p[i - W - 2]! + p[i + W + 2]!) / 4;
        }
      }
      bounds(p, 0);
    }
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = at(x, y);
        u[i]! -= 0.5 * (p[i + 1]! - p[i - 1]!);
        v[i]! -= 0.5 * (p[i + W + 2]! - p[i - W - 2]!);
      }
    }
    bounds(u, 1);
    bounds(v, 2);
  }

  function splat(cx: number, cy: number, radius: number, amount: number, fx: number, fy: number) {
    const r2 = radius * radius;
    for (let y = Math.max(0, Math.floor(cy - radius)); y < Math.min(H, cy + radius + 1); y++) {
      for (
        let x = Math.max(0, Math.floor(cx - radius * 2));
        x < Math.min(W, cx + radius * 2 + 1);
        x++
      ) {
        const dx = (x - cx) / 2;
        const dy = y - cy;
        const fall = Math.exp(-(dx * dx + dy * dy) / r2);
        if (fall < 0.02) continue;
        const i = at(x, y);
        d[i]! += amount * fall;
        u[i]! += fx * fall;
        v[i]! += fy * fall;
      }
    }
  }

  return {
    palette: gradient(stops, SHADES),
    settle: 4,
    resize(next: AsciiGrid) {
      W = next.cols;
      H = next.rows;
      const size = (W + 2) * (H + 2);
      u = new Float32Array(size);
      v = new Float32Array(size);
      u0 = new Float32Array(size);
      v0 = new Float32Array(size);
      d = new Float32Array(size);
      d0 = new Float32Array(size);
      p = new Float32Array(size);
      div = new Float32Array(size);
      w = new Float32Array(size);
    },
    step(dt, pointer: AsciiPointer) {
      if (!W || !H) return;
      time += dt;
      // The incense: a thin thread rising from the bottom, nudged side to side.
      if (incense) {
        const wobble = (noise3(time * 0.6, 0, 1) - 0.5) * 10;
        splat(W / 2, H - 3, 1.2, dt * 16, wobble * dt * 30, -dt * 220);
      }
      if (pointer.active) {
        if (!Number.isNaN(lastX)) {
          const vx = (pointer.x - lastX) / Math.max(dt, 1e-3);
          const vy = (pointer.y - lastY) / Math.max(dt, 1e-3);
          const speed = Math.hypot(vx, vy);
          if (speed > 0.5)
            splat(pointer.x, pointer.y, 2, Math.min(1.2, speed * dt * 0.15), vx * 0.5, vy * 0.5);
        }
        lastX = pointer.x;
        lastY = pointer.y;
      } else {
        lastX = NaN;
      }
      for (const puff of puffs.splice(0)) splat(puff.x, puff.y, 4, 2.4, 0, -40);

      // Buoyancy lifts thick smoke, a breath of turbulence breaks it into wisps, and swirls are
      // kept alive so it curls rather than smears.
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const i = at(x, y);
          v[i]! -= d[i]! * dt * 22;
          if (d[i]! > 0.02)
            u[i]! += (noise3(x * 0.07, y * 0.09 + time * 0.6, time * 0.15) - 0.5) * dt * 140 * curl;
          w[i] = (v[i + 1]! - v[i - 1]! - (u[i + W + 2]! - u[i - W - 2]!)) * 0.5;
        }
      }
      if (curl > 0) {
        for (let y = 1; y < H - 1; y++) {
          for (let x = 1; x < W - 1; x++) {
            const i = at(x, y);
            const gx = (Math.abs(w[i + 1]!) - Math.abs(w[i - 1]!)) * 0.5;
            const gy = (Math.abs(w[i + W + 2]!) - Math.abs(w[i - W - 2]!)) * 0.5;
            const len = Math.hypot(gx, gy) + 1e-5;
            u[i]! += (gy / len) * w[i]! * curl * 16 * dt;
            v[i]! -= (gx / len) * w[i]! * curl * 16 * dt;
          }
        }
      }
      bounds(u, 1);
      bounds(v, 2);
      project();
      u0.set(u);
      v0.set(v);
      advect(u, u0, dt, 1);
      advect(v, v0, dt, 2);
      project();
      d0.set(d);
      advect(d, d0, dt, 0);
      const keep = Math.exp(-dt * (1.3 - linger * 1));
      for (let i = 0; i < d.length; i++) {
        d[i] = Math.min(4, d[i]! * keep);
        u[i]! *= 0.995;
        v[i]! *= 0.995;
      }
    },
    press(x, y) {
      puffs.push({ x, y });
    },
    draw(surface: GlyphSurface) {
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const density = d[at(x, y)]!;
          if (density < 0.03) continue;
          const t = clamp(density / 1.4, 0, 1);
          surface.put(
            x,
            y,
            ramp(LIGHT, t),
            clamp(Math.floor(t * SHADES), 0, SHADES - 1),
            clamp(0.2 + t, 0, 1),
          );
        }
      }
      if (incense) {
        // The stick, and its glowing tip.
        surface.put(W / 2, H - 2, '*', SHADES - 1, 0.9 + 0.1 * Math.sin(time * 9));
        surface.put(W / 2, H - 1, '|', 0, 0.8);
      }
    },
  };
}
