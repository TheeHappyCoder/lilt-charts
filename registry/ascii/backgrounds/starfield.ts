import { stroke } from '../engine/glyphs';
import { approach, clamp, smoothstep } from '../engine/noise';
import { DOT, type GlyphSurface } from '../engine/surface';
import type { AsciiGrid, AsciiPointer, AsciiScene } from '../engine/types';

export interface StarfieldOptions {
  /** Stars in flight at once. Default 200. */
  stars?: number;
  /** Colour of the streaks near stars leave. Default violet. */
  color?: string;
  /** How strongly the stars show: 1 is quiet enough for text on top. Default 1. */
  intensity?: number;
}

const INK = 0;
const TRAIL = 1;
/** Depth a star travels per second at cruising speed; most stars cross the screen in four to eight seconds. */
const CRUISE = 0.17;
/** Nearest a star comes before it passes the viewer. */
const NEAR = 0.04;

interface Star {
  /** Position across the field at depth 1, in units of the half-screen. */
  x: number;
  y: number;
  /** 1 far → 0 at the viewer. */
  z: number;
}

/**
 * Stars streaming toward the viewer in perspective. Far stars are points; as they near they
 * brighten, grow to `+` and `*`, and draw short streaks along their path. The pointer steers the
 * vanishing point; a click jumps to warp, stretching every streak, then eases back to cruise.
 */
export function createStarfield(options: StarfieldOptions = {}): AsciiScene {
  const count = clamp(Math.round(options.stars ?? 200), 10, 2000);
  const intensity = clamp(options.intensity ?? 1, 0, 3);
  let grid: AsciiGrid = { cols: 0, rows: 0, aspect: 2 };
  const stars: Star[] = [];
  let cx = 0;
  let cy = 0;
  let warp = 0;
  let boost = 0;

  function spawn(star: Star, z: number) {
    // Spread a little past the edges, so the corners fill as stars fly outward.
    star.x = (Math.random() * 2 - 1) * 1.15;
    star.y = (Math.random() * 2 - 1) * 1.15;
    star.z = z;
  }

  /** Where a star at a depth falls on screen, in cells. */
  function project(star: Star, z: number): [number, number] {
    const halfW = grid.cols / 2;
    const halfH = grid.rows / 2;
    return [cx + (star.x * halfW) / z, cy + (star.y * halfH) / z];
  }

  return {
    palette: ['ink', options.color ?? '#8b6cff'],
    settle: 2,
    resize(next) {
      const first = grid.cols === 0;
      grid = next;
      cx = grid.cols / 2;
      cy = grid.rows / 2;
      if (first || stars.length !== count) {
        stars.length = 0;
        for (let i = 0; i < count; i++) {
          const star = { x: 0, y: 0, z: 1 };
          spawn(star, NEAR + Math.random() * (1 - NEAR));
          stars.push(star);
        }
      }
    },
    step(dt, pointer: AsciiPointer) {
      // The vanishing point leans halfway toward the pointer, slowly, like a ship turning.
      const tx = grid.cols / 2 + (pointer.active ? (pointer.x - grid.cols / 2) * 0.5 : 0);
      const ty = grid.rows / 2 + (pointer.active ? (pointer.y - grid.rows / 2) * 0.5 : 0);
      cx = approach(cx, tx, 1.6, dt);
      cy = approach(cy, ty, 1.6, dt);
      boost = approach(boost, 0, 1.1, dt);
      warp = 1 + 4.5 * boost * boost;
      const travel = CRUISE * warp * dt;
      for (const star of stars) {
        star.z -= travel * star.z;
        // Depth falls in proportion to itself, so the field moves at an even apparent pace.
        if (star.z < NEAR) spawn(star, 1);
        else {
          const [sx, sy] = project(star, star.z);
          if (sx < -2 || sy < -2 || sx > grid.cols + 2 || sy > grid.rows + 2) spawn(star, 1);
        }
      }
    },
    press() {
      boost = 1;
    },
    draw(surface: GlyphSurface) {
      const { aspect } = grid;
      // Streaks are where a star was a moment ago: longer at warp.
      const memory = 0.4 + 0.15 * boost;
      const back = Math.exp(CRUISE * warp * memory);
      for (const star of stars) {
        const z = star.z;
        const near = 1 - z;
        // Stars fade in from the distance rather than popping into being.
        const born = smoothstep(1, 0.82, z);
        const light = clamp((0.12 + near * near * 0.85) * born * intensity, 0, 1);
        const [sx, sy] = project(star, z);
        const [ox, oy] = project(star, Math.min(1.2, z * back));
        const dx = sx - ox;
        const dy = sy - oy;
        const length = Math.hypot(dx, dy * aspect);
        if (length > 1.2) {
          const glyph = stroke(dx, dy * aspect);
          const steps = Math.min(60, Math.ceil(length));
          for (let k = steps; k >= 1; k--) {
            const t = k / steps;
            surface.put(sx - dx * t, sy - dy * t, glyph, TRAIL, light * (1 - t) * 0.8);
          }
        }
        const glyph = z < 0.1 ? '*' : z < 0.24 ? '+' : DOT;
        surface.put(sx, sy, glyph, INK, light);
      }
    },
  };
}
