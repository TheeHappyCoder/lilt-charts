import { stroke } from '../engine/glyphs';
import { clamp, hash3, noise3 } from '../engine/noise';
import { DOT, type GlyphSurface } from '../engine/surface';
import type { AsciiGrid, AsciiPointer, AsciiScene } from '../engine/types';

export interface FireworksOptions {
  /** Colours the shells burst in. Default violet, rose, gold and sky blue. */
  colors?: readonly string[];
  /** Shells launched a second, on average. Default 0.55. */
  rate?: number;
  /** A low city skyline along the bottom, with lit windows. Default true. */
  skyline?: boolean;
}

const DEFAULT_COLORS = ['#8b6cff', '#e5489c', '#f5a93c', '#4fb6f0'] as const;
const INK = 0;
/** Smoke: a soft grey-violet that shows on night and paper alike. */
const SMOKE = 2;
/** Glitter and crackle: a hot gold that shows on both backdrops. */
const GLINT = 3;
/** The city's silhouette. */
const CITY = 4;
/** Lit windows in the skyline: a warm lamp colour. */
const WINDOW = 1;
/** The burst colours start here. */
const FIRST = 5;

/** Gravity and how fast sparks lose speed, in square units (cell widths) and seconds. */
const GRAVITY = 7;
const TRAIL = 12;

type Kind = 'peony' | 'ring' | 'willow' | 'double' | 'palm';
const KINDS: Kind[] = ['peony', 'ring', 'peony', 'willow', 'double', 'palm', 'peony', 'ring'];

interface Shell {
  x: number;
  y: number;
  vx: number;
  vy: number;
  tone: number;
  kind: Kind;
  /** Remembers where it has been, for the faint rising trail. */
  trail: Float32Array;
  tick: number;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  tone: number;
  drag: number;
  /** Positions the spark has passed through, newest first: its trail. */
  trail: Float32Array;
  filled: number;
  /** How many trail points are drawn. Willows draw long trails, crackles none. */
  length: number;
  /** Bursts into a few short white stars as it dies. */
  crackle: boolean;
  /** Tiny short-lived stars from a crackle. */
  tiny: boolean;
  seed: number;
}

interface Flash {
  x: number;
  y: number;
  tone: number;
  age: number;
  radius: number;
}

/**
 * Fireworks over a city at night. Shells rise on a faint trail and burst into clean shapes: round
 * peonies, tilted rings, drooping golden willows, palms and two-colour doubles. Each spark is a
 * bright head with a short trail drawn along its path; it slows, falls, flickers and fades, and
 * the bursts leave smoke that drifts on the wind, lit for a moment by the next one. Some shells
 * crackle as they die. A click sends a shell to burst where you clicked; sparks near the pointer
 * glitter.
 */
export function createFireworks(options: FireworksOptions = {}): AsciiScene {
  const colors = options.colors?.length ? options.colors : DEFAULT_COLORS;
  const rate = Math.max(0, options.rate ?? 0.55);
  const skyline = options.skyline ?? true;
  let grid: AsciiGrid = { cols: 0, rows: 0, aspect: 2 };
  let width = 0;
  let height = 0;
  let smoke = new Float32Array(0);
  let spare = new Float32Array(0);
  /** Top row of the skyline in each column, or the row count where there is none. */
  let roof = new Int16Array(0);
  const shells: Shell[] = [];
  const sparks: Spark[] = [];
  const flashes: Flash[] = [];
  let time = 0;
  let owed = 0;
  let launches = 0;
  let wind = 0;
  let drift = 0;
  let smokeTick = 0;
  let px = 0;
  let py = 0;
  let pointerOn = false;

  const size = () => Math.min(width, height * 1.25);

  function buildSkyline() {
    roof = new Int16Array(grid.cols).fill(grid.rows);
    if (!skyline) return;
    const { cols, rows } = grid;
    const tall = Math.max(2, Math.round(rows * 0.13));
    let col = 0;
    let k = 0;
    while (col < cols) {
      const w = 3 + Math.floor(hash3(k, 1, 31) * 9);
      // Lower toward the middle, so the sky over the centre stays open.
      const mid = Math.abs(col + w / 2 - cols / 2) / (cols / 2);
      const h = Math.round(1 + hash3(k, 2, 31) * tall * (0.45 + 0.55 * mid));
      for (let c = col; c < Math.min(cols, col + w); c++) roof[c] = rows - h;
      col += w + (hash3(k, 3, 31) < 0.3 ? 1 : 0);
      k++;
    }
  }

  function launch(x: number, apexY: number, kind?: Kind) {
    const tone = FIRST + (launches % colors.length);
    const chosen = kind ?? KINDS[Math.floor(hash3(launches, 7, 3) * KINDS.length)]!;
    launches++;
    const rise = Math.max(4, height - apexY);
    shells.push({
      x,
      y: height,
      vx: (Math.random() - 0.5) * 1.5,
      vy: -Math.sqrt(2 * GRAVITY * 3 * rise),
      tone,
      kind: chosen,
      trail: new Float32Array(TRAIL * 2).fill(-1),
      tick: 0,
    });
  }

  function autoLaunch() {
    const x = width * (0.18 + 0.64 * Math.random());
    const apex = height * (0.3 + 0.2 * Math.random());
    launch(x, apex);
  }

  function spark(
    x: number,
    y: number,
    vx: number,
    vy: number,
    tone: number,
    life: number,
    drag: number,
    length: number,
  ): Spark {
    const s: Spark = {
      x,
      y,
      vx,
      vy,
      age: 0,
      life,
      tone,
      drag,
      trail: new Float32Array(TRAIL * 2).fill(Number.NaN),
      filled: 0,
      length,
      crackle: false,
      tiny: false,
      seed: Math.random() * 1000,
    };
    sparks.push(s);
    return s;
  }

  function burst(shell: Shell) {
    const { x, y, tone, kind } = shell;
    const s = size();
    // Initial speed for a burst of radius `r`: with drag k a spark coasts about v / k.
    const speedFor = (r: number, drag: number) => r * drag;
    const other = FIRST + ((tone - FIRST + 1 + Math.floor(Math.random() * 2)) % colors.length);
    const crackles = Math.random() < 0.35;
    flashes.push({ x, y, tone, age: 0, radius: s * 0.22 });
    if (kind === 'ring') {
      const n = 40;
      const tilt = 0.35 + Math.random() * 0.55;
      const turn = Math.random() * Math.PI;
      const v = speedFor(s * 0.2, 1.7);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const ox = Math.cos(a);
        const oy = Math.sin(a) * tilt;
        const rx = ox * Math.cos(turn) - oy * Math.sin(turn);
        const ry = ox * Math.sin(turn) + oy * Math.cos(turn);
        spark(x, y, rx * v, ry * v, tone, 1.7 + Math.random() * 0.3, 1.7, 4);
      }
      return;
    }
    if (kind === 'palm') {
      // A few thick fronds that arch over and droop.
      const n = 9;
      const v = speedFor(s * 0.2, 1.4);
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + ((i / (n - 1)) * 2 - 1) * 1.45 + (Math.random() - 0.5) * 0.15;
        for (let j = 0; j < 3; j++) {
          const f = 1 - j * 0.12;
          spark(
            x,
            y,
            Math.cos(a) * v * f,
            Math.sin(a) * v * f,
            j === 0 ? tone : other,
            2.4,
            1.4,
            7,
          );
        }
      }
      return;
    }
    const willow = kind === 'willow';
    const n = willow ? 46 : 52;
    const drag = willow ? 2.6 : 1.6;
    const v = speedFor(s * (willow ? 0.2 : 0.21), drag);
    // Gold for willows whatever the colour: that is what willows are.
    const head = willow ? FIRST + Math.min(2, colors.length - 1) : tone;
    for (let i = 0; i < n; i++) {
      // Even directions over the outer band of a sphere seen from the side. The stars heading
      // toward or away from you would crowd the middle, so the shell is left as a clean ball.
      const z = (1 - (2 * (i + 0.5)) / n) * 0.8;
      const r = Math.sqrt(1 - z * z);
      const a = i * 2.39996 + Math.random() * 0.05;
      const jitter = 0.95 + Math.random() * 0.1;
      const sp = spark(
        x,
        y,
        Math.cos(a) * r * v * jitter,
        Math.sin(a) * r * v * jitter,
        head,
        willow ? 3.2 + Math.random() * 0.8 : 1.9 + Math.random() * 0.4,
        drag,
        willow ? 7 : 4,
      );
      sp.crackle = crackles && !willow && Math.random() < 0.6;
    }
    if (kind === 'double') {
      // A ring of a second colour inside the ball.
      const inner = 20;
      const vi = v * 0.45;
      for (let i = 0; i < inner; i++) {
        const a = (i / inner) * Math.PI * 2;
        spark(x, y, Math.cos(a) * vi, Math.sin(a) * vi, other, 1.7, drag, 3);
      }
    }
    // A puff of smoke where the shell broke.
    puff(x, y, 1.6);
  }

  function puff(x: number, y: number, amount: number) {
    const { cols, rows, aspect } = grid;
    const r = 3;
    const cx = Math.floor(x);
    const cy = Math.floor(y / aspect);
    for (let row = cy - 2; row <= cy + 2; row++) {
      for (let col = cx - r * 2; col <= cx + r * 2; col++) {
        if (col < 0 || row < 0 || col >= cols || row >= rows) continue;
        const d = Math.hypot((col - cx) / (r * 2), (row - cy) / 2);
        if (d < 1) smoke[row * cols + col]! += amount * 0.25 * (1 - d);
      }
    }
  }

  function stepSmoke() {
    // Smoke spreads a little, thins, rises a touch and drifts with the wind.
    const { cols, rows } = grid;
    drift += wind * (1 / 15);
    const shift = Math.trunc(drift);
    drift -= shift;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const from = col - shift;
        const i = row * cols + col;
        if (from < 1 || from >= cols - 1) {
          spare[i] = 0;
          continue;
        }
        const j = row * cols + from;
        const below = row < rows - 1 ? smoke[j + cols]! : 0;
        const above = row > 0 ? smoke[j - cols]! : 0;
        const v =
          smoke[j]! * 0.6 + (smoke[j - 1]! + smoke[j + 1]!) * 0.14 + below * 0.08 + above * 0.04;
        spare[i] = v * 0.985;
      }
    }
    [smoke, spare] = [spare, smoke];
  }

  function record(trail: Float32Array, x: number, y: number) {
    trail.copyWithin(2, 0, trail.length - 2);
    trail[0] = x;
    trail[1] = y;
  }

  const scene: AsciiScene = {
    palette: ['ink', '#ffcf7a', '#8d86a0', '#f0a93a', '#1d1a2e', ...colors],
    lineHeight: 1,
    settle: 0.4,
    resize(next) {
      const same =
        next.cols === grid.cols && next.rows === grid.rows && next.aspect === grid.aspect;
      grid = next;
      if (same && width) return;
      width = grid.cols;
      height = grid.rows * grid.aspect;
      smoke = new Float32Array(grid.cols * grid.rows);
      spare = new Float32Array(grid.cols * grid.rows);
      shells.length = 0;
      sparks.length = 0;
      flashes.length = 0;
      buildSkyline();
      // Open with a shell already on its way, so the first frame is not an empty sky.
      launch(width * 0.42, height * 0.36, 'peony');
      owed = -0.6;
      // Run it up to the moment the first shell is in bloom, so even a still frame has a burst.
      const idle = { x: 0, y: 0, active: false };
      for (let t = 0; t < 1.9; t += 1 / 60) scene.step(1 / 60, idle);
    },
    step(dt, pointer: AsciiPointer) {
      if (!grid.cols) return;
      time += dt;
      wind = 1.4 + (noise3(time * 0.05, 0, 3) - 0.5) * 3;
      pointerOn = pointer.active;
      px = pointer.x;
      py = pointer.y * grid.aspect;

      owed += dt * rate;
      while (owed >= 1) {
        owed -= 1 + (Math.random() - 0.5) * 0.6;
        autoLaunch();
      }

      for (let i = shells.length - 1; i >= 0; i--) {
        const sh = shells[i]!;
        sh.vy += GRAVITY * 3 * dt;
        sh.x += sh.vx * dt;
        sh.y += sh.vy * dt;
        if (++sh.tick % 2 === 0) record(sh.trail, sh.x, sh.y);
        if (sh.vy > -1.5) {
          shells.splice(i, 1);
          burst(sh);
        }
      }

      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i]!;
        s.age += dt;
        if (s.age > s.life || s.y > height + 2) {
          sparks.splice(i, 1);
          if (s.crackle && !s.tiny) {
            for (let k = 0; k < 3; k++) {
              const a = Math.random() * Math.PI * 2;
              const t = spark(
                s.x,
                s.y,
                Math.cos(a) * 3,
                Math.sin(a) * 3,
                GLINT,
                0.25 + Math.random() * 0.2,
                4,
                0,
              );
              t.tiny = true;
            }
          }
          continue;
        }
        const k = Math.exp(-s.drag * dt);
        s.vx = s.vx * k + wind * 0.12 * dt;
        s.vy = s.vy * k + GRAVITY * dt * (s.age / s.life + 0.25);
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        // Trail points: every step for most, every fourth for a willow's long arc.
        if (Math.round(s.age * 60) % (s.length > 4 ? 4 : 2) === 0) {
          record(s.trail, s.x, s.y);
          s.filled = Math.min(TRAIL, s.filled + 1);
        }
        if (s.age > s.life * 0.5 && !s.tiny && Math.random() < dt * 4) {
          const col = Math.floor(s.x);
          const row = Math.floor(s.y / grid.aspect);
          if (col >= 0 && row >= 0 && col < grid.cols && row < grid.rows) {
            smoke[row * grid.cols + col]! += 0.05;
          }
        }
      }

      for (let i = flashes.length - 1; i >= 0; i--) {
        flashes[i]!.age += dt;
        if (flashes[i]!.age > 0.9) flashes.splice(i, 1);
      }

      smokeTick += dt;
      while (smokeTick >= 1 / 15) {
        smokeTick -= 1 / 15;
        stepSmoke();
      }
    },
    press(x, y) {
      const apex = clamp(y * grid.aspect, height * 0.08, height * 0.8);
      launch(clamp(x, 2, width - 2), apex);
      // A clicked shell flies straight up to the point.
      shells[shells.length - 1]!.vx = 0;
    },
    draw(surface: GlyphSurface) {
      const { cols, rows, aspect } = grid;
      if (!cols) return;
      const flash = flashes.length ? flashes[flashes.length - 1]! : null;

      // Stars: sparse and still, dimmer toward the city's glow.
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          if (row >= roof[col]!) continue;
          const i = row * cols + col;
          const m = smoke[i]!;
          if (m > 0.02) {
            // Smoke, faint and soft. A fresh burst lights the smoke near it in its own colour.
            let tone = SMOKE;
            let lit = 0;
            if (flash) {
              const d =
                Math.hypot(col - flash.x, (row + 0.5) * aspect - flash.y) / (flash.radius * 1.6);
              lit = clamp(1 - d, 0, 1) * clamp(1 - flash.age / 0.9, 0, 1);
              if (lit > 0.25) tone = flash.tone;
            }
            // Dithered rather than shaded, so it reads as haze and not as a grid.
            if (hash3(col, row, Math.floor(time * 2)) < clamp(m * 1.5, 0, 0.6)) {
              surface.put(col, row, DOT, tone, 0.18 + clamp(m * 0.25, 0, 0.12) + lit * 0.3);
              continue;
            }
          }
          const h = hash3(col, row, 11);
          if (h < 0.012 && row < rows * 0.75) {
            const twinkle = 0.5 + 0.5 * Math.sin(time * (0.6 + h * 60) + h * 500);
            surface.put(col, row, DOT, INK, 0.1 + 0.22 * twinkle);
          }
        }
      }

      // The first moment of a burst: a soft round glow of faint blocks around its heart.
      for (const f of flashes) {
        const life = clamp(1 - f.age / 0.45, 0, 1);
        if (life <= 0) continue;
        const r = f.radius * (0.2 + 0.3 * (f.age / 0.45));
        const r0 = Math.floor((f.y - r) / aspect);
        const r1 = Math.ceil((f.y + r) / aspect);
        for (let row = r0; row <= r1; row++) {
          for (let col = Math.floor(f.x - r); col <= Math.ceil(f.x + r); col++) {
            const d = Math.hypot(col + 0.5 - f.x, (row + 0.5) * aspect - f.y) / r;
            if (d > 1) continue;
            surface.fill(col, row, f.tone, life * (1 - d) * (1 - d) * 0.35);
          }
        }
      }

      for (const sh of shells) {
        for (let k = TRAIL - 1; k >= 0; k--) {
          const tx = sh.trail[k * 2]!;
          const ty = sh.trail[k * 2 + 1]!;
          if (tx < 0) continue;
          surface.put(tx, ty / aspect, DOT, sh.tone, 0.45 * (1 - k / TRAIL));
        }
        surface.fill(sh.x, sh.y / aspect, sh.tone, 0.9);
      }

      for (const s of sparks) if (!s.tiny) drawTrail(surface, s);
      for (const s of sparks) drawHead(surface, s);

      if (skyline) drawSkyline(surface);
    },
  };
  return scene;

  /** How bright a spark is now: bright, then a slow fade, flickering as it burns out. */
  function brightness(s: Spark) {
    const t = s.age / s.life;
    let alpha = t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4;
    if (t > 0.55 && hash3(Math.floor(s.age * 18), Math.floor(s.seed), 5) < 0.35) alpha *= 0.3;
    return alpha;
  }

  /**
   * The trail: a short tail walked back along the spark's path. Only the cell behind the head is a
   * stroke, to show the way it flies; the rest are fading dots.
   */
  function drawTrail(surface: GlyphSurface, s: Spark) {
    const { aspect } = grid;
    const alpha = brightness(s);
    const speed = Math.hypot(s.vx, s.vy);
    const reach = s.length > 4 ? 6 : clamp(1 + speed * 0.09, 1, 3.5);
    let ax = s.x;
    let ay = s.y;
    let walked = 0;
    let first = true;
    for (let k = 0; k < s.filled && walked < reach; k++) {
      const bx = s.trail[k * 2]!;
      const by = s.trail[k * 2 + 1]!;
      if (Number.isNaN(bx)) break;
      const dx = bx - ax;
      const dy = (by - ay) / aspect;
      const len = Math.hypot(dx, dy);
      if (len < 1e-3) continue;
      for (let u = walked === 0 ? 1 : 0; u < len && walked + u < reach; u += 1) {
        const f = 1 - (walked + u) / (reach + 0.5);
        const g = first && speed > 6 ? stroke(dx, by - ay) : DOT;
        first = false;
        surface.put(ax + (dx / len) * u, ay / aspect + (dy / len) * u, g, s.tone, f * alpha * 0.7);
      }
      walked += len;
      ax = bx;
      ay = by;
    }
  }

  /** The head: a bright block of colour, glittering gold near the pointer. */
  function drawHead(surface: GlyphSurface, s: Spark) {
    const t = s.age / s.life;
    const alpha = brightness(s);
    const col = s.x;
    const row = s.y / grid.aspect;
    if (s.tiny) {
      surface.put(col, row, t < 0.5 ? '+' : DOT, GLINT, alpha);
      return;
    }
    const glitter =
      pointerOn &&
      Math.hypot(s.x - px, s.y - py) < 10 &&
      hash3(Math.floor(time * 20), Math.floor(s.seed), 9) < 0.5;
    if (glitter) {
      surface.fill(col, row, GLINT, 0.95);
      surface.put(col, row, '+', CITY, 0.6);
      return;
    }
    // Young sparks burn as solid blocks; dying ones shrink to a point.
    if (t < 0.7) surface.fill(col, row, s.tone, alpha * (t < 0.15 ? 1 : 0.85));
    else surface.put(col, row, DOT, s.tone, alpha);
  }

  function drawSkyline(surface: GlyphSurface) {
    const { cols, rows } = grid;
    for (let col = 0; col < cols; col++) {
      const top = roof[col]!;
      const left = col > 0 ? roof[col - 1]! : rows;
      const right = col < cols - 1 ? roof[col + 1]! : rows;
      for (let row = top; row < rows; row++) {
        // Solid silhouettes, one dark block a cell, and lit windows in rows.
        surface.fill(col, row, CITY, 0.92);
        const inside = row > top && row < rows - 1 && left <= top && right <= top;
        if (inside && col % 2 === 1 && (row - top) % 2 === 1) {
          const h = hash3(col, row, 61);
          const on = h < 0.3 && noise3(col * 0.3, row, time * 0.05 + h * 9) > 0.35;
          if (on) surface.put(col, row, DOT, WINDOW, 0.55 + 0.4 * h);
        }
      }
    }
  }
}
