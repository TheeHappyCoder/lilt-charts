'use client';

import { useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { CODE_GLYPHS, rand } from '../text/text-kit';
import { MONO_STACK, useReducedMotion } from './motion';

export interface AsciiScrollMeterProps {
  /**
   * The element whose scrolling it measures. Default the page, with the meter fixed to the edge of
   * the window; with a target it fills its positioned parent's edge instead.
   */
  target?: RefObject<HTMLElement | null>;
  /** Which edge it runs along. Default 'right'. */
  side?: 'left' | 'right';
  /** Gradient stops the read part takes, top to bottom. */
  colors?: readonly string[];
  /** Glyph for read and unread cells. Default '█' and '·'. */
  read?: string;
  unread?: string;
  /** Show how far through you are beside the head while scrolling. Default true. */
  label?: boolean;
  /** Font size of the cells, in pixels. Default 11. */
  cellSize?: number;
  className?: string;
  style?: CSSProperties;
}

/** Mixes the gradient at `t`, 0 → 1, as a CSS colour. */
const along = (stops: readonly string[], t: number) => {
  if (stops.length <= 1) return stops[0] ?? 'currentColor';
  const k = Math.min(stops.length - 2, Math.floor(t * (stops.length - 1)));
  const f = t * (stops.length - 1) - k;
  return `color-mix(in srgb, ${stops[k]} ${Math.round((1 - f) * 100)}%, ${stops[k + 1]})`;
};

/**
 * A reading meter in type, along the edge of the page or of a scrolling box. It fills with solid
 * cells as you read, the leading cell scrambling like a cursor, and shows how far through you are
 * beside it while you scroll, then fades back.
 */
export function AsciiScrollMeter({
  target,
  side = 'right',
  colors = ['#7c5cff', '#e5489c', '#ffb36b'],
  read = '█',
  unread = '·',
  label = true,
  cellSize = 11,
  className,
  style,
}: AsciiScrollMeterProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [progress, setProgress] = useState(0);
  const [cells, setCells] = useState(0);
  const [moving, setMoving] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const scroller = target?.current ?? null;
    let still = 0;
    const measure = () => {
      const el = scroller ?? document.scrollingElement ?? document.documentElement;
      const room = el.scrollHeight - el.clientHeight;
      setProgress(room > 0 ? Math.min(1, Math.max(0, el.scrollTop / room)) : 0);
    };
    const onScroll = () => {
      measure();
      setMoving(true);
      setTick((n) => n + 1);
      window.clearTimeout(still);
      still = window.setTimeout(() => setMoving(false), 900);
    };
    const source: HTMLElement | Window = scroller ?? window;
    source.addEventListener('scroll', onScroll, { passive: true });
    measure();
    const sized = new ResizeObserver(() => {
      const h = ref.current?.getBoundingClientRect().height ?? 0;
      setCells(Math.max(4, Math.floor(h / (cellSize * 1.2))));
      measure();
    });
    if (ref.current) sized.observe(ref.current);
    return () => {
      source.removeEventListener('scroll', onScroll);
      sized.disconnect();
      window.clearTimeout(still);
    };
  }, [target, cellSize]);

  const head = Math.min(cells - 1, Math.floor(progress * cells));
  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={className}
      style={{
        position: target ? 'absolute' : 'fixed',
        top: 8,
        bottom: 8,
        [side]: 6,
        width: cellSize,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        fontFamily: MONO_STACK,
        fontSize: cellSize,
        lineHeight: 1.2,
        pointerEvents: 'none',
        zIndex: 20,
        ...style,
      }}
    >
      {Array.from({ length: cells }, (_, i) => {
        const done = i < head || progress >= 1;
        const isHead = i === head && progress > 0 && progress < 1;
        const glyph =
          isHead && !reduced
            ? CODE_GLYPHS[Math.floor(rand(i, tick, 3) * CODE_GLYPHS.length)]
            : done
              ? read
              : unread;
        return (
          <span
            key={i}
            style={{
              color: done || isHead ? along(colors, i / Math.max(1, cells - 1)) : 'currentColor',
              opacity: done || isHead ? 1 : 0.3,
            }}
          >
            {glyph}
          </span>
        );
      })}
      {label && cells ? (
        <span
          style={{
            position: 'absolute',
            top: `${(head / cells) * 100}%`,
            [side === 'right' ? 'right' : 'left']: cellSize + 6,
            padding: '1px 6px',
            borderRadius: 4,
            background: 'color-mix(in srgb, currentColor 10%, transparent)',
            whiteSpace: 'nowrap',
            opacity: moving ? 1 : 0,
            transform: moving ? 'none' : `translateX(${side === 'right' ? 4 : -4}px)`,
            transition: 'opacity 240ms, transform 240ms',
          }}
        >
          {Math.round(progress * 100)}%
        </span>
      ) : null}
    </div>
  );
}
