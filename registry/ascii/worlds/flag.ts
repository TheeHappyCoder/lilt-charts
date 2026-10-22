import { approach, clamp, noise3 } from '../engine/noise';
import type { GlyphSurface } from '../engine/surface';
import type { AsciiGrid, AsciiPointer, AsciiScene } from '../engine/types';
import { rasteriseWord } from '../more-scenes/shared';

export interface FlagOptions {
  /** The word printed on the flag. Default 'lilt'. */
  text?: string;
  /** Colour of the cloth. Default violet. */
  cloth?: string;
  /** Colour of the lettering. Default white. */
  ink?: string;
  /** How hard the wind blows, 0 to 2. Default 1. */
  wind?: number;
  /** Font weight of the lettering. Default 800. */
  weight?: number;
}

const POLE = 0;
const CLOTH = 1;
const LETTER = 2;
const SHADE = 3;
/** Glyphs from a fold in shadow to one catching the light. */
const WEAVE = ' .:-=+*#';

/**
 * A word printed on a flag that flies from a pole. Waves run along the cloth from the pole to
 * the free edge, growing as they go, and the folds catch the light and fall into shadow, so the
 * word ripples with them. The wind blows harder where the pointer is; a click sends a gust.
 */
export function createFlag(options: FlagOptions = {}): AsciiScene {
  const text = options.text ?? 'lilt';
  const baseWind = clamp(options.wind ?? 1, 0, 2);
  const weight = options.weight ?? 800;
  let grid: AsciiGrid = { cols: 0, rows: 0, aspect: 2 };
  let mask: Float32Array | null = null;
  let flagW = 0;
  let flagH = 0;
  let time = 0;
  let phase = 0;
  let wind = baseWind;
  let gust = 0;

  return {
    palette: ['ink', options.cloth ?? '#7c5cff', options.ink ?? '#ffffff', '#2a1d66'],
    settle: 1,
    lineHeight: 1.15,
    resize(next) {
      grid = next;
      flagW = Math.max(8, Math.floor(grid.cols * 0.62));
      flagH = Math.max(4, Math.floor(grid.rows * 0.5));
      // The word fills most of the cloth, laid out flat; the wave bends it as it draws.
      mask = rasteriseWord(
        text,
        flagW,
        flagH,
        grid.aspect,
        {
          x: flagW * 0.1,
          y: flagH * grid.aspect * 0.14,
          width: flagW * 0.8,
          height: flagH * grid.aspect * 0.72,
        },
        weight,
      );
    },
    step(dt, pointer: AsciiPointer) {
      time += dt;
      gust = approach(gust, 0, 1.2, dt);
      const target = pointer.active
        ? baseWind * 0.4 + clamp(pointer.x / Math.max(1, grid.cols), 0, 1) * 1.6
        : baseWind;
      wind = approach(wind, target + gust, 1.5, dt);
      phase += dt * (1.4 + wind * 2.2);
    },
    press() {
      gust = 1.5;
    },
    draw(surface: GlyphSurface) {
      const { cols, rows } = grid;
      const poleX = Math.floor((cols - flagW) / 2) - 1;
      const top = Math.floor((rows - flagH) / 2) - 1;
      // The pole and its finial.
      surface.put(poleX, top - 1, 'o', POLE, 0.9);
      for (let row = top; row < rows; row++) surface.put(poleX, row, '|', POLE, 0.8);

      const amp = 0.6 + wind * 0.9;
      for (let u = 0; u < flagW; u++) {
        const along = u / flagW;
        // A wave travels out from the pole, larger toward the free edge, with a little flutter.
        const k = 0.32;
        const lift =
          Math.sin(u * k - phase) * amp * along +
          (noise3(u * 0.2, time * 2, 1) - 0.5) * along * wind;
        const slope = Math.cos(u * k - phase) * amp * along * k;
        // The cloth shortens a touch where it folds, and droops when the wind drops.
        const sag = (1 - clamp(wind, 0, 1)) * along * along * flagH * 0.25;
        const light = clamp(0.5 - slope * 1.6, 0, 1);
        const col = poleX + 1 + u;
        for (let v = 0; v < flagH; v++) {
          const row = top + v + lift + sag;
          const ink = mask ? mask[v * flagW + u]! : 0;
          // Solid cloth, lit and shaded by its folds, with the word and a faint weave on it.
          surface.fill(col, row, light < 0.32 ? SHADE : CLOTH, clamp(0.45 + light * 0.55, 0, 1));
          if (ink > 0.35)
            surface.put(col, row, ink > 0.75 ? '#' : '+', LETTER, clamp(0.55 + light * 0.45, 0, 1));
          else surface.put(col, row, WEAVE[Math.floor(light * (WEAVE.length - 1))]!, LETTER, 0.12);
        }
      }
    },
  };
}
