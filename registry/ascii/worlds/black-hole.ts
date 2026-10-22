import { ramp } from '../engine/glyphs';
import { approach, clamp, hash3, noise3, smoothstep } from '../engine/noise';
import { DOT, type GlyphSurface } from '../engine/surface';
import type { AsciiGrid, AsciiPointer, AsciiScene } from '../engine/types';
import { gradient } from '../more-scenes/shared';

export interface BlackHoleOptions {
  /** The disc from its hot inner edge to its cool outer edge, as hex stops. */
  colors?: readonly string[];
  /** Radius of the shadow as a share of the shorter side. Default 0.14. */
  size?: number;
  /** How fast the disc turns; 1 is a steady swirl. Default 1. */
  spin?: number;
}

const INK = 0;
const RING = 1;
/** The shadow, painted as a solid block so it reads on a light page too. */
const VOID = 2;
/** The disc's colours start here, hot to cool. */
const DISC = 3;
const SHADES = 6;
const LIGHT = ' .:-=+*#%@';
/** The disc's inner and outer edges, in shadow radii. */
const INNER = 1.5;
const OUTER = 4.2;

interface Infall {
  /** Radius and angle in the disc's plane, in shadow radii. */
  r: number;
  a: number;
  age: number;
}

/**
 * A black hole with a glowing disc around it. Its gravity bends the light behind it: stars slide
 * around the shadow's edge, the far side of the disc is lifted into an arch over the top, and a
 * thin ring of light circles the shadow. Inner gas turns faster than outer, and the side coming
 * toward you is brighter. The pointer tips the disc; a click drops a star in, which spirals down
 * and flares as it is torn apart.
 */
export function createBlackHole(options: BlackHoleOptions = {}): AsciiScene {
  const stops = options.colors?.length
    ? options.colors
    : ['#fff7e6', '#ffc46b', '#ff7a2f', '#9c2a1a'];
  const size = clamp(options.size ?? 0.16, 0.05, 0.35);
  const spin = options.spin ?? 1;
  let grid: AsciiGrid = { cols: 0, rows: 0, aspect: 2 };
  let time = 0;
  let tilt = 0.18;
  let tiltTarget = 0.18;
  let lean = 0;
  let leanTarget = 0;
  let flare = 0;
  const infalls: Infall[] = [];
  // Bright and dim rings across the disc, sampled once a frame rather than once a cell.
  const BANDS = 96;
  const bandTable = new Float32Array(BANDS);
  const bandAt = (r: number) =>
    bandTable[
      Math.min(BANDS - 1, Math.max(0, Math.floor(((r - INNER) / (OUTER - INNER)) * BANDS)))
    ]!;

  /** The disc's brightness and heat at a point in its plane, r in shadow radii. */
  function disc(r: number, a: number): [number, number] {
    if (r < INNER || r > OUTER) return [0, 0];
    // Inner gas laps the outer: an orbit's speed falls off as r^-1.5.
    const turn = a - time * spin * 2.6 * Math.pow(r / INNER, -1.5);
    const streak = noise3(Math.cos(turn) * r * 0.9, Math.sin(turn) * r * 0.9, r * 2.2);
    const bands = bandAt(r);
    const edge = smoothstep(INNER, INNER + 0.3, r) * (1 - smoothstep(OUTER - 1.4, OUTER, r));
    // Gas coming toward you (the left, as it turns) is beamed brighter.
    const beam = 0.55 + 0.45 * Math.cos(a + Math.PI / 2 - lean);
    const heat = clamp(1 - (r - INNER) / (OUTER - INNER), 0, 1);
    return [edge * (0.35 + 0.65 * streak) * bands * (0.35 + 0.9 * beam), heat];
  }

  return {
    palette: ['ink', '#fffaf0', '#050507', ...gradient(stops, SHADES)],
    settle: 2,
    lineHeight: 1.15,
    resize(next) {
      grid = next;
      infalls.length = 0;
    },
    step(dt, pointer: AsciiPointer) {
      time += dt;
      if (pointer.active) {
        tiltTarget = 0.05 + clamp(pointer.y / Math.max(1, grid.rows), 0, 1) * 0.5;
        leanTarget = (clamp(pointer.x / Math.max(1, grid.cols), 0, 1) - 0.5) * 0.6;
      } else {
        tiltTarget = 0.18 + Math.sin(time * 0.15) * 0.03;
        leanTarget = 0;
      }
      tilt = approach(tilt, tiltTarget, 1.6, dt);
      lean = approach(lean, leanTarget, 1.6, dt);
      flare = approach(flare, 0, 1.4, dt);
      for (let i = infalls.length - 1; i >= 0; i--) {
        const f = infalls[i]!;
        f.age += dt;
        // Each orbit is quicker and tighter than the last.
        f.a -= dt * spin * 2.6 * Math.pow(Math.max(f.r, 1) / INNER, -1.5) * 1.4;
        f.r -= dt * (0.2 + (OUTER - f.r) * 0.25);
        if (f.r <= 1.05) {
          flare = 1;
          infalls.splice(i, 1);
        }
      }
    },
    press(x, y) {
      const unit = Math.min(grid.cols, grid.rows * grid.aspect) * size;
      const dx = (x - grid.cols / 2) / unit;
      const dy = ((y - grid.rows / 2) * grid.aspect) / unit;
      infalls.push({
        r: clamp(Math.hypot(dx, dy / Math.max(0.2, tilt)), 2, OUTER),
        a: Math.atan2(dy, dx),
        age: 0,
      });
    },
    draw(surface: GlyphSurface) {
      const { cols, rows, aspect } = grid;
      const unit = Math.min(cols, rows * aspect) * size;
      if (unit <= 0) return;
      const cx = cols / 2;
      const cy = rows / 2;
      const cosLean = Math.cos(lean);
      const sinLean = Math.sin(lean);
      // How far light is bent: an image at radius b shows the sky from b - E²/b.
      const E = 1.6;
      for (let k = 0; k < BANDS; k++) {
        bandTable[k] =
          0.55 + 0.45 * noise3((INNER + ((OUTER - INNER) * k) / BANDS) * 3.1, 0.5, time * 0.2);
      }
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          // Screen position in shadow radii, turned by the lean.
          const sx = (col + 0.5 - cx) / unit;
          const sy = ((row + 0.5 - cy) * aspect) / unit;
          const x = sx * cosLean + sy * sinLean;
          const y = -sx * sinLean + sy * cosLean;
          const b = Math.hypot(x, y);
          if (b < 1.02) surface.fill(col, row, VOID, 1);

          // The disc seen directly: its near half passes in front of the shadow.
          const py = y / Math.max(0.04, tilt);
          const r = Math.hypot(x, py);
          const a = Math.atan2(py, x);
          let [glow, heat] = disc(r, a);
          const behind = y < 0 && b < 1.02;
          if (behind) glow = 0;

          // The far half, bent up over the top and down under the bottom of the shadow.
          if (b > 1 && b < 1.9) {
            const lifted = INNER + (b - 1) * ((OUTER - INNER) / 0.9);
            const angle = Math.atan2(y, x);
            const [arch, archHeat] = disc(lifted, angle < 0 ? -angle : angle);
            const fade = (y < 0 ? 1.25 : 0.55) * (1 - smoothstep(1.5, 1.9, b));
            if (arch * fade > glow) {
              glow = arch * fade;
              heat = archHeat;
            }
          }

          if (glow > 0.06) {
            const shade = clamp(Math.floor((1 - heat) * SHADES), 0, SHADES - 1);
            surface.put(col, row, ramp(LIGHT, glow), DISC + shade, clamp(0.35 + glow, 0, 1));
            continue;
          }

          // The thin ring of light that orbits once before escaping.
          const ring = Math.exp(-(((b - 1.08) / 0.05) ** 2));
          if (ring > 0.2) {
            surface.put(col, row, ring > 0.7 ? 'o' : DOT, RING, 0.4 + ring * 0.5 + flare * 0.3);
            continue;
          }
          if (b < 1.02) continue;

          // Stars behind it, pulled round the edge of the shadow.
          const s = b - (E * E) / b;
          const k = s / b;
          const ux = Math.floor(x * k * unit + 4000);
          const uy = Math.floor((y * k * unit) / aspect + 4000);
          const star = hash3(ux, uy, 7);
          if (star > 0.985) {
            const twinkle = 0.5 + 0.5 * Math.sin(time * 2 + star * 300);
            const near = 1 + 1.2 * smoothstep(2.6, 1.2, b);
            surface.put(col, row, star > 0.997 ? '+' : DOT, INK, (0.25 + 0.4 * twinkle) * near);
          }
        }
      }

      // Stars falling in, streaking as they speed up.
      for (const f of infalls) {
        for (let k = 0; k < 6; k++) {
          const a = f.a + k * 0.07;
          const x = Math.cos(a) * f.r;
          const y = Math.sin(a) * f.r * tilt;
          const col = cx + (x * cosLean - y * sinLean) * unit;
          const row = cy + ((x * sinLean + y * cosLean) * unit) / aspect;
          surface.put(col, row, k === 0 ? '*' : DOT, RING, 1 - k / 6);
        }
      }

      if (flare > 0.02) {
        // The flare: a brief bloom around the shadow's edge.
        for (let i = 0; i < 64; i++) {
          const a = (i / 64) * Math.PI * 2;
          const rr = 1.1 + (1 - flare) * 1.6;
          surface.put(
            cx + Math.cos(a) * rr * unit,
            cy + (Math.sin(a) * rr * unit) / aspect,
            '*',
            RING,
            flare,
          );
        }
      }
    },
  };
}
