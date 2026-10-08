'use client';

import type { ReactElement } from 'react';
import { useToolkitSnapshot } from '../runtime/chart-runtime';
import { BrushView } from '../interaction/brush-view';
import type { ChartBrushProps } from '../types';

export function ChartBrush({ className }: ChartBrushProps): ReactElement | null {
  const snapshot = useToolkitSnapshot();
  if (!snapshot.brush) return null;
  return (
    <div className={['lilt-chart__brush-host', className].filter(Boolean).join(' ')}>
      <BrushView {...snapshot.brush} />
    </div>
  );
}
