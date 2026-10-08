'use client';

import type { ReactElement } from 'react';
import { useToolkitSnapshot } from '../runtime/chart-runtime';
import type { ChartToolbarProps } from '../types';

export function ChartToolbar({ actions, className }: ChartToolbarProps): ReactElement {
  const snapshot = useToolkitSnapshot();
  return (
    <div className={['lilt-chart__toolbar', className].filter(Boolean).join(' ')}>
      <div className="lilt-chart__toolbar-tools">
        {snapshot.toolbar ? (
          <button
            type="button"
            aria-pressed={snapshot.toolbar.pressed}
            onClick={snapshot.toolbar.onClick}
          >
            {snapshot.toolbar.label}
          </button>
        ) : null}
      </div>
      {actions ? <div className="lilt-chart__toolbar-actions">{actions}</div> : null}
    </div>
  );
}
