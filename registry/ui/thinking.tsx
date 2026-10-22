'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useState, type CSSProperties } from 'react';

const ROLL = [0.4, 0, 0.2, 1] as const;

/** The pixel grid's patterns: `drive` sweeps right, `dots` is the same in round cells, `orbit` laps the edge. */
export type PixelPattern = 'drive' | 'dots' | 'orbit';

// Each cell's delay in milliseconds; null cells stay dark.
const CHEVRON = Array.from(
  { length: 9 },
  (_, i) => ((i % 3) + Math.abs(Math.floor(i / 3) - 1)) * 90,
);
const ORBIT_ORDER = [0, 1, 2, 5, 8, 7, 6, 3];
const ORBIT = Array.from({ length: 9 }, (_, i) =>
  ORBIT_ORDER.includes(i) ? ORBIT_ORDER.indexOf(i) * 110 : null,
);
const PATTERNS: Record<
  PixelPattern,
  { delays: readonly (number | null)[]; duration: number; round: boolean }
> = {
  drive: { delays: CHEVRON, duration: 650, round: false },
  dots: { delays: CHEVRON, duration: 650, round: true },
  orbit: { delays: ORBIT, duration: 950, round: false },
};

/**
 * A 3 by 3 grid of pixels for work that takes a while. Every cell runs the same pulse with its own
 * delay. `drive` runs a chevron front to the right, and its cycle is shorter than the sweep, so two
 * fronts are always in flight. Cells take the text colour; with reduced motion they sit dim and still.
 */
export function PixelGrid({
  pattern = 'drive',
  cell = 4,
}: {
  pattern?: PixelPattern;
  cell?: number;
}) {
  const reduced = useReducedMotion();
  const { delays, duration, round } = PATTERNS[pattern];
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(3, ${cell}px)`,
        gap: cell * 0.375,
        flexShrink: 0,
      }}
    >
      {delays.map((delay, i) => (
        <motion.span
          key={i}
          style={{
            width: cell,
            height: cell,
            borderRadius: round ? '50%' : 1,
            background: 'currentColor',
            opacity: delay === null ? 0.07 : 0.15,
          }}
          animate={delay === null || reduced ? undefined : { opacity: [0.15, 1, 0.15] }}
          transition={{
            duration: duration / 1000,
            delay: (delay ?? 0) / 1000,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </span>
  );
}

/** Seconds since it mounted, as 4.2s, then 1m 4.2s. Only it re-renders as it ticks. */
function Elapsed() {
  const [tenths, setTenths] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTenths((t) => t + 1), 100);
    return () => clearInterval(timer);
  }, []);
  const seconds = tenths / 10;
  return (
    <span
      aria-hidden="true"
      style={{
        flexShrink: 0,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: '0.92em',
        fontVariantNumeric: 'tabular-nums',
        opacity: 0.55,
      }}
    >
      {seconds < 60
        ? `${seconds.toFixed(1)}s`
        : `${Math.floor(seconds / 60)}m ${(seconds % 60).toFixed(1)}s`}
    </span>
  );
}

const hidden: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clipPath: 'inset(50%)',
  whiteSpace: 'nowrap',
};

export interface ThinkingProps {
  /** What it is doing, in order. Default four steps of an AI answering. */
  steps?: readonly string[];
  /** Milliseconds on each step. Default 2400. */
  every?: number;
  /** Start again after the last step instead of staying on it. Default false. */
  loop?: boolean;
  /** The pixel grid's pattern. Default 'drive'. */
  pattern?: PixelPattern;
  /** Show how long it has taken so far. Turn it off inside buttons so they do not grow. Default true. */
  timer?: boolean;
  /** A grey light that sweeps across the words. Default true. */
  shimmer?: boolean;
  className?: string;
  style?: CSSProperties;
}

const DEFAULT_STEPS = [
  'Reading your question',
  'Searching your files',
  'Weighing what it found',
  'Writing the answer',
];

/**
 * What a wait for an AI looks like: a pixel grid at work, each step rolling up through a slot like
 * a counter and blurring as it passes, a light sweeping the words, and the seconds so far. The
 * longest step holds the width, so nothing beside it moves. Screen readers hear the first step
 * once, not every change.
 */
export function Thinking({
  steps = DEFAULT_STEPS,
  every = 2400,
  loop = false,
  pattern = 'drive',
  timer = true,
  shimmer = true,
  className,
  style,
}: ThinkingProps) {
  const [index, setIndex] = useState(0);
  const reduced = useReducedMotion();
  useEffect(() => {
    setIndex(0);
    if (steps.length < 2 || reduced) return;
    const interval = setInterval(
      () => setIndex((i) => (loop ? (i + 1) % steps.length : Math.min(i + 1, steps.length - 1))),
      every,
    );
    return () => clearInterval(interval);
  }, [steps, every, loop, reduced]);
  const longest = steps.reduce((a, b) => (a.length >= b.length ? a : b), '');
  const sweep = shimmer && !reduced;

  return (
    <span
      role="status"
      className={className}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 10, minWidth: 0, ...style }}
    >
      <span style={hidden}>{steps[0]}…</span>
      <PixelGrid pattern={pattern} />
      <span aria-hidden="true" style={{ display: 'inline-grid', minWidth: 0, overflow: 'hidden' }}>
        <span style={{ gridArea: '1 / 1', visibility: 'hidden', whiteSpace: 'nowrap' }}>
          {longest}
        </span>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={index}
            style={{
              gridArea: '1 / 1',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            initial={{ y: '80%', opacity: 0, filter: 'blur(4px)' }}
            animate={{
              y: 0,
              opacity: 1,
              filter: 'blur(0px)',
              transition: { duration: 0.24, ease: ROLL },
            }}
            exit={{
              y: '-80%',
              opacity: 0,
              filter: 'blur(4px)',
              transition: { duration: 0.16, ease: ROLL },
            }}
          >
            {sweep ? <Sweep>{steps[index]}</Sweep> : steps[index]}
          </motion.span>
        </AnimatePresence>
      </span>
      {timer ? <Elapsed /> : null}
    </span>
  );
}

/** Words with a soft light passing over them, painted through the text. */
function Sweep({ children }: { children: string }) {
  return (
    <motion.span
      style={{
        backgroundImage:
          'linear-gradient(90deg, currentColor 35%, color-mix(in srgb, currentColor 30%, transparent) 50%, currentColor 65%)',
        backgroundSize: '250% 100%',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      }}
      animate={{ backgroundPosition: ['100% 0', '-150% 0'] }}
      transition={{ duration: 1.8, ease: 'linear', repeat: Infinity }}
    >
      {children}
    </motion.span>
  );
}
