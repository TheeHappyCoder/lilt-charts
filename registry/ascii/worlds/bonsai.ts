import { stroke } from '../engine/glyphs';
import { approach, clamp } from '../engine/noise';
import type { GlyphSurface } from '../engine/surface';
import type { AsciiGrid, AsciiPointer, AsciiScene } from '../engine/types';

export interface BonsaiOptions {
  /** Picks the tree: the same seed always grows the same shape. Default 7. */
  seed?: number;
  /** Seconds the tree takes to grow. Default 9. */
  growth?: number;
  /** Colour of the leaves. Default a soft green. */
  leaves?: string;
  /** Colour of the bark. Default a warm brown. */
  bark?: string;
  /** Colour of the pot. Default a glazed blue. */
  pot?: string;
}

const BARK = 0;
const LEAF = 1;
const LEAF_DARK = 2;
const POT = 3;
const INK = 4;

interface Branch {
  /** Start, in square units with y up from the pot's rim. */
  x: number;
  y: number;
  angle: number;
  length: number;
  width: number;
  /** Seconds after planting it starts and finishes growing. */
  start: number;
  end: number;
  tip: boolean;
}

interface Leaf {
  x: number;
  y: number;
  /** When it appears, in seconds after planting. */
  at: number;
  glyph: string;
  dark: boolean;
}

interface Falling {
  x: number;
  y: number;
  vx: number;
  age: number;
  phase: number;
}

/** A small seeded random number generator, so a seed always grows the same tree. */
function seeded(seed: number) {
  let a = (seed * 2654435761) >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A bonsai growing in its pot. The trunk rises and leans, splits into branches that split again,
 * and leaves gather at the tips once a branch has finished. Grown, it sways in a breeze and now
 * and then drops a leaf. The breeze blows from the pointer's side; a click plants a new tree.
 */
export function createBonsai(options: BonsaiOptions = {}): AsciiScene {
  const growth = Math.max(1, options.growth ?? 9);
  let seed = options.seed ?? 7;
  let grid: AsciiGrid = { cols: 0, rows: 0, aspect: 2 };
  let branches: Branch[] = [];
  let leaves: Leaf[] = [];
  const falling: Falling[] = [];
  let age = 0;
  let time = 0;
  let wind = 0;
  let scale = 1;

  function plant() {
    const random = seeded(seed);
    branches = [];
    leaves = [];
    falling.length = 0;
    age = 0;
    // Grown in units of the trunk's length, then scaled to the canvas.
    const grow = (
      x: number,
      y: number,
      angle: number,
      length: number,
      width: number,
      start: number,
      depth: number,
    ) => {
      const duration = (length / 12) * growth * 0.32;
      const end = start + duration;
      const tip = depth >= 5 || length < 1.6;
      branches.push({ x, y, angle, length, width, start, end, tip });
      const ex = x + Math.cos(angle) * length;
      const ey = y + Math.sin(angle) * length;
      if (tip) {
        const cluster = 10 + Math.floor(random() * 10);
        for (let i = 0; i < cluster; i++) {
          const a = random() * Math.PI * 2;
          const r = Math.sqrt(random()) * (2.4 + random() * 1.4);
          leaves.push({
            x: ex + Math.cos(a) * r * 1.3,
            y: ey + Math.sin(a) * r * 0.75 + 0.6,
            at: end + random() * growth * 0.12,
            glyph: '&@*%'[Math.floor(random() * 4)]!,
            dark: random() < 0.4,
          });
        }
        return;
      }
      const forks = depth === 0 ? 2 : random() < 0.35 ? 3 : 2;
      for (let k = 0; k < forks; k++) {
        const side = (k / (forks - 1) - 0.5) * 2;
        // Branches reach out more than up, and droop a little as they get thinner.
        const turn = side * (0.45 + random() * 0.45) + (random() - 0.5) * 0.3;
        const next = angle + turn - (depth > 1 ? Math.sign(Math.cos(angle + turn)) * 0.12 : 0);
        grow(ex, ey, next, length * (0.62 + random() * 0.18), width * 0.62, end, depth + 1);
      }
    };
    // The trunk leans one way, then the other, like a tree that has weathered.
    const lean = (random() - 0.5) * 0.6;
    grow(0, 0, Math.PI / 2 + lean, 6, 3.2, 0, 0);
    const first = branches[0]!;
    first.length = 5;
  }

  /** Where a point of the tree is now, swayed by the breeze: higher points sway more. */
  function sway(x: number, y: number): [number, number] {
    const lift = clamp(y / 18, 0, 1.5);
    const gust = Math.sin(time * 0.9 + y * 0.15) * 0.35 + wind * 1.6;
    return [x + gust * lift * lift, y];
  }

  return {
    palette: [
      options.bark ?? '#9a6b47',
      options.leaves ?? '#5fae6a',
      '#3c7d4c',
      options.pot ?? '#4a72b8',
      'ink',
    ],
    settle: growth + 1,
    lineHeight: 1.15,
    resize(next) {
      grid = next;
      // The grown tree fills about two thirds of the height above the pot.
      scale = Math.max(0.3, Math.min((grid.rows * grid.aspect * 0.62) / 26, grid.cols / 46));
      plant();
    },
    step(dt, pointer: AsciiPointer) {
      age += dt;
      time += dt;
      const target = pointer.active
        ? clamp((grid.cols / 2 - pointer.x) / (grid.cols / 2), -1, 1) * 0.5
        : 0;
      wind = approach(wind, target, 1.2, dt);
      // Grown leaves let go now and then, more in a stronger breeze.
      if (age > growth && leaves.length && Math.random() < dt * (0.4 + Math.abs(wind) * 3)) {
        const leaf = leaves[Math.floor(Math.random() * leaves.length)]!;
        falling.push({ x: leaf.x, y: leaf.y, vx: wind * 4, age: 0, phase: Math.random() * 6 });
      }
      for (let i = falling.length - 1; i >= 0; i--) {
        const f = falling[i]!;
        f.age += dt;
        f.y -= dt * 2.2;
        f.x += (f.vx + Math.sin(f.age * 3 + f.phase) * 1.5) * dt;
        if (f.y < -2) falling.splice(i, 1);
      }
    },
    press() {
      seed = (seed * 31 + 17) % 100003;
      plant();
    },
    draw(surface: GlyphSurface) {
      const { cols, rows, aspect } = grid;
      const cx = cols / 2;
      const rim = rows - 4;
      const toCell = (x: number, y: number): [number, number] => [
        cx + x * scale,
        rim - (y * scale) / aspect,
      ];

      // The pot: a rim, a bowl that narrows, and its little feet.
      const potHalf = Math.max(6, Math.round(9 * scale));
      for (let col = -potHalf - 1; col <= potHalf + 1; col++)
        surface.put(
          cx + col,
          rim,
          col === -potHalf - 1 ? '(' : col === potHalf + 1 ? ')' : '_',
          POT,
          0.95,
        );
      for (let k = 1; k <= 2; k++) {
        const w = potHalf - k;
        surface.put(cx - w - 1, rim + k, '\\', POT, 0.9);
        surface.put(cx + w + 1, rim + k, '/', POT, 0.9);
        for (let col = -w; col <= w; col++)
          surface.put(cx + col, rim + k, k === 2 ? '_' : ' ', POT, 0.6);
      }
      surface.put(cx - potHalf + 2, rim + 3, '"', POT, 0.7);
      surface.put(cx + potHalf - 2, rim + 3, '"', POT, 0.7);
      for (let col = -potHalf; col <= potHalf; col++) {
        if ((col * 7) % 5 === 0) surface.put(cx + col, rim - 0.2, '.', INK, 0.3);
      }

      for (const b of branches) {
        const grown = clamp((age - b.start) / Math.max(0.01, b.end - b.start), 0, 1);
        if (grown <= 0) continue;
        const length = b.length * grown;
        const dx = Math.cos(b.angle);
        const dy = Math.sin(b.angle);
        const steps = Math.max(2, Math.ceil(length * scale * 2));
        for (let s = 0; s <= steps; s++) {
          const t = (s / steps) * length;
          const [x, y] = sway(b.x + dx * t, b.y + dy * t);
          const [col, row] = toCell(x, y);
          // Screen direction of the branch here, for its stroke.
          const glyph = stroke(dx, -dy);
          const width = b.width * (1 - (t / b.length) * 0.3) * scale;
          if (width > 1.4) {
            const half = Math.floor(width / 2);
            for (let w = -half; w <= half; w++)
              surface.put(col + w, row, w === -half ? '/' : w === half ? '\\' : '#', BARK, 0.95);
          } else surface.put(col, row, width > 0.8 ? '%' : glyph, BARK, 0.9);
        }
      }

      for (const leaf of leaves) {
        const show = clamp((age - leaf.at) / 0.6, 0, 1);
        if (show <= 0) continue;
        const [x, y] = sway(leaf.x, leaf.y);
        const [col, row] = toCell(x, y);
        surface.put(col, row, leaf.glyph, leaf.dark ? LEAF_DARK : LEAF, show);
      }
      for (const f of falling) {
        const [col, row] = toCell(f.x, f.y);
        if (row < rim)
          surface.put(col, row, Math.sin(f.age * 6 + f.phase) > 0 ? '&' : '*', LEAF, 0.9);
      }
    },
  };
}
