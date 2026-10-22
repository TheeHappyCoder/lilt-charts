'use client';

import { useEffect, useRef, type CSSProperties } from 'react';
import { noise3 } from '../engine/noise';
import { MONO_STACK, fitCanvas, useReducedMotion } from './motion';

export interface AsciiDissolveProps {
  /** The image: same origin, or served with CORS so its colours can be read. Without one, a painted sunset. */
  src?: string;
  /** Describes the image for screen readers. */
  alt?: string;
  /** When it resolves: the first time it scrolls into view, or at once. Default `view`. */
  trigger?: 'view' | 'mount';
  /** Seconds from all type to all picture. Default 1.8. */
  duration?: number;
  /** Font size of each cell of type, in pixels. Default 10. */
  cellSize?: number;
  /** The pointer turns the picture back into type around it. Default true. */
  hover?: boolean;
  /** Glyphs from sparse to dense. */
  characters?: string;
  /** `cover` fills the box and crops; `contain` shows all of it. Default `cover`. */
  fit?: 'cover' | 'contain';
  className?: string;
  style?: CSSProperties;
}

/** A sunset painted in the browser, for trying the effect with no image at all. */
function paintSunset(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 640;
  c.height = 400;
  const g = c.getContext('2d')!;
  const sky = g.createLinearGradient(0, 0, 0, 400);
  sky.addColorStop(0, '#2a1b6e');
  sky.addColorStop(0.45, '#c2408f');
  sky.addColorStop(0.75, '#ff9a5a');
  sky.addColorStop(1, '#ffd38a');
  g.fillStyle = sky;
  g.fillRect(0, 0, 640, 400);
  g.fillStyle = '#fff1c4';
  g.beginPath();
  g.arc(420, 250, 70, 0, Math.PI * 2);
  g.fill();
  const ridge = (base: number, height: number, color: string, seed: number) => {
    g.fillStyle = color;
    g.beginPath();
    g.moveTo(0, 400);
    for (let x = 0; x <= 640; x += 8)
      g.lineTo(
        x,
        base - Math.abs(Math.sin(x * 0.012 + seed) + Math.sin(x * 0.031 + seed * 2) * 0.5) * height,
      );
    g.lineTo(640, 400);
    g.fill();
  };
  ridge(330, 70, '#5b2a6e', 1);
  ridge(370, 60, '#2b1546', 3);
  ridge(400, 40, '#140b26', 5);
  return c;
}

/**
 * An image that arrives out of type. It starts as glyphs in the picture's own colours, and cell by
 * cell, in drifting patches, the glyphs give way to the picture itself. Afterwards the pointer
 * turns the picture back into type wherever it passes.
 */
export function AsciiDissolve({
  src,
  alt,
  trigger = 'view',
  duration = 1.8,
  cellSize = 10,
  hover = true,
  characters = ' .:-=+*#%@',
  fit = 'cover',
  className,
  style,
}: AsciiDissolveProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const pointer = useRef({ x: -999, y: -999, on: 0, target: 0 });
  const wake = useRef<() => void>(() => undefined);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    let picture: CanvasImageSource | null = null;
    let pw = 0;
    let ph = 0;
    // Colours a cell, read from a copy of the picture scaled down to one pixel a cell.
    let colours: Uint8ClampedArray | null = null;
    let cols = 0;
    let rows = 0;
    let start = -1;
    let raf = 0;
    let visible = trigger === 'mount';
    const set = characters.length > 1 ? characters : ' .:-=+*#%@';

    const place = (w: number, h: number) => {
      const scale = fit === 'cover' ? Math.max(w / pw, h / ph) : Math.min(w / pw, h / ph);
      const dw = pw * scale;
      const dh = ph * scale;
      return { x: (w - dw) / 2, y: (h - dh) / 2, w: dw, h: dh };
    };

    const sample = (w: number, h: number, cw: number, ch: number) => {
      cols = Math.ceil(w / cw);
      rows = Math.ceil(h / ch);
      const small = document.createElement('canvas');
      small.width = cols;
      small.height = rows;
      const sg = small.getContext('2d', { willReadFrequently: true });
      if (!sg || !picture) return;
      const box = place(w, h);
      sg.drawImage(picture, box.x / cw, box.y / ch, box.w / cw, box.h / ch);
      try {
        colours = sg.getImageData(0, 0, cols, rows).data;
      } catch {
        // A picture from another origin without CORS: its colours cannot be read.
        colours = null;
      }
    };

    const draw = (now: number) => {
      raf = 0;
      if (!picture) return;
      const box = canvas.getBoundingClientRect();
      const w = box.width;
      const h = box.height;
      const dpr = fitCanvas(canvas, w, h);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.font = `600 ${cellSize}px ${MONO_STACK}`;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      const cw = Math.max(4, ctx.measureText('M').width);
      const ch = cellSize * 1.2;
      if (!colours || Math.ceil(w / cw) !== cols || Math.ceil(h / ch) !== rows)
        sample(w, h, cw, ch);
      if (visible && start < 0) start = now;
      const progress = reduced
        ? 1
        : start < 0
          ? 0
          : Math.min(1, (now - start) / (Math.max(0.2, duration) * 1000));
      const p = pointer.current;
      p.on += (p.target - p.on) * 0.15;
      ctx.clearRect(0, 0, w, h);
      const placed = place(w, h);
      ctx.drawImage(picture, placed.x, placed.y, placed.w, placed.h);
      const ink = getComputedStyle(canvas).color;
      const tick = Math.floor(now / 80);
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          // Cells give way in drifting patches, a little left to right.
          const threshold = 0.08 + noise3(col * 0.09, row * 0.14, 3) * 0.7 + (col / cols) * 0.18;
          let glyphness =
            progress >= 1 ? 0 : Math.max(0, Math.min(1, (threshold - progress) * 6 + 0.5));
          if (p.on > 0.01) {
            const d = Math.hypot(col * cw + cw / 2 - p.x, row * ch + ch / 2 - p.y) / (cw * 14);
            glyphness = Math.max(glyphness, (1 - d) * p.on * 1.4);
          }
          if (glyphness <= 0.02) continue;
          const i = (row * cols + col) * 4;
          const r = colours?.[i] ?? 128;
          const g = colours?.[i + 1] ?? 128;
          const b = colours?.[i + 2] ?? 128;
          // Behind a glyph, the picture's own colour in deep shadow, so type and picture belong together.
          if (colours) {
            ctx.globalAlpha = Math.min(1, glyphness) * 0.9;
            ctx.fillStyle = `rgb(${r * 0.22} ${g * 0.22} ${b * 0.22})`;
            ctx.fillRect(col * cw, row * ch, cw + 0.5, ch + 0.5);
          } else ctx.clearRect(col * cw, row * ch, cw + 0.5, ch + 0.5);
          const light = (0.3 * r + 0.59 * g + 0.11 * b) / 255;
          const flicker = glyphness < 0.9 ? ((col * 7 + row * 13 + tick) % 3) * 0.08 : 0;
          const glyph =
            set[Math.min(set.length - 1, Math.floor((light * 0.8 + 0.2 + flicker) * set.length))] ??
            '#';
          ctx.globalAlpha = Math.min(1, glyphness);
          ctx.fillStyle = colours ? `rgb(${r} ${g} ${b})` : ink;
          ctx.fillText(glyph, col * cw + cw / 2, row * ch + ch / 2);
        }
      }
      ctx.globalAlpha = 1;
      if ((progress < 1 && start >= 0) || p.on > 0.01 || p.target > 0)
        raf = requestAnimationFrame(draw);
    };
    wake.current = () => {
      if (!raf) raf = requestAnimationFrame(draw);
    };

    const ready = (image: CanvasImageSource, w: number, h: number) => {
      picture = image;
      pw = w;
      ph = h;
      colours = null;
      wake.current();
    };
    if (src) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => ready(img, img.naturalWidth, img.naturalHeight);
      img.src = src;
    } else {
      const painted = paintSunset();
      ready(painted, painted.width, painted.height);
    }

    let observer: IntersectionObserver | null = null;
    if (!visible && typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            visible = true;
            observer?.disconnect();
            wake.current();
          }
        },
        { threshold: 0.3 },
      );
      observer.observe(canvas);
    } else visible = true;
    const resize = new ResizeObserver(() => wake.current());
    resize.observe(canvas);
    return () => {
      cancelAnimationFrame(raf);
      observer?.disconnect();
      resize.disconnect();
    };
  }, [src, trigger, duration, cellSize, characters, fit, reduced]);

  return (
    <canvas
      ref={ref}
      className={className}
      role={alt ? 'img' : undefined}
      aria-label={alt}
      aria-hidden={alt ? undefined : true}
      style={{ display: 'block', width: '100%', height: '100%', ...style }}
      onPointerMove={(event) => {
        if (!hover || reduced) return;
        const box = event.currentTarget.getBoundingClientRect();
        pointer.current.x = event.clientX - box.left;
        pointer.current.y = event.clientY - box.top;
        pointer.current.target = 1;
        wake.current();
      }}
      onPointerLeave={() => {
        pointer.current.target = 0;
        wake.current();
      }}
    />
  );
}
