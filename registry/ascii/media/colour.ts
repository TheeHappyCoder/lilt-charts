/** An RGB colour with channels from 0 to 1. */
export type Rgb = [number, number, number];

/** Reads `#rgb`, `#rrggbb` or `rgb(r, g, b)`; anything else gives the fallback. */
export function parseColour(value: string | undefined, fallback: Rgb): Rgb {
  if (!value) return fallback;
  const v = value.trim();
  if (v.startsWith('#')) {
    let h = v.slice(1);
    if (h.length === 3 || h.length === 4) h = [...h.slice(0, 3)].map((c) => c + c).join('');
    if (!/^[0-9a-f]{6}/i.test(h)) return fallback;
    const n = parseInt(h.slice(0, 6), 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }
  const parts = v
    .match(/^rgba?\(([^)]*)\)$/i)?.[1]
    ?.split(/[\s,/]+/)
    .filter(Boolean);
  if (parts && parts.length >= 3) {
    const rgb = parts
      .slice(0, 3)
      .map((p) => (p.endsWith('%') ? parseFloat(p) / 100 : parseFloat(p) / 255));
    if (rgb.every((c) => Number.isFinite(c)))
      return rgb.map((c) => Math.min(1, Math.max(0, c))) as Rgb;
  }
  return fallback;
}

/** A colour as `#rrggbb`. */
export function toHex([r, g, b]: Rgb): string {
  const c = (v: number) =>
    Math.round(Math.min(1, Math.max(0, v)) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

export const mixRgb = (a: Rgb, b: Rgb, t: number): Rgb => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

/** Relative luminance of sRGB values, without linearising: close enough to judge light and dark. */
export const luma = (r: number, g: number, b: number) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

/** Whether a CSS colour is light, such as the ink on a dark page. Unknown colours count as light. */
export const isLight = (value: string | undefined) => {
  const [r, g, b] = parseColour(value, [1, 1, 1]);
  return luma(r, g, b) > 0.5;
};
