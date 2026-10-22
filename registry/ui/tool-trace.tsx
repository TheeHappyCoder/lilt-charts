'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';

export type StepStatus = 'running' | 'done' | 'error';

export interface TraceStep {
  /** Keeps the step's row steady as others arrive. */
  id: string;
  /** What it did, such as 'Read file'. */
  label: string;
  /** What it did it to, such as a path or a query. Set in mono. */
  detail?: string;
  status: StepStatus;
  /** Milliseconds it took, once it is done. A running step counts its own. */
  duration?: number;
}

export interface ToolTraceProps {
  steps: readonly TraceStep[];
  /** Open at first. Default false. */
  defaultOpen?: boolean;
  /** Open or closed, when you hold the state yourself. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** The closed line once nothing is running. Default 'Used N tools'. */
  summary?: (steps: readonly TraceStep[]) => string;
  className?: string;
  style?: CSSProperties;
}

const EASE = [0.22, 1, 0.36, 1] as const;
const SPRING = { type: 'spring', stiffness: 420, damping: 36 } as const;
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
const RED = '#ff6369';
const ICON = 16;

const defaultSummary = (steps: readonly TraceStep[]) =>
  `Used ${steps.length} tool${steps.length === 1 ? '' : 's'}`;

/** 340ms, 1.2s, 12s. */
export function formatDuration(ms: number) {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(ms < 10_000 ? 1 : 0)}s`;
}

/**
 * What an agent did, folded into one line. Closed, the line shows the step it is on right now,
 * each new step rolling up out of a blur, and the time so far, so you can follow along without
 * opening it; once it is finished it settles into a summary. Open, each step has its own row: an
 * arc runs round its icon while it works and becomes a tick that draws itself, and the rail down
 * the left fills in behind each step as it completes.
 */
export function ToolTrace({
  steps,
  defaultOpen = false,
  open: held,
  onOpenChange,
  summary = defaultSummary,
  className,
  style,
}: ToolTraceProps) {
  const reduced = Boolean(useReducedMotion());
  const id = useId();
  const [own, setOwn] = useState(defaultOpen);
  const open = held ?? own;
  const toggle = () => {
    setOwn(!open);
    onOpenChange?.(!open);
  };

  const now = useClock(steps.some((step) => step.status === 'running'));
  const started = useStartTimes(steps);
  const elapsed = (step: TraceStep) =>
    step.status === 'running' ? Math.max(0, now - (started[step.id] ?? now)) : (step.duration ?? 0);
  const total = steps.reduce((sum, step) => sum + elapsed(step), 0);
  const running = steps.find((step) => step.status === 'running');
  const failed = steps.some((step) => step.status === 'error');
  const headline = running
    ? { key: `run-${running.id}`, text: running.label, detail: running.detail }
    : steps.length === 0
      ? { key: 'start', text: 'Starting', detail: undefined }
      : { key: 'summary', text: summary(steps), detail: undefined };

  return (
    <div
      className={className}
      style={{
        width: 'min(440px, 100%)',
        borderRadius: 12,
        border: '1px solid color-mix(in srgb, currentColor 12%, transparent)',
        background:
          'linear-gradient(to bottom, color-mix(in srgb, currentColor 5%, transparent), color-mix(in srgb, currentColor 3%, transparent))',
        boxShadow:
          'inset 0 1px 0 color-mix(in srgb, currentColor 6%, transparent), 0 1px 2px rgb(0 0 0 / 0.16)',
        overflow: 'hidden',
        ...style,
      }}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={`${id}-steps`}
        onClick={toggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          width: '100%',
          height: 42,
          padding: '0 12px',
          border: 0,
          background: 'none',
          color: 'inherit',
          font: 'inherit',
          fontSize: 13,
          textAlign: 'left',
          cursor: 'pointer',
        }}
      >
        <StepIcon
          status={running || steps.length === 0 ? 'running' : failed ? 'error' : 'done'}
          reduced={reduced}
        />
        <span
          style={{
            position: 'relative',
            flex: 1,
            minWidth: 0,
            display: 'grid',
            overflow: 'hidden',
          }}
          aria-live="polite"
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={headline.key}
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 10, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, y: -10, filter: 'blur(4px)' }}
              transition={{ duration: 0.24, ease: EASE }}
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 8,
                minWidth: 0,
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ fontWeight: 500 }}>{headline.text}</span>
              {headline.detail ? (
                <span
                  style={{
                    minWidth: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    fontFamily: MONO,
                    fontSize: 12,
                    opacity: 0.5,
                  }}
                >
                  {headline.detail}
                </span>
              ) : null}
            </motion.span>
          </AnimatePresence>
        </span>
        <span style={{ fontSize: 12, opacity: 0.45, fontVariantNumeric: 'tabular-nums' }}>
          {formatDuration(total)}
        </span>
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
          animate={{ rotate: open ? 90 : 0 }}
          transition={reduced ? { duration: 0 } : SPRING}
          style={{ opacity: 0.45, flexShrink: 0 }}
        >
          <path d="M9 6l6 6-6 6" />
        </motion.svg>
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            id={`${id}-steps`}
            key="steps"
            initial={reduced ? { opacity: 0 } : { height: 0, opacity: 0, filter: 'blur(4px)' }}
            animate={{ height: 'auto', opacity: 1, filter: 'blur(0px)' }}
            exit={reduced ? { opacity: 0 } : { height: 0, opacity: 0, filter: 'blur(4px)' }}
            transition={{ height: SPRING, default: { duration: 0.24, ease: EASE } }}
            style={{ overflow: 'hidden' }}
          >
            <ol
              style={{
                margin: 0,
                padding: '4px 12px 12px',
                listStyle: 'none',
                borderTop: '1px solid color-mix(in srgb, currentColor 8%, transparent)',
              }}
            >
              <AnimatePresence initial={false}>
                {steps.map((step, index) => (
                  <Row
                    key={step.id}
                    step={step}
                    ms={elapsed(step)}
                    last={index === steps.length - 1}
                    reduced={reduced}
                  />
                ))}
              </AnimatePresence>
            </ol>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function Row({
  step,
  ms,
  last,
  reduced,
}: {
  step: TraceStep;
  ms: number;
  last: boolean;
  reduced: boolean;
}) {
  const failed = step.status === 'error';
  return (
    <motion.li
      layout={!reduced}
      initial={reduced ? { opacity: 0 } : { opacity: 0, height: 0, filter: 'blur(4px)' }}
      animate={{ opacity: 1, height: 'auto', filter: 'blur(0px)' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ height: SPRING, default: { duration: 0.28, ease: EASE } }}
      style={{ position: 'relative' }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `${ICON}px minmax(0, 1fr) auto`,
          alignItems: 'center',
          columnGap: 10,
          paddingTop: 13,
          fontSize: 13,
        }}
      >
        <StepIcon status={step.status} reduced={reduced} />
        <span style={{ display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0 }}>
          <span style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>{step.label}</span>
          {step.detail ? (
            <span
              title={step.detail}
              style={{
                minWidth: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontFamily: MONO,
                fontSize: 12,
                opacity: 0.5,
              }}
            >
              {step.detail}
            </span>
          ) : null}
        </span>
        <span
          style={{
            fontSize: 12,
            fontVariantNumeric: 'tabular-nums',
            color: failed ? RED : undefined,
            opacity: failed ? 0.9 : 0.45,
          }}
        >
          {failed ? 'Failed' : formatDuration(ms)}
        </span>
      </div>
      {last ? null : (
        // The rail to the next step: a faint track that fills in once this step is done.
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: ICON / 2 - 0.75,
            top: 13 + ICON + 4,
            bottom: -9,
            width: 1.5,
            borderRadius: 1,
            overflow: 'hidden',
            background: 'color-mix(in srgb, currentColor 10%, transparent)',
          }}
        >
          <motion.span
            initial={false}
            animate={{ scaleY: step.status === 'running' ? 0 : 1 }}
            transition={reduced ? { duration: 0 } : { duration: 0.45, ease: EASE }}
            style={{
              position: 'absolute',
              inset: 0,
              originY: 0,
              background: failed ? RED : 'color-mix(in srgb, currentColor 38%, transparent)',
            }}
          />
        </span>
      )}
    </motion.li>
  );
}

/** An arc running round a faint track while it works, a tick that draws itself, or a cross. */
function StepIcon({ status, reduced }: { status: StepStatus; reduced: boolean }) {
  const stroke = 1.75;
  const r = (ICON - stroke) / 2;
  const around = 2 * Math.PI * r;
  return (
    <span
      aria-hidden="true"
      style={{ position: 'relative', display: 'grid', width: ICON, height: ICON, flexShrink: 0 }}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={status}
          initial={{ opacity: 0, scale: 0.5, filter: 'blur(3px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, scale: 0.6, filter: 'blur(3px)', transition: { duration: 0.12 } }}
          transition={{ type: 'spring', stiffness: 460, damping: 26 }}
          style={{ display: 'grid', gridArea: '1 / 1' }}
        >
          {status === 'running' ? (
            <motion.svg
              width={ICON}
              height={ICON}
              viewBox={`0 0 ${ICON} ${ICON}`}
              fill="none"
              stroke="currentColor"
              strokeWidth={stroke}
              animate={reduced ? undefined : { rotate: 360 }}
              transition={{ duration: 0.8, ease: 'linear', repeat: Infinity }}
            >
              <circle cx={ICON / 2} cy={ICON / 2} r={r} opacity={0.22} />
              <circle
                cx={ICON / 2}
                cy={ICON / 2}
                r={r}
                strokeLinecap="round"
                strokeDasharray={`${around * 0.28} ${around}`}
              />
            </motion.svg>
          ) : (
            <svg
              width={ICON}
              height={ICON}
              viewBox="0 0 16 16"
              style={{ color: status === 'error' ? RED : 'inherit' }}
            >
              <circle cx="8" cy="8" r="8" fill="currentColor" opacity={0.14} />
              <motion.path
                d={
                  status === 'error'
                    ? 'M5.6 5.6l4.8 4.8M10.4 5.6l-4.8 4.8'
                    : 'M4.8 8.3l2.2 2.2 4.3-4.6'
                }
                fill="none"
                stroke="currentColor"
                strokeWidth={1.7}
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: reduced ? 1 : 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.34, delay: 0.06, ease: [0.65, 0, 0.35, 1] }}
              />
            </svg>
          )}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/** The time now, ticking while something runs and still otherwise. */
function useClock(ticking: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!ticking) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(timer);
  }, [ticking]);
  return now;
}

/** When each running step was first seen, so it can count its own time. */
function useStartTimes(steps: readonly TraceStep[]) {
  const starts = useRef<Record<string, number>>({});
  for (const step of steps) {
    if (step.status === 'running' && starts.current[step.id] === undefined)
      starts.current[step.id] = Date.now();
  }
  return starts.current;
}
