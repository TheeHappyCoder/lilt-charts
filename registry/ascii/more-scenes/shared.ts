import { clamp } from '../engine/noise';

/**
 * How much of a cell a shape covers, from its signed distance in square units (negative inside).
 * The soft band is a little over a cell, so edges step down through lighter glyphs.
 */
export const coverage = (d: number) => clamp(0.5 - d / 1.3, 0, 1);

/** Parses `#rgb` or `#rrggbb` into channels; anything else reads as mid grey. */
export function rgb(hex: string): [number, number, number] {
  let h = hex.trim().replace('#', '');
  if (h.length === 3) h = h.replace(/./g, (c) => c + c);
  const n = parseInt(h.slice(0, 6), 16);
  if (!/^[0-9a-f]{6}/i.test(h) || Number.isNaN(n)) return [128, 128, 128];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** `count` colours spaced evenly along a gradient through `stops`, as hex. */
export function gradient(stops: readonly string[], count: number): string[] {
  const channels = stops.map(rgb);
  if (channels.length === 0) channels.push([128, 128, 128]);
  return Array.from({ length: count }, (_, i) => {
    const t = count === 1 ? 0 : (i / (count - 1)) * (channels.length - 1);
    const k = Math.min(channels.length - 2, Math.floor(t));
    const a = channels[Math.max(0, k)]!;
    const b = channels[Math.max(0, k) + 1] ?? a;
    const f = channels.length === 1 ? 0 : t - Math.max(0, k);
    const c = a.map((v, j) => Math.round(v + (b[j]! - v) * f));
    return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
  });
}

/**
 * Rasterises a word into a coverage mask at grid resolution: 0 outside the letters, 1 inside, and
 * the share covered on their edges. Cells are taller than wide, so the word is drawn squashed into
 * rows and keeps its proportions on screen. Returns null where there is no canvas, such as on a
 * server or in tests, so the scene can carry on without the word.
 */
export function rasteriseWord(
  text: string,
  cols: number,
  rows: number,
  aspect: number,
  box: { x: number; y: number; width: number; height: number },
  weight = 800,
  align: 'center' | 'bottom' = 'center',
): Float32Array | null {
  if (!text.trim() || cols < 4 || rows < 4) return null;
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  // Four samples a cell across and down, averaged back down to one value a cell.
  const ss = 4;
  canvas.width = cols * ss;
  canvas.height = rows * ss;
  const family = '"Helvetica Neue", Arial, "Segoe UI", system-ui, sans-serif';
  // Measured in square units (cell widths), then squashed by the aspect into rows.
  let size = 100;
  ctx.font = `${weight} ${size}px ${family}`;
  const measured = ctx.measureText(text);
  const glyphHeight =
    (measured.actualBoundingBoxAscent || size * 0.72) + (measured.actualBoundingBoxDescent || 0);
  size = Math.min((box.width / measured.width) * size, (box.height / glyphHeight) * size);
  ctx.setTransform(ss, 0, 0, ss / aspect, 0, 0);
  ctx.font = `${weight} ${size}px ${family}`;
  const m = ctx.measureText(text);
  const ascent = m.actualBoundingBoxAscent || size * 0.72;
  const descent = m.actualBoundingBoxDescent || 0;
  const left = box.x + (box.width - m.width) / 2;
  const top =
    align === 'bottom'
      ? box.y + box.height - descent
      : box.y + (box.height - ascent - descent) / 2 + ascent;
  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, left, top);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const mask = new Float32Array(cols * rows);
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      let sum = 0;
      for (let y = 0; y < ss; y++) {
        const base = ((row * ss + y) * canvas.width + col * ss) * 4 + 3;
        for (let x = 0; x < ss; x++) sum += data[base + x * 4]!;
      }
      mask[row * cols + col] = sum / (ss * ss * 255);
    }
  }
  return mask;
}
