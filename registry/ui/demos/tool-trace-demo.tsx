'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState, type CSSProperties } from 'react';
import { ToolTrace, type TraceStep } from '../tool-trace';

// An agent fixing a bug: what it does, and how long each takes.
const SCRIPT: readonly (Omit<TraceStep, 'status' | 'duration'> & { takes: number })[] = [
  { id: 'search', label: 'Searched', detail: '"useReducedMotion"', takes: 900 },
  { id: 'read', label: 'Read', detail: 'registry/ui/presence.tsx', takes: 700 },
  { id: 'edit', label: 'Edited', detail: 'presence.tsx  +12 −4', takes: 1500 },
  { id: 'test', label: 'Ran', detail: 'pnpm test ui', takes: 2300 },
];

/** The docs stage's trace: an agent works through four steps, rests, then starts again. */
export function ToolTraceDemo({
  defaultOpen = true,
  style,
}: {
  defaultOpen?: boolean;
  style?: CSSProperties;
}) {
  const [round, setRound] = useState(0);
  const [at, setAt] = useState(0);
  useEffect(() => {
    const wait = at < SCRIPT.length ? SCRIPT[at]!.takes : 4200;
    const timer = setTimeout(() => {
      if (at < SCRIPT.length) setAt(at + 1);
      else {
        setAt(0);
        setRound((r) => r + 1);
      }
    }, wait);
    return () => clearTimeout(timer);
  }, [at]);

  const steps: TraceStep[] = SCRIPT.slice(0, at + 1).map(({ takes, ...step }, index) => ({
    ...step,
    status: index < at ? 'done' : 'running',
    duration: index < at ? takes : undefined,
  }));

  return (
    <div style={{ display: 'grid', width: 'min(440px, 100%)', minHeight: 250, ...style }}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={`${round}-${defaultOpen}`}
          initial={{ opacity: 0, filter: 'blur(6px)' }}
          animate={{ opacity: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, filter: 'blur(6px)' }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <ToolTrace steps={steps} defaultOpen={defaultOpen} style={{ width: '100%' }} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
