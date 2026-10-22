import { ramp } from '../engine/glyphs';
import { clamp, hash3 } from '../engine/noise';
import type { GlyphSurface } from '../engine/surface';
import type { AsciiGrid, AsciiScene } from '../engine/types';
import { scrambled, text } from '../charts/chart-kit';

export interface ClockOptions {
  /** `clock` shows the local time; `countdown` counts down to `to`. Default `clock`. */
  mode?: 'clock' | 'countdown';
  /**
   * When the countdown ends, as an ISO date or date and time, such as `2027-01-01` or
   * `2027-01-01T09:00`. Default the coming new year.
   */
  to?: string;
  /** Colour of the digits. Default violet. */
  color?: string;
  /** Show seconds. Default true. */
  seconds?: boolean;
}

const INK = 0;
const DIGIT = 1;
const DEEP = 2;

/** A digit's box: one wide, this tall, in its own units. */
const TALL = 1.8;
/** Half the thickness of a segment, and the gap left where two meet. */
const R = 0.12;
const GAP = 0.05;
/** Space between digits in a group, and the room a colon takes, in digit widths. */
const KERN = 0.3;
const COLON = 0.8;

/** The seven segments, as ends of a line in a digit's box: a, b, c, d, e, f, g. */
const SEGMENTS: readonly (readonly [number, number, number, number])[] = (() => {
  const l = R;
  const rt = 1 - R;
  const top = R;
  const mid = TALL / 2;
  const bot = TALL - R;
  const raw: [number, number, number, number][] = [
    [l, top, rt, top],
    [rt, top, rt, mid],
    [rt, mid, rt, bot],
    [l, bot, rt, bot],
    [l, mid, l, bot],
    [l, top, l, mid],
    [l, mid, rt, mid],
  ];
  // Shorten each end so the segments sit apart, the way they do on a display.
  return raw.map(([x0, y0, x1, y1]) => {
    const len = Math.hypot(x1 - x0, y1 - y0);
    const ux = (x1 - x0) / len;
    const uy = (y1 - y0) / len;
    const cut = R + GAP;
    return [x0 + ux * cut, y0 + uy * cut, x1 - ux * cut, y1 - uy * cut] as const;
  });
})();

/** Which segments each digit lights, as bits a to g. */
const DIGITS = [0x3f, 0x06, 0x5b, 0x4f, 0x66, 0x6d, 0x7d, 0x07, 0x7f, 0x6f];

/** Glyphs cut into the lit blocks: none where the light is full, denser as it falls away. */
const CUT = '  .:-=+';
/** How long a digit scrambles when it changes, in seconds. */
const SCRAMBLE = 0.55;

/** Distance from a point to the nearest lit segment of a digit, in digit widths. */
function distance(mask: number, x: number, y: number) {
  let best = Infinity;
  for (let s = 0; s < 7; s++) {
    if (!(mask & (1 << s))) continue;
    const [x0, y0, x1, y1] = SEGMENTS[s]!;
    const sx = x1 - x0;
    const sy = y1 - y0;
    const t = clamp(((x - x0) * sx + (y - y0) * sy) / (sx * sx + sy * sy), 0, 1);
    const d = Math.hypot(x - x0 - sx * t, y - y0 - sy * t);
    if (d < best) best = d;
  }
  return best - R;
}

interface Slot {
  /** The digit showing, and the one it is turning from. */
  digit: number;
  from: number;
  since: number;
}

/** The coming new year at local midnight. */
function nextNewYear(now: Date) {
  return new Date(now.getFullYear() + 1, 0, 1);
}

/** Parses the countdown's end. A date alone means its local midnight. */
export function parseEnd(value: string | undefined, now: Date): Date {
  if (!value) return nextNewYear(now);
  const day = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (day) return new Date(Number(day[1]), Number(day[2]) - 1, Number(day[3]));
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? nextNewYear(now) : parsed;
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/**
 * The readings to show at a moment, as groups of digits with a label under each. A countdown
 * shows days, hours, minutes and seconds left; past its end it holds at zero.
 */
export function clockGroups(
  mode: 'clock' | 'countdown',
  now: Date,
  end: Date,
  seconds: boolean,
): { groups: { digits: string; label: string }[]; done: boolean } {
  if (mode === 'clock') {
    const groups = [
      { digits: pad2(now.getHours()), label: 'HOURS' },
      { digits: pad2(now.getMinutes()), label: 'MINUTES' },
    ];
    if (seconds) groups.push({ digits: pad2(now.getSeconds()), label: 'SECONDS' });
    return { groups, done: false };
  }
  const left = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 1000));
  const groups = [
    { digits: pad2(Math.floor(left / 86400)), label: 'DAYS' },
    { digits: pad2(Math.floor(left / 3600) % 24), label: 'HOURS' },
    { digits: pad2(Math.floor(left / 60) % 60), label: 'MINUTES' },
  ];
  if (seconds) groups.push({ digits: pad2(left % 60), label: 'SECONDS' });
  return { groups, done: left === 0 };
}

/**
 * A clock or countdown in large digits of solid type. Each digit is seven rounded segments of lit
 * blocks with glyphs cut where the light falls away, and soft glyphs along their edges. A digit
 * that changes scrambles briefly into the new one, the colons breathe once a second, and each
 * group carries a small label beneath it.
 */
export function createClock(options: ClockOptions = {}): AsciiScene {
  const mode = options.mode === 'countdown' ? 'countdown' : 'clock';
  const seconds = options.seconds ?? true;
  const end = parseEnd(options.to, new Date());
  let grid: AsciiGrid = { cols: 0, rows: 0, aspect: 2 };
  let time = 0;
  let now = new Date();
  const slots: Slot[] = [];

  return {
    palette: ['ink', options.color ?? '#8b6cff', '#0c0a14'],
    lineHeight: 1,
    settle: 0.8,
    resize(next) {
      grid = next;
    },
    step(dt) {
      time += dt;
      now = new Date();
    },
    draw(surface: GlyphSurface) {
      const { cols, rows, aspect } = grid;
      if (cols < 12 || rows < 5) return;
      const { groups, done } = clockGroups(mode, now, end, seconds);
      const digits = groups.map((g) => g.digits).join('');

      // A slot per digit; a new digit starts its scramble from the old one.
      if (slots.length !== digits.length) {
        slots.length = 0;
        for (const ch of digits) slots.push({ digit: Number(ch), from: -1, since: time });
      }
      for (let i = 0; i < digits.length; i++) {
        const d = Number(digits[i]);
        const slot = slots[i]!;
        if (slot.digit !== d) {
          slot.from = slot.digit;
          slot.digit = d;
          slot.since = time;
        }
      }

      // The largest digit that fits with room around it, in square units (cell widths).
      const units =
        digits.length + (digits.length - groups.length) * KERN + (groups.length - 1) * COLON;
      const labelRows = rows >= 16 ? 3 : 0;
      const room = (rows - 4 - labelRows) * aspect;
      const size = Math.max(2, Math.min((cols - 10) / units, room / TALL));
      const width = units * size;
      const height = TALL * size;
      const x0 = (cols - width) / 2;
      const top = ((rows - labelRows) * aspect - height) / 2;
      const r0 = Math.max(0, Math.floor(top / aspect) - 1);
      const r1 = Math.min(rows - 1, Math.ceil((top + height) / aspect) + 1);
      // A breath once the countdown is over.
      const glow = done ? 0.6 + 0.4 * Math.cos(time * 2.4) : 1;
      // A slow band of light that drifts across the face.
      const sheen = ((time * 0.08) % 1.8) - 0.4;
      const tick = Math.floor(time * 24);

      /** Paints one cell of a shape from its signed distance, in digit widths. */
      const paint = (col: number, row: number, d: number, u: number, v: number, dim: number) => {
        const cover = clamp(0.5 - (d * size) / 1.3, 0, 1);
        if (cover < 0.3) return;
        const band = Math.exp(-Math.pow((u - v * 0.3 - sheen) / 0.1, 2)) * 0.3;
        const light = clamp(0.92 - v * 0.38 + band, 0, 1);
        // The soft edge of a segment is a fainter block, so the outline stays clean.
        const edge = cover < 0.7 ? 0.45 : 1;
        surface.fill(col, row, DIGIT, (0.3 + 0.7 * light) * dim * edge);
        if (edge < 1) return;
        const cut = ramp(CUT, 1 - light);
        if (cut !== ' ') surface.put(col, row, cut, DEEP, 0.5);
      };

      let x = x0;
      let slot = 0;
      groups.forEach((group, g) => {
        if (g > 0) {
          // The colon: two round dots that breathe with the second.
          const frac = now.getMilliseconds() / 1000;
          const beat = done ? glow : 0.3 + 0.7 * Math.pow(Math.cos(frac * Math.PI), 2);
          const cx = x + (COLON * size) / 2;
          const c0 = Math.floor(cx - size);
          const c1 = Math.ceil(cx + size);
          for (let row = r0; row <= r1; row++) {
            for (let col = c0; col <= c1; col++) {
              const px = (col + 0.5 - cx) / size;
              const py = ((row + 0.5) * aspect - top) / size;
              const d = Math.min(Math.hypot(px, py - TALL * 0.3), Math.hypot(px, py - TALL * 0.7));
              paint(col, row, d - R * 1.05, (col - x0) / width, py / TALL, 0.35 + 0.65 * beat);
            }
          }
          x += COLON * size;
        }
        const groupX = x;
        for (let k = 0; k < group.digits.length; k++) {
          const s = slots[slot]!;
          const age = time - s.since;
          const mask = DIGITS[s.digit] ?? 0;
          const was = s.from >= 0 ? (DIGITS[s.from] ?? 0) : 0;
          const scrambling = age < SCRAMBLE;
          const c0 = Math.floor(x) - 1;
          const c1 = Math.ceil(x + size) + 1;
          for (let row = r0; row <= r1; row++) {
            for (let col = c0; col <= c1; col++) {
              const px = (col + 0.5 - x) / size;
              const py = ((row + 0.5) * aspect - top) / size;
              const d = distance(mask, px, py);
              // Only the cells that differ between the old digit and the new one scramble, each
              // landing at its own moment; the segments the two share stay lit.
              if (scrambling && age < SCRAMBLE * (0.2 + 0.8 * hash3(col, row, slot))) {
                const isOn = d * size < 0.4;
                const wasOn = distance(was, px, py) * size < 0.4;
                if (isOn !== wasOn || s.from < 0) {
                  if (isOn || wasOn) {
                    surface.put(col, row, scrambled(col, row, tick), DIGIT, 0.8 * glow);
                  }
                  continue;
                }
              }
              paint(col, row, d, (col - x0) / width, py / TALL, glow);
            }
          }
          x += size * (1 + (k < group.digits.length - 1 ? KERN : 0));
          slot++;
        }
        if (labelRows) {
          const label = done && g === 0 ? 'DONE' : group.label;
          const at = Math.round((groupX + x) / 2 - label.length / 2);
          const row = Math.min(rows - 2, Math.ceil((top + height) / aspect) + 2);
          text(surface, at, row, label, INK, 0.4);
        }
      });
    },
  };
}
