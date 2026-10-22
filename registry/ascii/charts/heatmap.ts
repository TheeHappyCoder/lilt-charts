import { hash3 } from '../engine/noise';
import type { GlyphSurface } from '../engine/surface';
import type { AsciiGrid, AsciiPointer, AsciiScene } from '../engine/types';
import {
  INSET,
  addDays,
  dayName,
  easeOut,
  full,
  monthName,
  parseDay,
  scrambled,
  shortDate,
  text,
} from './chart-kit';

export interface HeatmapOptions {
  /** One value a day, oldest first, the last falling on `end`. Without any, a demo year. */
  data?: readonly number[];
  /** The day of the last value, as `YYYY-MM-DD`. Default today. */
  end?: string;
  /** Colour of the busiest days. Default violet. */
  color?: string;
}

const INK = 0;
const HEAT = 1;
/** A glyph per level, sparse to dense, so the busy days read without colour too. */
const LEVELS = ['.', ':', '+', '*', '#'];
const OPACITY = [0.14, 0.45, 0.65, 0.85, 1];

function demo(days: number, first: Date): number[] {
  return Array.from({ length: days }, (_, i) => {
    const day = (first.getDay() + i) % 7;
    const weekday = day !== 0 && day !== 6;
    // Busy spells and quiet ones, weekdays busier than weekends.
    const spell = 0.55 + 0.45 * Math.sin(i / 23) * Math.sin(i / 61 + 1);
    const roll = hash3(i, 3, 1);
    if (roll > spell + (weekday ? 0.35 : 0)) return 0;
    return 1 + Math.round(roll * 6 + spell * 8 * (weekday ? 1 : 0.4));
  });
}

/**
 * A calendar heatmap drawn in type: a column a week, a row a day, each day one glyph whose
 * density and colour both show how busy it was. Weeks scramble in from the left. Hovering a day
 * reads out its date and value beneath the grid.
 */
export function createHeatmap(options: HeatmapOptions = {}): AsciiScene {
  const end = parseDay(options.end);
  const data = options.data?.length ? [...options.data] : demo(365, addDays(end, -364));
  const first = addDays(end, -(data.length - 1));
  // Weeks start on Sunday; the first column holds the first day's week.
  const lead = first.getDay();
  const weeks = Math.ceil((lead + data.length) / 7);
  // Levels split the busy days into quarters; empty days are their own level.
  const busy = data.filter((v) => v > 0).sort((a, b) => a - b);
  const cut = [0.25, 0.5, 0.75].map((q) => busy[Math.floor(q * (busy.length - 1))] ?? 0);
  const levelOf = (v: number) => (v <= 0 ? 0 : 1 + cut.filter((c) => v > c).length);

  let grid: AsciiGrid = { cols: 0, rows: 0, aspect: 2 };
  let time = 0;
  let pointer: AsciiPointer = { x: 0, y: 0, active: false };

  return {
    palette: ['ink', options.color ?? '#8b6cff'],
    lineHeight: 1,
    settle: 2,
    resize(next) {
      grid = next;
    },
    step(dt, next) {
      time += dt;
      pointer = next;
    },
    draw(surface: GlyphSurface) {
      const { cols, rows } = grid;
      if (cols < 16 || rows < 11) return;
      // A day is a glyph with a space after it, so the grid is about square.
      const gutter = INSET.x + 5;
      const room = cols - gutter - INSET.x;
      const shown = Math.min(weeks, Math.floor(room / 2));
      const firstWeek = weeks - shown;
      const x0 = gutter + Math.max(0, Math.floor((room - shown * 2) / 2));
      const y0 = Math.max(2, Math.floor((rows - 11) / 2) + 2);
      const tick = Math.floor(time * 20);

      for (const [row, name] of [
        [1, 'Mon'],
        [3, 'Wed'],
        [5, 'Fri'],
      ] as const) {
        text(surface, x0 - 4, y0 + row, name, INK, 0.4);
      }

      let lastMonth = -1;
      let lastLabelEnd = -Infinity;
      let hovered = -1;
      const pw = Math.floor((pointer.x - x0) / 2);
      const pr = Math.floor(pointer.y - y0);
      for (let w = 0; w < shown; w++) {
        const week = firstWeek + w;
        const col = x0 + w * 2;
        // Weeks arrive left to right, each scrambling for a moment first.
        const arrive = time - 0.1 - (w / shown) * 1.2;
        for (let d = 0; d < 7; d++) {
          const index = week * 7 + d - lead;
          if (index < 0 || index >= data.length) continue;
          const row = y0 + d;
          if (arrive < 0) continue;
          if (arrive < 0.15 + d * 0.02) {
            surface.put(col, row, scrambled(col, row, tick), HEAT, 0.6);
            continue;
          }
          const level = levelOf(data[index]!);
          const on = pointer.active && pw === w && pr === d;
          if (on) {
            hovered = index;
            surface.fill(col, row, HEAT, 1);
            surface.put(col, row, LEVELS[level]!, INK, 1);
            continue;
          }
          const appear = easeOut((arrive - 0.15) / 0.3);
          surface.put(
            col,
            row,
            LEVELS[level]!,
            level ? HEAT : INK,
            OPACITY[level]! * (level ? 1 : 0.7) * appear,
          );
        }
        // A month's name over the first week it starts in, if there is room.
        const date = addDays(first, week * 7 - lead);
        const month = addDays(date, 6).getMonth();
        if (month !== lastMonth) {
          const name = monthName(addDays(date, 6));
          if (col > lastLabelEnd + 1 && col + name.length < cols) {
            text(surface, col, y0 - 1, name, INK, 0.45);
            lastLabelEnd = col + name.length;
          }
          lastMonth = month;
        }
      }

      // Beneath: the hovered day on the left, the key on the right.
      const below = y0 + 8;
      const right = x0 + shown * 2 - 1;
      const key = ['Less ', ...LEVELS.map((g) => `${g} `), 'More'];
      let at = right - key.join('').length;
      text(surface, at, below, 'Less', INK, 0.4);
      at += 5;
      LEVELS.forEach((g, level) => {
        surface.put(at, below, g, level ? HEAT : INK, OPACITY[level]! * (level ? 1 : 0.7));
        at += 2;
      });
      text(surface, at, below, 'More', INK, 0.4);
      if (hovered >= 0) {
        const date = addDays(first, hovered);
        const label = `${dayName(date)} ${shortDate(date)}`;
        text(surface, x0, below, label, INK, 0.6);
        text(surface, x0 + label.length + 2, below, full(data[hovered]!), HEAT, 1);
      }
    },
  };
}
