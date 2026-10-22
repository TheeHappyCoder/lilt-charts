'use client';

import {
  createElement,
  useCallback,
  useEffect,
  useRef,
  type CSSProperties,
  type ElementType,
  type PointerEvent,
} from 'react';
import { VISUALLY_HIDDEN, useReducedMotion, useSeen } from './text-kit';

export interface AsciiWaveProps {
  /** The text. Default 'Ride the wave'. */
  text?: string;
  /** When the wave runs: `hover` each time the pointer arrives, `view` once in view, `loop` every few seconds. Default `hover`. */
  trigger?: 'hover' | 'view' | 'loop';
  /** How high a letter rises at the crest, in em. Default 0.28. */
  height?: number;
  /** Seconds the wave takes to cross the text. Default 0.6. */
  duration?: number;
  /** Colour a letter flashes as the crest passes it. Default none. */
  accent?: string;
  /** Glyph a letter briefly turns into at the crest, such as '~'. Default none. */
  crest?: string;
  /** The element to render, such as 'h1' or 'p'. Default 'span'. */
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
}

/**
 * Text that a wave runs through: each letter rises and settles a beat after the one before, with a
 * little overshoot, and can flash a colour or turn into a glyph at the crest. Hover it and the
 * wave follows your pointer in from the side you entered. Screen readers get the text itself.
 */
export function AsciiWave({
  text = 'Ride the wave',
  trigger = 'hover',
  height = 0.28,
  duration = 0.6,
  accent,
  crest,
  as = 'span',
  className,
  style,
}: AsciiWaveProps) {
  const ref = useRef<HTMLElement>(null);
  const letters = useRef<(HTMLSpanElement | null)[]>([]);
  const glyphs = useRef<(HTMLSpanElement | null)[]>([]);
  const reduced = useReducedMotion();
  const seen = useSeen(ref, trigger === 'view' && !reduced);

  const run = useCallback(
    (fromRight = false) => {
      if (reduced) return;
      const spans = letters.current.filter(Boolean) as HTMLSpanElement[];
      const n = spans.length;
      const gap = (Math.max(0.1, duration) * 1000) / Math.max(1, n);
      spans.forEach((span, i) => {
        const order = fromRight ? n - 1 - i : i;
        const delay = order * gap;
        span.animate?.(
          [
            { transform: 'translateY(0)', color: 'inherit' },
            { transform: `translateY(${-height}em)`, color: accent ?? 'inherit', offset: 0.35 },
            { transform: `translateY(${height * 0.18}em)`, offset: 0.7 },
            { transform: 'translateY(0)', color: 'inherit' },
          ],
          { duration: 560, delay, easing: 'cubic-bezier(0.3, 0.6, 0.3, 1)' },
        );
        const glyph = glyphs.current[i];
        if (crest && glyph) {
          glyph.animate?.(
            [
              { opacity: 0 },
              { opacity: 1, offset: 0.3 },
              { opacity: 1, offset: 0.45 },
              { opacity: 0 },
            ],
            {
              duration: 420,
              delay,
            },
          );
          span.firstElementChild?.animate?.(
            [
              { opacity: 1 },
              { opacity: 0, offset: 0.3 },
              { opacity: 0, offset: 0.45 },
              { opacity: 1 },
            ],
            {
              duration: 420,
              delay,
            },
          );
        }
      });
    },
    [reduced, duration, height, accent, crest],
  );

  useEffect(() => {
    if (trigger === 'view' && seen) run();
    if (trigger !== 'loop' || reduced) return;
    run();
    const timer = window.setInterval(() => run(), Math.max(1.5, duration + 1.8) * 1000);
    return () => window.clearInterval(timer);
  }, [trigger, seen, run, reduced, duration]);

  let index = 0;
  const words = text.split(/( +)/).map((part, w) => {
    if (part.startsWith(' ') || !part) return part;
    return (
      <span key={w} style={{ whiteSpace: 'nowrap' }}>
        {Array.from(part).map((ch, j) => {
          const i = index++;
          return (
            <span
              key={j}
              ref={(el) => {
                letters.current[i] = el;
              }}
              style={{ display: 'inline-block', position: 'relative' }}
            >
              <span>{ch}</span>
              {crest ? (
                <span
                  ref={(el) => {
                    glyphs.current[i] = el;
                  }}
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: 0,
                    transform: 'translateX(-50%)',
                    opacity: 0,
                  }}
                >
                  {crest}
                </span>
              ) : null}
            </span>
          );
        })}
      </span>
    );
  });
  letters.current.length = index;

  return createElement(
    as,
    {
      ref,
      className,
      style,
      onPointerEnter:
        trigger === 'hover'
          ? (event: PointerEvent<HTMLElement>) => {
              const box = event.currentTarget.getBoundingClientRect();
              run(event.clientX > box.left + box.width / 2);
            }
          : undefined,
    },
    <span style={VISUALLY_HIDDEN}>{text}</span>,
    <span aria-hidden="true">{words}</span>,
  );
}
