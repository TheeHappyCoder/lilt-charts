'use client';

import type { ReactElement } from 'react';
import { useToolkitSnapshot } from '../runtime/chart-runtime';
import { FocusOverview } from '../interaction/focus-overview';
import type { ChartOverviewProps } from '../types';

export function ChartOverview({ className }: ChartOverviewProps): ReactElement | null {
  const snapshot = useToolkitSnapshot();
  if (!snapshot.overview) return null;
  return (
    <div className={['lilt-chart__overview-host', className].filter(Boolean).join(' ')}>
      <FocusOverview {...snapshot.overview} />
    </div>
  );
}
