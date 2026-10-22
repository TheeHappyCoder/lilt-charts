import type { GlyphSurface } from './surface';

/** The character grid a scene draws into. Positions are in cells; `aspect` is cell height over width. */
export interface AsciiGrid {
  cols: number;
  rows: number;
  aspect: number;
}

export interface AsciiPointer {
  /** Column under the pointer, fractional. */
  x: number;
  /** Row under the pointer, fractional. */
  y: number;
  /** False when the pointer is outside the canvas or is a finger that lifted. */
  active: boolean;
}

/**
 * A living picture made of type. The stage owns the canvas, the clock and input; a scene owns its
 * world. `step` runs on a fixed 60 Hz clock and `draw` writes the current frame into the surface.
 */
export interface AsciiScene {
  /**
   * The scene's colours, addressed by index from `draw`. Any CSS colour works; `ink` is the
   * canvas's own text colour, so a scene can follow the page's light or dark theme.
   */
  readonly palette: readonly string[];
  resize(grid: AsciiGrid): void;
  step(dt: number, pointer: AsciiPointer): void;
  draw(surface: GlyphSurface): void;
  /** A click or tap at a cell. */
  press?(x: number, y: number): void;
  /**
   * Height of a row as a multiple of the font size. Default 1.25. Scenes made of solid shapes ask
   * for tighter rows, closer to square cells, so a body lying sideways still spans several rows.
   */
  readonly lineHeight?: number;
  /** Seconds to run before showing a single still frame when the reader prefers reduced motion. */
  readonly settle?: number;
}
