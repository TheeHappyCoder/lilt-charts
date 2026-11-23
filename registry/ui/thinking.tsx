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

// Cool-to-warm pastel LED accents across columns, echoing Lilt's hardware palette.
const LED_TINTS = [
  '#8e9eff',
  '#b496ec',
  '#f29c8b',
  '#9ca9ff',
  '#c49ee8',
  '#ff9f90',
  '#8e9eff',
  '#b496ec',
  '#f29c8b',
] as const;

/**
 * A 3 by 3 grid of pixels for work that takes a while. Every cell runs the same pulse with its own
 * delay. `drive` runs a chevron front to the right, and its cycle is shorter than the sweep, so two
 * fronts are always in flight. Cells take the text colour or optional pastel LED tint; with reduced
 * motion they sit dim and still.
 */
export function PixelGrid({
  pattern = 'drive',
  cell = 4,
  colored = false,
}: {
  pattern?: PixelPattern;
  cell?: number;
  /** Tint the micro-LEDs cool to warm across the 3x3 matrix. Default false. */
  colored?: boolean;
}) {
  const reduced = useReducedMotion();
  const { delays, duration, round } = PATTERNS[pattern];
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(3, ${cell}px)`,
        gap: Math.max(1.5, cell * 0.42),
        flexShrink: 0,
      }}
    >
      {delays.map((delay, i) => {
        const bg = colored ? LED_TINTS[i]! : 'currentColor';
        return (
          <motion.span
            key={i}
            style={{
              width: cell,
              height: cell,
              borderRadius: round ? '50%' : 1.25,
              background: bg,
              boxShadow: colored && delay !== null ? `0 0 6px ${bg}` : undefined,
              opacity: delay === null ? 0.08 : 0.18,
            }}
            animate={delay === null || reduced ? undefined : { opacity: [0.16, 1, 0.16] }}
            transition={{
              duration: duration / 1000,
              delay: (delay ?? 0) / 1000,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        );
      })}
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
    <span aria-hidden="true" className="lilt-thk-timer">
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
  /** A soft light that sweeps across the words. Default true. */
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
 * What a wait for an AI looks like: a recessed micro-LED matrix at work inside a machined capsule,
 * each step rolling up through a slot like a counter and blurring as it passes, a soft light
 * sweeping the words, and a recessed elapsed timer. The longest step holds the width, so nothing
 * beside it moves. Screen readers hear the first step once, not every change.
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
    <>
      <style href="lilt-ui-thinking" precedence="default">
        {css}
      </style>
      <span
        role="status"
        className={['lilt-thk', className].filter(Boolean).join(' ')}
        style={style}
      >
        <span style={hidden}>{steps[0]}…</span>
        <span className="lilt-thk-pool" aria-hidden="true" />
        <span className="lilt-thk-socket" aria-hidden="true">
          <PixelGrid pattern={pattern} cell={3.5} colored />
        </span>
        <span aria-hidden="true" className="lilt-thk-slot">
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
    </>
  );
}

/** Words with a soft light passing over them, painted through the text. */
function Sweep({ children }: { children: string }) {
  return (
    <motion.span
      style={{
        backgroundImage:
          'linear-gradient(90deg, color-mix(in srgb, currentColor 76%, transparent) 32%, currentColor 50%, color-mix(in srgb, currentColor 76%, transparent) 68%)',
        backgroundSize: '250% 100%',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      }}
      animate={{ backgroundPosition: ['100% 0', '-150% 0'] }}
      transition={{ duration: 1.9, ease: 'linear', repeat: Infinity }}
    >
      {children}
    </motion.span>
  );
}

const css = /* css */ `
.lilt-thk {
  --thk-a: #ffffff;
  --thk-b: #f1f2f6;
  --thk-ring: rgba(15, 20, 40, 0.08);
  --thk-top: #ffffff;
  --thk-lip: #e0e3eb;
  --thk-drop: 0 12px 24px -14px rgba(15, 20, 40, 0.22), 0 2px 5px rgba(15, 20, 40, 0.05);
  --thk-sock-a: #1a1c24;
  --thk-sock-b: #252834;
  --thk-sock-in: inset 0 1.5px 3px rgba(0, 0, 0, 0.55), inset 0 0 0 1px rgba(255, 255, 255, 0.08);
  --thk-sock-out: 0 1px 0 rgba(255, 255, 255, 0.9);
  --thk-timer-bg: rgba(15, 20, 40, 0.045);
  --thk-timer-ring: rgba(15, 20, 40, 0.06);
  --thk-pool-a: 0.34;
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 11px;
  min-width: 0;
  height: 40px;
  padding: 0 8px 0 7px;
  border-radius: 13px;
  background: linear-gradient(180deg, var(--thk-a), var(--thk-b));
  box-shadow:
    0 0 0 1px var(--thk-ring),
    inset 0 1.5px 0 var(--thk-top),
    inset 0 -2px 0 var(--thk-lip),
    var(--thk-drop);
  font-size: 13.5px;
  font-weight: 500;
  letter-spacing: -0.01em;
  isolation: isolate;
  -webkit-font-smoothing: antialiased;
}
:where(.dark, [data-theme="dark"]) .lilt-thk {
  --thk-a: #22242c;
  --thk-b: #16181e;
  --thk-ring: rgba(255, 255, 255, 0.1);
  --thk-top: rgba(255, 255, 255, 0.1);
  --thk-lip: rgba(0, 0, 0, 0.72);
  --thk-drop: 0 14px 28px -14px rgba(0, 0, 0, 0.7), 0 2px 6px rgba(0, 0, 0, 0.36);
  --thk-sock-a: #0c0d11;
  --thk-sock-b: #13151c;
  --thk-sock-in: inset 0 1.5px 4px rgba(0, 0, 0, 0.75), inset 0 0 0 1px rgba(255, 255, 255, 0.07);
  --thk-sock-out: 0 1px 0 rgba(255, 255, 255, 0.06);
  --thk-timer-bg: rgba(255, 255, 255, 0.05);
  --thk-timer-ring: rgba(255, 255, 255, 0.07);
  --thk-pool-a: 0.28;
}
[data-theme="light"] .lilt-thk {
  --thk-a: #ffffff;
  --thk-b: #f1f2f6;
  --thk-ring: rgba(15, 20, 40, 0.08);
  --thk-top: #ffffff;
  --thk-lip: #e0e3eb;
  --thk-drop: 0 12px 24px -14px rgba(15, 20, 40, 0.22), 0 2px 5px rgba(15, 20, 40, 0.05);
  --thk-sock-a: #1a1c24;
  --thk-sock-b: #252834;
  --thk-sock-in: inset 0 1.5px 3px rgba(0, 0, 0, 0.55), inset 0 0 0 1px rgba(255, 255, 255, 0.08);
  --thk-sock-out: 0 1px 0 rgba(255, 255, 255, 0.9);
  --thk-timer-bg: rgba(15, 20, 40, 0.045);
  --thk-timer-ring: rgba(15, 20, 40, 0.06);
  --thk-pool-a: 0.34;
}

.lilt-thk-pool {
  position: absolute;
  left: 6px;
  bottom: -8px;
  width: 72px;
  height: 18px;
  border-radius: 50%;
  background: linear-gradient(90deg, #9fadff, #c8a8e8 55%, #ffb89e);
  filter: blur(12px);
  opacity: var(--thk-pool-a);
  pointer-events: none;
  z-index: -1;
  animation: lilt-thk-breathe 2.6s ease-in-out infinite;
}
.lilt-thk-socket {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 8px;
  background: linear-gradient(180deg, var(--thk-sock-a), var(--thk-sock-b));
  box-shadow: var(--thk-sock-in), var(--thk-sock-out);
  flex-shrink: 0;
}
.lilt-thk-slot {
  display: inline-grid;
  min-width: 0;
  overflow: hidden;
  padding-right: 4px;
  -webkit-mask-image: linear-gradient(to bottom, transparent, #000 14%, #000 86%, transparent);
  mask-image: linear-gradient(to bottom, transparent, #000 14%, #000 86%, transparent);
}
.lilt-thk-timer {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 8px;
  border-radius: 7px;
  background: var(--thk-timer-bg);
  box-shadow: inset 0 0 0 1px var(--thk-timer-ring);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 11.5px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  opacity: 0.68;
}

@keyframes lilt-thk-breathe {
  0%, 100% { opacity: calc(var(--thk-pool-a) * 0.65); transform: scale(0.92); }
  50% { opacity: var(--thk-pool-a); transform: scale(1.06); }
}
@media (prefers-reduced-motion: reduce) {
  .lilt-thk-pool { animation: none; }
}
`;
