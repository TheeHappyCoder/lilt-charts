import { ramp, stroke } from '../engine/glyphs';
import { approach, clamp, hash3, noise3 } from '../engine/noise';
import { DOT, type GlyphSurface } from '../engine/surface';
import type { AsciiGrid, AsciiPointer, AsciiScene } from '../engine/types';

export interface JellyfishOptions {
  /** How many jellyfish. Default 4. */
  count?: number;
  /** Glow colours, one per jellyfish in turn. Default cyan, violet, pink and amber. */
  colors?: readonly string[];
  /** Drifting flecks of marine snow per thousand cells. Default 12. */
  snow?: number;
}

const INK = 0;
const TENTACLES = 9;
const LINKS = 16;
const ARMS = 4;
const ARM_LINKS = 10;
const RIM = ':-=+*#';
const EDGE = '.:';

interface Rope {
  x: Float32Array;
  y: Float32Array;
  px: Float32Array;
  py: Float32Array;
  rest: number;
}

interface Jelly {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Lean of the bell from upright, radians; it swims the way it points. */
  tilt: number;
  radius: number;
  /** Through one beat, 0 → 1. */
  beat: number;
  period: number;
  tone: number;
  /** A startled flash, easing away. */
  flash: number;
  /** 0.6 far and dim → 1 near. */
  depth: number;
  tentacles: Rope[];
  arms: Rope[];
  seed: number;
}

/** How hard the bell is squeezing at a point in its beat: a quick squeeze, then a long glide. */
const squeeze = (beat: number) => (beat < 0.3 ? Math.sin((beat / 0.3) * Math.PI) : 0);

/** How much of a cell a shape covers, from its signed distance in square units. */
const coverage = (d: number) => clamp(0.5 - d / 1.3, 0, 1);

function rope(links: number, rest: number, x: number, y: number): Rope {
  const r: Rope = {
    x: new Float32Array(links),
    y: new Float32Array(links),
    px: new Float32Array(links),
    py: new Float32Array(links),
    rest,
  };
  for (let i = 0; i < links; i++) {
    r.x[i] = r.px[i] = x;
    r.y[i] = r.py[i] = y + i * rest;
  }
  return r;
}

/**
 * Jellyfish in deep water. Each bell is a glassy dome, lit at its rim, with radial canals and
 * four soft gonads showing through; it squeezes to jet upward and relaxes to glide. Frilled oral
 * arms and long fine tentacles trail as ropes that sway and lag behind it. Marine snow drifts
 * past. The pointer is a current that pushes everything gently aside; a click startles nearby
 * jellyfish into a flash and a quick escape.
 */
export function createJellyfish(options: JellyfishOptions = {}): AsciiScene {
  const count = clamp(Math.round(options.count ?? 4), 1, 16);
  const colours = options.colors?.length
    ? options.colors
    : ['#5ee7ff', '#a78bfa', '#ff7ad9', '#ffc36b'];
  const snowDensity = options.snow ?? 12;
  let grid: AsciiGrid = { cols: 0, rows: 0, aspect: 2 };
  let width = 0;
  let height = 0;
  const jellies: Jelly[] = [];
  let snow: { x: number; y: number; seed: number }[] = [];
  let time = 0;
  let current = { x: 0, y: 0, active: false, vx: 0, vy: 0 };

  function populate() {
    jellies.length = 0;
    const base = Math.min(width, height);
    for (let k = 0; k < count; k++) {
      const depth = 0.6 + 0.4 * hash3(k, 2, 5);
      const radius = base * (0.075 + 0.055 * depth);
      const x = width * (0.1 + 0.8 * ((k + 0.5) / count) + (hash3(k, 3, 5) - 0.5) * 0.1);
      const y = height * (0.3 + 0.35 * hash3(k, 4, 5));
      const tentacles: Rope[] = [];
      for (let t = 0; t < TENTACLES; t++) {
        // Each a little different in length, so the ends don't line up.
        const rest = radius * (0.2 + 0.08 * hash3(k, t, 11));
        tentacles.push(rope(LINKS, rest, x, y));
      }
      const arms: Rope[] = [];
      for (let t = 0; t < ARMS; t++) arms.push(rope(ARM_LINKS, radius * 0.2, x, y));
      jellies.push({
        x,
        y,
        vx: 0,
        vy: 0,
        tilt: (hash3(k, 6, 5) - 0.5) * 0.6,
        radius,
        beat: hash3(k, 7, 5),
        period: 2.4 + hash3(k, 8, 5) * 1.4,
        tone: 1 + (k % colours.length),
        flash: 0,
        depth,
        tentacles,
        arms,
        seed: k * 13.7,
      });
    }
    // Far jellies first, so near ones pass in front.
    jellies.sort((a, b) => a.depth - b.depth);
    const n = Math.round(((grid.cols * grid.rows) / 1000) * snowDensity);
    snow = Array.from({ length: n }, (_, i) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      seed: i,
    }));
  }

  /** A point just inside the bell's margin, a share of the way across it (-1 → 1). */
  function margin(j: Jelly, across: number) {
    const half = j.radius * (1 - 0.18 * squeeze(j.beat));
    const ux = Math.cos(j.tilt);
    const uy = Math.sin(j.tilt);
    return { x: j.x + ux * half * across * 0.92, y: j.y + uy * half * across * 0.92 };
  }

  function stepRope(r: Rope, ax: number, ay: number, dt: number, sway: number) {
    r.x[0] = ax;
    r.y[0] = ay;
    r.px[0] = ax;
    r.py[0] = ay;
    const drag = Math.exp(-2.4 * dt);
    const n = r.x.length;
    for (let i = 1; i < n; i++) {
      const vx = (r.x[i]! - r.px[i]!) * drag;
      const vy = (r.y[i]! - r.py[i]!) * drag;
      r.px[i] = r.x[i]!;
      r.py[i] = r.y[i]!;
      // Water sways the strands more toward their ends; a little weight hangs them.
      // A slow wave travels down each strand, so it ripples rather than hangs.
      const flow =
        (noise3(i * 0.25 + sway, time * 0.5, sway) - 0.5) * (2 + (i / n) * 4) +
        Math.sin(i * 0.5 - time * 1.4 + sway) * (i / n) * 2.5;
      let fx = flow;
      let fy = 3.5;
      if (current.active) {
        const dx = r.x[i]! - current.x;
        const dy = r.y[i]! - current.y;
        const d2 = dx * dx + dy * dy;
        const reach = 14 * 14;
        if (d2 < reach) {
          const k = 1 - d2 / reach;
          fx += current.vx * k * 0.6 + (dx / Math.sqrt(d2 + 1)) * k * 10;
          fy += current.vy * k * 0.6 + (dy / Math.sqrt(d2 + 1)) * k * 10;
        }
      }
      // However hard the bell jerks, a strand only moves so far in a step.
      const cap = r.rest * 0.5;
      r.x[i] = r.x[i]! + clamp(vx, -cap, cap) + fx * dt * dt;
      r.y[i] = r.y[i]! + clamp(vy, -cap, cap) + fy * dt * dt;
    }
    // Pull each link back to its length, from the bell down, a few times over.
    for (let pass = 0; pass < 3; pass++) {
      for (let i = 1; i < n; i++) {
        const dx = r.x[i]! - r.x[i - 1]!;
        const dy = r.y[i]! - r.y[i - 1]!;
        const d = Math.hypot(dx, dy) || 1;
        const k = r.rest / d;
        r.x[i] = r.x[i - 1]! + dx * k;
        r.y[i] = r.y[i - 1]! + dy * k;
      }
    }
  }

  function swim(j: Jelly, dt: number) {
    const before = j.beat;
    j.beat = (j.beat + dt / j.period) % 1;
    const s = squeeze(j.beat);
    // The bell points up its own axis: (sin tilt, -cos tilt).
    const ax = Math.sin(j.tilt);
    const ay = -Math.cos(j.tilt);
    const thrust = s * 20 * (0.7 + j.depth * 0.5);
    j.vx += ax * thrust * dt;
    j.vy += ay * thrust * dt;
    // Between beats it sinks slowly.
    j.vy += 1.2 * dt;
    if (current.active) {
      const dx = j.x - current.x;
      const dy = j.y - current.y;
      const d = Math.hypot(dx, dy);
      if (d < 18 && d > 0.01) {
        j.vx += (dx / d) * (1 - d / 18) * 14 * dt + current.vx * 0.04 * dt;
        j.vy += (dy / d) * (1 - d / 18) * 14 * dt + current.vy * 0.04 * dt;
      }
    }
    // Jellies drift apart rather than through each other.
    for (const other of jellies) {
      if (other === j) continue;
      const dx = j.x - other.x;
      const dy = j.y - other.y;
      const d = Math.hypot(dx, dy);
      const room = (j.radius + other.radius) * 1.6;
      if (d < room && d > 0.01) {
        j.vx += (dx / d) * (1 - d / room) * 6 * dt;
        j.vy += (dy / d) * (1 - d / room) * 3 * dt;
      }
    }
    const drag = Math.exp(-1.3 * dt);
    j.vx *= drag;
    j.vy *= drag;
    j.x += j.vx * dt;
    j.y += j.vy * dt;

    // Steer by leaning: toward the middle when near a side, and over the top when it gets there.
    let lean = (noise3(j.seed, time * 0.08, 2) - 0.5) * 0.9;
    const m = j.radius * 2.5;
    if (j.x < m) lean += 0.6;
    if (j.x > width - m) lean -= 0.6;
    if (j.y < height * 0.18) lean += Math.sign(width / 2 - j.x || 1) * 0.5;
    j.tilt = approach(j.tilt, clamp(lean, -1.3, 1.3), 0.5, dt);
    // In the upper water it rests between beats and lets itself sink back down.
    if (j.y < height * 0.3 + j.radius && j.beat < before) j.beat = 0.35;
    if (j.y > height - j.radius) {
      j.y = height - j.radius;
      j.vy = Math.min(j.vy, 0);
    }
    j.flash = approach(j.flash, 0, 1.6, dt);

    for (let t = 0; t < TENTACLES; t++) {
      const at = margin(j, -1 + (2 * t) / (TENTACLES - 1));
      stepRope(j.tentacles[t]!, at.x, at.y, dt, j.seed + t);
    }
    for (let t = 0; t < ARMS; t++) {
      const at = margin(j, -0.4 + (0.8 * t) / (ARMS - 1));
      stepRope(j.arms[t]!, at.x, at.y, dt, j.seed + 20 + t);
    }
  }

  /** Brightness of a jelly: far ones are dimmer, and a fright lights it up. */
  const glowOf = (j: Jelly) => Math.min(1, 0.5 + j.depth * 0.5 + j.flash * 0.5);

  /** A tentacle: one fine strand of type, fading toward its end. */
  function drawTentacle(surface: GlyphSurface, r: Rope, j: Jelly) {
    const { aspect } = grid;
    const n = r.x.length;
    const glow = glowOf(j);
    for (let i = 1; i < n; i++) {
      const ax = r.x[i - 1]!;
      const ay = r.y[i - 1]!;
      const bx = r.x[i]!;
      const by = r.y[i]!;
      const fade = 1 - i / n;
      const g = stroke(bx - ax, by - ay);
      // Walk the link in steps smaller than a cell so the strand never breaks.
      const steps = Math.max(1, Math.ceil(Math.hypot(bx - ax, (by - ay) / aspect) * 1.5));
      for (let k = 0; k < steps; k++) {
        const t = k / steps;
        const x = ax + (bx - ax) * t;
        const y = (ay + (by - ay) * t) / aspect;
        surface.put(x, y, g, j.tone, (0.08 + 0.6 * fade) * glow);
      }
    }
  }

  /** An oral arm: a frilled ribbon, widest near the bell, its edges rippling. */
  function drawArm(surface: GlyphSurface, r: Rope, j: Jelly, which: number) {
    const { aspect } = grid;
    const n = r.x.length;
    const glow = glowOf(j);
    for (let i = 1; i < n; i++) {
      const ax = r.x[i - 1]!;
      const ay = r.y[i - 1]!;
      const tx = r.x[i]! - ax;
      const ty = r.y[i]! - ay;
      const tl = Math.hypot(tx, ty) || 1;
      const steps = Math.max(1, Math.ceil(tl * 1.2));
      for (let k = 0; k < steps; k++) {
        const t = k / steps;
        const along = (i - 1 + t) / (n - 1);
        const frill = 0.75 + 0.45 * Math.sin(along * 14 - time * 2.2 + which * 1.7);
        const half = j.radius * 0.08 * (1 - along * 0.5) * frill + 0.3;
        const fade = 1 - along * 0.85;
        const cx = ax + tx * t;
        const cy = ay + ty * t;
        for (let o = -half; o <= half; o += 0.7) {
          const x = cx - (ty / tl) * o;
          const y = (cy + (tx / tl) * o) / aspect;
          const edge = Math.abs(o) / half;
          if (edge < 0.6) {
            surface.fill(x, y, j.tone, (0.06 + 0.14 * fade) * glow);
            surface.put(x, y, stroke(tx, ty), j.tone, (0.3 + 0.45 * fade) * glow);
          } else {
            surface.put(x, y, ramp(EDGE, 1 - edge), j.tone, (0.3 + 0.4 * fade) * glow);
          }
        }
      }
    }
  }

  function drawBell(surface: GlyphSurface, j: Jelly) {
    const { aspect, cols, rows } = grid;
    const s = squeeze(j.beat);
    const half = j.radius * (1 - 0.18 * s);
    const tall = j.radius * (1 + 0.3 * s);
    const glow = glowOf(j);
    const cos = Math.cos(j.tilt);
    const sin = Math.sin(j.tilt);
    const reach = Math.max(half, tall) * 1.5;
    const c0 = Math.max(0, Math.floor(j.x - reach));
    const c1 = Math.min(cols - 1, Math.ceil(j.x + reach));
    const r0 = Math.max(0, Math.floor((j.y - reach) / aspect));
    const r1 = Math.min(rows - 1, Math.ceil((j.y + reach) / aspect));
    const size = Math.min(half, tall);
    for (let row = r0; row <= r1; row++) {
      for (let col = c0; col <= c1; col++) {
        const dx = col + 0.5 - j.x;
        const dy = (row + 0.5) * aspect - j.y;
        // Into the bell's frame: u across, w up from the margin, both scaled to the bell.
        const u = (dx * cos + dy * sin) / half;
        const w = (dx * sin - dy * cos) / tall;
        if (w < -0.2) continue;
        const e = Math.hypot(u, Math.max(0, w));
        const dome = coverage((e - 1) * size);
        if (dome <= 0.05) {
          // A soft halo of light in the water around it.
          const halo = 1 - (e - 1) / 0.35;
          if (halo > 0 && w > 0 && hash3(col, row, 3) < halo * 0.35)
            surface.put(col, row, DOT, j.tone, halo * 0.3 * glow);
          continue;
        }
        // The underside arcs up into the bell: through it, the inside of the dome shows faintly.
        const mouth = 0.2 * (1 - u * u);
        const c = Math.min(dome, coverage((mouth - w) * tall));
        if (c <= 0.05) continue;
        if (c < 0.55) {
          surface.put(col, row, ramp(EDGE, c * 2), j.tone, 0.75 * glow);
          continue;
        }
        // Glassy: the rim glows where the dome turns away from you, and the middle is clear.
        const rim = Math.pow(clamp(e, 0, 1), 5);
        const angle = Math.atan2(u, w + 0.25);
        const canal = Math.abs(Math.sin(angle * 8)) < 0.2 && e > 0.3 && e < 0.92;
        // Four soft gonads in a ring around the middle.
        const ring = 1 - Math.abs(e - 0.45) / 0.14;
        const gonad = ring > 0 && Math.cos(Math.atan2(w - 0.1, u) * 4 + 0.6) > 0.3 ? ring : 0;
        const sheen = Math.max(0, 1 - Math.hypot(u + 0.35, w - 0.62) / 0.3);
        const v = 0.1 + 0.55 * rim + 0.25 * gonad + 0.35 * sheen;
        surface.fill(col, row, j.tone, clamp(v, 0, 1) * glow);
        if (rim > 0.35) surface.put(col, row, ramp(RIM, rim), INK, (0.25 + 0.5 * rim) * glow);
        else if (sheen > 0.3) surface.put(col, row, '.', INK, 0.6 * glow);
        else if (canal) surface.put(col, row, stroke(u, -w), j.tone, 0.6 * glow);
      }
    }
  }

  return {
    palette: ['ink', ...colours],
    lineHeight: 0.9,
    settle: 4,
    resize(next) {
      grid = next;
      width = grid.cols;
      height = grid.rows * grid.aspect;
      populate();
      // Let the ropes fall into place before anyone sees them.
      for (let i = 0; i < 90; i++) for (const j of jellies) swim(j, 1 / 60);
    },
    step(dt, pointer: AsciiPointer) {
      if (!jellies.length) return;
      time += dt;
      const x = pointer.x;
      const y = pointer.y * grid.aspect;
      current = {
        x,
        y,
        active: pointer.active,
        vx:
          current.active && pointer.active ? approach(current.vx, (x - current.x) / dt, 8, dt) : 0,
        vy:
          current.active && pointer.active ? approach(current.vy, (y - current.y) / dt, 8, dt) : 0,
      };
      for (const j of jellies) swim(j, dt);
      for (const f of snow) {
        f.y += (0.8 + hash3(f.seed, 0, 1) * 1.2) * dt;
        f.x += (noise3(f.seed, time * 0.2, 4) - 0.5) * 2 * dt;
        if (current.active) {
          const dx = f.x - current.x;
          const dy = f.y - current.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 100) {
            f.x += (dx / Math.sqrt(d2 + 1)) * (1 - d2 / 100) * 8 * dt;
            f.y += (dy / Math.sqrt(d2 + 1)) * (1 - d2 / 100) * 8 * dt;
          }
        }
        if (f.y > height) {
          f.y = 0;
          f.x = Math.random() * width;
        }
      }
    },
    press(px, py) {
      const x = px;
      const y = py * grid.aspect;
      for (const j of jellies) {
        const d = Math.hypot(j.x - x, j.y - y);
        if (d > Math.min(width, height) * 0.5) continue;
        j.flash = 1;
        // Turn away and squeeze at once.
        j.tilt = clamp(Math.atan2(j.x - x, -(j.y - y)), -1.3, 1.3);
        j.beat = 0;
      }
    },
    draw(surface: GlyphSurface) {
      const { aspect } = grid;
      // Back to front: tentacles, then arms, then the bell over them, one jelly at a time.
      for (const j of jellies) {
        for (const t of j.tentacles) drawTentacle(surface, t, j);
        j.arms.forEach((arm, k) => drawArm(surface, arm, j, k));
        drawBell(surface, j);
      }
      for (const f of snow) {
        if (surface.filled(f.x, f.y / aspect)) continue;
        const twinkle = 0.5 + 0.5 * Math.sin(time * 1.3 + f.seed);
        surface.put(f.x, f.y / aspect, DOT, INK, 0.12 + 0.2 * twinkle);
      }
    },
  };
}
