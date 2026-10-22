import { clamp } from '../engine/noise';
import { DOT, type GlyphSurface } from '../engine/surface';
import type { AsciiGrid, AsciiScene } from '../engine/types';
import { bitmapInk } from '../text/bitmap-font';

export interface CountdownOptions {
  /** When it reaches zero: a date string or milliseconds since 1970. Default an hour from now. */
  to?: string | number;
  /** Show seconds. Default true. */
  seconds?: boolean;
  /** Label each group (days, hours, minutes, seconds). Default true. */
  labels?: boolean;
  /** Shown at zero, in the same big type. Default 'LIVE'. */
  done?: string;
  /** Colour of the digits. Default the text colour. */
  color?: string;
  /** Colour of a digit as it lands and of the burst at zero. Default violet. */
  accent?: string;
}

const INK = 0;
const ACCENT = 1;
const SCRAMBLE = '0123456789#%&@';

interface Slot {
  /** The digit shown and the one before it. */
  digit: string;
  previous: string;
  /** Seconds since it last changed. */
  age: number;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
}

/** The parts of a time left, as two-digit strings. */
export function remaining(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    days: pad(Math.min(99, Math.floor(total / 86400))),
    hours: pad(Math.floor(total / 3600) % 24),
    minutes: pad(Math.floor(total / 60) % 60),
    seconds: pad(total % 60),
    total,
  };
}

/**
 * A countdown in big type built from glyphs. When a digit changes, the old one falls out of its
 * slot and the new one scrambles in and settles. At zero the digits burst apart and the done text
 * takes their place.
 */
export function createCountdown(options: CountdownOptions = {}): AsciiScene {
  const parsed =
    typeof options.to === 'number' ? options.to : options.to ? Date.parse(options.to) : NaN;
  const target = Number.isFinite(parsed) ? parsed : Date.now() + 3600_000;
  const withSeconds = options.seconds ?? true;
  const labels = options.labels ?? true;
  const doneText = (options.done ?? 'LIVE').toUpperCase();
  let grid: AsciiGrid = { cols: 0, rows: 0, aspect: 2 };
  const groups = withSeconds
    ? ['days', 'hours', 'minutes', 'seconds']
    : ['days', 'hours', 'minutes'];
  const slots: Slot[] = Array.from({ length: groups.length * 2 }, () => ({
    digit: '',
    previous: '',
    age: 9,
  }));
  const masks = new Map<string, Float32Array>();
  let slotW = 0;
  let slotH = 0;
  /** Cells for one unit of the bitmap font, across and down: cells are taller than wide. */
  let uc = 1;
  let ur = 1;
  let left = 0;
  let top = 0;
  let finished = false;
  let finishedAge = 0;
  let doneMask: Float32Array | null = null;
  let sparks: Spark[] = [];
  let time = 0;

  function layout() {
    const { cols, rows, aspect } = grid;
    // Digits in pairs with a gap between groups; each digit five units wide, seven tall.
    const units = groups.length * 2 * 6 + (groups.length - 1) * 3;
    // Fractional units are fine: a cell reads the font at its own scale.
    uc = Math.min((cols * 0.92) / units, ((rows - (labels ? 3 : 1)) / 7) * aspect);
    ur = uc / aspect;
    slotW = Math.round(uc * 5);
    slotH = Math.round(ur * 7);
    left = Math.floor((cols - units * uc) / 2);
    top = Math.floor((rows - slotH - (labels ? 2 : 0)) / 2);
    masks.clear();
    for (const d of '0123456789')
      masks.set(
        d,
        bitmapInk(d, 5, 7, 1, () => ({ w: 5, h: 7 })),
      );
    doneMask = bitmapInk(doneText, doneText.length * 6 - 1, 7, 1, (w, h) => ({ w, h }));
  }

  /** Whether a cell of a slot is inked, reading the 5 by 7 pattern at the slot's scale. */
  const inked = (mask: Float32Array, col: number, row: number) =>
    mask[Math.floor(row / ur) * 5 + Math.floor(col / uc)]! > 0;

  const slotX = (i: number) => {
    const group = Math.floor(i / 2);
    return Math.round(left + (i * 6 + group * 3) * uc);
  };

  return {
    palette: [options.color ?? 'ink', options.accent ?? '#8b6cff'],
    settle: 0.2,
    lineHeight: 1.05,
    resize(next) {
      grid = next;
      layout();
    },
    step(dt) {
      time += dt;
      const left = remaining(target - Date.now());
      const text = groups.map((g) => left[g as keyof typeof left] as string).join('');
      for (let i = 0; i < slots.length; i++) {
        const slot = slots[i]!;
        slot.age += dt;
        const digit = text[i] ?? '0';
        if (digit !== slot.digit) {
          slot.previous = slot.digit;
          slot.digit = digit;
          slot.age = 0;
        }
      }
      if (left.total === 0 && !finished) {
        finished = true;
        finishedAge = 0;
        // Every lit cell of every digit flies apart.
        sparks = [];
        for (let i = 0; i < slots.length; i++) {
          const mask = masks.get(slots[i]!.digit);
          if (!mask) continue;
          for (let k = 0; k < slotW * slotH; k += 2) {
            if (!inked(mask, k % slotW, Math.floor(k / slotW))) continue;
            const x = slotX(i) + (k % slotW);
            const y = top + Math.floor(k / slotW);
            const a = Math.random() * Math.PI * 2;
            const v = 8 + Math.random() * 24;
            sparks.push({ x, y, vx: Math.cos(a) * v * 1.6, vy: Math.sin(a) * v * 0.6 - 6, age: 0 });
          }
        }
      }
      if (finished) finishedAge += dt;
      for (const s of sparks) {
        s.age += dt;
        s.vy += 20 * dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
      }
      sparks = sparks.filter((s) => s.age < 1.8);
    },
    draw(surface: GlyphSurface) {
      if (!slotW) return;
      const { cols } = grid;
      if (finished) {
        for (const s of sparks)
          surface.put(s.x, s.y, s.age < 0.6 ? '*' : DOT, ACCENT, 1 - s.age / 1.8);
        if (doneMask && finishedAge > 0.5) {
          const show = clamp((finishedAge - 0.5) / 0.6, 0, 1);
          const width = doneText.length * 6 - 1;
          const x0 = Math.floor((cols - width * uc) / 2);
          for (let row = 0; row < Math.round(7 * ur); row++) {
            for (let col = 0; col < Math.round(width * uc); col++) {
              if (!(doneMask[Math.floor(row / ur) * width + Math.floor(col / uc)]! > 0)) continue;
              // The word sweeps in from the left.
              if (col / (width * uc) > show * 1.2) continue;
              surface.put(x0 + col, top + row, '#', INK, 0.95);
            }
          }
        }
        return;
      }
      for (let i = 0; i < slots.length; i++) {
        const slot = slots[i]!;
        const x0 = slotX(i);
        const mask = masks.get(slot.digit);
        const old = masks.get(slot.previous);
        const settle = clamp(slot.age / 0.35, 0, 1);
        if (old && slot.age < 0.45) {
          // The old digit drops out of its slot and fades.
          const fall = (slot.age / 0.45) ** 2 * slotH * 0.8;
          for (let k = 0; k < slotW * slotH; k++) {
            if (!inked(old, k % slotW, Math.floor(k / slotW))) continue;
            const y = top + Math.floor(k / slotW) + fall;
            if (y < top + slotH)
              surface.put(x0 + (k % slotW), y, ':', INK, 0.5 * (1 - slot.age / 0.45));
          }
        }
        if (!mask) continue;
        for (let k = 0; k < slotW * slotH; k++) {
          if (!inked(mask, k % slotW, Math.floor(k / slotW))) continue;
          const col = k % slotW;
          const row = Math.floor(k / slotW);
          // Each cell of the new digit lands at its own moment, scrambling until it does.
          const lands = (row / slotH) * 0.6 + ((col * 7) % 5) * 0.04;
          const landed = settle >= lands || slot.age > 0.5;
          const glyph = landed
            ? '#'
            : SCRAMBLE[(col * 3 + row * 5 + Math.floor(time * 30)) % SCRAMBLE.length]!;
          surface.put(
            x0 + col,
            top + row,
            glyph,
            landed && slot.age > 0.5 ? INK : ACCENT,
            landed ? 0.95 : 0.6,
          );
        }
      }
      // Separators between groups, and the labels under them.
      for (let g = 1; g < groups.length; g++) {
        const x = Math.round(slotX(g * 2) - uc * 2);
        const blink = Math.floor(time * 2) % 2 === 0 ? 0.9 : 0.35;
        surface.put(x, top + Math.floor(slotH * 0.3), '#', INK, blink);
        surface.put(x, top + Math.floor(slotH * 0.7), '#', INK, blink);
      }
      if (labels) {
        groups.forEach((g, i) => {
          const name = g.toUpperCase();
          const centre = slotX(i * 2) + slotW + uc / 2;
          const start = Math.round(centre - name.length / 2);
          for (let k = 0; k < name.length; k++)
            surface.put(start + k, top + slotH + 1, name[k]!, INK, 0.45);
        });
      }
    },
  };
}
