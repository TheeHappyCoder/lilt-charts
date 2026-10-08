'use client';

import { useReducedMotion } from 'motion/react';
import { useTheme } from 'next-themes';
import { useEffect, useRef } from 'react';

const BAR = 8;
const BAR_GAP = 5;
const CELL = 4;
const CELL_GAP = 3;
/** Seconds for a peak marker to fall the full height, like a meter's peak hold. */
const PEAK_FALL = 2.4;
const POINTER_REACH = 110;
/** When the surge reaches the outermost digit column, and how long a column holds its surge. */
const SURGE_SPREAD = 0.024;
const SURGE_RISE = 0.22;
const SURGE_HOLD = 0.32;
/** How long a digit cell takes to light once its bar has reached it. */
const CELL_FADE = 0.28;

/** 5×7 glyphs, top row first. */
const GLYPHS: Record<string, readonly string[]> = {
  '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  '0': ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
};
const WORD = '404';
const GLYPH_WIDTH = 5;
const GLYPH_HEIGHT = 7;

interface Palette {
  low: string;
  high: string;
  ink: string;
}

function readPalette(element: HTMLElement): Palette {
  const styles = getComputedStyle(element);
  return {
    low: styles.getPropertyValue('--lost-violet').trim() || '#8b6dff',
    high: styles.getPropertyValue('--lost-rose').trim() || '#ee5aa6',
    ink: styles.getPropertyValue('--foreground').trim() || '#ededed',
  };
}

interface Word {
  /** Digit rows per column, counted up from the floor. */
  cells: Map<number, number[]>;
  /** The highest digit row in each column. */
  tops: Map<number, number>;
  center: number;
  reach: number;
}

/** Each glyph pixel spans `sx` bars and `sy` cells: chunky on wide screens, finer on phones. */
function glyphScale(count: number) {
  const sx = count >= 64 ? 2 : 1;
  return { sx, sy: sx === 2 ? 3 : 2 };
}

/** Lays the word out on the meter's grid with its lowest cells on row `floor`. */
function layoutWord(count: number, floor: number): Word {
  const { sx, sy } = glyphScale(count);
  const columns = (WORD.length * (GLYPH_WIDTH + 1) - 1) * sx;
  const first = Math.max(0, Math.floor((count - columns) / 2));
  const cells = new Map<number, number[]>();
  const tops = new Map<number, number>();
  [...WORD].forEach((character, letter) => {
    GLYPHS[character]!.forEach((line, glyphRow) => {
      [...line].forEach((pixel, glyphColumn) => {
        if (pixel !== '#') return;
        for (let dx = 0; dx < sx; dx += 1) {
          const column = first + (letter * (GLYPH_WIDTH + 1) + glyphColumn) * sx + dx;
          if (column >= count) continue;
          const list = cells.get(column) ?? [];
          for (let dy = 0; dy < sy; dy += 1) {
            const row = floor + (GLYPH_HEIGHT - 1 - glyphRow) * sy + dy;
            list.push(row);
            tops.set(column, Math.max(tops.get(column) ?? 0, row));
          }
          cells.set(column, list);
        }
      });
    });
  });
  return { cells, tops, center: first + columns / 2, reach: columns / 2 };
}

/**
 * The 404 page's graphic, behind the whole page: the home skyline's level meter, which surges once
 * on arrival and leaves "404" in held peak cells at the page's centre. Afterwards the bars sway
 * low in the same slow lilt and rise under the pointer. Reduced motion draws the settled meter and the word at once.
 */
export function LostMeter() {
  const canvas = useRef<HTMLCanvasElement>(null);
  /** Set once the arrival has played, so a theme switch or resize never replays it. */
  const arrived = useRef(false);
  const reduced = Boolean(useReducedMotion());
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const element = canvas.current;
    const host = element?.parentElement;
    const context = element?.getContext('2d');
    if (!element || !host || !context) return;

    let palette = readPalette(element);
    let width = 0;
    let height = 0;
    let rows = 0;
    let levels: number[] = [];
    let peaks: number[] = [];
    /** The part of the height the bars sway in, as a share of the whole meter. */
    let zone = 1;
    let word: Word = layoutWord(0, 0);
    /** When each digit cell was reached, keyed `column:row`. */
    const lit = new Map<string, number>();
    let pointer: number | null = null;
    let pull = 0;
    let frame = 0;
    let last = performance.now();
    const start = last;

    const resize = () => {
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      width = element.clientWidth;
      height = element.clientHeight;
      element.width = Math.round(width * ratio);
      element.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      const count = Math.max(1, Math.floor((width + BAR_GAP) / (BAR + BAR_GAP)));
      const pitch = CELL + CELL_GAP;
      rows = Math.max(1, Math.floor((height + CELL_GAP) / pitch));
      zone = Math.min(1, Math.min(340, Math.max(200, height * 0.34)) / height);
      // The word sits on the page's vertical centre, kept clear below the headline and buttons.
      const copy = host.querySelector('.lilt-lost__copy');
      const below = copy
        ? copy.getBoundingClientRect().bottom - element.getBoundingClientRect().top + 40
        : 0;
      const wordHeight = GLYPH_HEIGHT * glyphScale(count).sy * pitch;
      const wordTop = Math.max(below, (height - wordHeight) / 2);
      const floor = Math.max(1, Math.floor((height - wordTop - wordHeight) / pitch));
      const settled = levels.length > 0 || arrived.current;
      word = layoutWord(count, floor);
      levels = Array.from({ length: count }, (_, index) =>
        settled || reduced ? sway(index, count, 0) : 0,
      );
      peaks = [...levels];
      // A resize after the arrival keeps the word lit; only the first layout plays the surge.
      if (settled || reduced) {
        lit.clear();
        for (const [column, list] of word.cells)
          for (const row of list) lit.set(`${column}:${row}`, -Infinity);
      }
    };

    /** The resting sway: lower than the home skyline's, so the word stands clear above it. */
    function sway(index: number, count: number, time: number) {
      const u = count > 1 ? index / (count - 1) : 0.5;
      const swell = 0.16 + 0.12 * Math.sin(u * Math.PI);
      const waves =
        0.09 * Math.sin(u * 8.5 + time * 0.9) +
        0.05 * Math.sin(u * 21 - time * 1.6) +
        0.03 * Math.sin(u * 47 + time * 2.3);
      const x = index * (BAR + BAR_GAP) + BAR / 2;
      const lift = pointer === null ? 0 : Math.exp(-(((x - pointer) / POINTER_REACH) ** 2));
      return zone * Math.min(1, Math.max(0.04, swell + waves + 0.36 * lift * pull));
    }

    /** The arrival: each digit column shoots past its top cell, from the centre outwards. */
    function surgeStart(index: number) {
      return 0.15 + Math.abs(index + 0.5 - word.center) * SURGE_SPREAD;
    }

    /** Where the surge has climbed to, by the clock, so a slow frame never skips the word. */
    function surge(index: number, time: number) {
      const top = word.tops.get(index);
      if (top === undefined || reduced) return 0;
      const progress = (time - surgeStart(index)) / SURGE_RISE;
      if (progress < 0 || progress > SURGE_HOLD / SURGE_RISE) return 0;
      const eased = 1 - (1 - Math.min(1, progress)) ** 3;
      return (eased * (top + 1.5)) / Math.max(1, rows - 1);
    }

    const cell = (x: number, row: number) => {
      context.beginPath();
      context.roundRect(x, height - (row + 1) * (CELL + CELL_GAP) + CELL_GAP, BAR, CELL, 1.5);
      context.fill();
    };

    const draw = (now: number) => {
      const time = reduced ? 0 : (now - start) / 1000;
      if (time > 2.5) arrived.current = true;
      const delta = Math.min(0.05, (now - last) / 1000);
      last = now;
      pull += ((pointer === null ? 0 : 1) - pull) * Math.min(1, delta * 6);

      context.clearRect(0, 0, width, height);
      const count = levels.length;
      for (let index = 0; index < count; index += 1) {
        const goal = sway(index, count, time);
        // A surge sets the bar outright on its way up, then it falls at the meter's own pace.
        const level = reduced
          ? goal
          : Math.max(
              surge(index, time),
              levels[index]! + (goal - levels[index]!) * Math.min(1, delta * 8),
            );
        levels[index] = level;
        const peak = reduced ? level : Math.max(level, peaks[index]! - delta / PEAK_FALL);
        peaks[index] = peak;

        const x = index * (BAR + BAR_GAP);
        const litRows = Math.round(level * (rows - 1));
        const digits = word.cells.get(index);
        // Once a column's climb is over every cell it passed is lit, even if no frame drew it.
        const climbed = arrived.current || time >= surgeStart(index) + SURGE_RISE;
        if (digits)
          for (const row of digits)
            if ((row < litRows || climbed) && !lit.has(`${index}:${row}`))
              lit.set(`${index}:${row}`, time);

        const split = Math.round(litRows * (0.56 + 0.08 * Math.sin(index * 0.7)));
        context.globalAlpha = 0.92;
        for (let row = 0; row < litRows; row += 1) {
          context.fillStyle = row < split ? palette.low : palette.high;
          cell(x, row);
        }
        const peakRow = Math.round(peak * (rows - 1));
        if (peakRow > litRows && !digits?.includes(peakRow)) {
          context.fillStyle = palette.ink;
          context.globalAlpha = 0.45;
          cell(x, peakRow);
        }
        // The held peaks that spell the word sit over whatever the bar is doing beneath them.
        if (digits) {
          context.fillStyle = palette.ink;
          for (const row of digits) {
            const since = lit.get(`${index}:${row}`);
            if (since === undefined) continue;
            context.globalAlpha = 0.9 * Math.min(1, (time - since) / CELL_FADE);
            cell(x, row);
          }
        }
      }
      context.globalAlpha = 1;
      frame = reduced ? 0 : requestAnimationFrame(draw);
    };

    const kick = () => {
      if (!frame) {
        last = performance.now();
        frame = requestAnimationFrame(draw);
      }
    };
    const onMove = (event: PointerEvent) => {
      if (reduced || event.pointerType === 'touch') return;
      pointer = event.clientX - element.getBoundingClientRect().left;
    };
    const onLeave = () => {
      pointer = null;
    };

    const sizeObserver = new ResizeObserver(() => {
      resize();
      if (reduced) draw(performance.now());
      else kick();
    });
    sizeObserver.observe(element);
    const copy = host.querySelector('.lilt-lost__copy');
    if (copy) sizeObserver.observe(copy);
    host.addEventListener('pointermove', onMove);
    host.addEventListener('pointerleave', onLeave);
    // Theme tokens land on the root a frame after the switch.
    const themeFrame = requestAnimationFrame(() => {
      palette = readPalette(element);
      if (reduced) draw(performance.now());
    });

    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(themeFrame);
      sizeObserver.disconnect();
      host.removeEventListener('pointermove', onMove);
      host.removeEventListener('pointerleave', onLeave);
    };
  }, [reduced, resolvedTheme]);

  return <canvas ref={canvas} className="lilt-lost__meter" aria-hidden="true" />;
}
