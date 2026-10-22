'use client';

import {
  createElement,
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from 'react';
import { CODE_GLYPHS, VISUALLY_HIDDEN, frame, rand, useReducedMotion, useSeen } from './text-kit';

export interface AsciiScrambleProps {
  /** The text it decodes into. Default 'Charts that feel alive'. */
  text?: string;
  /**
   * When it decodes: `view` the first time it scrolls into view, `mount` as soon as it renders,
   * `hover` only when the pointer comes over it (it shows its text until then). Default `view`.
   */
  trigger?: 'mount' | 'view' | 'hover';
  /** Seconds the decode takes, first letter to last. Default 1.2. */
  duration?: number;
  /** Characters the letters scramble through. Default a code-like set. */
  characters?: string;
  /** The element to render, such as 'h1' or 'p'. Default 'span'. */
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
}

/** How each letter shows on a frame: hidden, a scrambled glyph, or itself. */
type Cell =
  | { kind: 'hidden' }
  | { kind: 'glyph'; glyph: string; opacity: number }
  | { kind: 'done' };

interface Run {
  /** `decode` builds the text from nothing; `stir` scrambles it briefly in place. */
  mode: 'decode' | 'stir';
  start: number;
  length: number;
}

/** Glyphs change at this rate, not every frame, so each one can be read for a moment. */
const TICKS_PER_SECOND = 22;

const SLOT: CSSProperties = { position: 'relative' };
const GLYPH: CSSProperties = {
  position: 'absolute',
  left: '50%',
  top: 0,
  transform: 'translateX(-50%)',
  whiteSpace: 'pre',
  pointerEvents: 'none',
};

/** When letter `k` of `n` appears and when it lands, in seconds into a run. */
function timing(mode: Run['mode'], k: number, n: number, length: number) {
  const at = n > 1 ? k / (n - 1) : 0;
  const jitter = rand(k, 3, 11);
  if (mode === 'stir')
    return { appear: 0, land: length * (0.25 + 0.75 * at) * (0.85 + 0.15 * jitter) };
  // A wave runs left to right: each letter turns up as a glyph a little ahead of landing.
  const appear = length * 0.5 * at;
  return { appear, land: Math.min(length, appear + length * (0.32 + 0.18 * jitter)) };
}

function cellAt(
  run: Run | null,
  settled: boolean,
  k: number,
  n: number,
  time: number,
  set: string,
): Cell {
  if (!run) return settled ? { kind: 'done' } : { kind: 'hidden' };
  const t = time - run.start;
  const { appear, land } = timing(run.mode, k, n, run.length);
  if (t >= land) return { kind: 'done' };
  if (t < appear) return { kind: 'hidden' };
  const tick = Math.floor(time * TICKS_PER_SECOND);
  const glyph = set[Math.floor(rand(k, tick, 7) * set.length)] ?? '';
  // Glyphs firm up as they near their letter.
  const near = (t - appear) / Math.max(0.001, land - appear);
  return { kind: 'glyph', glyph, opacity: 0.35 + 0.35 * near };
}

/**
 * For each letter, the glyphs of the set no wider than it (with a little grace), measured in the
 * element's own font, so a narrow letter such as `i` never holds a wide `#` over its neighbours.
 * Monospace type keeps every glyph; where nothing can be measured, so does everything.
 */
function fitting(el: HTMLElement, text: string, set: string): Map<string, string> {
  const fits = new Map<string, string>();
  if (typeof document === 'undefined') return fits;
  const ctx = document.createElement('canvas').getContext?.('2d');
  if (!ctx) return fits;
  const style = getComputedStyle(el);
  ctx.font = style.font || `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  const glyphs = Array.from(new Set(set));
  const widths = glyphs.map((g) => ctx.measureText(g).width);
  if (!widths.every((w) => w > 0)) return fits;
  for (const ch of new Set(text)) {
    if (ch === ' ') continue;
    const room = ctx.measureText(ch).width * 1.12 + 0.5;
    let pick = glyphs.filter((_, i) => widths[i]! <= room).join('');
    // Nothing fits a sliver like `i`: take the narrowest few.
    if (!pick) {
      pick = glyphs
        .map((g, i) => [g, widths[i]!] as const)
        .sort((a, b) => a[1] - b[1])
        .slice(0, 3)
        .map(([g]) => g)
        .join('');
    }
    fits.set(ch, pick);
  }
  return fits;
}

/**
 * A phrase that decodes from random glyphs into its text, letter by letter from the left, and
 * stirs briefly when the pointer comes over it. Each letter keeps its own width throughout, so
 * nothing around it moves. Screen readers get the text itself, once.
 */
export function AsciiScramble({
  text = 'Charts that feel alive',
  trigger = 'view',
  duration = 1.2,
  characters = CODE_GLYPHS,
  as = 'span',
  className,
  style,
}: AsciiScrambleProps) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const seen = useSeen(ref, trigger === 'view' && !reduced);
  const [run, setRun] = useState<Run | null>(null);
  // Whether the text has landed (or, for `hover`, is simply showing).
  const [settled, setSettled] = useState(trigger === 'hover');
  const [time, setTime] = useState(0);
  const clock = useRef(0);
  const set = characters.length ? characters : CODE_GLYPHS;
  const [fits, setFits] = useState<Map<string, string>>(() => new Map());

  // Measure once the element has its font, and again when web fonts arrive.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let live = true;
    const measure = () => {
      if (live) setFits(fitting(el, text, set));
    };
    measure();
    document.fonts?.ready.then(measure);
    return () => {
      live = false;
    };
  }, [text, set]);
  const length = Math.max(0.05, duration);

  const begin = useCallback(
    (mode: Run['mode']) => {
      const now = performance.now() / 1000;
      clock.current = now;
      setTime(now);
      setRun({ mode, start: now, length: mode === 'stir' ? Math.min(0.7, length * 0.55) : length });
    },
    [length],
  );

  // Start the decode when the trigger says so; reduced motion shows the text as it is.
  useEffect(() => {
    if (reduced) {
      setRun(null);
      setSettled(true);
      return;
    }
    if (trigger === 'mount' || (trigger === 'view' && seen)) begin('decode');
    if (trigger === 'hover') setSettled(true);
  }, [trigger, seen, reduced, text, begin]);

  // Run the clock while a decode or stir is going, then let it rest.
  useEffect(() => {
    if (!run) return;
    let cancel = () => undefined as void;
    const tick = (nowMs: number) => {
      const now = nowMs / 1000;
      if (now - run.start >= run.length) {
        setRun(null);
        setSettled(true);
        return;
      }
      const quantised = Math.floor(now * TICKS_PER_SECOND);
      if (quantised !== Math.floor(clock.current * TICKS_PER_SECOND)) {
        clock.current = now;
        setTime(now);
      }
      cancel = frame(tick);
    };
    cancel = frame(tick);
    return () => cancel();
  }, [run]);

  const onPointerEnter = () => {
    if (reduced || run || !settled) return;
    begin(trigger === 'hover' ? 'decode' : 'stir');
  };

  // Letters are counted without spaces, so the wave moves evenly through the words.
  const n = Array.from(text).filter((ch) => ch !== ' ').length;
  let k = 0;
  const words: ReactNode[] = [];
  text.split(/( +)/).forEach((part, w) => {
    if (!part) return;
    if (part.startsWith(' ')) {
      words.push(part);
      return;
    }
    const letters = Array.from(part).map((ch, j) => {
      const cell = cellAt(run, settled, k++, n, time, fits.get(ch) || set);
      if (cell.kind === 'done') return <span key={j}>{ch}</span>;
      return (
        <span key={j} style={SLOT}>
          <span style={{ visibility: 'hidden' }}>{ch}</span>
          {cell.kind === 'glyph' && (
            <span style={{ ...GLYPH, opacity: cell.opacity }}>{cell.glyph}</span>
          )}
        </span>
      );
    });
    // Words never break inside, however the letters are wrapped.
    words.push(
      <span key={w} style={{ whiteSpace: 'nowrap' }}>
        {letters}
      </span>,
    );
  });

  return createElement(
    as,
    { ref, className, style, onPointerEnter },
    <span style={VISUALLY_HIDDEN}>{text}</span>,
    <span aria-hidden="true">{words}</span>,
  );
}
