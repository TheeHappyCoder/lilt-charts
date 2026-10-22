import { ramp } from '../engine/glyphs';
import { clamp, hash3 } from '../engine/noise';
import type { GlyphSurface } from '../engine/surface';
import type { AsciiGrid, AsciiPointer, AsciiScene } from '../engine/types';
import { bitmapInk } from './bitmap-font';
import { createCampfire, FIRE_COLORS } from './campfire';

export interface LogoOptions {
  /** The word, set in type. Default 'lilt'. */
  text?: string;
  /** Gradient stops as hex colours, left to right. Default violet to rose. */
  colors?: readonly string[];
  /** Font weight of the lettering, 100 to 900. Default 800. */
  weight?: number;
  /** CSS font family for the lettering. Default the system's sans serif. */
  font?: string;
  /**
   * How hard it snows, 0 to 2. Snow drifts down, settles in caps on the letters, melts from the
   * pointer, and falls off any letter that is knocked loose. Default 0.
   */
  snow?: number;
  /** Colour of the snow. Default a cool white. */
  snowColor?: string;
  /**
   * Share of the height kept clear below the word, 0 to 0.7, for content laid over the lower part.
   * The snow still falls the full height. Default 0.
   */
  clearBelow?: number;
  /**
   * Campfires on the ground (at `FIRE_GROUND` of the height), each a share of the width from 0 to
   * 1, such as `[0.2, 0.8]`. Their flames reach toward a hand held near, snow that drifts in
   * hisses into steam, and a click on a fire stokes it. Pair with `CursorWarmth` for a pointer
   * that frosts over in the cold and thaws by the fire. Default none.
   */
  fires?: readonly number[];
}

export const DEFAULT_LOGO_COLORS: readonly string[] = ['#7c5cff', '#e5489c'];
const SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

/** Hues along the gradient, and shades of each from shadow to highlight. */
const HUES = 8;
const SHADES = 7;
const DEEP = HUES * SHADES;
const INK = DEEP + 1;
const SNOW = DEEP + 2;
const FIRE = DEEP + 3;
/**
 * Where the fires stand, as a share of the height from the top: the row they burn on. A page that
 * marks its fires for CursorWarmth can place the marks from this.
 */
export const FIRE_GROUND = 0.9;
/** Seconds a puff of steam lasts after snow falls into a fire. */
const STEAM_LIFE = 0.9;

interface Steam {
  x: number;
  y: number;
  age: number;
}

/** Glyphs cut into the faces: clean where the light falls, denser in shadow. */
const ENGRAVE = '.:-=';
const EDGE = '.:';
const SCRAMBLE = '01<>/\\{}[]#$%&*+=?~';
/** Light from the upper left, toward the viewer: x, y (down), z. */
const LIGHT = [-0.5, -0.6, 0.62].map((v, _, a) => v / Math.hypot(...a));

/** Seconds the lettering takes to build in from the left. */
const ENTRANCE = 1.3;
/** A sheen crosses the word every this many seconds. */
const SHEEN_EVERY = 6.5;
const SHEEN_FIRST = 2.4;
const SHEEN_SWEEP = 1.5;

/** The spring that brings loose cells home, and the gravity they fall under while loose. */
const SPRING = 38;
const DAMPING = 7.5;
const GRAVITY = 70;
const REACH = 5.5;
const RING_SPEED = 55;

interface Ring {
  x: number;
  y: number;
  age: number;
}

function parseHex(value: string): [number, number, number] | null {
  const m = value.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return null;
  let hex = m[1]!;
  if (hex.length === 3) hex = hex.replace(/./g, (c) => c + c);
  const n = parseInt(hex, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const toHex = (rgb: number[]) =>
  '#' + rgb.map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');

const mixRgb = (a: number[], b: number[], t: number) => a.map((v, i) => v + (b[i]! - v) * t);

/** The palette: each hue along the gradient in shades, then the engraving dark and the ink. */
function buildPalette(colors: readonly string[]) {
  const stops = colors.map(parseHex).filter((c): c is [number, number, number] => !!c);
  const use = stops.length ? stops : DEFAULT_LOGO_COLORS.map((c) => parseHex(c)!);
  const out: string[] = [];
  for (let h = 0; h < HUES; h++) {
    const at = (h / (HUES - 1)) * (use.length - 1);
    const k = Math.min(use.length - 2, Math.floor(at));
    const base = use.length === 1 ? use[0]! : mixRgb(use[k]!, use[k + 1]!, at - k);
    for (let s = 0; s < SHADES; s++) {
      const v = s / (SHADES - 1);
      // Shadows fall toward a deep violet-black; highlights lift toward white.
      out.push(
        toHex(
          v < 0.55
            ? mixRgb(base, [18, 12, 30], ((0.55 - v) / 0.55) * 0.5)
            : mixRgb(base, [255, 255, 255], ((v - 0.55) / 0.45) * 0.5),
        ),
      );
    }
  }
  out.push('#0c0a14', 'ink');
  return out;
}

/** Samples of ink per square unit when the lettering is drawn. */
const P = 4;

/**
 * The lettering as a field of ink, drawn with the browser's own type on a canvas at `P` samples a
 * square unit. Null where there is no canvas to draw on, such as on a server or in a test.
 */
function rasterise(
  text: string,
  width: number,
  height: number,
  font: string,
  weight: number,
): Float32Array | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  let ctx: CanvasRenderingContext2D | null = null;
  try {
    ctx = canvas.getContext('2d', { willReadFrequently: true });
  } catch {
    return null;
  }
  if (!ctx) return null;
  canvas.width = Math.ceil(width * P);
  canvas.height = Math.ceil(height * P);
  const box = fitBox(width, height);

  ctx.font = `${weight} 100px ${font}`;
  // A little air between letters, so each stays its own slab on a coarse grid.
  const spaced = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
  const spacing = 'letterSpacing' in ctx;
  if (spacing) spaced.letterSpacing = '6px';
  const m = ctx.measureText(text);
  const w = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
  const h = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
  if (!(w > 0 && h > 0)) return null;
  const scale = Math.min((box.w * P) / w, (box.h * P) / h);
  ctx.font = `${weight} ${100 * scale}px ${font}`;
  if (spacing) spaced.letterSpacing = `${6 * scale}px`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#fff';
  const x = canvas.width / 2 - ((m.actualBoundingBoxRight - m.actualBoundingBoxLeft) * scale) / 2;
  const y =
    canvas.height / 2 + ((m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) * scale) / 2;
  ctx.fillText(text, x, y);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const ink = new Float32Array(canvas.width * canvas.height);
  for (let i = 0; i < ink.length; i++) ink[i] = data[i * 4 + 3]! / 255;
  return ink;
}

/** A box blur of radius `r` along each row, or down each column, in place. */
function boxBlur(field: Float32Array, w: number, h: number, r: number, vertical: boolean) {
  const lines = vertical ? w : h;
  const len = vertical ? h : w;
  const stride = vertical ? w : 1;
  const jump = vertical ? 1 : w;
  const line = new Float32Array(len);
  for (let l = 0; l < lines; l++) {
    const base = l * jump;
    for (let k = 0; k < len; k++) line[k] = field[base + k * stride]!;
    let sum = 0;
    for (let k = -r; k <= r; k++) sum += line[clamp(k, 0, len - 1)]!;
    for (let k = 0; k < len; k++) {
      field[base + k * stride] = sum / (2 * r + 1);
      sum += line[Math.min(len - 1, k + r + 1)]! - line[Math.max(0, k - r)]!;
    }
  }
}

/** Where the word may sit, in square units: centred, with generous room around it. */
export function fitBox(width: number, height: number) {
  const padX = Math.max(4, width * 0.09);
  const padY = Math.max(4, height * 0.18);
  return { w: Math.max(1, width - padX * 2), h: Math.max(1, height - padY * 2) };
}

/**
 * Big lettering set in type, for the top of a page. Each letter is a solid, bevelled slab: blocks
 * shaded by a light from the upper left, a single family of glyphs cut into the faces that turn
 * from the light, and soft edges in light glyphs. A sheen crosses it now and then. The pointer
 * knocks cells loose; they tumble and spring back home. A click sends a shockwave through it.
 */
export function createLogo(options: LogoOptions = {}): AsciiScene {
  const text = (options.text ?? 'lilt').trim() || 'lilt';
  const weight = clamp(Math.round(options.weight ?? 800), 100, 900);
  const font = options.font || SANS;
  const palette = [
    ...buildPalette(options.colors ?? DEFAULT_LOGO_COLORS),
    options.snowColor ?? '#e6ecfb',
    ...FIRE_COLORS,
  ];
  const snowfall = clamp(options.snow ?? 0, 0, 2);
  const clearBelow = clamp(options.clearBelow ?? 0, 0, 0.7);
  const firePlaces = (options.fires ?? []).map((x) => clamp(x, 0.02, 0.98));
  const fires = firePlaces.map((_, k) => createCampfire(k + 1));
  /** The row each fire burns on; its logs lie on the row below and the ground below that. */
  let fireBase = 0;
  const steam: Steam[] = [];

  let grid: AsciiGrid = { cols: 0, rows: 0, aspect: 2 };
  let cover: Float32Array = new Float32Array(0);
  /** Shade and hue of each cell at rest, and the glyph cut into it. */
  let shade = new Float32Array(0);
  let hue = new Uint8Array(0);
  /** Cells the lettering touches, as indices, and the reveal time of each. */
  let cells = new Int32Array(0);
  let reveal = new Float32Array(0);
  // Loose cells: offset from home and velocity in square units, and how loose (gravity wins).
  let ox = new Float32Array(0);
  let oy = new Float32Array(0);
  let vx = new Float32Array(0);
  let vy = new Float32Array(0);
  let loose = new Float32Array(0);
  let active = new Uint8Array(0);
  let moving: number[] = [];
  /** A shockwave's kick for each cell: when it lands, and how hard. */
  let kickAt = new Float32Array(0);
  let kick = new Float32Array(0);
  const rings: Ring[] = [];
  let time = 0;
  let px = 0;
  let py = 0;
  let pointerOn = false;
  let pointerSpeed = 0;
  let bounds = { x0: 0, x1: 0 };
  // Snow: flakes in flight, in cells, and how deep it lies on each letter's top.
  let fx: number[] = [];
  let fy: number[] = [];
  let fvx: number[] = [];
  let fvy: number[] = [];
  let fseed: number[] = [];
  /** For each cell, its place among the tops of the letters, or -1. */
  let ledgeOf = new Int32Array(0);
  let ledges = new Int32Array(0);
  let cap = new Float32Array(0);
  /** The tops either side of each top, or -1, so snow can spread along a letter. */
  let leftTop = new Int32Array(0);
  let rightTop = new Int32Array(0);
  let wind = 0;

  function wake(i: number) {
    if (active[i]) return;
    active[i] = 1;
    moving.push(i);
  }

  function build() {
    const { cols, rows, aspect } = grid;
    const size = cols * rows;
    const width = cols;
    const tall = rows * aspect;
    const fw = Math.ceil(width * P);
    const fh = Math.ceil(tall * P);
    // The word is set in the band above any room kept clear, and the rest of the field is empty.
    const band = tall * (1 - clearBelow);
    const set =
      rasterise(text, width, band, font, weight) ?? bitmapInk(text, width, band, P, fitBox);
    const ink = new Float32Array(fw * fh);
    ink.set(set.subarray(0, Math.min(set.length, ink.length)));

    // How much of each cell the ink covers.
    cover = new Float32Array(size);
    for (let row = 0; row < rows; row++) {
      const y0 = Math.floor(row * aspect * P);
      const y1 = Math.min(fh, Math.floor((row + 1) * aspect * P));
      for (let col = 0; col < cols; col++) {
        let sum = 0;
        let n = 0;
        for (let py = y0; py < y1; py++) {
          for (let px = col * P; px < (col + 1) * P && px < fw; px++) {
            sum += ink[py * fw + px]!;
            n++;
          }
        }
        cover[row * cols + col] = n ? sum / n : 0;
      }
    }
    shade = new Float32Array(size);
    hue = new Uint8Array(size);
    ox = new Float32Array(size);
    oy = new Float32Array(size);
    vx = new Float32Array(size);
    vy = new Float32Array(size);
    loose = new Float32Array(size);
    active = new Uint8Array(size);
    kickAt = new Float32Array(size).fill(-1);
    kick = new Float32Array(size);
    moving = [];

    // The height of the slab: the ink blurred, so its rim rounds over smoothly into a flat face.
    // The bevel's width follows the size of the type.
    let top = fh;
    let foot = 0;
    for (let py = 0; py < fh; py++) {
      for (let px = 0; px < fw; px += 2) {
        if (ink[py * fw + px]! > 0.5) {
          top = Math.min(top, py);
          foot = Math.max(foot, py);
          break;
        }
      }
    }
    const bevel = clamp(((foot - top) / P) * 0.05, 1.2, 3.5);
    const height = Float32Array.from(ink);
    const r = Math.max(1, Math.round(bevel * P * 0.7));
    for (let pass = 0; pass < 2; pass++) {
      boxBlur(height, fw, fh, r, false);
      boxBlur(height, fw, fh, r, true);
    }
    const heightAt = (x: number, y: number) =>
      height[clamp(Math.round(y * P), 0, fh - 1) * fw + clamp(Math.round(x * P), 0, fw - 1)]!;

    let x0 = cols;
    let x1 = 0;
    let y0 = rows;
    let y1 = 0;
    const list: number[] = [];
    for (let i = 0; i < size; i++) {
      if (cover[i]! < 0.08) continue;
      list.push(i);
      const col = i % cols;
      const row = (i - col) / cols;
      x0 = Math.min(x0, col);
      x1 = Math.max(x1, col);
      y0 = Math.min(y0, row);
      y1 = Math.max(y1, row);
    }
    cells = Int32Array.from(list);
    bounds = { x0, x1 };
    reveal = new Float32Array(size);
    const span = Math.max(1, x1 - x0);
    const tallRows = Math.max(1, y1 - y0);
    const lift = bevel * 1.3;
    for (const i of cells) {
      const col = i % cols;
      const row = (i - col) / cols;
      const at = (col - x0) / span;
      // The gradient runs left to right, leaning a little with the light.
      hue[i] = clamp(
        Math.round((at * 0.9 + ((row - y0) / tallRows) * 0.1) * (HUES - 1)),
        0,
        HUES - 1,
      );
      const x = col + 0.5;
      const y = (row + 0.5) * aspect;
      const nx = (-(heightAt(x + 0.75, y) - heightAt(x - 0.75, y)) / 1.5) * lift;
      const ny = (-(heightAt(x, y + 0.75) - heightAt(x, y - 0.75)) / 1.5) * lift;
      const nl = Math.hypot(nx, ny, 1);
      const lit = (nx * LIGHT[0]! + ny * LIGHT[1]! + LIGHT[2]!) / nl;
      // Flat faces sit in the middle; the bevel catches or loses the light; the top of the word
      // is a touch brighter than its foot.
      const flat = LIGHT[2]!;
      const v = 0.62 + (lit - flat) * 1.35 + (0.5 - (row - y0) / tallRows) * 0.16;
      shade[i] = clamp(v, 0, 1);
      reveal[i] = 0.1 + at * (ENTRANCE - 0.45) + hash3(col, row, 3) * 0.25;
    }
    if (snowfall > 0) settleSnow();
  }

  /** Finds the tops of the letters and lays a first fall of snow, so it reads as winter at once. */
  function settleSnow() {
    const { cols, rows } = grid;
    ledgeOf = new Int32Array(cols * rows).fill(-1);
    const list: number[] = [];
    for (const i of cells) {
      if (cover[i]! < 0.5 || i < cols || cover[i - cols]! >= 0.5) continue;
      ledgeOf[i] = list.length;
      list.push(i);
    }
    ledges = Int32Array.from(list);
    cap = new Float32Array(list.length);
    leftTop = new Int32Array(list.length);
    rightTop = new Int32Array(list.length);
    list.forEach((i, k) => {
      const col = i % cols;
      cap[k] = 0.7 + 0.25 * Math.sin(col * 0.37 + 1.3) + 0.15 * Math.sin(col * 1.1);
      leftTop[k] = col > 0 ? ledgeOf[i - 1]! : -1;
      rightTop[k] = col < cols - 1 ? ledgeOf[i + 1]! : -1;
    });
    fx = [];
    fy = [];
    fvx = [];
    fvy = [];
    fseed = [];
    const count = flakesWanted();
    for (let k = 0; k < count; k++) spawn(hash3(k, 1, 2) * cols, hash3(k, 2, 3) * rows, 0, 2);
  }

  const flakesWanted = () => Math.round(((grid.cols * grid.rows) / 120) * snowfall);

  function spawn(x: number, y: number, vx0: number, vy0: number) {
    fx.push(x);
    fy.push(y);
    fvx.push(vx0);
    fvy.push(vy0);
    fseed.push(Math.random());
  }

  /** Throws the snow off a letter's top as loose flakes. */
  function shed(k: number, vx0: number, vy0: number) {
    const depth = cap[k]!;
    if (depth < 0.05) return;
    const i = ledges[k]!;
    const col = i % grid.cols;
    const row = (i - col) / grid.cols;
    const n = Math.min(4, Math.ceil(depth * 2.5));
    for (let j = 0; j < n; j++) {
      spawn(
        col + Math.random(),
        row - 0.5 - Math.random(),
        vx0 + (Math.random() - 0.5) * 6,
        vy0 - Math.random() * 6,
      );
    }
    cap[k] = 0;
  }

  function removeFlake(n: number) {
    const last = fx.length - 1;
    fx[n] = fx[last]!;
    fy[n] = fy[last]!;
    fvx[n] = fvx[last]!;
    fvy[n] = fvy[last]!;
    fseed[n] = fseed[last]!;
    fx.pop();
    fy.pop();
    fvx.pop();
    fvy.pop();
    fseed.pop();
  }

  function stepSnow(dt: number) {
    const { cols, rows, aspect } = grid;
    wind = 0.6 * Math.sin(time * 0.13) + 0.35 * Math.sin(time * 0.41 + 1);
    // The pointer is a warm breath: it melts the caps it passes, and a quick pass blows them off.
    if (pointerOn) {
      for (let k = 0; k < ledges.length; k++) {
        if (cap[k]! <= 0) continue;
        const i = ledges[k]!;
        const col = i % cols;
        const row = (i - col) / cols;
        const d = Math.hypot(col + 0.5 - px, (row - 0.5) * aspect - py);
        if (d >= REACH) continue;
        if (pointerSpeed > 25) shed(k, (col + 0.5 - px) * 2, -4);
        else cap[k] = Math.max(0, cap[k]! - dt * 1.6 * (1 - d / REACH));
      }
    }
    // A letter knocked loose drops its snow.
    for (const i of moving) {
      const k = ledgeOf[i]!;
      if (k >= 0 && cap[k]! > 0 && (Math.abs(ox[i]!) > 0.4 || Math.abs(oy[i]!) > 0.4)) {
        shed(k, vx[i]! * 0.3, (vy[i]! * 0.2) / aspect);
      }
    }
    const target = flakesWanted();
    for (let n = 0; n < fx.length; n++) {
      const seed = fseed[n]!;
      const fall = 2.6 + seed * 3.2;
      const sway = Math.sin(time * (0.8 + seed) + seed * 40) * 0.9 + wind * 2;
      fvx[n] = fvx[n]! + (sway - fvx[n]!) * Math.min(1, dt * 1.5);
      fvy[n] = fvy[n]! + (fall - fvy[n]!) * Math.min(1, dt * 1.2);
      if (pointerOn) {
        const dx = fx[n]! - px;
        const dy = fy[n]! * aspect - py;
        const d = Math.hypot(dx, dy);
        if (d < REACH && d > 0.01) {
          const f = (1 - d / REACH) * 30 * dt;
          fvx[n] = fvx[n]! + (dx / d) * f;
          fvy[n] = fvy[n]! + ((dy / d) * f) / aspect;
        }
      }
      fx[n] = fx[n]! + fvx[n]! * dt;
      fy[n] = fy[n]! + fvy[n]! * dt;
      const col = Math.floor(fx[n]!);
      const row = Math.floor(fy[n]!);
      let landed = false;
      if (col >= 0 && col < cols && row >= 0 && row + 1 < rows && fvy[n]! > 0) {
        const below = (row + 1) * cols + col;
        const k = ledgeOf[below]!;
        if (k >= 0 && !active[below] && time > reveal[below]!) {
          if (cap[k]! < 1.8) cap[k] = cap[k]! + 0.09 + seed * 0.06;
          landed = true;
        } else if (cover[row * cols + col]! >= 0.5) {
          landed = true;
        }
      }
      if (!landed && fx[n]! > -3 && fx[n]! < cols + 3 && fy[n]! < rows + 1) continue;
      // A flake that lands or leaves is replaced high up, while the sky wants more.
      if (fx.length > target) {
        removeFlake(n);
        n--;
        continue;
      }
      fx[n] = Math.random() * (cols + 8) - 4 - wind * 4;
      fy[n] = -1 - Math.random() * 4;
      fvx[n] = 0;
      fvy[n] = 2;
      fseed[n] = Math.random();
    }
    // Lying snow evens out along each letter's top, so caps read as one drift rather than tufts.
    const rate = Math.min(1, dt * 3);
    for (let k = 0; k < cap.length; k++) {
      const l = leftTop[k]!;
      const r = rightTop[k]!;
      let sum = 0;
      let n = 0;
      if (l >= 0 && !active[ledges[l]!]) {
        sum += cap[l]!;
        n++;
      }
      if (r >= 0 && !active[ledges[r]!]) {
        sum += cap[r]!;
        n++;
      }
      if (n) cap[k] = cap[k]! + (sum / n - cap[k]!) * rate * 0.5;
    }
    // Lying snow slowly sublimes, so caps breathe rather than fill for ever.
    for (let k = 0; k < cap.length; k++) cap[k] = Math.max(0, cap[k]! - dt * 0.012);
  }

  function drawSnow(surface: GlyphSurface) {
    const { cols } = grid;
    for (let k = 0; k < ledges.length; k++) {
      const depth = cap[k]!;
      if (depth < 0.06) continue;
      const i = ledges[k]!;
      if (time < reveal[i]! + 0.25) continue;
      if (active[i] && (Math.abs(ox[i]!) > 0.4 || Math.abs(oy[i]!) > 0.4)) continue;
      const col = i % cols;
      const row = (i - col) / cols;
      layer(surface, col, row - 1, depth);
      if (depth > 1) layer(surface, col, row - 2, depth - 1);
    }
    for (let n = 0; n < fx.length; n++) {
      const col = Math.floor(fx[n]!);
      const row = Math.floor(fy[n]!);
      if (surface.filled(col, row)) continue;
      const seed = fseed[n]!;
      surface.put(col, row, seed > 0.82 ? '*' : seed > 0.45 ? '+' : '.', SNOW, 0.45 + seed * 0.5);
    }
  }

  /** A cell of lying snow, `depth` of a cell deep: a dusting, then a solid block. */
  function layer(surface: GlyphSurface, col: number, row: number, depth: number) {
    if (row < 0 || depth < 0.08) return;
    if (depth >= 0.3) surface.fill(col, row, SNOW, 0.5 + 0.45 * Math.min(1, depth));
    else surface.put(col, row, '.', SNOW, 0.5 + depth);
  }

  /** Sets the fires on the ground line, sized to the sky. */
  function placeFires() {
    const { cols, rows } = grid;
    const width = clamp(Math.round(cols * 0.075), 9, 17);
    const height = Math.round(width * 1.05);
    fireBase = Math.round(rows * FIRE_GROUND);
    fires.forEach((fire, k) => fire.place(firePlaces[k]! * cols, fireBase, width, height));
  }

  function stepFires(dt: number, pointer: AsciiPointer) {
    const { aspect } = grid;
    // Flames reach toward a hand held near them.
    for (const fire of fires) {
      const d = Math.hypot(pointer.x - fire.centre.x, (pointer.y - fire.centre.y) * aspect);
      const near = pointer.active ? clamp(1 - d / (fire.width * 4), 0, 1) : 0;
      fire.step(dt, clamp((pointer.x - fire.centre.x) / (fire.width * 1.5), -1, 1) * near, aspect);
    }
    // Snow that drifts into a fire hisses into steam.
    for (let n = fx.length - 1; n >= 0; n--) {
      for (const fire of fires) {
        if (Math.abs(fx[n]! - fire.centre.x) > fire.width * 0.45) continue;
        if (Math.abs(fy[n]! - fire.centre.y) > fire.height * 0.55) continue;
        steam.push({ x: fx[n]!, y: fy[n]!, age: 0 });
        removeFlake(n);
        break;
      }
    }
    for (let i = steam.length - 1; i >= 0; i--) {
      const puff = steam[i]!;
      puff.age += dt;
      if (puff.age > STEAM_LIFE) steam.splice(i, 1);
      else puff.y -= dt * 3;
    }
  }

  function drawFires(surface: GlyphSurface) {
    const { cols } = grid;
    // A low drift of snow either side of each fire, melted back into a clearing round it.
    for (const fire of fires) {
      const span = fire.width * 2.2;
      for (let col = Math.floor(fire.centre.x - span); col <= fire.centre.x + span; col++) {
        if (col < 0 || col >= cols) continue;
        const dx = Math.abs(col + 0.5 - fire.centre.x);
        if (dx < fire.width * 0.6) continue;
        const depth = Math.pow(Math.max(0, 1 - dx / span), 0.7);
        if (depth < 0.05) continue;
        surface.put(col, fireBase + 1, depth > 0.5 ? ':' : '.', SNOW, 0.2 + depth * 0.5);
        if (depth > 0.75) surface.put(col, fireBase, '.', SNOW, (depth - 0.75) * 1.6);
      }
      fire.draw(surface, FIRE);
    }
    for (const puff of steam) {
      const t = puff.age / STEAM_LIFE;
      surface.put(puff.x, puff.y, t < 0.5 ? '~' : '.', SNOW, (1 - t) * 0.7);
    }
  }

  function sheenAt(x: number, y: number) {
    if (time < SHEEN_FIRST) return 0;
    const phase = (time - SHEEN_FIRST) % SHEEN_EVERY;
    if (phase > SHEEN_SWEEP) return 0;
    // A slanted band crossing from just before the word to just past it.
    const t = phase / SHEEN_SWEEP;
    const eased = t * t * (3 - 2 * t);
    const from = bounds.x0 - 14;
    const to = bounds.x1 + 14 + grid.rows * grid.aspect * 0.6;
    const pos = from + (to - from) * eased;
    const d = (x + y * 0.6 - pos) / 5;
    return Math.exp(-d * d);
  }

  return {
    palette,
    lineHeight: 0.9,
    settle: ENTRANCE + 0.4,
    resize(next) {
      grid = next;
      rings.length = 0;
      build();
      if (fires.length) placeFires();
    },
    step(dt, pointer: AsciiPointer) {
      if (!grid.cols) return;
      time += dt;
      const { cols, rows, aspect } = grid;
      const nx = pointer.x;
      const ny = pointer.y * aspect;
      const moved = pointerOn && pointer.active ? Math.hypot(nx - px, ny - py) / dt : 0;
      pointerSpeed = pointerSpeed + (moved - pointerSpeed) * Math.min(1, dt * 12);
      pointerOn = pointer.active;
      px = nx;
      py = ny;

      // The pointer pushes cells away around it, and a quick pass knocks them loose.
      if (pointerOn && time > ENTRANCE * 0.6) {
        const r0 = Math.max(0, Math.floor((py - REACH) / aspect));
        const r1 = Math.min(rows - 1, Math.ceil((py + REACH) / aspect));
        const c0 = Math.max(0, Math.floor(px - REACH));
        const c1 = Math.min(cols - 1, Math.ceil(px + REACH));
        const knock = clamp(pointerSpeed / 40, 0, 1);
        for (let row = r0; row <= r1; row++) {
          for (let col = c0; col <= c1; col++) {
            const i = row * cols + col;
            if (cover[i]! < 0.5) continue;
            const dx = col + 0.5 + ox[i]! - px;
            const dy = (row + 0.5) * aspect + oy[i]! - py;
            const d = Math.hypot(dx, dy);
            if (d >= REACH || d < 1e-3) continue;
            const f = 1 - d / REACH;
            wake(i);
            vx[i] = vx[i]! + (dx / d) * f * f * 420 * dt;
            vy[i] = vy[i]! + ((dy / d) * f * f * 420 - f * 60 * knock) * dt;
            loose[i] = Math.max(loose[i]!, f * knock);
          }
        }
      }

      // The shockwave lands on each cell as the ring passes it.
      if (rings.length) {
        for (const i of cells) {
          const at = kickAt[i]!;
          if (at < 0 || at > time) continue;
          kickAt[i] = -1;
          const col = i % cols;
          const row = (i - col) / cols;
          const ring = rings[rings.length - 1]!;
          const dx = col + 0.5 - ring.x;
          const dy = (row + 0.5) * aspect - ring.y;
          const d = Math.hypot(dx, dy) || 1;
          const s = kick[i]!;
          wake(i);
          vx[i] = vx[i]! + (dx / d) * s * 60;
          vy[i] = vy[i]! + ((dy / d) * s * 60 - s * 30);
          loose[i] = Math.max(loose[i]!, s);
        }
        for (const ring of rings) ring.age += dt;
        while (rings.length && rings[0]!.age > 2.2) rings.shift();
      }

      // Loose cells fly and fall, then the spring takes over and brings them home.
      const keep: number[] = [];
      for (const i of moving) {
        const l = loose[i]!;
        const pull = SPRING * (1 - l) * (1 - l);
        vx[i] = vx[i]! + (-ox[i]! * pull - vx[i]! * DAMPING * (1 - l * 0.7)) * dt;
        vy[i] = vy[i]! + (-oy[i]! * pull + GRAVITY * l - vy[i]! * DAMPING * (1 - l * 0.7)) * dt;
        ox[i] = ox[i]! + vx[i]! * dt;
        oy[i] = oy[i]! + vy[i]! * dt;
        loose[i] = Math.max(0, l - dt / 0.75);
        const still =
          !loose[i] &&
          Math.abs(ox[i]!) + Math.abs(oy[i]!) < 0.03 &&
          Math.abs(vx[i]!) + Math.abs(vy[i]!) < 0.2;
        if (still) {
          ox[i] = oy[i] = vx[i] = vy[i] = 0;
          active[i] = 0;
        } else keep.push(i);
      }
      moving = keep;
      if (snowfall > 0) stepSnow(dt);
      if (fires.length) stepFires(dt, pointer);
    },
    press(x, y) {
      if (!grid.cols) return;
      const { cols, aspect } = grid;
      // A click on a fire stokes it.
      const poked = fires.find(
        (fire) => Math.hypot(x - fire.centre.x, (y - fire.centre.y) * aspect) < fire.width * 1.3,
      );
      if (poked) {
        poked.stoke();
        return;
      }
      const cx = x;
      const cy = y * aspect;
      rings.push({ x: cx, y: cy, age: 0 });
      // The blast throws the snow off every letter near it.
      for (let k = 0; k < ledges.length; k++) {
        const i = ledges[k]!;
        const d = Math.hypot((i % cols) + 0.5 - cx, Math.floor(i / cols) * aspect - cy);
        if (d < 30) shed(k, ((i % cols) - cx) * 0.4, -10 * (1 - d / 30));
      }
      if (rings.length > 3) rings.shift();
      const reach = Math.max(grid.cols, grid.rows * aspect) * 0.6;
      for (const i of cells) {
        if (cover[i]! < 0.5) continue;
        const col = i % cols;
        const row = (i - col) / cols;
        const d = Math.hypot(col + 0.5 - cx, (row + 0.5) * aspect - cy);
        if (d > reach) continue;
        kickAt[i] = time + d / RING_SPEED;
        kick[i] = Math.pow(1 - d / reach, 1.6) * (0.7 + 0.3 * hash3(col, row, 9));
      }
    },
    draw(surface: GlyphSurface) {
      if (!grid.cols) return;
      const { cols, aspect } = grid;
      // Homes first: the lettering at rest, with holes where cells have flown.
      for (const i of cells) {
        const col = i % cols;
        const row = (i - col) / cols;
        const c = cover[i]!;
        const since = time - reveal[i]!;
        if (since < 0) continue;
        const h = hue[i]! * SHADES;
        if (active[i] && (Math.abs(ox[i]!) > 0.5 || Math.abs(oy[i]!) > aspect * 0.5)) continue;
        if (since < 0.22) {
          // Arriving: a glyph or two of scramble before the block lands.
          const tick = Math.floor(time * 20);
          const glyph = SCRAMBLE[Math.floor(hash3(col, row, tick) * SCRAMBLE.length)]!;
          surface.put(col, row, glyph, h + 4, 0.55 + c * 0.4);
          continue;
        }
        const x = col + 0.5;
        const y = (row + 0.5) * aspect;
        const gleam = sheenAt(x, y);
        if (c < 0.5) {
          surface.put(
            col,
            row,
            ramp(EDGE, c * 2),
            h + SHADES - 3 + Math.round(gleam * 2),
            0.2 + c * 0.75,
          );
          continue;
        }
        const v = clamp(shade[i]! + gleam * 0.75, 0, 1);
        surface.fill(col, row, h + Math.round(v * (SHADES - 1)), 1);
        // Faces turned from the light carry engraving; lit faces stay clean.
        const dark = 1 - v;
        if (dark > 0.5 && gleam < 0.4)
          surface.put(col, row, ramp(ENGRAVE, (dark - 0.5) / 0.4), DEEP, 0.25 + dark * 0.4);
      }

      // Loose cells, wherever they have got to, as flecks of their colour.
      for (const i of moving) {
        const dxc = ox[i]!;
        const dyc = oy[i]!;
        if (Math.abs(dxc) <= 0.5 && Math.abs(dyc) <= aspect * 0.5) continue;
        const col = i % cols;
        const row = (i - col) / cols;
        const c2 = Math.floor(col + 0.5 + dxc);
        const r2 = Math.floor((row + 0.5) * 1 + dyc / aspect);
        const speed = Math.hypot(vx[i]!, vy[i]!);
        const h = hue[i]! * SHADES;
        if (!loose[i] && speed < 10 && cover[i]! >= 0.5) {
          // Settling home: a block again, ready to slot back in.
          surface.fill(c2, r2, h + Math.round(shade[i]! * (SHADES - 1)), 1);
          continue;
        }
        surface.put(c2, r2, speed > 24 ? '*' : speed > 8 ? '+' : ':', h + 5, 0.95);
      }

      if (snowfall > 0) drawSnow(surface);
      if (fires.length) drawFires(surface);

      // The shockwave's ring, faint in the empty space around the word.
      for (const ring of rings) {
        const r = ring.age * RING_SPEED;
        const fade = 1 - ring.age / 2.2;
        if (fade <= 0) continue;
        const steps = Math.ceil(r * 2 * Math.PI);
        for (let k = 0; k < steps; k++) {
          const a = (k / steps) * Math.PI * 2;
          const col = Math.floor(ring.x + Math.cos(a) * r);
          const row = Math.floor((ring.y + Math.sin(a) * r) / aspect);
          if (surface.filled(col, row)) continue;
          surface.put(col, row, '.', INK, fade * 0.45);
        }
      }
    },
  };
}
