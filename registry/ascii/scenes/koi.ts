import { ramp, stroke } from '../engine/glyphs';
import { approach, clamp, hash3, noise3, smoothstep } from '../engine/noise';
import { DOT, type GlyphSurface } from '../engine/surface';
import type { AsciiGrid, AsciiPointer, AsciiScene } from '../engine/types';

export interface KoiOptions {
  /** How many koi. Default 4. */
  count?: number;
  /** How many lily pads float on the pond. Default 3. */
  pads?: number;
  /** Size of the koi, relative to the pond. Default 1. */
  size?: number;
}

const WHITE = 0;
const RED = 1;
const BLACK = 2;
const GOLD = 3;
const SLATE = 4;
const WATER = 5;
const LEAF = 6;
const LEAF_DARK = 7;
const FOOD = 8;
/** The dark of deep water, for glyphs cut into solid blocks. */
const DEEP = 9;

/** Koi varieties, as their base colour and how their patches fall. */
type Variety = 'kohaku' | 'showa' | 'yamabuki' | 'asagi';
const VARIETIES: Variety[] = ['kohaku', 'showa', 'yamabuki', 'kohaku', 'asagi'];

const NODES = 16;
// Glyphs cut into the scales: sparse where the light catches them, dense in shadow.
const SCALES = '.:-=+*#';
const EDGE = '.:';
/** Light falls from the upper left and above: x, y (down) and z (toward the viewer). */
const LIGHT = [-0.45, -0.55, 0.7].map((v, _, a) => v / Math.hypot(...a));

interface Koi {
  nodes: Float32Array;
  length: number;
  heading: number;
  speed: number;
  phase: number;
  wander: number;
  variety: Variety;
  seed: number;
  /** A burst of speed after eating or a fright, easing away. */
  dash: number;
}

interface Pad {
  x: number;
  y: number;
  r: number;
  notch: number;
  spin: number;
  seed: number;
}

interface Pellet {
  x: number;
  y: number;
  age: number;
}

/**
 * How much of a cell a shape covers, from its signed distance in square units. Cells are about
 * twice as tall as wide, so the soft band is a little over a cell: edges step down through lighter
 * glyphs instead of ending in a hard staircase.
 */
const coverage = (d: number) => clamp(0.5 - d / 1.3, 0, 1);

/**
 * A koi pond seen from above. Each koi is a jointed body that bends as it swims: a blunt head,
 * deep shoulders, a narrow stem and a forked tail of fine rays, patterned as its own fish. The
 * water is a wave simulation, so wakes, splashes and the pointer all ripple it. Koi drift up to a
 * still pointer, as they do at the edge of a pond, and scatter from a quick one. A click scatters
 * food, and they come to eat it.
 */
export function createKoi(options: KoiOptions = {}): AsciiScene {
  const count = clamp(Math.round(options.count ?? 4), 1, 24);
  const padCount = clamp(Math.round(options.pads ?? 3), 0, 12);
  const sizeScale = options.size ?? 1;
  let grid: AsciiGrid = { cols: 0, rows: 0, aspect: 2 };
  let width = 0;
  let height = 0;
  let wave = new Float32Array(0);
  let last = new Float32Array(0);
  let cover = new Uint8Array(0);
  /** Cells under a lily pad this frame: koi swim beneath them. */
  let padMask = new Uint8Array(0);
  const fish: Koi[] = [];
  const pads: Pad[] = [];
  const food: Pellet[] = [];
  let time = 0;
  let px = 0;
  let py = 0;
  let pointerSpeed = 0;
  let pointerActive = false;
  // Spine with the swimming wave applied, reused each frame.
  const spine = new Float32Array(NODES * 2);

  const cellOf = (x: number, y: number) => {
    const col = Math.floor(x);
    const row = Math.floor(y / grid.aspect);
    if (col < 1 || row < 1 || col >= grid.cols - 1 || row >= grid.rows - 1) return -1;
    return row * grid.cols + col;
  };

  /** Pushes the water down at a point: a ripple starts there. */
  function disturb(x: number, y: number, amount: number) {
    const i = cellOf(x, y);
    if (i >= 0) wave[i] = wave[i]! - amount;
  }

  function populate() {
    fish.length = 0;
    pads.length = 0;
    food.length = 0;
    const base = Math.min(width, height) * 0.5 * sizeScale;
    for (let k = 0; k < count; k++) {
      const length = base * (0.8 + 0.4 * hash3(k, 1, 9));
      const heading = Math.random() * Math.PI * 2;
      const x = width * (0.15 + 0.7 * Math.random());
      const y = height * (0.15 + 0.7 * Math.random());
      const nodes = new Float32Array(NODES * 2);
      for (let i = 0; i < NODES; i++) {
        nodes[i * 2] = x - Math.cos(heading) * (length / (NODES - 1)) * i;
        nodes[i * 2 + 1] = y - Math.sin(heading) * (length / (NODES - 1)) * i;
      }
      fish.push({
        nodes,
        length,
        heading,
        speed: 4,
        phase: Math.random() * 10,
        wander: heading,
        variety: VARIETIES[k % VARIETIES.length]!,
        seed: k * 7.31 + 3,
        dash: 0,
      });
    }
    for (let k = 0; k < padCount; k++) {
      // Of a handful of spots, the one furthest from the pads already floating.
      let x = 0;
      let y = 0;
      let room = -1;
      for (let t = 0; t < 12; t++) {
        const cx = width * (0.1 + 0.8 * hash3(k, t, 4));
        const cy = height * (0.1 + 0.8 * hash3(k, t, 5));
        let near = Infinity;
        for (const pad of pads) near = Math.min(near, Math.hypot(pad.x - cx, pad.y - cy));
        if (near > room) {
          room = near;
          x = cx;
          y = cy;
        }
      }
      pads.push({
        x,
        y,
        r: Math.min(width, height) * (0.075 + 0.035 * hash3(k, 6, 1)),
        notch: hash3(k, 7, 1) * Math.PI * 2,
        spin: (hash3(k, 8, 1) - 0.5) * 0.04,
        seed: k,
      });
    }
  }

  function steer(koi: Koi, dt: number) {
    const hx = koi.nodes[0]!;
    const hy = koi.nodes[1]!;
    koi.wander += (noise3(koi.seed, time * 0.25, 1) - 0.5) * 2.4 * dt;
    let dx = Math.cos(koi.wander);
    let dy = Math.sin(koi.wander);
    let cruise = 4.5;

    // Keep to the pond, turning well before the edge.
    const margin = koi.length * 0.7;
    if (hx < margin) dx += ((margin - hx) / margin) * 2.5;
    if (hx > width - margin) dx -= ((hx - width + margin) / margin) * 2.5;
    if (hy < margin) dy += ((margin - hy) / margin) * 2.5;
    if (hy > height - margin) dy -= ((hy - height + margin) / margin) * 2.5;

    // Give each other room: steer clear of every part of another koi's body, not only its middle,
    // so they pass alongside rather than through one another.
    for (const other of fish) {
      if (other === koi) continue;
      const room = koi.length * 0.12 + other.length * 0.2;
      for (let i = 0; i < NODES; i += 3) {
        const ox = hx - other.nodes[i * 2]!;
        const oy = hy - other.nodes[i * 2 + 1]!;
        const d = Math.hypot(ox, oy);
        if (d < room && d > 1e-3) {
          dx += (ox / d) * (1 - d / room) * 3;
          dy += (oy / d) * (1 - d / room) * 3;
        }
      }
    }

    // Food draws them in; the nearest pellet wins.
    let best: Pellet | null = null;
    let bestD = Math.min(width, height) * 0.8;
    for (const pellet of food) {
      const d = Math.hypot(pellet.x - hx, pellet.y - hy);
      if (d < bestD) {
        bestD = d;
        best = pellet;
      }
    }
    if (best) {
      dx += ((best.x - hx) / (bestD + 1e-3)) * 3;
      dy += ((best.y - hy) / (bestD + 1e-3)) * 3;
      cruise = 8;
      if (bestD < koi.length * 0.08 + 1) {
        food.splice(food.indexOf(best), 1);
        disturb(best.x, best.y, 2.2);
        koi.dash = 1;
      }
    } else if (pointerActive) {
      const ox = px - hx;
      const oy = py - hy;
      const d = Math.hypot(ox, oy);
      if (pointerSpeed > 40 && d < koi.length * 0.9) {
        // A quick hand over the water: dart away.
        dx -= (ox / d) * 4;
        dy -= (oy / d) * 4;
        koi.dash = 1;
      } else if (pointerSpeed < 8 && d < Math.min(width, height) * 0.6 && d > koi.length * 0.25) {
        // A still hand at the edge of the pond: drift up and wait.
        dx += (ox / d) * 1.2;
        dy += (oy / d) * 1.2;
        cruise = 3;
      }
    }

    const want = Math.atan2(dy, dx);
    let turn = want - koi.heading;
    turn = Math.atan2(Math.sin(turn), Math.cos(turn));
    const maxTurn = (1.3 + koi.dash * 2.2) * dt;
    koi.heading += clamp(turn, -maxTurn, maxTurn);
    koi.wander = approach(koi.wander, koi.heading, 0.6, dt);
    koi.dash = approach(koi.dash, 0, 1.4, dt);
    koi.speed = approach(koi.speed, cruise + koi.dash * 10, 2, dt);
  }

  function swim(koi: Koi, dt: number) {
    const { nodes } = koi;
    nodes[0] = nodes[0]! + Math.cos(koi.heading) * koi.speed * dt;
    nodes[1] = nodes[1]! + Math.sin(koi.heading) * koi.speed * dt;
    const seg = koi.length / (NODES - 1);
    for (let i = 1; i < NODES; i++) {
      const dx = nodes[i * 2]! - nodes[(i - 1) * 2]!;
      const dy = nodes[i * 2 + 1]! - nodes[(i - 1) * 2 + 1]!;
      const d = Math.hypot(dx, dy) || 1;
      nodes[i * 2] = nodes[(i - 1) * 2]! + (dx / d) * seg;
      nodes[i * 2 + 1] = nodes[(i - 1) * 2 + 1]! + (dy / d) * seg;
    }
    koi.phase += dt * (2 + koi.speed * 0.45);
    // The tail sweeps the water as it beats.
    const tail = (NODES - 1) * 2;
    disturb(nodes[tail]!, nodes[tail + 1]!, Math.sin(koi.phase) * 0.12 * (0.4 + koi.speed / 8));
  }

  /** The spine as drawn: the swimming wave bends the back half of the body. */
  function bend(koi: Koi) {
    const { nodes, length } = koi;
    for (let i = 0; i < NODES; i++) {
      const s = i / (NODES - 1);
      const a = Math.max(0, i - 1);
      const b = Math.min(NODES - 1, i + 1);
      const tx = nodes[b * 2]! - nodes[a * 2]!;
      const ty = nodes[b * 2 + 1]! - nodes[a * 2 + 1]!;
      const tl = Math.hypot(tx, ty) || 1;
      const sway = Math.sin(koi.phase - s * 4.2) * Math.pow(s, 1.8) * length * 0.06;
      spine[i * 2] = nodes[i * 2]! - (ty / tl) * sway;
      spine[i * 2 + 1] = nodes[i * 2 + 1]! + (tx / tl) * sway;
    }
  }

  /** Half the body's width at a point along it, as a share of its length. */
  function halfWidth(s: number) {
    // A round, blunt head...
    if (s < 0.1) return 0.105 * Math.sqrt(Math.max(0, 1 - Math.pow((0.1 - s) / 0.1, 2)));
    // ...deep shoulders...
    if (s < 0.3) return 0.105 + 0.025 * smoothstep(0.1, 0.3, s);
    // ...and a long taper to a narrow stem.
    return 0.03 + 0.1 * Math.pow(1 - smoothstep(0.3, 1, s), 1.15);
  }

  function colourOf(koi: Koi, s: number, across: number): number {
    // Large, soft-edged patches, as on a real koi.
    const n1 = noise3(s * 3.2 + koi.seed, across * 0.9, koi.seed);
    const n2 = noise3(s * 4 - koi.seed, across * 1.1 + 4, koi.seed * 2);
    switch (koi.variety) {
      case 'kohaku':
        // A red cap on the head is the classic mark.
        if (s > 0.03 && s < 0.17 && Math.abs(across) < 0.75) return RED;
        return n1 > 0.5 && s > 0.22 && s < 0.85 ? RED : WHITE;
      case 'showa':
        if (n2 > 0.62) return WHITE;
        return n1 > 0.46 ? RED : BLACK;
      case 'yamabuki':
        return GOLD;
      case 'asagi':
        return Math.abs(across) > 0.7 || s < 0.08 ? RED : SLATE;
    }
  }

  /** Fins carry the body's lightest colour. */
  function finTone(koi: Koi) {
    return koi.variety === 'yamabuki' ? GOLD : koi.variety === 'asagi' ? SLATE : WHITE;
  }

  function drawKoi(surface: GlyphSurface, koi: Koi) {
    bend(koi);
    const { length } = koi;
    const { aspect, cols, rows } = grid;
    const n = NODES - 1;
    // The tail hangs off the narrow stem and swings further round than the body, like silk.
    const ex = spine[n * 2]! - spine[(n - 1) * 2]!;
    const ey = spine[n * 2 + 1]! - spine[(n - 1) * 2 + 1]!;
    const el = Math.hypot(ex, ey) || 1;
    const flick = Math.sin(koi.phase - 4.6) * 0.45;
    const tx = (ex / el) * Math.cos(flick) - (ey / el) * Math.sin(flick);
    const ty = (ex / el) * Math.sin(flick) + (ey / el) * Math.cos(flick);
    const tailX = spine[n * 2]! - tx * length * 0.03;
    const tailY = spine[n * 2 + 1]! - ty * length * 0.03;
    const tailLen = length * 0.3;
    const tailSpread = length * 0.13;
    // Pectoral fins, set just behind the head, flapping a little out of time with each other.
    const finS = 0.24;
    const fk = Math.round(finS * n);
    const bx = spine[(fk + 1) * 2]! - spine[(fk - 1) * 2]!;
    const by = spine[(fk + 1) * 2 + 1]! - spine[(fk - 1) * 2 + 1]!;
    const bl = Math.hypot(bx, by) || 1;
    // Backward along the body.
    const back = Math.atan2(-by, -bx);
    const finLen = length * 0.17;
    const root = halfWidth(finS) * length * 0.8;
    const fins = [1, -1].map((side) => {
      const flap = Math.sin(koi.phase * 0.5 + (side > 0 ? 0 : 1.7));
      return {
        x: spine[fk * 2]! - (by / bl) * side * root,
        y: spine[fk * 2 + 1]! + (bx / bl) * side * root,
        angle: back - side * (1 + 0.25 * flap),
      };
    });

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < NODES; i++) {
      minX = Math.min(minX, spine[i * 2]!);
      maxX = Math.max(maxX, spine[i * 2]!);
      minY = Math.min(minY, spine[i * 2 + 1]!);
      maxY = Math.max(maxY, spine[i * 2 + 1]!);
    }
    const reach = length * 0.36;
    const c0 = Math.max(0, Math.floor(minX - reach));
    const c1 = Math.min(cols - 1, Math.ceil(maxX + reach));
    const r0 = Math.max(0, Math.floor((minY - reach) / aspect));
    const r1 = Math.min(rows - 1, Math.ceil((maxY + reach) / aspect));
    const fin = finTone(koi);

    for (let row = r0; row <= r1; row++) {
      const y = (row + 0.5) * aspect;
      for (let col = c0; col <= c1; col++) {
        const x = col + 0.5;
        const i = row * cols + col;
        if (padMask[i]) continue;
        // Nearest point on the spine: how far along (s) and how far to the side (v).
        let bestD = Infinity;
        let bestS = 0;
        let bestV = 0;
        let nx = 0;
        let ny = 0;
        for (let k = 0; k < n; k++) {
          const ax = spine[k * 2]!;
          const ay = spine[k * 2 + 1]!;
          const sx = spine[(k + 1) * 2]! - ax;
          const sy = spine[(k + 1) * 2 + 1]! - ay;
          const len2 = sx * sx + sy * sy || 1;
          const t = clamp(((x - ax) * sx + (y - ay) * sy) / len2, 0, 1);
          const qx = ax + sx * t - x;
          const qy = ay + sy * t - y;
          const d = qx * qx + qy * qy;
          if (d < bestD) {
            bestD = d;
            bestS = (k + t) / n;
            bestV = Math.sign(sx * (y - ay) - sy * (x - ax)) * Math.sqrt(d);
            nx = -sy;
            ny = sx;
          }
        }
        const hw = halfWidth(bestS) * length;
        const body = coverage(Math.abs(bestV) - hw);
        if (body > 0.05) {
          const across = clamp(bestV / Math.max(hw, 0.5), -1, 1);
          // The body is a rounded back lit from one side: one flank catches the light, the other
          // falls into shadow, and a sheen runs along the ridge.
          const nl = Math.hypot(nx, ny) || 1;
          const round = Math.sqrt(1 - across * across);
          const lit =
            ((nx / nl) * across * LIGHT[0]! + (ny / nl) * across * LIGHT[1]! + round * LIGHT[2]!) *
              0.5 +
            0.5;
          const light = smoothstep(0.25, 0.95, lit);
          const tone = colourOf(koi, bestS, across);
          cover[i] = 1;
          if (body < 0.55) {
            // The soft edge of the silhouette: a light glyph, no block.
            surface.put(col, row, ramp(EDGE, body * 2), tone, 0.35 + 0.6 * light);
            continue;
          }
          surface.fill(col, row, tone, 0.4 + 0.6 * light);
          // The sheen along the back is left clean; scales show where the light falls away.
          if (light < 0.8) surface.put(col, row, ramp(SCALES, 1 - light), DEEP, 0.4 + 0.4 * light);
          continue;
        }

        // The tail: a fan of fine rays from the stem, its trailing edge forked into two lobes.
        const dx = x - tailX;
        const dy = y - tailY;
        const along = dx * tx + dy * ty;
        if (along > 0 && along < tailLen * 1.05) {
          const side = Math.abs(-dx * ty + dy * tx);
          const k = along / tailLen;
          const spread = length * 0.025 + tailSpread * Math.pow(k, 0.8);
          // The fork: the middle of the trailing edge falls short of the lobes' tips.
          const tip = tailLen * (0.62 + 0.38 * Math.min(1, (side / tailSpread) * 1.1));
          const c = Math.min(coverage(side - spread), coverage(along - tip));
          if (c > 0.1) {
            // A sheer membrane with rays running through it.
            // Sheer, fading toward its edge, with fine rays running through it.
            const ray = Math.abs(Math.sin(Math.atan2(side, along) * 7)) < 0.4;
            surface.put(
              col,
              row,
              ray && c > 0.5 ? stroke(dx, dy) : ramp(EDGE, c * 2),
              fin,
              (0.3 + 0.5 * (1 - k)) * (0.4 + 0.6 * c),
            );
            cover[i] = 1;
            continue;
          }
        }

        for (const f of fins) {
          const ox = x - f.x;
          const oy = y - f.y;
          const r = Math.hypot(ox, oy);
          if (r > finLen * 1.1) continue;
          let off = Math.atan2(oy, ox) - f.angle;
          off = Math.atan2(Math.sin(off), Math.cos(off));
          // A rounded paddle, swept back along the body.
          const reachAt = finLen * Math.sqrt(Math.max(0, 1 - Math.pow(off / 0.5, 2)));
          const c = coverage(r - reachAt);
          if (c > 0.1) {
            const ray = Math.abs(Math.sin(off * 6)) < 0.45;
            surface.put(
              col,
              row,
              ray && c > 0.5 ? stroke(ox, oy) : ramp(EDGE, c * 2),
              fin,
              (0.3 + 0.45 * (1 - r / finLen)) * (0.4 + 0.6 * c),
            );
            cover[i] = 1;
            break;
          }
        }
      }
    }
  }

  /** One dark cell each side of the head, where the eyes sit wide apart. */
  function drawEyes(surface: GlyphSurface, koi: Koi) {
    const at = 0.07 * (NODES - 1);
    const k = Math.floor(at);
    const t = at - k;
    const x = spine[k * 2]! + (spine[(k + 1) * 2]! - spine[k * 2]!) * t;
    const y = spine[k * 2 + 1]! + (spine[(k + 1) * 2 + 1]! - spine[k * 2 + 1]!) * t;
    const dx = spine[(k + 1) * 2]! - spine[k * 2]!;
    const dy = spine[(k + 1) * 2 + 1]! - spine[k * 2 + 1]!;
    const d = Math.hypot(dx, dy) || 1;
    const out = halfWidth(0.07) * koi.length * 0.6;
    for (const side of [1, -1]) {
      const col = Math.floor(x - (dy / d) * side * out);
      const row = Math.floor((y + (dx / d) * side * out) / grid.aspect);
      if (col < 0 || row < 0 || col >= grid.cols || row >= grid.rows) continue;
      if (padMask[row * grid.cols + col]) continue;
      surface.fill(col, row, DEEP, 1);
      surface.put(col, row, DOT, WHITE, 0.5);
    }
  }

  function drawPads(surface: GlyphSurface) {
    const { cols, rows, aspect } = grid;
    for (const pad of pads) {
      const r0 = Math.max(0, Math.floor((pad.y - pad.r - 1) / aspect));
      const r1 = Math.min(rows - 1, Math.ceil((pad.y + pad.r + 1) / aspect));
      const c0 = Math.max(0, Math.floor(pad.x - pad.r - 1));
      const c1 = Math.min(cols - 1, Math.ceil(pad.x + pad.r + 1));
      const turn = pad.notch + time * pad.spin;
      for (let row = r0; row <= r1; row++) {
        for (let col = c0; col <= c1; col++) {
          const dx = col + 0.5 - pad.x;
          const dy = (row + 0.5) * aspect - pad.y;
          const d = Math.hypot(dx, dy);
          let c = coverage(d - pad.r);
          if (c <= 0.1) continue;
          let off = Math.atan2(dy, dx) - turn;
          off = Math.atan2(Math.sin(off), Math.cos(off));
          // The notch: a wedge cut to the centre.
          c = Math.min(c, coverage((Math.abs(off) - 0.22) * -d));
          if (c <= 0.1) continue;
          cover[row * cols + col] = 1;
          // Veins radiate from the centre; the leaf is lit a touch more toward its middle.
          const vein = Math.abs(Math.sin(off * 3.5)) < 0.12 && d > pad.r * 0.2 && d < pad.r - 1;
          const lit = 1 - (d / pad.r) * 0.35;
          if (c < 0.55) {
            surface.put(col, row, ramp(EDGE, c * 2), LEAF, 0.7);
            continue;
          }
          surface.fill(col, row, LEAF_DARK, 0.3 + 0.3 * lit);
          if (vein) surface.put(col, row, stroke(dx, dy), LEAF, 0.45);
        }
      }
    }
  }

  function drawWater(surface: GlyphSurface) {
    const { cols, rows } = grid;
    for (let row = 1; row < rows - 1; row++) {
      for (let col = 1; col < cols - 1; col++) {
        const i = row * cols + col;
        if (cover[i]) continue;
        // Light catches the slopes of the ripples.
        const gx = wave[i + 1]! - wave[i - 1]!;
        const gy = wave[i + cols]! - wave[i - cols]!;
        const lit = gx * 0.8 - gy * 0.6;
        const a = Math.abs(lit);
        if (a > 0.05) {
          surface.put(
            col,
            row,
            a > 0.4 ? '~' : a > 0.18 ? '-' : '.',
            WATER,
            clamp(0.25 + a * 1.4, 0, 1),
          );
          continue;
        }
        // Still water: faint flecks of light that drift and fade.
        const fleck = hash3(col, row, 21);
        if (fleck < 0.04) {
          const glint = noise3(col * 0.12, row * 0.2, time * 0.3);
          if (glint > 0.55) surface.put(col, row, DOT, WATER, (glint - 0.55) * 1.6);
        }
      }
    }
  }

  function propagate() {
    // A wave equation with true distances: cells are taller than they are wide.
    const { cols, rows, aspect } = grid;
    const cx = 0.45;
    const cy = 0.45 / (aspect * aspect);
    for (let row = 1; row < rows - 1; row++) {
      for (let col = 1; col < cols - 1; col++) {
        const i = row * cols + col;
        const h = wave[i]!;
        const next =
          2 * h -
          last[i]! +
          cx * (wave[i - 1]! + wave[i + 1]! - 2 * h) +
          cy * (wave[i - cols]! + wave[i + cols]! - 2 * h);
        last[i] = next * 0.985;
      }
    }
    [wave, last] = [last, wave];
  }

  return {
    palette: [
      '#f4efe6',
      '#ff5a36',
      '#3d414f',
      '#f4b53f',
      '#86a0c8',
      '#5f8fd6',
      '#7cc47f',
      '#2f6b45',
      '#e9b25b',
      '#0b0c10',
    ],
    lineHeight: 0.9,
    settle: 3,
    resize(next) {
      grid = next;
      width = grid.cols;
      height = grid.rows * grid.aspect;
      wave = new Float32Array(grid.cols * grid.rows);
      last = new Float32Array(grid.cols * grid.rows);
      cover = new Uint8Array(grid.cols * grid.rows);
      padMask = new Uint8Array(grid.cols * grid.rows);
      populate();
    },
    step(dt, pointer: AsciiPointer) {
      if (!grid.cols) return;
      time += dt;
      const nx = pointer.x;
      const ny = pointer.y * grid.aspect;
      const moved = pointerActive && pointer.active ? Math.hypot(nx - px, ny - py) / dt : 0;
      pointerSpeed = approach(pointerSpeed, moved, 10, dt);
      pointerActive = pointer.active;
      if (pointer.active && moved > 2) disturb(nx, ny, Math.min(0.6, moved * 0.004));
      px = nx;
      py = ny;

      for (const koi of fish) {
        steer(koi, dt);
        swim(koi, dt);
      }
      for (let k = food.length - 1; k >= 0; k--) {
        food[k]!.age += dt;
        if (food[k]!.age > 9) food.splice(k, 1);
      }
      for (const pad of pads) {
        // Pads drift on the pond's slow current.
        pad.x += (noise3(pad.seed, time * 0.05, 3) - 0.5) * 0.4 * dt;
        pad.y += (noise3(pad.seed, time * 0.05, 8) - 0.5) * 0.4 * dt;
      }
      propagate();
    },
    press(x, y) {
      const cx = x;
      const cy = y * grid.aspect;
      disturb(cx, cy, 3);
      for (let k = 0; k < 6; k++) {
        food.push({ x: cx + (Math.random() - 0.5) * 7, y: cy + (Math.random() - 0.5) * 7, age: 0 });
      }
    },
    draw(surface: GlyphSurface) {
      cover.fill(0);
      // Pads float above the koi, so they claim their cells first.
      drawPads(surface);
      padMask.set(cover);
      for (const koi of fish) {
        drawKoi(surface, koi);
        drawEyes(surface, koi);
      }
      for (const pellet of food) {
        const fade = 1 - pellet.age / 9;
        const col = Math.floor(pellet.x);
        const row = Math.floor(pellet.y / grid.aspect);
        if (!padMask[row * grid.cols + col]) surface.put(col, row, 'o', FOOD, fade);
      }
      drawWater(surface);
    },
  };
}
