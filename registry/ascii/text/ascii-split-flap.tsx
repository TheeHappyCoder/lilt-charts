'use client';

import {
  createElement,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
} from 'react';
import { MONO_STACK } from '../interface/motion';
import { VISUALLY_HIDDEN, useReducedMotion } from './text-kit';

export interface AsciiSplitFlapProps {
  /** What the board shows. Each line break starts a new row. Default 'DEPARTURES'. */
  text?: string;
  /** Tiles a row; shorter lines are padded with blanks. Default the longest line. */
  length?: number;
  /** The order the flaps turn through. Every letter goes the long way round to its own. */
  characters?: string;
  /** Seconds each flap takes to fall. Default 0.06. */
  speed?: number;
  /** Colour of the tiles. Default near black. */
  tile?: string;
  /** Colour of the characters. Default warm white. */
  ink?: string;
  /** The element to render, such as 'h1' or 'p'. Default 'div'. */
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
}

export const FLAP_CHARACTERS = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,:!?-/&+';

interface FlapProps {
  target: string;
  characters: string;
  speed: number;
  delay: number;
  reduced: boolean;
  tile: string;
  ink: string;
}

const HALF: CSSProperties = {
  position: 'absolute',
  left: 0,
  right: 0,
  height: '50%',
  overflow: 'hidden',
  backfaceVisibility: 'hidden',
};

/** One half of a character: the top or the bottom of it, cut at the tile's hinge. */
function Half({
  char,
  part,
  tile,
  style,
}: {
  char: string;
  part: 'top' | 'bottom';
  tile: string;
  style?: CSSProperties;
}) {
  return (
    <span
      style={{
        ...HALF,
        ...(part === 'top'
          ? { top: 0, borderRadius: '0.12em 0.12em 0 0' }
          : { bottom: 0, borderRadius: '0 0 0.12em 0.12em' }),
        background: tile,
        ...style,
      }}
    >
      <span
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          height: '200%',
          top: part === 'top' ? 0 : '-100%',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        {char === ' ' ? ' ' : char}
      </span>
    </span>
  );
}

/**
 * One tile. Given a new character it turns through the alphabet to it, a flap at a time: the top
 * half of the old character falls away to show the new one behind it, and the bottom half of the
 * new one swings down over the old.
 */
function Flap({ target, characters, speed, delay, reduced, tile, ink }: FlapProps) {
  const [shown, setShown] = useState(reduced ? target : ' ');
  const [previous, setPrevious] = useState(' ');
  const [turns, setTurns] = useState(0);
  const falling = useRef<HTMLSpanElement>(null);
  const landing = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (reduced) {
      setShown(target);
      setPrevious(target);
      return;
    }
    let current = shown;
    let timer = 0;
    const want = characters.includes(target) ? target : ' ';
    const step = () => {
      if (current === want) return;
      const index = characters.indexOf(current);
      const next = characters[(index + 1) % characters.length] ?? ' ';
      setPrevious(current);
      setShown(next);
      setTurns((n) => n + 1);
      current = next;
      timer = window.setTimeout(step, speed * 1000);
    };
    timer = window.setTimeout(step, delay * 1000);
    return () => window.clearTimeout(timer);
    // `shown` is read once as the starting point; it must not restart the run.
  }, [target, characters, speed, delay, reduced]);

  // Each turn plays its fall before the frame paints, so the new character never pops in.
  useLayoutEffect(() => {
    if (!turns || reduced) return;
    const duration = speed * 1000;
    falling.current?.animate?.(
      [
        { transform: 'rotateX(0deg)', filter: 'brightness(1)' },
        { transform: 'rotateX(-90deg)', filter: 'brightness(0.6)' },
      ],
      { duration: duration / 2, easing: 'ease-in', fill: 'forwards' },
    );
    landing.current?.animate?.(
      [
        { transform: 'rotateX(90deg)', filter: 'brightness(1.3)' },
        { transform: 'rotateX(90deg)', filter: 'brightness(1.3)', offset: 0.5 },
        { transform: 'rotateX(0deg)', filter: 'brightness(1)' },
      ],
      { duration, easing: 'ease-out', fill: 'forwards' },
    );
  }, [turns, speed, reduced]);

  return (
    <span
      style={{
        position: 'relative',
        display: 'inline-block',
        width: '0.95em',
        height: '1.4em',
        margin: '0 0.05em',
        color: ink,
        perspective: '3em',
        boxShadow: '0 0.08em 0.16em rgb(0 0 0 / 0.35)',
        borderRadius: '0.12em',
      }}
    >
      <Half char={shown} part="top" tile={tile} />
      <Half char={reduced ? shown : previous} part="bottom" tile={tile} />
      {reduced ? null : (
        <>
          <span ref={falling} style={{ ...HALF, top: 0, transformOrigin: 'bottom', zIndex: 2 }}>
            <Half char={previous} part="top" tile={tile} style={{ height: '100%' }} />
          </span>
          <span
            ref={landing}
            style={{
              ...HALF,
              bottom: 0,
              transformOrigin: 'top',
              zIndex: 2,
              transform: 'rotateX(90deg)',
            }}
          >
            <Half char={shown} part="bottom" tile={tile} style={{ height: '100%' }} />
          </span>
        </>
      )}
      {/* The hinge: a hairline across the middle of the tile. */}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 'calc(50% - 0.5px)',
          height: 1,
          background: 'rgb(0 0 0 / 0.55)',
          zIndex: 3,
        }}
      />
    </span>
  );
}

/**
 * A split-flap board, like a station's departures. Change the text and every tile turns through
 * the alphabet to its new character, a flap at a time and a beat after its neighbour, with the
 * clatter you can almost hear. Screen readers get the text itself.
 */
export function AsciiSplitFlap({
  text = 'DEPARTURES',
  length,
  characters = FLAP_CHARACTERS,
  speed = 0.06,
  tile = '#1b1b1f',
  ink = '#f5f1e6',
  as = 'div',
  className,
  style,
}: AsciiSplitFlapProps) {
  const reduced = useReducedMotion();
  const lines = text.toUpperCase().split('\n');
  const width = Math.max(1, length ?? Math.max(...lines.map((line) => line.length)));
  const set = characters.length > 1 ? characters : FLAP_CHARACTERS;
  return createElement(
    as,
    {
      className,
      style: { fontFamily: MONO_STACK, fontWeight: 600, lineHeight: 1, ...style },
    },
    <span style={VISUALLY_HIDDEN}>{text}</span>,
    <span aria-hidden="true" style={{ display: 'inline-grid', gap: '0.12em' }}>
      {lines.map((line, row) => (
        <span key={row} style={{ display: 'flex', whiteSpace: 'nowrap' }}>
          {Array.from({ length: width }, (_, col) => (
            <Flap
              key={col}
              target={line[col] ?? ' '}
              characters={set}
              speed={Math.max(0.02, speed)}
              delay={col * 0.035 + row * 0.08}
              reduced={reduced}
              tile={tile}
              ink={ink}
            />
          ))}
        </span>
      ))}
    </span>,
  );
}
