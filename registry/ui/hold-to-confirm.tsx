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
 * For actions that are hard to undo. A machined safety keycap with an ambient glow pool beneath:
 * press and hold and liquid colour fills it from the left, turning the words white as the luminous
 * edge passes under them. Let go early and it drains away; hold to the end and it lands with a
 * spring bounce, a specular glint, and a tick. Space or Enter held down works the same.
 */
export function HoldToConfirm({
  label = 'Hold to delete',
  doneLabel = 'Deleted',
  duration = 1200,
  tone = '#ff4d5e',
  resetAfter = 2000,
  onConfirm,
  disabled = false,
  className,
  style,
}: HoldToConfirmProps) {
  const reduced = useReducedMotion();
  const progress = useMotionValue(0);
  const clip = useTransform(progress, (p) => `inset(0 ${(1 - p) * 100}% 0 0)`);
  const poolOpacity = useTransform(progress, [0, 0.2, 1], [0.18, 0.42, 0.72]);
  const poolScale = useTransform(progress, [0, 1], [0.85, 1.06]);
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
        ? animate(scale, [0.96, 1.035, 1], { duration: 0.42, ease: EASE })
        : animate(scale, phase === 'holding' ? 0.975 : 1, {
            type: 'spring',
            stiffness: 520,
            damping: 26,
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
          gap: 9,
          color: inked ? '#fff' : 'inherit',
        }}
      >
        <span className={inked ? 'lilt-htc-ico lilt-htc-ico--ink' : 'lilt-htc-ico'}>
          {done ? <Tick /> : <Clock />}
        </span>
        <span>{done ? doneLabel : label}</span>
      </motion.span>
    </AnimatePresence>
  );

  return (
    <>
      <style href="lilt-ui-hold-to-confirm" precedence="default">
        {css}
      </style>
      <span
        className="lilt-htc-wrap"
        data-phase={phase}
        style={{ '--htc-tone': tone } as CSSProperties}
      >
        <motion.span
          aria-hidden="true"
          className="lilt-htc-pool"
          style={reduced ? undefined : { opacity: poolOpacity, scale: poolScale }}
        />
        <motion.button
          type="button"
          disabled={disabled}
          aria-label={done ? doneLabel : `${label}. Press and hold to confirm.`}
          className={['lilt-htc', className].filter(Boolean).join(' ')}
          data-phase={phase}
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
          style={{ scale, ...style }}
        >
          <span className="lilt-htc-face">{face(false)}</span>
          {/* The fill carries its own white copy of the words, revealed as it grows. */}
          <motion.span aria-hidden="true" className="lilt-htc-fill" style={{ clipPath: clip }}>
            {face(true)}
            <span className="lilt-htc-glint" />
          </motion.span>
          <span aria-hidden="true" className="lilt-htc-track">
            <motion.span className="lilt-htc-bar" style={{ scaleX: progress }} />
          </span>
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
      </span>
    </>
  );
}

function Clock() {
  return (
    <svg
      aria-hidden="true"
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.1}
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
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
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
.lilt-htc-wrap {
  --htc-a: #ffffff;
  --htc-b: color-mix(in srgb, var(--htc-tone) 6%, #f4f5f8);
  --htc-ring: color-mix(in srgb, var(--htc-tone) 34%, rgba(15, 20, 40, 0.1));
  --htc-top: rgba(255, 255, 255, 0.96);
  --htc-lip: color-mix(in srgb, var(--htc-tone) 22%, #dde0e8);
  --htc-drop: 0 14px 26px -14px rgba(15, 20, 40, 0.24), 0 2px 5px rgba(15, 20, 40, 0.06);
  --htc-ico-bg: color-mix(in srgb, var(--htc-tone) 12%, transparent);
  position: relative;
  display: inline-flex;
  align-items: center;
  isolation: isolate;
}
:where(.dark, [data-theme="dark"]) .lilt-htc-wrap {
  --htc-a: color-mix(in srgb, var(--htc-tone) 13%, #1e2028);
  --htc-b: color-mix(in srgb, var(--htc-tone) 7%, #14161c);
  --htc-ring: color-mix(in srgb, var(--htc-tone) 36%, rgba(255, 255, 255, 0.1));
  --htc-top: color-mix(in srgb, var(--htc-tone) 24%, rgba(255, 255, 255, 0.1));
  --htc-lip: rgba(0, 0, 0, 0.72);
  --htc-drop: 0 16px 30px -14px rgba(0, 0, 0, 0.72), 0 2px 6px rgba(0, 0, 0, 0.38);
  --htc-ico-bg: color-mix(in srgb, var(--htc-tone) 18%, transparent);
}
[data-theme="light"] .lilt-htc-wrap {
  --htc-a: #ffffff;
  --htc-b: color-mix(in srgb, var(--htc-tone) 6%, #f4f5f8);
  --htc-ring: color-mix(in srgb, var(--htc-tone) 34%, rgba(15, 20, 40, 0.1));
  --htc-top: rgba(255, 255, 255, 0.96);
  --htc-lip: color-mix(in srgb, var(--htc-tone) 22%, #dde0e8);
  --htc-drop: 0 14px 26px -14px rgba(15, 20, 40, 0.24), 0 2px 5px rgba(15, 20, 40, 0.06);
  --htc-ico-bg: color-mix(in srgb, var(--htc-tone) 12%, transparent);
}

.lilt-htc-pool {
  position: absolute;
  left: 8%;
  right: 8%;
  bottom: -9px;
  height: 24px;
  border-radius: 50%;
  background: var(--htc-tone);
  filter: blur(15px);
  opacity: 0.2;
  pointer-events: none;
  z-index: 0;
}

.lilt-htc {
  position: relative;
  z-index: 1;
  display: inline-grid;
  height: 46px;
  padding: 0 18px 0 12px;
  border: 0;
  border-radius: 14px;
  overflow: hidden;
  background: linear-gradient(180deg, var(--htc-a), var(--htc-b));
  box-shadow:
    0 0 0 1px var(--htc-ring),
    inset 0 1.5px 0 var(--htc-top),
    inset 0 -2px 0 var(--htc-lip),
    var(--htc-drop);
  color: var(--htc-tone);
  font: inherit;
  font-size: 13.5px;
  font-weight: 600;
  letter-spacing: -0.01em;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  touch-action: none;
  -webkit-font-smoothing: antialiased;
}
.lilt-htc:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--htc-tone) 55%, transparent);
  outline-offset: 2px;
}
.lilt-htc:disabled {
  cursor: not-allowed;
  opacity: 0.5;
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
  padding: 0 18px 0 12px;
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--htc-tone) 84%, white),
    var(--htc-tone) 68%,
    color-mix(in srgb, var(--htc-tone) 88%, black)
  );
  box-shadow:
    inset 0 1.5px 0 rgba(255, 255, 255, 0.34),
    inset 0 -2px 0 rgba(0, 0, 0, 0.16);
}
.lilt-htc-ico {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 7px;
  background: var(--htc-ico-bg);
  flex-shrink: 0;
}
.lilt-htc-ico--ink {
  background: rgba(255, 255, 255, 0.2);
}

.lilt-htc-glint {
  position: absolute;
  inset: -40% auto -40% -50%;
  width: 42%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.55), transparent);
  transform: skewX(-22deg);
  opacity: 0;
  pointer-events: none;
}
.lilt-htc[data-phase="done"] .lilt-htc-glint {
  animation: lilt-htc-glint 800ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

.lilt-htc-track {
  position: absolute;
  left: 10px;
  right: 10px;
  bottom: 3px;
  height: 2px;
  border-radius: 99px;
  overflow: hidden;
  background: color-mix(in srgb, var(--htc-tone) 14%, transparent);
  pointer-events: none;
}
.lilt-htc-bar {
  display: block;
  width: 100%;
  height: 100%;
  transform-origin: 0 50%;
  background: rgba(255, 255, 255, 0.65);
}

@keyframes lilt-htc-glint {
  0% { opacity: 0; transform: skewX(-22deg) translateX(0); }
  25% { opacity: 1; }
  100% { opacity: 0; transform: skewX(-22deg) translateX(460%); }
}
@media (prefers-reduced-motion: reduce) {
  .lilt-htc[data-phase="done"] .lilt-htc-glint { animation: none; }
}
`;
