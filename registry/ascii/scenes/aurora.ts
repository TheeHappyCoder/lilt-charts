import { approach, clamp, fbm3, hash3, noise3, smoothstep } from '../engine/noise';
import { DOT, type GlyphSurface } from '../engine/surface';
import type { AsciiGrid, AsciiPointer, AsciiScene } from '../engine/types';

export interface AuroraOptions {
  /** Colours from the curtain's lower edge to its top. Default green through teal to violet. */
  colors?: readonly string[];
  /** Curtains of light hanging across the sky. Default 3. */
  curtains?: number;
  /** Draw the mountains and the lake that mirrors the sky. Default true. */
  landscape?: boolean;
}

// Rays are vertical, so the type is too: faint ticks to solid bars.
const RAYS = ".':;!|";
const INK = 0;

interface Surge {
  x: number;
  age: number;
}

/**
 * The northern lights over a mountain lake. Curtains of light hang from a sharp lower edge and
 * fade upward through their colours, combed into vertical rays that drift and flicker; folds
 * travel along them. The lake below mirrors the sky. The pointer bends the nearest curtain; a
 * click sends a surge of light running along it both ways.
 */
export function createAurora(options: AuroraOptions = {}): AsciiScene {
  const colours = options.colors?.length
    ? options.colors
    : ['#4dffa6', '#2fd6c2', '#5f8cff', '#b06bff'];
  const curtains = clamp(Math.round(options.curtains ?? 3), 1, 6);
  const landscape = options.landscape ?? true;
  let grid: AsciiGrid = { cols: 0, rows: 0, aspect: 2 };
  let time = 0;
  let bendX = 0;
  let bendY = 0;
  let bend = 0;
  const surges: Surge[] = [];
  let ridge = new Float32Array(0);

  /** The horizon row, where the mountains meet the lake. */
  const horizon = () => (landscape ? Math.round(grid.rows * 0.74) : grid.rows);

  function buildRidge() {
    const { cols, rows } = grid;
    ridge = new Float32Array(cols);
    for (let col = 0; col < cols; col++) {
      // Two ranges: a soft far one and sharp near peaks.
      const far = fbm3(col * 0.025, 1.3, 0, 3);
      const near = Math.pow(fbm3(col * 0.045 + 9, 4.1, 0, 4), 1.6);
      ridge[col] = horizon() - rows * (0.05 + 0.26 * Math.max(far * 0.7, near * 1.1) ** 1.3);
    }
  }

  // Everything about a curtain but its height depends only on the column, so it is worked out
  // once per column each frame: where its lower edge hangs, and how bright its rays are there.
  let edges = new Float32Array(0);
  let gains = new Float32Array(0);

  function prepare() {
    const { cols, rows, aspect } = grid;
    const height = rows * aspect;
    if (edges.length !== cols * curtains) {
      edges = new Float32Array(cols * curtains);
      gains = new Float32Array(cols * curtains);
    }
    for (let i = 0; i < curtains; i++) {
      const seed = i * 17.1;
      for (let col = 0; col < cols; col++) {
        const x = col + 0.5;
        const k = i * cols + col;
        // Each curtain hangs over only part of the sky, and the part drifts.
        const present = smoothstep(
          0.28,
          0.5,
          noise3(x * 0.022 + seed + 0.37, time * 0.03 + 0.5, seed + 7.61),
        );
        if (present <= 0) {
          gains[k] = 0;
          continue;
        }
        // The lower edge sways in long folds that travel along the curtain.
        const wave =
          (noise3(x * 0.014 + seed, time * 0.05, seed) - 0.5) * 0.9 +
          Math.sin(x * 0.05 + time * 0.35 + seed) * 0.05;
        let edge = height * (0.4 + (i / Math.max(1, curtains - 1) - 0.5) * 0.16 + wave * 0.45);
        // The pointer lifts the curtain under it like a breath.
        const near = Math.exp(-((x - bendX) ** 2) / (2 * (cols * 0.08) ** 2));
        edge -= bend * near * (edge - bendY) * 0.35;
        // Rays: fine vertical combing that drifts sideways and flickers.
        const comb = noise3(x * 0.42 + seed + bend * near * 3, time * 0.5, seed + 3);
        const rays = 0.08 + 1.25 * Math.pow(comb, 2.5);
        // Brightness rolls along the curtain, and surges run along it.
        let roll = 0.55 + 0.45 * Math.sin(x * 0.06 - time * 0.6 + seed * 2);
        for (const s of surges) {
          const reach = s.age * cols * 0.6;
          const d = Math.min(Math.abs(x - s.x - reach), Math.abs(x - s.x + reach));
          roll += Math.exp(-(d * d) / 60) * (1 - s.age / 2) * 1.4;
        }
        edges[k] = edge;
        gains[k] = 2.2 * rays * roll * present * (0.75 + (0.25 * (curtains - i)) / curtains);
      }
    }
  }

  /** Brightness of the sky at a point, and how far up its curtain it sits (for colour). */
  function light(x: number, y: number): [number, number] {
    const { cols, rows, aspect } = grid;
    const col = clamp(Math.floor(x), 0, cols - 1);
    const height = rows * aspect;
    let best = 0;
    let up = 0;
    for (let i = 0; i < curtains; i++) {
      const k = i * cols + col;
      const gain = gains[k]!;
      if (gain <= 0) continue;
      const h = edges[k]! - y;
      if (h < -2) continue;
      const tall = height * (0.11 + 0.05 * Math.sin(i * 17.1));
      const v = gain * smoothstep(-2, 0.8, h) * Math.exp(-Math.max(0, h) / tall);
      if (v > best) {
        best = v;
        up = clamp(h / (tall * 1.6), 0, 1);
      }
    }
    return [best, up];
  }

  const toneOf = (up: number) => 1 + Math.min(colours.length - 1, Math.floor(up * colours.length));

  return {
    palette: ['ink', ...colours],
    settle: 2,
    resize(next) {
      grid = next;
      buildRidge();
    },
    step(dt, pointer: AsciiPointer) {
      time += dt;
      if (pointer.active) {
        bendX = approach(bendX, pointer.x, 4, dt);
        bendY = approach(bendY, pointer.y * grid.aspect, 4, dt);
      }
      bend = approach(bend, pointer.active ? 1 : 0, 2, dt);
      for (let i = surges.length - 1; i >= 0; i--) {
        surges[i]!.age += dt;
        if (surges[i]!.age > 2) surges.splice(i, 1);
      }
    },
    press(x) {
      surges.push({ x, age: 0 });
    },
    draw(surface: GlyphSurface) {
      const { cols, rows, aspect } = grid;
      const sea = horizon();
      prepare();
      for (let row = 0; row < sea; row++) {
        const y = (row + 0.5) * aspect;
        for (let col = 0; col < cols; col++) {
          if (landscape && row >= ridge[col]!) {
            drawMountain(surface, col, row);
            continue;
          }
          const [v, up] = light(col + 0.5, y);
          if (v > 0.1) {
            const g = RAYS[clamp(Math.floor(v * RAYS.length * 0.9), 0, RAYS.length - 1)]!;
            surface.put(col, row, g, toneOf(up), clamp(0.2 + v * 0.9, 0, 1));
            continue;
          }
          const h = hash3(col, row, 5);
          if (h < 0.03) {
            const twinkle = 0.5 + 0.5 * Math.sin(time * (0.8 + h * 40) + h * 900);
            surface.put(col, row, h < 0.003 ? '+' : DOT, INK, 0.15 + twinkle * 0.35);
          }
        }
      }
      if (!landscape) return;
      // The lake: the sky upside down, broken by slow ripples.
      for (let row = sea; row < rows; row++) {
        const depth = (row - sea + 1) / (rows - sea);
        for (let col = 0; col < cols; col++) {
          const ripple = (noise3(col * 0.08, row * 0.9, time * 0.4) - 0.5) * 3 * (0.5 + depth);
          const mirror = sea - (row - sea) - 1;
          const mx = col + ripple;
          const mc = Math.floor(mx);
          if (mc >= 0 && mc < cols && mirror >= ridge[mc]!) {
            // The mountains' dark reflection: a quiet band.
            if (hash3(col, row, 8) < 0.05) surface.put(col, row, '-', INK, 0.08);
            continue;
          }
          const [v, up] = light(mx, (mirror + 0.5) * aspect);
          if (v > 0.1) {
            surface.put(
              col,
              row,
              v > 0.5 ? '=' : v > 0.25 ? '~' : '-',
              toneOf(up),
              clamp(v * 0.55 * (1 - depth * 0.4), 0, 1),
            );
          } else if (hash3(col, row, 9) < 0.02) {
            surface.put(col, row, '-', INK, 0.08);
          }
        }
      }
    },
  };

  /** A mountain cell: dark rock, a lit edge along the ridge, and snow catching the aurora. */
  function drawMountain(surface: GlyphSurface, col: number, row: number) {
    const top = ridge[col]!;
    const left = ridge[Math.max(0, col - 1)]!;
    const right = ridge[Math.min(grid.cols - 1, col + 1)]!;
    if (row - top < 1) {
      const slope = right - left;
      const g =
        Math.abs(slope) < 0.4 ? (top < left && top < right ? '^' : '_') : slope > 0 ? '\\' : '/';
      // The ridge catches the green of the sky above it.
      const [v] = light(col + 0.5, (top - 1) * grid.aspect);
      surface.put(col, row, g, 1, 0.3 + v * 0.5);
      return;
    }
    if (row - top < 2.5 && hash3(col, row, 4) < 0.35) {
      surface.put(col, row, '.', 1, 0.18);
      return;
    }
    if (hash3(col, row, 6) < 0.12) surface.put(col, row, ':', INK, 0.07);
  }
}
