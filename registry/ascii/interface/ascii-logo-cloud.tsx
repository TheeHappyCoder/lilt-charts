'use client';

import { useEffect, useRef, type CSSProperties } from 'react';
import { MONO_STACK, fitCanvas, useReducedMotion } from './motion';

export interface AsciiLogoMark {
  /** The company's name: read by screen readers, and set as a wordmark when there is no `src`. */
  name: string;
  /** A logo image with transparency, same origin or served with CORS. */
  src?: string;
  /** Where the logo links to. */
  href?: string;
}

export interface AsciiLogoCloudProps {
  /** The logos. Default six made-up wordmarks. */
  logos?: readonly AsciiLogoMark[];
  /** Logos a row. Default 3. */
  columns?: number;
  /** Height of each tile in pixels. Default 72. */
  height?: number;
  /** Font size of the glyphs, in pixels. Default 8. */
  cellSize?: number;
  /** Colour a logo sharpens into. Default the text colour. */
  color?: string;
  /** Glyphs a logo is drawn in, sparse to dense. */
  characters?: string;
  className?: string;
  style?: CSSProperties;
}

const DEMO: readonly AsciiLogoMark[] = [
  { name: 'Acme' },
  { name: 'Globex' },
  { name: 'Umbra' },
  { name: 'Hooli' },
  { name: 'Kite' },
  { name: 'Nova' },
];

/** How much of each cell the logo covers, from its picture or its name set in type. */
function coverage(
  logo: AsciiLogoMark,
  image: HTMLImageElement | null,
  cols: number,
  rows: number,
  aspect: number,
) {
  const ss = 3;
  const c = document.createElement('canvas');
  c.width = cols * ss;
  c.height = rows * ss;
  const g = c.getContext('2d', { willReadFrequently: true });
  if (!g) return new Float32Array(cols * rows);
  if (image) {
    const scale = Math.min(
      (c.width * 0.86) / image.naturalWidth,
      (c.height * 0.7) / image.naturalHeight,
    );
    const w = image.naturalWidth * scale;
    const h = image.naturalHeight * scale;
    g.drawImage(image, (c.width - w) / 2, (c.height - h) / 2, w, h);
  } else {
    // A wordmark: the name in a heavy face, squashed into rows so it keeps its shape on screen.
    g.setTransform(1, 0, 0, 1 / aspect, 0, 0);
    let size = 100;
    g.font = `800 ${size}px "Helvetica Neue", Arial, system-ui, sans-serif`;
    size = Math.min(
      (c.width * 0.84 * size) / g.measureText(logo.name).width,
      c.height * aspect * 0.62,
    );
    g.font = `800 ${size}px "Helvetica Neue", Arial, system-ui, sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#fff';
    g.fillText(logo.name, c.width / 2, (c.height * aspect) / 2);
  }
  let data: Uint8ClampedArray;
  try {
    data = g.getImageData(0, 0, c.width, c.height).data;
  } catch {
    return new Float32Array(cols * rows);
  }
  const out = new Float32Array(cols * rows);
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      let sum = 0;
      for (let y = 0; y < ss; y++)
        for (let x = 0; x < ss; x++)
          sum += data[((row * ss + y) * c.width + col * ss + x) * 4 + 3]!;
      out[row * cols + col] = sum / (ss * ss * 255);
    }
  }
  return out;
}

/** One logo: noisy, scattered type until the pointer comes near, then a crisp mark. */
function Tile({
  logo,
  height,
  cellSize,
  color,
  characters,
  reduced,
}: {
  logo: AsciiLogoMark;
  height: number;
  cellSize: number;
  color?: string;
  characters: string;
  reduced: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const focus = useRef({ value: reduced ? 1 : 0, target: reduced ? 1 : 0 });
  const wake = useRef<() => void>(() => undefined);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    let mask: Float32Array | null = null;
    let image: HTMLImageElement | null = null;
    let cols = 0;
    let rows = 0;
    let raf = 0;
    let idle = 0;
    let onScreen = false;
    const set = characters.length > 1 ? characters : ' .:-=+*#%@';

    const draw = (now: number) => {
      raf = 0;
      const box = canvas.getBoundingClientRect();
      const dpr = fitCanvas(canvas, box.width, box.height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.font = `700 ${cellSize}px ${MONO_STACK}`;
      ctx.textBaseline = 'middle';
      const cw = Math.max(3, ctx.measureText('M').width);
      const ch = cellSize * 1.15;
      const nc = Math.floor(box.width / cw);
      const nr = Math.floor(box.height / ch);
      if (!mask || nc !== cols || nr !== rows) {
        cols = nc;
        rows = nr;
        mask = coverage(logo, image, cols, rows, ch / cw);
      }
      const f = focus.current;
      f.value += (f.target - f.value) * 0.12;
      ctx.clearRect(0, 0, box.width, box.height);
      ctx.fillStyle = color ?? getComputedStyle(canvas).color;
      const tick = Math.floor(now / 110);
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const v = mask[row * cols + col]!;
          if (v < 0.12) continue;
          const sharp = f.value;
          // Out of focus each glyph jitters and flickers; in focus it sits still and solid.
          const jitter = (1 - sharp) * 0.7;
          const seed = (col * 73856093) ^ (row * 19349663) ^ (tick * 83492791);
          const rx = ((seed & 255) / 255 - 0.5) * jitter;
          const ry = (((seed >> 8) & 255) / 255 - 0.5) * jitter;
          const level =
            sharp > 0.9 ? v : Math.max(0.1, v * (0.5 + (((seed >> 16) & 255) / 255) * 0.5));
          const glyph = set[Math.min(set.length - 1, Math.floor(level * set.length))] ?? '#';
          ctx.globalAlpha = 0.4 + sharp * 0.6 * v;
          ctx.fillText(glyph, (col + rx) * cw, (row + ry) * ch + ch / 2);
        }
      }
      ctx.globalAlpha = 1;
      // Settling, or idling out of focus at a gentle frame rate while on screen.
      const settling = Math.abs(f.target - f.value) > 0.01;
      if (settling) raf = requestAnimationFrame(draw);
      else if (onScreen && f.target === 0 && !reduced)
        idle = window.setTimeout(() => wake.current(), 110);
    };
    wake.current = () => {
      window.clearTimeout(idle);
      if (!raf) raf = requestAnimationFrame(draw);
    };
    if (logo.src) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        image = img;
        mask = null;
        wake.current();
      };
      img.src = logo.src;
    }
    const io = new IntersectionObserver((entries) => {
      onScreen = entries.some((e) => e.isIntersecting);
      if (onScreen) wake.current();
    });
    io.observe(canvas);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(idle);
      io.disconnect();
    };
  }, [logo, cellSize, color, characters, reduced]);

  const body = (
    <canvas ref={ref} aria-hidden="true" style={{ display: 'block', width: '100%', height }} />
  );
  const enter = () => {
    focus.current.target = 1;
    wake.current();
  };
  const leave = () => {
    if (reduced) return;
    focus.current.target = 0;
    wake.current();
  };
  const tile: CSSProperties = {
    display: 'block',
    color: 'inherit',
    borderRadius: 8,
    outlineOffset: 2,
  };
  return logo.href ? (
    <a
      href={logo.href}
      aria-label={logo.name}
      style={tile}
      onPointerEnter={enter}
      onPointerLeave={leave}
      onFocus={enter}
      onBlur={leave}
    >
      {body}
    </a>
  ) : (
    <div
      role="img"
      aria-label={logo.name}
      style={tile}
      onPointerEnter={enter}
      onPointerLeave={leave}
    >
      {body}
    </div>
  );
}

/**
 * A wall of logos drawn in type. At rest each one is a scatter of flickering glyphs, legible but
 * restless; as the pointer reaches it, it pulls together into a crisp mark. Give it pictures, or
 * names to set as wordmarks.
 */
export function AsciiLogoCloud({
  logos = DEMO,
  columns = 3,
  height = 84,
  cellSize = 7,
  color,
  characters = ' .:-=+*#%@',
  className,
  style,
}: AsciiLogoCloudProps) {
  const reduced = useReducedMotion();
  return (
    <div
      className={className}
      style={{
        display: 'grid',
        width: 'min(720px, 100%)',
        gridTemplateColumns: `repeat(${Math.max(1, columns)}, minmax(0, 1fr))`,
        gap: 12,
        ...style,
      }}
    >
      {logos.map((logo) => (
        <Tile
          key={logo.name}
          logo={logo}
          height={height}
          cellSize={cellSize}
          color={color}
          characters={characters}
          reduced={reduced}
        />
      ))}
    </div>
  );
}
