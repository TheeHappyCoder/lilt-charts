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
  const overall: StepStatus = running || steps.length === 0 ? 'running' : failed ? 'error' : 'done';
  const headline = running
    ? { key: `run-${running.id}`, text: running.label, detail: running.detail }
    : steps.length === 0
      ? { key: 'start', text: 'Starting', detail: undefined }
      : { key: 'summary', text: summary(steps), detail: undefined };

  return (
    <>
      <style href="lilt-ui-tool-trace" precedence="default">
        {css}
      </style>
      <div className={['lilt-ttr', className].filter(Boolean).join(' ')} style={style}>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={`${id}-steps`}
          onClick={toggle}
          className="lilt-ttr-head"
        >
          <StepIcon status={overall} reduced={reduced} />
          <span className="lilt-ttr-headline" aria-live="polite">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={headline.key}
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: 10, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, y: -10, filter: 'blur(4px)' }}
                transition={{ duration: 0.24, ease: EASE }}
                className="lilt-ttr-headline-inner"
              >
                <span className="lilt-ttr-label">{headline.text}</span>
                {headline.detail ? <span className="lilt-ttr-chip">{headline.detail}</span> : null}
              </motion.span>
            </AnimatePresence>
          </span>
          <span className="lilt-ttr-total">{formatDuration(total)}</span>
          <motion.svg
            aria-hidden="true"
            width={13}
            height={13}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={false}
            animate={{ rotate: open ? 90 : 0 }}
            transition={reduced ? { duration: 0 } : SPRING}
            className="lilt-ttr-chev"
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
              <div className="lilt-ttr-well-wrap">
                <ol className="lilt-ttr-well">
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
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </>
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
      <div className="lilt-ttr-row">
        <StepIcon status={step.status} reduced={reduced} />
        <span className="lilt-ttr-row-text">
          <span className="lilt-ttr-label">{step.label}</span>
          {step.detail ? (
            <span title={step.detail} className="lilt-ttr-chip">
              {step.detail}
            </span>
          ) : null}
        </span>
        <span className="lilt-ttr-ms" style={{ color: failed ? 'var(--ttr-err)' : undefined }}>
          {failed ? 'Failed' : formatDuration(ms)}
        </span>
      </div>
      {last ? null : (
        // The rail to the next step: a faint track that fills in once this step is done.
        <span aria-hidden="true" className="lilt-ttr-rail">
          <motion.span
            initial={{ scaleY: reduced ? 1 : 0 }}
            animate={{ scaleY: step.status === 'running' ? 0 : 1 }}
            transition={reduced ? { duration: 0 } : { duration: 0.45, ease: EASE }}
            style={{
              position: 'absolute',
              inset: 0,
              originY: 0,
              background: failed ? 'var(--ttr-err)' : 'var(--ttr-rail-fill)',
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
  const tone =
    status === 'error' ? 'var(--ttr-err)' : status === 'done' ? 'var(--ttr-ok)' : 'currentColor';
  return (
    <span aria-hidden="true" className="lilt-ttr-ico" style={{ color: tone }}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={status}
          initial={{ opacity: 0, scale: 0.5, filter: 'blur(3px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, scale: 0.6, filter: 'blur(3px)', transition: { duration: 0.12 } }}
          transition={{ type: 'spring', stiffness: 460, damping: 26 }}
          style={{ display: 'grid', gridArea: '1 / 1', placeItems: 'center' }}
        >
          {status === 'running' ? (
            <svg
              width={ICON}
              height={ICON}
              viewBox={`0 0 ${ICON} ${ICON}`}
              fill="none"
              stroke="currentColor"
              strokeWidth={stroke}
              className={reduced ? undefined : 'lilt-ttr-spin'}
            >
              <circle cx={ICON / 2} cy={ICON / 2} r={r} opacity={0.2} />
              <circle
                cx={ICON / 2}
                cy={ICON / 2}
                r={r}
                strokeLinecap="round"
                strokeDasharray={`${around * 0.28} ${around}`}
              />
            </svg>
          ) : (
            <svg width={ICON} height={ICON} viewBox="0 0 16 16">
              <circle cx="8" cy="8" r="7.5" fill="currentColor" opacity={0.12} />
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

const css = /* css */ `
.lilt-ttr {
  --ttr-panel: #f4f4f2;
  --ttr-surface: #ffffff;
  --ttr-chip: #f4f4f2;
  --ttr-line: rgb(26 26 24 / 0.08);
  --ttr-muted: #6b6b66;
  --ttr-faint: #8c8c87;
  --ttr-rail: rgb(26 26 24 / 0.1);
  --ttr-rail-fill: rgb(26 26 24 / 0.32);
  --ttr-ok: #2d8a4e;
  --ttr-err: #d93848;
  width: min(444px, 100%);
  border: 1px solid var(--ttr-line);
  border-radius: 14px;
  background: var(--ttr-panel);
  overflow: hidden;
  -webkit-font-smoothing: antialiased;
}
:where(.dark, [data-theme="dark"]) .lilt-ttr {
  --ttr-panel: #151514;
  --ttr-surface: #1b1b19;
  --ttr-chip: #151514;
  --ttr-line: rgb(244 244 242 / 0.08);
  --ttr-muted: #a3a39d;
  --ttr-faint: #73736e;
  --ttr-rail: rgb(244 244 242 / 0.1);
  --ttr-rail-fill: rgb(244 244 242 / 0.32);
  --ttr-ok: #5cc485;
  --ttr-err: #f05d6c;
}
[data-theme="light"] .lilt-ttr {
  --ttr-panel: #f4f4f2;
  --ttr-surface: #ffffff;
  --ttr-chip: #f4f4f2;
  --ttr-line: rgb(26 26 24 / 0.08);
  --ttr-muted: #6b6b66;
  --ttr-faint: #8c8c87;
  --ttr-rail: rgb(26 26 24 / 0.1);
  --ttr-rail-fill: rgb(26 26 24 / 0.32);
  --ttr-ok: #2d8a4e;
  --ttr-err: #d93848;
}

.lilt-ttr-head {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  height: 44px;
  padding: 0 12px;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
}
.lilt-ttr-headline {
  position: relative;
  flex: 1;
  min-width: 0;
  display: grid;
  overflow: hidden;
}
.lilt-ttr-headline-inner {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
  white-space: nowrap;
}
.lilt-ttr-label {
  font-weight: 500;
  letter-spacing: -0.01em;
  white-space: nowrap;
}
.lilt-ttr-chip {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 2px 6px;
  border: 1px solid var(--ttr-line);
  border-radius: 6px;
  background: var(--ttr-chip);
  color: var(--ttr-muted);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 11.5px;
}
.lilt-ttr-total {
  color: var(--ttr-faint);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 11.5px;
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}
.lilt-ttr-chev {
  color: var(--ttr-faint);
  flex-shrink: 0;
}

.lilt-ttr-well-wrap {
  padding: 0 6px 6px;
}
.lilt-ttr-well {
  margin: 0;
  padding: 4px 12px 12px;
  list-style: none;
  border: 1px solid var(--ttr-line);
  border-radius: 10px;
  background: var(--ttr-surface);
}
.lilt-ttr-row {
  display: grid;
  grid-template-columns: ${ICON}px minmax(0, 1fr) auto;
  align-items: center;
  column-gap: 10px;
  padding-top: 12px;
  font-size: 13px;
}
.lilt-ttr-row-text {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
}
.lilt-ttr-ms {
  color: var(--ttr-faint);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 11.5px;
  font-variant-numeric: tabular-nums;
}
.lilt-ttr-rail {
  position: absolute;
  left: ${ICON / 2 - 0.75}px;
  top: ${12 + ICON + 4}px;
  bottom: -8px;
  width: 1.5px;
  border-radius: 1px;
  overflow: hidden;
  background: var(--ttr-rail);
}
.lilt-ttr-ico {
  position: relative;
  display: grid;
  place-items: center;
  width: ${ICON}px;
  height: ${ICON}px;
  flex-shrink: 0;
}
@keyframes lilt-ttr-spin {
  to {
    transform: rotate(360deg);
  }
}
.lilt-ttr-spin {
  animation: lilt-ttr-spin 0.85s linear infinite;
}
@media (prefers-reduced-motion: reduce) {
  .lilt-ttr-spin {
    animation: none;
  }
}
`;
