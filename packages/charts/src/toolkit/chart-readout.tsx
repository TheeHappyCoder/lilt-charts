'use client';

import type { ReactElement } from 'react';
import { useToolkitSnapshot } from '../runtime/chart-runtime';
import type { ChartReadoutProps } from '../types';

export function ChartReadout({ className }: ChartReadoutProps): ReactElement | null {
  const snapshot = useToolkitSnapshot();
  if (!snapshot.readout) return null;
  return (
    <div className={['lilt-chart__readout', className].filter(Boolean).join(' ')}>
      <p className="lilt-chart__observation">{snapshot.readout}</p>
    </div>
  );
}
