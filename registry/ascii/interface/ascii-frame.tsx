'use client';

import { useEffect, useRef, type CSSProperties, type FocusEvent, type ReactNode } from 'react';
import { ramp } from '../engine/glyphs';
import { approach, clamp, noise3 } from '../engine/noise';
import { fitCanvas, monoFont } from './motion';

export type AsciiFrameVariant = 'line' | 'round' | 'dots';
export type AsciiFrameTrace = 'hover' | 'always' | 'none';

export interface AsciiFrameProps {
  children?: ReactNode;
  /** The border: `round` (`.-.` and `'-'` corners), `line` (`+-|`) or `dots`. Default `round`. */
  variant?: AsciiFrameVariant;
  /** Colour of the light that runs around the border. Default violet. */
  color?: string;
  /** When the light runs: on `hover` and keyboard focus, `always`, or `none`. Default `hover`. */
  trace?: AsciiFrameTrace;
  /** Stir faint glyphs inside the frame near the pointer. Default true. */
  stir?: boolean;
  /** Space between the border and the content, in pixels. Default 28. */
  padding?: number;
  className?: string;
  style?: CSSProperties;
}

/** One cell of the border: its centre in pixels and what is drawn there. */
interface Cell {
  x: number;
  y: number;
  glyph: string;
  /** For the dots border, the side cells hold two dots stacked. */
  side: boolean;
}

const GLYPHS: Record<
  AsciiFrameVariant,
  { tl: string; tr: string; bl: string; br: string; h: string; v: string }
> = {
  line: { tl: '+', tr: '+', bl: '+', br: '+', h: '-', v: '|' },
  round: { tl: '.', tr: '.', bl: "'", br: "'", h: '-', v: '|' },
  dots: { tl: '.', tr: '.', bl: '.', br: '.', h: '.', v: ':' },
};

/** Seconds for the light to run once around the border, whatever its size. */
const LAP = 2.8;
const STIR = '.:+*';

/**
 * Wraps content in a border drawn in glyphs, laid on a character grid that fits the box exactly.
 * On hover or keyboard focus a light runs around the border, and faint glyphs stir inside near the
 * pointer. The border is a canvas behind the content, so the content stays real and clickable.
 */
export function AsciiFrame({
  children,
  variant = 'round',
  color = '#8b6cff',
  trace = 'hover',
  stir = true,
  padding = 28,
  className,
  style,
}: AsciiFrameProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const options = useRef({ variant, color, trace, stir });
  options.current = { variant, color, trace, stir };
  // Pointer and focus, read by the running loop.
  const input = useRef({
    hover: false,
    focus: false,
    x: 0,
    y: 0,
    inside: false,
    wake: () => {},
    refresh: () => {},
  });

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!root || !canvas || !ctx) return;
    const reduced =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null;

    let width = 0;
    let height = 0;
    let cw = 8;
    let ch = 18;
    let cols = 0;
    let rows = 0;
    let font = '';
    let cells: Cell[] = [];
    let raf = 0;
    let last = 0;
    let time = 0;
    let head = 0;
    let heat = 0;
    let stirred = 0;
    let lit = 0;

    const layout = () => {
      const rect = root.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      if (width < 4 || height < 4) return;
      const dpr = fitCanvas(canvas, width, height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const metrics = monoFont(ctx, root);
      font = metrics.font;
      // Whole cells that fit the box exactly: each stretches a little to close the gap.
      cols = Math.max(2, Math.round(width / metrics.cw));
      rows = Math.max(2, Math.round(height / (metrics.size * 1.25)));
      cw = width / cols;
      ch = height / rows;
      cells = perimeter();
    };

    const perimeter = () => {
      const g = GLYPHS[options.current.variant] ?? GLYPHS.round;
      const at = (c: number, r: number, glyph: string, side = false): Cell => ({
        x: (c + 0.5) * cw,
        y: (r + 0.5) * ch,
        glyph,
        side,
      });
      const out: Cell[] = [];
      // Clockwise from the top left, so the light runs one way round.
      for (let c = 0; c < cols; c++)
        out.push(at(c, 0, c === 0 ? g.tl : c === cols - 1 ? g.tr : g.h));
      for (let r = 1; r < rows - 1; r++) out.push(at(cols - 1, r, g.v, true));
      for (let c = cols - 1; c >= 0; c--)
        out.push(at(c, rows - 1, c === 0 ? g.bl : c === cols - 1 ? g.br : g.h));
      for (let r = rows - 2; r >= 1; r--) out.push(at(0, r, g.v, true));
      return out;
    };

    /** The border cell nearest a point, so the light starts where the pointer came in. */
    const nearest = (x: number, y: number) => {
      let best = 0;
      let bestD = Infinity;
      cells.forEach((cell, i) => {
        const d = (cell.x - x) ** 2 + (cell.y - y) ** 2;
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      });
      return best;
    };

    const glyphAt = (cell: Cell, dots: boolean, alpha: number) => {
      if (alpha <= 0.004) return;
      ctx.globalAlpha = Math.min(1, alpha);
      if (!dots) {
        ctx.fillText(cell.glyph, cell.x, cell.y);
        return;
      }
      const s = Math.max(1.5, Math.round(cw * 0.2));
      if (cell.side) {
        ctx.fillRect(cell.x - s / 2, cell.y - ch / 4 - s / 2, s, s);
        ctx.fillRect(cell.x - s / 2, cell.y + ch / 4 - s / 2, s, s);
      } else {
        ctx.fillRect(cell.x - s / 2, cell.y - s / 2, s, s);
      }
    };

    const draw = () => {
      const { color: accent, variant: kind } = options.current;
      const ink = getComputedStyle(root).color;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
      if (!cells.length) return;
      ctx.font = font;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const dots = kind === 'dots';
      const n = cells.length;
      const tail = Math.max(12, n * 0.3);

      // Faint glyphs stirred up inside, near the pointer, under the content.
      const { x: px, y: py } = input.current;
      if (stirred > 0.01) {
        ctx.fillStyle = ink;
        const reach = 5.5;
        const c0 = Math.max(1, Math.floor(px / cw - reach * 1.6));
        const c1 = Math.min(cols - 2, Math.ceil(px / cw + reach * 1.6));
        const r0 = Math.max(1, Math.floor(py / ch - reach * 0.75));
        const r1 = Math.min(rows - 2, Math.ceil(py / ch + reach * 0.75));
        for (let r = r0; r <= r1; r++) {
          for (let c = c0; c <= c1; c++) {
            const x = (c + 0.5) * cw;
            const y = (r + 0.5) * ch;
            const d = Math.hypot((x - px) / cw / 1.6, (y - py) / ch / 0.75) / reach;
            if (d >= 1) continue;
            const fall = (1 - d) * (1 - d);
            // Patches of noise, not every cell: dust kicked up rather than ruled lines.
            const n3 = noise3(c * 0.45, r * 0.9, time * 0.8);
            const v = (n3 - 0.45) * 2.4 * Math.sqrt(fall);
            if (v <= 0) continue;
            const glyph = ramp(STIR, v);
            ctx.globalAlpha = 0.32 * stirred * fall;
            ctx.fillText(glyph, x, y);
          }
        }
      }

      // The border: quiet ink, brighter while lit, with the light running round on top.
      ctx.fillStyle = ink;
      const base = 0.3 + 0.2 * lit;
      const light = (i: number) => {
        if (heat <= 0.001) return 0;
        const behind = (((head - i) % n) + n) % n;
        return behind < tail ? heat * Math.pow(1 - behind / tail, 1.7) : 0;
      };
      for (let i = 0; i < n; i++) glyphAt(cells[i]!, dots, base * (1 - light(i)));
      if (heat > 0.001) {
        // The light is set heavier than the border and glows; its brightest cells go over twice.
        // A faint block of light behind each lit cell, the way a mosaic tile glows.
        ctx.fillStyle = accent;
        for (let i = 0; i < n; i++) {
          const l = light(i);
          if (l < 0.02) continue;
          const cell = cells[i]!;
          ctx.globalAlpha = 0.2 * l;
          ctx.fillRect(cell.x - cw / 2 + 0.5, cell.y - ch / 2 + 1, cw - 1, ch - 2);
        }
        ctx.font = font.replace(/^\d+/, '700');
        ctx.shadowColor = accent;
        ctx.shadowBlur = 8;
        for (let i = 0; i < n; i++) {
          const l = light(i);
          glyphAt(cells[i]!, dots, l);
          if (l > 0.55) glyphAt(cells[i]!, dots, (l - 0.55) * 2);
        }
        // A pale core at the very front, so the light reads as moving.
        const front = Math.floor(head) % n;
        ctx.fillStyle = ink;
        for (let k = 0; k < 3; k++) {
          glyphAt(cells[(front - k + n) % n]!, dots, heat * (0.75 - k * 0.25));
        }
        ctx.shadowBlur = 0;
        ctx.font = font;
      }
      ctx.globalAlpha = 1;
    };

    const wanted = () => {
      const { trace: mode, stir: stirs } = options.current;
      const engaged = input.current.hover || input.current.focus;
      return {
        heat: mode === 'always' || (mode === 'hover' && engaged) ? 1 : 0,
        stir: stirs && input.current.inside ? 1 : 0,
        lit: engaged ? 1 : 0,
      };
    };

    const frame = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      time += dt;
      const target = wanted();
      heat = approach(heat, target.heat, target.heat ? 6 : 3, dt);
      stirred = approach(stirred, target.stir, 5, dt);
      lit = approach(lit, target.lit, 6, dt);
      head = (head + (cells.length / LAP) * dt) % Math.max(1, cells.length);
      draw();
      const settled =
        target.heat === 0 &&
        heat < 0.002 &&
        Math.abs(stirred - target.stir) < 0.002 &&
        target.stir === 0 &&
        Math.abs(lit - target.lit) < 0.002;
      if (settled) {
        heat = 0;
        stirred = 0;
        lit = target.lit;
        raf = 0;
        draw();
        return;
      }
      raf = requestAnimationFrame(frame);
    };

    const wake = () => {
      if (reduced?.matches) {
        const target = wanted();
        heat = 0;
        stirred = 0;
        lit = target.lit;
        draw();
        return;
      }
      if (raf) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    input.current.wake = () => {
      const engaged = input.current.hover || input.current.focus;
      if (engaged && heat < 0.05) head = nearest(input.current.x, input.current.y);
      wake();
    };

    const refresh = () => {
      layout();
      draw();
      wake();
    };
    input.current.refresh = refresh;
    const resizeObserver = new ResizeObserver(refresh);
    resizeObserver.observe(root);
    const themeObserver = new MutationObserver(() => draw());
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'style', 'data-theme'],
    });
    reduced?.addEventListener('change', refresh);
    document.fonts?.ready.then(refresh);
    refresh();
    return () => {
      cancelAnimationFrame(raf);
      raf = -1;
      resizeObserver.disconnect();
      themeObserver.disconnect();
      reduced?.removeEventListener('change', refresh);
      input.current.wake = () => {};
      input.current.refresh = () => {};
    };
  }, []);

  // A change of look redraws through the loop.
  const ink = style?.color;
  useEffect(() => {
    input.current.refresh();
  }, [variant, color, trace, stir, padding, ink]);

  const move = (e: { clientX: number; clientY: number }) => {
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;
    input.current.x = clamp(e.clientX - rect.left, 0, rect.width);
    input.current.y = clamp(e.clientY - rect.top, 0, rect.height);
  };

  const onBlur = (e: FocusEvent<HTMLDivElement>) => {
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    input.current.focus = false;
    input.current.wake();
  };

  return (
    <div
      ref={rootRef}
      className={className ? `lilt-ascii-frame ${className}` : 'lilt-ascii-frame'}
      style={{ position: 'relative', display: 'inline-block', padding, ...style }}
      onPointerEnter={(e) => {
        move(e);
        input.current.hover = e.pointerType !== 'touch';
        input.current.inside = e.pointerType !== 'touch';
        input.current.wake();
      }}
      onPointerMove={(e) => {
        move(e);
        if (!input.current.inside && e.pointerType !== 'touch') {
          input.current.inside = true;
          input.current.hover = true;
          input.current.wake();
        }
      }}
      onPointerLeave={() => {
        input.current.hover = false;
        input.current.inside = false;
        input.current.wake();
      }}
      onFocus={(e) => {
        if (!input.current.focus && !input.current.hover) {
          const rect = e.currentTarget.getBoundingClientRect();
          input.current.x = 0;
          input.current.y = rect.height / 2;
        }
        input.current.focus = true;
        input.current.wake();
      }}
      onBlur={onBlur}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      />
      <div style={{ position: 'relative' }}>{children}</div>
    </div>
  );
}
