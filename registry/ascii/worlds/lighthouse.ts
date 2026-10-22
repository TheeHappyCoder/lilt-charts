import { ramp } from '../engine/glyphs';
import { approach, clamp, fbm3, hash3, noise3, smoothstep } from '../engine/noise';
import { DOT, type GlyphSurface } from '../engine/surface';
import type { AsciiGrid, AsciiPointer, AsciiScene } from '../engine/types';

export interface LighthouseOptions {
  /** Colour of the beam. Default a warm white. */
  beam?: string;
  /** Turns of the lamp a minute. Default 6. */
  turns?: number;
  /** How thick the mist is, 0 to 1. The beam only shows where it has something to light. Default 0.5. */
  mist?: number;
  /** Which side the headland stands on. Default 'right'. */
  side?: 'left' | 'right';
}

const INK = 0;
const BEAM = 1;
const STRIPE = 2;
const SEA = 3;
const LIGHT = ' .:-=+*#';

/**
 * A lighthouse on a headland at night. Its beam turns, sweeping out over the sea and back behind
 * the tower, and shows only where there is mist or spray for it to light; facing you, the lamp
 * blooms. Waves roll in and break on the rocks. The keeper follows the pointer with the beam; a
 * click flashes the lamp.
 */
export function createLighthouse(options: LighthouseOptions = {}): AsciiScene {
  const turns = options.turns ?? 6;
  const mist = clamp(options.mist ?? 0.5, 0, 1);
  const right = (options.side ?? 'right') === 'right';
  let grid: AsciiGrid = { cols: 0, rows: 0, aspect: 2 };
  let time = 0;
  let angle = 0;
  let held = 0;
  let aim = 0;
  let flash = 0;
  const spray: { x: number; y: number; vx: number; vy: number; age: number }[] = [];

  const horizon = () => Math.floor(grid.rows * 0.66);
  /** The headland's top edge at a column, or -1 where there is open sea. */
  function rockTop(col: number) {
    const x = right ? grid.cols - col : col;
    const w = grid.cols * 0.3;
    if (x > w) return -1;
    const lift = (1 - x / w) ** 0.6;
    return horizon() - lift * grid.rows * 0.1 + (noise3(col * 0.3, 1, 0) - 0.5) * 1.5;
  }
  const towerX = () => (right ? grid.cols - grid.cols * 0.14 : grid.cols * 0.14);
  const towerBase = () => rockTop(Math.floor(towerX()));
  const towerTall = () => Math.max(6, grid.rows * 0.26);
  const lamp = () => ({ x: towerX(), y: towerBase() - towerTall() - 1 });

  return {
    palette: ['ink', options.beam ?? '#fff1c9', '#e5484d', '#6f9bd6'],
    settle: 3,
    resize(next) {
      grid = next;
      spray.length = 0;
    },
    step(dt, pointer: AsciiPointer) {
      time += dt;
      held = approach(held, pointer.active ? 1 : 0, 2.5, dt);
      flash = approach(flash, 0, 3, dt);
      const turn = (turns / 60) * Math.PI * 2;
      if (pointer.active) {
        const l = lamp();
        // The beam's sideways reach is cos(angle): aim it at the pointer's side and distance.
        const reach = clamp((pointer.x - l.x) / (grid.cols * 0.9), -1, 1);
        aim = Math.acos(reach);
      }
      // Turning freely, or easing round to where the keeper points it.
      angle += turn * dt * (1 - held);
      if (held > 0.01) {
        let d = aim - (angle % (Math.PI * 2));
        if (d > Math.PI) d -= Math.PI * 2;
        if (d < -Math.PI) d += Math.PI * 2;
        angle += d * Math.min(1, dt * 4) * held;
      }
      // Waves break on the rocks and throw spray.
      if (Math.random() < dt * 6) {
        const edge = right ? grid.cols - grid.cols * 0.3 : grid.cols * 0.3;
        const x = edge + (Math.random() - 0.5) * 6;
        spray.push({
          x,
          y: horizon() + 1,
          vx: (right ? -1 : 1) * Math.random() * 4,
          vy: -(6 + Math.random() * 8),
          age: 0,
        });
      }
      for (let i = spray.length - 1; i >= 0; i--) {
        const s = spray[i]!;
        s.age += dt;
        s.vy += 18 * dt;
        s.x += s.vx * dt;
        s.y += (s.vy * dt) / grid.aspect;
        if (s.age > 1.4 || s.y > horizon() + 2) spray.splice(i, 1);
      }
    },
    press() {
      flash = 1;
    },
    draw(surface: GlyphSurface) {
      const { cols, rows, aspect } = grid;
      const h = horizon();
      const l = lamp();
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      // The beam's far end on screen: long when it points sideways, short toward or away from you.
      const reach = cos * cols * 0.95;
      const facing = Math.max(0, -sin);

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const top = rockTop(col);
          if (top >= 0 && row >= top) continue;
          if (row > h) {
            // The sea: rolling swell, brighter where the beam lands on it.
            const swell = fbm3(col * 0.09 - time * 0.4, row * 0.5, time * 0.25, 3);
            const crest = smoothstep(0.55, 0.7, swell);
            const depth = (row - h) / Math.max(1, rows - h);
            if (crest > 0.05)
              surface.put(
                col,
                row,
                crest > 0.6 ? '~' : '-',
                SEA,
                0.15 + crest * 0.35 + depth * 0.15,
              );
          } else if (hash3(col, row, 4) > 0.988) {
            surface.put(col, row, DOT, INK, 0.2 + 0.2 * Math.sin(time + col));
          }

          // The beam: a wedge from the lamp, lit only where mist hangs.
          const dx = col + 0.5 - l.x;
          const dy = (row + 0.5 - l.y) * aspect;
          if (Math.abs(reach) < 1 || Math.sign(dx) !== Math.sign(reach)) continue;
          const along = dx / reach;
          if (along < 0 || along > 1) continue;
          const spread = 0.04 + along * 0.1;
          const off = dy / Math.max(1, Math.abs(reach));
          const across = Math.abs(off + along * 0.06) / spread;
          if (across > 1) continue;
          const haze = mist * fbm3(col * 0.06 - time * 0.3, row * 0.18, time * 0.1, 3) * 1.6;
          const strength =
            (1 - across) ** 1.5 * (1 - along * 0.75) * (0.35 + haze) * (0.6 + 0.4 * Math.abs(cos));
          if (strength > 0.08)
            surface.put(
              col,
              row,
              ramp(LIGHT, clamp(strength, 0, 1)),
              BEAM,
              clamp(strength + flash * 0.4, 0, 1),
            );
        }
      }

      // The headland, then the tower with its red stripes, then the lamp.
      for (let col = 0; col < cols; col++) {
        const top = rockTop(col);
        if (top < 0) continue;
        for (let row = Math.floor(top); row < rows; row++) {
          const n = noise3(col * 0.4, row * 0.6, 2);
          surface.put(
            col,
            row,
            row === Math.floor(top) ? '^' : n > 0.62 ? '#' : n > 0.45 ? ':' : '.',
            INK,
            0.2 + n * 0.2,
          );
        }
      }
      const base = towerBase();
      const tall = towerTall();
      for (let k = 0; k < tall; k++) {
        const row = Math.floor(base - k);
        const half = 1.6 - (k / tall) * 0.7;
        const stripe = Math.floor((k / tall) * 6) % 2 === 1;
        for (let col = Math.round(l.x - half); col <= Math.round(l.x + half); col++) {
          surface.put(col, row, stripe ? '#' : '|', stripe ? STRIPE : INK, stripe ? 0.85 : 0.6);
        }
      }
      surface.put(l.x - 2, l.y + 1, '[', INK, 0.7);
      surface.put(l.x + 2, l.y + 1, ']', INK, 0.7);
      surface.put(l.x - 1, l.y - 1, '/', INK, 0.6);
      surface.put(l.x + 1, l.y - 1, '\\', INK, 0.6);
      surface.put(l.x, l.y - 1, '^', INK, 0.6);
      const bloom = 0.5 + facing * 0.5 + flash * 0.5;
      surface.put(l.x, l.y, '@', BEAM, 1);
      surface.put(l.x - 1, l.y, '=', BEAM, bloom);
      surface.put(l.x + 1, l.y, '=', BEAM, bloom);
      if (facing > 0.6 || flash > 0.2) {
        // Facing you, the lamp blooms into a burst.
        const r = 2 + (facing + flash) * 3;
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * Math.PI * 2;
          surface.put(
            l.x + Math.cos(a) * r,
            l.y + (Math.sin(a) * r) / aspect,
            DOT,
            BEAM,
            (facing + flash) * 0.6,
          );
        }
      }

      for (const s of spray) surface.put(s.x, s.y, DOT, SEA, 0.7 * (1 - s.age / 1.4));
    },
  };
}
