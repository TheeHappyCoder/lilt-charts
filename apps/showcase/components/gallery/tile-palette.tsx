'use client';

import type { ReactNode } from 'react';
import { useChartSettings } from '@/components/docs/chart-settings';

/**
 * Carries the site's palette to a tile's own art (its light and its glyph), so a gallery
 * recolours with the chart style like the charts inside it.
 */
export function TilePalette({ className, children }: { className: string; children?: ReactNode }) {
  const { settings } = useChartSettings();
  return (
    <span
      className={className}
      data-lilt-chart=""
      data-lilt-palette={(settings.palette as string | undefined) ?? undefined}
      aria-hidden="true"
    >
      {children}
    </span>
  );
}
