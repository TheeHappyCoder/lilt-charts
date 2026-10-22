import { ramp, stroke } from '../engine/glyphs';
import { approach, clamp, hash3, noise3, smoothstep } from '../engine/noise';
import { DOT, type GlyphSurface } from '../engine/surface';
import type { AsciiGrid, AsciiPointer, AsciiScene } from '../engine/types';
import { coverage, gradient } from './shared';

export interface LavaOptions {
  /** Colours of the wax from cool to hot. Default violet to rose, with a warm highlight. */
  colors?: readonly string[];
  /** How many blobs of wax. Default 6. */
  count?: number;
  /** Draw the lamp's glass, cap and base around the wax; off fills the whole canvas. Default true. */
  lamp?: boolean;
}

const INK = 0;
const DEEP = 1;
/** The wax colours start here, cool to hot. */
const WAX = 2;
const STEPS = 10;
const MAX_EXTRA = 4;

/** Glyphs cut into the wax where it turns from the light. */
const CUT = '.:-';
const EDGE = '.:';
/** Light from the upper left and in front. */
const LIGHT = [-0.45, -0.55, 0.7].map((v, _, a) => v / Math.hypot(...a));
/** The level of the field the wax's surface sits at. */
const ISO = 0.3;
/** A blob's visible radius is this share of its field's reach. */
const REACH = 1 / 0.575;

interface Blob {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Visible radius at rest, in square units. */
  r: number;
  /** 0 cold → 1 hot. Hot wax rises; cold wax sinks. */
  heat: number;
  /** Grows when the pointer warms it. */
  swell: number;
  seed: number;
  /** 1 while alive; a blob that was clicked in beyond the limit shrinks away. */
  life: number;
  dying: boolean;
}

/**
 * A lava lamp. Blobs of wax warm on the lamp's base and rise, cool at the top and sink, merging
 * as they pass and pinching apart again. The wax is drawn as one smooth field: solid blocks lit
 * as if it were round, cut with darker glyphs where it turns from the light, with soft edges, and
 * its glow lights the liquid around it. The pointer warms the wax near it, so it swells and
 * rises; a click drops in a new blob.
 */
export function createLava(options: LavaOptions = {}): AsciiScene {
  const stops = options.colors?.length ? options.colors : ['#6a4cff', '#e5489c', '#ffb36b'];
  const count = clamp(Math.round(options.count ?? 6), 1, 16);
  const lamp = options.lamp ?? true;
  let grid: AsciiGrid = { cols: 0, rows: 0, aspect: 2 };
  let width = 0;
  let height = 0;
  const blobs: Blob[] = [];
  let time = 0;
  let px = 0;
  let py = 0;
  let warmth = 0;
  // The vessel, in square units: the glass runs from `top` to `bottom` around `cx`.
  let cx = 0;
  let top = 0;
  let bottom = 0;
  let wide = 0;
  let unit = 1;

  /** Half the glass's width at a height: narrow at the top, widest low down. */
  function halfWidth(y: number) {
    if (!lamp) return width / 2;
    const t = clamp((y - top) / (bottom - top), 0, 1);
    return wide * (0.5 + 0.5 * smoothstep(0, 0.78, t)) * (1 - 0.12 * smoothstep(0.86, 1, t));
  }

  function layout() {
    width = grid.cols;
    height = grid.rows * grid.aspect;
    cx = width / 2;
    if (lamp) {
      top = height * 0.12;
      bottom = height * 0.8;
      wide = Math.min(height * 0.27, width * 0.42);
    } else {
      top = 0;
      bottom = height;
      wide = width / 2;
    }
    // The size of things: blobs scale with the vessel.
    unit = lamp ? wide : Math.min(width, height) * 0.36;
  }

  function makeBlob(k: number, x?: number, y?: number): Blob {
    const r = unit * (0.2 + 0.14 * hash3(k, 3, 1));
    const yy = y ?? top + (bottom - top) * (0.15 + 0.7 * hash3(k, 4, 1));
    const half = halfWidth(yy) - r * 0.7;
    return {
      x: x ?? cx + (hash3(k, 5, 1) - 0.5) * 2 * Math.max(0, half),
      y: yy,
      vx: 0,
      vy: 0,
      r,
      heat: hash3(k, 6, 1),
      swell: 1,
      seed: k * 13.7 + 2,
      life: 1,
      dying: false,
    };
  }

  /** The wax pooled on the lamp's base: how far above the bottom its surface sits here. */
  const poolDepth = (x: number) =>
    (lamp ? unit : unit * 0.55) *
    (0.24 +
      0.18 * Math.max(0, 1 - ((x - cx) / (wide || 1)) ** 2) +
      0.12 * noise3(x * 0.12, time * 0.15, 4));

  /** The field at a point and its slope. */
  function field(x: number, y: number, out: Float32Array) {
    let f = 0;
    let gx = 0;
    let gy = 0;
    let hot = 0;
    for (const b of blobs) {
      const reach = b.r * b.swell * b.life * REACH;
      const dx = x - b.x;
      const dy = y - b.y;
      const q = (dx * dx + dy * dy) / (reach * reach);
      if (q >= 1) continue;
      const k = 1 - q;
      const v = k * k * k;
      f += v;
      hot += v * b.heat;
      // d/dx of (1 - q)³ = -3 (1 - q)² · 2 dx / reach².
      const s = (-6 * k * k) / (reach * reach);
      gx += s * dx;
      gy += s * dy;
    }
    // The pool: a band along the bottom that the field rises toward.
    const pr = poolDepth(x) * REACH;
    const above = bottom - y;
    if (above < pr) {
      const q = Math.max(0, above / pr) ** 2;
      const k = 1 - q;
      const v = k * k * k;
      f += v;
      hot += v * 0.7;
      gy += (6 * k * k * Math.max(0, above)) / (pr * pr);
    }
    out[0] = f;
    out[1] = gx;
    out[2] = gy;
    out[3] = f > 0 ? hot / f : 0;
  }

  const sample = new Float32Array(4);

  return {
    palette: ['ink', '#0c0a14', ...gradient(stops, STEPS)],
    lineHeight: 0.9,
    settle: 4,
    resize(next) {
      const same =
        next.cols === grid.cols && next.rows === grid.rows && next.aspect === grid.aspect;
      grid = next;
      if (same && blobs.length) return;
      layout();
      blobs.length = 0;
      for (let k = 0; k < count; k++) blobs.push(makeBlob(k));
    },
    step(dt, pointer: AsciiPointer) {
      if (!grid.cols) return;
      time += dt;
      warmth = approach(warmth, pointer.active ? 1 : 0, 3, dt);
      if (pointer.active) {
        px = pointer.x;
        py = pointer.y * grid.aspect;
      }
      const span = bottom - top;
      for (let i = blobs.length - 1; i >= 0; i--) {
        const b = blobs[i]!;
        if (!b.dying && b.life < 1) b.life = Math.min(1, b.life + dt * 1.5);
        if (b.dying) {
          b.life = approach(b.life, 0, 1.5, dt);
          if (b.life < 0.05) {
            blobs.splice(i, 1);
            continue;
          }
        }
        // The base heats the wax and the top cools it; between them it keeps its heat. So a warm
        // blob rises all the way up, lingers while it cools, and sinks all the way down again.
        const depth = (b.y - top) / span;
        const pace = 0.3 + 0.2 * hash3(Math.floor(b.seed), 1, 7);
        if (depth > 0.8) b.heat = Math.min(1, b.heat + pace * smoothstep(0.8, 0.97, depth) * dt);
        if (depth < 0.3) b.heat = Math.max(0, b.heat - pace * smoothstep(0.3, 0.1, depth) * dt);
        let swellTarget = 1;
        if (warmth > 0.01) {
          const d = Math.hypot(b.x - px, b.y - py);
          const near = clamp(1 - d / (b.r * 2.6), 0, 1) * warmth;
          b.heat = Math.min(1, b.heat + near * 0.9 * dt);
          swellTarget += near * 0.25;
        }
        b.swell = approach(b.swell, swellTarget, 2, dt);
        // Buoyancy: rise when hot, sink when cold, through thick liquid.
        const rise = (b.heat - 0.5) * span * 0.16;
        const wander = (noise3(b.seed, time * 0.08, 2) - 0.5) * unit * 0.25;
        b.vy = approach(b.vy, -rise, 0.9, dt);
        b.vx = approach(b.vx, wander, 0.6, dt);
        // Blobs give each other a little room, so they press together and part again.
        for (const o of blobs) {
          if (o === b) continue;
          const dx = b.x - o.x;
          const dy = b.y - o.y;
          const d = Math.hypot(dx, dy) || 1;
          const room = (b.r + o.r) * 0.75;
          if (d < room) {
            b.vx += (dx / d) * (room - d) * 1.2 * dt;
            b.vy += (dy / d) * (room - d) * 0.6 * dt;
          }
        }
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        const r = b.r * b.swell;
        b.y = clamp(b.y, top + r * 0.55, bottom - r * 0.15);
        const half = Math.max(0, halfWidth(b.y) - r * 0.85);
        b.x = clamp(b.x, cx - half, cx + half);
      }
    },
    press(x, y) {
      const wx = x;
      const wy = clamp(y * grid.aspect, top + 1, bottom - 1);
      if (lamp && Math.abs(wx - cx) > halfWidth(wy)) return;
      const b = makeBlob(Math.floor(Math.random() * 1000), wx, wy);
      b.r *= 0.8;
      b.heat = 0.85;
      b.life = 0.2;
      blobs.push(b);
      // Over the limit, the oldest extra blob melts away.
      const alive = blobs.filter((o) => !o.dying);
      if (alive.length > count + MAX_EXTRA) alive[count]!.dying = true;
    },
    draw(surface: GlyphSurface) {
      const { cols, rows, aspect } = grid;
      if (!cols) return;

      for (let row = 0; row < rows; row++) {
        const y = (row + 0.5) * aspect;
        const inGlass = y > top && y < bottom;
        const half = halfWidth(y);
        for (let col = 0; col < cols; col++) {
          const x = col + 0.5;
          // Distance inside the glass, in square units.
          const inside = inGlass ? Math.min(half - Math.abs(x - cx), y - top, bottom - y) : -1;
          if (inside < 0) continue;
          field(x, y, sample);
          const f = sample[0]!;
          const gx = sample[1]!;
          const gy = sample[2]!;
          const hot = sample[3]!;
          const g = Math.hypot(gx, gy);
          // Signed distance to the surface, from the field and its slope.
          const d = g > 1e-4 ? (ISO - f) / g : f > ISO ? -9 : 9;
          const c = Math.min(coverage(d), lamp ? clamp(inside - 0.4, 0, 1) : 1);
          // Hotter wax and wax lower down glow warmer.
          const warm = clamp(hot * 0.7 + ((y - top) / (bottom - top)) * 0.25 - 0.05, 0, 1);
          const tone = WAX + Math.round(warm * (STEPS - 1));
          if (c > 0.05) {
            if (c < 0.55) {
              surface.put(col, row, ramp(EDGE, c * 2), tone, 0.5 + 0.4 * c);
              continue;
            }
            // A rounded body: the slope of the field tips the surface toward the edge.
            const s = 0.55 / Math.sqrt(Math.max(f - ISO, 0.02));
            const nx = -gx * s * unit * 0.25;
            const ny = -gy * s * unit * 0.25;
            const nl = Math.hypot(nx, ny, 1);
            const lit = (nx * LIGHT[0]! + ny * LIGHT[1]! + LIGHT[2]!) / nl;
            const light = smoothstep(0.05, 0.9, lit);
            // Light warms the colour as well as brightening it; shadow cools it.
            const shade = clamp(tone + Math.round((light - 0.6) * 4), WAX, WAX + STEPS - 1);
            surface.fill(col, row, shade, 0.45 + 0.55 * light);
            if (light < 0.5)
              surface.put(col, row, ramp(CUT, 1 - light / 0.5), DEEP, 0.3 + 0.3 * light);
            continue;
          }
          // The liquid, lit faintly by the wax near it.
          const glow = f / ISO;
          if (glow > 0.15 && hash3(col, row, 3) < glow * 0.5) {
            surface.put(col, row, DOT, tone, 0.08 + glow * 0.2);
          }
        }
      }
      if (lamp) drawLamp(surface);
    },
  };

  function drawLamp(surface: GlyphSurface) {
    const { rows, aspect } = grid;
    // The glass: its outline as strokes that follow the wall, and a highlight down one side.
    for (let row = 0; row < rows; row++) {
      const y = (row + 0.5) * aspect;
      if (y < top - aspect * 0.5 || y > bottom + aspect * 0.5) continue;
      const half = halfWidth(y);
      const slope = (halfWidth(y + 0.5) - halfWidth(y - 0.5)) / 1;
      for (const side of [-1, 1]) {
        const x = cx + side * (half + 0.4);
        surface.put(x, row, stroke(side * slope, 1), INK, 0.3);
        if (side < 0 && y > top + 2 && y < bottom - 2) {
          // A reflection of the room down the left of the glass.
          surface.put(cx - half * 0.72, row, ':', INK, 0.1);
        }
      }
    }
    // The cap and the base: solid metal, with a sheen down the left.
    const capTop = top - Math.max(aspect * 2, (bottom - top) * 0.12);
    const baseBottom = Math.min(rows * aspect - aspect * 0.5, bottom + (bottom - top) * 0.28);
    const waist = bottom + (baseBottom - bottom) * 0.35;
    for (let row = 0; row < rows; row++) {
      const y = (row + 0.5) * aspect;
      let half = -1;
      if (y >= capTop && y <= top) {
        half = halfWidth(top) * (0.62 + 0.42 * ((y - capTop) / (top - capTop)));
      } else if (y >= bottom && y <= baseBottom) {
        const w0 = halfWidth(bottom) * 1.04;
        half =
          y < waist
            ? w0 * (1 - 0.18 * ((y - bottom) / (waist - bottom)))
            : w0 * (0.82 + 0.5 * ((y - waist) / (baseBottom - waist)));
      }
      if (half < 0) continue;
      for (let col = Math.floor(cx - half - 1); col <= Math.ceil(cx + half + 1); col++) {
        const across = (col + 0.5 - cx) / half;
        const c = coverage((Math.abs(across) - 1) * half);
        if (c < 0.1) continue;
        if (c < 0.55) {
          surface.put(col, row, ramp(EDGE, c * 2), INK, 0.3);
          continue;
        }
        // Brushed metal, lit from the left.
        const lit = 0.5 - across * 0.45;
        surface.fill(col, row, INK, 0.05 + 0.12 * lit);
        if (Math.abs(across + 0.5) < 0.1) surface.put(col, row, '|', INK, 0.22);
      }
    }
  }
}
