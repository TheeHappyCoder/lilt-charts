import { scrambled, text } from '../charts/chart-kit';
import { ramp } from '../engine/glyphs';
import { clamp, hash3 } from '../engine/noise';
import type { GlyphSurface } from '../engine/surface';
import type { AsciiGrid, AsciiPointer, AsciiScene } from '../engine/types';
import { luma, toHex, type Rgb } from './colour';
import type { MediaFeed } from './feed';
import { chromaOnDark, chromaOnLight, Quantiser } from './palette';
import {
  boxAverage,
  cellPixels,
  levels,
  PAD,
  place,
  shape,
  type CellPixels,
  type MediaFit,
  type Placement,
} from './sample';

/** How a picture is drawn: a density ramp of glyphs, or solid lit blocks with a glyph cut in. */
export type MediaMode = 'glyphs' | 'blocks';
/** Colour from the picture itself, or one ink. */
export type MediaColor = 'source' | 'mono';

/** The backdrop the scene sits on, read every frame: a light one turns the picture to ink on paper. */
export interface Backdrop {
  light: boolean;
}

export interface MediaSceneOptions {
  /** The pixels. Null, or a feed without a picture yet, leaves the frame empty. */
  feed: MediaFeed | null;
  mode?: MediaMode;
  color?: MediaColor;
  /** The ink for `mono`, as any CSS colour. Default the canvas's own ink. */
  tint?: string;
  fit?: MediaFit;
  invert?: boolean;
  /** Above 1 pushes tones apart, below 1 pulls them together. Default 1. */
  contrast?: number;
  /** Colours for `source` on a dark backdrop, and on a light one. */
  palette?: { dark: readonly Rgb[]; light: readonly Rgb[] };
  backdrop?: Backdrop;
  /** Read the feed again whenever it has a new frame, as for video. Default false. */
  live?: boolean;
  /** Scramble the picture in as it first appears. Default true. */
  reveal?: boolean;
  /** Characters the pointer stirs the picture into. */
  scramble?: string;
  /** A short line shown in the middle of the frame instead of a picture, such as an error. */
  message?: string;
  /** Corner marks around the frame while there's no picture, as for a camera that's off. */
  viewfinder?: boolean;
}

const INK = 0;
const TINT = 1;
const CUT_DARK = 2;
const CUT_LIGHT = 3;
const FIRST = 4;

/** Sparse to dense. Each step adds ink without changing the glyph's character much. */
const RAMP = ' .:-=+*#%@';
/** Cut into lit blocks: none where the light falls full, denser into the shadow. */
const CUTS = '.:-=+*';
const EDGE = '.:';
const CODE = '01<>/\\{}[]#$%&*+=?~';

/** How long a cell scrambles before it settles, in seconds. */
const SCRAMBLE_TIME = 0.32;
/** How long the reveal sweep takes to cross the picture. */
const SWEEP = 1.15;

interface Ring {
  x: number;
  y: number;
  age: number;
}

/**
 * A picture drawn in type, from any feed: an image, a video or the camera. It reads the feed at
 * the grid's resolution, averaging every pixel under each cell; spreads its tones so it reads; and
 * draws each cell as a glyph from a density ramp, or as a lit block with a glyph cut in. It
 * scrambles in as it first appears, the pointer stirs it into code, and a click sends a ring of
 * code through it.
 */
export function createMediaScene(options: MediaSceneOptions): AsciiScene {
  const { feed } = options;
  const mode = options.mode ?? 'glyphs';
  const colour = options.color ?? 'source';
  const fit = options.fit ?? 'contain';
  const invert = options.invert ?? false;
  const contrast = clamp(options.contrast ?? 1, 0.25, 4);
  const backdrop = options.backdrop ?? { light: false };
  const live = options.live ?? false;
  const reveal = options.reveal ?? true;
  const code = options.scramble || CODE;
  const dark = options.palette?.dark ?? [];
  const light = options.palette?.light ?? [];
  const quantiseDark = new Quantiser(dark.length ? dark : [[1, 1, 1]]);
  const quantiseLight = new Quantiser(light.length ? light : [[0, 0, 0]]);

  let grid: AsciiGrid = { cols: 0, rows: 0, aspect: 2 };
  let time = 0;
  let placement: Placement | null = null;
  let pixels: CellPixels = cellPixels(0, 0);
  /** The shaped value of each cell of the picture, and its palette colour. */
  let value = new Float32Array(0);
  let raw = new Float32Array(0);
  let tone = new Uint8Array(0);
  let stir = new Float32Array(0);
  let sampledFrame = -1;
  let sampledLight = false;
  let revealFrom = -1;
  let lo = 0;
  let hi = 1;
  let lastX = -1;
  let lastY = -1;
  const rings: Ring[] = [];
  const chroma: Rgb = [0, 0, 0];

  function sample() {
    if (!feed || feed.width < 1 || feed.height < 1 || grid.cols < 1) return;
    const pl = place(feed.width, feed.height, grid, fit);
    // A still picture is read once, finely; video every frame, so more cheaply.
    const factor = live ? 2 : 4;
    const data = feed.read(pl.sx, pl.sy, pl.sw, pl.sh, pl.cols * factor, pl.rows * factor);
    if (!data) return;
    if (pixels.cols !== pl.cols || pixels.rows !== pl.rows) {
      pixels = cellPixels(pl.cols, pl.rows);
      value = new Float32Array(pl.cols * pl.rows);
      raw = new Float32Array(pl.cols * pl.rows);
      tone = new Uint8Array(pl.cols * pl.rows);
    }
    boxAverage(data, pl.cols * factor, pl.rows * factor, factor, pixels);
    const onLight = backdrop.light;
    // On a dark page bright parts get the dense glyphs; on paper, dark parts do, as in a print.
    const darkness = onLight !== invert;
    const size = pl.cols * pl.rows;
    for (let i = 0; i < size; i++) {
      const r = pixels.r[i]!;
      const g = pixels.g[i]!;
      const b = pixels.b[i]!;
      const y = luma(r, g, b);
      raw[i] = darkness
        ? 1 - (0.6 * y + 0.4 * Math.min(r, g, b))
        : 0.6 * y + 0.4 * Math.max(r, g, b);
      if (colour !== 'source') {
        tone[i] = TINT;
      } else if (onLight) {
        chromaOnLight(r, g, b, chroma);
        tone[i] = FIRST + dark.length + quantiseLight.index(chroma[0], chroma[1], chroma[2]);
      } else {
        chromaOnDark(r, g, b, chroma);
        tone[i] = FIRST + quantiseDark.index(chroma[0], chroma[1], chroma[2]);
      }
    }
    const [l, h] = levels(raw, pixels.a);
    // Video eases its levels so the picture doesn't pump as the view changes.
    const ease = live && placement ? 0.12 : 1;
    // Ink on paper is heavier than light on night: ease the mid-tones so only the deepest go dense.
    const gamma = darkness && mode === 'glyphs' ? 1.35 : 0.9;
    lo += (l - lo) * ease;
    hi += (h - hi) * ease;
    for (let i = 0; i < size; i++) {
      value[i] = shape(raw[i]!, lo, hi, contrast, gamma) * pixels.a[i]!;
    }
    placement = pl;
    sampledFrame = feed.frame;
    sampledLight = onLight;
    // A still picture is there from the start, so the reveal runs on the scene's own clock (and a
    // reduced-motion still, drawn after it settles, shows it whole). Video reveals on its first frame.
    if (revealFrom < 0) revealFrom = live ? time : 0;
  }

  /** Raises the stir around a point, in square units. */
  function stamp(px: number, py: number, radius: number, amount: number) {
    const { cols, rows, aspect } = grid;
    const r0 = Math.max(0, Math.floor((py - radius) / aspect));
    const r1 = Math.min(rows - 1, Math.ceil((py + radius) / aspect));
    const c0 = Math.max(0, Math.floor(px - radius));
    const c1 = Math.min(cols - 1, Math.ceil(px + radius));
    for (let row = r0; row <= r1; row++) {
      for (let col = c0; col <= c1; col++) {
        const ox = col + 0.5 - px;
        const oy = (row + 0.5) * aspect - py;
        const d = Math.sqrt(ox * ox + oy * oy);
        if (d > radius) continue;
        const i = row * cols + col;
        // Strong in the middle of its reach, fading to nothing at the edge.
        const fall = 1 - d / radius;
        stir[i] = Math.min(1, stir[i]! + amount * fall * fall);
      }
    }
  }

  function drawFrameMarks(surface: GlyphSurface) {
    const { cols, rows } = grid;
    const x0 = PAD.x;
    const x1 = cols - PAD.x - 1;
    const y0 = PAD.y;
    const y1 = rows - PAD.y - 1;
    if (x1 - x0 < 8 || y1 - y0 < 4) return;
    const arm = Math.max(2, Math.min(6, Math.floor((x1 - x0) / 10)));
    const down = Math.max(1, Math.min(3, Math.floor((y1 - y0) / 8)));
    const corners: [number, number, number, number][] = [
      [x0, y0, 1, 1],
      [x1, y0, -1, 1],
      [x0, y1, 1, -1],
      [x1, y1, -1, -1],
    ];
    for (const [x, y, sx, sy] of corners) {
      surface.put(x, y, '+', INK, 0.5);
      for (let k = 1; k <= arm; k++) surface.put(x + k * sx, y, '-', INK, 0.4 - k * 0.03);
      for (let k = 1; k <= down; k++) surface.put(x, y + k * sy, '|', INK, 0.4 - k * 0.06);
    }
  }

  function drawMessage(surface: GlyphSurface, message: string) {
    const { cols, rows } = grid;
    const width = Math.max(10, cols - PAD.x * 2 - 4);
    const lines: string[] = [];
    let line = '';
    for (const word of message.split(/\s+/)) {
      if (line && line.length + 1 + word.length > width) {
        lines.push(line);
        line = word;
      } else line = line ? `${line} ${word}` : word;
    }
    if (line) lines.push(line);
    const top = Math.floor(rows / 2 - lines.length / 2);
    lines.forEach((l, k) => text(surface, Math.floor((cols - l.length) / 2), top + k, l, INK, 0.7));
  }

  return {
    palette: [
      'ink',
      options.tint || 'ink',
      '#08080c',
      '#f7f5f0',
      ...dark.map(toHex),
      ...light.map(toHex),
    ],
    lineHeight: 1,
    settle: reveal ? SWEEP + SCRAMBLE_TIME + 0.6 : 0.2,
    resize(next) {
      grid = next;
      stir = new Float32Array(grid.cols * grid.rows);
      placement = null;
    },
    step(dt, pointer: AsciiPointer) {
      time += dt;
      const decay = Math.exp(-dt * 1.6);
      for (let i = 0; i < stir.length; i++) stir[i]! *= decay;
      if (pointer.active && grid.cols) {
        const px = pointer.x;
        const py = pointer.y * grid.aspect;
        // Stir along the whole path, so a quick stroke leaves an unbroken wake.
        const moved = lastX < 0 ? 0 : Math.hypot(px - lastX, py - lastY);
        const steps = Math.min(12, Math.ceil(moved / 1.5));
        const reach = Math.max(3, Math.min(grid.cols, grid.rows * grid.aspect) * 0.07);
        for (let s = 0; s <= steps; s++) {
          const t = steps ? s / steps : 1;
          const x = lastX < 0 ? px : lastX + (px - lastX) * t;
          const y = lastY < 0 ? py : lastY + (py - lastY) * t;
          stamp(x, y, reach, steps ? 0.3 / Math.sqrt(steps) : 0.08);
        }
        lastX = px;
        lastY = py;
      } else {
        lastX = -1;
      }
      for (let k = rings.length - 1; k >= 0; k--) {
        rings[k]!.age += dt;
        if (rings[k]!.age > 3) rings.splice(k, 1);
      }
    },
    press(x, y) {
      rings.push({ x, y: y * grid.aspect, age: 0 });
    },
    draw(surface: GlyphSurface) {
      const { cols, rows, aspect } = grid;
      if (cols < 4 || rows < 2) return;
      if (options.message) {
        drawMessage(surface, options.message);
        return;
      }
      if (
        feed &&
        (!placement || sampledLight !== backdrop.light || (live && feed.frame !== sampledFrame))
      ) {
        sample();
      }
      const pl = placement;
      if (!pl) {
        if (options.viewfinder) drawFrameMarks(surface);
        return;
      }
      const since = reveal ? time - revealFrom : Infinity;
      const tick = Math.floor(time * 18);
      const stirTick = Math.floor(time * 12);
      const blocks = mode === 'blocks';
      const cut = backdrop.light ? CUT_LIGHT : CUT_DARK;

      for (let r = 0; r < pl.rows; r++) {
        const row = pl.row + r;
        if (row < 0 || row >= rows) continue;
        for (let c = 0; c < pl.cols; c++) {
          const col = pl.col + c;
          if (col < 0 || col >= cols) continue;
          const i = r * pl.cols + c;
          const v = value[i]!;
          const alpha = pixels.a[i]!;
          // Glyphs leave the darkest parts empty; blocks keep every opaque cell, however dim.
          if (blocks ? alpha < 0.1 : v < 0.05) continue;
          const t = tone[i]!;

          // The reveal sweeps from the top left, each cell scrambling a moment before it lands.
          const jitter = hash3(col, row, 5);
          const at = ((c / pl.cols) * 0.75 + (r / pl.rows) * 0.25) * SWEEP + jitter * 0.25;
          if (since < at) continue;
          const revealing = since < at + SCRAMBLE_TIME;
          let ringed = false;
          if (!revealing && rings.length) {
            const x = col + 0.5;
            const y = (row + 0.5) * aspect;
            for (const ring of rings) {
              const d = Math.sqrt((x - ring.x) ** 2 + (y - ring.y) ** 2);
              const band = 2.2 + ring.age * 2;
              if (Math.abs(d - ring.age * 42) < band * (0.6 + 0.4 * jitter)) ringed = true;
            }
          }
          const s = stir[row * cols + col]!;
          const stirred = s > 0.06 && s > jitter * 0.7;

          if (revealing || ((ringed || stirred) && !(blocks && alpha >= 0.5))) {
            // Arriving, or stirred: the cell is code for a moment.
            const g = revealing
              ? scrambled(col, row, tick)
              : code[Math.floor(hash3(col, row, ringed ? tick : stirTick) * code.length)]!;
            surface.put(col, row, g, t, clamp(0.4 + v * 0.55 + (stirred ? s * 0.3 : 0), 0, 1));
            continue;
          }
          if (ringed || stirred) {
            // On blocks the mosaic holds, and the code is cut into it: dark into bright blocks,
            // bright into dim ones.
            const g = code[Math.floor(hash3(col, row, ringed ? tick : stirTick) * code.length)]!;
            surface.fill(col, row, t, Math.max(0.13, v * 0.85));
            if (v > 0.55) surface.put(col, row, g, cut, 0.75);
            else surface.put(col, row, g, t, 1);
            continue;
          }

          if (!blocks) {
            const g = ramp(RAMP, v);
            if (g !== ' ') surface.put(col, row, g, t, 0.3 + 0.7 * v);
            continue;
          }
          if (alpha < 0.5) {
            // The soft edge of a cut-out picture: a fine grain rather than a ragged block.
            surface.put(col, row, ramp(EDGE, alpha * 2), t, 0.3 + v);
            continue;
          }
          // Dark parts stay dim blocks, so the picture reads as one mosaic to its edges.
          surface.fill(col, row, t, Math.max(0.13, v));
          if (v < 0.86) surface.put(col, row, ramp(CUTS, (0.86 - v) / 0.66), cut, 0.3 + 0.35 * v);
        }
      }
    },
  };
}
