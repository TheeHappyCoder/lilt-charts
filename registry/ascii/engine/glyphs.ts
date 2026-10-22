import { clamp } from './noise';

/** The glyph a share of the way along a ramp of glyphs, sparse to dense. */
export function ramp(glyphs: string, value: number): string {
  return glyphs[clamp(Math.floor(value * glyphs.length), 0, glyphs.length - 1)]!;
}

/**
 * The stroke that best follows a direction on screen. `dx` and `dy` are in square units (cell
 * widths), y down. Used for tentacles, grass and anything else drawn as a line of type.
 */
export function stroke(dx: number, dy: number): string {
  const angle = Math.atan2(dy, dx);
  // Fold to [0, π): a stroke has no direction.
  const a = angle < 0 ? angle + Math.PI : angle;
  if (a < Math.PI / 8 || a >= (Math.PI * 7) / 8) return '-';
  if (a < (Math.PI * 3) / 8) return '\\';
  if (a < (Math.PI * 5) / 8) return '|';
  return '/';
}
