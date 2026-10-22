'use client';

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { clamp } from '../engine/noise';
import { frontAt, paintCurtain, type CurtainDirection } from './curtain-paint';
import { fitCanvas, monoFont, useReducedMotion } from './motion';

export type AsciiTransitionDirection = CurtainDirection;

export interface AsciiTransitionProps {
  /** Names what is shown. When it changes, the glyphs sweep across and the new children appear. */
  id: string;
  children?: ReactNode;
  /** Which way the sweep travels; `radial` opens from the centre. Default `right`. */
  direction?: AsciiTransitionDirection;
  /** Seconds for the whole change, covering and revealing. Default 0.9. */
  duration?: number;
  /** Colour of the glyphs at the front of the sweep. Default violet. */
  color?: string;
  className?: string;
  style?: CSSProperties;
}

const toward = (d: AsciiTransitionDirection) =>
  d === 'right' ? 'to right' : d === 'left' ? 'to left' : d === 'down' ? 'to bottom' : 'to top';

/**
 * Swaps content behind a curtain of type. When `id` changes a front of scrambling glyphs sweeps
 * across, hiding the old content; at the midpoint the new children take its place, and a second
 * front sweeps after it, resolving the glyphs away. With reduced motion the content swaps at once.
 */
export function AsciiTransition({
  id,
  children,
  direction = 'right',
  duration = 0.9,
  color = '#8b6cff',
  className,
  style,
}: AsciiTransitionProps) {
  const reduced = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [shownId, setShownId] = useState(id);
  // What the shown id last rendered, kept on screen until the sweep has covered it.
  const held = useRef(children);
  if (id === shownId || reduced) held.current = children;
  const latest = useRef({ id, direction, duration, color });
  latest.current = { id, direction, duration, color };
  const run = useRef({ raf: 0, start: 0, swapped: false, seed: 0 });

  useLayoutEffect(() => {
    if (reduced) {
      if (id !== shownId) setShownId(id);
      return;
    }
    if (id === shownId) return;
    const state = run.current;
    // Already sweeping toward an older id: the midpoint will pick up this one instead.
    if (state.raf && !state.swapped) return;
    cancelAnimationFrame(state.raf);
    state.start = performance.now();
    state.swapped = false;
    state.seed++;

    const root = rootRef.current;
    const content = contentRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!root || !content || !canvas || !ctx) {
      setShownId(id);
      return;
    }

    // A rounded card keeps its corners: the curtain takes the radius of what it covers.
    const first = content.firstElementChild;
    canvas.style.borderRadius = first ? getComputedStyle(first).borderRadius : '';

    const frame = (now: number) => {
      const { duration: seconds, direction: way, color: accent } = latest.current;
      const t = clamp((now - state.start) / 1000 / Math.max(0.1, seconds), 0, 1);
      const rect = root.getBoundingClientRect();
      const dpr = fitCanvas(canvas, rect.width, rect.height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, rect.width, rect.height);

      // Two fronts, one after the other: the first covers, the second reveals.
      const f1 = frontAt(t / 0.5);
      const f2 = frontAt((t - 0.5) / 0.5);
      if (t >= 0.5 && !state.swapped) {
        state.swapped = true;
        setShownId(latest.current.id);
      }

      const mask = (front: number, show: 'after' | 'before') => {
        const at = front * 100;
        const [a, b] = show === 'after' ? ['transparent', 'black'] : ['black', 'transparent'];
        const stops = `${a} ${at - 2}%, ${b} ${at + 4}%`;
        return way === 'radial'
          ? `radial-gradient(circle farthest-corner at 50% 50%, ${stops})`
          : `linear-gradient(${toward(way)}, ${stops})`;
      };
      const image = t >= 1 ? '' : state.swapped ? mask(f2, 'before') : mask(f1, 'after');
      content.style.maskImage = image;
      content.style.setProperty('-webkit-mask-image', image);

      if (t < 1) {
        const { font, size, cw } = monoFont(ctx, root);
        paintCurtain(ctx, {
          width: rect.width,
          height: rect.height,
          cw,
          ch: size * 1.25,
          font,
          accent,
          ink: getComputedStyle(root).color,
          background: null,
          way,
          covering: f1,
          revealing: f2,
          seed: state.seed,
          now,
        });
      }

      state.raf = t < 1 ? requestAnimationFrame(frame) : 0;
    };
    state.raf = requestAnimationFrame(frame);
  }, [id, shownId, reduced]);

  useEffect(
    () => () => {
      cancelAnimationFrame(run.current.raf);
    },
    [],
  );

  return (
    <div
      ref={rootRef}
      className={className ? `lilt-ascii-transition ${className}` : 'lilt-ascii-transition'}
      style={{ position: 'relative', ...style }}
    >
      <div ref={contentRef}>{id === shownId || reduced ? children : held.current}</div>
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
    </div>
  );
}
