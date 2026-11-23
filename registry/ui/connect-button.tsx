'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  useEffect,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { PROVIDERS, ProviderLogo } from './provider-logos';

/** A mark the triad can show. `id` keeps each one's entrance and exit apart. */
export interface TriadLogo {
  id: string;
  mark: ReactNode;
}

const EASE = [0.22, 1, 0.36, 1] as const;
const FIRST_STEP_MS = 220;

/** The AI providers, as marks the triad can cycle through. */
export const PROVIDER_MARKS: readonly TriadLogo[] = PROVIDERS.map((id) => ({
  id,
  mark: <ProviderLogo id={id} size="100%" />,
}));

export interface LogoTriadProps {
  /** Marks to cycle through; the first three are the resting set. Default the AI providers. */
  logos?: readonly TriadLogo[];
  /** Width and height of the triangle in pixels. Default 24. */
  size?: number;
  /** While true the marks ripple through the set; when it turns false they settle back. */
  cycling?: boolean;
  /** Milliseconds between swaps while cycling. Default 1000. */
  step?: number;
  /** Milliseconds between one corner swapping and the next. Default 110. */
  stagger?: number;
}

/**
 * Three marks in a triangle. Still at rest; while `cycling`, each corner blur-fades to the next
 * mark a beat after the one before, so the swap ripples round the triangle, then all three settle
 * back to the resting set.
 */
export function LogoTriad({
  logos = PROVIDER_MARKS,
  size = 24,
  cycling = false,
  step = 1000,
  stagger = 110,
}: LogoTriadProps) {
  const reduced = useReducedMotion();
  const [tick, setTick] = useState(0);
  const active = cycling && !reduced && logos.length > 3;

  useEffect(() => {
    if (!active) return;
    let interval: ReturnType<typeof setInterval> | undefined;
    const first = setTimeout(() => {
      setTick((t) => t + 1);
      interval = setInterval(() => setTick((t) => t + 1), step);
    }, FIRST_STEP_MS);
    return () => {
      clearTimeout(first);
      clearInterval(interval);
      setTick(0);
    };
  }, [active, step]);

  const cell = Math.round(size * 0.48);
  // The apex centred on top, two below.
  const corners = [
    { left: (size - cell) / 2, top: 0 },
    { left: 0, top: size - cell },
    { left: size - cell, top: size - cell },
  ];
  return (
    <span
      aria-hidden="true"
      style={{ position: 'relative', display: 'block', width: size, height: size, flexShrink: 0 }}
    >
      {corners.map((corner, index) => (
        <span key={index} style={{ position: 'absolute', ...corner }}>
          <Corner logos={logos} index={index} tick={tick} size={cell} stagger={stagger} />
        </span>
      ))}
    </span>
  );
}

function Corner({
  logos,
  index,
  tick,
  size,
  stagger,
}: {
  logos: readonly TriadLogo[];
  index: number;
  tick: number;
  size: number;
  stagger: number;
}) {
  // Each corner follows a moment after the one before it.
  const [shown, setShown] = useState(tick);
  useEffect(() => {
    const timer = setTimeout(() => setShown(tick), tick === 0 ? 0 : index * stagger);
    return () => clearTimeout(timer);
  }, [tick, index, stagger]);

  const logo = logos[(index + shown * 3) % logos.length]!;
  return (
    <span style={{ position: 'relative', display: 'grid', width: size, height: size }}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={logo.id}
          style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}
          initial={{ opacity: 0, filter: 'blur(4px)', scale: 0.7 }}
          animate={{ opacity: 1, filter: 'blur(0px)', scale: 1 }}
          exit={{ opacity: 0, filter: 'blur(4px)', scale: 0.7 }}
          transition={{ duration: 0.4, ease: EASE }}
        >
          {logo.mark}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export interface ConnectButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** What the button says. Default 'Connect your AI'. */
  label?: string;
  /** Marks the triad cycles through. Default the AI providers. */
  logos?: readonly TriadLogo[];
  className?: string;
  style?: CSSProperties;
}

/**
 * A button that shows what it connects to. Three provider marks sit beside the label; hover or
 * focus it and they ripple through every provider you support, then settle back when you leave.
 * An arrow slides in to say it goes somewhere.
 */
export function ConnectButton({
  label = 'Connect your AI',
  logos,
  className,
  style,
  onPointerEnter,
  onPointerLeave,
  onFocus,
  onBlur,
  ...rest
}: ConnectButtonProps) {
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  const reduced = useReducedMotion();
  const lit = hover || focus;
  return (
    <>
      <style href="lilt-ui-connect-button" precedence="default">
        {css}
      </style>
      <button
        type="button"
        {...rest}
        className={['lilt-cb', className].filter(Boolean).join(' ')}
        data-lit={lit || undefined}
        onPointerEnter={(event) => {
          setHover(true);
          onPointerEnter?.(event);
        }}
        onPointerLeave={(event) => {
          setHover(false);
          onPointerLeave?.(event);
        }}
        onFocus={(event) => {
          setFocus(event.currentTarget.matches(':focus-visible'));
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocus(false);
          onBlur?.(event);
        }}
        style={style}
      >
        <span className="lilt-cb-well">
          <LogoTriad logos={logos} size={19} cycling={lit} />
        </span>
        <span className="lilt-cb-label">{label}</span>
        <motion.svg
          aria-hidden="true"
          width={14}
          height={14}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.85}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={lit ? { x: 1, opacity: 0.9 } : { x: reduced ? 0 : -2, opacity: 0.4 }}
          transition={{ type: 'spring', stiffness: 520, damping: 34 }}
          style={{ flexShrink: 0 }}
        >
          <path d="M5 12h14M13 6l6 6-6 6" />
        </motion.svg>
      </button>
    </>
  );
}

const css = /* css */ `
.lilt-cb {
  --cb-bg: #ffffff;
  --cb-hover: #f4f4f2;
  --cb-well: #f4f4f2;
  --cb-well-hover: #ffffff;
  --cb-line: rgb(26 26 24 / 0.1);
  --cb-line-hover: rgb(26 26 24 / 0.16);
  --cb-shadow: 0 1px 2px rgb(26 26 24 / 0.05);
  --cb-ring: #7c5cff;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  height: 42px;
  padding: 0 14px 0 7px;
  border: 1px solid var(--cb-line);
  border-radius: 12px;
  background: var(--cb-bg);
  box-shadow: var(--cb-shadow);
  color: inherit;
  font: inherit;
  font-size: 13.5px;
  font-weight: 500;
  letter-spacing: -0.01em;
  cursor: pointer;
  -webkit-font-smoothing: antialiased;
  transition:
    background-color 180ms cubic-bezier(0.22, 1, 0.36, 1),
    border-color 180ms cubic-bezier(0.22, 1, 0.36, 1),
    transform 140ms cubic-bezier(0.22, 1, 0.36, 1);
}
:where(.dark, [data-theme="dark"]) .lilt-cb {
  --cb-bg: #181817;
  --cb-hover: #20201e;
  --cb-well: #111110;
  --cb-well-hover: #171716;
  --cb-line: rgb(244 244 242 / 0.1);
  --cb-line-hover: rgb(244 244 242 / 0.17);
  --cb-shadow: 0 1px 2px rgb(0 0 0 / 0.3);
  --cb-ring: #9a82ff;
}
[data-theme="light"] .lilt-cb {
  --cb-bg: #ffffff;
  --cb-hover: #f4f4f2;
  --cb-well: #f4f4f2;
  --cb-well-hover: #ffffff;
  --cb-line: rgb(26 26 24 / 0.1);
  --cb-line-hover: rgb(26 26 24 / 0.16);
  --cb-shadow: 0 1px 2px rgb(26 26 24 / 0.05);
  --cb-ring: #7c5cff;
}

.lilt-cb:hover {
  background: var(--cb-hover);
  border-color: var(--cb-line-hover);
}
.lilt-cb:active {
  transform: scale(0.985);
}
.lilt-cb:focus-visible {
  outline: 2px solid var(--cb-ring);
  outline-offset: 2px;
}
.lilt-cb:disabled {
  opacity: 0.48;
  cursor: not-allowed;
  transform: none;
}

.lilt-cb-well {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: var(--cb-well);
  border: 1px solid var(--cb-line);
  flex-shrink: 0;
  transition: background-color 180ms cubic-bezier(0.22, 1, 0.36, 1);
}
.lilt-cb[data-lit] .lilt-cb-well {
  background: var(--cb-well-hover);
}
.lilt-cb-label {
  white-space: nowrap;
}

@media (prefers-reduced-motion: reduce) {
  .lilt-cb, .lilt-cb-well { transition: none; }
}
`;
