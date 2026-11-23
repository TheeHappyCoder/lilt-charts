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
 * A button that shows what it connects to. Three provider marks sit in a recessed socket beside
 * the label; hover or focus it and an ambient pastel pool wakes beneath the keycap while the marks
 * ripple through every provider you support, then settle back when you leave.
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
      <span className="lilt-cb-wrap" data-lit={lit || undefined}>
        <span className="lilt-cb-pool" aria-hidden="true" />
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
          <span className="lilt-cb-glint" aria-hidden="true" />
          <span className="lilt-cb-well">
            <span className="lilt-cb-well-glow" aria-hidden="true" />
            <LogoTriad logos={logos} size={20} cycling={lit} />
          </span>
          <span className="lilt-cb-label">{label}</span>
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
            animate={lit ? { x: 1, opacity: 0.85 } : { x: reduced ? 0 : -3, opacity: 0.4 }}
            transition={{ type: 'spring', stiffness: 520, damping: 32 }}
            style={{ position: 'relative', zIndex: 1, flexShrink: 0 }}
          >
            <path d="M5 12h14M13 6l6 6-6 6" />
          </motion.svg>
        </button>
      </span>
    </>
  );
}

const css = /* css */ `
.lilt-cb-wrap {
  --cb-a: #ffffff;
  --cb-b: #f1f2f6;
  --cb-ring: rgba(15, 20, 40, 0.09);
  --cb-top: #ffffff;
  --cb-lip: #dfe2ea;
  --cb-drop: 0 12px 24px -12px rgba(15, 20, 40, 0.24), 0 2px 5px rgba(15, 20, 40, 0.06);
  --cb-drop-lit: 0 16px 28px -12px rgba(15, 20, 40, 0.28), 0 3px 7px rgba(15, 20, 40, 0.08);
  --cb-well-a: #e7e9ef;
  --cb-well-b: #f4f5f8;
  --cb-well-in: inset 0 1.5px 3px rgba(15, 20, 40, 0.13), inset 0 0 0 1px rgba(15, 20, 40, 0.05);
  --cb-well-out: 0 1px 0 rgba(255, 255, 255, 0.95);
  --cb-glint: rgba(255, 255, 255, 0.72);
  --cb-pool-a: 0.56;
  --cb-focus: rgba(23, 23, 23, 0.28);
  position: relative;
  display: inline-flex;
  align-items: center;
  isolation: isolate;
}
:where(.dark, [data-theme="dark"]) .lilt-cb-wrap {
  --cb-a: #24262e;
  --cb-b: #17191f;
  --cb-ring: rgba(255, 255, 255, 0.11);
  --cb-top: rgba(255, 255, 255, 0.12);
  --cb-lip: rgba(0, 0, 0, 0.75);
  --cb-drop: 0 14px 28px -12px rgba(0, 0, 0, 0.65), 0 2px 5px rgba(0, 0, 0, 0.35);
  --cb-drop-lit: 0 18px 34px -12px rgba(0, 0, 0, 0.78), 0 3px 8px rgba(0, 0, 0, 0.42);
  --cb-well-a: #101116;
  --cb-well-b: #16181f;
  --cb-well-in: inset 0 1.5px 4px rgba(0, 0, 0, 0.65), inset 0 0 0 1px rgba(255, 255, 255, 0.06);
  --cb-well-out: 0 1px 0 rgba(255, 255, 255, 0.07);
  --cb-glint: rgba(255, 255, 255, 0.14);
  --cb-pool-a: 0.42;
  --cb-focus: rgba(255, 255, 255, 0.32);
}
[data-theme="light"] .lilt-cb-wrap {
  --cb-a: #ffffff;
  --cb-b: #f1f2f6;
  --cb-ring: rgba(15, 20, 40, 0.09);
  --cb-top: #ffffff;
  --cb-lip: #dfe2ea;
  --cb-drop: 0 12px 24px -12px rgba(15, 20, 40, 0.24), 0 2px 5px rgba(15, 20, 40, 0.06);
  --cb-drop-lit: 0 16px 28px -12px rgba(15, 20, 40, 0.28), 0 3px 7px rgba(15, 20, 40, 0.08);
  --cb-well-a: #e7e9ef;
  --cb-well-b: #f4f5f8;
  --cb-well-in: inset 0 1.5px 3px rgba(15, 20, 40, 0.13), inset 0 0 0 1px rgba(15, 20, 40, 0.05);
  --cb-well-out: 0 1px 0 rgba(255, 255, 255, 0.95);
  --cb-glint: rgba(255, 255, 255, 0.72);
  --cb-pool-a: 0.56;
  --cb-focus: rgba(23, 23, 23, 0.28);
}

.lilt-cb-pool {
  position: absolute;
  left: 10%;
  right: 10%;
  bottom: -9px;
  height: 22px;
  border-radius: 50%;
  background: linear-gradient(90deg, #ffa3ae, #ffb99f 34%, #c8a8e8 68%, #a3b1ff);
  filter: blur(14px);
  opacity: 0;
  transform: scale(0.84, 0.75);
  pointer-events: none;
  z-index: 0;
  transition: opacity 420ms ease, transform 520ms cubic-bezier(0.22, 1, 0.36, 1);
}
.lilt-cb-wrap[data-lit] .lilt-cb-pool {
  opacity: var(--cb-pool-a);
  transform: scale(1, 1);
}

.lilt-cb {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 11px;
  height: 46px;
  padding: 0 15px 0 8px;
  border: 0;
  border-radius: 14px;
  overflow: hidden;
  background: linear-gradient(180deg, var(--cb-a), var(--cb-b));
  box-shadow:
    0 0 0 1px var(--cb-ring),
    inset 0 1.5px 0 var(--cb-top),
    inset 0 -2px 0 var(--cb-lip),
    var(--cb-drop);
  color: inherit;
  font: inherit;
  font-size: 13.5px;
  font-weight: 550;
  letter-spacing: -0.01em;
  cursor: pointer;
  -webkit-font-smoothing: antialiased;
  transition:
    transform 180ms cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 260ms cubic-bezier(0.22, 1, 0.36, 1);
}
.lilt-cb:hover {
  transform: translateY(-1px);
  box-shadow:
    0 0 0 1px var(--cb-ring),
    inset 0 1.5px 0 var(--cb-top),
    inset 0 -2px 0 var(--cb-lip),
    var(--cb-drop-lit);
}
.lilt-cb:active {
  transform: translateY(1px) scale(0.988);
  box-shadow:
    0 0 0 1px var(--cb-ring),
    inset 0 1px 0 var(--cb-top),
    inset 0 -1px 0 var(--cb-lip),
    0 4px 10px -6px rgba(15, 20, 40, 0.25);
}
.lilt-cb:focus-visible {
  outline: 2px solid var(--cb-focus);
  outline-offset: 2px;
}
.lilt-cb:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.lilt-cb-glint {
  position: absolute;
  inset: -40% auto -40% -65%;
  width: 48%;
  background: linear-gradient(90deg, transparent, var(--cb-glint), transparent);
  transform: skewX(-22deg) translateX(0);
  opacity: 0;
  pointer-events: none;
  z-index: 0;
}
.lilt-cb[data-lit] .lilt-cb-glint {
  animation: lilt-cb-sweep 900ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

.lilt-cb-well {
  position: relative;
  z-index: 1;
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 9px;
  overflow: hidden;
  background: linear-gradient(180deg, var(--cb-well-a), var(--cb-well-b));
  box-shadow: var(--cb-well-in), var(--cb-well-out);
  flex-shrink: 0;
}
.lilt-cb-well-glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 50% 60%, rgba(168, 181, 255, 0.38), rgba(200, 168, 229, 0.2) 55%, transparent 80%);
  opacity: 0;
  transition: opacity 380ms ease;
  pointer-events: none;
}
.lilt-cb[data-lit] .lilt-cb-well-glow {
  opacity: 1;
}
.lilt-cb-label {
  position: relative;
  z-index: 1;
}

@keyframes lilt-cb-sweep {
  0% { opacity: 0; transform: skewX(-22deg) translateX(0); }
  25% { opacity: 1; }
  100% { opacity: 0; transform: skewX(-22deg) translateX(420%); }
}

@media (prefers-reduced-motion: reduce) {
  .lilt-cb, .lilt-cb-pool, .lilt-cb-well-glow { transition: none; }
  .lilt-cb[data-lit] .lilt-cb-glint { animation: none; }
}
`;
