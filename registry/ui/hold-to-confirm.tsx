'use client';

import {
  animate,
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type AnimationPlaybackControls,
} from 'motion/react';
import { useEffect, useRef, useState, type CSSProperties } from 'react';

export interface HoldToConfirmProps {
  /** What holding it does. Default 'Hold to delete'. */
  label?: string;
  /** What it says once done. Default 'Deleted'. */
  doneLabel?: string;
  /** Milliseconds to hold. Default 1200. */
  duration?: number;
  /** The fill's colour. Default a warning red. */
  tone?: string;
  /** Milliseconds before it can be held again; 0 stays done. Default 2000. */
  resetAfter?: number;
  /** Called once the hold completes. */
  onConfirm?: () => void;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
}

type Phase = 'idle' | 'holding' | 'done';

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * For actions that are hard to undo. Press and hold: colour fills it from the left, and the words
 * turn white as the fill passes under them. Let go early and it drains away; hold to the end and
 * it lands with a small bounce and a tick. Space or Enter held down works the same.
 */
export function HoldToConfirm({
  label = 'Hold to delete',
  doneLabel = 'Deleted',
  duration = 1200,
  tone = '#d93848',
  resetAfter = 2000,
  onConfirm,
  disabled = false,
  className,
  style,
}: HoldToConfirmProps) {
  const reduced = useReducedMotion();
  const progress = useMotionValue(0);
  const clip = useTransform(progress, (p) => `inset(0 ${(1 - p) * 100}% 0 0)`);
  const scale = useMotionValue(1);
  const [phase, setPhase] = useState<Phase>('idle');
  const run = useRef<AnimationPlaybackControls | null>(null);
  const confirm = useRef(onConfirm);
  confirm.current = onConfirm;

  useEffect(() => {
    if (phase !== 'done' || resetAfter <= 0) return;
    const timer = setTimeout(() => {
      progress.set(0);
      setPhase('idle');
    }, resetAfter);
    return () => clearTimeout(timer);
  }, [phase, resetAfter, progress]);

  useEffect(() => () => run.current?.stop(), []);

  // Pressed in while held; on landing, a quick swell past full size and back.
  useEffect(() => {
    if (reduced) return;
    const controls =
      phase === 'done'
        ? animate(scale, [0.975, 1.03, 1], { duration: 0.38, ease: EASE })
        : animate(scale, phase === 'holding' ? 0.975 : 1, {
            type: 'spring',
            stiffness: 520,
            damping: 28,
          });
    return () => controls.stop();
  }, [phase, reduced, scale]);

  const start = () => {
    if (disabled || phase !== 'idle') return;
    setPhase('holding');
    run.current?.stop();
    run.current = animate(progress, 1, {
      duration: ((1 - progress.get()) * duration) / 1000,
      ease: 'linear',
      onComplete: () => {
        setPhase('done');
        confirm.current?.();
      },
    });
  };
  const cancel = () => {
    if (phase !== 'holding') return;
    run.current?.stop();
    setPhase('idle');
    run.current = animate(progress, 0, { duration: 0.35, ease: EASE });
  };

  const done = phase === 'done';
  const face = (inked: boolean) => (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span
        key={done ? 'done' : 'label'}
        initial={{ opacity: 0, y: reduced ? 0 : 8, filter: 'blur(4px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        exit={{ opacity: 0, y: reduced ? 0 : -8, filter: 'blur(4px)' }}
        transition={{ duration: 0.22, ease: EASE }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          color: inked ? '#fff' : 'inherit',
        }}
      >
        {done ? <Tick /> : <Clock />}
        <span>{done ? doneLabel : label}</span>
      </motion.span>
    </AnimatePresence>
  );

  return (
    <>
      <style href="lilt-ui-hold-to-confirm" precedence="default">
        {css}
      </style>
      <motion.button
        type="button"
        disabled={disabled}
        aria-label={done ? doneLabel : `${label}. Press and hold to confirm.`}
        className={['lilt-htc', className].filter(Boolean).join(' ')}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          start();
        }}
        onPointerUp={cancel}
        onPointerCancel={cancel}
        onKeyDown={(event) => {
          if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) {
            event.preventDefault();
            start();
          }
        }}
        onKeyUp={(event) => {
          if (event.key === ' ' || event.key === 'Enter') cancel();
        }}
        onContextMenu={(event) => event.preventDefault()}
        style={{ scale, '--htc-tone': tone, ...style } as CSSProperties}
      >
        <span className="lilt-htc-face">{face(false)}</span>
        {/* The fill carries its own white copy of the words, revealed as it grows. */}
        <motion.span aria-hidden="true" className="lilt-htc-fill" style={{ clipPath: clip }}>
          {face(true)}
        </motion.span>
        <span
          aria-live="polite"
          style={{
            position: 'absolute',
            width: 1,
            height: 1,
            overflow: 'hidden',
            clipPath: 'inset(50%)',
          }}
        >
          {done ? doneLabel : ''}
        </span>
      </motion.button>
    </>
  );
}

function Clock() {
  return (
    <svg
      aria-hidden="true"
      width={15}
      height={15}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function Tick() {
  return (
    <svg
      aria-hidden="true"
      width={15}
      height={15}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.3}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <motion.path
        d="M5 12.5l4.5 4.5L19 7.5"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.34, delay: 0.08, ease: [0.65, 0, 0.35, 1] }}
      />
    </svg>
  );
}

const css = /* css */ `
.lilt-htc {
  --htc-base: #ffffff;
  --htc-shadow: 0 1px 2px rgb(26 26 24 / 0.04);
  position: relative;
  display: inline-grid;
  height: 42px;
  padding: 0 16px;
  border: 1px solid color-mix(in srgb, var(--htc-tone) 30%, transparent);
  border-radius: 12px;
  overflow: hidden;
  background: color-mix(in srgb, var(--htc-tone) 8%, var(--htc-base));
  box-shadow: var(--htc-shadow);
  color: var(--htc-tone);
  font: inherit;
  font-size: 13.5px;
  font-weight: 500;
  letter-spacing: -0.01em;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  touch-action: none;
  -webkit-font-smoothing: antialiased;
  transition: background-color 180ms ease, border-color 180ms ease;
}
:where(.dark, [data-theme="dark"]) .lilt-htc {
  --htc-base: #181817;
  --htc-shadow: 0 1px 2px rgb(0 0 0 / 0.28);
}
[data-theme="light"] .lilt-htc {
  --htc-base: #ffffff;
  --htc-shadow: 0 1px 2px rgb(26 26 24 / 0.04);
}
.lilt-htc:hover:not(:disabled) {
  background: color-mix(in srgb, var(--htc-tone) 12%, var(--htc-base));
  border-color: color-mix(in srgb, var(--htc-tone) 42%, transparent);
}
.lilt-htc:focus-visible {
  outline: 2px solid var(--htc-tone);
  outline-offset: 2px;
}
.lilt-htc:disabled {
  cursor: not-allowed;
  opacity: 0.48;
}

.lilt-htc-face {
  grid-area: 1 / 1;
  display: grid;
  place-items: center;
}
.lilt-htc-fill {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 0 16px;
  background: var(--htc-tone);
}
`;
