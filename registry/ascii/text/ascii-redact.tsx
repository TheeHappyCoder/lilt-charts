'use client';

import {
  createElement,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from 'react';
import { CODE_GLYPHS, VISUALLY_HIDDEN, frame, rand, useReducedMotion, useSeen } from './text-kit';

export interface AsciiRedactProps {
  /** The text under the bars. Default 'The numbers are in'. */
  text?: string;
  /**
   * When it is revealed: `view` the first time it scrolls into view, `mount` at once, `hover` while
   * the pointer is over it (it redacts itself again when the pointer leaves). Default `view`.
   */
  trigger?: 'mount' | 'view' | 'hover';
  /** Seconds the reveal takes, first letter to last. Default 1.4. */
  duration?: number;
  /** Colour of the bars. Default the text colour. */
  bar?: string;
  /** Characters each letter flickers through as its bar lifts. */
  characters?: string;
  /** The element to render, such as 'h1' or 'p'. Default 'span'. */
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
}

/** Glyphs change at this rate while a letter decodes. */
const TICKS = 24;
/** Seconds a letter shows glyphs between its bar lifting and it landing. */
const DECODE = 0.22;

/**
 * Text behind black bars, like a document with its secrets struck out. The bars lift letter by
 * letter from the left, each letter flickering through a few glyphs before it lands, so the
 * words seem to be declassified as you read. Each word's bar is one piece, and screen readers
 * get the text itself.
 */
export function AsciiRedact({
  text = 'The numbers are in',
  trigger = 'view',
  duration = 1.4,
  bar,
  characters = CODE_GLYPHS,
  as = 'span',
  className,
  style,
}: AsciiRedactProps) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const seen = useSeen(ref, trigger === 'view' && !reduced);
  // Progress of the reveal, 0 all redacted → 1 all shown, and which way it is heading.
  const [progress, setProgress] = useState(reduced ? 1 : 0);
  const [target, setTarget] = useState(0);
  const [tick, setTick] = useState(0);
  // Bumped to replay the reveal from the start, such as when the text changes.
  const [run, setRun] = useState(0);
  const length = Math.max(0.1, duration);
  const live = useRef(progress);

  useEffect(() => {
    if (reduced) {
      setProgress(trigger === 'hover' ? 0 : 1);
      return;
    }
    if (trigger === 'mount' || (trigger === 'view' && seen)) {
      live.current = 0;
      setProgress(0);
      setTarget(1);
      setRun((n) => n + 1);
    }
  }, [trigger, seen, reduced, text, length]);

  // Run toward the target, then rest.
  useEffect(() => {
    if (reduced) return;
    let cancel = () => undefined as void;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const p = live.current;
      const next =
        target > p
          ? Math.min(target, p + dt / (length + DECODE))
          : Math.max(target, p - dt / (length * 0.5));
      live.current = next;
      setProgress(next);
      setTick(Math.floor(now / (1000 / TICKS)));
      if (next !== target) cancel = frame(step);
    };
    cancel = frame(step);
    return () => cancel();
  }, [target, length, reduced, run]);

  const letters = Array.from(text);
  const n = letters.filter((ch) => ch !== ' ').length;
  const set = characters || CODE_GLYPHS;
  const time = progress * (length + DECODE);
  let k = 0;
  const words: ReactNode[] = [];
  text.split(/( +)/).forEach((part, w) => {
    if (!part) return;
    if (part.startsWith(' ')) {
      words.push(part);
      return;
    }
    const spans = Array.from(part).map((ch, j) => {
      const index = k++;
      // A wave runs left to right, a little uneven so it reads as hand-lifted.
      const lift = (n > 1 ? index / (n - 1) : 0) * length * (0.85 + 0.15 * rand(index, 1, 5));
      const into = time - lift;
      if (into >= DECODE) return <span key={j}>{ch}</span>;
      if (into >= 0) {
        const glyph = set[Math.floor(rand(index, tick, 9) * set.length)] ?? ch;
        return (
          <span key={j} style={{ position: 'relative' }}>
            <span style={{ visibility: 'hidden' }}>{ch}</span>
            <span
              style={{
                position: 'absolute',
                left: '50%',
                top: 0,
                transform: 'translateX(-50%)',
                opacity: 0.7,
              }}
            >
              {glyph}
            </span>
          </span>
        );
      }
      return (
        <span
          key={j}
          style={{
            background: bar ?? 'currentColor',
            borderRadius:
              j === 0 ? '0.08em 0 0 0.08em' : j === part.length - 1 ? '0 0.08em 0.08em 0' : 0,
          }}
        >
          {/* The bar keeps the text colour; only the letter under it is hidden. */}
          <span style={{ visibility: 'hidden' }}>{ch}</span>
        </span>
      );
    });
    words.push(
      <span key={w} style={{ whiteSpace: 'nowrap' }}>
        {spans}
      </span>,
    );
  });

  // The bars sit in the text's own colour, so the visible layer keeps it.
  return createElement(
    as,
    {
      ref,
      className,
      style,
      onPointerEnter: trigger === 'hover' && !reduced ? () => setTarget(1) : undefined,
      onPointerLeave: trigger === 'hover' && !reduced ? () => setTarget(0) : undefined,
    },
    <span style={VISUALLY_HIDDEN}>{text}</span>,
    <span aria-hidden="true">{words}</span>,
  );
}
