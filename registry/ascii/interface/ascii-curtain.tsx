'use client';

import { useEffect, useLayoutEffect, useRef, type CSSProperties } from 'react';
import { clamp } from '../engine/noise';
import { frontAt, paintCurtain, type CurtainDirection } from './curtain-paint';
import { fitCanvas, monoFont, useReducedMotion } from './motion';

export interface AsciiCurtainProps {
  /**
   * Draw the curtain over the area, or take it away. Covering sweeps a front of scrambling type
   * across and hides what is behind; uncovering sweeps a second front that resolves it away.
   */
  covered: boolean;
  /** Called once the area is fully hidden: the moment to swap what is behind it. */
  onCovered?: () => void;
  /** Which way the fronts travel; `radial` opens from the centre. Default `right`. */
  direction?: CurtainDirection;
  /** Seconds for each front, covering or revealing. Default 0.4. */
  duration?: number;
  /** Colour of the tiles at the fronts. Default violet. */
  color?: string;
  /**
   * What hides the area while it is covered: any CSS colour, including `var(--…)`. Default the
   * page's background.
   */
  background?: string;
  className?: string;
  /** Place the curtain yourself; by default it is fixed over the whole window. */
  style?: CSSProperties;
}

type Phase = 'open' | 'covering' | 'covered' | 'revealing';

/** The page's own background: the body's, or the root's when the body is see-through. */
function pageBackground() {
  for (const element of [document.body, document.documentElement]) {
    const colour = getComputedStyle(element).backgroundColor;
    if (colour && colour !== 'transparent' && !/rgba\(.*,\s*0\)$/.test(colour)) return colour;
  }
  return '#ffffff';
}

/**
 * A curtain of type you raise and lower, for changes you run yourself, such as a route change:
 * set `covered`, swap the content in `onCovered`, then clear `covered` once it is ready. While it
 * waits, the curtain stays up, quietly ticking, so a slow change reads as loading. It never takes
 * the pointer. With reduced motion it calls `onCovered` at once and draws nothing.
 */
export function AsciiCurtain({
  covered,
  onCovered,
  direction = 'right',
  duration = 0.4,
  color = '#8b6cff',
  background,
  className,
  style,
}: AsciiCurtainProps) {
  const reduced = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const latest = useRef({ covered, onCovered, direction, duration, color, background });
  latest.current = { covered, onCovered, direction, duration, color, background };
  const run = useRef({ phase: 'open' as Phase, start: 0, raf: 0, seed: 0, fill: '' });

  useLayoutEffect(() => {
    const state = run.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (reduced || !canvas || !ctx) {
      if (covered) latest.current.onCovered?.();
      return;
    }
    if (covered && (state.phase === 'open' || state.phase === 'revealing')) {
      state.phase = 'covering';
      state.start = performance.now();
      state.seed++;
      // What hides the area, resolved once per curtain so CSS variables and themes apply.
      canvas.style.outlineColor = latest.current.background ?? '';
      state.fill = latest.current.background
        ? getComputedStyle(canvas).outlineColor
        : pageBackground();
    } else if (!covered && state.phase === 'covered') {
      state.phase = 'revealing';
      state.start = performance.now();
    }
    if (state.raf || state.phase === 'open') return;

    const frame = (now: number) => {
      const { duration: seconds, direction: way, color: accent } = latest.current;
      const t = clamp((now - state.start) / 1000 / Math.max(0.05, seconds), 0, 1);
      if (state.phase === 'covering' && t >= 1) {
        state.phase = 'covered';
        latest.current.onCovered?.();
        // Uncovered while it was still covering: reveal straight away.
        if (!latest.current.covered) {
          state.phase = 'revealing';
          state.start = now;
        }
      } else if (state.phase === 'revealing' && t >= 1) {
        state.phase = 'open';
      }
      const rect = canvas.getBoundingClientRect();
      const dpr = fitCanvas(canvas, rect.width, rect.height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, rect.width, rect.height);
      if (state.phase === 'open') {
        state.raf = 0;
        return;
      }
      const p = clamp((now - state.start) / 1000 / Math.max(0.05, seconds), 0, 1);
      const { font, size, cw } = monoFont(ctx, canvas);
      paintCurtain(ctx, {
        width: rect.width,
        height: rect.height,
        cw,
        ch: size * 1.25,
        font,
        accent,
        ink: getComputedStyle(canvas).color,
        background: state.fill,
        way,
        covering: state.phase === 'covering' ? frontAt(p) : frontAt(1),
        revealing: state.phase === 'revealing' ? frontAt(p) : frontAt(0),
        seed: state.seed,
        now,
      });
      state.raf = requestAnimationFrame(frame);
    };
    state.raf = requestAnimationFrame(frame);
  }, [covered, reduced]);

  useEffect(
    () => () => {
      cancelAnimationFrame(run.current.raf);
    },
    [],
  );

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={className}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        outline: 'none',
        ...style,
      }}
    />
  );
}
