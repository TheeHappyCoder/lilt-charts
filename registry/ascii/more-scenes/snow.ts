import { ramp } from '../engine/glyphs';
import { approach, clamp, hash3, noise3, smoothstep } from '../engine/noise';
import { DOT, type GlyphSurface } from '../engine/surface';
import type { AsciiGrid, AsciiPointer, AsciiScene } from '../engine/types';
import { gradient, rasteriseWord } from './shared';

export interface SnowOptions {
  /** A word standing in the snow, which catches it on its letters. Empty for none. Default 'winter'. */
  text?: string;
  /** Colours of the letters, left to right. Default violet to rose. */
  colors?: readonly string[];
  /** Colour of the snow. Default a cool white that also shows on a light page. */
  snow?: string;
  /** How hard it snows, 0 to 2. Default 1. */
  density?: number;
  /** The steady wind, in columns a second; gusts come and go around it. Default 1.5. */
  wind?: number;
  /**
   * A precomputed coverage mask for the word, one value a cell, for hosts without a canvas to
   * draw text on. Normally the word is drawn for you.
   */
  mask?: (cols: number, rows: number, aspect: number) => Float32Array | null;
}

const SNOW = 0;
/** The dark cut into solid blocks. */
const DEEP = 1;
/** The letters' colours start here. */
const LETTER = 2;
const STEPS = 8;
/** The deepest a cap on a letter grows, in rows. */
const CAP = 2.6;

/** Glyphs cut into the letters: sparse where the light catches them, dense in shadow. */
const CUT = '.:-=';
const EDGE = '.:';

/** Light from the upper left and in front: x, y (down), z (toward the viewer). */
const LIGHT = [-0.5, -0.6, 0.62].map((v, _, a) => v / Math.hypot(...a));

interface Flake {
  x: number;
  y: number;
  /** 0 far → 1 near: near flakes are bigger, brighter, faster, and land on things. */
  depth: number;
  vx: number;
  vy: number;
  phase: number;
}

interface Clump {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Snow it carries, in rows of depth; puffs of powder carry none. */
  amount: number;
  age: number;
  life: number;
}

/**
 * Snow falling on a word. Flakes fall in three depths, the near ones larger and brighter, and
 * drift on gusts of wind. The snow piles up: it caps the tops of the letters, sliding off their
 * edges once a cap grows steep, and drifts against them on the ground. The piles settle and slowly
 * melt, so they never bury the scene. The pointer is a warm breath that melts the caps and blows
 * the flakes aside; a click shakes the snow off the letters.
 */
export function createSnow(options: SnowOptions = {}): AsciiScene {
  const text = options.text ?? 'winter';
  const stops = options.colors?.length ? options.colors : ['#8b6cff', '#e5489c'];
  const density = clamp(options.density ?? 1, 0, 2);
  const baseWind = options.wind ?? 1.5;
  let grid: AsciiGrid = { cols: 0, rows: 0, aspect: 2 };
  /** Letter coverage per cell, and whether a cell is solid. */
  let mask = new Float32Array(0);
  let solid = new Uint8Array(0);
  /** A softened copy of the mask, whose slope lights the letters as if bevelled. */
  let soft = new Float32Array(0);
  /** Snow lying on each top face, in rows, keyed by the cell of the face. The ground is row `rows`. */
  let depth = new Float32Array(0);
  /** The row below the solid run above each face: how deep the snow there can get. */
  let ceiling = new Int16Array(0);
  /** The first face the sky sees in each column. */
  let open = new Int16Array(0);
  /** Every top face, as a cell index in the extended grid (rows + 1 rows). */
  let faces = new Int32Array(0);
  /** Each cell's colour along the letters' gradient. */
  let hue = new Uint8Array(0);
  const flakes: Flake[] = [];
  const clumps: Clump[] = [];
  let time = 0;
  let wind = baseWind;
  let tick = 0;
  let px = 0;
  let py = 0;
  let breath = 0;

  const cap = () => Math.max(3, grid.rows * 0.15);
  const isSolid = (col: number, row: number) =>
    row >= grid.rows ||
    (row >= 0 && col >= 0 && col < grid.cols && solid[row * grid.cols + col] === 1);

  /** The face snow at a cell would rest on: the first solid below it (or the cell's own run). */
  function faceBelow(col: number, row: number) {
    let r = Math.max(0, Math.floor(row));
    if (isSolid(col, r)) {
      while (r > 0 && isSolid(col, r - 1)) r--;
      return r;
    }
    while (!isSolid(col, r)) r++;
    return r;
  }

  const key = (col: number, row: number) => row * grid.cols + col;

  function build() {
    const { cols, rows, aspect } = grid;
    const size = cols * rows;
    mask = new Float32Array(size);
    solid = new Uint8Array(size);
    soft = new Float32Array(size);
    hue = new Uint8Array(size);
    depth = new Float32Array(cols * (rows + 1));
    ceiling = new Int16Array(cols * (rows + 1));
    open = new Int16Array(cols);

    // The word stands on the ground, filling most of the width and under half the height.
    const word =
      options.mask?.(cols, rows, aspect) ??
      rasteriseWord(
        text,
        cols,
        rows,
        aspect,
        {
          x: cols * 0.1,
          y: rows * 0.42 * aspect,
          width: cols * 0.8,
          height: (rows * 0.58 - 1.5) * aspect,
        },
        800,
        'bottom',
      );
    if (word && word.length === size) mask.set(word);
    for (let i = 0; i < size; i++) solid[i] = mask[i]! >= 0.5 ? 1 : 0;

    // Soften the mask twice with a small box, for the bevel.
    const tmp = new Float32Array(size);
    soft.set(mask);
    for (let pass = 0; pass < 2; pass++) {
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          let sum = 0;
          let n = 0;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const c = col + dx;
              const r = row + dy;
              if (c < 0 || r < 0 || c >= cols || r >= rows) continue;
              sum += soft[r * cols + c]!;
              n++;
            }
          }
          tmp[row * cols + col] = sum / n;
        }
      }
      soft.set(tmp);
    }

    let left = cols;
    let right = 0;
    for (let i = 0; i < size; i++) {
      if (!solid[i]) continue;
      left = Math.min(left, i % cols);
      right = Math.max(right, i % cols);
    }
    for (let i = 0; i < size; i++) {
      const t = right > left ? clamp(((i % cols) - left) / (right - left), 0, 1) : 0;
      hue[i] = Math.round(t * (STEPS - 1));
    }

    // Top faces: a solid cell (or the ground) with air above it.
    const list: number[] = [];
    for (let col = 0; col < cols; col++) {
      for (let row = 0; row <= rows; row++) {
        if (!isSolid(col, row) || isSolid(col, row - 1) || row === 0) continue;
        let r = row - 1;
        while (r > 0 && !isSolid(col, r - 1)) r--;
        list.push(key(col, row));
        ceiling[key(col, row)] = row - r;
      }
      open[col] = faceBelow(col, 0);
    }
    faces = Int32Array.from(list);

    // Begin with a drift on the ground and a dusting on the letters.
    for (const f of faces) {
      const col = f % cols;
      const row = Math.floor(f / cols);
      if (row === rows) depth[f] = 1.2 + 1.6 * noise3(col * 0.06, 3, 1);
      else if (open[col] === row) depth[f] = 0.6;
    }
  }

  function makeFlake(fresh: boolean): Flake {
    const r = Math.random();
    const d = r < 0.55 ? 0.1 + Math.random() * 0.2 : r < 0.85 ? 0.5 : 0.9 + Math.random() * 0.1;
    const upwind = wind > 0 ? -grid.rows * 0.4 : 0;
    return {
      x: upwind + Math.random() * (grid.cols + grid.rows * 0.4),
      y: fresh ? Math.random() * grid.rows : -1 - Math.random() * 3,
      depth: d,
      vx: 0,
      vy: 0,
      phase: Math.random() * Math.PI * 2,
    };
  }

  /** Lays snow on a face, up to what fits under whatever is above it. */
  function deposit(face: number, amount: number) {
    // Whatever would pile past the limit melts away as it lands.
    depth[face] = clamp(depth[face]! + amount, 0, limitOf(face));
  }

  /** The most snow a face holds: a cap on a letter, a drift on the ground, or what fits below. */
  function limitOf(face: number) {
    if (face < grid.rows * grid.cols) return Math.min(ceiling[face]! - 0.2, CAP);
    // Drifts on the ground rise and fall along it, like dunes.
    const col = face % grid.cols;
    return Math.min(ceiling[face]! - 0.2, cap() * (0.45 + 0.8 * noise3(col * 0.045, 5, 2)));
  }

  /** The highest snow-covered row in a column at a face. */
  const topOf = (face: number) => Math.floor(face / grid.cols) - depth[face]!;

  function land(col: number, row: number, amount: number) {
    if (col < 0 || col >= grid.cols) return;
    const face = faceBelow(col, row);
    // A flake that hits the side of a letter far below its top sticks there and is lost.
    if (isSolid(col, Math.floor(row)) && Math.floor(row) - face > 1) return;
    deposit(key(col, face), amount);
  }

  /** Snow slumps toward lower neighbours, and slides off the edges of the letters as clumps. */
  function settle() {
    const { cols } = grid;
    for (const f of faces) {
      const d = depth[f]!;
      if (d < 0.3) continue;
      const col = f % cols;
      const row = Math.floor(f / cols);
      const top = row - d;
      for (const dir of [-1, 1]) {
        const c = col + dir;
        if (c < 0 || c >= cols) continue;
        const startRow = Math.floor(top + 0.5);
        if (isSolid(c, startRow)) continue;
        const nr = faceBelow(c, startRow);
        const nf = key(c, nr);
        const diff = topOf(nf) - top;
        if (nr - row > 1) {
          // An edge: the snow holds a little, then slides off and falls.
          if (d > 1.2 && diff > 1) {
            const chunk = d - 0.5;
            depth[f] = d - chunk;
            clumps.push({
              x: c + 0.5,
              y: top,
              vx: dir * (1 + Math.random() * 2),
              vy: 0,
              amount: chunk,
              age: 0,
              life: 6,
            });
          }
          continue;
        }
        if (diff > 0.75) {
          const move = Math.min(depth[f]!, (diff - 0.75) * 0.25);
          depth[f] = depth[f]! - move;
          deposit(nf, move);
        }
      }
      // Slow melt, and faster where a pile has grown past what it can hold.
      const over = smoothstep(0.6, 1, depth[f]! / limitOf(f));
      depth[f] = Math.max(0, depth[f]! - (0.004 + over * 0.1) / 20);
    }
  }

  function shake() {
    const { cols, rows } = grid;
    for (const f of faces) {
      const row = Math.floor(f / cols);
      const d = depth[f]!;
      if (row === rows || d < 0.2) continue;
      const col = f % cols;
      const lose = d * 0.85;
      depth[f] = d - lose;
      clumps.push({
        x: col + 0.5,
        y: row - d,
        vx: (Math.random() - 0.5) * 6,
        vy: -2 - Math.random() * 4,
        amount: lose,
        age: 0,
        life: 6,
      });
      if (Math.random() < 0.5) puff(col + 0.5, row - d, 2);
    }
  }

  function puff(x: number, y: number, n: number, awayX = 0, awayY = 0) {
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2;
      const s = 2 + Math.random() * 5;
      clumps.push({
        x,
        y,
        vx: Math.cos(a) * s + awayX,
        vy: (Math.sin(a) * s) / grid.aspect - 1 + awayY,
        amount: 0,
        age: 0,
        life: 0.8 + Math.random() * 0.8,
      });
    }
  }

  return {
    palette: [options.snow ?? '#d6e0f2', '#0b0c12', ...gradient(stops, STEPS)],
    lineHeight: 1,
    settle: 4,
    resize(next) {
      // Measuring the font again can resize to the same grid: keep the snow that has fallen.
      const same =
        next.cols === grid.cols && next.rows === grid.rows && next.aspect === grid.aspect;
      grid = next;
      if (same) return;
      flakes.length = 0;
      clumps.length = 0;
      build();
      const n = Math.round(((grid.cols * grid.rows) / 1000) * 22 * density);
      for (let i = 0; i < n; i++) flakes.push(makeFlake(true));
    },
    step(dt, pointer: AsciiPointer) {
      if (!grid.cols) return;
      const { cols, rows, aspect } = grid;
      time += dt;
      // Gusts: the wind swells and drops on a slow noise.
      const gust = noise3(time * 0.12, 0, 7);
      wind = baseWind * (0.4 + 1.4 * gust) + (noise3(time * 0.05, 4, 1) - 0.5) * 3;
      breath = approach(breath, pointer.active ? 1 : 0, 4, dt);
      if (pointer.active) {
        px = pointer.x;
        py = pointer.y;
      }

      for (const f of flakes) {
        const fall = 2.2 + f.depth * 5.5;
        const sway = Math.sin(time * (0.8 + f.depth) + f.phase) * (0.6 + f.depth);
        let pushX = 0;
        let pushY = 0;
        if (breath > 0.05) {
          // The breath pushes flakes away from the pointer, near ones the most.
          const dx = f.x - px;
          const dy = (f.y - py) * aspect;
          const d = Math.hypot(dx, dy);
          if (d < 12 && d > 0.01) {
            const k = (1 - d / 12) * breath * 40 * (0.3 + f.depth);
            pushX = (dx / d) * k;
            pushY = ((dy / d) * k) / aspect;
          }
        }
        f.vx = approach(f.vx, wind * (0.4 + f.depth * 0.8) + sway + pushX, 3, dt);
        f.vy = approach(f.vy, fall + pushY, 3, dt);
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        const col = Math.floor(f.x);
        const row = Math.floor(f.y);
        if (f.y > rows + 1 || f.x < -grid.rows || f.x > cols + grid.rows) {
          Object.assign(f, makeFlake(false));
          continue;
        }
        if (col < 0 || col >= cols || row < 0) continue;
        if (f.depth < 0.4) {
          // Far flakes fall behind the word and melt into the drift.
          const top = topOf(key(col, rows));
          if (f.y > top) Object.assign(f, makeFlake(false));
          continue;
        }
        // Near flakes land on letters, caps and the drift.
        const face = faceBelow(col, row);
        if (f.y >= topOf(key(col, face))) {
          land(col, row, 0.035 + f.depth * 0.03);
          Object.assign(f, makeFlake(false));
        }
      }

      for (let i = clumps.length - 1; i >= 0; i--) {
        const c = clumps[i]!;
        c.age += dt;
        if (c.amount > 0) {
          c.vy += 30 * dt;
          c.vx = approach(c.vx, wind * 0.3, 1, dt);
        } else {
          c.vx = approach(c.vx, wind, 2, dt);
          c.vy = approach(c.vy, 1.5, 2, dt);
        }
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        const col = Math.floor(c.x);
        const row = Math.floor(c.y);
        if (c.age > c.life || col < 0 || col >= cols || c.y > rows + 1) {
          clumps.splice(i, 1);
          continue;
        }
        if (c.amount > 0 && row >= 0) {
          const face = faceBelow(col, row);
          if (c.y >= topOf(key(col, face))) {
            land(col, row, c.amount);
            if (c.amount > 0.2) puff(c.x, c.y, 2);
            clumps.splice(i, 1);
          }
        }
      }

      // The piles settle at 20 Hz: snow falls on every face open to the sky, unevenly, and slumps.
      tick += dt;
      while (tick >= 1 / 20) {
        tick -= 1 / 20;
        const rate = (0.12 * density) / 20;
        for (let col = 0; col < cols; col++) {
          const drift = 0.4 + 1.2 * noise3(col * 0.05 + time * 0.02, 1, 3);
          const face = key(col, open[col]!);
          // A full pile catches less: the wind takes what lands on it.
          const full = smoothstep(0.7, 1, depth[face]! / limitOf(face));
          deposit(face, rate * drift * (1 - full));
        }
        settle();
        if (breath > 0.05) melt();
      }
    },
    press() {
      shake();
    },
    draw(surface: GlyphSurface) {
      const { cols, rows } = grid;
      if (!cols) return;

      // The letters: solid lit blocks, bevelled by the slope of the softened mask.
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const i = row * cols + col;
          const m = mask[i]!;
          if (m < 0.12) continue;
          const tone = LETTER + hue[i]!;
          if (m < 0.5) {
            surface.put(col, row, ramp(EDGE, m * 2), tone, 0.5 + m * 0.5);
            continue;
          }
          const gx = (soft[i + 1] ?? 0) - (soft[i - 1] ?? 0);
          const gy = (soft[i + cols] ?? 0) - (soft[i - cols] ?? 0);
          const nx = -gx * 1.6;
          const ny = -gy * 1.6;
          const nl = Math.hypot(nx, ny, 1);
          const lit = (nx * LIGHT[0]! + ny * LIGHT[1]! + LIGHT[2]!) / nl;
          const light = smoothstep(0.1, 0.78, lit);
          surface.fill(col, row, tone, 0.5 + 0.5 * light);
          if (light < 0.6)
            surface.put(col, row, ramp(CUT, 1 - light / 0.6), DEEP, 0.25 + 0.3 * light);
        }
      }

      // Flakes, far ones first and behind the word.
      for (const f of flakes) {
        if (f.depth >= 0.4) continue;
        if (surface.filled(f.x, f.y)) continue;
        surface.put(f.x, f.y, DOT, SNOW, 0.16 + f.depth * 0.5);
      }

      drawPiles(surface);

      for (const c of clumps) {
        const fade = c.amount > 0 ? 0.85 : 0.6 * (1 - c.age / c.life);
        surface.put(c.x, c.y, c.amount > 0.25 ? '*' : DOT, SNOW, fade);
      }

      for (const f of flakes) {
        if (f.depth < 0.4) continue;
        const g = f.depth > 0.8 ? '*' : '+';
        surface.put(f.x, f.y, g, SNOW, f.depth > 0.8 ? 0.85 : 0.5);
      }
    },
  };

  /** The warm breath: snow near the pointer melts, and some of it blows away as powder. */
  function melt() {
    const { cols, aspect } = grid;
    for (const f of faces) {
      const d = depth[f]!;
      if (d < 0.05) continue;
      const col = f % cols;
      const top = Math.floor(f / cols) - d;
      const dist = Math.hypot(col + 0.5 - px, (top - py) * aspect);
      if (dist > 10) continue;
      const k = (1 - dist / 10) * breath;
      depth[f] = Math.max(0, d - k * 0.12);
      if (Math.random() < k * 0.15) {
        const dx = col + 0.5 - px;
        puff(col + 0.5, top, 1, Math.sign(dx) * 6, -1);
      }
    }
  }

  function drawPiles(surface: GlyphSurface) {
    const { cols } = grid;
    for (const f of faces) {
      // Cells at least half full: crisp steps read cleaner than half-lit blocks.
      const n = Math.round(depth[f]!);
      if (n < 1) continue;
      const col = f % cols;
      const row = Math.floor(f / cols);
      for (let k = 0; k < n; k++) {
        const r = row - n + k;
        // Lit on top, shading into the pile.
        surface.fill(col, r, SNOW, Math.max(0.5, 0.95 - k * 0.13));
        if (k > 1 && hash3(col, r, 13) < 0.1) surface.put(col, r, DOT, DEEP, 0.3);
      }
    }
  }
}
