import { approach, clamp, hash3 } from '../engine/noise';
import { DOT, type GlyphSurface } from '../engine/surface';
import type { AsciiGrid, AsciiPointer, AsciiScene } from '../engine/types';

export interface OrreryOptions {
  /** Earth years that pass each second. Default 0.25. */
  pace?: number;
  /** How far the plane tips toward you, 0 flat to 1 edge on. Default 0.55. */
  tilt?: number;
  /** Label the planet nearest the pointer. Default true. */
  labels?: boolean;
  /** Draw each orbit's path. Default true. */
  orbits?: boolean;
}

const INK = 0;
const SUN = 1;

interface Planet {
  name: string;
  /** Orbital period in Earth years, and distance in astronomical units. */
  period: number;
  au: number;
  glyph: string;
  color: string;
  ring?: boolean;
}

/** The planets' real periods and distances; only the distances are squeezed to fit. */
const PLANETS: readonly Planet[] = [
  { name: 'Mercury', period: 0.241, au: 0.39, glyph: 'o', color: '#b9b2a8' },
  { name: 'Venus', period: 0.615, au: 0.72, glyph: 'o', color: '#f1c27d' },
  { name: 'Earth', period: 1, au: 1, glyph: 'O', color: '#5fa8ff' },
  { name: 'Mars', period: 1.881, au: 1.52, glyph: 'o', color: '#ff7a59' },
  { name: 'Jupiter', period: 11.86, au: 5.2, glyph: '@', color: '#e9b98a' },
  { name: 'Saturn', period: 29.46, au: 9.54, glyph: '@', color: '#f3d99b', ring: true },
  { name: 'Uranus', period: 84.01, au: 19.2, glyph: 'O', color: '#8fe3e8' },
  { name: 'Neptune', period: 164.8, au: 30.1, glyph: 'O', color: '#6d8bff' },
];

/**
 * The solar system as a clockwork model, seen from above at a tilt. The planets keep their real
 * periods, so Mercury laps while Neptune barely moves; distances are squeezed so all eight fit.
 * The Moon circles Earth, asteroids drift between Mars and Jupiter, and Saturn wears its ring.
 * Hover a planet to read its name and year; a click runs time faster, and another slows it back.
 */
export function createOrrery(options: OrreryOptions = {}): AsciiScene {
  const pace = options.pace ?? 0.25;
  const labels = options.labels ?? true;
  const orbits = options.orbits ?? true;
  let tilt = clamp(options.tilt ?? 0.55, 0, 0.95);
  let grid: AsciiGrid = { cols: 0, rows: 0, aspect: 2 };
  let years = 0;
  let boost = 1;
  let boostTarget = 1;
  let time = 0;
  let hoverX = -1;
  let hoverY = -1;
  let hovering = false;
  // Each asteroid: distance in AU and its starting angle.
  const belt = Array.from({ length: 140 }, (_, i) => ({
    au: 2.2 + hash3(i, 1, 3) * 1.1,
    a: hash3(i, 2, 3) * Math.PI * 2,
  }));

  /** Distance on screen for a distance in AU, squeezed so the outer planets fit. */
  const squeeze = (au: number) => Math.pow(au, 0.5) / Math.pow(30.1, 0.5);

  function place(au: number, angle: number) {
    const half = Math.min(
      grid.cols / 2 - 2,
      ((grid.rows / 2 - 1) * grid.aspect) / Math.max(0.2, 1 - tilt),
    );
    const r = 0.08 * half + squeeze(au) * half * 0.92;
    const x = grid.cols / 2 + Math.cos(angle) * r;
    const y = grid.rows / 2 + (Math.sin(angle) * r * (1 - tilt)) / grid.aspect;
    return { x, y, r };
  }

  return {
    palette: ['ink', '#ffd36b', ...PLANETS.map((p) => p.color)],
    settle: 1,
    resize(next) {
      grid = next;
    },
    step(dt, pointer: AsciiPointer) {
      time += dt;
      boost = approach(boost, boostTarget, 1.5, dt);
      years += dt * pace * boost;
      hovering = pointer.active;
      hoverX = pointer.x;
      hoverY = pointer.y;
      if (options.tilt === undefined) tilt = 0.55 + Math.sin(time * 0.05) * 0.04;
    },
    press() {
      boostTarget = boostTarget === 1 ? 12 : 1;
    },
    draw(surface: GlyphSurface) {
      const { cols, rows } = grid;
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const s = hash3(col, row, 21);
          if (s > 0.992) surface.put(col, row, DOT, INK, 0.12 + (s - 0.992) * 20);
        }
      }
      if (orbits) {
        for (const p of PLANETS) {
          const steps = Math.ceil(place(p.au, 0).r * 2.4);
          for (let i = 0; i < steps; i++) {
            const at = place(p.au, (i / steps) * Math.PI * 2);
            surface.put(at.x, at.y, DOT, INK, 0.13);
          }
        }
      }
      for (const a of belt) {
        // Asteroids keep Kepler's law too: period grows as distance to the power 1.5.
        const at = place(a.au, a.a + (years / Math.pow(a.au, 1.5)) * Math.PI * 2);
        surface.put(at.x, at.y, DOT, INK, 0.3);
      }

      // The sun: a bright core with a corona that breathes.
      const sun = place(0, 0);
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -4; dx <= 4; dx++) {
          const d = Math.hypot(dx / 2, dy);
          if (d > 2.2) continue;
          const core = d < 0.9;
          surface.put(
            sun.x + dx,
            sun.y + dy,
            core ? '@' : d < 1.6 ? '*' : '.',
            SUN,
            core ? 1 : 0.5 + 0.2 * Math.sin(time * 2 + dx),
          );
        }
      }

      let nearest: { p: Planet; x: number; y: number; d: number } | null = null;
      PLANETS.forEach((p, i) => {
        const angle = (years / p.period) * Math.PI * 2 + i * 1.7;
        const at = place(p.au, angle);
        const tone = 2 + i;
        if (p.ring) {
          surface.put(at.x - 2, at.y, '-', tone, 0.8);
          surface.put(at.x + 2, at.y, '-', tone, 0.8);
          surface.put(at.x - 1, at.y, '(', tone, 0.9);
          surface.put(at.x + 1, at.y, ')', tone, 0.9);
        }
        surface.put(at.x, at.y, p.glyph, tone, 1);
        if (p.name === 'Earth') {
          const moon = years * 13.37 * Math.PI * 2;
          surface.put(
            at.x + Math.cos(moon) * 2.2,
            at.y + (Math.sin(moon) * 2.2 * (1 - tilt)) / grid.aspect,
            DOT,
            INK,
            0.8,
          );
        }
        const d = Math.hypot(at.x - hoverX, (at.y - hoverY) * grid.aspect);
        if (hovering && d < 6 && (!nearest || d < nearest.d)) nearest = { p, x: at.x, y: at.y, d };
      });

      // The pointer's planet: its name, and how long its year is.
      const hit = nearest as { p: Planet; x: number; y: number } | null;
      if (labels && hit) {
        const year =
          hit.p.period < 1
            ? `${Math.round(hit.p.period * 365)} days`
            : `${hit.p.period} year${hit.p.period === 1 ? '' : 's'}`;
        const text = `${hit.p.name} · ${year}`;
        const start = clamp(
          Math.round(hit.x - text.length / 2),
          0,
          Math.max(0, cols - text.length),
        );
        const row = hit.y > 2 ? hit.y - 2 : hit.y + 2;
        for (let i = 0; i < text.length; i++) surface.put(start + i, row, text[i]!, INK, 0.9);
      }
      // The date, counting up from now.
      const label = `year +${years.toFixed(1)}${boostTarget > 1 ? '  >>' : ''}`;
      for (let i = 0; i < label.length; i++) surface.put(2 + i, rows - 2, label[i]!, INK, 0.45);
    },
  };
}
