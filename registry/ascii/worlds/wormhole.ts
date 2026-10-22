import { ramp } from '../engine/glyphs';
import { approach, clamp, hash3, smoothstep } from '../engine/noise';
import type { GlyphSurface } from '../engine/surface';
import type { AsciiGrid, AsciiPointer, AsciiScene } from '../engine/types';
import { gradient } from '../more-scenes/shared';

export interface WormholeOptions {
  /** The tunnel from its mouth to its far end, as hex stops. */
  colors?: readonly string[];
  /** How fast you fly; 1 is a steady cruise. Default 1. */
  speed?: number;
  /** Ribs around the tunnel. Default 12. */
  ribs?: number;
  /** How far it bends toward the pointer, 0 to 1. Default 0.6. */
  steer?: number;
}

const CORE = 0;
const TUNNEL = 1;
const SHADES = 7;
const LIGHT = ' .:-=+*#%';

/**
 * Flying through a tunnel of type that never ends. Rings rush past, ribs run along the walls, and
 * a light burns at the far end. The tunnel bends toward the pointer, so you steer by looking; a
 * click jumps to warp, and the walls smear into streaks before settling back.
 */
export function createWormhole(options: WormholeOptions = {}): AsciiScene {
  const stops = options.colors?.length ? options.colors : ['#7c5cff', '#e5489c', '#ffb36b'];
  const cruise = options.speed ?? 1;
  const ribs = clamp(Math.round(options.ribs ?? 12), 3, 32);
  const steer = clamp(options.steer ?? 0.6, 0, 1);
  let grid: AsciiGrid = { cols: 0, rows: 0, aspect: 2 };
  let depth = 0;
  let twist = 0;
  let warp = 0;
  let aimX = 0;
  let aimY = 0;
  let time = 0;

  return {
    palette: ['#fff8f0', ...gradient(stops, SHADES)],
    settle: 1,
    resize(next) {
      grid = next;
    },
    step(dt, pointer: AsciiPointer) {
      time += dt;
      warp = approach(warp, 0, 0.9, dt);
      const pace = cruise * (1 + warp * 5);
      depth += dt * pace * 1.6;
      twist += dt * 0.12 * (1 + warp * 2);
      // Where the far end sits, as a share of the half-width: the pointer, or a slow drift.
      const tx = pointer.active
        ? (pointer.x / Math.max(1, grid.cols) - 0.5) * 2
        : Math.sin(time * 0.23) * 0.35;
      const ty = pointer.active
        ? (pointer.y / Math.max(1, grid.rows) - 0.5) * 2
        : Math.cos(time * 0.17) * 0.25;
      aimX = approach(aimX, clamp(tx, -1, 1) * steer, 2, dt);
      aimY = approach(aimY, clamp(ty, -1, 1) * steer, 2, dt);
    },
    press() {
      warp = 1;
    },
    draw(surface: GlyphSurface) {
      const { cols, rows, aspect } = grid;
      const half = Math.min(cols, rows * aspect) / 2;
      if (half <= 0) return;
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const sx = (col + 0.5 - cols / 2) / half;
          const sy = ((row + 0.5 - rows / 2) * aspect) / half;
          // Look along a bent tube: the far end shifts toward the aim, the mouth stays put.
          const d0 = Math.hypot(sx, sy);
          const bend = 1 / (1 + d0 * 2.5);
          const x = sx - aimX * bend * 0.9;
          const y = sy - aimY * bend * 0.9 * 0.6;
          const d = Math.hypot(x, y) + 1e-4;
          // Depth along the tube: near the middle is far away.
          const z = 0.35 / d;
          const u = (Math.atan2(y, x) / (Math.PI * 2) + 0.5 + twist) * ribs;
          const v = z + depth;
          // Sharp bands from a cosine raised to a high power, by squaring rather than Math.pow.
          const cv = Math.cos(v * Math.PI);
          const c2 = cv * cv;
          const c8 = c2 * c2 * c2 * c2;
          const ring = warp > 0.05 ? Math.pow(Math.abs(cv), 10 - warp * 7) : c8 * c2;
          const cu = Math.cos(u * Math.PI);
          const u2 = cu * cu;
          const u4 = u2 * u2;
          const rib = u4 * u4 * u4 * u2;
          const fleck = hash3(Math.floor(u * 3), Math.floor(v * 4), 3) > 0.94 ? 0.6 : 0;
          // The walls nearest you blur past too quickly to read, so they fade.
          const fog = smoothstep(0, 0.25, d) * (1 - 0.8 * smoothstep(0.55, 1.5, d));
          let light = (ring * 0.85 + rib * 0.45 + fleck) * fog;
          // Warp smears the rings into streaks along the walls.
          if (warp > 0.05) light = Math.max(light, rib * warp * fog * 1.2);
          const core = 1 - smoothstep(0.02, 0.18, d);
          if (core > 0.05) {
            surface.put(col, row, ramp(LIGHT, core), CORE, clamp(core * 1.2, 0, 1));
            continue;
          }
          if (light < 0.08) continue;
          const far = clamp(1 - (d - 0.1) / 1.4, 0, 1);
          const shade = clamp(Math.floor(far * SHADES), 0, SHADES - 1);
          surface.put(
            col,
            row,
            ramp(LIGHT, clamp(light, 0, 1)),
            TUNNEL + shade,
            clamp(0.25 + light * 0.8, 0, 1),
          );
        }
      }
    },
  };
}
