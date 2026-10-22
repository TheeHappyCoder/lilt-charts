import { ramp } from '../engine/glyphs';
import { approach, clamp, hash3, smoothstep } from '../engine/noise';
import { DOT, type GlyphSurface } from '../engine/surface';
import type { AsciiGrid, AsciiPointer, AsciiScene } from '../engine/types';
import { INSET, full, text } from '../charts/chart-kit';
import { landAt } from './land-mask';

export interface GlobePoint {
  lat: number;
  lon: number;
  /** A number read out with the label on hover; larger values pulse wider. */
  value?: number;
  label?: string;
}

export interface GlobeArc {
  /** Where the arc starts and ends, as `[lat, lon]` in degrees. */
  from: readonly [number, number];
  to: readonly [number, number];
}

export interface GlobeOptions {
  /** Places that pulse while they face you. Without any, the globe marks a handful of cities. */
  points?: readonly GlobePoint[];
  /** Great-circle arcs lifted above the surface, each with a bright head travelling along it. */
  arcs?: readonly GlobeArc[];
  /** Colour of the land. Default violet. */
  color?: string;
  /** Colour of the points and arcs. Default rose. */
  accent?: string;
  /** Turns per minute. Default 1.5. */
  spin?: number;
  /** How far the north pole leans toward you, in degrees. Default 20. */
  tilt?: number;
  /** Share of the shorter side the globe fills. Default 0.82. */
  size?: number;
}

const INK = 0;
const LAND = 1;
const ACCENT = 2;
const DEEP = 3;

/** Glyphs cut into the land: a fine dot where the light is full, denser toward the night side. */
const CUT = '...::-';
const COAST = '.:';
const RAD = Math.PI / 180;
/** How much of an arc the travelling head's tail covers. */
const TAIL = 0.3;

/** A handful of cities, with a made-up count of readers in each. */
export const DEMO_POINTS: readonly GlobePoint[] = [
  { lat: 51.51, lon: -0.13, label: 'London', value: 1284 },
  { lat: 40.71, lon: -74.01, label: 'New York', value: 1610 },
  { lat: 37.77, lon: -122.42, label: 'San Francisco', value: 972 },
  { lat: -23.55, lon: -46.63, label: 'São Paulo', value: 688 },
  { lat: 6.52, lon: 3.38, label: 'Lagos', value: 412 },
  { lat: -1.29, lon: 36.82, label: 'Nairobi', value: 236 },
  { lat: 19.08, lon: 72.88, label: 'Mumbai', value: 840 },
  { lat: 1.35, lon: 103.82, label: 'Singapore', value: 534 },
  { lat: 35.68, lon: 139.69, label: 'Tokyo', value: 1122 },
  { lat: -33.87, lon: 151.21, label: 'Sydney', value: 395 },
];

export const DEMO_ARCS: readonly GlobeArc[] = [
  { from: [51.51, -0.13], to: [40.71, -74.01] },
  { from: [40.71, -74.01], to: [-23.55, -46.63] },
  { from: [51.51, -0.13], to: [19.08, 72.88] },
  { from: [19.08, 72.88], to: [1.35, 103.82] },
  { from: [1.35, 103.82], to: [-33.87, 151.21] },
  { from: [37.77, -122.42], to: [35.68, 139.69] },
  { from: [51.51, -0.13], to: [6.52, 3.38] },
];

/** A unit vector for a latitude and longitude, y up through the north pole. */
function toVector(lat: number, lon: number): [number, number, number] {
  const cl = Math.cos(lat * RAD);
  return [cl * Math.sin(lon * RAD), Math.sin(lat * RAD), cl * Math.cos(lon * RAD)];
}

/** A one-line description of the globe's data for screen readers. */
export function describeGlobe(points?: readonly GlobePoint[], arcs?: readonly GlobeArc[]) {
  const list = points ?? (arcs ? [] : DEMO_POINTS);
  const routes = arcs ?? (points ? [] : DEMO_ARCS);
  const named = list.filter((p) => p.label).map((p) => p.label);
  const places = named.length
    ? `${list.length} places marked: ${named.join(', ')}`
    : `${list.length} places marked`;
  const lines = routes.length ? `, and ${routes.length} routes between them` : '';
  return `A turning globe with ${places}${lines}.`;
}

/**
 * A turning Earth drawn in type. Each cell is projected onto the sphere and looked up in a land
 * mask: land is solid lit blocks with glyphs cut where the light falls away, the sea a sparse
 * lattice of faint dots, and a thin atmosphere glows at the edge. Points pulse while they face
 * you and arcs rise between them with a bright head travelling along each. Hovering a point reads
 * out its label, the pointer leans the globe, and a click spins it.
 */
export function createGlobe(options: GlobeOptions = {}): AsciiScene {
  const points = options.points ?? (options.arcs ? [] : DEMO_POINTS);
  const arcs = options.arcs ?? (options.points ? [] : DEMO_ARCS);
  const spin = ((options.spin ?? 1.5) * Math.PI * 2) / 60;
  const tilt = (options.tilt ?? 20) * RAD;
  const size = clamp(options.size ?? 0.82, 0.2, 1);
  const cosT = Math.cos(tilt);
  const sinT = Math.sin(tilt);
  const maxValue = Math.max(1, ...points.map((p) => p.value ?? 0));

  const pointVectors = points.map((p) => toVector(p.lat, p.lon));
  // Each arc as samples along its great circle, already lifted off the surface.
  const SAMPLES = 120;
  const arcPaths = arcs.map((arc) => {
    const a = toVector(arc.from[0], arc.from[1]);
    const b = toVector(arc.to[0], arc.to[1]);
    const dot = clamp(a[0] * b[0] + a[1] * b[1] + a[2] * b[2], -1, 1);
    const angle = Math.acos(dot);
    const lift = 0.08 + 0.3 * (angle / Math.PI);
    const path = new Float32Array((SAMPLES + 1) * 3);
    for (let i = 0; i <= SAMPLES; i++) {
      const t = i / SAMPLES;
      const s = Math.sin(angle) || 1;
      const wa = angle < 1e-4 ? 1 - t : Math.sin((1 - t) * angle) / s;
      const wb = angle < 1e-4 ? t : Math.sin(t * angle) / s;
      const h = 1 + lift * Math.sin(Math.PI * t);
      path[i * 3] = (a[0] * wa + b[0] * wb) * h;
      path[i * 3 + 1] = (a[1] * wa + b[1] * wb) * h;
      path[i * 3 + 2] = (a[2] * wa + b[2] * wb) * h;
    }
    return path;
  });

  let grid: AsciiGrid = { cols: 0, rows: 0, aspect: 2 };
  let time = 0;
  // Start with the Atlantic facing, Europe and Africa to the right of it.
  let turn = 20 * RAD;
  let push = 0;
  let lean = 0;
  let pace = 1;
  let pointer: AsciiPointer = { x: 0, y: 0, active: false };
  let hovered = -1;
  // The disc on screen, in square units: its centre and radius.
  let cx = 0;
  let cy = 0;
  let radius = 1;

  /** A point on or above the sphere, turned and tilted into view: x right, y up, z toward you. */
  function view(x: number, y: number, z: number, out: number[]) {
    const r = turn + lean;
    const c = Math.cos(r);
    const s = Math.sin(r);
    // Turning the globe east brings longitudes from the right.
    const vx = x * c - z * s;
    const vz = x * s + z * c;
    out[0] = vx;
    out[1] = y * cosT - vz * sinT;
    out[2] = y * sinT + vz * cosT;
  }

  function layout() {
    const { cols, rows, aspect } = grid;
    const top = (INSET.top + 2) * aspect;
    const bottom = (rows - INSET.bottom) * aspect;
    radius = (Math.min(cols - INSET.x * 2, bottom - top) * size) / 2;
    cx = cols / 2;
    cy = (top + bottom) / 2;
  }

  const v: number[] = [0, 0, 0];

  return {
    palette: ['ink', options.color ?? '#8b6cff', options.accent ?? '#e5489c', '#0c0a14'],
    lineHeight: 1.1,
    settle: 1,
    resize(next) {
      grid = next;
      layout();
    },
    step(dt, next) {
      time += dt;
      pointer = next;
      push = approach(push, 0, 1.2, dt);
      // Slow almost to a stop while a point is read, so its label holds still.
      pace = approach(pace, hovered >= 0 ? 0.08 : 1, 4, dt);
      // The Earth turns west to east: the longitude facing you falls as the day goes on.
      turn -= (spin * pace + push) * dt;
      const target = pointer.active ? clamp((pointer.x - cx) / Math.max(1, radius * 2), -1, 1) : 0;
      lean = approach(lean, target * 0.6, 2, dt);
    },
    press() {
      push += 3;
    },
    draw(surface: GlyphSurface) {
      const { cols, rows, aspect } = grid;
      if (cols < 12 || rows < 6) return;
      const r = turn + lean;
      const cr = Math.cos(r);
      const sr = Math.sin(r);
      // Light from the upper left, a little in front.
      const lx = -0.55;
      const ly = 0.5;
      const lz = 0.67;

      const r0 = Math.max(0, Math.floor((cy - radius * 1.15) / aspect));
      const r1 = Math.min(rows - 1, Math.ceil((cy + radius * 1.15) / aspect));
      const c0 = Math.max(0, Math.floor(cx - radius * 1.15));
      const c1 = Math.min(cols - 1, Math.ceil(cx + radius * 1.15));
      for (let row = r0; row <= r1; row++) {
        for (let col = c0; col <= c1; col++) {
          const sx = (col + 0.5 - cx) / radius;
          const sy = -((row + 0.5) * aspect - cy) / radius;
          const d2 = sx * sx + sy * sy;
          if (d2 >= 1) {
            // The atmosphere: a thin glow round the edge, brighter on the lit side.
            const d = Math.sqrt(d2);
            const reach = 0.12;
            if (d < 1 + reach) {
              const lit = clamp((sx * lx + sy * ly) / d + 0.45, 0, 1);
              const glow = Math.pow(1 - (d - 1) / reach, 1.5) * (0.25 + 0.75 * lit);
              if (glow > 0.08) surface.put(col, row, DOT, LAND, 0.15 + glow * 0.75);
            }
            continue;
          }
          const sz = Math.sqrt(1 - d2);
          // Undo the tilt, then the turn, to find the point on the globe.
          const y = sy * cosT + sz * sinT;
          const vz = -sy * sinT + sz * cosT;
          const x = sx * cr + vz * sr;
          const z = -sx * sr + vz * cr;
          const lat = Math.asin(clamp(y, -1, 1)) / RAD;
          const lon = Math.atan2(x, z) / RAD;
          const lambert = sx * lx + sy * ly + sz * lz;
          // A soft terminator; the night side keeps a little light so the disc stays whole.
          const light = 0.1 + 0.9 * smoothstep(-0.3, 0.75, lambert);
          // The edge of the disc catches the atmosphere.
          const rim = Math.pow(1 - sz, 3);
          const land = landAt(lat, lon);
          if (land > 0.6) {
            const body = 0.14 + 0.78 * light;
            surface.fill(col, row, LAND, body);
            // The cut fades with its block, so the night side stays quiet on a light page too.
            surface.put(col, row, ramp(CUT, 1 - light), DEEP, 0.55 * body);
            continue;
          }
          if (land > 0.3) {
            surface.put(col, row, ramp(COAST, (land - 0.3) / 0.3), LAND, 0.25 + 0.7 * light);
            continue;
          }
          // The sea: an even field of faint dots, shaded like the land so the ball reads round.
          if (col % 2) continue;
          surface.put(col, row, DOT, rim > 0.3 ? LAND : INK, 0.05 + 0.22 * light + rim * 0.4);
        }
      }

      // Arcs: a faint dotted path, and a bright head trailing a tail of fading blocks.
      arcPaths.forEach((path, k) => {
        const period = 4.6;
        const u = (((time + k * 1.37) % period) / period) * 1.5;
        let lastCol = -1;
        let lastRow = -1;
        for (let i = 0; i <= SAMPLES; i++) {
          view(path[i * 3]!, path[i * 3 + 1]!, path[i * 3 + 2]!, v);
          const behind = v[2]! < 0 && v[0]! * v[0]! + v[1]! * v[1]! < 1;
          if (behind) continue;
          const col = Math.floor(cx + v[0]! * radius);
          const row = Math.floor((cy - v[1]! * radius) / aspect);
          if (col === lastCol && row === lastRow) continue;
          lastCol = col;
          lastRow = row;
          // Seen against the night side or the sea, the path fades a little with depth.
          const depth = 0.6 + 0.4 * clamp(v[2]! + 0.4, 0, 1);
          const tail = u - i / SAMPLES;
          if (u <= 1.02 && tail >= 0 && tail < TAIL) {
            const glow = 1 - tail / TAIL;
            surface.fill(col, row, ACCENT, (0.55 + 0.45 * glow * glow) * depth);
            continue;
          }
          surface.put(col, row, DOT, ACCENT, 0.7 * depth);
        }
      });

      // Points: a bright marker and a ring that spreads across the surface around it.
      let nearest = -1;
      let nearestD = 3;
      pointVectors.forEach((p, i) => {
        view(p[0], p[1], p[2], v);
        if (v[2]! < 0.08) return;
        const fade = smoothstep(0.08, 0.3, v[2]!);
        const col = Math.floor(cx + v[0]! * radius);
        const row = Math.floor((cy - v[1]! * radius) / aspect);
        const strength = (points[i]!.value ?? maxValue * 0.5) / maxValue;
        const phase = (time * 0.5 + hash3(i, 3, 1)) % 1;
        const angle = (0.03 + 0.07 * Math.sqrt(strength)) * (0.15 + 0.85 * phase) * Math.PI;
        // The ring, foreshortened by the sphere: sample around the point on the surface.
        const [px, py, pz] = p;
        const ex = Math.hypot(pz, px) > 1e-6 ? [pz, 0, -px] : [1, 0, 0];
        const el = Math.hypot(ex[0]!, ex[2]!) || 1;
        const e1 = [ex[0]! / el, 0, ex[2]! / el];
        const e2 = [py * e1[2]! - pz * 0, pz * e1[0]! - px * e1[2]!, px * 0 - py * e1[0]!];
        const steps = 28;
        for (let s = 0; s < steps; s++) {
          const a = (s / steps) * Math.PI * 2;
          const ca = Math.cos(angle);
          const sa = Math.sin(angle);
          const qx = px * ca + (e1[0]! * Math.cos(a) + e2[0]! * Math.sin(a)) * sa;
          const qy = py * ca + (e1[1]! * Math.cos(a) + e2[1]! * Math.sin(a)) * sa;
          const qz = pz * ca + (e1[2]! * Math.cos(a) + e2[2]! * Math.sin(a)) * sa;
          view(qx, qy, qz, v);
          if (v[2]! < 0) continue;
          const rc = Math.floor(cx + v[0]! * radius);
          const rr = Math.floor((cy - v[1]! * radius) / aspect);
          if (rc === col && rr === row) continue;
          surface.put(rc, rr, DOT, ACCENT, (0.25 + 0.75 * (1 - phase)) * fade);
        }
        surface.fill(col, row, ACCENT, fade);
        surface.put(col, row, DOT, DEEP, 0.6 * fade);
        if (pointer.active && v[2]! > 0.2) {
          const d = Math.hypot(pointer.x - (col + 0.5), (pointer.y - (row + 0.5)) * aspect);
          if (d < nearestD) {
            nearestD = d;
            nearest = i;
          }
        }
      });
      hovered = nearest;

      if (nearest >= 0) {
        const p = points[nearest]!;
        view(pointVectors[nearest]![0], pointVectors[nearest]![1], pointVectors[nearest]![2], v);
        const col = Math.floor(cx + v[0]! * radius);
        const row = Math.floor((cy - v[1]! * radius) / aspect);
        // A bracket round the point, and a readout above the globe.
        surface.put(col - 1, row, '[', INK, 0.9);
        surface.put(col + 1, row, ']', INK, 0.9);
        const name = p.label ?? `${p.lat.toFixed(1)}, ${p.lon.toFixed(1)}`;
        const value = p.value !== undefined ? full(p.value) : '';
        const readout = value ? `${name}  ${value}` : name;
        const at = clamp(
          col - Math.floor(readout.length / 2),
          INSET.x,
          cols - INSET.x - readout.length,
        );
        text(surface, at, INSET.top, name, INK, 0.75);
        if (value) text(surface, at + readout.length - value.length, INSET.top, value, ACCENT, 1);
      }
    },
  };
}
