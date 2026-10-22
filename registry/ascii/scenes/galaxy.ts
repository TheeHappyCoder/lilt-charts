import { ramp } from '../engine/glyphs';
import { approach, clamp, hash3, smoothstep } from '../engine/noise';
import { DOT, type GlyphSurface } from '../engine/surface';
import type { AsciiGrid, AsciiPointer, AsciiScene } from '../engine/types';

export interface GalaxyOptions {
  /** Spiral arms. Default 2. */
  arms?: number;
  /** Stars per thousand cells. Default 600. */
  stars?: number;
  /** How fast it turns; 1 is a slow, stately spin. Default 1. */
  spin?: number;
}

const INK = 0;
const CORE = 1;
const OLD = 2;
const YOUNG = 3;
const NEBULA = 4;
const NOVA = 5;
const LIGHT = ' .:-=+*#%@';

interface Nova {
  star: number;
  age: number;
}

/**
 * A spiral galaxy. Every star keeps its own orbit, and inner stars go round faster, as they do.
 * The arms are a pattern that sweeps through the disc rather than a shape painted on it: young
 * blue stars and pink nebulae light up as the arm passes them, with dust along the inner edge.
 * Old gold stars crowd the core. The pointer tilts the galaxy toward you; a click sets off a
 * supernova in the star nearest to it.
 */
export function createGalaxy(options: GalaxyOptions = {}): AsciiScene {
  const armCount = clamp(Math.round(options.arms ?? 2), 1, 6);
  const density = options.stars ?? 600;
  const spin = options.spin ?? 1;
  let grid: AsciiGrid = { cols: 0, rows: 0, aspect: 2 };
  let time = 0;
  // Each star: radius 0 → 1, starting angle, height above the disc, brightness, and kind.
  let radius = new Float32Array(0);
  let angle = new Float32Array(0);
  let lift = new Float32Array(0);
  let shine = new Float32Array(0);
  let young = new Uint8Array(0);
  let light = new Float32Array(0);
  let blue = new Float32Array(0);
  let pink = new Float32Array(0);
  let screenX = new Float32Array(0);
  let screenY = new Float32Array(0);
  let tilt = 0.62;
  let turn = 0;
  let tiltTarget = 1;
  let turnTarget = 0;
  const novae: Nova[] = [];
  const PITCH = Math.tan((14 * Math.PI) / 180);

  function populate() {
    const n = Math.round(((grid.cols * grid.rows) / 1000) * density);
    radius = new Float32Array(n);
    angle = new Float32Array(n);
    lift = new Float32Array(n);
    shine = new Float32Array(n);
    young = new Uint8Array(n);
    screenX = new Float32Array(n);
    screenY = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const bulge = i < n * 0.22;
      // An exponential disc, and a tight bulge of old stars at the centre.
      const r = bulge
        ? Math.abs(gauss()) * 0.09
        : Math.min(1, -Math.log(1 - Math.random() * 0.97) * 0.3 + 0.03);
      radius[i] = r;
      angle[i] = Math.random() * Math.PI * 2;
      lift[i] = gauss() * (bulge ? 0.06 : 0.015);
      shine[i] = 0.4 + Math.random() * 0.6;
      // Young stars are born in the disc, not the bulge; a few become glowing nebulae.
      young[i] = bulge ? 0 : Math.random() < 0.7 ? (Math.random() < 0.08 ? 2 : 1) : 0;
    }
    const cells = grid.cols * grid.rows;
    light = new Float32Array(cells);
    blue = new Float32Array(cells);
    pink = new Float32Array(cells);
  }

  function gauss() {
    return Math.sqrt(-2 * Math.log(Math.random() + 1e-9)) * Math.cos(Math.PI * 2 * Math.random());
  }

  /** How strongly the arm pattern lights a point of the disc right now, 0 → 1. */
  function armAt(r: number, theta: number) {
    const phase = armCount * (theta - Math.log(r + 0.03) / PITCH - time * 0.05 * spin);
    return Math.cos(phase);
  }

  return {
    palette: ['ink', '#fff3d6', '#ffc874', '#8fb4ff', '#ff7eb6', '#eaf6ff'],
    settle: 2,
    resize(next) {
      grid = next;
      populate();
    },
    step(dt, pointer: AsciiPointer) {
      time += dt;
      if (pointer.active) {
        tiltTarget = 0.2 + clamp(pointer.y / grid.rows, 0, 1) * 1.1;
        turnTarget = (clamp(pointer.x / grid.cols, 0, 1) - 0.5) * 1.2;
      } else {
        tiltTarget = 0.62;
        turnTarget = 0;
      }
      tilt = approach(tilt, tiltTarget, 1.5, dt);
      turn = approach(turn, turnTarget, 1.5, dt);
      for (let i = novae.length - 1; i >= 0; i--) {
        novae[i]!.age += dt;
        if (novae[i]!.age > 3) novae.splice(i, 1);
      }
    },
    press(x, y) {
      // The nearest star in the disc, on screen, is the one that goes.
      let best = -1;
      let bestD = Infinity;
      for (let i = 0; i < radius.length; i++) {
        if (radius[i]! < 0.12) continue;
        const d = (screenX[i]! - x) ** 2 + ((screenY[i]! - y) * grid.aspect) ** 2;
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
      if (best >= 0) novae.push({ star: best, age: 0 });
    },
    draw(surface: GlyphSurface) {
      const { cols, rows, aspect } = grid;
      light.fill(0);
      blue.fill(0);
      pink.fill(0);
      const scale = Math.min(cols, rows * aspect) * 0.62;
      const cx = cols / 2;
      const cy = (rows * aspect) / 2;
      const cosI = Math.cos(tilt);
      const sinI = Math.sin(tilt);
      const spinAngle = turn + 0.35;
      const cosT = Math.cos(spinAngle);
      const sinT = Math.sin(spinAngle);

      for (let i = 0; i < radius.length; i++) {
        const r = radius[i]!;
        // A flat rotation curve: the same speed at every radius, so inner orbits are quicker.
        const theta = angle[i]! + (time * 0.18 * spin) / (r + 0.12);
        const px = Math.cos(theta) * r;
        const py = Math.sin(theta) * r;
        // Lean the disc toward the viewer, then turn it on the sky.
        const ty = py * cosI - lift[i]! * sinI;
        const sx = px * cosT - ty * sinT;
        const sy = px * sinT + ty * cosT;
        const col = cx + sx * scale;
        const row = (cy + sy * scale) / aspect;
        screenX[i] = col;
        screenY[i] = row;
        const c = Math.floor(col);
        const rr = Math.floor(row);
        if (c < 0 || rr < 0 || c >= cols || rr >= rows) continue;
        const k = rr * cols + c;
        const kind = young[i]!;
        if (kind) {
          const arm = armAt(r, theta);
          const lit = smoothstep(0.45, 1, arm);
          // Dust trails just inside each arm and dims what lies behind it.
          const dust = smoothstep(0.2, 0.6, armAt(r, theta + 0.35 / armCount)) * (1 - lit);
          const glow = shine[i]! * (0.06 + 1.1 * lit) * (1 - 0.7 * dust);
          light[k] = light[k]! + glow * 0.5;
          if (kind === 2 && lit > 0.5) pink[k] = pink[k]! + glow;
          else blue[k] = blue[k]! + glow;
        } else {
          light[k] = light[k]! + shine[i]! * (0.25 + 0.5 * Math.exp(-r * 18));
        }
      }

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const k = row * cols + col;
          // The disc's own glow under the stars: back from the screen into the plane of the disc.
          const sx = (col + 0.5 - cx) / scale;
          const sy = ((row + 0.5) * aspect - cy) / scale;
          const px = sx * cosT + sy * sinT;
          const py = (-sx * sinT + sy * cosT) / Math.max(0.2, cosI);
          const r = Math.hypot(px, py);
          if (r < 1.1) {
            const arm = smoothstep(0.35, 1, armAt(r, Math.atan2(py, px)));
            const fade = Math.exp(-r * 1.7);
            blue[k] =
              blue[k]! + arm * fade * 2.4 * smoothstep(0.06, 0.2, r) * smoothstep(1.05, 0.8, r);
            light[k] = light[k]! + Math.exp(-r * 9) * 1.6 + fade * 0.12;
          }
          const total = light[k]! + blue[k]! * 0.6 + pink[k]!;
          if (total < 0.12) {
            const h = hash3(col, row, 31);
            if (h < 0.012)
              surface.put(col, row, DOT, INK, 0.1 + 0.2 * (0.5 + 0.5 * Math.sin(time + h * 900)));
            continue;
          }
          const v = 1 - Math.exp(-total * 0.55);
          const dx = col + 0.5 - cx;
          const dy = (row + 0.5) * aspect - cy;
          const core = Math.hypot(dx, dy) < scale * 0.07;
          const tone =
            core && v > 0.6
              ? CORE
              : pink[k]! > 0.4
                ? NEBULA
                : blue[k]! > light[k]! * 0.9
                  ? YOUNG
                  : OLD;
          surface.put(col, row, ramp(LIGHT, v), tone, clamp(0.3 + v * 0.8, 0, 1));
        }
      }

      for (const nova of novae) {
        const life = nova.age / 3;
        const col = screenX[nova.star]!;
        const row = screenY[nova.star]!;
        const flash = Math.max(0, 1 - life * 2.2);
        surface.put(col, row, flash > 0.5 ? '@' : '*', NOVA, Math.max(0.3, flash));
        if (flash > 0.3) {
          surface.put(col - 1, row, '-', NOVA, flash);
          surface.put(col + 1, row, '-', NOVA, flash);
          surface.put(col, row - 1, '|', NOVA, flash);
          surface.put(col, row + 1, '|', NOVA, flash);
        }
        // The shell of debris, thinning as it spreads.
        const shell = 1 + life * 9;
        const around = Math.round(10 + shell * 4);
        for (let a = 0; a < around; a++) {
          const t = (a / around) * Math.PI * 2;
          if (hash3(a, nova.star, 1) < 0.35) continue;
          surface.put(
            col + Math.cos(t) * shell,
            row + (Math.sin(t) * shell) / aspect,
            DOT,
            NOVA,
            (1 - life) * 0.7,
          );
        }
      }
    },
  };
}
