import { approach, clamp, hash3 } from '../engine/noise';
import { DOT, type GlyphSurface } from '../engine/surface';
import type { AsciiGrid, AsciiPointer, AsciiScene } from '../engine/types';

export interface HelixOptions {
  /** The two strands' colours. */
  strands?: readonly [string, string] | readonly string[];
  /** How fast it turns; 1 is a slow roll. Default 1. */
  spin?: number;
  /** Turns of the helix across the width. Default 3. */
  turns?: number;
  /** Read the base pairs as letters (A–T, G–C) rather than bars. Default true. */
  letters?: boolean;
}

const INK = 0;
const STRAND_A = 1;
const STRAND_B = 2;
const BASE_A = 3;
const BASE_T = 4;
const BASE_G = 5;
const BASE_C = 6;
const PAIRS: readonly (readonly [string, string, number, number])[] = [
  ['A', 'T', BASE_A, BASE_T],
  ['T', 'A', BASE_T, BASE_A],
  ['G', 'C', BASE_G, BASE_C],
  ['C', 'G', BASE_C, BASE_G],
];

/**
 * A double helix lying across the page, slowly turning. Its two backbones wind round each other,
 * the far side fainter, and the base pairs between them light up as they roll to the front. The
 * pointer unzips it: the strands part where it hovers and zip back as it leaves. A click sends a
 * ripple of light along the molecule.
 */
export function createHelix(options: HelixOptions = {}): AsciiScene {
  const [colorA, colorB] = [options.strands?.[0] ?? '#7c5cff', options.strands?.[1] ?? '#e5489c'];
  const spin = options.spin ?? 1;
  const turns = clamp(options.turns ?? 3, 1, 8);
  const letters = options.letters ?? true;
  let grid: AsciiGrid = { cols: 0, rows: 0, aspect: 2 };
  let phase = 0;
  let time = 0;
  let open = new Float32Array(0);
  let px = -1;
  let hover = 0;
  const ripples: { x: number; age: number }[] = [];
  const motes: { x: number; y: number; speed: number }[] = [];

  return {
    palette: ['ink', colorA, colorB, '#5fd39a', '#ffb547', '#59b8ff', '#ff6b8a'],
    settle: 2,
    resize(next) {
      grid = next;
      open = new Float32Array(grid.cols);
      motes.length = 0;
      for (let i = 0; i < Math.round((grid.cols * grid.rows) / 120); i++) {
        motes.push({
          x: Math.random() * grid.cols,
          y: Math.random() * grid.rows,
          speed: 0.5 + Math.random() * 1.5,
        });
      }
    },
    step(dt, pointer: AsciiPointer) {
      time += dt;
      phase += dt * spin * 0.9;
      hover = approach(hover, pointer.active ? 1 : 0, 4, dt);
      if (pointer.active) px = pointer.x;
      for (let col = 0; col < open.length; col++) {
        // Open near the pointer, and zip shut again behind it.
        const near = pointer.active ? Math.exp(-(((col - px) / 6) ** 2)) : 0;
        open[col] = approach(open[col]!, near, near > open[col]! ? 8 : 2.5, dt);
      }
      for (let i = ripples.length - 1; i >= 0; i--) {
        ripples[i]!.age += dt;
        if (ripples[i]!.age > 3) ripples.splice(i, 1);
      }
      for (const m of motes) {
        m.x -= m.speed * dt;
        if (m.x < 0) m.x += grid.cols;
      }
    },
    press(x) {
      ripples.push({ x, age: 0 });
    },
    draw(surface: GlyphSurface) {
      const { cols, rows } = grid;
      const mid = rows / 2;
      const amp = Math.min(rows * 0.3, cols * 0.08);
      const k = (turns * Math.PI * 2) / Math.max(1, cols);

      for (const m of motes) surface.put(m.x, m.y, DOT, INK, 0.12);

      const glow = (col: number) => {
        let g = 0;
        for (const r of ripples) {
          const front = Math.abs(col - (r.x + (r.age * cols) / 1.5));
          const back = Math.abs(col - (r.x - (r.age * cols) / 1.5));
          g +=
            Math.max(Math.exp(-((front / 3) ** 2)), Math.exp(-((back / 3) ** 2))) * (1 - r.age / 3);
        }
        return clamp(g, 0, 1);
      };

      // Back strand first, then the rungs, then the front strand, so the front reads on top.
      const strand = (col: number, offset: number) => {
        const a = col * k + phase + offset;
        const spread = 1 + open[col]! * 1.4;
        return { y: mid + Math.sin(a) * amp * spread, depth: Math.cos(a) };
      };
      for (const pass of ['back', 'rungs', 'front'] as const) {
        for (let col = 0; col < cols; col++) {
          const a = strand(col, 0);
          const b = strand(col, Math.PI);
          const lit = glow(col);
          if (pass === 'rungs') {
            // A base pair every few columns, between the strands.
            if (col % 3 !== 0 || open[col]! > 0.5) continue;
            const pair = PAIRS[Math.floor(hash3(col, 0, 5) * 4)]!;
            const front = Math.max(0, (a.depth + b.depth + 2) / 4);
            const top = Math.min(a.y, b.y);
            const bottom = Math.max(a.y, b.y);
            const span = bottom - top;
            if (span < 2) continue;
            const facing = 1 - Math.abs(a.depth);
            const alpha = clamp(0.2 + facing * 0.6 + lit, 0, 1);
            const upper = a.y < b.y ? 0 : 1;
            for (let row = Math.ceil(top + 0.5); row < bottom - 0.5; row++) {
              const half = row < top + span / 2 ? upper : 1 - upper;
              const tone = half === 0 ? pair[2] : pair[3];
              const glyph =
                letters && Math.abs(row - (top + span * (half === 0 ? 0.25 : 0.75))) < 0.6
                  ? pair[half]
                  : '|';
              surface.put(col, row, glyph, tone, alpha * (0.6 + front * 0.4));
            }
            continue;
          }
          for (const [s, tone] of [
            [a, STRAND_A],
            [b, STRAND_B],
          ] as const) {
            const isFront = s.depth >= 0;
            if ((pass === 'front') !== isFront) continue;
            const next = strand(col + 1, tone === STRAND_A ? 0 : Math.PI);
            const slope = next.y - s.y;
            const glyph = Math.abs(slope) < 0.3 ? (isFront ? '=' : '-') : slope < 0 ? '/' : '\\';
            const alpha = clamp(
              (isFront ? 0.75 + s.depth * 0.25 : 0.25 + (1 + s.depth) * 0.2) + lit * 0.5,
              0,
              1,
            );
            surface.put(col, s.y, glyph, tone, alpha);
            if (Math.abs(slope) > 1) {
              // Fill steep stretches so the strand never breaks up.
              const from = Math.min(s.y, next.y);
              const to = Math.max(s.y, next.y);
              for (let r = Math.ceil(from); r < to; r++)
                surface.put(col, r, slope < 0 ? '/' : '\\', tone, alpha * 0.9);
            }
          }
        }
      }
      if (hover > 0.05 && px >= 0) {
        // Loose bases drift where it is unzipped.
        for (let col = Math.max(0, Math.floor(px - 8)); col < Math.min(cols, px + 8); col++) {
          if (open[col]! < 0.4 || col % 3 !== 0) continue;
          const pair = PAIRS[Math.floor(hash3(col, 0, 5) * 4)]!;
          const wob = Math.sin(time * 3 + col) * 0.6;
          surface.put(col, mid - 1 + wob, pair[0], pair[2], open[col]! * hover);
          surface.put(col, mid + 1 - wob, pair[1], pair[3], open[col]! * hover);
        }
      }
    },
  };
}
