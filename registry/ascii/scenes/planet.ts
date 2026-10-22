import { approach, clamp, fbm3, hash3, smoothstep } from '../engine/noise';
import { DOT, type GlyphSurface } from '../engine/surface';
import type { AsciiGrid, AsciiPointer, AsciiScene } from '../engine/types';

export interface PlanetOptions {
  /** Turns per minute. Default 1.2. */
  spin?: number;
  /** Draw a ring around the equator. Default true. */
  ring?: boolean;
  /** Share of the smaller side the planet's diameter fills, before the ring. Default 0.5. */
  size?: number;
  /** Colour of the seas. Default a deep blue. */
  sea?: string;
  /** Colour of the ring. Default a pale sand. */
  ringColour?: string;
}

// Sparse glyphs where the light is faint, dense ones where it is full.
const LAND = '.:-=+*%#@';
const SEA = '.,~=';
const RING = '.-=';
const CLOUD = '~^';

const INK = 0;
const SEA_TONE = 1;
const RING_TONE = 2;

const TILT = -0.38;
/** How open the ring looks: the sine of the angle we see it at. */
const OPEN = 0.3;

/**
 * A lit planet turning in space: continents and seas from layered noise, drifting clouds, a ring
 * that passes behind and in front of it, and a field of slowly twinkling stars. The light follows
 * the pointer; a click gives it a push.
 */
export function createPlanet(options: PlanetOptions = {}): AsciiScene {
  const spin = ((options.spin ?? 1.2) * Math.PI * 2) / 60;
  const ring = options.ring ?? true;
  const size = options.size ?? 0.5;
  let grid: AsciiGrid = { cols: 0, rows: 0, aspect: 2 };
  let time = 0;
  let turn = 0;
  let push = 0;
  // Light direction, eased toward the pointer.
  let lx = -0.6;
  let ly = -0.45;
  const cosT = Math.cos(TILT);
  const sinT = Math.sin(TILT);

  return {
    palette: ['ink', options.sea ?? '#3d6bff', options.ringColour ?? '#d8b98a'],
    settle: 1,
    resize(next) {
      grid = next;
    },
    step(dt, pointer: AsciiPointer) {
      time += dt;
      push = approach(push, 0, 1.6, dt);
      turn += (spin + push) * dt;
      const cx = grid.cols / 2;
      const cy = grid.rows / 2;
      const tx = pointer.active ? clamp((pointer.x - cx) / (grid.cols / 2), -1, 1) : -0.6;
      const ty = pointer.active ? clamp((pointer.y - cy) / (grid.rows / 2), -1, 1) : -0.45;
      lx = approach(lx, tx, 3, dt);
      ly = approach(ly, ty, 3, dt);
    },
    press() {
      push += 2.2;
    },
    draw(surface: GlyphSurface) {
      const { cols, rows, aspect } = grid;
      const cx = cols / 2;
      const cy = (rows * aspect) / 2;
      const radius = (Math.min(cols, rows * aspect) * size) / 2;
      const lz = 1.15;
      const ll = Math.hypot(lx, ly, lz);

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          // Screen position in planet radii, square units, y down.
          const sx = (col + 0.5 - cx) / radius;
          const sy = ((row + 0.5) * aspect - cy) / radius;
          // Undo the axial tilt so the equator and ring are level.
          const px = sx * cosT + sy * sinT;
          const py = -sx * sinT + sy * cosT;
          const d2 = px * px + py * py;

          if (ring && drawRing(surface, col, row, px, py, d2, 'back')) continue;
          if (d2 < 1) {
            drawSurface(surface, col, row, sx, sy, px, py, d2);
            if (ring) drawRing(surface, col, row, px, py, d2, 'front');
            continue;
          }
          if (ring && drawRing(surface, col, row, px, py, d2, 'front')) continue;
          // A thin halo of atmosphere on the lit side.
          if (d2 < 1.12) {
            const lit = (sx * lx + sy * ly) / (Math.sqrt(d2) * ll);
            const glow = (1 - (d2 - 1) / 0.12) * clamp(lit + 0.3, 0, 1);
            if (glow > 0.1) surface.put(col, row, DOT, SEA_TONE, glow * 0.8);
            continue;
          }
          drawStar(surface, col, row);
        }
      }

      function drawSurface(
        s: GlyphSurface,
        col: number,
        row: number,
        sx: number,
        sy: number,
        px: number,
        py: number,
        d2: number,
      ) {
        const nz = Math.sqrt(1 - d2);
        // Light falls on the screen-space normal; the surface turns in the untilted frame.
        const light = clamp((sx * lx + sy * ly + nz * lz) / ll, 0, 1);
        const lon = Math.atan2(px, nz) + turn;
        const lat = Math.asin(clamp(py, -1, 1));
        const cl = Math.cos(lat);
        const ux = cl * Math.cos(lon);
        const uy = Math.sin(lat);
        const uz = cl * Math.sin(lon);
        const land = fbm3(ux * 1.6 + 7, uy * 1.6, uz * 1.6, 4);
        const cloud = fbm3(ux * 2.4 + time * 0.05, uy * 4, uz * 2.4 - time * 0.03, 3);
        // Ice at the poles.
        const ice = smoothstep(0.82, 0.92, Math.abs(uy));
        // A little light on the night side keeps the whole disc readable as a sphere.
        const shade = 0.07 + 0.93 * Math.pow(light, 0.8);
        if (cloud > 0.62 && shade > 0.25) {
          s.put(col, row, CLOUD[Math.floor(cloud * 7) % 2]!, INK, shade * 0.95);
        } else if (land > 0.52 || ice > 0.5) {
          const g = LAND[Math.min(LAND.length - 1, Math.floor(shade * LAND.length))]!;
          s.put(col, row, g, INK, 0.08 + shade * 0.92);
        } else {
          const g = SEA[Math.min(SEA.length - 1, Math.floor(shade * SEA.length))]!;
          s.put(col, row, g, SEA_TONE, 0.08 + shade * 0.85);
        }
      }

      function drawRing(
        s: GlyphSurface,
        col: number,
        row: number,
        px: number,
        py: number,
        d2: number,
        layer: 'back' | 'front',
      ) {
        // The near half of the ring dips below the equator on screen.
        const front = py > 0;
        if ((layer === 'front') !== front) return false;
        if (layer === 'back' && d2 < 1) return false;
        const ry = py / OPEN;
        const r = Math.sqrt(px * px + ry * ry);
        if (r < 1.45 || r > 2.25) return false;
        // Bands, and a dark gap two thirds of the way out.
        const band = 0.55 + 0.45 * Math.sin(r * 22);
        const gap = 1 - smoothstep(0.03, 0.0, Math.abs(r - 1.92)) * 0.95;
        const edge = smoothstep(1.45, 1.55, r) * smoothstep(2.25, 2.12, r);
        // The planet's shadow falls across the back of the ring.
        const shadow = !front && px * lx < 0 && Math.abs(px) < 1 ? 0.35 : 1;
        const angle = Math.atan2(ry, px);
        const grain =
          0.75 + 0.25 * hash3(Math.floor(r * 30), Math.floor((angle + turn * 0.6) * 12), 3);
        const v = band * gap * edge * shadow * grain;
        if (v < 0.12) return front && d2 < 1 ? false : true;
        s.put(
          col,
          row,
          RING[Math.min(RING.length - 1, Math.floor(v * RING.length))]!,
          RING_TONE,
          v,
        );
        return true;
      }

      function drawStar(s: GlyphSurface, col: number, row: number) {
        const h = hash3(col, row, 11);
        if (h > 0.035) return;
        const twinkle = 0.5 + 0.5 * Math.sin(time * (0.6 + h * 30) + h * 400);
        const bright = h < 0.004;
        s.put(col, row, bright ? '+' : DOT, INK, (bright ? 0.5 : 0.22) + twinkle * 0.35);
      }
    },
  };
}
