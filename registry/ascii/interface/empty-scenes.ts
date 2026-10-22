import { stroke } from '../engine/glyphs';
import { clamp, hash3, noise3 } from '../engine/noise';
import { DOT } from '../engine/surface';
import type { AsciiGrid, AsciiPointer, AsciiScene } from '../engine/types';
import { bitmapInk } from '../text/bitmap-font';

export type EmptyVariant = 'no-data' | 'not-found' | 'offline' | 'done';

export interface EmptySceneOptions {
  variant?: EmptyVariant;
  /** The accent: the tumbleweed's dust, the search light, the spark, the tick. */
  accent?: string;
}

const INK = 0;
const ACCENT = 1;

/** No data yet: empty axes, and a tumbleweed rolling through. */
function noData(): Pick<AsciiScene, 'step' | 'draw' | 'press'> & { grid?: AsciiGrid } {
  let time = 0;
  let grid: AsciiGrid = { cols: 0, rows: 0, aspect: 2 };
  let gust = 0;
  return {
    set grid(next: AsciiGrid) {
      grid = next;
    },
    step(dt) {
      time += dt;
      gust = Math.max(0, gust - dt);
    },
    press() {
      gust = 1.5;
    },
    draw(surface) {
      const { cols, rows } = grid;
      const left = Math.floor(cols * 0.12);
      const bottom = rows - 2;
      for (let row = 1; row < bottom; row++) surface.put(left, row, '|', INK, 0.35);
      for (let col = left; col < cols - 2; col++)
        surface.put(col, bottom, col === left ? '+' : '_', INK, 0.35);
      for (let k = 1; k < 4; k++)
        surface.put(left - 1, bottom - k * Math.floor(bottom / 4), '-', INK, 0.3);
      // The tumbleweed crosses every few seconds, bouncing along the axis.
      const lap = 5.5;
      const t = ((time * (1 + gust)) % lap) / lap;
      const x = left + 2 + t * (cols - left - 4);
      const hop = Math.abs(Math.sin(t * Math.PI * 5)) * 2.2;
      const y = bottom - 2 - hop;
      const spin = time * 7;
      for (let a = 0; a < 14; a++) {
        const angle = (a / 14) * Math.PI * 2 + spin;
        const r = 1.2 + (a % 3) * 0.45;
        surface.put(
          x + Math.cos(angle) * r * 1.6,
          y + Math.sin(angle) * r * 0.75,
          '@*%#~'[a % 5]!,
          INK,
          0.75,
        );
      }
      surface.put(x, y, '@', INK, 0.9);
      // A little dust kicked up behind it.
      for (let k = 1; k < 5; k++)
        surface.put(
          x - k * 1.8,
          bottom - 1 - (hop > 1.5 ? 0 : 0.3) - noise3(k, time * 3, 1),
          DOT,
          ACCENT,
          0.5 - k * 0.1,
        );
    },
  };
}

/** 404: the digits in the dark, swept by a search light. */
function notFound(): Pick<AsciiScene, 'step' | 'draw' | 'press'> & { grid?: AsciiGrid } {
  let time = 0;
  let grid: AsciiGrid = { cols: 0, rows: 0, aspect: 2 };
  let ink: Float32Array = new Float32Array(0);
  let px = -1;
  let py = -1;
  let held = 0;
  return {
    set grid(next: AsciiGrid) {
      grid = next;
      ink = bitmapInk('404', next.cols, next.rows, 1, (w, h) => ({ w: w * 0.7, h: h * 0.72 }));
    },
    step(dt, pointer: AsciiPointer) {
      time += dt;
      held = pointer.active ? Math.min(1, held + dt * 3) : Math.max(0, held - dt * 1.5);
      if (pointer.active) {
        px = pointer.x;
        py = pointer.y;
      }
    },
    press() {
      time += 2;
    },
    draw(surface) {
      const { cols, rows, aspect } = grid;
      // The light wanders on its own, or follows the pointer.
      const wx = cols / 2 + Math.sin(time * 0.9) * cols * 0.32;
      const wy = rows / 2 + Math.sin(time * 1.7) * rows * 0.2;
      const lx = held > 0 ? wx + (px - wx) * held : wx;
      const ly = held > 0 ? wy + (py - wy) * held : wy;
      const r = Math.max(4, Math.min(cols, rows * aspect) * 0.28);
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const d = Math.hypot(col - lx, (row - ly) * aspect) / r;
          const lit = clamp(1 - d, 0, 1);
          const on = ink[row * cols + col]! > 0;
          if (on)
            surface.put(
              col,
              row,
              lit > 0.05 ? '#' : ':',
              lit > 0.05 ? ACCENT : INK,
              0.25 + lit * 0.75,
            );
          else if (lit > 0.05 && hash3(col, row, Math.floor(time * 6)) > 0.8)
            surface.put(col, row, DOT, INK, lit * 0.4);
        }
      }
    },
  };
}

/** Offline: a plug that keeps reaching for its socket, and the spark when it nearly makes it. */
function offline(): Pick<AsciiScene, 'step' | 'draw' | 'press'> & { grid?: AsciiGrid } {
  let time = 0;
  let grid: AsciiGrid = { cols: 0, rows: 0, aspect: 2 };
  let jolt = 0;
  return {
    set grid(next: AsciiGrid) {
      grid = next;
    },
    step(dt) {
      time += dt;
      jolt = Math.max(0, jolt - dt * 2);
    },
    press() {
      jolt = 1;
    },
    draw(surface) {
      const { cols, rows } = grid;
      const mid = Math.floor(rows / 2);
      const socket = Math.floor(cols * 0.68);
      // The plug eases toward the socket and pulls back, never quite arriving.
      const reach = (Math.sin(time * 1.4) * 0.5 + 0.5) ** 2;
      const plug = Math.floor(cols * 0.3 + reach * (socket - cols * 0.3 - 5) + jolt * 2);
      for (let col = 0; col < plug - 3; col++) {
        const sag = Math.sin((col / Math.max(1, plug)) * Math.PI) * 1.2;
        const y = mid + sag;
        const next = mid + Math.sin(((col + 1) / Math.max(1, plug)) * Math.PI) * 1.2;
        surface.put(col, y, stroke(1, (next - y) * 2), INK, 0.55);
      }
      for (const [dx, g] of [
        [-3, '['],
        [-2, '#'],
        [-1, '#'],
        [0, ']'],
      ] as const) {
        surface.put(plug + dx, mid, g, INK, 0.85);
      }
      surface.put(plug + 1, mid - 1, '=', INK, 0.8);
      surface.put(plug + 1, mid + 1, '=', INK, 0.8);
      for (let row = mid - 2; row <= mid + 2; row++) surface.put(socket, row, '|', INK, 0.6);
      surface.put(socket + 1, mid - 1, 'o', INK, 0.6);
      surface.put(socket + 1, mid + 1, 'o', INK, 0.6);
      for (let col = socket + 2; col < cols; col++) surface.put(col, mid, '-', INK, 0.25);
      // Close enough, it sparks.
      if (reach > 0.85 || jolt > 0.2) {
        for (let k = 0; k < 6; k++) {
          const a = hash3(k, Math.floor(time * 20), 3) * Math.PI * 2;
          const d = 1 + hash3(k, Math.floor(time * 20), 4) * 2.5;
          surface.put(
            plug + 3 + Math.cos(a) * d,
            mid + Math.sin(a) * d * 0.5,
            k % 2 ? '*' : '+',
            ACCENT,
            0.9,
          );
        }
      }
    },
  };
}

/** Done: a tick that draws itself, a burst of confetti, then a quiet twinkle. */
function done(): Pick<AsciiScene, 'step' | 'draw' | 'press'> & { grid?: AsciiGrid } {
  let time = 0;
  let grid: AsciiGrid = { cols: 0, rows: 0, aspect: 2 };
  let bits: { x: number; y: number; vx: number; vy: number; g: string; age: number }[] = [];
  let burst = false;
  const pop = () => {
    bits = Array.from({ length: 40 }, () => {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4;
      const v = 10 + Math.random() * 16;
      return {
        x: grid.cols / 2,
        y: grid.rows / 2,
        vx: Math.cos(a) * v * 1.6,
        vy: Math.sin(a) * v * 0.6,
        g: '*+o~^'[Math.floor(Math.random() * 5)]!,
        age: 0,
      };
    });
  };
  return {
    set grid(next: AsciiGrid) {
      grid = next;
      time = 0;
      burst = false;
      bits = [];
    },
    step(dt) {
      time += dt;
      if (!burst && time > 0.75) {
        burst = true;
        pop();
      }
      for (const b of bits) {
        b.age += dt;
        b.vy += 18 * dt;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.vx *= 0.98;
      }
      bits = bits.filter((b) => b.age < 2.5 && b.y < grid.rows);
    },
    press() {
      time = 0;
      burst = false;
    },
    draw(surface) {
      const { cols, rows } = grid;
      const cx = cols / 2;
      const cy = rows / 2;
      const size = Math.max(2, Math.min(cols * 0.12, rows * 0.32));
      // Short stroke down to the right, then the long one up.
      const points: [number, number][] = [
        [cx - size * 1.6, cy],
        [cx - size * 0.4, cy + size * 0.55],
        [cx + size * 1.9, cy - size * 0.8],
      ];
      const drawn = clamp(time / 0.7, 0, 1);
      const legs = [
        [points[0]!, points[1]!, 0.35],
        [points[1]!, points[2]!, 0.65],
      ] as const;
      let budget = drawn;
      for (const [a, b, share] of legs) {
        const part = clamp(budget / share, 0, 1);
        budget -= share;
        const steps = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 2);
        for (let s = 0; s <= steps * part; s++) {
          const t = s / steps;
          const x = a[0] + (b[0] - a[0]) * t;
          const y = a[1] + (b[1] - a[1]) * t;
          surface.put(x, y, stroke(b[0] - a[0], (b[1] - a[1]) * 2), ACCENT, 1);
          surface.put(x + 1, y, stroke(b[0] - a[0], (b[1] - a[1]) * 2), ACCENT, 0.6);
        }
      }
      for (const b of bits)
        surface.put(b.x, b.y, b.g, b.age % 0.4 < 0.2 ? ACCENT : INK, 1 - b.age / 2.5);
      if (time > 2) {
        for (let k = 0; k < 6; k++) {
          const phase = time * 1.3 + k * 1.7;
          if (Math.sin(phase) < 0.6) continue;
          const a = (k / 6) * Math.PI * 2;
          surface.put(
            cx + Math.cos(a) * size * 2.6,
            cy + Math.sin(a) * size * 0.9,
            '+',
            ACCENT,
            (Math.sin(phase) - 0.6) * 2.5,
          );
        }
      }
    },
  };
}

const MAKERS = { 'no-data': noData, 'not-found': notFound, offline, done } as const;

/** The small looping picture above an empty state's words. */
export function createEmptyScene(options: EmptySceneOptions = {}): AsciiScene {
  const variant = options.variant && options.variant in MAKERS ? options.variant : 'no-data';
  const scene = MAKERS[variant]();
  return {
    palette: ['ink', options.accent ?? '#8b6cff'],
    settle: variant === 'done' ? 3 : 1,
    lineHeight: 1.2,
    resize(grid) {
      scene.grid = grid;
    },
    step: (dt, pointer) => scene.step(dt, pointer),
    press: (x, y) => scene.press?.(x, y),
    draw: (surface) => scene.draw(surface),
  };
}
