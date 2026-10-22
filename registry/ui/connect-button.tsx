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
    <button
      type="button"
      {...rest}
      className={className}
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
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        height: 40,
        padding: '0 14px 0 10px',
        border: '1px solid color-mix(in srgb, currentColor 13%, transparent)',
        borderRadius: 10,
        // A face lit from above: a flat tint that warms on hover, a sheen over it, a hairline on top.
        backgroundColor: `color-mix(in srgb, currentColor ${lit ? 9 : 5}%, transparent)`,
        backgroundImage:
          'linear-gradient(to bottom, color-mix(in srgb, currentColor 4%, transparent), transparent)',
        boxShadow:
          'inset 0 1px 0 color-mix(in srgb, currentColor 8%, transparent), 0 1px 2px rgb(0 0 0 / 0.2)',
        color: 'inherit',
        font: 'inherit',
        fontSize: 13.5,
        fontWeight: 500,
        letterSpacing: '-0.005em',
        cursor: 'pointer',
        transition: 'background-color 160ms ease',
        ...style,
      }}
    >
      <LogoTriad logos={logos} size={23} cycling={lit} />
      <span>{label}</span>
      <motion.svg
        aria-hidden="true"
        width={14}
        height={14}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={false}
        animate={lit ? { x: 0, opacity: 0.7 } : { x: reduced ? 0 : -4, opacity: 0.35 }}
        transition={{ type: 'spring', stiffness: 520, damping: 34 }}
      >
        <path d="M5 12h14M13 6l6 6-6 6" />
      </motion.svg>
    </button>
  );
}
