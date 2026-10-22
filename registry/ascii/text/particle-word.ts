import { ramp, stroke } from '../engine/glyphs';
import { clamp } from '../engine/noise';
import type { GlyphSurface } from '../engine/surface';
import type { AsciiGrid, AsciiPointer, AsciiScene } from '../engine/types';
import { gradient, rasteriseWord } from '../more-scenes/shared';
import { bitmapInk } from './bitmap-font';

export interface ParticleWordOptions {
  /** The word. Default 'lilt'. */
  text?: string;
  /** Gradient stops across the word, left to right. */
  colors?: readonly string[];
  /** Font weight of the word. Default 800. */
  weight?: number;
  /** How far the pointer pushes, in cells. Default 7. */
  reach?: number;
  /** How quickly scattered glyphs pull back home, 0.2 to 3. Default 1. */
  spring?: number;
}

const SHADES = 8;
const SOLID = ' .:-=+*#%@';

/**
 * A word made of glyphs that each know where they belong. The pointer pushes them aside like a hand
 * through sand, and they spring home behind it, streaking as they go; a click bursts the whole word
 * apart, and it pulls itself back together.
 */
export function createParticleWord(options: ParticleWordOptions = {}): AsciiScene {
  const text = options.text ?? 'lilt';
  const stops = options.colors?.length ? options.colors : ['#7c5cff', '#e5489c', '#ffb36b'];
  const weight = options.weight ?? 800;
  const reach = clamp(options.reach ?? 7, 1, 30);
  const spring = clamp(options.spring ?? 1, 0.2, 3);
  let grid: AsciiGrid = { cols: 0, rows: 0, aspect: 2 };
  let homeX = new Float32Array(0);
  let homeY = new Float32Array(0);
  let x = new Float32Array(0);
  let y = new Float32Array(0);
  let vx = new Float32Array(0);
  let vy = new Float32Array(0);
  let ink = new Float32Array(0);
  let count = 0;

  function build() {
    const { cols, rows, aspect } = grid;
    const box = {
      x: cols * 0.08,
      y: rows * aspect * 0.18,
      width: cols * 0.84,
      height: rows * aspect * 0.64,
    };
    let mask = rasteriseWord(text, cols, rows, aspect, box, weight);
    if (!mask) {
      // No canvas to set type with: fall back to the built-in bitmap font.
      mask = bitmapInk(text, cols, rows, 1, () => ({ w: cols * 0.84, h: rows * 0.64 }));
    }
    const cells: number[] = [];
    for (let i = 0; i < mask.length; i++) if (mask[i]! > 0.3) cells.push(i);
    count = cells.length;
    homeX = new Float32Array(count);
    homeY = new Float32Array(count);
    x = new Float32Array(count);
    y = new Float32Array(count);
    vx = new Float32Array(count);
    vy = new Float32Array(count);
    ink = new Float32Array(count);
    cells.forEach((cell, k) => {
      homeX[k] = x[k] = cell % cols;
      homeY[k] = y[k] = Math.floor(cell / cols);
      ink[k] = mask![cell]!;
    });
  }

  return {
    palette: gradient(stops, SHADES),
    settle: 0.5,
    resize(next) {
      grid = next;
      build();
    },
    step(dt, pointer: AsciiPointer) {
      const k = 60 * spring;
      const damping = Math.exp(-dt * 7);
      for (let i = 0; i < count; i++) {
        let ax = (homeX[i]! - x[i]!) * k;
        let ay = (homeY[i]! - y[i]!) * k;
        if (pointer.active) {
          const dx = x[i]! - pointer.x;
          const dy = (y[i]! - pointer.y) * grid.aspect;
          const d = Math.hypot(dx, dy);
          if (d < reach && d > 1e-3) {
            const push = (1 - d / reach) * 900;
            ax += (dx / d) * push;
            ay += ((dy / d) * push) / grid.aspect;
          }
        }
        vx[i] = (vx[i]! + ax * dt) * damping;
        vy[i] = (vy[i]! + ay * dt) * damping;
        x[i]! += vx[i]! * dt;
        y[i]! += vy[i]! * dt;
      }
    },
    press(px, py) {
      for (let i = 0; i < count; i++) {
        const dx = x[i]! - px;
        const dy = (y[i]! - py) * grid.aspect;
        const d = Math.hypot(dx, dy) + 1;
        const kick = 70 + Math.random() * 60;
        vx[i] = (dx / d) * kick + (Math.random() - 0.5) * 30;
        vy[i] = ((dy / d) * kick) / grid.aspect + (Math.random() - 0.5) * 15;
      }
    },
    draw(surface: GlyphSurface) {
      const { cols } = grid;
      for (let i = 0; i < count; i++) {
        // Homes are whole cells: round, so a glyph settling from either side lands on its own.
        const cx = Math.round(x[i]!);
        const cy = Math.round(y[i]!);
        const speed = Math.hypot(vx[i]!, vy[i]! * grid.aspect);
        const shade = clamp(Math.floor((homeX[i]! / Math.max(1, cols)) * SHADES), 0, SHADES - 1);
        if (speed > 6) {
          // On the move, a glyph becomes a streak along its path.
          surface.put(
            cx,
            cy,
            speed > 30 ? stroke(vx[i]!, vy[i]! * grid.aspect) : '.',
            shade,
            clamp(0.5 + speed / 80, 0, 1),
          );
        } else {
          surface.put(cx, cy, ramp(SOLID, ink[i]!), shade, 0.6 + ink[i]! * 0.4);
        }
      }
    },
  };
}
