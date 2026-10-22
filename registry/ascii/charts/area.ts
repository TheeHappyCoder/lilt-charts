import { clamp } from '../engine/noise';
import type { GlyphSurface } from '../engine/surface';
import type { AsciiGrid, AsciiPointer, AsciiScene } from '../engine/types';
import {
  INSET,
  compact,
  dayLabels,
  demoSeries,
  easeOut,
  full,
  parseDay,
  scrambled,
  text,
  ticks,
} from './chart-kit';

export interface AreaOptions {
  /** The values, left to right. Without any, the chart shows 90 days of demo data. */
  data?: readonly number[];
  /** A label for each value, read out on hover and along the bottom. */
  labels?: readonly string[];
  /** Colour of the line and its fill. Default violet. */
  color?: string;
  /** Fill the area under the line. Default true; false draws the line alone. */
  fill?: boolean;
}

const INK = 0;
const LINE = 1;

/**
 * An area chart drawn in type. The line is a run of strokes that follow its slope, the area
 * beneath is solid blocks that brighten toward the line, and the data scrambles in from the left.
 * Hovering reads out the nearest value above the plot.
 */
export function createArea(options: AreaOptions = {}): AsciiScene {
  const data = options.data?.length ? [...options.data] : demoSeries(90);
  const labels =
    options.labels ?? (options.data ? undefined : dayLabels(data.length, parseDay(undefined)));
  const filled = options.fill ?? true;
  let grid: AsciiGrid = { cols: 0, rows: 0, aspect: 2 };
  let time = 0;
  let pointer: AsciiPointer = { x: 0, y: 0, active: false };

  const n = data.length;
  const lo = Math.min(0, ...data);
  const hi = Math.max(...data, lo + 1);

  return {
    palette: ['ink', options.color ?? '#8b6cff'],
    lineHeight: 1,
    settle: 2.2,
    resize(next) {
      grid = next;
    },
    step(dt, next) {
      time += dt;
      pointer = next;
    },
    draw(surface: GlyphSurface) {
      const { cols, rows } = grid;
      if (cols < 12 || rows < 6) return;
      const steps = ticks(lo, hi, rows >= 18 ? 4 : 2);
      const bottom = steps[0]!;
      const top = steps[steps.length - 1]!;
      const gutter = Math.max(...steps.map((t) => compact(t).length)) + 2;
      const x0 = INSET.x + gutter;
      const width = cols - INSET.x - x0;
      const topRow = INSET.top + 2;
      const base = rows - INSET.bottom - 3;
      const below = rows - INSET.bottom - 2;
      const plot = base - topRow + 1;
      const share = (v: number) => ((v - bottom) / (top - bottom || 1)) * plot;

      // The height of the series at a column, in cells above the bottom of the baseline row.
      const heights = new Float32Array(width);
      for (let c = 0; c < width; c++) {
        const t = n === 1 ? 0 : ((c + 0.5) / width) * (n - 1);
        const i = Math.min(n - 2, Math.floor(t));
        const f = n === 1 ? 0 : t - i;
        const v = n === 1 ? data[0]! : data[i]! + (data[i + 1]! - data[i]!) * f;
        heights[c] = clamp(share(v), 0, plot);
      }
      const level = (c: number) => Math.min(plot - 1, Math.floor(heights[c]!));

      // The wipe: columns appear left to right, scrambling at the front.
      const front = easeOut((time - 0.1) / 1.6) * (width + 4);
      const tick = Math.floor(time * 20);

      for (let c = 0; c < width; c++) {
        const ahead = front - c;
        if (ahead <= 0) continue;
        const col = x0 + c;
        const h = heights[c]!;
        const k = level(c);
        if (ahead < 3) {
          for (let d = 0; d < 3 && k - d >= 0; d++) {
            surface.put(col, base - (k - d), scrambled(col, k - d, tick), LINE, 0.9 - d * 0.25);
          }
          continue;
        }
        if (filled) {
          for (let j = 0; j < k; j++) {
            surface.fill(col, base - j, LINE, 0.06 + 0.34 * Math.pow(j / Math.max(1, h), 1.8));
          }
        }
        // The line: a ridge of solid blocks along the top of the area.
        surface.fill(col, base - k, LINE, 1);
        // Where the line jumps more than a cell, a riser keeps it whole.
        if (c + 1 < width && front - (c + 1) >= 3) {
          const kn = level(c + 1);
          const high = Math.max(k, kn);
          const low = Math.min(k, kn);
          const at = k > kn ? col : col + 1;
          for (let j = low + 1; j < high; j++) surface.fill(at, base - j, LINE, 0.85);
        }
      }

      // The axis: values down the left, faint rules across, labels along the bottom.
      for (const t of steps) {
        const k = Math.min(plot - 1, Math.floor(share(t)));
        const label = compact(t);
        text(surface, x0 - 2 - label.length, base - k, label, INK, 0.45);
        for (let c = 0; c < width; c += 2) {
          if (!surface.filled(x0 + c, base - k)) surface.put(x0 + c, base - k, '.', INK, 0.18);
        }
      }
      if (labels?.length) {
        const first = labels[0] ?? '';
        const last = labels[n - 1] ?? '';
        text(surface, x0, below, first, INK, 0.45);
        text(surface, x0 + width - last.length, below, last, INK, 0.45);
        const mid = labels[Math.floor((n - 1) / 2)] ?? '';
        const midAt = x0 + Math.round(width / 2 - mid.length / 2);
        if (width > first.length + last.length + mid.length + 6) {
          text(surface, midAt, below, mid, INK, 0.45);
        }
      }

      // Hover: a guide down to the nearest value, its point, and a readout above the plot.
      const px = pointer.x - x0;
      if (!pointer.active || front < width || px < -1 || px > width + 1) return;
      if (pointer.y < 0 || pointer.y > rows) return;
      const i = clamp(Math.round((px / width) * (n - 1)), 0, n - 1);
      const c = clamp(Math.floor((n === 1 ? 0.5 : i / (n - 1)) * width), 0, width - 1);
      const col = x0 + c;
      const k = level(c);
      for (let j = k + 1; j < plot; j++) surface.put(col, base - j, ':', INK, 0.35);
      surface.fill(col, base - k, INK, 1);
      const name = labels?.[i];
      const value = full(data[i]!);
      const readout = name ? `${name}  ${value}` : value;
      const at = clamp(col - Math.floor(readout.length / 2), x0, cols - INSET.x - readout.length);
      if (name) text(surface, at, INSET.top, name, INK, 0.6);
      text(surface, at + readout.length - value.length, INSET.top, value, LINE, 1);
    },
  };
}
