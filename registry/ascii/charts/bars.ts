import { clamp } from '../engine/noise';
import type { GlyphSurface } from '../engine/surface';
import type { AsciiGrid, AsciiPointer, AsciiScene } from '../engine/types';
import { INSET, compact, easeOut, full, scrambled, text, ticks } from './chart-kit';

export interface BarsOptions {
  /** The values, one bar each, left to right. Without any, the chart shows a demo year. */
  data?: readonly number[];
  /** A label under each bar, also read out on hover. */
  labels?: readonly string[];
  /** Colour of the bars. Default violet. */
  color?: string;
}

const INK = 0;
const BAR = 1;

const DEMO = [42, 51, 47, 63, 58, 71, 76, 69, 82, 88, 79, 94].map((v) => v * 1000);
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * A bar chart drawn in type. Each bar is a column of solid blocks, brightest at its top, that
 * grows from the baseline in turn with its tip scrambling until it lands. Hovering a bar dims the
 * rest and reads out its value above the plot.
 */
export function createBars(options: BarsOptions = {}): AsciiScene {
  const data = options.data?.length ? options.data.map((v) => Math.max(0, v)) : DEMO;
  const labels = options.labels ?? (options.data ? undefined : MONTHS);
  let grid: AsciiGrid = { cols: 0, rows: 0, aspect: 2 };
  let time = 0;
  let pointer: AsciiPointer = { x: 0, y: 0, active: false };
  /** How much the bars not under the pointer have dimmed, 0 → 1. */
  let dim = 0;
  let hovered = -1;

  const n = data.length;
  const hi = Math.max(...data, 1);

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
      dim += ((hovered >= 0 ? 1 : 0) - dim) * Math.min(1, dt * 10);
    },
    draw(surface: GlyphSurface) {
      const { cols, rows } = grid;
      if (cols < 12 || rows < 6) return;
      const steps = ticks(0, hi, rows >= 18 ? 4 : 2);
      const top = steps[steps.length - 1]!;
      const gutter = Math.max(...steps.map((t) => compact(t).length)) + 2;
      const x0 = INSET.x + gutter;
      const width = cols - INSET.x - x0;
      const topRow = INSET.top + 2;
      const base = rows - INSET.bottom - 3;
      const below = rows - INSET.bottom - 2;
      const plot = base - topRow + 1;
      const slot = width / n;
      const bar = Math.max(1, Math.round(slot * 0.62));
      const left = (i: number) => x0 + Math.round(i * slot + (slot - bar) / 2);
      const tick = Math.floor(time * 20);

      // Which bar the pointer is over, once they have all landed.
      const landed = time > 0.1 + (n - 1) * 0.05 + 0.9;
      const over = Math.floor((pointer.x - x0) / slot);
      hovered =
        landed && pointer.active && over >= 0 && over < n && pointer.y > 0 && pointer.y < rows
          ? over
          : -1;

      for (let i = 0; i < n; i++) {
        const grow = easeOut((time - 0.1 - i * 0.05) / 0.9);
        if (grow <= 0) continue;
        // Whole cells only: a part-filled top cell reads as a shadow, not a taller bar.
        const h = Math.round((data[i]! / top) * plot * grow);
        const k = Math.min(plot, h) - 1;
        if (k < 0) continue;
        const fade = i === hovered || hovered < 0 ? 1 : 1 - dim * 0.6;
        for (let c = left(i); c < left(i) + bar; c++) {
          for (let j = 0; j <= k; j++) {
            surface.fill(c, base - j, BAR, (0.45 + 0.5 * (j / Math.max(1, k))) * fade);
          }
          // A growing bar's tip scrambles until it lands.
          if (grow < 1) surface.put(c, base - k, scrambled(c, i, tick), INK, 0.8);
        }
      }

      for (const t of steps) {
        const k = Math.min(plot - 1, Math.floor((t / top) * plot));
        const label = compact(t);
        text(surface, x0 - 2 - label.length, base - k, label, INK, 0.45);
        for (let c = 0; c < width; c += 2) {
          if (!surface.filled(x0 + c, base - k)) surface.put(x0 + c, base - k, '.', INK, 0.18);
        }
      }

      if (labels?.length) {
        // Every label if they fit under their bars, otherwise every few.
        const longest = Math.max(...labels.map((l) => l.length));
        const every = Math.max(1, Math.ceil((longest + 1) / slot));
        for (let i = 0; i < n; i += every) {
          const label = labels[i] ?? '';
          const at = Math.round(left(i) + bar / 2 - label.length / 2);
          text(surface, at, below, label, INK, i === hovered ? 0.9 : 0.45);
        }
      }

      if (hovered < 0) return;
      const name = labels?.[hovered];
      const value = full(data[hovered]!);
      const readout = name ? `${name}  ${value}` : value;
      const centre = left(hovered) + bar / 2;
      const at = clamp(
        Math.round(centre - readout.length / 2),
        x0,
        cols - INSET.x - readout.length,
      );
      if (name) text(surface, at, INSET.top, name, INK, 0.6);
      text(surface, at + readout.length - value.length, INSET.top, value, BAR, 1);
    },
  };
}
