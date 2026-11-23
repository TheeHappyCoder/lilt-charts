'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { PILL_STATES, StatusPill, type PillStatus } from '../status-pill';

// A save and a dropped connection, in the order a reader might meet them.
const SCRIPT: readonly [PillStatus, number][] = [
  ['saving', 1400],
  ['saved', 2200],
  ['offline', 2600],
  ['saving', 1200],
  ['error', 2200],
];

/** The docs stage's pill: plays a save and a dropped connection, or holds one status. */
export function StatusPillDemo({
  status = 'saved',
  cycle = true,
  style,
}: {
  status?: PillStatus;
  cycle?: boolean;
  style?: CSSProperties;
}) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (!cycle) return;
    const timer = setTimeout(() => setStep((s) => (s + 1) % SCRIPT.length), SCRIPT[step]![1]);
    return () => clearTimeout(timer);
  }, [cycle, step]);
  const active = cycle ? SCRIPT[step]![0] : status;
  const tone = PILL_STATES[active].tone ?? '#8e9eff';
  return (
    <span
      style={{
        position: 'relative',
        display: 'inline-grid',
        placeItems: 'center',
        isolation: 'isolate',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: '10%',
          right: '10%',
          bottom: -10,
          height: 22,
          borderRadius: '50%',
          background: tone,
          filter: 'blur(16px)',
          opacity: 0.4,
          pointerEvents: 'none',
          zIndex: 0,
          transition: 'background-color 360ms ease',
        }}
      />
      <StatusPill status={active} style={{ position: 'relative', zIndex: 1, ...style }} />
    </span>
  );
}
