import { stroke } from '../engine/glyphs';
import { approach, clamp, noise3 } from '../engine/noise';
import { DOT, type GlyphSurface } from '../engine/surface';
import type { AsciiGrid, AsciiPointer, AsciiScene } from '../engine/types';
import { bump } from './shared';

export interface DotGridOptions {
  /** Columns between dots across; rows between them are chosen to keep the grid square. Default 4. */
  spacing?: number;
  /** Colour of the dots the pointer disturbs. Default violet. */
  color?: string;
  /** Radius of the pointer's bulge, in cells. Default 10. */
  reach?: number;
  /** A slow wave of light that breathes across the grid. Default true. */
  breathe?: boolean;
  /** How strongly the grid shows: 1 is quiet enough for text on top, 2 is twice as bright. Default 1. */
  intensity?: number;
}

const INK = 0;
const ACCENT = 1;
/** Spring stiffness and damping: critically damped, so dots settle without wobbling across cells. */
const STIFF = 70;
const DAMP = 2 * Math.sqrt(STIFF);

interface Ring {
  x: number;
  y: number;
  age: number;
}

/**
 * An even grid of small dots: the calm background most pages ship. The pointer pushes a soft
 * bulge through it, so dots near it lean away and light up; a click sends a ring outward.
 * Positions are in square units, a cell width each way.
 */
export function createDotGrid(options: DotGridOptions = {}): AsciiScene {
  const spacing = Math.max(2, Math.round(options.spacing ?? 4));
  const reach = Math.max(2, options.reach ?? 10);
  const breathe = options.breathe ?? true;
  const intensity = clamp(options.intensity ?? 1, 0, 3);
  let grid: AsciiGrid = { cols: 0, rows: 0, aspect: 2 };
  // One entry per dot: rest position, offset, velocity and light.
  let homeX = new Float32Array(0);
  let homeY = new Float32Array(0);
  let offX = new Float32Array(0);
  let offY = new Float32Array(0);
  let velX = new Float32Array(0);
  let velY = new Float32Array(0);
  let light = new Float32Array(0);
  const rings: Ring[] = [];
  let time = 0;
  let px = 0;
  let py = 0;
  let presence = 0;

  return {
    palette: ['ink', options.color ?? '#7c5cff'],
    lineHeight: 1.1,
    settle: 1,
    resize(next) {
      grid = next;
      const { cols, rows, aspect } = grid;
      const rowStep = Math.max(1, Math.round(spacing / aspect));
      // Centre the lattice so the margins match on both sides.
      const col0 = Math.floor(((cols - 1) % spacing) / 2);
      const row0 = Math.floor(((rows - 1) % rowStep) / 2);
      const across = Math.max(0, Math.floor((cols - 1 - col0) / spacing) + 1);
      const down = Math.max(0, Math.floor((rows - 1 - row0) / rowStep) + 1);
      const n = across * down;
      homeX = new Float32Array(n);
      homeY = new Float32Array(n);
      offX = new Float32Array(n);
      offY = new Float32Array(n);
      velX = new Float32Array(n);
      velY = new Float32Array(n);
      light = new Float32Array(n);
      let i = 0;
      for (let r = 0; r < down; r++) {
        for (let c = 0; c < across; c++, i++) {
          homeX[i] = col0 + c * spacing + 0.5;
          homeY[i] = (row0 + r * rowStep + 0.5) * aspect;
        }
      }
    },
    step(dt, pointer: AsciiPointer) {
      time += dt;
      const { aspect } = grid;
      presence = approach(presence, pointer.active ? 1 : 0, pointer.active ? 6 : 3, dt);
      if (pointer.active) {
        // The bulge trails the pointer a little, which reads as weight.
        const tx = pointer.x;
        const ty = pointer.y * aspect;
        if (presence < 0.05) {
          px = tx;
          py = ty;
        }
        px = approach(px, tx, 14, dt);
        py = approach(py, ty, 14, dt);
      }

      for (let i = rings.length - 1; i >= 0; i--) {
        rings[i]!.age += dt;
        if (rings[i]!.age > 2.4) rings.splice(i, 1);
      }

      const push = Math.min(spacing * 0.4, 1.6);
      const far = (reach * 2.2) ** 2;
      for (let i = 0; i < homeX.length; i++) {
        const hx = homeX[i]!;
        const hy = homeY[i]!;
        let tx = 0;
        let ty = 0;
        let lit = 0;
        if (presence > 0.01) {
          const dx = hx - px;
          const dy = hy - py;
          const d2 = dx * dx + dy * dy;
          if (d2 < far) {
            const d = Math.sqrt(d2) || 1;
            // Pushed outward most at the rim of the bulge, not at its heart, like a lens.
            const g = bump(d2, reach) * presence;
            const swell = Math.min(1, d / (reach * 0.5));
            tx = (dx / d) * push * g * swell;
            ty = (dy / d) * push * g * swell;
            lit = g;
          }
        }
        let ax = STIFF * (tx - offX[i]!) - DAMP * velX[i]!;
        let ay = STIFF * (ty - offY[i]!) - DAMP * velY[i]!;
        for (const ring of rings) {
          const radius = ring.age * 34;
          const dx = hx - ring.x;
          const dy = hy - ring.y;
          const d = Math.hypot(dx, dy) || 1;
          const band = 1 - Math.abs(d - radius) / 3.5;
          if (band <= 0) continue;
          const fade = Math.max(0, 1 - ring.age / 2.4) ** 1.5;
          ax += (dx / d) * band * fade * 260;
          ay += (dy / d) * band * fade * 260;
          lit = Math.max(lit, band * fade);
        }
        velX[i]! += ax * dt;
        velY[i]! += ay * dt;
        offX[i]! += velX[i]! * dt;
        offY[i]! += velY[i]! * dt;
        light[i] = Math.max(lit, approach(light[i]!, 0, 3.5, dt));
      }
    },
    press(x, y) {
      rings.push({ x, y: y * grid.aspect, age: 0 });
      if (rings.length > 6) rings.shift();
    },
    draw(surface: GlyphSurface) {
      const { aspect } = grid;
      const base = 0.2 * intensity;
      for (let i = 0; i < homeX.length; i++) {
        const hx = homeX[i]!;
        const hy = homeY[i]!;
        const ox = offX[i]!;
        const oy = offY[i]!;
        // The breath: a slow, wide swell of light that wanders across the grid.
        const wave = breathe
          ? 0.5 +
            0.5 *
              Math.sin(
                time * 0.55 -
                  hx * 0.035 -
                  hy * 0.05 +
                  noise3(hx * 0.02, hy * 0.02, time * 0.05) * 4,
              )
          : 0.5;
        const lit = light[i]!;
        const moved = Math.hypot(ox, oy);
        const col = hx + ox;
        const row = (hy + oy) / aspect;
        const calm = base * (0.55 + 0.45 * wave);
        if (lit < 0.08) {
          surface.put(col, row, DOT, INK, calm);
          continue;
        }
        // Lit dots swell; a dot shoved hard by a ring leans along its push for a moment.
        const glyph =
          moved > 2.4 ? stroke(ox, oy) : lit > 0.5 ? '\u2022' : lit > 0.25 ? '\u00b7' : DOT;
        const opacity = clamp(calm + lit * (0.55 + 0.25 * intensity), 0, 1);
        surface.put(col, row, glyph, lit > 0.2 ? ACCENT : INK, opacity);
      }
    },
  };
}
