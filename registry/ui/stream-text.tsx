'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useCallback, useRef, type CSSProperties } from 'react';

export interface StreamTextProps {
  /** Everything received so far. Pass the growing text as it streams in. */
  text: string;
  /** Still arriving: a caret rides the end of the text until it stops. Default false. */
  streaming?: boolean;
  /** Milliseconds a new word takes to clear. Default 500. */
  duration?: number;
  /** How blurred a word arrives, in pixels. Default 6. */
  blur?: number;
  /** Show the caret while streaming. Default true. */
  caret?: boolean;
  className?: string;
  style?: CSSProperties;
}

interface Piece {
  /** Where it starts in the text, which keys it. */
  at: number;
  text: string;
  /** Seconds after it arrives that it starts to clear, so a burst of words reads left to right. */
  delay: number;
}

const STAGGER = 0.035;
const MOST_STAGGER = 0.28;
const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

/** The new text, cut into words that each keep the space before them. */
function piecesOf(text: string, from: number): Piece[] {
  const pieces: Piece[] = [];
  let at = from;
  for (const [index, word] of (text.slice(from).match(/\s*\S+|\s+/g) ?? []).entries()) {
    pieces.push({ at, text: word, delay: Math.min(index * STAGGER, MOST_STAGGER) });
    at += word.length;
  }
  return pieces;
}

/**
 * Text that arrives the way a model writes it. Each new word clears out of a blur, a burst of
 * them a beat apart, while the words already there stay perfectly still; even a word that arrives
 * in halves blurs in half by half. A soft caret rides the end while it streams and blurs away
 * when it stops. Pass the whole text so far each time; if it stops being a continuation, it starts
 * over.
 */
export function StreamText({
  text,
  streaming = false,
  duration = 500,
  blur = 6,
  caret = true,
  className,
  style,
}: StreamTextProps) {
  const reduced = useReducedMotion();
  const memo = useRef<{ text: string; pieces: Piece[] }>({ text: '', pieces: [] });
  if (memo.current.text !== text) {
    const continues = text.startsWith(memo.current.text);
    memo.current = {
      text,
      pieces: continues
        ? [...memo.current.pieces, ...piecesOf(text, memo.current.text.length)]
        : piecesOf(text, 0),
    };
  }

  // Read when a word lands, so changing them never replays the words already there.
  const settings = useRef({ duration, blur, reduced });
  settings.current = { duration, blur, reduced };
  // Each word animates once, when it lands; a stable ref means a re-render never replays it.
  const arrive = useCallback((element: HTMLSpanElement | null) => {
    const { duration, blur, reduced } = settings.current;
    if (!element || reduced || typeof element.animate !== 'function') return;
    element.animate(
      [
        { opacity: 0, filter: `blur(${blur}px)` },
        { opacity: 1, filter: 'blur(0px)' },
      ],
      { duration, delay: Number(element.dataset.delay) * 1000, easing: EASE, fill: 'backwards' },
    );
  }, []);

  return (
    <div
      className={className}
      aria-busy={streaming}
      style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', ...style }}
    >
      {memo.current.pieces.map((piece) => (
        <span key={piece.at} ref={arrive} data-delay={piece.delay}>
          {piece.text}
        </span>
      ))}
      <AnimatePresence>
        {streaming && caret ? (
          <motion.span
            aria-hidden="true"
            initial={{ opacity: 0, scale: 0.4, filter: 'blur(4px)' }}
            animate={{ opacity: 0.85, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.4, filter: 'blur(4px)' }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            style={{
              display: 'inline-block',
              width: '0.62em',
              height: '0.62em',
              marginLeft: '0.3em',
              borderRadius: '50%',
              verticalAlign: '-0.04em',
              background: 'currentColor',
            }}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}
