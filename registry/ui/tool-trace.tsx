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
const RED = '#f05d6c';
const GREEN = '#32c484';
const BLUE = '#8e9eff';
const ICON = 18;

const defaultSummary = (steps: readonly TraceStep[]) =>
  `Used ${steps.length} tool${steps.length === 1 ? '' : 's'}`;

/** 340ms, 1.2s, 12s. */
export function formatDuration(ms: number) {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(ms < 10_000 ? 1 : 0)}s`;
}

/**
 * What an agent did, housed in a machined inspector chassis. Closed, the header shows the step it
 * is on right now rolling up out of a blur and the total time inside a tabular readout chip. Open,
 * each step lands inside a recessed well with a luminous rail filling behind it as it completes.
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
      <div
        className={['lilt-ttr', className].filter(Boolean).join(' ')}
        data-status={overall}
        style={style}
      >
        <span className="lilt-ttr-pool" aria-hidden="true" />
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
          <span className="lilt-ttr-chev" aria-hidden="true">
            <motion.svg
              aria-hidden="true"
              width={13}
              height={13}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={false}
              animate={{ rotate: open ? 90 : 0 }}
              transition={reduced ? { duration: 0 } : SPRING}
            >
              <path d="M9 6l6 6-6 6" />
            </motion.svg>
          </span>
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
        <span
          className="lilt-ttr-ms"
          style={{ color: failed ? RED : undefined, opacity: failed ? 0.95 : undefined }}
        >
          {failed ? 'Failed' : formatDuration(ms)}
        </span>
      </div>
      {last ? null : (
        // The rail to the next step: a faint track that fills in once this step is done.
        <span aria-hidden="true" className="lilt-ttr-rail">
          <motion.span
            initial={false}
            animate={{ scaleY: step.status === 'running' ? 0 : 1 }}
            transition={reduced ? { duration: 0 } : { duration: 0.45, ease: EASE }}
            style={{
              position: 'absolute',
              inset: 0,
              originY: 0,
              background: failed
                ? RED
                : 'linear-gradient(180deg, rgba(142, 158, 255, 0.72), rgba(50, 196, 132, 0.72))',
            }}
          />
        </span>
      )}
    </motion.li>
  );
}

/** An arc running round a faint track while it works, a tick that draws itself, or a cross. */
function StepIcon({ status, reduced }: { status: StepStatus; reduced: boolean }) {
  const stroke = 1.9;
  const r = (ICON - stroke - 3) / 2;
  const around = 2 * Math.PI * r;
  const tone = status === 'error' ? RED : status === 'done' ? GREEN : BLUE;
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
            <motion.svg
              width={ICON}
              height={ICON}
              viewBox={`0 0 ${ICON} ${ICON}`}
              fill="none"
              stroke="currentColor"
              strokeWidth={stroke}
              animate={reduced ? undefined : { rotate: 360 }}
              transition={{ duration: 0.85, ease: 'linear', repeat: Infinity }}
            >
              <circle cx={ICON / 2} cy={ICON / 2} r={r} opacity={0.22} />
              <circle
                cx={ICON / 2}
                cy={ICON / 2}
                r={r}
                strokeLinecap="round"
                strokeDasharray={`${around * 0.3} ${around}`}
              />
            </motion.svg>
          ) : (
            <svg width={ICON} height={ICON} viewBox="0 0 18 18">
              <circle cx="9" cy="9" r="8" fill="currentColor" opacity={0.14} />
              <motion.path
                d={
                  status === 'error'
                    ? 'M6.4 6.4l5.2 5.2M11.6 6.4l-5.2 5.2'
                    : 'M5.6 9.3l2.3 2.3 4.6-4.9'
                }
                fill="none"
                stroke="currentColor"
                strokeWidth={1.85}
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
  --ttr-a: #ffffff;
  --ttr-b: #f1f2f6;
  --ttr-ring: rgba(15, 20, 40, 0.085);
  --ttr-top: #ffffff;
  --ttr-lip: #dde0e8;
  --ttr-drop: 0 20px 36px -18px rgba(15, 20, 40, 0.24), 0 3px 8px rgba(15, 20, 40, 0.06);
  --ttr-well-a: #e8eaef;
  --ttr-well-b: #f4f5f8;
  --ttr-well-in: inset 0 2px 5px rgba(15, 20, 40, 0.11), inset 0 0 0 1px rgba(15, 20, 40, 0.05);
  --ttr-well-out: 0 1px 0 rgba(255, 255, 255, 0.92);
  --ttr-chip-bg: rgba(255, 255, 255, 0.78);
  --ttr-chip-ring: rgba(15, 20, 40, 0.08);
  --ttr-rail: rgba(15, 20, 40, 0.1);
  --ttr-badge-bg: rgba(15, 20, 40, 0.045);
  --ttr-chev-bg: rgba(15, 20, 40, 0.04);
  position: relative;
  width: min(450px, 100%);
  border-radius: 17px;
  background: linear-gradient(180deg, var(--ttr-a), var(--ttr-b));
  box-shadow:
    0 0 0 1px var(--ttr-ring),
    inset 0 1.5px 0 var(--ttr-top),
    inset 0 -2.5px 0 var(--ttr-lip),
    var(--ttr-drop);
  isolation: isolate;
  -webkit-font-smoothing: antialiased;
}
:where(.dark, [data-theme="dark"]) .lilt-ttr {
  --ttr-a: #22242c;
  --ttr-b: #16181f;
  --ttr-ring: rgba(255, 255, 255, 0.1);
  --ttr-top: rgba(255, 255, 255, 0.11);
  --ttr-lip: rgba(0, 0, 0, 0.78);
  --ttr-drop: 0 24px 44px -18px rgba(0, 0, 0, 0.78), 0 3px 10px rgba(0, 0, 0, 0.42);
  --ttr-well-a: #0e0f14;
  --ttr-well-b: #14161d;
  --ttr-well-in: inset 0 2px 6px rgba(0, 0, 0, 0.72), inset 0 0 0 1px rgba(255, 255, 255, 0.055);
  --ttr-well-out: 0 1px 0 rgba(255, 255, 255, 0.06);
  --ttr-chip-bg: rgba(255, 255, 255, 0.06);
  --ttr-chip-ring: rgba(255, 255, 255, 0.08);
  --ttr-rail: rgba(255, 255, 255, 0.1);
  --ttr-badge-bg: rgba(255, 255, 255, 0.06);
  --ttr-chev-bg: rgba(255, 255, 255, 0.05);
}
[data-theme="light"] .lilt-ttr {
  --ttr-a: #ffffff;
  --ttr-b: #f1f2f6;
  --ttr-ring: rgba(15, 20, 40, 0.085);
  --ttr-top: #ffffff;
  --ttr-lip: #dde0e8;
  --ttr-drop: 0 20px 36px -18px rgba(15, 20, 40, 0.24), 0 3px 8px rgba(15, 20, 40, 0.06);
  --ttr-well-a: #e8eaef;
  --ttr-well-b: #f4f5f8;
  --ttr-well-in: inset 0 2px 5px rgba(15, 20, 40, 0.11), inset 0 0 0 1px rgba(15, 20, 40, 0.05);
  --ttr-well-out: 0 1px 0 rgba(255, 255, 255, 0.92);
  --ttr-chip-bg: rgba(255, 255, 255, 0.78);
  --ttr-chip-ring: rgba(15, 20, 40, 0.08);
  --ttr-rail: rgba(15, 20, 40, 0.1);
  --ttr-badge-bg: rgba(15, 20, 40, 0.045);
  --ttr-chev-bg: rgba(15, 20, 40, 0.04);
}

.lilt-ttr-pool {
  position: absolute;
  left: 12%;
  right: 12%;
  bottom: -12px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(90deg, #9fadff, #c8a8e8 50%, #ffb89e);
  filter: blur(18px);
  opacity: 0.34;
  pointer-events: none;
  z-index: -1;
  transition: background 500ms ease, opacity 500ms ease;
}
.lilt-ttr[data-status="done"] .lilt-ttr-pool {
  background: linear-gradient(90deg, #32c484, #8fd6c0 55%, #a8b5ff);
  opacity: 0.3;
}
.lilt-ttr[data-status="error"] .lilt-ttr-pool {
  background: #f05d6c;
  opacity: 0.36;
}

.lilt-ttr-head {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  height: 46px;
  padding: 0 10px 0 13px;
  border: 0;
  border-radius: 17px;
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
  gap: 8px;
  min-width: 0;
  white-space: nowrap;
}
.lilt-ttr-label {
  font-weight: 550;
  letter-spacing: -0.01em;
  white-space: nowrap;
}
.lilt-ttr-chip {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 2px 7px;
  border-radius: 6px;
  background: var(--ttr-chip-bg);
  box-shadow: inset 0 0 0 1px var(--ttr-chip-ring);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 11.5px;
  opacity: 0.72;
}
.lilt-ttr-total {
  padding: 2px 7px;
  border-radius: 6px;
  background: var(--ttr-badge-bg);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 11.5px;
  font-variant-numeric: tabular-nums;
  opacity: 0.62;
  flex-shrink: 0;
}
.lilt-ttr-chev {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 7px;
  background: var(--ttr-chev-bg);
  opacity: 0.65;
  flex-shrink: 0;
}

.lilt-ttr-well-wrap {
  padding: 0 8px 9px;
}
.lilt-ttr-well {
  margin: 0;
  padding: 4px 11px 12px;
  list-style: none;
  border-radius: 11px;
  background: linear-gradient(180deg, var(--ttr-well-a), var(--ttr-well-b));
  box-shadow: var(--ttr-well-in), var(--ttr-well-out);
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
  gap: 8px;
  min-width: 0;
}
.lilt-ttr-ms {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 11.5px;
  font-variant-numeric: tabular-nums;
  opacity: 0.5;
}
.lilt-ttr-rail {
  position: absolute;
  left: ${ICON / 2 - 0.75}px;
  top: ${12 + ICON + 4}px;
  bottom: -8px;
  width: 1.5px;
  border-radius: 2px;
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
`;
