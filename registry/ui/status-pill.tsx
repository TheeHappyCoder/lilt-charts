'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { CSSProperties, ReactNode } from 'react';

/** What the pill shows for one status: its words, its colour, and the mark beside them. */
export interface PillState {
  label: string;
  /** A CSS colour for the mark. Default the text colour. */
  tone?: string;
  /**
   * `spin` is a track with an arc running round it, `tick` draws itself, `dot` is a solid dot and
   * `ring` a hollow one; or any node of your own.
   */
  mark?: 'spin' | 'tick' | 'dot' | 'ring' | ReactNode;
}

export type PillStatus = 'saving' | 'saved' | 'offline' | 'error';

export const PILL_STATES: Record<PillStatus, PillState> = {
  saving: { label: 'Saving changes', tone: '#8e9eff', mark: 'spin' },
  saved: { label: 'Saved', tone: '#32c484', mark: 'tick' },
  offline: { label: 'Offline, will sync later', tone: '#f2a83b', mark: 'ring' },
  error: { label: 'Couldn’t save', tone: '#f05d6c', mark: 'dot' },
};

export interface StatusPillProps<Key extends string = PillStatus> {
  /** The current status, a key of `states`. */
  status: Key;
  /** Every status the pill can show. Default saving, saved, offline and error. */
  states?: Record<Key, PillState>;
  className?: string;
  style?: CSSProperties;
}

const SPRING = { type: 'spring', stiffness: 420, damping: 34, mass: 0.8 } as const;
const BLUR = { duration: 0.22, ease: [0.22, 1, 0.36, 1] } as const;

/**
 * One machined capsule that tells you where things stand. When the status changes it grows or
 * shrinks to the new words on a spring, its ambient light pool shifts to the status tone, the old
 * words blur up and away as the new ones land, and the mark beside them changes with them: an arc
 * running round while it works, a tick that draws itself when it is done. Nothing loops but the
 * spinner. Screen readers hear each new status.
 */
export function StatusPill<Key extends string = PillStatus>({
  status,
  states = PILL_STATES as Record<Key, PillState>,
  className,
  style,
}: StatusPillProps<Key>) {
  const reduced = useReducedMotion();
  const state = states[status];
  const tone = state.tone ?? 'currentColor';
  return (
    <>
      <style href="lilt-ui-status-pill" precedence="default">
        {css}
      </style>
      <motion.span
        layout={!reduced}
        transition={SPRING}
        role="status"
        aria-live="polite"
        className={['lilt-stp', className].filter(Boolean).join(' ')}
        style={{ '--stp-tone': tone, ...style } as CSSProperties}
      >
        <span className="lilt-stp-wash" aria-hidden="true" />
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={String(status)}
            layout={!reduced}
            style={{
              position: 'relative',
              zIndex: 1,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 9,
            }}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 10, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: -10, filter: 'blur(4px)' }}
            transition={BLUR}
          >
            <Mark mark={state.mark ?? 'dot'} tone={tone} reduced={Boolean(reduced)} />
            <span>{state.label}</span>
          </motion.span>
        </AnimatePresence>
      </motion.span>
    </>
  );
}

const SIZE = 15;

function Mark({
  mark,
  tone,
  reduced,
}: {
  mark: NonNullable<PillState['mark']>;
  tone: string;
  reduced: boolean;
}) {
  const box: CSSProperties = {
    display: 'grid',
    placeItems: 'center',
    width: SIZE,
    height: SIZE,
    color: tone,
    flexShrink: 0,
  };
  if (mark === 'spin') {
    const stroke = 2;
    const r = (SIZE - stroke) / 2;
    const around = 2 * Math.PI * r;
    return (
      <span className="lilt-stp-well" aria-hidden="true">
        <motion.svg
          aria-hidden="true"
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          style={box}
          animate={reduced ? undefined : { rotate: 360 }}
          transition={{ duration: 0.85, ease: 'linear', repeat: Infinity }}
        >
          <circle cx={SIZE / 2} cy={SIZE / 2} r={r} opacity={0.22} />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={r}
            strokeLinecap="round"
            strokeDasharray={`${around * 0.3} ${around}`}
          />
        </motion.svg>
      </span>
    );
  }
  if (mark === 'tick')
    return (
      <span className="lilt-stp-well" aria-hidden="true">
        <svg aria-hidden="true" viewBox="0 0 16 16" style={box}>
          <circle cx="8" cy="8" r="7.2" fill="currentColor" opacity={0.14} />
          <motion.path
            d="M4.8 8.3l2.2 2.2 4.3-4.6"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.85}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: reduced ? 1 : 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.36, delay: 0.08, ease: [0.65, 0, 0.35, 1] }}
          />
        </svg>
      </span>
    );
  if (mark === 'dot' || mark === 'ring')
    return (
      <span className="lilt-stp-well" aria-hidden="true">
        <span aria-hidden="true" style={box}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              boxSizing: 'border-box',
              ...(mark === 'dot'
                ? {
                    background: 'currentColor',
                    boxShadow: `0 0 8px color-mix(in srgb, ${tone} 65%, transparent), inset 0 1px 0 rgb(255 255 255 / 0.45)`,
                  }
                : {
                    border: '1.85px solid currentColor',
                    boxShadow: `0 0 6px color-mix(in srgb, ${tone} 40%, transparent)`,
                  }),
            }}
          />
        </span>
      </span>
    );
  return (
    <span className="lilt-stp-well" aria-hidden="true">
      <span aria-hidden="true" style={box}>
        {mark}
      </span>
    </span>
  );
}

const css = /* css */ `
.lilt-stp {
  --stp-a: #ffffff;
  --stp-b: #f1f2f6;
  --stp-ring: rgba(15, 20, 40, 0.085);
  --stp-top: #ffffff;
  --stp-lip: #dfe2ea;
  --stp-drop: 0 12px 24px -12px rgba(15, 20, 40, 0.22), 0 2px 5px rgba(15, 20, 40, 0.06);
  --stp-well-bg: color-mix(in srgb, var(--stp-tone) 12%, transparent);
  --stp-well-ring: color-mix(in srgb, var(--stp-tone) 22%, transparent);
  position: relative;
  display: inline-flex;
  align-items: center;
  height: 36px;
  padding: 0 14px 0 8px;
  border-radius: 999px;
  overflow: hidden;
  white-space: nowrap;
  background: linear-gradient(180deg, var(--stp-a), var(--stp-b));
  box-shadow:
    0 0 0 1px var(--stp-ring),
    inset 0 1.5px 0 var(--stp-top),
    inset 0 -2px 0 var(--stp-lip),
    var(--stp-drop);
  font-size: 13px;
  font-weight: 550;
  letter-spacing: -0.01em;
  -webkit-font-smoothing: antialiased;
}
:where(.dark, [data-theme="dark"]) .lilt-stp {
  --stp-a: #24262e;
  --stp-b: #17191f;
  --stp-ring: rgba(255, 255, 255, 0.11);
  --stp-top: rgba(255, 255, 255, 0.12);
  --stp-lip: rgba(0, 0, 0, 0.72);
  --stp-drop: 0 14px 28px -12px rgba(0, 0, 0, 0.7), 0 2px 6px rgba(0, 0, 0, 0.36);
  --stp-well-bg: color-mix(in srgb, var(--stp-tone) 16%, transparent);
  --stp-well-ring: color-mix(in srgb, var(--stp-tone) 28%, transparent);
}
[data-theme="light"] .lilt-stp {
  --stp-a: #ffffff;
  --stp-b: #f1f2f6;
  --stp-ring: rgba(15, 20, 40, 0.085);
  --stp-top: #ffffff;
  --stp-lip: #dfe2ea;
  --stp-drop: 0 12px 24px -12px rgba(15, 20, 40, 0.22), 0 2px 5px rgba(15, 20, 40, 0.06);
  --stp-well-bg: color-mix(in srgb, var(--stp-tone) 12%, transparent);
  --stp-well-ring: color-mix(in srgb, var(--stp-tone) 22%, transparent);
}

.lilt-stp-wash {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    90% 130% at 16% 50%,
    color-mix(in srgb, var(--stp-tone) 15%, transparent),
    transparent 70%
  );
  pointer-events: none;
  z-index: 0;
  transition: background 360ms ease;
}
.lilt-stp-well {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--stp-well-bg);
  box-shadow: inset 0 0 0 1px var(--stp-well-ring);
  flex-shrink: 0;
}
`;
