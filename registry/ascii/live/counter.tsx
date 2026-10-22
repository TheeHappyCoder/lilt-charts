'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';

export interface AsciiCounterProps {
  /** The number to show. Default 1204881. */
  value?: number;
  /** `full` writes every digit with separators, 1,204,881; `compact` shortens it, 1.2M. */
  format?: 'full' | 'compact';
  /** Text before the number, such as `$`. */
  prefix?: string;
  /** Text after the number, such as ` users`. */
  suffix?: string;
  /** Seconds the digits take to roll to a new value. Default 1.2. */
  duration?: number;
  className?: string;
  style?: CSSProperties;
}

/** A monospace stack, so every digit and separator takes the same width. */
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace';

const fullFormat = new Intl.NumberFormat('en', { maximumFractionDigits: 2 });
const compactFormat = new Intl.NumberFormat('en', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

/** The value as text, the way the counter writes it. */
export function formatCount(value: number, format: 'full' | 'compact' = 'full') {
  return (format === 'compact' ? compactFormat : fullFormat).format(value);
}

const HIDDEN: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  margin: -1,
  padding: 0,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

interface Cell {
  ch: string;
  rolling: boolean;
}

const isDigit = (ch: string | undefined) => ch !== undefined && ch >= '0' && ch <= '9';
const easeOut = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);

/**
 * One position's roll from a character to another. Digits spin forward through the digits a lap
 * or so and land on the new one; anything else swaps halfway through.
 */
interface Roll {
  from: string;
  to: string;
  /** Seconds after the start that this position lands. */
  lands: number;
  /** Digit steps to take on the way. */
  steps: number;
}

function plan(from: string, to: string, duration: number): Roll[] {
  const n = Math.max(from.length, to.length);
  // Right-align, so units sit over units.
  const a = from.padStart(n, ' ');
  const b = to.padStart(n, ' ');
  const changed: number[] = [];
  for (let i = 0; i < n; i++) if (a[i] !== b[i]) changed.push(i);
  return Array.from({ length: n }, (_, i) => {
    const rank = changed.indexOf(i);
    // The leftmost changed digit lands first; each to its right spins a little longer, so the
    // number settles from its most significant digit down, the way you read it.
    const lands =
      rank < 0 ? 0 : duration * (0.45 + (0.55 * rank) / Math.max(1, changed.length - 1));
    const fa = isDigit(a[i]) ? Number(a[i]) : 0;
    const fb = isDigit(b[i]) ? Number(b[i]) : 0;
    const steps = rank < 0 ? 0 : 10 + ((fb - fa + 10) % 10);
    return { from: a[i]!, to: b[i]!, lands, steps };
  });
}

/** What each position shows a number of seconds into its rolls. */
function frame(rolls: Roll[], elapsed: number): Cell[] {
  return rolls.map(({ from, to, lands, steps }) => {
    if (from === to || elapsed >= lands) return { ch: to, rolling: false };
    const p = elapsed / lands;
    if (isDigit(to) && (isDigit(from) || from === ' ')) {
      const start = isDigit(from) ? Number(from) : 0;
      return { ch: String((start + Math.floor(easeOut(p) * steps)) % 10), rolling: true };
    }
    return { ch: p < 0.5 ? from : to, rolling: p < 0.5 };
  });
}

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * A number in real text that rolls to its value. On first show every digit spins up from zero;
 * when the value changes, only the digits that differ spin, each forward through the digits, and
 * land from the most significant down. Digits are monospace and tabular, so the width holds
 * still. Screen readers get the value itself; the rolling digits are hidden from them. With
 * reduced motion the value is shown at once.
 */
export function AsciiCounter({
  value = 1204881,
  format = 'full',
  prefix = '',
  suffix = '',
  duration = 1.2,
  className,
  style,
}: AsciiCounterProps) {
  const target = formatCount(value, format);
  const [cells, setCells] = useState<Cell[]>(() =>
    [...target].map((ch) => ({ ch, rolling: false })),
  );
  const shown = useRef<string | null>(null);

  useEffect(() => {
    // The first value rolls up from zeros of the same shape.
    const from = shown.current ?? target.replace(/\d/g, '0');
    shown.current = target;
    if (from === target || prefersReducedMotion() || duration <= 0) {
      setCells([...target].map((ch) => ({ ch, rolling: false })));
      return;
    }
    const rolls = plan(from, target, duration);
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const elapsed = Math.max(0, (now - start) / 1000);
      setCells(frame(rolls, elapsed));
      if (elapsed < duration) raf = requestAnimationFrame(tick);
      else setCells([...target].map((ch) => ({ ch, rolling: false })));
    };
    setCells(frame(rolls, 0));
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return (
    <span
      className={className}
      style={{
        position: 'relative',
        display: 'inline-block',
        fontFamily: MONO,
        fontVariantNumeric: 'tabular-nums',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      <span style={HIDDEN}>{`${prefix}${target}${suffix}`}</span>
      <span aria-hidden="true">
        {prefix}
        {cells.map((cell, i) =>
          cell.ch === ' ' ? null : (
            <span
              key={cells.length - i}
              style={{ opacity: cell.rolling ? 0.45 : 1, transition: 'opacity 160ms' }}
            >
              {cell.ch}
            </span>
          ),
        )}
        {suffix}
      </span>
    </span>
  );
}

export interface AsciiCounterDemoProps extends Omit<AsciiCounterProps, 'value'> {
  /** Where the count starts. Default 1204881. */
  value?: number;
  /** Seconds between ticks. Default 3. */
  every?: number;
}

/**
 * A counter that ticks itself: every few seconds, and on a click, more arrive and the digits
 * roll. Shown large, for a stage or a hero.
 */
export function AsciiCounterDemo({ value = 1204881, every = 3, ...props }: AsciiCounterDemoProps) {
  const [count, setCount] = useState(value);
  const seed = useRef(1);
  const more = useCallback((scale: number) => {
    seed.current = (seed.current * 16807) % 2147483647;
    setCount((c) => c + Math.round(scale * (0.3 + (seed.current % 1000) / 1000)));
  }, []);
  useEffect(() => setCount(value), [value]);
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const id = window.setInterval(() => more(2400), every * 1000);
    return () => window.clearInterval(id);
  }, [every, more]);

  return (
    <button
      type="button"
      onClick={() => more(64000)}
      aria-label={`${formatCount(count, props.format)} readers this month. Press to add more.`}
      style={{
        all: 'unset',
        cursor: 'pointer',
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <AsciiCounter
        {...props}
        value={count}
        style={{
          fontSize: 64,
          fontWeight: 600,
          letterSpacing: '-0.02em',
          lineHeight: 1,
          ...props.style,
        }}
      />
      <span style={{ fontSize: 13, opacity: 0.5, letterSpacing: '0.08em' }} aria-hidden="true">
        READERS THIS MONTH
      </span>
    </button>
  );
}
