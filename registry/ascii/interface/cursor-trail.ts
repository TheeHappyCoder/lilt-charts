import { ramp } from '../engine/glyphs';
import { clamp, hash3 } from '../engine/noise';
import type { GlyphSurface } from '../engine/surface';
import type { AsciiGrid, AsciiPointer, AsciiScene } from '../engine/types';
import { mixHex } from './motion';

export interface CursorTrailOptions {
  /** Glyphs each mark wears as it ages, newest first. Default `*+:.`. */
  characters?: string;
  /** Colours the trail runs through from its head to its tail, as hex. Default violet to rose. */
  colors?: readonly string[];
  /** Seconds a mark lasts before it fades out. Default 1.2. */
  life?: number;
  /**
   * When the pointer is away, an unseen pointer draws a slow loop, so a stage never sits empty.
   * Default false.
   */
  autopilot?: boolean;
}

/** A cursor trail scene, which also says how many marks are alive so a runner can rest. */
export interface CursorTrailScene extends AsciiScene {
  readonly alive: number;
}

const CAPACITY = 600;
/** Cells of pointer travel, in cell widths, between two marks. */
const SPACING = 1;
/** Steps through the colours, head to tail: the palette holds this many blends. */
const SHADES = 12;

/**
 * Glyphs shed behind the pointer that drift, slow and fade, each wearing lighter glyphs as it ages.
 * Marks are shed by distance travelled, not by time, so a still pointer sheds nothing and an idle
 * trail draws nothing at all.
 */
export function createCursorTrail(options: CursorTrailOptions = {}): CursorTrailScene {
  const characters = options.characters?.length ? options.characters : '*+:.';
  const stops = options.colors?.length ? options.colors : ['#7c5cff', '#e5489c'];
  const life = clamp(options.life ?? 1.2, 0.2, 6);
  const autopilot = options.autopilot ?? false;
  // Blends between the stops, so the trail's colour flows rather than steps.
  const shades = Array.from({ length: stops.length > 1 ? SHADES : 1 }, (_, i) => {
    const t = (i / Math.max(1, SHADES - 1)) * (stops.length - 1);
    const k = Math.min(stops.length - 2, Math.floor(t));
    return stops.length > 1 ? mixHex(stops[k]!, stops[k + 1]!, t - k) : stops[0]!;
  });

  let grid: AsciiGrid = { cols: 0, rows: 0, aspect: 2 };
  let time = 0;
  let count = 0;
  let seed = 0;
  let carry = 0;
  let lastActive = -10;
  let prev: { x: number; y: number } | null = null;
  const x = new Float32Array(CAPACITY);
  const y = new Float32Array(CAPACITY);
  const vx = new Float32Array(CAPACITY);
  const vy = new Float32Array(CAPACITY);
  const age = new Float32Array(CAPACITY);
  const span = new Float32Array(CAPACITY);

  const random = () => hash3(seed++, 17, 91);

  /** A mark at a point, carried a little by the pointer's own motion. */
  const shed = (px: number, py: number, mx: number, my: number, spread = 1) => {
    if (count >= CAPACITY) return;
    const i = count++;
    x[i] = px + (random() - 0.5) * 0.6;
    y[i] = py + (random() - 0.5) * 0.3;
    const angle = random() * Math.PI * 2;
    const speed = (1.2 + random() * 2.8) * spread;
    // Rows are taller than columns wide, so vertical speeds are divided by the cell's aspect.
    // A little of the pointer's own speed, capped, so a flick leaves a wake and not a spray.
    const carried = Math.hypot(mx, my * grid.aspect);
    const keep = carried > 0 ? Math.min(carried * 0.12, 5) / carried : 0;
    vx[i] = mx * keep + Math.cos(angle) * speed;
    vy[i] = my * keep + (Math.sin(angle) * speed) / grid.aspect;
    age[i] = 0;
    span[i] = life * (0.7 + random() * 0.6);
  };

  const ghost = (): AsciiPointer => {
    const t = time * 0.8;
    return {
      x: grid.cols / 2 + Math.sin(t) * grid.cols * 0.32,
      y: grid.rows / 2 + Math.sin(t * 2) * grid.rows * 0.24,
      active: true,
    };
  };

  return {
    palette: ['ink', ...shades],
    get alive() {
      return count;
    },
    // With reduced motion a stage shows one frame: on autopilot, a moment of the loop.
    settle: autopilot ? 3.2 : 0,
    resize(next) {
      grid = next;
      prev = null;
    },
    step(dt, pointer) {
      time += dt;
      if (pointer.active) lastActive = time;
      const p = pointer.active
        ? pointer
        : autopilot && time - lastActive > 1.5 && grid.cols > 0
          ? ghost()
          : null;

      if (p) {
        if (prev) {
          const dx = p.x - prev.x;
          const dy = p.y - prev.y;
          const travel = Math.hypot(dx, dy * grid.aspect);
          // A jump (the pointer coming back, or the ghost handing over) sheds nothing.
          if (travel < 30) {
            carry += travel / SPACING;
            const marks = Math.min(6, Math.floor(carry));
            carry -= marks;
            const mx = dt > 0 ? dx / dt : 0;
            const my = dt > 0 ? dy / dt : 0;
            for (let k = 1; k <= marks; k++) {
              const f = k / marks;
              shed(prev.x + dx * f, prev.y + dy * f, mx, my);
            }
          }
        }
        prev = { x: p.x, y: p.y };
      } else {
        prev = null;
        carry = 0;
      }

      // Drift: drag slows each mark, and a faint lift carries it upward like warm air.
      const drag = Math.exp(-1.8 * dt);
      for (let i = 0; i < count; i++) {
        age[i]! += dt;
        if (age[i]! >= span[i]!) {
          count--;
          x[i] = x[count]!;
          y[i] = y[count]!;
          vx[i] = vx[count]!;
          vy[i] = vy[count]!;
          age[i] = age[count]!;
          span[i] = span[count]!;
          i--;
          continue;
        }
        vx[i]! *= drag;
        vy[i] = vy[i]! * drag - (0.5 / grid.aspect) * dt;
        x[i]! += vx[i]! * dt;
        y[i]! += vy[i]! * dt;
      }
    },
    draw(surface: GlyphSurface) {
      const last = shades.length;
      // In the order they were shed, so newer marks mostly sit on top. Colour follows age, so
      // the trail runs through the colours from its head to its tail.
      for (let i = 0; i < count; i++) {
        const a = age[i]! / span[i]!;
        const shade = 1 + Math.min(last - 1, Math.floor(a * last));
        surface.put(x[i]!, y[i]!, ramp(characters, a), shade, Math.pow(1 - a, 1.1));
      }
    },
    press(px, py) {
      // A ring of marks from a click, opening outward and settling as drag takes hold.
      const n = 16;
      const turn = random() * Math.PI * 2;
      for (let k = 0; k < n && count < CAPACITY; k++) {
        const i = count++;
        const angle = turn + (k / n) * Math.PI * 2;
        const speed = 22 + random() * 4;
        x[i] = px;
        y[i] = py;
        vx[i] = Math.cos(angle) * speed;
        vy[i] = (Math.sin(angle) * speed) / grid.aspect;
        age[i] = 0;
        span[i] = life * (0.9 + random() * 0.3);
      }
    },
  };
}
