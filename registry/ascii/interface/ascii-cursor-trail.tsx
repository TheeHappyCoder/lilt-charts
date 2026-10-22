'use client';

import { useEffect, useRef } from 'react';
import { GlyphSurface, LEVELS } from '../engine/surface';
import { AsciiCanvas, useSceneProps, type SceneProps } from '../react/ascii-canvas';
import { createCursorTrail, type CursorTrailOptions } from './cursor-trail';
import { MONO_STACK, fitCanvas, useReducedMotion } from './motion';

export type AsciiCursorTrailScope = 'window' | 'parent';

export type AsciiCursorTrailProps = SceneProps<CursorTrailOptions> & {
  /**
   * `window` lays the trail over the whole page, fixed and click-through, the usual way to use
   * it. `parent` fills the parent element, like any other scene. Default `window`.
   */
  scope?: AsciiCursorTrailScope;
};

const STEP = 1 / 60;

/**
 * Glyphs shed behind the pointer that drift, slow and fade. Over the whole page it runs only while
 * marks are alive: a still pointer costs nothing. With reduced motion it draws nothing.
 */
export function AsciiCursorTrail({ scope = 'window', ...props }: AsciiCursorTrailProps) {
  const canvasProps = useSceneProps(props, createCursorTrail);
  const reduced = useReducedMotion();
  if (scope === 'parent') return <AsciiCanvas {...canvasProps} />;
  if (reduced) return null;
  return <WindowTrail {...props} />;
}

/** The page-wide trail: a fixed canvas and a loop that sleeps whenever the trail is empty. */
function WindowTrail({
  cellSize = 14,
  interactive = true,
  speed = 1,
  className,
  style,
  label: _label,
  ...options
}: SceneProps<CursorTrailOptions>) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const key = JSON.stringify(options);
  const latest = useRef({ options, speed, cellSize, interactive });
  latest.current = { options, speed, cellSize, interactive };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const scene = createCursorTrail(latest.current.options);
    const surface = new GlyphSurface();
    const pointer = { x: 0, y: 0, active: false };
    let styles: string[] = [];
    let font = '';
    let cw = 8;
    let ch = 18;
    let raf = 0;
    let last = 0;
    let acc = 0;
    let moved = false;

    const restyle = () => {
      const ink = getComputedStyle(canvas).color;
      styles = scene.palette.flatMap((colour) => {
        ctx.fillStyle = '#000';
        ctx.fillStyle = colour === 'ink' ? ink : colour;
        const [r, g, b] = parse(String(ctx.fillStyle));
        return Array.from({ length: LEVELS }, (_, i) => `rgba(${r},${g},${b},${(i + 1) / LEVELS})`);
      });
    };

    const resize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const dpr = fitCanvas(canvas, width, height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const size = latest.current.cellSize;
      const family = getComputedStyle(canvas).fontFamily || MONO_STACK;
      font = `500 ${size}px ${family}, ${MONO_STACK}`;
      ctx.font = font;
      cw = Math.max(4, ctx.measureText('M').width);
      ch = Math.round(size * 1.25);
      const cols = Math.ceil(width / cw);
      const rows = Math.ceil(height / ch);
      surface.resize(cols, rows);
      scene.resize({ cols, rows, aspect: ch / cw });
      restyle();
    };

    const paint = () => {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
      ctx.font = font;
      ctx.textBaseline = 'middle';
      surface.clear();
      scene.draw(surface);
      surface.paint(ctx, styles, cw, ch, true);
    };

    const frame = (now: number) => {
      acc += Math.min(0.1, (now - last) / 1000) * latest.current.speed;
      last = now;
      let steps = 0;
      while (acc >= STEP && steps < 8) {
        scene.step(STEP, pointer);
        acc -= STEP;
        steps++;
      }
      paint();
      // Rest once the last mark has faded and the pointer has stopped moving.
      if (scene.alive === 0 && !moved) {
        raf = 0;
        pointer.active = false;
        // One step with no pointer forgets where it was, so the next move starts clean.
        scene.step(STEP, pointer);
        return;
      }
      moved = false;
      raf = requestAnimationFrame(frame);
    };

    const wake = () => {
      if (raf || document.hidden) return;
      last = performance.now();
      acc = 0;
      raf = requestAnimationFrame(frame);
    };

    const onMove = (e: PointerEvent) => {
      if (!latest.current.interactive || e.pointerType === 'touch') return;
      pointer.x = e.clientX / cw;
      pointer.y = e.clientY / ch;
      pointer.active = true;
      moved = true;
      wake();
    };
    const onDown = (e: PointerEvent) => {
      if (!latest.current.interactive) return;
      scene.press?.(e.clientX / cw, e.clientY / ch);
      wake();
    };
    const onLeave = () => {
      pointer.active = false;
    };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    window.addEventListener('blur', onLeave);
    const themeObserver = new MutationObserver(restyle);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'style', 'data-theme'],
    });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('blur', onLeave);
      themeObserver.disconnect();
    };
  }, [key, cellSize]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={className ? `lilt-ascii ${className}` : 'lilt-ascii'}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 2147483000,
        ...style,
      }}
    />
  );
}

/** Reads the `#rrggbb` or `rgba(r, g, b, a)` a canvas reports back for any CSS colour. */
function parse(value: string): [number, number, number] {
  if (value.startsWith('#')) {
    const n = parseInt(value.slice(1, 7), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const parts = value.match(/[\d.]+/g)?.map(Number) ?? [];
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
}
