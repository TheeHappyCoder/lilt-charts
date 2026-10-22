'use client';

import {
  createElement,
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
} from 'react';
import { clamp } from '../engine/noise';
import { rand, useReducedMotion } from './text-kit';

export interface AsciiGlitchProps {
  /** The text. Default '404'. */
  text?: string;
  /** How hard it glitches, 0 to 1: how far slices slip and how many letters swap. Default 0.5. */
  intensity?: number;
  /** Seconds between glitches, give or take a little. 0 glitches only on hover. Default 4. */
  interval?: number;
  /** The element to render, such as 'h1'. Default 'span'. */
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
}

const SWAPS = '#%&$@*/\\<>01';
const RED = '#ff3d6e';
const CYAN = '#22d3ee';
/** A burst is a few frames this far apart, each a new break. */
const FRAME_MS = 55;

interface Slice {
  top: number;
  bottom: number;
  shift: number;
}

interface Break {
  /** Colour split, in em. */
  split: number;
  slices: Slice[];
  text: string;
}

/** One frame of a glitch: where the text is cut, how far each slice slips, which letters swap. */
function breakOf(text: string, intensity: number, seed: number): Break {
  const r = (k: number) => rand(seed, k, 31);
  const split = (0.015 + 0.04 * intensity) * (r(0) < 0.5 ? -1 : 1);
  // Cut the height into bands; some slip sideways, most stay put.
  const cuts = [0, 100];
  const count = 1 + Math.round(1 + 3 * intensity * r(1));
  for (let i = 0; i < count; i++) cuts.push(Math.round(8 + r(2 + i) * 84));
  cuts.sort((a, b) => a - b);
  const slices: Slice[] = [];
  for (let i = 0; i < cuts.length - 1; i++) {
    const top = cuts[i]!;
    const bottom = cuts[i + 1]!;
    if (bottom - top < 2) continue;
    const moves = r(10 + i) < 0.45 + 0.3 * intensity;
    const shift = moves ? (r(20 + i) - 0.5) * 2 * (0.03 + 0.14 * intensity) : 0;
    // Neighbours that slip together are one slice: no seam between them.
    const prev = slices[slices.length - 1];
    if (prev && prev.shift === shift) prev.bottom = bottom;
    else slices.push({ top, bottom, shift });
  }
  // On some frames a letter or two turns into a glyph.
  const letters = Array.from(text);
  if (r(40) < 0.4 + 0.4 * intensity) {
    const swaps = Math.max(1, Math.round(letters.length * 0.2 * intensity));
    for (let i = 0; i < swaps; i++) {
      const at = Math.floor(r(50 + i) * letters.length);
      if (letters[at] !== ' ') letters[at] = SWAPS[Math.floor(r(60 + i) * SWAPS.length)]!;
    }
  }
  return { split, slices, text: letters.join('') };
}

const LAYER: CSSProperties = {
  position: 'absolute',
  inset: 0,
  whiteSpace: 'inherit',
  pointerEvents: 'none',
};

/**
 * Text that glitches now and then: slices of it slip sideways, it splits into red and cyan, and a
 * letter or two turns into a glyph, for a fraction of a second, then snaps back. It glitches on
 * hover too. The bursts are short and far apart; with reduced motion it never glitches.
 */
export function AsciiGlitch({
  text = '404',
  intensity = 0.5,
  interval = 4,
  as = 'span',
  className,
  style,
}: AsciiGlitchProps) {
  const [frameOf, setFrame] = useState<Break | null>(null);
  const reduced = useReducedMotion();
  const busy = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const strength = clamp(intensity, 0, 1);

  const later = (ms: number, fn: () => void) => {
    timers.current.push(setTimeout(fn, ms));
  };

  /** A burst: a few frames of breaks, then clean; now and then a quick second burst. */
  const burst = useCallback(
    (again = true) => {
      if (busy.current) return;
      busy.current = true;
      const frames = 2 + Math.round(2 + 3 * strength * Math.random());
      const seed = Math.floor(Math.random() * 1e6);
      for (let f = 0; f < frames; f++) {
        later(f * FRAME_MS, () => setFrame(breakOf(text, strength, seed + f)));
      }
      later(frames * FRAME_MS, () => {
        setFrame(null);
        busy.current = false;
        if (again && Math.random() < 0.35) later(90 + Math.random() * 120, () => burst(false));
      });
    },
    [text, strength],
  );

  // Glitches on a loose schedule, so it never settles into a beat.
  useEffect(() => {
    if (reduced || !(interval > 0)) return;
    let timer: ReturnType<typeof setTimeout>;
    const next = () => {
      timer = setTimeout(
        () => {
          burst();
          next();
        },
        interval * 1000 * (0.6 + 0.8 * Math.random()),
      );
    };
    next();
    return () => clearTimeout(timer);
  }, [reduced, interval, burst]);

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
      busy.current = false;
    },
    [],
  );

  const onPointerEnter = () => {
    if (!reduced) burst();
  };

  const shown = reduced ? null : frameOf;
  const layer = (key: string, extra: CSSProperties, content: string) => (
    <span key={key} aria-hidden="true" style={{ ...LAYER, ...extra }}>
      {content}
    </span>
  );

  return createElement(
    as,
    {
      className,
      style: { position: 'relative', display: 'inline-block', ...style },
      onPointerEnter,
    },
    // The real text sizes the element and stays readable to screen readers; while glitching its
    // ink steps aside for the broken copies drawn over it.
    <span key="text" style={{ opacity: shown ? 0 : 1 }}>
      {text}
    </span>,
    shown && [
      layer(
        'red',
        { color: RED, opacity: 0.8, transform: `translateX(${-shown.split}em)` },
        shown.text,
      ),
      layer(
        'cyan',
        { color: CYAN, opacity: 0.8, transform: `translateX(${shown.split}em)` },
        shown.text,
      ),
      ...shown.slices.map((slice, i) =>
        layer(
          `s${i}`,
          {
            // Slices overlap by a hair so their anti-aliased edges never leave a seam.
            clipPath: `inset(calc(${slice.top}% - 0.5px) -1em calc(${100 - slice.bottom}% - 0.5px) -1em)`,
            transform: slice.shift ? `translateX(${slice.shift}em)` : undefined,
          },
          shown.text,
        ),
      ),
    ],
  );
}
