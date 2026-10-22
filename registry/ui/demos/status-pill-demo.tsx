'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { StatusPill, type PillStatus } from '../status-pill';

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
  return <StatusPill status={cycle ? SCRIPT[step]![0] : status} style={style} />;
}
