import { clamp, hash3 } from '../engine/noise';

export type CurtainDirection = 'left' | 'right' | 'up' | 'down' | 'radial';

/** Glyphs at the front of the sweep, scrambling fast. */
const FRONT = '01<>/\\+=';
/** Glyphs left behind it while the content is hidden: quieter, slower. */
const BODY = '01';
/** Opacity of the curtain's tiles while it rests over the content. */
const REST = 0.14;
/** Share of the sweep, in the direction it travels, that one front spans. */
const BAND = 0.16;
const JITTER = 0.07;

const ease = (x: number) => x * x * (3 - 2 * x);

/** Where a front is, in shares of the sweep, `t` of the way through its half. */
export function frontAt(t: number) {
  return -BAND - JITTER + ease(clamp(t, 0, 1)) * (1 + 2 * (BAND + JITTER));
}

export interface CurtainFrame {
  width: number;
  height: number;
  /** The rows to draw, in pixels from the top, for a curtain taller than the screen. */
  from?: number;
  to?: number;
  cw: number;
  ch: number;
  font: string;
  accent: string;
  ink: string;
  /** Painted under the tiles so the curtain hides what is behind it, or null to leave it clear. */
  background: string | null;
  way: CurtainDirection;
  /** The covering front and the revealing front, in shares of the sweep. */
  covering: number;
  revealing: number;
  seed: number;
  now: number;
}

/**
 * Paints a curtain of type: a mosaic of accent tiles with digits cut into them, a bright
 * scrambling band at each front, quiet behind them. Cells are covered once the first front has
 * passed them and uncovered once the second has.
 */
export function paintCurtain(ctx: CanvasRenderingContext2D, f: CurtainFrame) {
  const { width, height, cw, ch, way } = f;
  const cols = Math.ceil(width / cw);
  const r0 = Math.max(0, Math.floor((f.from ?? 0) / ch));
  const r1 = Math.min(Math.ceil(height / ch), Math.ceil((f.to ?? height) / ch));
  const tick = Math.floor(f.now / 50);
  const slow = Math.floor(f.now / 160);
  const cx = width / 2;
  const cy = height / 2;
  const reach = Math.hypot(cx, cy) || 1;
  const backs: number[] = [];
  const tiles: number[] = [];
  const marks: [number, number, string, number][] = [];
  for (let r = r0; r < r1; r++) {
    for (let c = 0; c < cols; c++) {
      const x = (c + 0.5) * cw;
      const y = (r + 0.5) * ch;
      const along =
        way === 'right'
          ? x / width
          : way === 'left'
            ? 1 - x / width
            : way === 'down'
              ? y / height
              : way === 'up'
                ? 1 - y / height
                : Math.hypot(x - cx, y - cy) / reach;
      const u = along + (hash3(c, r, f.seed) - 0.5) * 2 * JITTER;
      const covered = f.covering - u;
      if (covered <= 0) continue;
      const revealed = f.revealing - u;
      // How bright the tile is: a flash at each front, a low glow between them.
      let tile: number;
      let ink: number;
      let back: number;
      let fast: boolean;
      if (revealed > 0) {
        if (revealed > BAND) continue;
        const k = revealed / BAND;
        tile = REST * (1 - k) + 0.35 * Math.max(0, 1 - k * 3);
        ink = 0.85 * (1 - k);
        back = 1 - k;
        fast = k < 0.5;
      } else if (covered < BAND) {
        const k = covered / BAND;
        tile = REST + (0.55 - REST) * (1 - k);
        ink = 0.9 - 0.55 * k;
        back = Math.min(1, k * 1.6);
        fast = true;
      } else {
        tile = REST;
        ink = 0.24;
        back = 1;
        fast = false;
      }
      backs.push(c, r, back);
      tiles.push(c, r, tile);
      // Behind the fronts only some tiles carry a digit, so the curtain stays calm.
      if (!fast && hash3(c, r, f.seed + 5) > 0.2) continue;
      const glyph = fast
        ? FRONT[Math.floor(hash3(c, r, tick) * FRONT.length)]!
        : BODY[Math.floor(hash3(c, r, slow) * BODY.length)]!;
      marks.push([x, y, glyph, ink]);
    }
  }
  if (f.background) {
    // Whole cells, so the hidden content cannot show between them.
    ctx.fillStyle = f.background;
    for (let i = 0; i < backs.length; i += 3) {
      ctx.globalAlpha = backs[i + 2]!;
      ctx.fillRect(backs[i]! * cw, backs[i + 1]! * ch, cw, ch);
    }
  }
  ctx.fillStyle = f.accent;
  for (let i = 0; i < tiles.length; i += 3) {
    ctx.globalAlpha = tiles[i + 2]!;
    ctx.fillRect(tiles[i]! * cw + 0.5, tiles[i + 1]! * ch + 0.5, cw - 1, ch - 1);
  }
  ctx.font = f.font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = f.ink;
  for (const [x, y, glyph, alpha] of marks) {
    ctx.globalAlpha = alpha;
    ctx.fillText(glyph, x, y);
  }
  ctx.globalAlpha = 1;
}
