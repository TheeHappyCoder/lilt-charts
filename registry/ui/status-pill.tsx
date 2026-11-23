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
  saving: { label: 'Saving changes', mark: 'spin' },
  saved: { label: 'Saved', tone: '#2d8a4e', mark: 'tick' },
  offline: { label: 'Offline, will sync later', tone: '#c2701c', mark: 'ring' },
  error: { label: 'Couldn’t save', tone: '#d93848', mark: 'dot' },
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
 * One pill that tells you where things stand. When the status changes it grows or shrinks to the
 * new words on a spring, the old words blur up and away as the new ones land, and the mark beside
 * them changes with them: an arc running round while it works, a tick that draws itself when it is
 * done. Nothing loops but the spinner. Screen readers hear each new status.
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
        style={style}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={String(status)}
            layout={!reduced}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
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

const SIZE = 14;

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
    const stroke = 1.9;
    const r = (SIZE - stroke) / 2;
    const around = 2 * Math.PI * r;
    return (
      <motion.svg
        aria-hidden="true"
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        style={box}
        animate={reduced ? undefined : { rotate: 360 }}
        transition={{ duration: 0.8, ease: 'linear', repeat: Infinity }}
      >
        <circle cx={SIZE / 2} cy={SIZE / 2} r={r} opacity={0.22} />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={r}
          strokeLinecap="round"
          strokeDasharray={`${around * 0.28} ${around}`}
        />
      </motion.svg>
    );
  }
  if (mark === 'tick')
    return (
      <svg aria-hidden="true" viewBox="0 0 16 16" style={box}>
        <circle cx="8" cy="8" r="7.2" fill="currentColor" opacity={0.14} />
        <motion.path
          d="M4.8 8.3l2.2 2.2 4.3-4.6"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: reduced ? 1 : 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.36, delay: 0.08, ease: [0.65, 0, 0.35, 1] }}
        />
      </svg>
    );
  if (mark === 'dot' || mark === 'ring')
    return (
      <span aria-hidden="true" style={box}>
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            boxSizing: 'border-box',
            ...(mark === 'dot'
              ? { background: 'currentColor' }
              : { border: '1.75px solid currentColor' }),
          }}
        />
      </span>
    );
  return (
    <span aria-hidden="true" style={box}>
      {mark}
    </span>
  );
}

const css = /* css */ `
.lilt-stp {
  --stp-bg: #ffffff;
  --stp-line: rgb(26 26 24 / 0.1);
  --stp-shadow: 0 1px 2px rgb(26 26 24 / 0.04);
  display: inline-flex;
  align-items: center;
  height: 34px;
  padding: 0 13px 0 10px;
  border: 1px solid var(--stp-line);
  border-radius: 999px;
  overflow: hidden;
  white-space: nowrap;
  background: var(--stp-bg);
  box-shadow: var(--stp-shadow);
  font-size: 13px;
  font-weight: 500;
  letter-spacing: -0.01em;
  -webkit-font-smoothing: antialiased;
}
:where(.dark, [data-theme="dark"]) .lilt-stp {
  --stp-bg: #181817;
  --stp-line: rgb(244 244 242 / 0.1);
  --stp-shadow: 0 1px 2px rgb(0 0 0 / 0.28);
}
[data-theme="light"] .lilt-stp {
  --stp-bg: #ffffff;
  --stp-line: rgb(26 26 24 / 0.1);
  --stp-shadow: 0 1px 2px rgb(26 26 24 / 0.04);
}
`;
